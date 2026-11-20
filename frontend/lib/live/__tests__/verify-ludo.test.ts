/** npx tsx lib/live/__tests__/verify-ludo.test.ts — replaying finished Ludo games from their move log. */
import { readLog, withLog } from "../log"
import {
  applyExpiry,
  applyMove,
  applyPower,
  applyRoll,
  applySignature,
  heldPowers,
  isExpired,
  isOver,
  legalMoves,
  LUDO_IDLE_MS,
  nextExpiry,
  passTurn,
  resultOf,
  rollFor,
  seededRandom,
  type LudoCapture,
  type LudoContext,
  type LudoSkipReason,
  type LudoState,
} from "../ludo"
import { ABANDON_MS } from "../room"
import { initialStateFor } from "../start"
import type { RoomMeta, RoomOptions, RoomPlayer } from "../types"
import { decodeLudoAction, encodeLudoAction, verifyLudo, type LudoAction } from "../verify/ludo"
import type { VerifyInput } from "../verify/types"

function assert(condition: unknown, message: string) {
  if (!condition) throw new Error(`Assertion failed: ${message}`)
}

const START = 1_700_000_000_000
type Logged = LudoState & { log?: unknown }

/** A room with a game in it, played the way the devices and the server do. */
interface Sim {
  code: string
  meta: RoomMeta
  players: RoomPlayer[]
  state: Logged
  /** The server's clock. */
  now: number
  rng: () => number
}

const seat = (uid: string, i: number, avatar?: string): RoomPlayer => ({
  uid,
  name: uid.toUpperCase(),
  seat: i,
  joinedAt: START - 60_000 + i,
  online: true,
  lastSeen: START - 60_000,
  ...(avatar ? { avatar } : {}),
})

function newSim(code: string, n: number, options: RoomOptions, avatars: string[] = []): Sim {
  const players = Array.from({ length: n }, (_, i) => seat(`p${i}`, i, avatars[i]))
  const meta: RoomMeta = {
    code,
    game: "ludo",
    hostId: "p0",
    hostName: "P0",
    createdAt: START - 120_000,
    minPlayers: 2,
    maxPlayers: n,
    status: "playing",
    options,
    startedAt: START,
  }
  return {
    code,
    meta,
    players,
    state: initialStateFor("ludo", players, options, code) as Logged,
    now: START,
    rng: seededRandom(`test:${code}`),
  }
}

const gone = (sim: Sim) => sim.players.filter((p) => p.left).map((p) => p.uid)

/** The component's stamp(): server time on whatever the step changed. */
function stamp(next: LudoState, prev: LudoState, t: number): LudoState {
  const out: LudoState = { ...next, turnAt: next.turnAt === prev.turnAt ? prev.turnAt : t }
  if (out.dice && out.dice !== prev.dice) out.dice = { ...out.dice, at: t }
  return out
}

/** lib/server/live-roll: the server's roll, logged "r<value>". */
function serverRoll(sim: Sim, uid: string) {
  const s = sim.state
  const now = sim.now
  const value = rollFor(s, uid, sim.rng)
  const next = applyRoll(s, uid, value, { now, gone: gone(sim), rand: seededRandom(`${sim.code}:${s.seq}`) })
  const stamped: LudoState = {
    ...next,
    turnAt: next.turnAt === s.turnAt ? s.turnAt : now,
    ...(next.dice && next.dice !== s.dice ? { dice: { ...next.dice, at: now } } : {}),
  }
  sim.state = withLog(stamped, s, uid, `r${value}`, now)
}

/**
 * A device's step (components/live/ludo/ludo-game commit): the engine with the
 * device's clock — a little off the server's — and the step's seeded draws,
 * then the log entry with the server's time.
 */
function deviceStep(
  sim: Sim,
  by: string,
  run: (s: LudoState, ctx: LudoContext) => LudoState,
  action: LudoAction,
  skew = Math.round((sim.rng() - 0.5) * 2000)
): boolean {
  const s = sim.state
  const ctx: LudoContext = { now: Math.round(sim.now + skew), gone: gone(sim), rand: seededRandom(`${sim.code}:${s.seq}`) }
  let next: LudoState
  try {
    next = run(s, ctx)
  } catch {
    return false
  }
  const a = encodeLudoAction(s, action, ctx)
  assert(a.length <= 40 && !a.startsWith("r"), `log code ${a} fits the rules`)
  sim.state = withLog(stamp(next, s, sim.now), s, by, a, sim.now)
  return true
}

