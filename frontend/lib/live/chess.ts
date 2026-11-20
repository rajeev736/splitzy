import {
  Chess,
  type Color,
  type Move,
  type PieceSymbol,
  type Square,
} from "chess.js"
import { serverTimestamp } from "firebase/database"

import { seededIndex } from "./room"
import type { LiveResult, RoomOptions, RoomPlayer } from "./types"

/**
 * Chess: game state kept at rooms/{code}/state. chess.js is the rule book
 * (legal moves, check, mate, draws); this module decides who plays which
 * colour, runs the clocks and turns positions into results.
 *
 *   white, black  uids
 *   fen           the position after the last move (authoritative)
 *   moves         SAN, oldest first. RTDB drops empty arrays: absent until the first move
 *   last          squares of the last move, for highlights / animation
 *   lastMoveAt    server ms of the last move (or the start): clocks count from here
 *   clock         null = untimed. w / b = ms the side had left when it last moved;
 *                 the side to move is still spending from theirs
 *   drawOffer     uid of the player offering a draw (cleared when the other side moves)
 *   result        set once the game is decided; the shell ends the room right after
 *   startedAt     server ms
 *
 * RTDB also drops nulls, so every nullable field may be missing when read.
 */
export interface ChessState {
  white: string
  black: string
  fen: string
  moves?: string[]
  last?: { from: Square; to: Square } | null
  lastMoveAt: number
  clock?: ChessClock | null
  drawOffer?: string | null
  result?: ChessResult | null
  startedAt: number
}

export interface ChessClock {
  baseMs: number
  incMs: number
  w: number
  b: number
}

export type ChessEndReason =
  | "checkmate"
  | "stalemate"
  | "insufficient"
  | "repetition"
  | "fifty_moves"
  | "timeout"
  | "resign"
  | "draw_agreed"
  | "abandoned"

export interface ChessResult {
  /** Missing / null = draw. */
  winner?: string | null
  reason: ChessEndReason
}

export interface ChessMoveInput {
  from: Square
  to: Square
  promotion?: PieceSymbol
}

/** Order of play: white first. */
export const COLOURS: Color[] = ["w", "b"]

/** Write-time placeholder for the server clock. */
const ts = () => serverTimestamp() as unknown as number

/* ── Setup ───────────────────────────────────────────────────────────── */

/** "3+2" → 3 minutes with a 2 second increment; "none" → untimed. */
export function parseClock(option: unknown): ChessClock | null {
  if (typeof option !== "string" || option === "none") return null
  const m = option.match(/^(\d+)\+(\d+)$/)
  if (!m) return null
  const baseMs = Number(m[1]) * 60_000
  const incMs = Number(m[2]) * 1000
  return { baseMs, incMs, w: baseMs, b: baseMs }
}

/**
 * Who is white. The host (seat 0, `players[0]`) picked a colour or left it to
 * chance; "random" is decided from the room code so every device agrees.
 */
export function assignColours(
  players: RoomPlayer[],
  options: RoomOptions,
  seed: string
): { white: string; black: string } {
  const host = players[0].uid
  const guest = players.find((p) => p.uid !== host)?.uid ?? host
  const pick = options.colour
  const hostIsWhite =
    pick === "white"
      ? true
      : pick === "black"
        ? false
        : seededIndex(seed, 2) === 0
  return hostIsWhite
    ? { white: host, black: guest }
    : { white: guest, black: host }
}

export function initialChessState(
  players: RoomPlayer[],
  options: RoomOptions,
  seed: string
): ChessState {
  const { white, black } = assignColours(players, options, seed)
  const clock = parseClock(options.clock)
  const state: ChessState = {
    white,
    black,
    fen: new Chess().fen(),
    lastMoveAt: ts(),
    startedAt: ts(),
  }
  // Only send nullable fields when they hold something: the database rejects undefined and drops null anyway
  if (clock) state.clock = clock
  return state
}

/* ── Reading the state ───────────────────────────────────────────────── */

export const movesOf = (state: ChessState): string[] =>
  Array.isArray(state.moves) ? state.moves : []

export const colourOf = (state: ChessState, uid: string): Color | null =>
  state.white === uid ? "w" : state.black === uid ? "b" : null

export const uidOf = (state: ChessState, colour: Color) =>
  colour === "w" ? state.white : state.black

export const opponentOf = (state: ChessState, uid: string) =>
  state.white === uid ? state.black : state.white

export const otherColour = (c: Color): Color => (c === "w" ? "b" : "w")

