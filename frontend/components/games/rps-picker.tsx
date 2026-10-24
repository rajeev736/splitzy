"use client"

import { RPS_LABEL, RPS_MOVES, RPS_ROUNDS, type RpsMove } from "@/lib/games"
import { cn } from "@/lib/utils"

/** Pick one move for each of the 3 rounds. `value` has one slot per round. */
export function RpsPicker({
  value,
  onChange,
  disabled,
}: {
  value: (RpsMove | null)[]
  onChange: (next: (RpsMove | null)[]) => void
  disabled?: boolean
}) {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: RPS_ROUNDS }, (_, round) => (
        <div key={round} className="flex items-center gap-3">
          <span className="w-16 shrink-0 text-xs font-medium text-muted-foreground">Round {round + 1}</span>
          <div className="grid flex-1 grid-cols-3 gap-2" role="radiogroup" aria-label={`Round ${round + 1}`}>
            {RPS_MOVES.map((move) => {
              const selected = value[round] === move
              return (
                <button
                  key={move}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  disabled={disabled}
                  onClick={() => onChange(value.map((v, i) => (i === round ? move : v)))}
                  className={cn(
                    "flex flex-col items-center gap-0.5 rounded-md border bg-card py-2 transition-colors active:scale-95 disabled:opacity-50",
                    selected ? "border-primary bg-muted ring-1 ring-primary" : "hover:bg-muted/60"
                  )}
                >
                  <span className="text-2xl leading-none" aria-hidden>
                    {RPS_LABEL[move].emoji}
                  </span>
                  <span className="text-[11px] font-medium">{RPS_LABEL[move].name}</span>
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

export const emptyRpsMoves = (): (RpsMove | null)[] => Array.from({ length: RPS_ROUNDS }, () => null)
export const isComplete = (moves: (RpsMove | null)[]): moves is RpsMove[] => moves.every((m) => m !== null)