const referee = (sim: Sim) => (sim.players.find((p) => !p.left && p.online) ?? sim.players.find((p) => !p.left))!.uid

function skip(sim: Sim, reason: LudoSkipReason) {
  const who = sim.state.turn
  const ok = deviceStep(sim, referee(sim), (s, ctx) => passTurn(s, who, reason, ctx), { type: "skip", reason, who })
  assert(ok, "skip applies")
}

function piecesOf(s: LudoState): LudoCapture[] {
  return s.order.flatMap((uid) => s.players[uid].tokens.map((_, token) => ({ uid, token })))
}

/** Tries a power (or the character's) on a random piece; true if it was used. */
function tryPower(sim: Sim, uid: string): boolean {
  const s = sim.state
  const me = s.players[uid]
  const held = heldPowers(me).filter((h) => !isExpired(h, sim.now))
  const options: LudoAction[] = []
  const pieces = piecesOf(s)
  for (const h of held) {
    options.push({ type: "power", kind: h.kind, target: null })
    for (const t of pieces) options.push({ type: "power", kind: h.kind, target: t })
  }
  if (me.signature && !me.signature.used) {
    options.push({ type: "signature", target: null })
    for (const t of pieces) options.push({ type: "signature", target: t })
  }
  // Random order; the first the engine accepts is used
  for (let k = 0; k < 12 && options.length; k++) {
    const a = options.splice(Math.floor(sim.rng() * options.length), 1)[0]
    const ok =
      a.type === "power"
        ? deviceStep(sim, uid, (st, ctx) => applyPower(st, uid, a.kind, a.target, ctx), a)
        : a.type === "signature"
          ? deviceStep(sim, uid, (st, ctx) => applySignature(st, uid, a.target, ctx), a)
          : false
    if (ok) return true
  }
  return false
}

interface PlayOpts {
  powers?: boolean
  /** Chance per turn that the player sits idle until the referee skips them. */
  idle?: number
  /** A player leaves for good after this many steps (on their own turn, so it gets skipped). */
  leave?: { uid: string; after: number }
}

/** Plays to the end (or until `stopAfter` steps); then the referee declares it as the component does. */
function play(sim: Sim, opts: PlayOpts = {}, stopAfter = Infinity) {
  for (let step = 0; step < 30_000 && step < stopAfter; step++) {
    const s = sim.state
    if (s.phase === "over" || isOver(s, gone(sim))) break
    sim.now += 300 + Math.floor(sim.rng() * 2500)
    const p = opts.leave && sim.players.find((x) => x.uid === opts.leave!.uid)
    if (opts.leave && p && !p.left && step >= opts.leave.after && s.turn === p.uid) {
      p.left = true
      p.online = false
      p.lastSeen = sim.now
      continue
    }
    // Power Ludo: the referee drops power-ups that ran out
    const exp = nextExpiry(s)
    if (exp !== null && sim.now >= exp) {
      const ok = deviceStep(sim, referee(sim), (st, ctx) => applyExpiry(st, ctx), { type: "expire" }, 0)
      if (ok) continue
    }
    const uid = s.turn
    const rp = sim.players.find((p) => p.uid === uid)!
    if (rp.left) {
      skip(sim, "left")
      continue
    }
    if (opts.idle && sim.rng() < opts.idle) {
      sim.now += LUDO_IDLE_MS + 500
      skip(sim, "idle")
      continue
    }
    if (s.phase === "roll") {
      if (opts.powers && sim.rng() < 0.35 && tryPower(sim, uid)) continue
      serverRoll(sim, uid)
    } else {
      const moves = legalMoves(s, uid, s.dice!.value)
      const token = moves[Math.floor(sim.rng() * moves.length)]
      const ok = deviceStep(sim, uid, (st, ctx) => applyMove(st, uid, token, st.dice!.value, ctx), { type: "move", token })
      assert(ok, "a legal move applies")
    }
  }
}

