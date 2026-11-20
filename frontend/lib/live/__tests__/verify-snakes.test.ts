/** npx tsx lib/live/__tests__/verify-snakes.test.ts — replaying finished Snakes & Ladders games (flat and 3D) from their move log. */
import { ABANDONED_GAME_MS, EVERYONE_LEFT_REASON } from "../liveness"
import { withLog, type LogEntry } from "../log"
import { ABANDON_MS } from "../room"
import {
  applyRoll,
  isOver,
  passTurn,
  resultOf,
  rollFor,
  skipAction,
  skipReason,
  SNAKES_AWAY_MS,
  SNAKES_IDLE_MS,
  type SnakesState,
} from "../snakes"
import { initialStateFor } from "../start"
import type { LiveResult, RoomMeta, RoomPlayer } from "../types"
import { verifySnakes } from "../verify/snakes"

function assert(condition: unknown, message: string) {
  if (!condition) throw new Error(`Assertion failed: ${message}`)
}

const CODE = "SNK234"
const T0 = 1_700_000_000_000
type Game = "snakes" | "snakes3d"
type Logged = SnakesState & { log?: LogEntry[] }

const player = (uid: string, seat: number): RoomPlayer => ({
  uid,
  name: uid,
  seat,
  joinedAt: T0 - 60_000 + seat,
  online: true,
  lastSeen: T0 - 30_000,
})

/** A repeatable [0, 1) source. */
function rng(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** A room in play: its seats (as the server reads them at the end), its state, the server clock. */
class Sim {
  players: RoomPlayer[]
  s: Logged
  now = T0
  constructor(
    public game: Game,
    n: number
  ) {
    this.players = Array.from({ length: n }, (_, i) => player(`p${i}`, i))
    this.s = initialStateFor(game, this.players, {}, CODE) as Logged
  }
  get gone() {
    return this.players.filter((p) => p.left).map((p) => p.uid)
  }
  seat(uid: string) {
    return this.players.find((p) => p.uid === uid)!
  }
  get referee() {
    const live = this.players.filter((p) => !p.left)
    return (live.find((p) => p.online) ?? live[0]).uid
  }
  /** app/api/live/roll (lib/server/live-roll): the server rolls for whoever's turn it is. */
  roll(value: number, dt = 1500) {
    this.now += dt
    const cur = this.s
    const next = applyRoll(cur, cur.turn, value, { now: this.now, gone: this.gone })
    this.s = withLog({ ...next, turnAt: this.now }, cur, cur.turn, `r${value}`, this.now)
  }
  /** use-snakes-game's referee: passes the turn once skipReason says so, logging it. */
  skip(dt: number) {
    this.now += dt
    const cur = this.s
    const reason = skipReason(this.seat(cur.turn), cur.turnAt || T0, this.now)
    if (!reason) throw new Error(`test setup: ${cur.turn}'s turn isn't due to be skipped`)
    const next = passTurn(cur, cur.turn, reason, { now: this.now, gone: this.gone })
    this.s = withLog({ ...next, turnAt: this.now }, cur, this.referee, skipAction(reason, cur.turn), this.now)
  }
  over() {
    return this.s.phase === "over" || (this.gone.length > 0 && isOver(this.s, this.gone))
  }
  /** Plays on with real (weighted) rolls; every `idleEvery`-th turn runs out the clock instead. */
  play(seed: number, idleEvery = 0, maxSteps = 4000) {
    const rand = rng(seed)
    for (let k = 1; k <= maxSteps && !this.over(); k++) {
      if (idleEvery && k % idleEvery === 0) this.skip(SNAKES_IDLE_MS + 400)
      else this.roll(rollFor(this.s, this.s.turn, rand))
    }
    assert(this.over(), "test setup: the game ends")
  }
  /** The end as the room writes it (use-snakes-game → endGame). */
  meta(result: LiveResult = resultOf(this.s, this.gone), extra: Partial<RoomMeta> = {}): RoomMeta {
    return {
      code: CODE,
      game: this.game,
      hostId: "p0",
      hostName: "p0",
      createdAt: T0 - 120_000,
      minPlayers: 2,
      maxPlayers: 5,
      status: "ended",
      options: {},
      startedAt: T0,
      endedAt: this.now + 2500,
      result,
      ...extra,
    }
  }
}

const check = (state: unknown, meta: RoomMeta, players: RoomPlayer[]) =>
  verifySnakes({ code: CODE, meta, players, state: JSON.parse(JSON.stringify(state)) })

function accepted(sim: Sim, what: string, meta = sim.meta(), state: unknown = sim.s) {
  const r = check(state, meta, sim.players)
  assert(r.ok, `${what}: accepted (${r.ok ? "" : r.reason})`)
  if (r.ok) assert(r.winners.join() === (meta.result?.winnerIds ?? []).join(), `${what}: the same winners`)
  console.log(`  ✓ ${what}`)
}
function rejected(sim: Sim, what: string, meta = sim.meta(), state: unknown = sim.s, players = sim.players) {
  const r = check(state, meta, players)
  assert(!r.ok, `${what}: rejected`)
  console.log(`  ✓ ${what} — rejected (${r.ok ? "" : r.reason})`)
}
const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x))

