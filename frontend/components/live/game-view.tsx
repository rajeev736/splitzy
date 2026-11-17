"use client"

import * as React from "react"

import type {
  LiveGameProps,
  LiveResult,
  RoomMeta,
  RoomPlayer,
} from "@/lib/live/types"
import { useRoomNode } from "@/hooks/use-live-room"
import { endGame as endGameService } from "@/services/live-rooms"
import { CheckersGame } from "./checkers/checkers-game"
import { ChessGame } from "./chess/chess-game"
import { LudoGame } from "./ludo/ludo-game"
import { ScribbleGame } from "./scribble/scribble-game"
import { SnakesGame } from "./snakes/snakes-game"
import { Snakes3DGame } from "./snakes3d/snakes3d-game"
import { PlayerIntro } from "./intro/player-intro"
import { introKey, isTeamGame, shouldPlayIntro } from "./intro/shared"
import { GameSplash } from "./splash/game-splash"
import { SudokuGame } from "./sudoku/sudoku-game"
import { TicTacToeGame } from "./tictactoe/tictactoe-game"

const GAME_COMPONENTS: Record<
  RoomMeta["game"],
  React.ComponentType<LiveGameProps>
> = {
  scribble: ScribbleGame,
  ludo: LudoGame,
  chess: ChessGame,
  checkers: CheckersGame,
  tictactoe: TicTacToeGame,
  snakes: SnakesGame,
  snakes3d: Snakes3DGame,
  sudoku: SudokuGame,
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
  const endGame = React.useCallback(
    (result: LiveResult) => endGameService(code, result),
    [code]
  )
  // Right after the start: the players intro, then the splash (held under the intro), while the
  // game loads under both. The splash is ready once the game's state is in.
  const { data: state } = useRoomNode<unknown>(code, "state")
  const [intro, setIntro] = React.useState(() =>
    shouldPlayIntro(code, meta, players, serverNow)
  )
  const startedAt = meta.startedAt
  React.useEffect(() => {
    if (!intro || !startedAt) return
    try {
      window.sessionStorage.setItem(introKey(code, startedAt), "1")
    } catch {
      // Storage blocked: at worst it replays on a remount
    }
  }, [intro, code, startedAt])
  const endIntro = React.useCallback(() => setIntro(false), [])
  return (
    <>
      {intro ? (
        <PlayerIntro
          game={meta.game}
          players={players}
          meId={uid}
          teams={isTeamGame(meta, players)}
          onDone={endIntro}
        />
      ) : null}
      <GameSplash
        game={meta.game}
        ready={state !== undefined}
        hold={intro}
      />
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
    </>
  )
}

export type { RoomPlayer }
