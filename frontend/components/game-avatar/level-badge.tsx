"use client"

import * as React from "react"

import { MAX_LEVEL } from "@/lib/live/levels"
import { cn } from "@/lib/utils"

/** Shield colours by level band (the titles in lib/live/levels): bronze up to the Legend's. */
const BANDS: { from: number; hi: string; mid: string; low: string; rim: string }[] = [
  { from: 30, hi: "#ffd6f6", mid: "#e04fd8", low: "#5a2ce0", rim: "#f6b818" },
  { from: 25, hi: "#ffc6d3", mid: "#ee4a72", low: "#a8143c", rim: "#640a24" },
  { from: 20, hi: "#fff3a8", mid: "#ffc62a", low: "#d98a06", rim: "#844804" },
  { from: 15, hi: "#e8d2ff", mid: "#a46af2", low: "#6431c4", rim: "#3d1785" },
  { from: 10, hi: "#c4e6ff", mid: "#4a9cf0", low: "#2457c2", rim: "#163880" },
  { from: 5, hi: "#cff7b0", mid: "#5cc24a", low: "#2a8628", rim: "#174f16" },
  { from: 1, hi: "#ffdcb8", mid: "#e0955a", low: "#a3561f", rim: "#62300e" },
]

export const bandOf = (level: number) => BANDS.find((b) => level >= b.from) ?? BANDS[BANDS.length - 1]

/** A level as it arrives from a room (self-reported): a whole number in range, else nothing to show. */
export const validLevel = (v: unknown) =>
  typeof v === "number" && v >= 1 ? Math.min(MAX_LEVEL, Math.floor(v)) : undefined

/**
 * A game level on a crest: the number on a shield coloured by its band, a
 * star on top at the highest level. `size` in px; without it, it fills its
 * box (sized by CSS).
 */
export function LevelBadge({ level, size, className }: { level: number; size?: number; className?: string }) {
  const id = React.useId().replace(/:/g, "")
  const b = bandOf(level)
  const two = level >= 10
  return (
    <svg
      viewBox="0 0 40 46"
      role="img"
      aria-label={`Level ${level}`}
      className={cn("shrink-0 overflow-visible", size === undefined && "size-full", className)}
      style={size === undefined ? undefined : { width: size, height: size * 1.15 }}
    >
      <defs>
        <linearGradient id={`${id}f`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={b.hi} />
          <stop offset=".5" stopColor={b.mid} />
          <stop offset="1" stopColor={b.low} />
        </linearGradient>
      </defs>
      <path
        d="M20 2 L36.5 8 V22.5 C36.5 32.5 29.5 40 20 44 C10.5 40 3.5 32.5 3.5 22.5 V8 Z"
        fill={`url(#${id}f)`}
        stroke={b.rim}
        strokeWidth="2.6"
        strokeLinejoin="round"
        style={{ filter: "drop-shadow(0 1.5px 1.5px rgba(0,0,0,.35))" }}
      />
      <path
        d="M20 5.6 L33.2 10.4 V22.5 C33.2 30.6 27.6 36.6 20 40.2 C12.4 36.6 6.8 30.6 6.8 22.5 V10.4 Z"
        fill="none"
        stroke="rgba(255,255,255,.6)"
        strokeWidth="1.1"
      />
      <path d="M20 5.6 L33.2 10.4 V19 C26 16.5 14 16.5 6.8 19 V10.4 Z" fill="rgba(255,255,255,.28)" />
      {level >= MAX_LEVEL && (
        <path
          d="M20 -6 l2.6 5.3 5.8.8 -4.2 4.1 1 5.8 -5.2-2.7 -5.2 2.7 1-5.8 -4.2-4.1 5.8-.8 Z"
          fill="#ffe066"
          stroke="#a35d00"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
      )}
      <text
        x="20"
        y={two ? 28.6 : 29.6}
        textAnchor="middle"
        fontSize={two ? 16.5 : 19.5}
        fontWeight={900}
        fill="#fff"
        stroke={b.rim}
        strokeWidth="3.4"
        strokeLinejoin="round"
        paintOrder="stroke"
        letterSpacing={two ? "-0.6" : undefined}
        style={{ fontFamily: 'ui-rounded,"SF Pro Rounded","Arial Rounded MT Bold","Nunito",system-ui,sans-serif' }}
      >
        {level}
      </text>
    </svg>
  )
}

/**
 * How far into the level you are: a glossy bar that fills from `from` to
 * `value` (0..1) when it mounts — a level-up animation passes `from`.
 */
export function XpBar({
  value,
  from,
  className,
  label,
}: {
  value: number
  from?: number
  className?: string
  label?: string
}) {
  const [shown, setShown] = React.useState(from ?? value)
  React.useEffect(() => {
    const id = window.requestAnimationFrame(() => setShown(value))
    return () => window.cancelAnimationFrame(id)
  }, [value])
  return (
    <div
      className={cn("h-2 overflow-hidden rounded-full bg-muted shadow-[inset_0_1px_2px_rgba(0,0,0,.12)]", className)}
      role="progressbar"
      aria-label={label ?? "XP to the next level"}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(value * 100)}
    >
      <div
        className="h-full rounded-full bg-[linear-gradient(180deg,#ffe48a,#ffb81f_55%,#f08c0c)] shadow-[inset_0_1px_0_rgba(255,255,255,.6)] transition-[width] duration-700 ease-out"
        style={{ width: `${Math.max(0, Math.min(1, shown)) * 100}%` }}
      />
    </div>
  )
}