console.log("Running Snakes & Ladders replay tests...\n")

/* ── Honest games ─────────────────────────────────────────────────────── */

for (const game of ["snakes", "snakes3d"] as const) {
  for (const n of [2, 4]) {
    const sim = new Sim(game, n)
    sim.play(n * 7 + (game === "snakes" ? 1 : 2), 9)
    assert(sim.s.phase === "over", "played to the end")
    accepted(sim, `${game}, ${n} players, played to the end (with idle skips, ${sim.s.log!.length} moves)`)
  }
}

// 5 players, nobody idles
{
  const sim = new Sim("snakes", 5)
  sim.play(99)
  accepted(sim, "snakes, 5 players")
}

// A player away from the room: skipped after the short wait, three times — out
{
  const sim = new Sim("snakes3d", 3)
  const rand = rng(5)
  for (let k = 0; k < 12; k++) sim.roll(rollFor(sim.s, sim.s.turn, rand))
  while (sim.s.turn !== "p1") sim.roll(rollFor(sim.s, sim.s.turn, rand))
  const p1 = sim.seat("p1")
  p1.online = false
  p1.lastSeen = sim.now
  let misses = 0
  while (misses < 3) {
    if (sim.s.turn === "p1") {
      // First miss: still within the minute, so the full clock; then away long enough for the short wait
      const away = sim.now - p1.lastSeen >= ABANDON_MS
      sim.skip(away ? SNAKES_AWAY_MS + 500 : SNAKES_IDLE_MS + 500)
      misses++
    } else sim.roll(rollFor(sim.s, sim.s.turn, rand), 20_000)
  }
  assert(sim.s.players.p1.out, "test setup: p1 is out")
  assert(sim.s.log!.some((e) => e.a === "s:offline:p1"), "test setup: offline skips")
  sim.play(6)
  accepted(sim, "snakes3d, a player gone offline and skipped out")
  // …who came back later (their seat reads online again): still fine
  p1.online = true
  p1.lastSeen = sim.now
  accepted(sim, "…and who came back to watch")

  // An "offline" skip of someone who had just rolled: not away at all
  const early = new Sim("snakes", 2)
  early.roll(3)
  early.roll(4, 20_000)
  early.roll(2, 20_000)
  // Forge: p0 passes p1's turn as "offline" 11 s in, though p1 rolled 20 s ago
  {
    const cur = early.s
    early.now += SNAKES_AWAY_MS + 1000
    const next = passTurn(cur, "p1", "offline", { now: early.now })
    early.s = withLog({ ...next, turnAt: early.now }, cur, "p0", "s:offline:p1", early.now)
  }
  early.play(1)
  rejected(early, "an 'offline' skip of someone who rolled 20 s earlier")
}

// A player leaves mid-game (not on their turn), the rest play on
{
  const sim = new Sim("snakes", 3)
  const rand = rng(17)
  for (let k = 0; k < 10; k++) sim.roll(rollFor(sim.s, sim.s.turn, rand))
  while (sim.s.turn !== "p0") sim.roll(rollFor(sim.s, sim.s.turn, rand))
  sim.seat("p2").left = true
  sim.play(18)
  accepted(sim, "snakes, a player left mid-game")
}

// A player leaves on their own turn: the referee passes it ("left")
{
  const sim = new Sim("snakes3d", 4)
  const rand = rng(23)
  for (let k = 0; k < 9; k++) sim.roll(rollFor(sim.s, sim.s.turn, rand))
  const quitter = sim.s.turn
  sim.seat(quitter).left = true
  sim.skip(800)
  assert(sim.s.log!.at(-1)!.a === `s:left:${quitter}`, "test setup: a left skip")
  sim.play(29)
  accepted(sim, "snakes3d, a player left on their turn")
}

// Everyone else left: the game ends where it stands (phase still "roll")
{
  const sim = new Sim("snakes", 2)
  const rand = rng(31)
  for (let k = 0; k < 8; k++) sim.roll(rollFor(sim.s, sim.s.turn, rand))
  sim.seat("p1").left = true
  assert(sim.over() && sim.s.phase === "roll", "test setup: over by leaving")
  accepted(sim, "snakes, the other player left")
  rejected(sim, "…but the one who left claimed the win", sim.meta({ winnerIds: ["p1"] }))
}