/** Whose turn it is, from the FEN. */
export const sideToMove = (state: ChessState): Color =>
  state.fen.split(" ")[1] === "b" ? "b" : "w"

export const isOver = (state: ChessState) => !!state.result

/**
 * Rebuilds the game. Replaying the moves gives chess.js the history it needs
 * for threefold repetition; the FEN is the fallback if the list disagrees.
 */
export function rebuild(state: ChessState): Chess {
  const chess = new Chess()
  try {
    for (const san of movesOf(state)) chess.move(san)
    if (chess.fen() === state.fen) return chess
  } catch {
    // fall through to the FEN
  }
  return new Chess(state.fen)
}

/* ── Clocks ──────────────────────────────────────────────────────────── */

/**
 * Milliseconds `colour` has left at `now` (server ms). The side to move is
 * spending; the other side's time stands still. Null when the game is untimed.
 */
export function remainingMs(
  state: ChessState,
  colour: Color,
  now: number
): number | null {
  const clock = state.clock
  if (!clock) return null
  if (state.result || sideToMove(state) !== colour) return clock[colour]
  return clock[colour] - Math.max(0, now - state.lastMoveAt)
}

/** The side whose flag has fallen, if any. */
export function flaggedSide(state: ChessState, now: number): Color | null {
  if (!state.clock || state.result) return null
  const side = sideToMove(state)
  const left = remainingMs(state, side, now)
  return left !== null && left <= 0 ? side : null
}

/** The mover's clock after a move: time spent comes off, the increment goes on. */
export function clockAfterMove(
  clock: ChessClock,
  mover: Color,
  elapsedMs: number
): ChessClock {
  const left = Math.max(0, clock[mover] - Math.max(0, elapsedMs)) + clock.incMs
  return { ...clock, [mover]: left }
}

