import { serverTimestamp } from "firebase/database"

import { seededIndex } from "./room"
import type { LiveResult, RoomOptions, RoomPlayer } from "./types"

/**
 * Checkers (English / American draughts): game state kept at
 * rooms/{code}/state. This module is the rule book — legal moves (captures
 * are compulsory and must be followed through), crowning, how a game ends —
 * plus who plays which side.
 *
 *   light, dark   uids. Light moves first
 *   board         64 cells, row 0 at the top (dark's back row): "" empty,
 *                 l / d men, L / D kings. Only the dark squares are used
 *   turn          side to move
 *   moves         plies played
 *   quiet         plies in a row without a capture or a man moving: 40 is a draw
 *   history       moves in standard notation (22-18, 15x22x29), oldest first.
 *                 RTDB drops empty arrays: absent until the first move
 *   lastMove      squares of the last move, for highlights / animation
 *   drawOffer     uid of the player offering a draw (cleared when the other side moves)
 *   result        set once the game is decided; the shell ends the room right after
 *   startedAt     server ms
 *   lastMoveAt    server ms of the last move (or the start)
 *
 * RTDB also drops nulls, so every nullable field may be missing when read.
 */
export interface CheckersState {
  light: string
  dark: string
  board: Board
  turn: Side
  moves: number
  quiet: number
  history?: string[]
  lastMove?: CheckersLastMove | null
  drawOffer?: string | null
  result?: CheckersResult | null
  startedAt: number
  lastMoveAt: number
}

export type Side = "l" | "d"
/** Empty, a man, or a king of either side. */
export type Cell = "" | "l" | "L" | "d" | "D"
export type Board = Cell[]

export interface CheckersMove {
  /** Squares visited, start first: two for a step, one more per jump. */
  path: number[]
  /** The pieces taken, one per jump, in order. Empty for a step. */
  captured: number[]
}

export interface CheckersLastMove {
  from: number
  to: number
  path: number[]
  /** Missing when the move was a plain step. */
  captured?: number[]
  crowned?: boolean
}

export type CheckersEndReason =
  | "no_pieces"
  | "no_moves"
  | "forty_moves"
  | "resign"
  | "draw_agreed"
  | "abandoned"

export interface CheckersResult {
  /** Missing / null = draw. */
  winner?: string | null
  reason: CheckersEndReason
}

/** What the position says, before anyone resigns or agrees a draw. */
export type CheckersStatus =
  | { kind: "ongoing" }
  | { kind: "win"; side: Side; reason: "no_pieces" | "no_moves" }
  | { kind: "draw"; reason: "forty_moves" }

export const SIDES: Side[] = ["l", "d"]
export const MEN_PER_SIDE = 12
/** Plies without a capture or a man moving before the game is a draw. */
export const DRAW_QUIET_PLIES = 40

/** Write-time placeholder for the server clock. */
const ts = () => serverTimestamp() as unknown as number

/* ── Geometry ────────────────────────────────────────────────────────── */

export const rowOf = (i: number) => Math.floor(i / 8)
export const colOf = (i: number) => i % 8
export const cellAt = (row: number, col: number) => row * 8 + col
const onBoard = (row: number, col: number) =>
  row >= 0 && row < 8 && col >= 0 && col < 8

/** The dark squares, where the game is played: row + col odd, so each side has one in its left-hand corner. */
export const isPlayable = (i: number) => (rowOf(i) + colOf(i)) % 2 === 1

/** Standard numbering of the 32 playable squares: 1 top left (dark's side) to 32 bottom right. */
export const squareNumber = (i: number) => Math.floor(i / 2) + 1

/** The board index of a numbered square (1–32). */
export function cellOfNumber(n: number) {
  const base = (n - 1) * 2
  // Even rows have their dark squares on the odd columns
  return rowOf(base) % 2 === 0 ? base + 1 : base
}

/* ── Pieces ──────────────────────────────────────────────────────────── */

export const sideOfCell = (c: Cell): Side | null =>
  c === "" ? null : c === "l" || c === "L" ? "l" : "d"

export const isKing = (c: Cell) => c === "L" || c === "D"

export const otherSide = (s: Side): Side => (s === "l" ? "d" : "l")

/** Light sits at the bottom and moves up the board (towards row 0); dark comes down. */
const forwardOf = (s: Side) => (s === "l" ? -1 : 1)

/** The far row, where a man becomes a king. */
export const crownRow = (s: Side) => (s === "l" ? 0 : 7)

const kingOf = (s: Side): Cell => (s === "l" ? "L" : "D")

const ALL_DIRS: readonly (readonly [number, number])[] = [
  [-1, -1],
  [-1, 1],
  [1, -1],
  [1, 1],
]

/** Men only go forward; kings any of the four ways. */
const directionsOf = (cell: Cell, side: Side) =>
  isKing(cell) ? ALL_DIRS : ALL_DIRS.filter(([dr]) => dr === forwardOf(side))

/* ── Setup ───────────────────────────────────────────────────────────── */

