/** npx tsx lib/live/__tests__/chess.test.ts */
import { Chess } from "chess.js"

import type { RoomPlayer } from "../types"
import {
  applyMove,
  assignColours,
  canMate,
  clockAfterMove,
  colourOf,
  coords,
  flaggedSide,
  formatClock,
  initialChessState,
  material,
  movesOf,
  parseClock,
  rebuild,
  remainingMs,
  resultAfterMove,
  sideToMove,
  squareAt,
  timeoutResult,
  toLiveResult,
  type ChessState,
} from "../chess"

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(`Assertion failed: ${message}`)
}

const player = (uid: string, seat: number): RoomPlayer => ({
  uid,
  name: uid,
  seat,
  joinedAt: 0,
  online: true,
  lastSeen: 0,
})
const host = player("host", 0)
const guest = player("guest", 1)

const T0 = 1_700_000_000_000
const START_FEN = new Chess().fen()

/** A game in progress, at the start position unless told otherwise. */
function game(extra: Partial<ChessState> = {}): ChessState {
  return {
    white: "host",
    black: "guest",
    fen: START_FEN,
    lastMoveAt: T0,
    startedAt: T0,
    ...extra,
  }
}

console.log("Running chess tests...\n")

// ── Colour assignment ─────────────────────────────────────────────────
{
  let c = assignColours([host, guest], { colour: "white" }, "ABCDEF")
  assert(c.white === "host" && c.black === "guest", "host asked for white")
  c = assignColours([host, guest], { colour: "black" }, "ABCDEF")
  assert(c.white === "guest" && c.black === "host", "host asked for black")
  const r1 = assignColours([host, guest], { colour: "random" }, "ABCDEF")
  const r2 = assignColours([host, guest], { colour: "random" }, "ABCDEF")
  assert(
    r1.white === r2.white && r1.black === r2.black,
    "random is the same for the same room"
  )
  assert(r1.white !== r1.black, "two different players")
  // Some room code gives each answer
  const seeds = ["ABC234", "XYZ789", "AAAAAA", "HJK2M9", "BBBBBB", "W7TQ4N"]
  const whites = new Set(
    seeds.map(
      (s) => assignColours([host, guest], { colour: "random" }, s).white
    )
  )
  assert(whites.size === 2, "random actually varies by room")

  const s = initialChessState(
    [host, guest],
    { clock: "10+0", colour: "white" },
    "ABCDEF"
  )
  assert(
    s.white === "host" && s.fen === START_FEN,
    "initial state starts a fresh game"
  )
  assert(
    s.clock?.baseMs === 600_000 && s.clock.incMs === 0 && s.clock.w === 600_000,
    "10+0 clock"
  )
  assert(
    !("drawOffer" in s) && !("result" in s) && !("moves" in s),
    "no undefined fields go to the database"
  )
  const untimed = initialChessState(
    [host, guest],
    { clock: "none", colour: "white" },
    "ABCDEF"
  )
  assert(!("clock" in untimed), "no clock → no clock field")
}

// ── Clock options ─────────────────────────────────────────────────────
{
  assert(parseClock("none") === null, "none → untimed")
  assert(parseClock(undefined) === null, "missing → untimed")
  assert(parseClock("garbage") === null, "junk → untimed")
  const c = parseClock("3+2")!
  assert(
    c.baseMs === 180_000 &&
      c.incMs === 2000 &&
      c.w === 180_000 &&
      c.b === 180_000,
    "3+2"
  )
  const d = parseClock("15+10")!
  assert(d.baseMs === 900_000 && d.incMs === 10_000, "15+10")
}

// ── Clock math ────────────────────────────────────────────────────────
{
  const clock = { baseMs: 180_000, incMs: 2000, w: 180_000, b: 180_000 }
  let next = clockAfterMove(clock, "w", 7000)
  assert(next.w === 175_000 && next.b === 180_000, "spent 7s, got 2s back")
  next = clockAfterMove(clock, "b", 200_000)
  assert(next.b === 2000, "overspent clamps at zero before the increment")
  next = clockAfterMove(clock, "w", -50)
  assert(next.w === 182_000, "clock skew can't give time back")

  const s = game({ clock })
  assert(remainingMs(s, "w", T0 + 5000) === 175_000, "white is spending")
  assert(
    remainingMs(s, "b", T0 + 5000) === 180_000,
    "black's clock stands still"
  )
  assert(remainingMs(game(), "w", T0 + 5000) === null, "untimed → null")
  assert(flaggedSide(s, T0 + 5000) === null, "still time")
  assert(flaggedSide(s, T0 + 180_000) === "w", "exactly zero is a flag fall")
  assert(flaggedSide(s, T0 + 999_999) === "w", "way past")
  assert(flaggedSide(game(), T0 + 999_999) === null, "no clock, no flag")
  const done = game({ clock, result: { winner: "host", reason: "resign" } })
  assert(flaggedSide(done, T0 + 999_999) === null, "an ended game can't flag")
  assert(
    remainingMs(done, "w", T0 + 999_999) === 180_000,
    "clocks freeze at the end"
  )

  assert(formatClock(65_000) === "1:05", "mm:ss")
  assert(formatClock(600_000) === "10:00", "ten minutes")
  assert(formatClock(9_870) === "9.8", "tenths under ten seconds")
  assert(formatClock(10_000) === "0:10", "ten seconds exactly")
  assert(formatClock(-500) === "0.0", "never negative")
}

