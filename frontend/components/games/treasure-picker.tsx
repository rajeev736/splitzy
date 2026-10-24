"use client"

import { TREASURE_BOXES } from "@/lib/games"
import { cn } from "@/lib/utils"

/**
 * 3×3 grid of boxes. A player picks one (`value` / `onChange`); the host hides
 * treasure in several (`selected` / `onToggle`); or show a finished game:
 * which boxes held treasure (`treasure`) and who opened what (`picks`).
 */
export function TreasureGrid({
  value,
  onChange,
  disabled,
  treasure,
  picks,
  selected,
  onToggle,
}: {
  value?: number | null
  onChange?: (box: number) => void
  /** Host setup: the boxes chosen to hold treasure. */
  selected?: number[]
  onToggle?: (box: number) => void
  disabled?: boolean
  treasure?: number[]
  /** Box → names of people who opened it. */
  picks?: Record<number, string[]>
}) {
  const revealed = treasure !== undefined
  return (
    <div
      className="mx-auto grid w-full max-w-xs grid-cols-3 gap-2"
      role={revealed || selected !== undefined ? undefined : "radiogroup"}
      aria-label="Boxes"
    >
      {Array.from({ length: TREASURE_BOXES }, (_, box) => {
        const hiding = selected !== undefined
        const isPicked = hiding ? selected.includes(box) : value === box
        const hasTreasure = treasure?.includes(box)
        const openedBy = picks?.[box] ?? []
        return (
          <button
            key={box}
            type="button"
            role={revealed || hiding ? undefined : "radio"}
            aria-checked={revealed || hiding ? undefined : isPicked}
            aria-pressed={hiding ? isPicked : undefined}
            aria-label={`Box ${box + 1}${hasTreasure ? ", treasure" : ""}`}
            disabled={disabled || revealed}
            onClick={() => (hiding ? onToggle?.(box) : onChange?.(box))}
            className={cn(
              "flex aspect-square flex-col items-center justify-center gap-1 rounded-md border bg-card transition-colors disabled:cursor-default",
              !revealed && "hover:bg-muted/60 active:scale-95",
              isPicked &&
                !revealed &&
                "border-primary bg-primary/10 ring-1 ring-primary",
              revealed && hasTreasure && "border-warning/50 bg-warning/10",
              revealed && !hasTreasure && "opacity-60"
            )}
          >
            <span className="text-2xl leading-none" aria-hidden>
              {revealed
                ? hasTreasure
                  ? "💰"
                  : "📦"
                : isPicked
                  ? hiding
                    ? "💰"
                    : "🎁"
                  : "📦"}
            </span>
            {openedBy.length > 0 ? (
              <span className="max-w-full truncate px-1 text-[10px] font-medium">
                {openedBy.join(", ")}
              </span>
            ) : (
              <span className="text-[10px] text-muted-foreground">
                {box + 1}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
