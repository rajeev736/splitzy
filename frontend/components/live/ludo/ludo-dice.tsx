"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

/** Which of the 9 grid spots carry a pip, per face. */
const PIPS: Record<number, number[]> = {
  1: [4],
  2: [2, 6],
  3: [2, 4, 6],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
}

/**
 * A dice face. Every new `spin` value tumbles it once (pass null to leave it
 * still); `colour` tints the pips with the roller's colour.
 */
export function LudoDice({
  value,
  spin,
  colour,
  className,
}: {
  value: number | null
  spin: number | null
  colour?: string
  className?: string
}) {
  const ref = React.useRef<HTMLDivElement>(null)
  React.useEffect(() => {
    if (spin === null) return
    const el = ref.current
    if (!el || typeof el.animate !== "function") return
    const tumble = el.animate(
      [
        { transform: "rotate(0deg) scale(0.85)" },
        { transform: "rotate(230deg) scale(1.15)", offset: 0.45 },
        { transform: "rotate(360deg) scale(1)" },
      ],
      { duration: 600, easing: "cubic-bezier(.2,.8,.2,1)" }
    )
    return () => tumble.cancel()
  }, [spin])

  const pips = value ? (PIPS[value] ?? []) : []
  return (
    <div
      ref={ref}
      role="img"
      aria-label={value ? `Dice shows ${value}` : "Dice"}
      className={cn(
        "grid size-14 shrink-0 grid-cols-3 grid-rows-3 place-items-center rounded-xl border bg-card p-2 shadow-sm",
        className
      )}
    >
      {Array.from({ length: 9 }, (_, i) => (
        <span
          key={i}
          className={cn(
            "size-2.5 rounded-full transition-opacity",
            pips.includes(i) ? "opacity-100" : "opacity-0"
          )}
          style={{ backgroundColor: colour ?? "var(--foreground)" }}
        />
      ))}
    </div>
  )
}
