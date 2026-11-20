/** npx tsx lib/live/__tests__/verify-checkers.test.ts */
import {
  applyMove,
  boardOf,
  CHECKERS_LOG,
  legalMoves,
  moveFromNotation,
  notation,
  toLiveResult,
  type CheckersMove,
  type CheckersResult,
  type CheckersState,
} from "../checkers"
import { withLog } from "../log"
import { initialStateFor } from "../start"
import type { RoomMeta, RoomOptions, RoomPlayer } from "../types"
import { verifyCheckers } from "../verify/checkers"

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(`Assertion failed: ${message}`)
}

const CODE = "HJK2M9"
const T0 = 1_700_000_000_000

const player = (uid: string, seat: number, extra: Partial<RoomPlayer> = {}): RoomPlayer => ({
  uid,
  name: uid,
  seat,
  joinedAt: T0 - 60_000 + seat,
  online: true,
  lastSeen: T0 - 60_000,
  ...extra,
})
const seats = () => [player("host", 0), player("guest", 1)]

type Logged = CheckersState & { log?: unknown }

function begin(options: RoomOptions, players: RoomPlayer[] = seats()): Logged {
  const s = initialStateFor("checkers", players, options, CODE) as CheckersState
  return { ...s, lastMoveAt: T0, startedAt: T0 }
}

/** What the board writes for a move (checkers-game.tsx play). */
function play(cur: Logged, uid: string, move: CheckersMove, t: number): Logged {
  const next = applyMove(cur, uid, move, t - 100)
  if (!next) throw new Error(`test setup: ${notation(move)} by ${uid} isn't legal`)
  return withLog({ ...next, lastMoveAt: t }, cur, uid, notation(move), t)
}

/** By notation, for whoever is to move. */
function playCode(cur: Logged, code: string, t: number): Logged {
  const m = moveFromNotation(boardOf(cur), cur.turn, code)
  if (!m) throw new Error(`test setup: ${code} isn't legal`)
  return play(cur, cur.turn === "l" ? cur.light : cur.dark, m, t)
}

const decide = (cur: Logged, uid: string, result: CheckersResult, action: string, t: number): Logged =>
  withLog({ ...cur, result, drawOffer: null }, cur, uid, action, t)

function metaFor(options: RoomOptions, result: CheckersResult | null, extra: Partial<RoomMeta> = {}): RoomMeta {
  return {
    code: CODE,
    game: "checkers",
    hostId: "host",
    hostName: "host",
    createdAt: T0 - 120_000,
    minPlayers: 2,
    maxPlayers: 2,
    status: "ended",
    options,
    startedAt: T0,
    endedAt: T0 + 600_000,
    ...(result ? { result: toLiveResult(result) } : {}),
    ...extra,
  }
}

const check = (state: Logged, meta: RoomMeta, players: RoomPlayer[] = seats()) =>
  verifyCheckers({ code: CODE, meta, players, state: JSON.parse(JSON.stringify(state)) })

function accepted(state: Logged, meta: RoomMeta, winners: string[], what: string, players?: RoomPlayer[]) {
  const r = check(state, meta, players)
  assert(r.ok, `${what}: accepted (${r.ok ? "" : r.reason})`)
  if (r.ok) assert(r.winners.length === winners.length && winners.every((w) => r.winners.includes(w)), `${what}: winners ${winners}`)
}
function rejected(state: Logged, meta: RoomMeta, what: string, players?: RoomPlayer[]) {
  const r = check(state, meta, players)
  assert(!r.ok, `${what}: rejected`)
  if (!r.ok && process.env.VERBOSE) console.log(`  ${what}: ${r.reason}`)
}
const relog = (s: Logged, log: unknown[]): Logged => ({ ...s, log })
const logOf = (s: Logged) => [...(s.log as { b: string; a: string; t: number }[])]

