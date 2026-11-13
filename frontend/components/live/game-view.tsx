"use client"

import * as React from "react"

import type { LiveGameProps, LiveResult, RoomMeta, RoomPlayer } from "@/lib/live/types"
import { endGame as endGameService } from "@/services/live-rooms"
import { CheckersGame } from "./checkers/checkers-game"
import { ChessGame } from "./chess/chess-game"
import { LudoGame } from "./ludo/ludo-game"
import { ScribbleGame } from "./scribble/scribble-game"
import { TicTacToeGame } from "./tictactoe/tictactoe-game"

const GAME_COMPONENTS: Record<RoomMeta["game"], React.ComponentType<LiveGameProps>> = {
  scribble: ScribbleGame,
  ludo: LudoGame,
  chess: ChessGame,
  checkers: CheckersGame,
  tictactoe: TicTacToeGame,
}

/** Renders the room's game and hands it everything it needs from the shell. */
export function GameView({
  code,
  meta,
  players,
  uid,
  me,
  isReferee,
  now,
  serverNow,
}: Omit<LiveGameProps, "endGame">) {
  const Game = GAME_COMPONENTS[meta.game]
  const endGame = React.useCallback((result: LiveResult) => endGameService(code, result), [code])
  return (
    <Game
      code={code}
      meta={meta}
      players={players}
      uid={uid}
      me={me}
      isReferee={isReferee}
      now={now}
      serverNow={serverNow}
      endGame={endGame}
    />
  )
}

export type { RoomPlayer }
