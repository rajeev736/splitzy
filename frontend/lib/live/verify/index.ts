import type { LiveGameId } from "../types"
import { verifyCheckers } from "./checkers"
import { verifyChess } from "./chess"
import { verifyHosted } from "./hosted"
import { verifyLudo } from "./ludo"
import { verifySnakes } from "./snakes"
import { verifySudoku } from "./sudoku"
import { verifyTictactoe } from "./tictactoe"
import type { Verifier } from "./types"

export type { VerifyInput, VerifyResult, Verifier } from "./types"

/**
 * The games the server can check move by move. A game without one (Scribble:
 * guesses and drawings aren't moves to replay) is taken as its room reports
 * it — fine for fun, which is why it isn't offered for a discount.
 */
export const VERIFIERS: Partial<Record<LiveGameId, Verifier>> = Object.fromEntries(
  (
    [
      ["ludo", verifyLudo],
      ["snakes", verifySnakes],
      ["snakes3d", verifySnakes],
      ["chess", verifyChess],
      ["checkers", verifyCheckers],
      ["tictactoe", verifyTictactoe],
      ["sudoku", verifySudoku],
      ["colorclash", verifyHosted],
      ["memory", verifyHosted],
    ] as const
  ).filter(([, v]) => v !== null)
)
