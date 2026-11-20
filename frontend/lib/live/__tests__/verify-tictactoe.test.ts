/** npx tsx lib/live/__tests__/verify-tictactoe.test.ts */
import { withLog } from "../log"
import { initialStateFor } from "../start"
import {
  applyMark,
  matchOver,
  matchResult,
  nextRound,
  TTT_LOG,
  uidOf,
  type TicTacToeState,
} from "../tictactoe"
import type { LiveResult, RoomMeta, RoomOptions, RoomPlayer } from "../types"
import { verifyTictactoe } from "../verify/tictactoe"

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(`Assertion failed: ${message}`)
}

const CODE = "W7TQ4N"
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

type Logged = TicTacToeState & { log?: unknown }

const begin = (options: RoomOptions, players: RoomPlayer[] = seats()): Logged =>
  initialStateFor("tictactoe", players, options, CODE) as TicTacToeState

let clock = T0
const tick = () => (clock += 1000)

/** What the board writes for a mark (tictactoe-game.tsx play), by whoever's turn it is. */
function mark(cur: Logged, cell: number): Logged {
  const uid = uidOf(cur, cur.turn)
  const next = applyMark(cur, uid, cell)
  if (!next) throw new Error(`test setup: mark ${cell} isn't legal`)
  const t = tick()
  return withLog({ ...next, turnAt: t }, cur, uid, TTT_LOG.mark(cell), t)
}
const marks = (cur: Logged, cells: number[]) => cells.reduce(mark, cur)

/** What the referee writes between rounds. */
function next(cur: Logged, by = "host"): Logged {
  const t = tick()
  return withLog({ ...nextRound(cur), turnAt: t }, cur, by, TTT_LOG.next, t)
}

function metaFor(options: RoomOptions, result: LiveResult | null): RoomMeta {
  return {
    code: CODE,
    game: "tictactoe",
    hostId: "host",
    hostName: "host",
    createdAt: T0 - 120_000,
    minPlayers: 2,
    maxPlayers: 2,
    status: "ended",
    options,
    startedAt: T0,
    endedAt: T0 + 600_000,
    ...(result ? { result } : {}),
  }
}

const check = (state: Logged, meta: RoomMeta, players: RoomPlayer[] = seats()) =>
  verifyTictactoe({ code: CODE, meta, players, state: JSON.parse(JSON.stringify(state)) })

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

console.log("Running tic tac toe verifier tests...\n")

const BEST3 = { bestOf: 3 }
// X takes the top row: x0 o3 x1 o4 x2
const X_WINS = [0, 3, 1, 4, 2]
// A full board, nobody wins: x o x / x o o / o x x
const DRAWN = [0, 1, 2, 4, 3, 5, 7, 6, 8]