/** A whole game of random legal moves, to the end on the board. */
function randomGame(options: RoomOptions, seed: number): Logged {
  const rand = () => ((seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31)
  let s = begin(options)
  let t = T0
  while (!s.result) {
    const legal = legalMoves(boardOf(s), s.turn)
    t += 1000
    s = play(s, s.turn === "l" ? s.light : s.dark, legal[Math.floor(rand() * legal.length)], t)
  }
  return s
}

console.log("Running checkers verifier tests...\n")

const OPTS = { colour: "light" }

// ── Notation round trip ───────────────────────────────────────────────
{
  const s = begin(OPTS)
  for (const m of legalMoves(boardOf(s), "l")) {
    const back = moveFromNotation(boardOf(s), "l", notation(m))
    assert(!!back && notation(back) === notation(m), `notation ${notation(m)} reads back`)
  }
  assert(moveFromNotation(boardOf(s), "l", "22-17x") === null, "junk isn't a move")
  assert(moveFromNotation(boardOf(s), "l", "22x18") === null, "a step written as a jump isn't a move")
  assert(moveFromNotation(boardOf(s), "l", "40-18") === null, "no square 40")
}

// ── Honest games played to the end ────────────────────────────────────
{
  const reasons = new Set<string>()
  let checked = 0
  for (let seed = 1; seed <= 25; seed++) {
    const opts = { colour: seed % 2 ? "random" : "dark" }
    const s = randomGame(opts, seed)
    reasons.add(s.result!.reason)
    const winners = s.result!.winner ? [s.result!.winner] : []
    accepted(s, metaFor(opts, s.result!), winners, `random game ${seed} (${s.result!.reason}, ${s.moves} plies)`)
    checked++
  }
  assert(checked === 25, "all random games checked")
  console.log(`  25 random games, endings: ${[...reasons].join(", ")}`)
}

// ── Tampering ─────────────────────────────────────────────────────────
{
  const s = randomGame(OPTS, 3)
  const meta = metaFor(OPTS, s.result!)
  const winner = s.result!.winner
  const loser = winner === "host" ? "guest" : "host"
  accepted(s, meta, winner ? [winner] : [], "the game as played")
  rejected(s, metaFor(OPTS, { winner: loser, reason: "no_pieces" }), "forged winner in the room")
  rejected({ ...s, result: { winner: loser, reason: "no_pieces" } }, metaFor(OPTS, { winner: loser, reason: "no_pieces" }), "forged winner in both")
  const board = boardOf(s)
  const i = board.findIndex((c) => c !== "")
  board[i] = ""
  rejected({ ...s, board }, meta, "edited final board")
  rejected({ ...s, history: [...(s.history ?? []).slice(0, -1), "1-5"] }, meta, "edited history")
  rejected({ ...s, light: s.dark, dark: s.light }, meta, "swapped sides")
  const log = logOf(s)
  rejected(relog(s, [log[1], log[0], ...log.slice(2)]), meta, "moves in the wrong order")
  rejected(relog(s, log.map((e, k) => (k === 0 ? { ...e, b: s.dark } : e))), meta, "a move by the wrong player")
  rejected(relog(s, log.map((e, k) => (k === 0 ? { ...e, a: "21-14" } : e))), meta, "an illegal move")
  rejected(relog(s, log.map((e, k) => (k === 0 ? { ...e, a: "rx" } : e))), meta, "not a move")
  rejected(relog(s, log.slice(0, -1)), meta, "a missing move")
  rejected(relog(s, [...log, { b: s.light, a: CHECKERS_LOG.resign, t: T0 + 999_999 }]), meta, "a move after the end")
}

// ── A capture must be taken ───────────────────────────────────────────
{
  // 22-18 (light) 11-15 (dark): light must now jump 18x11
  let s = begin(OPTS)
  s = playCode(s, "22-18", T0 + 1000)
  s = playCode(s, "11-15", T0 + 2000)
  assert(legalMoves(boardOf(s), "l").every((m) => m.captured.length > 0), "setup: light must capture")
  const quiet = withLog({ ...s }, s, "host", "24-20", T0 + 3000)
  const meta = metaFor(OPTS, { winner: "guest", reason: "resign" })
  rejected(decide(quiet, "host", { winner: "guest", reason: "resign" }, CHECKERS_LOG.resign, T0 + 4000), meta, "a step while a capture is on")
  s = playCode(s, "18x11", T0 + 3000)
  s = decide(s, "guest", { winner: "host", reason: "resign" }, CHECKERS_LOG.resign, T0 + 4000)
  accepted(s, metaFor(OPTS, s.result!), ["host"], "a capture, then resignation")
}

// ── Draw offers ───────────────────────────────────────────────────────
{
  let s = playCode(begin(OPTS), "22-18", T0 + 1000)
  s = withLog({ ...s, drawOffer: "guest" }, s, "guest", CHECKERS_LOG.drawOffer, T0 + 2000)
  s = withLog({ ...s, drawOffer: null }, s, "host", CHECKERS_LOG.drawDecline, T0 + 3000)
  s = playCode(s, "11-15", T0 + 4000)
  s = withLog({ ...s, drawOffer: "guest" }, s, "guest", CHECKERS_LOG.drawOffer, T0 + 5000)
  s = decide(s, "host", { winner: null, reason: "draw_agreed" }, CHECKERS_LOG.drawAccept, T0 + 6000)
  accepted(s, metaFor(OPTS, s.result!), [], "agreed draw")
  const log = logOf(s)
  rejected(relog(s, log.map((e, k) => (k === log.length - 1 ? { ...e, b: "guest" } : e))), metaFor(OPTS, s.result!), "accepting your own offer")
  rejected(relog(s, log.filter((_, k) => k !== 1)), metaFor(OPTS, s.result!), "declining no offer")
}

// ── Walking away; everyone gone ───────────────────────────────────────
{
  const s = playCode(begin(OPTS), "22-18", T0 + 1000)
  const t = T0 + 300_000
  const won = decide(s, "guest", { winner: "guest", reason: "abandoned" }, CHECKERS_LOG.left, t)
  const meta = metaFor(OPTS, won.result!)
  accepted(won, meta, ["guest"], "the other side left", [player("host", 0, { left: true, online: false }), player("guest", 1)])
  accepted(won, meta, ["guest"], "the other side was offline a minute", [player("host", 0, { online: false, lastSeen: t - 60_500 }), player("guest", 1)])
  rejected(won, meta, "the other side was still there")
  accepted(s, metaFor(OPTS, null, { result: { winnerIds: [], reason: "everyone_left" } }), [], "everyone left")
  rejected(s, metaFor(OPTS, null, { result: { winnerIds: ["guest"], reason: "abandoned" } }), "a walk-away win with no claim")
}

console.log("All checkers verifier tests passed.")