function finish(sim: Sim) {
  sim.meta = { ...sim.meta, status: "ended", endedAt: sim.now, result: resultOf(sim.state, gone(sim)) }
}

/** What the server reads back: plain JSON, as the database hands it over. */
const input = (sim: Sim): VerifyInput => ({
  code: sim.code,
  meta: JSON.parse(JSON.stringify(sim.meta)),
  players: JSON.parse(JSON.stringify(sim.players)),
  state: JSON.parse(JSON.stringify(sim.state)),
})

function accepted(sim: Sim, label: string) {
  const res = verifyLudo(input(sim))
  assert(res.ok, `${label}: verified (${res.ok ? "" : res.reason})`)
  if (res.ok) {
    const want = sim.meta.result?.winnerIds ?? []
    assert(res.winners.length === want.length && res.winners.every((w) => want.includes(w)), `${label}: same winners`)
  }
}

function rejected(i: VerifyInput, label: string) {
  const res = verifyLudo(i)
  assert(!res.ok, `${label}: refused`)
  if (process.env.SHOW_REASONS && !res.ok) console.log(`   ${label}: ${res.reason}`)
}

const logOf = (i: VerifyInput) => readLog((i.state as Logged).log)
const withEntries = (i: VerifyInput, log: ReturnType<typeof readLog>): VerifyInput => ({
  ...i,
  state: { ...(i.state as object), log },
})

let passed = 0
function test(name: string, fn: () => void) {
  fn()
  passed++
  console.log(`ok - ${name}`)
}

/* ── Honest games ─────────────────────────────────────────────────────── */

const classic2 = newSim("ABCDEF", 2, {})
play(classic2)
finish(classic2)

test("classic 2 players: a whole game checks out", () => {
  assert(classic2.state.phase === "over", "the game finished")
  const log = readLog(classic2.state.log)
  assert(log.length === classic2.state.seq, "one log entry per step")
  assert(log.every((e) => e.a.length <= 40), "every code fits")
  accepted(classic2, "classic 2p")
})

test("classic 4 players with idle skips (and players put out)", () => {
  const sim = newSim("GHJKLM", 4, {})
  play(sim, { idle: 0.04 })
  finish(sim)
  assert(readLog(sim.state.log).some((e) => e.a.startsWith("ki")), "someone was skipped")
  accepted(sim, "classic 4p")
})

test("teams 2v2", () => {
  const sim = newSim("NPQRST", 4, { teams: "2v2" })
  assert(sim.state.teams === true, "a team game")
  play(sim, { idle: 0.01 })
  finish(sim)
  accepted(sim, "2v2")
})

test("five players on the pentagon", () => {
  const sim = newSim("UVWXYZ", 5, {})
  assert(sim.state.board === "penta", "the pentagon")
  play(sim)
  finish(sim)
  accepted(sim, "penta")
})

const power = newSim("PWR234", 3, { mode: "powers" }, ["foxy", "waddles", "hootie"])
play(power, { powers: true, idle: 0.02 })
finish(power)

test("Power Ludo: powers, signatures, fizzled powers", () => {
  const log = readLog(power.state.log)
  assert(log.some((e) => e.a.startsWith("p")), "a power was used")
  assert(log.some((e) => e.a.startsWith("c")), "a signature was used")
  assert(log.some((e) => e.a.startsWith("x")) || log.some((e) => /@/.test(e.a)), "clock claims are logged")
  accepted(power, "power ludo")
})

test("Power Ludo with teams, and the character changed after the start", () => {
  const sim = newSim("TEAM56", 4, { mode: "powers", teams: "2v2" }, ["sheru", "bolt", "astro", "pip"])
  play(sim, { powers: true })
  finish(sim)
  // Back in the room with another character: the seat shows it now
  sim.players[0].avatar = "hootie"
  accepted(sim, "power 2v2")
})

