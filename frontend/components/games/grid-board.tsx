"use client"

import { GRID_CELLS, GRID_SIZE, type GridGameId } from "@/lib/games"
import { cn } from "@/lib/utils"
import { CoinSvg } from "./game-glyph"

/** What a hidden cell is, per game. */
export const GRID_ITEM: Record<GridGameId, { icon: React.ReactNode; name: string; plural: string; empty: string }> = {
  minefield: { icon: "💣", name: "bomb", plural: "bombs", empty: "✓" },
  gold_rush: { icon: <CoinSvg />, name: "gold coin", plural: "gold coins", empty: "·" },
}

/**
 * The 4×4 board for Minefield and Gold Rush, in one of three uses:
 * - `setup`: the host taps cells to hide bombs / gold (`selected`, `onToggle`)
 * - `play`: a player digs tiles one by one (`opened` cell → hit, `onDig`)
 * - `reveal`: a finished game — where everything was (`cells`) and what was dug (`opened`)
 */
export function GridBoard({
  game,
  mode,
  selected = [],
  onToggle,
  opened = {},
  pending,
  onDig,
  cells,
  disabled,
}: {
  game: GridGameId
  mode: "setup" | "play" | "reveal"
  selected?: number[]
  onToggle?: (cell: number) => void
  /** Dug cells → whether they hid a bomb / gold. */
  opened?: Record<number, boolean>
  /** The tile being dug right now. */
  pending?: number | null
  onDig?: (cell: number) => void
  cells?: number[]
  disabled?: boolean
}) {
  const item = GRID_ITEM[game]
  return (
    <div
      className="mx-auto grid w-full max-w-xs gap-1.5"
      style={{ gridTemplateColumns: `repeat(${GRID_SIZE}, minmax(0, 1fr))` }}
      aria-label="Grid"
    >
      {Array.from({ length: GRID_CELLS }, (_, cell) => {
        const isOpen = cell in opened
        const hit = opened[cell]
        const isSelected = selected.includes(cell)
        const hidden = cells?.includes(cell)
        const isPending = pending === cell

        let face: React.ReactNode = null
        let tone = "bg-muted/60 hover:bg-muted"
        if (mode === "setup") {
          face = isSelected ? item.icon : null
          tone = isSelected ? "border-primary bg-primary/10 ring-1 ring-primary" : "bg-card hover:bg-muted/60"
        } else if (isPending) {
          face = <span className="size-3 animate-ping rounded-full bg-primary/60" />
          tone = "bg-muted"
        } else if (isOpen) {
          face = hit ? (game === "minefield" ? "💥" : item.icon) : item.empty
          tone = hit
            ? game === "minefield"
              ? "border-destructive/50 bg-destructive/15"
              : "border-warning/50 bg-warning/15"
            : game === "minefield"
              ? "border-success/40 bg-success/10 text-success"
              : "bg-card text-muted-foreground"
        } else if (mode === "reveal") {
          face = hidden ? item.icon : null
          tone = hidden ? "bg-muted/40 opacity-70" : "bg-card"
        }

        const clickable = !disabled && (mode === "setup" || (mode === "play" && !isOpen && pending == null))
        return (
          <button
            key={cell}
            type="button"
            disabled={!clickable}
            aria-pressed={mode === "setup" ? isSelected : undefined}
            aria-label={`Tile ${cell + 1}${isOpen ? (hit ? `, ${item.name}` : ", empty") : ""}`}
            onClick={() => (mode === "setup" ? onToggle?.(cell) : onDig?.(cell))}
            className={cn(
              "flex aspect-square items-center justify-center rounded-md border text-2xl leading-none font-semibold transition-all disabled:cursor-default",
              clickable && "active:scale-95",
              isOpen && "animate-in zoom-in-75 duration-200",
              tone
            )}
          >
            {face}
          </button>
        )
      })}
    </div>
  )
}
