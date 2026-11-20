import { seededIndex } from "./room"
import type { LiveResult, RoomOptions, RoomPlayer } from "./types"

/**
 * Tic Tac Toe, a short match of rounds. State at rooms/{code}/state:
 *
 *   players   [uidX0, uidO0]: seat order; who plays X flips every round
 *   board     9 cells, "" / "x" / "o" (dense string, so the database keeps it)
 *   xPlayer   who plays X this round (X always moves first)
 *   turn      "x" | "o"
 *   round     1-based
 *   bestOf    1 / 3 / 5
 *   wins      { uid: rounds won }
 *   roundOver null, or the round's result ("x" | "o" | "draw") until the next round starts
 *   winLine   the three winning cells, for the highlight
 *   seq       bumps on every write (stale writes abort)
 *   forfeit   who walked away (the other player wins the match); missing while both play
 *   log       the move log (lib/live/log, TTT_LOG), replayed by lib/live/verify/tictactoe
 */
export interface TicTacToeState {
  players: string[]
  board: string
  xPlayer: string
  turn: "x" | "o"
  round: number
  bestOf: number
  wins: Record<string, number>
  roundOver?: "x" | "o" | "draw" | null
  winLine?: number[] | null
  /** Server ms the current round's last move (or start) happened. */
  turnAt: number
  seq: number
  /** The player who walked away: the match is over, the other one wins it. */
  forfeit?: string | null
}

export const EMPTY_BOARD = "........."
const LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
]

export function initialTicTacToeState(
  players: RoomPlayer[],
  options: RoomOptions,
  seed: string
): TicTacToeState {
  const uids = players.slice(0, 2).map((p) => p.uid)
  const bestOf = [1, 3, 5].includes(Number(options.bestOf))
    ? Number(options.bestOf)
    : 3
  return {
    players: uids,
    board: EMPTY_BOARD,
    xPlayer: uids[seededIndex(seed, 2)] ?? uids[0],
    turn: "x",
    round: 1,
    bestOf,
    wins: Object.fromEntries(uids.map((u) => [u, 0])),
    roundOver: null,
    winLine: null,
    turnAt: 0,
    seq: 0,
  }
}

export const markOf = (s: TicTacToeState, uid: string): "x" | "o" | null =>
  !s.players.includes(uid) ? null : s.xPlayer === uid ? "x" : "o"

export const uidOf = (s: TicTacToeState, mark: "x" | "o") =>
  mark === "x"
    ? s.xPlayer
    : (s.players.find((p) => p !== s.xPlayer) ?? s.xPlayer)

export function winnerOf(
  board: string
): { mark: "x" | "o"; line: number[] } | null {
  for (const line of LINES) {
    const [a, b, c] = line
    if (board[a] !== "." && board[a] === board[b] && board[a] === board[c]) {
      return { mark: board[a] as "x" | "o", line }
    }
  }
  return null
}

/** Rounds a player must win to take the match. */
export const toWin = (bestOf: number) => Math.floor(bestOf / 2) + 1

/** Places a mark; returns the new state, or null when the move isn't allowed. */
export function applyMark(
  s: TicTacToeState,
  uid: string,
  cell: number
): TicTacToeState | null {
  const mark = markOf(s, uid)
  if (
    !mark ||
    s.forfeit ||
    s.roundOver ||
    s.turn !== mark ||
    cell < 0 ||
    cell > 8 ||
    s.board[cell] !== "."
  )
    return null
  const board = s.board.slice(0, cell) + mark + s.board.slice(cell + 1)
  const win = winnerOf(board)
  const full = !board.includes(".")
  const next: TicTacToeState = {
    ...s,
    board,
    seq: s.seq + 1,
    turn: mark === "x" ? "o" : "x",
  }
  if (win) {
    next.roundOver = win.mark
    next.winLine = win.line
    next.wins = { ...s.wins, [uid]: (s.wins[uid] ?? 0) + 1 }
  } else if (full) {
    next.roundOver = "draw"
  }
  return next
}

/**
 * What goes in the move log (lib/live/log) for each write. None starts with
 * "r" (kept for the server's dice).
 *   m<cell>      a mark on cell 0–8 (by the player making it)
 *   n            the next round starts (by the referee)
 *   end:left:<i> players[i] walked away and forfeits the match (by the referee)
 */
export const TTT_LOG = {
  mark: (cell: number) => `m${cell}`,
  next: "n",
  left: (index: number) => `end:left:${index}`,
} as const

/** The match is decided (someone reached toWin, or every round has been played). */
export function matchOver(s: TicTacToeState): boolean {
  if (!s.roundOver) return false
  const need = toWin(s.bestOf)
  return s.players.some((p) => (s.wins[p] ?? 0) >= need) || s.round >= s.bestOf
}

/** Next round: fresh board, and the loser of the last round (or the other player after a draw) plays X. */
export function nextRound(s: TicTacToeState): TicTacToeState {
  const lastX = s.xPlayer
  const other = s.players.find((p) => p !== lastX) ?? lastX
  const xPlayer =
    s.roundOver === "x" ? other : s.roundOver === "o" ? lastX : other
  return {
    ...s,
    board: EMPTY_BOARD,
    xPlayer,
    turn: "x",
    round: s.round + 1,
    roundOver: null,
    winLine: null,
    seq: s.seq + 1,
  }
}

export function matchResult(
  s: TicTacToeState,
  reason = "rounds_over"
): LiveResult {
  const [a, b] = s.players
  const wa = s.wins[a] ?? 0
  const wb = s.wins[b] ?? 0
  const winnerIds = wa === wb ? [] : [wa > wb ? a : b]
  return {
    winnerIds,
    ranking: wa >= wb ? [a, b] : [b, a],
    scores: { [a]: wa, [b]: wb },
    reason,
  }
}
