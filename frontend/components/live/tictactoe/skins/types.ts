import type * as React from "react"

/**
 * A Tic Tac Toe skin draws the whole table — both players' cards, the status
 * line and the board — in its own style. The game logic stays in
 * tictactoe-game.tsx; a skin only draws what it's given and calls `onPlay`.
 *
 * Every skin must:
 * - fit its container's width (from 288px phones to a ~30rem desktop column)
 *   without overflowing, and keep the board square and the cells tappable;
 * - animate a newly placed mark (`lastMove`) and highlight `winLine`;
 * - show whose turn it is (`me.active` / `opponent.active`) and the score;
 * - stay legible in the app's light and dark modes (the skin brings its own
 *   background, so mostly it just has to not depend on the page's colours).
 */

export type Mark = "x" | "o"

export interface TttSeat {
  name: string
  photo?: string
  /** Game profile: character and frame ids (components/game-avatar). */
  avatar?: string
  frame?: string
  /** The seat's mark this round (null before the game knows). */
  mark: Mark | null
  wins: number
  /** It's this seat's turn. */
  active: boolean
  /** Offline / left. */
  away?: boolean
}

export interface TttSceneProps {
  /** Nine cells, row by row: "x", "o" or "." for empty. */
  board: string
  /** The three winning cells, once a round is won. */
  winLine?: number[] | null
  /** The cell just played (animate it in). */
  lastMove: number | null
  /** You may play an empty cell right now. */
  canPlay: boolean
  onPlay: (cell: number) => void
  me: TttSeat
  opponent: TttSeat
  /** One line under the players: "Your move", "Waiting for Priya…", "You won the round!". */
  status: string
  tone: "turn" | "wait" | "win" | "lose" | "draw"
  round: number
  bestOf: number
  /** Rounds needed to take the match. */
  toWin: number
}

export type TttScene = React.ComponentType<TttSceneProps>
