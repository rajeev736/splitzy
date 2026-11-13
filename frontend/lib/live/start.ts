import { initialCheckersState } from "./checkers"
import { initialChessState } from "./chess"
import { initialLudoState } from "./ludo"
import { initialScribbleState } from "./scribble"
import { initialTicTacToeState } from "./tictactoe"
import type { LiveGameId, RoomOptions, RoomPlayer } from "./types"

/**
 * The first game state, written by the referee together with
 * `meta.status = "playing"`. Each game owns its own shape (see lib/live/<game>).
 * `seed` (the room code) makes random picks like "who's white" the same on
 * every device.
 */
export function initialStateFor(game: LiveGameId, players: RoomPlayer[], options: RoomOptions, seed: string): object {
  switch (game) {
    case "scribble":
      return initialScribbleState(players, options, seed)
    case "ludo":
      return initialLudoState(players, options, seed)
    case "chess":
      return initialChessState(players, options, seed)
    case "checkers":
      return initialCheckersState(players, options, seed)
    case "tictactoe":
      return initialTicTacToeState(players, options, seed)
  }
}