test("a player leaves mid-game: skipped, then the game ends", () => {
  const sim = newSim("LEAVE7", 3, {})
  play(sim, { leave: { uid: "p1", after: 60 } })
  finish(sim)
  const log = readLog(sim.state.log)
  assert(log.some((e) => e.a.startsWith("kl")), "their turn was skipped as left")
  assert(log.some((e) => /g\d/.test(e.a)), "steps after it count them gone")
  accepted(sim, "leaver")
})

test("two players, one leaves: the other wins without the board ending", () => {
  const sim = newSim("DUEL89", 2, {})
  play(sim, { leave: { uid: "p0", after: 40 } })
  assert(sim.state.phase !== "over", "the board didn't end it")
  finish(sim)
  assert(sim.meta.result?.winnerIds[0] === "p1", "the one who stayed wins")
  accepted(sim, "walkover")
})

test("everyone walked away: no winner", () => {
  const sim = newSim("AWAY23", 3, {})
  play(sim, {}, 50)
  sim.meta = { ...sim.meta, status: "ended", result: { winnerIds: [], reason: "everyone_left" } }
  accepted(sim, "everyone left")
  const forged = input(sim)
  forged.meta.result = { winnerIds: ["p0"], reason: "everyone_left" }
  rejected(forged, "a winner for an unfinished game")
})

test("an offline player skipped at the start of their turn", () => {
  const sim = newSim("OFFL45", 2, {})
  play(sim, {}, 30)
  // p1 drops off; a minute later their turn comes and goes at once
  while (sim.state.turn !== "p0" || sim.state.phase !== "roll") play(sim, {}, 1)
  const p1 = sim.players[1]
  p1.online = false
  p1.lastSeen = sim.now
  sim.now += ABANDON_MS + 1000
  while (sim.state.turn === "p0") play(sim, {}, 1)
  skip(sim, "offline")
  const okInput = input(sim)
  okInput.meta.result = { winnerIds: [] }
  assert(verifyLudo(okInput).ok, "a real offline skip is fine")
  // …but not when they were connected all along
  const online = input(sim)
  online.meta.result = { winnerIds: [] }
  online.players[1] = { ...online.players[1], online: true, lastSeen: START }
  rejected(online, "skipped as offline while connected")
})

test("many random games of every kind check out (no false alarms)", () => {
  const ALPHA = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
  const kinds: { n: number; options: RoomOptions; opts: PlayOpts; avatars?: string[] }[] = [
    { n: 2, options: {}, opts: { idle: 0.02 } },
    { n: 3, options: {}, opts: { idle: 0.01, leave: { uid: "p2", after: 80 } } },
    { n: 4, options: { teams: "2v2" }, opts: { idle: 0.01, leave: { uid: "p1", after: 150 } } },
    { n: 5, options: {}, opts: { idle: 0.01, leave: { uid: "p3", after: 100 } } },
    { n: 2, options: { mode: "powers" }, opts: { powers: true, idle: 0.02 }, avatars: ["bolt", "sheru"] },
    { n: 4, options: { mode: "powers" }, opts: { powers: true, leave: { uid: "p0", after: 120 } }, avatars: ["foxy", "bao", "rangoli", "blip"] },
    { n: 4, options: { mode: "powers", teams: "2v2" }, opts: { powers: true, idle: 0.01 }, avatars: ["hoppy", "astro", "sixer", "waddles"] },
    { n: 5, options: { mode: "powers" }, opts: { powers: true, idle: 0.01 }, avatars: ["pip", "buck", "nova", "brick", "riff"] },
  ]
  let games = 0
  for (let g = 0; g < 48; g++) {
    const k = kinds[g % kinds.length]
    const code = Array.from({ length: 6 }, (_, i) => ALPHA[(g * 7 + i * 13 + g * i) % ALPHA.length]).join("")
    const sim = newSim(code, k.n, k.options, k.avatars)
    play(sim, k.opts)
    finish(sim)
    accepted(sim, `random game ${g} (${code}, ${k.n}p ${JSON.stringify(k.options)})`)
    games++
  }
  assert(games === 48, "all played")
})

/* ── Tampering ────────────────────────────────────────────────────────── */

