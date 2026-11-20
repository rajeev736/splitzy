"use client"

import * as React from "react"

import type {
  LiveGameProps,
  LiveGameId,
  LiveResult,
  RoomMeta,
  RoomPlayer,
} from "@/lib/live/types"
import { useRoomNode } from "@/hooks/use-live-room"
import { endGame as endGameService } from "@/services/live-rooms"
import { CheckersGame } from "./checkers/checkers-game"
import { ColorClashGame } from "./colorclash/colorclash-game"
import { MemoryGame } from "./memory/memory-game"
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
  colorclash: ColorClashGame,
  memory: MemoryGame,
}

/** Renders the room's game and hands it everything it needs from the shell. */
/** Games whose start is the splash with the players' VS line-up (not the character intro). */
const SPLASH_LINEUP: LiveGameId[] = ["snakes"]

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
  // Right after the start, the players' intro: the VS for two, the colour bands
  // for more (once per start on this device, never on a refresh mid-game). The
  // game mounts under it once everyone has landed, so its loading never makes
  // the animation stutter. Alone (or back mid-game) there's only the splash,
  // and only if the game is slow to come in.
  const { data: state } = useRoomNode<unknown>(code, "state")
  const [fresh] = React.useState(() => shouldPlayIntro(code, meta, serverNow))
  const inRoom = players.filter((p) => !p.left).length
  // Some games open on their splash with the players face to face instead (its own VS)
  const lineupSplash = SPLASH_LINEUP.includes(meta.game)
  const [intro, setIntro] = React.useState(() => fresh && inRoom >= 2 && !lineupSplash)
  const [mounted, setMounted] = React.useState(() => !intro)
  const startedAt = meta.startedAt
  React.useEffect(() => {
    if (!fresh || !startedAt) return
    try {
      window.sessionStorage.setItem(introKey(code, startedAt), "1")
    } catch {
      // Storage blocked: at worst it replays on a remount
    }
  }, [fresh, code, startedAt])
  const settle = React.useCallback(() => setMounted(true), [])
  const endIntro = React.useCallback(() => {
    setMounted(true)
    setIntro(false)
  }, [])
  return (
    <>
      {intro ? (
        <PlayerIntro
          game={meta.game}
          players={players}
          meId={uid}
          teams={isTeamGame(meta, players)}
          onSettled={settle}
          onDone={endIntro}
        />
      ) : (
        <GameSplash
          game={meta.game}
          ready={state !== undefined}
          // After the intro, or back mid-game: only if the game is slow, briefly, no players
          // (games with the players' line-up on their splash: the full one)
          fresh={fresh && (inRoom < 2 || lineupSplash)}
          players={players}
          meId={uid}
          teams={isTeamGame(meta, players)}
        />
      )}
      {mounted ? (
        // The boards play their own sounds: no UI tap sound inside (components/rewards/tap-sound)
        <div data-no-tap-sound className="contents">
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
        </div>
      ) : null}
    </>
  )
}

export type { RoomPlayer }