/** Twelve men each on the dark squares of the three nearest rows. */
export function initialBoard(): Board {
  const board: Board = Array.from({ length: 64 }, () => "")
  for (let i = 0; i < 64; i++) {
    if (!isPlayable(i)) continue
    const row = rowOf(i)
    if (row < 3) board[i] = "d"
    else if (row > 4) board[i] = "l"
  }
  return board
}

/**
 * Who is light. The host (seat 0, `players[0]`) picked a side or left it to
 * chance; "random" is decided from the room code so every device agrees.
 */
export function assignSides(
  players: RoomPlayer[],
  options: RoomOptions,
  seed: string
): { light: string; dark: string } {
  const host = players[0].uid
  const guest = players.find((p) => p.uid !== host)?.uid ?? host
  const pick = options.colour
  const hostIsLight =
    pick === "light"
      ? true
      : pick === "dark"
        ? false
        : seededIndex(seed, 2) === 0
  return hostIsLight
    ? { light: host, dark: guest }
    : { light: guest, dark: host }
}

export function initialCheckersState(
  players: RoomPlayer[],
  options: RoomOptions,
  seed: string
): CheckersState {
  const { light, dark } = assignSides(players, options, seed)
  // Nullable fields are left out: the database rejects undefined and drops null anyway
  return {
    light,
    dark,
    board: initialBoard(),
    turn: "l",
    moves: 0,
    quiet: 0,
    startedAt: ts(),
    lastMoveAt: ts(),
  }
}

/* ── Reading the state ───────────────────────────────────────────────── */

/** The board as a dense 64-cell array, whatever shape the database handed back. */
export const boardOf = (state: CheckersState): Board =>
  normaliseBoard(state.board)

export function normaliseBoard(raw: unknown): Board {
  const cells: unknown[] = Array.isArray(raw)
    ? raw
    : raw && typeof raw === "object"
      ? Object.values(raw)
      : []
  const board: Board = Array.from({ length: 64 }, () => "")
  for (let i = 0; i < 64; i++) {
    const c = cells[i]
    if (c === "l" || c === "L" || c === "d" || c === "D") board[i] = c
  }
  return board
}

export const historyOf = (state: CheckersState): string[] =>
  Array.isArray(state.history) ? state.history : []

export const sideOf = (state: CheckersState, uid: string): Side | null =>
  state.light === uid ? "l" : state.dark === uid ? "d" : null

export const uidOf = (state: CheckersState, side: Side) =>
  side === "l" ? state.light : state.dark

export const opponentOf = (state: CheckersState, uid: string) =>
  state.light === uid ? state.dark : state.light

export const isOver = (state: CheckersState) => !!state.result

export function pieceCounts(
  board: Board
): Record<Side, { men: number; kings: number }> {
  const counts = { l: { men: 0, kings: 0 }, d: { men: 0, kings: 0 } }
  for (const c of board) {
    const side = sideOfCell(c)
    if (!side) continue
    if (isKing(c)) counts[side].kings++
    else counts[side].men++
  }
  return counts
}

/* ── Legal moves ─────────────────────────────────────────────────────── */

/**
 * Every complete jump sequence for the piece at the end of `path`. Pieces
 * taken stay on the board until the move ends (so none is jumped twice), and
 * crowning ends the move: a man that lands on the far row stops there.
 */
function jumpsFrom(
  board: Board,
  side: Side,
  cell: Cell,
  path: number[],
  captured: number[],
  out: CheckersMove[]
) {
  const pos = path[path.length - 1]
  const row = rowOf(pos)
  const col = colOf(pos)
  let extended = false
  for (const [dr, dc] of directionsOf(cell, side)) {
    if (!onBoard(row + 2 * dr, col + 2 * dc)) continue
    const over = cellAt(row + dr, col + dc)
    const land = cellAt(row + 2 * dr, col + 2 * dc)
    if (sideOfCell(board[over]) !== otherSide(side) || captured.includes(over))
      continue
    // The starting square is empty once the piece has left it (a king may come back round)
    if (board[land] !== "" && land !== path[0]) continue
    extended = true
    const nextPath = [...path, land]
    const nextCaptured = [...captured, over]
    if (!isKing(cell) && rowOf(land) === crownRow(side))
      out.push({ path: nextPath, captured: nextCaptured })
    else jumpsFrom(board, side, cell, nextPath, nextCaptured, out)
  }
  if (!extended && captured.length > 0) out.push({ path, captured })
}

/**
 * All moves open to `side`. Captures are compulsory: when any piece can
 * jump, only the (complete) jump sequences are returned, one per branch.
 */
export function legalMoves(board: Board, side: Side): CheckersMove[] {
  const captures: CheckersMove[] = []
  for (let i = 0; i < 64; i++) {
    if (sideOfCell(board[i]) === side)
      jumpsFrom(board, side, board[i], [i], [], captures)
  }
  if (captures.length > 0) return captures

  const steps: CheckersMove[] = []
  for (let i = 0; i < 64; i++) {
    const cell = board[i]
    if (sideOfCell(cell) !== side) continue
    for (const [dr, dc] of directionsOf(cell, side)) {
      const row = rowOf(i) + dr
      const col = colOf(i) + dc
      if (!onBoard(row, col)) continue
      const to = cellAt(row, col)
      if (board[to] === "") steps.push({ path: [i, to], captured: [] })
    }
  }
  return steps
}

