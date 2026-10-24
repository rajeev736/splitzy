"use client"

import { COIN_FLIPS, COIN_LABEL, COIN_SIDES, type CoinSide } from "@/lib/games"
import { cn } from "@/lib/utils"

/** Call Heads or Tails for each of the 5 flips. `value` has one slot per flip. */
export function CoinTossPicker({
  value,
  onChange,
  disabled,
}: {
  value: (CoinSide | null)[]
  onChange: (next: (CoinSide | null)[]) => void
  disabled?: boolean
}) {
  return (
    <div className="flex flex-col gap-2.5">
      {Array.from({ length: COIN_FLIPS }, (_, flip) => (
        <div key={flip} className="flex items-center gap-3">
          <span className="w-12 shrink-0 text-xs font-medium text-muted-foreground">Flip {flip + 1}</span>
          <div className="grid flex-1 grid-cols-2 gap-2" role="radiogroup" aria-label={`Flip ${flip + 1}`}>
            {COIN_SIDES.map((side) => {
              const selected = value[flip] === side
              return (
                <button
                  key={side}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  disabled={disabled}
                  onClick={() => onChange(value.map((v, i) => (i === flip ? side : v)))}
                  className={cn(
                    "flex h-10 items-center justify-center gap-2 rounded-md border bg-card text-sm font-medium transition-colors active:scale-95 disabled:opacity-50",
                    selected ? "border-primary bg-primary/10 text-primary ring-1 ring-primary" : "hover:bg-muted/60"
                  )}
                >
                  <span
                    aria-hidden
                    className={cn(
                      "flex size-5 items-center justify-center rounded-full border text-[10px] font-bold",
                      selected ? "border-primary" : "border-muted-foreground/40 text-muted-foreground"
                    )}
                  >
                    {side}
                  </span>
                  {COIN_LABEL[side]}
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

export const emptyCoinCalls = (): (CoinSide | null)[] => Array.from({ length: COIN_FLIPS }, () => null)
export const isCoinComplete = (calls: (CoinSide | null)[]): calls is CoinSide[] => calls.every((c) => c !== null)

/** A row of coin faces, e.g. the revealed flips or someone's calls. */
export function CoinRow({ sides, highlight }: { sides: string[]; highlight?: boolean[] }) {
  return (
    <div className="flex gap-1.5">
      {sides.map((s, i) => (
        <span
          key={i}
          className={cn(
            "flex size-7 items-center justify-center rounded-full border text-xs font-bold",
            highlight === undefined
              ? "border-warning/50 bg-warning/10 text-warning"
              : highlight[i]
                ? "border-success/50 bg-success/10 text-success"
                : "text-muted-foreground"
          )}
        >
          {s}
        </span>
      ))}
    </div>
  )
}