/** "12:05", "0:42", and tenths under ten seconds: "9.8". Never negative. */
export function formatClock(ms: number): string {
  const t = Math.max(0, ms)
  if (t < 10_000) return (Math.floor(t / 100) / 10).toFixed(1)
  const total = Math.floor(t / 1000)
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${s.toString().padStart(2, "0")}`
}

/* ── Moves & results ─────────────────────────────────────────────────── */

/** How chess.js describes the position once nobody can move on (or the draw rules kick in). */
export function resultAfterMove(
  chess: Chess,
  mover: string
): ChessResult | null {
  if (chess.isCheckmate()) return { winner: mover, reason: "checkmate" }
  if (chess.isStalemate()) return { winner: null, reason: "stalemate" }
  if (chess.isInsufficientMaterial())
    return { winner: null, reason: "insufficient" }
  if (chess.isThreefoldRepetition())
    return { winner: null, reason: "repetition" }
  if (chess.isDrawByFiftyMoves()) return { winner: null, reason: "fifty_moves" }
  return null
}

/**
 * `uid` plays `input` at `now` (server ms). Returns the next state, or null
 * when it isn't their turn, the move is illegal, the game is over or their
 * flag has already fallen. `lastMoveAt` is set to `now`; the caller swaps in
 * a server timestamp before writing.
 */
export function applyMove(
  state: ChessState,
  uid: string,
  input: ChessMoveInput,
  now: number,
  /** The game as it stands (a replay keeps one going); rebuilt from the state when left out. Played on when the move is legal. */
  game?: Chess
): { state: ChessState; move: Move } | null {
  if (state.result) return null
  const chess = game ?? rebuild(state)
  const side = chess.turn()
  if (colourOf(state, uid) !== side) return null

  let clock = state.clock ?? null
  if (clock) {
    const elapsed = Math.max(0, now - state.lastMoveAt)
    if (clock[side] - elapsed <= 0) return null
    clock = clockAfterMove(clock, side, elapsed)
  }

  let move: Move
  try {
    move = chess.move({
      from: input.from,
      to: input.to,
      promotion: input.promotion,
    })
  } catch {
    return null
  }

  const next: ChessState = {
    white: state.white,
    black: state.black,
    fen: chess.fen(),
    moves: [...movesOf(state), move.san],
    last: { from: move.from, to: move.to },
    lastMoveAt: now,
    startedAt: state.startedAt,
  }
  if (clock) next.clock = clock
  // An offer stands until the other side answers — moving on is the answer
  if (state.drawOffer === uid) next.drawOffer = uid
  const result = resultAfterMove(chess, uid)
  if (result) next.result = result
  return { state: next, move }
}

/**
 * Pieces that could still mate on their own: anything but a bare king or a
 * king with a single minor piece. Used when the other side runs out of time.
 */
export function canMate(chess: Chess, colour: Color): boolean {
  const pieces: PieceSymbol[] = []
  for (const row of chess.board()) {
    for (const sq of row)
      if (sq && sq.color === colour && sq.type !== "k") pieces.push(sq.type)
  }
  if (pieces.length === 0) return false
  if (pieces.length === 1 && (pieces[0] === "n" || pieces[0] === "b"))
    return false
  return true
}

/**
 * The result when `flagged` runs out of time: the other side wins, unless
 * they have nothing that could ever mate (FIDE 6.9) — then it's a draw.
 */
export function timeoutResult(state: ChessState, flagged: Color): ChessResult {
  const winnerColour = otherColour(flagged)
  if (!canMate(new Chess(state.fen), winnerColour))
    return { winner: null, reason: "insufficient" }
  return { winner: uidOf(state, winnerColour), reason: "timeout" }
}

/** What the room records when the game ends. */
export function toLiveResult(result: ChessResult): LiveResult {
  return {
    winnerIds: result.winner ? [result.winner] : [],
    reason: result.reason,
  }
}

/* ── Move log ────────────────────────────────────────────────────────── */

/**
 * What goes in the move log (lib/live/log) for each write, replayed by
 * lib/live/verify/chess. None starts with "r" (kept for the server's dice).
 */
export const CHESS_LOG = {
  drawOffer: "draw:offer",
  drawAccept: "draw:accept",
  drawDecline: "draw:decline",
  resign: "end:resign",
  /** The side to move ran out of time (checked against the clock at the entry's server time). */
  flag: "end:flag",
  /** The other side walked away: the writer wins. */
  left: "end:left",
} as const

/**
 * A move as logged: UCI ("e2e4", "e7e8q"), plus — in a timed game — the
 * server time the mover's device played it at ("e2e4@1763650000000"): the
 * clock it wrote was worked out from that.
 */
export const moveCode = (
  move: { from: string; to: string; promotion?: string },
  at: number | null
) => `${move.from}${move.to}${move.promotion ?? ""}${at === null ? "" : `@${at}`}`

/* ── Material ────────────────────────────────────────────────────────── */

const PIECE_VALUE: Record<PieceSymbol, number> = {
  p: 1,
  n: 3,
  b: 3,
  r: 5,
  q: 9,
  k: 0,
}
const START_COUNT: Record<PieceSymbol, number> = {
  p: 8,
  n: 2,
  b: 2,
  r: 2,
  q: 1,
  k: 1,
}
const CAPTURE_ORDER: PieceSymbol[] = ["q", "r", "b", "n", "p"]

/**
 * What each side has taken from the other (worked out from what is left on
 * the board, so promotions can only hide captures, never invent them), and
 * the point balance from white's view.
 */
export function material(fen: string): {
  captured: Record<Color, PieceSymbol[]>
  diff: number
} {
  const counts: Record<Color, Record<PieceSymbol, number>> = {
    w: { p: 0, n: 0, b: 0, r: 0, q: 0, k: 0 },
    b: { p: 0, n: 0, b: 0, r: 0, q: 0, k: 0 },
  }
  for (const ch of fen.split(" ")[0]) {
    const lower = ch.toLowerCase()
    if (!(lower in PIECE_VALUE)) continue
    counts[ch === lower ? "b" : "w"][lower as PieceSymbol]++
  }
  const captured: Record<Color, PieceSymbol[]> = { w: [], b: [] }
  let diff = 0
  for (const type of CAPTURE_ORDER) {
    diff += (counts.w[type] - counts.b[type]) * PIECE_VALUE[type]
    // White's captures are the black pieces that are gone, and vice versa
    for (let i = 0; i < START_COUNT[type] - counts.b[type]; i++)
      captured.w.push(type)
    for (let i = 0; i < START_COUNT[type] - counts.w[type]; i++)
      captured.b.push(type)
  }
  return { captured, diff }
}

/* ── Board geometry ──────────────────────────────────────────────────── */

export const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"] as const

export const squareAt = (file: number, rank: number): Square =>
  `${FILES[file]}${rank + 1}` as Square

/** 0-based file / rank of a square: a1 → (0, 0), h8 → (7, 7). */
export const coords = (sq: Square): { file: number; rank: number } => ({
  file: sq.charCodeAt(0) - 97,
  rank: Number(sq[1]) - 1,
})