// ── Moves ─────────────────────────────────────────────────────────────
{
  const s = game({
    clock: { baseMs: 300_000, incMs: 0, w: 300_000, b: 300_000 },
  })
  assert(
    applyMove(s, "guest", { from: "e7", to: "e5" }, T0 + 1000) === null,
    "black can't move first"
  )
  assert(
    applyMove(s, "nobody", { from: "e2", to: "e4" }, T0 + 1000) === null,
    "spectators can't move"
  )
  assert(
    applyMove(s, "host", { from: "e2", to: "e5" }, T0 + 1000) === null,
    "illegal move"
  )
  const r = applyMove(s, "host", { from: "e2", to: "e4" }, T0 + 4000)!
  assert(r !== null && r.move.san === "e4", "e4 is legal")
  assert(movesOf(r.state).join(" ") === "e4", "SAN recorded")
  assert(sideToMove(r.state) === "b", "black to move")
  assert(
    r.state.clock?.w === 296_000 && r.state.clock.b === 300_000,
    "4s came off white"
  )
  assert(r.state.lastMoveAt === T0 + 4000, "clock restarts from the move")
  assert(
    r.state.last?.from === "e2" && r.state.last.to === "e4",
    "last move squares"
  )
  assert(!("result" in r.state), "game goes on")

  // The flag already fell: the move is refused, the timeout wins
  assert(
    applyMove(s, "host", { from: "e2", to: "e4" }, T0 + 300_000) === null,
    "no moves after the flag falls"
  )

  // Draw offer: the offerer's stands, the other side's is answered by moving
  const offered = game({ drawOffer: "guest" })
  const after = applyMove(offered, "host", { from: "d2", to: "d4" }, T0 + 1000)!
  assert(!("drawOffer" in after.state), "moving declines the offer")
  const own = game({ drawOffer: "host" })
  const still = applyMove(own, "host", { from: "d2", to: "d4" }, T0 + 1000)!
  assert(
    still.state.drawOffer === "host",
    "your own offer stands when you move"
  )

  // Promotion
  const promo = game({ fen: "8/P6k/8/8/8/8/8/K7 w - - 0 1" })
  assert(
    applyMove(promo, "host", { from: "a7", to: "a8" }, T0) === null,
    "promotion needs a piece"
  )
  const q = applyMove(
    promo,
    "host",
    { from: "a7", to: "a8", promotion: "q" },
    T0
  )!
  assert(
    q.move.san === "a8=Q" && q.state.fen.startsWith("Q"),
    "promotes to a queen"
  )

  // History replays so repetition can be seen
  const played = ["e4", "e5", "Nf3", "Nc6"]
  const chess = new Chess()
  played.forEach((m) => chess.move(m))
  const mid = game({ fen: chess.fen(), moves: played })
  assert(rebuild(mid).history().length === 4, "rebuild replays the moves")
  const broken = game({ fen: chess.fen(), moves: ["e4"] })
  assert(
    rebuild(broken).fen() === chess.fen(),
    "a bad move list falls back to the FEN"
  )
}

