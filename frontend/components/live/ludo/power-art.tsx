import * as React from "react"

import type { PowerKind } from "@/lib/live/ludo"
import { cn } from "@/lib/utils"

/** Each power's colour: icy blue, steel, orange, green, gold, purple. */
export const POWER_COLOUR: Record<PowerKind, string> = {
  freeze: "#38bdf8",
  lock: "#64748b",
  push: "#f97316",
  jump: "#22c55e",
  shield: "#eab308",
  double: "#a855f7",
}

/** The mark for each power, white on a 24 grid. */
function Mark({ kind }: { kind: PowerKind }) {
  const s = { fill: "none", stroke: "#fff", strokeWidth: 2.2, strokeLinecap: "round", strokeLinejoin: "round" } as const
  switch (kind) {
    case "freeze":
      return <path {...s} d="M12 4v16M5 8l14 8M19 8L5 16M10 5l2 2 2-2M10 19l2-2 2 2" />
    case "lock":
      return (
        <>
          <rect x="6" y="11" width="12" height="9" rx="2" fill="#fff" />
          <path {...s} d="M8.5 11V8.5a3.5 3.5 0 0 1 7 0V11" />
        </>
      )
    case "push":
      return <path {...s} d="M15 6l-6 6 6 6M20 6l-6 6 6 6" />
    case "jump":
      return <path {...s} d="M6 18c2-8 10-10 12-10M14 5l4 3-3 4" />
    case "shield":
      return <path d="M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6z" fill="#fff" />
    case "double":
      return (
        <text x="12" y="16.5" textAnchor="middle" fontSize="11" fontWeight="800" fill="#fff" fontFamily="system-ui, sans-serif">
          x2
        </text>
      )
  }
}

/** A round power badge (tray, sheets). */
export function PowerBadge({ kind, className }: { kind: PowerKind; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={cn("size-7 shrink-0", className)} aria-hidden>
      <circle cx="12" cy="12" r="12" fill={POWER_COLOUR[kind]} />
      <circle cx="12" cy="12" r="11" fill="none" stroke="#fff" strokeOpacity="0.4" />
      <g transform="translate(2.4 2.4) scale(0.8)">
        <Mark kind={kind} />
      </g>
    </svg>
  )
}

/** A power-up waiting on a board square (board units: one square = 1), glowing. */
export function PowerSpawn({ kind, x, y }: { kind: PowerKind; x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`} pointerEvents="none">
      <circle r={0.46} fill={POWER_COLOUR[kind]} opacity={0.35} className="animate-pulse" />
      <circle r={0.34} fill={POWER_COLOUR[kind]} stroke="#fff" strokeWidth={0.05} />
      <svg x={-0.25} y={-0.25} width={0.5} height={0.5} viewBox="0 0 24 24">
        <Mark kind={kind} />
      </svg>
    </g>
  )
}
