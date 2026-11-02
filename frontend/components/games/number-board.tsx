"use client"

import { ArrowDown01Icon, ArrowUp01Icon, Tick02Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { HUNT_MAX, HUNT_MIN, type HuntHint } from "@/lib/games"
import { cn } from "@/lib/utils"

const NUMBERS = Array.from({ length: HUNT_MAX - HUNT_MIN + 1 }, (_, i) => HUNT_MIN + i)

/** How close the remaining range is, as a hot / cold reading. */
export function huntHeat(low: number, high: number) {
  const left = high - low + 1
  if (left <= 1) return { label: "Found", tone: "text-success", level: 4 }
  if (left <= 4) return { label: "Red hot", tone: "text-red-600 dark:text-red-400", level: 3 }
  if (left <= 10) return { label: "Hot", tone: "text-orange-600 dark:text-orange-400", level: 2 }
  if (left <= 24) return { label: "Warm", tone: "text-amber-600 dark:text-amber-400", level: 1 }
  return { label: "Cold", tone: "text-sky-600 dark:text-sky-400", level: 0 }
}

/** In-range tint by heat: colder ranges stay plain, narrow ones glow. */
const WARM_TONE = [
  "bg-card hover:bg-muted/60",
  "border-amber-500/30 bg-amber-500/8 hover:bg-amber-500/15",
  "border-orange-500/40 bg-orange-500/12 hover:bg-orange-500/20",
  "border-red-500/50 bg-red-500/15 hover:bg-red-500/25",
  "bg-card",
]

/**
 * The 1–60 board for Number Hunt, in one of three uses:
 * - `setup`: the host picks the secret number (`selected`, `onSelect`)
 * - `play`: a player picks their next guess; guesses show their hint and the
 *   numbers ruled out fade away (`hints`, `range`)
 * - `reveal`: a finished game — the secret and someone's guesses
 */
export function NumberBoard({
  mode,
  selected = null,
  onSelect,
  hints = {},
  range = { low: HUNT_MIN, high: HUNT_MAX },
  pending = null,
  secret,
  disabled,
}: {
  mode: "setup" | "play" | "reveal"
  selected?: number | null
  onSelect?: (n: number) => void
  /** Guessed numbers → their hint. */
  hints?: Record<number, HuntHint>
  /** What's still possible. */
  range?: { low: number; high: number }
  /** The number being guessed right now. */
  pending?: number | null
  secret?: number
  disabled?: boolean
}) {
  const heat = huntHeat(range.low, range.high)
  return (
    <div className="mx-auto grid w-full max-w-md grid-cols-6 gap-1.5 sm:grid-cols-10" aria-label="Numbers 1 to 60">
      {NUMBERS.map((n) => {
        const hint = hints[n]
        const inRange = n >= range.low && n <= range.high
        const isSelected = selected === n
        const isPending = pending === n
        const isSecret = secret === n

        let tone = "bg-card hover:bg-muted/60"
        let badge: React.ReactNode = null
        if (mode === "setup") {
          tone = isSelected ? "border-primary bg-primary/10 text-primary ring-1 ring-primary" : tone
        } else if (hint === "found" || (mode === "reveal" && isSecret)) {
          tone = cn(
            "border-success bg-success text-success-foreground shadow-sm",
            mode === "reveal" && !hint && "bg-success/15 text-success"
          )
          badge = hint === "found" ? <HugeiconsIcon icon={Tick02Icon} className="size-3" strokeWidth={3} /> : null
        } else if (hint) {
          tone = "border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-300"
          badge = <HugeiconsIcon icon={hint === "higher" ? ArrowUp01Icon : ArrowDown01Icon} className="size-3" strokeWidth={3} />
        } else if (isPending) {
          tone = "border-primary bg-primary/10"
        } else if (mode === "play" && !inRange) {
          tone = "border-transparent bg-muted/30 text-muted-foreground/40"
        } else if (mode === "play") {
          tone = isSelected ? "border-primary bg-primary/10 text-primary ring-2 ring-primary" : WARM_TONE[heat.level]
        } else if (mode === "reveal") {
          tone = "bg-card text-muted-foreground"
        }

        const clickable =
          !disabled && (mode === "setup" || (mode === "play" && inRange && !hint && pending === null))
        return (
          <button
            key={n}
            type="button"
            disabled={!clickable}
            aria-pressed={mode !== "reveal" ? isSelected : undefined}
            aria-label={`${n}${hint ? `, go ${hint === "found" ? "— found it" : hint}` : ""}`}
            onClick={() => onSelect?.(n)}
            className={cn(
              "relative flex h-10 items-center justify-center rounded-md border text-sm font-semibold tabular-nums transition-[background-color,border-color,color,opacity,transform] duration-300 disabled:cursor-default sm:h-9",
              clickable && "active:scale-95",
              hint && "animate-in duration-300 zoom-in-75",
              tone
            )}
          >
            {isPending ? <span className="size-2.5 animate-ping rounded-full bg-primary/60" /> : n}
            {badge && (
              <span className="absolute top-0.5 right-0.5 leading-none" aria-hidden>
                {badge}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