// ── Results ───────────────────────────────────────────────────────────
{
  // Fool's mate
  let s = game()
  for (const [uid, from, to] of [
    ["host", "f2", "f3"],
    ["guest", "e7", "e5"],
    ["host", "g2", "g4"],
  ] as const) {
    s = applyMove(s, uid, { from, to }, T0)!.state
  }
  const mate = applyMove(s, "guest", { from: "d8", to: "h4" }, T0)!
  assert(
    mate.state.result?.winner === "guest" &&
      mate.state.result.reason === "checkmate",
    "checkmate: mover wins"
  )
  assert(
    applyMove(mate.state, "host", { from: "a2", to: "a3" }, T0) === null,
    "no moves after the end"
  )
  const live = toLiveResult(mate.state.result!)
  assert(
    live.winnerIds.length === 1 &&
      live.winnerIds[0] === "guest" &&
      live.reason === "checkmate",
    "LiveResult"
  )

  // Stalemate
  const stale = new Chess("7k/5Q2/6K1/8/8/8/8/8 b - - 0 1")
  assert(resultAfterMove(stale, "host")?.reason === "stalemate", "stalemate")
  assert(
    toLiveResult(resultAfterMove(stale, "host")!).winnerIds.length === 0,
    "a draw has no winner"
  )

  // Insufficient material after the last capture
  const qxq = applyMove(
    game({ fen: "7k/6q1/8/8/8/8/8/Q6K w - - 0 1" }),
    "host",
    { from: "a1", to: "g7" },
    T0
  )!
  assert(
    qxq.move.san === "Qxg7+" && !("result" in qxq.state),
    "a queen each: still a game"
  )
  // Qxg7+ is answered by Kxg7 — insufficient only once the last queen is gone
  const kxq = applyMove(qxq.state, "guest", { from: "h8", to: "g7" }, T0)!
  assert(
    kxq.state.result?.reason === "insufficient" && !kxq.state.result.winner,
    "K vs K is a draw"
  )

  // Threefold repetition through the move list
  let rep = game()
  const shuffle = [
    ["host", "g1", "f3"],
    ["guest", "g8", "f6"],
    ["host", "f3", "g1"],
    ["guest", "f6", "g8"],
  ] as const
  for (let i = 0; i < 2; i++)
    for (const [uid, from, to] of shuffle)
      rep = applyMove(rep, uid, { from, to }, T0)!.state
  assert(
    rep.result?.reason === "repetition",
    "third time at the start position"
  )

  // Fifty-move rule off the FEN's halfmove clock
  const fifty = new Chess("7k/8/8/8/8/8/8/K6R w - - 99 80")
  fifty.move("Rh2")
  assert(
    resultAfterMove(fifty, "host")?.reason === "fifty_moves",
    "fifty moves"
  )

  // Timeout: the other side wins, unless they couldn't ever mate
  const timed = game({ clock: { baseMs: 1000, incMs: 0, w: 1000, b: 1000 } })
  assert(flaggedSide(timed, T0 + 1000) === "w", "white flagged")
  let t = timeoutResult(timed, "w")
  assert(t.winner === "guest" && t.reason === "timeout", "black wins on time")
  t = timeoutResult({ ...timed, fen: "7k/8/8/8/8/8/8/K6Q w - - 0 1" }, "w")
  assert(
    !t.winner && t.reason === "insufficient",
    "a bare king can't win on time"
  )
  t = timeoutResult({ ...timed, fen: "7k/8/8/8/8/8/8/K6Q b - - 0 1" }, "b")
  assert(t.winner === "host" && t.reason === "timeout", "a queen can")
  assert(
    !canMate(new Chess("7k/8/8/8/8/8/8/K6N w - - 0 1"), "w"),
    "king + knight can't force mate"
  )
  assert(
    canMate(new Chess("7k/8/8/8/8/8/8/K5NN w - - 0 1"), "w"),
    "two knights count as able"
  )
  assert(
    canMate(new Chess("7k/8/8/8/8/8/P7/K7 w - - 0 1"), "w"),
    "a pawn can become a queen"
  )
}

// ── Material & geometry ───────────────────────────────────────────────
{
  const even = material(START_FEN)
  assert(
    even.diff === 0 &&
      even.captured.w.length === 0 &&
      even.captured.b.length === 0,
    "nothing taken yet"
  )
  const m = material("rnbqkbnr/pppp1ppp/8/8/8/8/PPPP1PPP/RNBQKB1R w KQkq - 0 3")
  assert(
    m.diff === -3 &&
      m.captured.b.join("") === "np" &&
      m.captured.w.join("") === "p",
    "black is a knight up"
  )
  assert(
    colourOf(game(), "host") === "w" &&
      colourOf(game(), "guest") === "b" &&
      colourOf(game(), "x") === null,
    "colours"
  )
  assert(
    squareAt(0, 0) === "a1" &&
      squareAt(7, 7) === "h8" &&
      squareAt(4, 3) === "e4",
    "squares from coordinates"
  )
  assert(
    coords("e4").file === 4 && coords("e4").rank === 3,
    "coordinates from squares"
  )
}

console.log("All chess tests passed.")