// ── An honest best of three ───────────────────────────────────────────
{
  let s = begin(BEST3)
  const firstX = s.xPlayer
  const other = s.players.find((p) => p !== firstX)!
  s = marks(s, X_WINS) // round 1: firstX wins
  s = next(s, other) // the referee may be either player
  s = marks(s, DRAWN) // round 2: drawn
  s = next(s)
  s = marks(s, X_WINS) // round 3: whoever is X now
  assert(matchOver(s), "setup: the match is over")
  const result = matchResult(s)
  accepted(s, metaFor(BEST3, result), result.winnerIds, `best of three (${JSON.stringify(s.wins)})`)

  // Tampering
  const loser = s.players.find((p) => !result.winnerIds.includes(p))!
  rejected(s, metaFor(BEST3, { winnerIds: [loser], reason: "rounds_over" }), "forged winner in the room")
  rejected({ ...s, wins: { ...s.wins, [loser]: 5 } }, metaFor(BEST3, { winnerIds: [loser], reason: "rounds_over" }), "forged score")
  rejected({ ...s, board: "xxx.oo..." }, metaFor(BEST3, result), "edited final board")
  rejected({ ...s, players: [...s.players].reverse() }, metaFor(BEST3, result), "players swapped")
  const log = logOf(s)
  rejected(relog(s, [log[1], log[0], ...log.slice(2)]), metaFor(BEST3, result), "marks in the wrong order")
  rejected(relog(s, log.map((e, i) => (i === 0 ? { ...e, b: other } : e))), metaFor(BEST3, result), "a mark by the wrong player")
  rejected(relog(s, log.map((e, i) => (i === 1 ? { ...e, a: "m0" } : e))), metaFor(BEST3, result), "a mark on a taken cell")
  rejected(relog(s, log.map((e, i) => (i === 1 ? { ...e, a: "m9" } : e))), metaFor(BEST3, result), "a mark off the board")
  rejected(relog(s, log.map((e, i) => (i === 3 ? { ...e, a: TTT_LOG.next } : e))), metaFor(BEST3, result), "a new round mid-round")
  rejected(relog(s, [...log, { b: "host", a: TTT_LOG.next, t: tick() }]), metaFor(BEST3, result), "a round after the match was decided")
  rejected(relog(s, [...log.slice(0, 6), { b: "eve", a: TTT_LOG.next, t: tick() }, ...log.slice(6)]), metaFor(BEST3, result), "a stranger in the log")
  rejected(relog(s, log.slice(0, -1)), metaFor(BEST3, result), "a missing mark")
}

// ── Best of one, won outright; a drawn match ──────────────────────────
{
  const one = { bestOf: 1 }
  const s = marks(begin(one), X_WINS)
  accepted(s, metaFor(one, matchResult(s)), [s.xPlayer], "best of one")
  const d = marks(begin(one), DRAWN)
  assert(matchOver(d) && matchResult(d).winnerIds.length === 0, "setup: a drawn match")
  accepted(d, metaFor(one, matchResult(d)), [], "drawn match")
  rejected(d, metaFor(one, { winnerIds: ["host"], reason: "rounds_over" }), "a drawn match reported as a win")
}

// ── An unfinished match the room ended anyway ─────────────────────────
{
  const s = marks(begin(BEST3), X_WINS)
  rejected(s, metaFor(BEST3, matchResult(s)), "match ended after one round of three")
  accepted(s, metaFor(BEST3, { winnerIds: [], reason: "everyone_left" }), [], "everyone left")
}

// ── Walking away ──────────────────────────────────────────────────────
{
  const s = marks(begin(BEST3), [0, 3])
  const t = T0 + 500_000
  const forfeit = (cur: Logged, index: number, by: string): Logged =>
    withLog({ ...cur, forfeit: cur.players[index], seq: cur.seq + 1 }, cur, by, TTT_LOG.left(index), t)
  const guestIdx = s.players.indexOf("guest")
  const f = forfeit(s, guestIdx, "host")
  const meta = metaFor(BEST3, { winnerIds: ["host"], ranking: ["host", "guest"], reason: "abandoned" })
  accepted(f, meta, ["host"], "guest left", [player("host", 0), player("guest", 1, { left: true, online: false })])
  accepted(f, meta, ["host"], "guest offline a minute", [player("host", 0), player("guest", 1, { online: false, lastSeen: t - 61_000 })])
  rejected(f, meta, "guest was still there")
  rejected(f, metaFor(BEST3, { winnerIds: ["guest"], reason: "abandoned" }), "the one who left reported as winner", [
    player("host", 0),
    player("guest", 1, { left: true }),
  ])
  rejected(relog(f, [...logOf(f), { b: "host", a: TTT_LOG.mark(4), t: t + 1000 }]), meta, "a mark after the forfeit", [
    player("host", 0),
    player("guest", 1, { left: true }),
  ])
  // A win reported for walking away without the forfeit in the game
  rejected(s, meta, "abandoned with no forfeit written", [player("host", 0), player("guest", 1, { left: true })])
  // The engine refuses marks once someone forfeited
  assert(applyMark(f, "host", 4) === null, "no marks after a forfeit")
}

console.log("All tic tac toe verifier tests passed.")