// Closed because everyone walked away
{
  const sim = new Sim("snakes", 2)
  const rand = rng(41)
  for (let k = 0; k < 8; k++) sim.roll(rollFor(sim.s, sim.s.turn, rand))
  const abandoned = { winnerIds: [], reason: EVERYONE_LEFT_REASON }
  accepted(sim, "closed as abandoned after everyone left", sim.meta(abandoned, { endedAt: sim.now + ABANDONED_GAME_MS + 5000 }))
  rejected(sim, "closed as abandoned while still being played", sim.meta(abandoned, { endedAt: sim.now + 20_000 }))
}

/* ── Tampering ────────────────────────────────────────────────────────── */

{
  const sim = new Sim("snakes", 2)
  sim.play(3, 7)
  accepted(sim, "the honest game for the tampering below")
  const winner = sim.meta().result!.winnerIds[0]
  const loser = winner === "p0" ? "p1" : "p0"

  const moved = clone(sim.s)
  moved.players[loser].pos = 100
  rejected(sim, "a position edited", sim.meta(), moved)

  rejected(sim, "a forged winner", sim.meta({ winnerIds: [loser] }))
  rejected(sim, "no winner claimed at all", sim.meta({ winnerIds: [] }))

  // A roll entry that no roll of the server's made (a client writing "r6" — the rules refuse it; the replay too)
  const extra = clone(sim.s)
  extra.log!.push({ b: loser, a: "r6", t: sim.now + 100 })
  rejected(sim, "an extra roll entry after the end", sim.meta(), extra)

  const forged = clone(sim.s)
  const k = forged.log!.findIndex((e, i) => i > 4 && e.a.startsWith("r"))
  forged.log![k] = { ...forged.log![k], a: forged.log![k].a === "r6" ? "r5" : "r6" }
  rejected(sim, "a roll's number changed", sim.meta(), forged)

  const outOfTurn = clone(sim.s)
  const j = outOfTurn.log!.findIndex((e, i) => i > 4 && e.a.startsWith("r"))
  outOfTurn.log![j] = { ...outOfTurn.log![j], b: outOfTurn.log![j].b === "p0" ? "p1" : "p0" }
  rejected(sim, "a roll by the player whose turn it wasn't", sim.meta(), outOfTurn)

  const removed = clone(sim.s) as unknown as { log: Record<string, LogEntry> }
  const asObject = Object.fromEntries(sim.s.log!.map((e, i) => [String(i), e]))
  delete asObject["3"]
  removed.log = asObject
  rejected(sim, "an entry removed from the log", sim.meta(), removed)

  const reordered = clone(sim.s)
  reordered.order = [...reordered.order].reverse()
  rejected(sim, "the turn order changed", sim.meta(), reordered)

  const other = clone(sim.s)
  other.variant = "gate"
  rejected(sim, "a 3D board for a flat game", sim.meta(), other)

  const extraSeat = [...sim.players, player("p9", 2)]
  rejected(sim, "a seated player left out of the game", sim.meta(), sim.s, extraSeat)
}

// A skip before the clock ran out
{
  const sim = new Sim("snakes", 2)
  sim.roll(3)
  {
    const cur = sim.s
    sim.now += 10_000
    const next = passTurn(cur, cur.turn, "idle", { now: sim.now })
    sim.s = withLog({ ...next, turnAt: sim.now }, cur, "p0", `s:idle:${cur.turn}`, sim.now)
  }
  sim.play(8)
  rejected(sim, "an idle skip after 10 s")

  // A skip naming someone whose turn it wasn't
  const wrong = new Sim("snakes", 3)
  wrong.roll(2)
  wrong.skip(SNAKES_IDLE_MS + 500)
  const bad = clone(wrong.s)
  bad.log!.at(-1)!.a = "s:idle:p2"
  rejected(wrong, "a skip naming the wrong player", wrong.meta(resultOf(wrong.s)), bad)

  // Offline before the minute was up, early in the game: not away long enough
  const fresh = new Sim("snakes", 2)
  fresh.roll(3)
  {
    const cur = fresh.s
    fresh.now += SNAKES_AWAY_MS + 500
    const next = passTurn(cur, cur.turn, "offline", { now: fresh.now })
    fresh.s = withLog({ ...next, turnAt: fresh.now }, cur, "p0", `s:offline:${cur.turn}`, fresh.now)
  }
  fresh.play(4)
  rejected(fresh, "an 'offline' skip 10 s into the game, of someone online")
}

console.log("\nAll Snakes & Ladders replay tests passed.")
