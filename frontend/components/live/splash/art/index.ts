import type * as React from "react"

import type { LiveGameId } from "@/lib/live/types"
import type { SplashArtProps } from "../types"
import CheckersSplash from "./checkers"
import ChessSplash from "./chess"
import LudoSplash from "./ludo"
import ScribbleSplash from "./scribble"
import SnakesSplash from "./snakes"
import Snakes3DSplash from "./snakes3d"
import SudokuSplash from "./sudoku"
import TicTacToeSplash from "./tictactoe"

/** Bundled with the room (not lazy): a splash has to paint the instant the game starts. */
export const SPLASH_ART: Record<LiveGameId, React.ComponentType<SplashArtProps>> = {
  scribble: ScribbleSplash,
  ludo: LudoSplash,
  snakes3d: Snakes3DSplash,
  snakes: SnakesSplash,
  sudoku: SudokuSplash,
  chess: ChessSplash,
  checkers: CheckersSplash,
  tictactoe: TicTacToeSplash,
}
