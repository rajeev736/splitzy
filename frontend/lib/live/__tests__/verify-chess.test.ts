/** npx tsx lib/live/__tests__/verify-chess.test.ts */
import { Chess, type PieceSymbol, type Square } from "chess.js"

import {
  applyMove,
  CHESS_LOG,
  flaggedSide,
  moveCode,
  timeoutResult,
  toLiveResult,
  type ChessResult,
  type ChessState,
} from "../chess"
import { withLog } from "../log"
import { initialStateFor } from "../start"
import type { RoomMeta, RoomOptions, RoomPlayer } from "../types"
import { verifyChess } from "../verify/chess"

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(`Assertion failed: ${message}`)
}

const CODE = "ABC234"
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

type Logged = ChessState & { log?: unknown }

/** The first state as the referee writes it, with the server's start time in. */
function begin(options: RoomOptions, players: RoomPlayer[] = seats()): Logged {
  const s = initialStateFor("chess", players, options, CODE) as ChessState
  return { ...s, lastMoveAt: T0, startedAt: T0 }
}

/** What the board writes for a move (chess-game.tsx play): server time `t`, the device's reading `at`. */
function move(cur: Logged, uid: string, uci: string, t: number, at = t - 120): Logged {
  const input = { from: uci.slice(0, 2) as Square, to: uci.slice(2, 4) as Square, promotion: (uci[4] || undefined) as PieceSymbol | undefined }
  const next = applyMove(cur, uid, input, at)
  if (!next) throw new Error(`test setup: ${uci} by ${uid} isn't legal`)
  return withLog({ ...next.state, lastMoveAt: t }, cur, uid, moveCode(next.move, cur.clock ? at : null), t)
}

/** What `decide` writes. */
const decide = (cur: Logged, uid: string, result: ChessResult, action: string, t: number): Logged =>
  withLog({ ...cur, result, drawOffer: null }, cur, uid, action, t)

/** Plays a list of moves, alternating from whoever is to move, a second apart. */
function moves(cur: Logged, list: string[], t0 = T0 + 1000): Logged {
  let s = cur
  list.forEach((uci, i) => {
    const turn = new Chess(s.fen).turn()
    s = move(s, turn === "w" ? s.white : s.black, uci, t0 + i * 1000)
  })
  return s
}

