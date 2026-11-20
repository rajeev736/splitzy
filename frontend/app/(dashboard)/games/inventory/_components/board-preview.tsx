"use client"

import { Chess } from "chess.js"

import { ThemePicture } from "@/components/live/board-theme-picker"
import { ChessBoard, type BoardPiece } from "@/components/live/chess/chess-board"
import { LudoBoard } from "@/components/live/ludo/ludo-board"
import type { LudoState } from "@/lib/live/ludo"
import type { BoardTheme, ChessLook, LudoLook } from "@/lib/live/themes"
import { cn } from "@/lib/utils"

/*
 * The real boards, drawn in a theme with a game in progress, so a theme is
 * judged on what you'll actually play on (not just its thumbnail).
 */

/** Four players a few moves in: pieces in base, on the track and one in a home column. */
const LUDO_DEMO: LudoState = {
  phase: "roll",
  order: ["r", "g", "y", "b"],
  players: {
    r: { uid: "r", colour: "red", tokens: [-1, -1, 6, 19], place: 0 },
    g: { uid: "g", colour: "green", tokens: [-1, 2, -1, 28], place: 0 },
    y: { uid: "y", colour: "yellow", tokens: [-1, -1, 11, 53], place: 0 },
    b: { uid: "b", colour: "blue", tokens: [-1, 0, -1, 36], place: 0 },
  },
  turn: "r",
  sixes: 0,
  turnAt: 0,
  seq: 0,
}
const LUDO_POSITIONS = Object.fromEntries(LUDO_DEMO.order.map((uid) => [uid, LUDO_DEMO.players[uid].tokens]))
const NO_TOKENS: number[] = []
const NO_KEYS: string[] = []
const noop = () => {}

/** An Italian Game, just after Black's knight came out. */
const CHESS_FEN = "r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/2N2N2/PPPP1PPP/R1BQK2R w KQkq - 6 5"
const CHESS_LAST = { from: "g8", to: "f6" } as const
let chessPieces: BoardPiece[] | null = null
const demoPieces = () =>
  (chessPieces ??= new Chess(CHESS_FEN)
    .board()
    .flat()
    .flatMap((sq) => (sq ? [{ square: sq.square, type: sq.type, color: sq.color }] : [])))

export function BoardPreview({ theme, className }: { theme: BoardTheme<unknown>; className?: string }) {
  if (theme.game === "ludo") {
    const look = theme.look as LudoLook
    return (
      <div className={cn("rounded-2xl p-2 shadow-lg ring-1 ring-black/10", className)} style={{ background: look.table }}>
        <div className="rounded-xl bg-white/15 p-1 shadow-[0_12px_30px_rgb(0_0_0/0.4)]">
          <LudoBoard
            state={LUDO_DEMO}
            positions={LUDO_POSITIONS}
            flying={NO_KEYS}
            movable={NO_TOKENS}
            meUid=""
            onToken={noop}
            look={look}
            className="pointer-events-none rounded-lg"
          />
        </div>
      </div>
    )
  }
  if (theme.game === "chess") {
    const look = theme.look as ChessLook
    return (
      <div className={cn("pointer-events-none", className)}>
        <ChessBoard
          look={look}
          pieces={demoPieces()}
          flipped={false}
          myColour={null}
          canInteract={false}
          selected={null}
          targets={{}}
          lastMove={CHESS_LAST}
          checkSquare={null}
          promotion={null}
          onSelect={noop}
          onMove={noop}
          onPromote={noop}
          onCancelPromotion={noop}
        />
      </div>
    )
  }
  // Snakes 3D (a heavy 3D scene) and Tic Tac Toe are shown by their preview picture
  return (
    <ThemePicture
      theme={theme}
      className={cn("rounded-2xl shadow-lg ring-1 ring-black/10", className)}
    />
  )
}