export const sameMove = (a: CheckersMove, b: CheckersMove) =>
  a.path.length === b.path.length &&
  a.path.every((sq, i) => sq === b.path[i]) &&
  a.captured.length === b.captured.length &&
  a.captured.every((sq, i) => sq === b.captured[i])

/** The moves that begin with `prefix` (the squares tapped so far). */
export const movesAlong = (moves: CheckersMove[], prefix: number[]) =>
  moves.filter(
    (m) =>
      m.path.length >= prefix.length &&
      prefix.every((sq, i) => m.path[i] === sq)
  )

/** Squares that may be picked up: the start of every legal move. */
export const movableSquares = (moves: CheckersMove[]) =>
  Array.from(new Set(moves.map((m) => m.path[0])))

/** A board with one piece moved and nothing else changed (for previewing a jump in progress). */
export function movePiece(board: Board, from: number, to: number): Board {
  const next = board.slice()
  next[to] = next[from]
  next[from] = ""
  return next
}

/** The board after `move`: the piece lands, what it jumped is gone, and it's crowned if it reached the far row. */
export function applyMoveToBoard(
  board: Board,
  move: CheckersMove
): { board: Board; crowned: boolean } {
  const next = board.slice()
  const from = move.path[0]
  const to = move.path[move.path.length - 1]
  const cell = next[from]
  const side = sideOfCell(cell)
  next[from] = ""
  for (const sq of move.captured) next[sq] = ""
  const crowned = !!side && !isKing(cell) && rowOf(to) === crownRow(side)
  next[to] = crowned && side ? kingOf(side) : cell
  return { board: next, crowned }
}

/** "22-18" for a step, "22x15x8" for a jump sequence. */
export const notation = (move: CheckersMove) =>
  move.path.map(squareNumber).join(move.captured.length > 0 ? "x" : "-")

/* ── Playing & results ───────────────────────────────────────────────── */

/**
 * What the position says for the side to move: they've lost if they have no
 * pieces or no legal move; it's a draw once the quiet counter runs out.
 * Ignores `result` (resignations and agreed draws are recorded separately).
 */
export function status(state: CheckersState): CheckersStatus {
  const board = boardOf(state)
  const side = state.turn
  const counts = pieceCounts(board)[side]
  if (counts.men + counts.kings === 0)
    return { kind: "win", side: otherSide(side), reason: "no_pieces" }
  if (legalMoves(board, side).length === 0)
    return { kind: "win", side: otherSide(side), reason: "no_moves" }
  if (state.quiet >= DRAW_QUIET_PLIES)
    return { kind: "draw", reason: "forty_moves" }
  return { kind: "ongoing" }
}

/**
 * `uid` plays `move` at `now` (server ms). Returns the next state, or null
 * when it isn't their turn, the move isn't legal (a step while a capture is
 * on, an unfinished jump…) or the game is over. `lastMoveAt` is set to `now`;
 * the caller swaps in a server timestamp before writing.
 */
export function applyMove(
  state: CheckersState,
  uid: string,
  move: CheckersMove,
  now: number
): CheckersState | null {
  if (state.result) return null
  const side = state.turn
  if (sideOf(state, uid) !== side) return null
  const board = boardOf(state)
  const legal = legalMoves(board, side).find((m) => sameMove(m, move))
  if (!legal) return null

  const piece = board[legal.path[0]]
  const applied = applyMoveToBoard(board, legal)
  const last: CheckersLastMove = {
    from: legal.path[0],
    to: legal.path[legal.path.length - 1],
    path: legal.path,
  }
  if (legal.captured.length > 0) last.captured = legal.captured
  if (applied.crowned) last.crowned = true

  const next: CheckersState = {
    light: state.light,
    dark: state.dark,
    board: applied.board,
    turn: otherSide(side),
    moves: state.moves + 1,
    // A capture or a man moving is progress; kings shuffling about is not
    quiet: legal.captured.length > 0 || !isKing(piece) ? 0 : state.quiet + 1,
    history: [...historyOf(state), notation(legal)],
    lastMove: last,
    startedAt: state.startedAt,
    lastMoveAt: now,
  }
  // An offer stands until the other side answers — moving on is the answer
  if (state.drawOffer === uid) next.drawOffer = uid

  const st = status(next)
  if (st.kind === "win")
    next.result = { winner: uidOf(next, st.side), reason: st.reason }
  else if (st.kind === "draw") next.result = { winner: null, reason: st.reason }
  return next
}

/** What the room records when the game ends. */
export function toLiveResult(result: CheckersResult): LiveResult {
  return {
    winnerIds: result.winner ? [result.winner] : [],
    reason: result.reason,
  }
}