function metaFor(options: RoomOptions, result: ChessResult | null, extra: Partial<RoomMeta> = {}): RoomMeta {
  return {
    code: CODE,
    game: "chess",
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
  verifyChess({ code: CODE, meta, players, state: JSON.parse(JSON.stringify(state)) })

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
/** A copy of the state with its log replaced. */
const relog = (s: Logged, log: unknown[]): Logged => ({ ...s, log })
const logOf = (s: Logged) => [...(s.log as { b: string; a: string; t: number }[])]

console.log("Running chess verifier tests...\n")

const UNTIMED = { clock: "none", colour: "white" }

// ── An honest untimed game: fool's mate ───────────────────────────────
{
  const s = moves(begin(UNTIMED), ["f2f3", "e7e5", "g2g4", "d8h4"])
  assert(s.result?.reason === "checkmate" && s.result.winner === "guest", "setup: black mates")
  const meta = metaFor(UNTIMED, s.result!)
  accepted(s, meta, ["guest"], "fool's mate")

  // Tampering
  rejected(s, metaFor(UNTIMED, { winner: "host", reason: "checkmate" }), "forged winner in the room")
  rejected({ ...s, result: { winner: "host", reason: "checkmate" } }, metaFor(UNTIMED, { winner: "host", reason: "checkmate" }), "forged winner in both")
  rejected({ ...s, fen: new Chess().fen() }, meta, "edited final board")
  rejected({ ...s, moves: ["f3", "e5", "g4", "Qh5#"] }, meta, "edited move list")
  const log = logOf(s)
  rejected(relog(s, [log[1], log[0], ...log.slice(2)]), meta, "moves in the wrong order")
  rejected(relog(s, log.map((e, i) => (i === 1 ? { ...e, b: "host" } : e))), meta, "a move by the wrong player")
  rejected(relog(s, log.map((e, i) => (i === 2 ? { ...e, a: "g2g5" } : e))), meta, "an illegal move")
  rejected(relog(s, log.map((e, i) => (i === 0 ? { ...e, a: "f2f3@1700000001000" } : e))), meta, "a time on an untimed move")
  rejected(relog(s, [...log, { b: "host", a: "e2e4", t: T0 + 9000 }]), meta, "a move after mate")
  rejected(relog(s, log.slice(0, 3)), meta, "a missing move")
  rejected(relog(s, []), meta, "no log at all")
  rejected(relog(s, [log[0], { b: "eve", a: CHESS_LOG.drawOffer, t: T0 + 1500 }, ...log.slice(1)]), meta, "a stranger in the log")
  // Colours the room didn't deal
  rejected({ ...s, white: "guest", black: "host" }, meta, "swapped colours")
}

// ── Random colours, a promotion, a player who left after the start ───
{
  const opts = { clock: "none", colour: "random" }
  const s0 = begin(opts)
  const w = s0.white
  const b = s0.black
  let s = moves(s0, ["e2e4", "f7f5", "e4f5", "g7g6", "f5g6", "g8f6", "g6h7", "f6g8", "h7g8q"])
  assert(s.fen.split(" ")[0].includes("Q") && s.moves?.at(-1) === "hxg8=Q", "setup: promoted")
  s = decide(s, b, { winner: w, reason: "resign" }, CHESS_LOG.resign, T0 + 20_000)
  const left = [player("host", 0, { left: true }), player("guest", 1)]
  accepted(s, metaFor(opts, s.result!), [w], "promotion, then resignation (with a seat flagged left)", left)
  const log = logOf(s)
  rejected(relog(s, log.map((e, i) => (i === 8 ? { ...e, a: "h7g8" } : e))), metaFor(opts, s.result!), "a promotion without its piece")
  rejected(relog(s, log.map((e, i) => (i === 8 ? { ...e, a: "h7g8n" } : e))), metaFor(opts, s.result!), "a different promotion than played")
}

// ── Draws: offered, declined, offered again, accepted ─────────────────
{
  let s = moves(begin(UNTIMED), ["e2e4", "e7e5"])
  s = withLog({ ...s, drawOffer: "host" }, s, "host", CHESS_LOG.drawOffer, T0 + 5000)
  s = withLog({ ...s, drawOffer: null }, s, "guest", CHESS_LOG.drawDecline, T0 + 6000)
  s = move(s, "host", "g1f3", T0 + 7000)
  s = withLog({ ...s, drawOffer: "guest" }, s, "guest", CHESS_LOG.drawOffer, T0 + 8000)
  // The offer stands across the offerer's own move… and the other side takes it
  s = decide(s, "host", { winner: null, reason: "draw_agreed" }, CHESS_LOG.drawAccept, T0 + 9000)
  accepted(s, metaFor(UNTIMED, s.result!), [], "agreed draw")
  rejected(s, metaFor(UNTIMED, { winner: "host", reason: "resign" }), "a draw reported as a win")
  const log = logOf(s)
  // Accepting your own offer
  rejected(relog(s, log.map((e, i) => (i === log.length - 1 ? { ...e, b: "guest" } : e))), metaFor(UNTIMED, s.result!), "accepting your own offer")
  // Accepting when nothing was offered
  rejected(relog(s, log.filter((_, i) => i !== log.length - 2)), metaFor(UNTIMED, s.result!), "accepting no offer")
}

// ── A timed game: clocks, then a flag ─────────────────────────────────
{
  const TIMED = { clock: "3+2", colour: "white" }
  let s = begin(TIMED)
  s = move(s, "host", "e2e4", T0 + 5_000, T0 + 4_900)
  s = move(s, "guest", "e7e5", T0 + 15_000, T0 + 14_800)
  s = move(s, "host", "g1f3", T0 + 20_000, T0 + 20_100) // a device clock a little ahead
  // Black thinks… and runs out (176.8 s left + 2 s increment banked)
  const outAt = s.lastMoveAt + s.clock!.b
  assert(flaggedSide(s, outAt) === "b" && flaggedSide(s, outAt - 10) === null, "setup: black's flag falls at outAt")
  const flagged = decide(s, "host", timeoutResult(s, "b"), CHESS_LOG.flag, outAt + 400)
  accepted(flagged, metaFor(TIMED, flagged.result!), ["host"], "win on time")
  // A device a little ahead of the server may claim it a moment early
  const early = decide(s, "host", timeoutResult(s, "b"), CHESS_LOG.flag, outAt - 2000)
  accepted(early, metaFor(TIMED, early.result!), ["host"], "flag claimed 2 s early (within slack)")
  // …but not long before the flag fell
  const fake = decide(s, "host", timeoutResult(s, "b"), CHESS_LOG.flag, outAt - 30_000)
  rejected(fake, metaFor(TIMED, fake.result!), "fake timeout")
  // The flagged player's move after their time ran out isn't legal
  rejected(
    relog(flagged, [...logOf(s), { b: "guest", a: `d7d6@${outAt + 100}`, t: outAt + 200 }]),
    metaFor(TIMED, flagged.result!),
    "a move after the flag fell"
  )
  // A clock reading far from when the move reached the server
  const log = logOf(flagged)
  rejected(relog(flagged, log.map((e, i) => (i === 1 ? { ...e, a: `e7e5@${T0 + 6_000}` } : e))), metaFor(TIMED, flagged.result!), "a claimed time 9 s off")
  rejected(relog(flagged, log.map((e, i) => (i === 1 ? { ...e, a: "e7e5" } : e))), metaFor(TIMED, flagged.result!), "a timed move without its time")
  // Clocks edited in the stored state
  rejected({ ...flagged, clock: { ...flagged.clock!, w: flagged.clock!.w + 60_000 } }, metaFor(TIMED, flagged.result!), "an edited clock")
  // Moves within the slack replay to the same clocks the board wrote
  const ok = move(s, "guest", "d7d6", T0 + 30_000, T0 + 26_000)
  const resigned = decide(ok, "guest", { winner: "host", reason: "resign" }, CHESS_LOG.resign, T0 + 40_000)
  accepted(resigned, metaFor(TIMED, resigned.result!), ["host"], "timed game, resigned")
  // A flag claim in an untimed game is nonsense
  const u = moves(begin(UNTIMED), ["e2e4"])
  const uf = decide(u, "host", { winner: "host", reason: "timeout" }, CHESS_LOG.flag, T0 + 999_999)
  rejected(uf, metaFor(UNTIMED, uf.result!), "a flag without a clock")
}

// ── Walking away ──────────────────────────────────────────────────────
{
  const s = moves(begin(UNTIMED), ["e2e4", "e7e5"])
  const t = T0 + 200_000
  const won = decide(s, "host", { winner: "host", reason: "abandoned" }, CHESS_LOG.left, t)
  const meta = metaFor(UNTIMED, won.result!)
  accepted(won, meta, ["host"], "the other side left", [player("host", 0), player("guest", 1, { left: true, online: false })])
  accepted(won, meta, ["host"], "the other side went offline a minute before", [
    player("host", 0),
    player("guest", 1, { online: false, lastSeen: t - 61_000 }),
  ])
  rejected(won, meta, "the other side was still there")
  rejected(won, meta, "the other side only just went offline", [player("host", 0), player("guest", 1, { online: false, lastSeen: t - 20_000 })])
}

// ── Nobody came back: the room closed it with no winner ───────────────
{
  const s = moves(begin(UNTIMED), ["e2e4", "e7e5"])
  accepted(s, metaFor(UNTIMED, null, { result: { winnerIds: [], reason: "everyone_left" } }), [], "everyone left")
  rejected(s, metaFor(UNTIMED, null, { result: { winnerIds: ["host"], reason: "checkmate" } }), "a win with nothing decided")
}

// ── A long game replays quickly ───────────────────────────────────────
{
  let seed = 7
  const rand = () => ((seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31)
  let s = begin({ clock: "15+10", colour: "black" })
  let t = T0
  while (!s.result && (s.moves?.length ?? 0) < 400) {
    const chess = new Chess(s.fen)
    const options = chess.moves({ verbose: true })
    const m = options[Math.floor(rand() * options.length)]
    t += 1500
    s = move(s, chess.turn() === "w" ? s.white : s.black, m.from + m.to + (m.promotion ?? ""), t)
  }
  if (!s.result) s = decide(s, s.white, { winner: s.black, reason: "resign" }, CHESS_LOG.resign, t + 1000)
  const started = Date.now()
  accepted(s, metaFor({ clock: "15+10", colour: "black" }, s.result!), s.result!.winner ? [s.result!.winner] : [], `random game of ${s.moves?.length} plies (${s.result!.reason})`)
  const ms = Date.now() - started
  assert(ms < 3000, `replay took ${ms} ms`)
  console.log(`  ${s.moves?.length} plies replayed in ${ms} ms`)
}

console.log("All chess verifier tests passed.")