test("a changed roll", () => {
  const i = input(classic2)
  const log = logOf(i)
  const k = log.findIndex((e, j) => e.a.startsWith("r") && log[j + 1]?.a.startsWith("m") && j > 20)
  const v = Number(log[k].a.slice(1))
  log[k] = { ...log[k], a: `r${v === 6 ? 5 : v + 1}` }
  rejected(withEntries(i, log), "changed roll")
})

test("an extra move", () => {
  const i = input(classic2)
  const log = logOf(i)
  const k = log.findIndex((e, j) => e.a.startsWith("m") && j > 10)
  log.splice(k + 1, 0, { ...log[k], t: log[k].t + 1 })
  rejected(withEntries(i, log), "extra move")
})

test("another token moved", () => {
  const i = input(classic2)
  const log = logOf(i)
  const k = log.findIndex((e, j) => j > 30 && e.a.startsWith("m"))
  log[k] = { ...log[k], a: `m${(Number(log[k].a[1]) + 1) % 4}` }
  rejected(withEntries(i, log), "wrong token")
})

test("a dropped step", () => {
  const i = input(classic2)
  const log = logOf(i)
  log.splice(log.findIndex((e, j) => j > 15 && e.a.startsWith("m")), 1)
  rejected(withEntries(i, log), "missing move")
})

test("a board that isn't the one played", () => {
  const i = input(classic2)
  const st = i.state as LudoState
  const loser = st.order.find((id) => st.players[id].place === 0)!
  st.players[loser].tokens = [56, 56, 56, 55]
  rejected(i, "fake final state")
})

test("a forged winner", () => {
  const i = input(classic2)
  const st = i.state as LudoState
  const loser = st.order.find((id) => st.players[id].place === 0)!
  i.meta.result = { ...i.meta.result!, winnerIds: [loser] }
  rejected(i, "forged winner")
})

test("a roster that isn't the room's", () => {
  const i = input(classic2)
  const st = i.state as LudoState
  i.state = { ...st, order: [...st.order].reverse() }
  rejected(i, "reordered players")
  const solo = input(classic2)
  solo.state = { ...(solo.state as LudoState), order: [(solo.state as LudoState).order[0]] }
  rejected(solo, "an opponent dropped from the game")
})

test("someone else's step", () => {
  const i = input(classic2)
  const log = logOf(i)
  const k = log.findIndex((e) => e.a.startsWith("m"))
  const other = (i.state as LudoState).order.find((id) => id !== log[k].b)!
  log[k] = { ...log[k], b: other }
  rejected(withEntries(i, log), "a move by the wrong player")
})

test("a turn skipped too early", () => {
  const sim = newSim("EARLY6", 2, {})
  play(sim, {}, 20)
  sim.now += 5000
  skip(sim, "idle")
  const i = input(sim)
  i.meta.result = { winnerIds: [] }
  rejected(i, "idle after 5 s")
})

test("a player counted gone who never left", () => {
  const i = input(classic2)
  const log = logOf(i)
  const k = log.findIndex((e) => e.a.startsWith("m"))
  log[k] = { ...log[k], a: `${log[k].a}g1` }
  rejected(withEntries(i, log), "fake gone")
})

test("Power Ludo: a clock claim far from the server's", () => {
  const i = input(power)
  const log = logOf(i)
  const k = log.findIndex((e) => e.a.startsWith("p"))
  log[k] = { ...log[k], a: log[k].a.replace(/@\d+/, `@${log[k].t - 60_000}`) }
  rejected(withEntries(i, log), "clock off by a minute")
  const ok = logOf(input(power))
  const d = decodeLudoAction(power.state, ok[k].a)
  assert(d.now !== undefined && Math.abs(d.now - ok[k].t) <= 5000, "honest claims are close")
})

test("Power Ludo: a power aimed at another piece", () => {
  const i = input(power)
  const log = logOf(i)
  const k = log.findIndex((e) => /^p\d\d\d/.test(e.a))
  const tok = Number(log[k].a[3])
  log[k] = { ...log[k], a: `${log[k].a.slice(0, 3)}${(tok + 1) % 4}${log[k].a.slice(4)}` }
  rejected(withEntries(i, log), "retargeted power")
})

console.log(`\n${passed} passed`)
