"use client"

import { PlayerAvatar } from "../../player-avatar"
import { cn } from "@/lib/utils"
import type { TttSceneProps, TttSeat } from "./types"

/** The free look: the app's own cards and colours. */
export default function ClassicScene({ board, winLine, lastMove, canPlay, onPlay, me, opponent, status, tone, round, bestOf, toWin }: TttSceneProps) {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-center gap-4">
      <div className="grid w-full grid-cols-[1fr_auto_1fr] items-center gap-2">
        <Chip seat={me} you />
        <div className="text-center text-xs text-muted-foreground">
          Round {Math.min(round, bestOf)}
          <br />
          first to {toWin}
        </div>
        <Chip seat={opponent} />
      </div>

      <p
        className={cn("text-sm font-semibold", tone === "win" && "text-success", tone === "turn" && "text-primary")}
        aria-live="polite"
      >
        {status}
      </p>

      <div
        className="grid aspect-square w-full max-w-[min(88vw,22rem)] grid-cols-[repeat(3,minmax(0,1fr))] grid-rows-[repeat(3,minmax(0,1fr))] gap-2"
        role="grid"
        aria-label="Board"
      >
        {Array.from(board).map((cell, i) => {
          const win = winLine?.includes(i)
          const empty = cell === "."
          return (
            <button
              key={i}
              type="button"
              role="gridcell"
              aria-label={empty ? `Square ${i + 1}, empty` : `Square ${i + 1}, ${cell.toUpperCase()}`}
              disabled={!canPlay || !empty}
              onClick={() => onPlay(i)}
              className={cn(
                "flex min-h-0 min-w-0 items-center justify-center overflow-hidden rounded-xl border-2 bg-card text-5xl leading-none font-black transition-all",
                empty && canPlay && "hover:border-primary/50 hover:bg-primary/5 active:scale-95",
                win && "border-success bg-success/10",
                lastMove === i && "animate-in duration-200 zoom-in-50"
              )}
            >
              {cell === "x" && <span className="text-sky-500">✕</span>}
              {cell === "o" && <span className="text-rose-500">◯</span>}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function Chip({ seat, you }: { seat: TttSeat; you?: boolean }) {
  return (
    <div
      className={cn(
        "flex min-w-0 items-center gap-2 rounded-lg border bg-card px-2 py-2 transition-colors",
        you ? "flex-row" : "flex-row-reverse text-right",
        seat.active && "border-primary ring-1 ring-primary",
        seat.away && "opacity-60"
      )}
    >
      <PlayerAvatar player={seat} size={32} className="shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium">
          {seat.name}{" "}
          <span className={seat.mark === "x" ? "text-sky-500" : "text-rose-500"}>
            {seat.mark === "x" ? "✕" : seat.mark === "o" ? "◯" : ""}
          </span>
        </p>
        <p className="text-lg leading-none font-bold tabular-nums">{seat.wins}</p>
      </div>
    </div>
  )
}
