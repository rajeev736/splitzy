"use client"

import * as React from "react"

import {
  BASE_ORIGIN,
  cellOf,
  HOME_COLUMN,
  SAFE_SQUARES,
  START_INDEX,
  TRACK,
  trackToCell,
  type Cell,
  type LudoColour,
  type LudoState,
} from "@/lib/live/ludo"
import { cn } from "@/lib/utils"
import { FLY_MS, STEP_MS, type Positions } from "./use-ludo-animation"

export const TOKEN_COLOURS: Record<LudoColour, string> = {
  red: "#ef4444",
  green: "#22c55e",
  yellow: "#eab308",
  blue: "#3b82f6",
}

const COLOURS: LudoColour[] = ["red", "green", "yellow", "blue"]
const START_COLOUR = new Map<number, LudoColour>(
  COLOURS.map((c) => [START_INDEX[c], c])
)
const STAR_SQUARES = SAFE_SQUARES.filter((i) => !START_COLOUR.has(i))
/** The four resting spots in a base, relative to its origin (matches lib/live/ludo BASE_SLOTS). */
const BASE_SLOTS = [
  [1.5, 1.5],
  [1.5, 3.5],
  [3.5, 1.5],
  [3.5, 3.5],
]

/** A five-point star centred on (cx, cy). */
function starPath(cx: number, cy: number, outer: number, inner: number) {
  const pts: string[] = []
  for (let k = 0; k < 10; k++) {
    const r = k % 2 === 0 ? outer : inner
    const a = -Math.PI / 2 + (k * Math.PI) / 5
    pts.push(
      `${(cx + r * Math.cos(a)).toFixed(3)},${(cy + r * Math.sin(a)).toFixed(3)}`
    )
  }
  return `M${pts.join("L")}Z`
}
const STAR_PATHS = STAR_SQUARES.map((i) => {
  const c = trackToCell(i)
  return starPath(c.col + 0.5, c.row + 0.5, 0.3, 0.13)
})
const START_STAR_PATHS = COLOURS.map((c) => {
  const cell = trackToCell(START_INDEX[c])
  return starPath(cell.col + 0.5, cell.row + 0.5, 0.3, 0.13)
})

/** The board itself — bases, arms, home columns, centre — drawn once. */
const BoardBackground = React.memo(function BoardBackground() {
  return (
    <g>
      <rect x={0} y={0} width={15} height={15} rx={0.45} fill="var(--card)" />
      {COLOURS.map((c) => {
        const o = BASE_ORIGIN[c]
        const fill = TOKEN_COLOURS[c]
        return (
          <g key={c}>
            <rect
              x={o.col}
              y={o.row}
              width={6}
              height={6}
              rx={0.45}
              fill={fill}
            />
            <rect
              x={o.col + 1}
              y={o.row + 1}
              width={4}
              height={4}
              rx={0.4}
              fill="var(--card)"
            />
            {BASE_SLOTS.map(([r, cc]) => (
              <circle
                key={`${r}-${cc}`}
                cx={o.col + cc + 0.5}
                cy={o.row + r + 0.5}
                r={0.46}
                fill={fill}
                fillOpacity={0.16}
                stroke={fill}
                strokeWidth={0.05}
              />
            ))}
          </g>
        )
      })}
      {TRACK.map((cell, i) => {
        const start = START_COLOUR.get(i)
        return (
          <rect
            key={i}
            x={cell.col}
            y={cell.row}
            width={1}
            height={1}
            fill={start ? TOKEN_COLOURS[start] : "var(--card)"}
            stroke="var(--border)"
            strokeWidth={0.04}
          />
        )
      })}
      {COLOURS.map((c) =>
        HOME_COLUMN[c].map((cell, i) => (
          <rect
            key={`${c}${i}`}
            x={cell.col}
            y={cell.row}
            width={1}
            height={1}
            fill={TOKEN_COLOURS[c]}
            stroke="var(--card)"
            strokeWidth={0.04}
          />
        ))
      )}
      {STAR_PATHS.map((d, i) => (
        <path key={i} d={d} fill="var(--muted-foreground)" fillOpacity={0.5} />
      ))}
      {START_STAR_PATHS.map((d, i) => (
        <path key={i} d={d} fill="#fff" fillOpacity={0.85} />
      ))}
      <polygon points="6,6 6,9 7.5,7.5" fill={TOKEN_COLOURS.red} />
      <polygon points="6,6 9,6 7.5,7.5" fill={TOKEN_COLOURS.green} />
      <polygon points="9,6 9,9 7.5,7.5" fill={TOKEN_COLOURS.yellow} />
      <polygon points="6,9 9,9 7.5,7.5" fill={TOKEN_COLOURS.blue} />
      <rect
        x={0.03}
        y={0.03}
        width={14.94}
        height={14.94}
        rx={0.45}
        fill="none"
        stroke="var(--border)"
        strokeWidth={0.06}
      />
    </g>
  )
})

interface TokenView {
  key: string
  uid: string
  colour: LudoColour
  index: number
  pos: number
  cell: Cell
  /** Tokens sharing a group are drawn as a cluster. */
  group: string
}

/** Where the i-th of n tokens on one square sits, and how big it is. */
function clusterSpot(
  n: number,
  i: number
): { dx: number; dy: number; r: number } {
  if (n <= 1) return { dx: 0, dy: 0, r: 0.37 }
  if (n === 2) return { dx: i === 0 ? -0.17 : 0.17, dy: 0, r: 0.3 }
  if (n === 3) {
    const spots = [
      { dx: 0, dy: -0.17 },
      { dx: -0.18, dy: 0.15 },
      { dx: 0.18, dy: 0.15 },
    ]
    return { ...spots[i], r: 0.26 }
  }
  const k = Math.min(i, 3)
  return { dx: k % 2 ? 0.17 : -0.17, dy: k < 2 ? -0.17 : 0.17, r: 0.24 }
}

/**
 * The 15×15 board as SVG, scaled by its container. Tokens are positioned
 * with CSS transforms so each step of a move glides.
 */
export function LudoBoard({
  state,
  positions,
  flying,
  movable,
  meUid,
  onToken,
  className,
}: {
  state: LudoState
  positions: Positions
  /** `${uid}:${token}` of tokens being sent back to base (slower transition). */
  flying: string[]
  /** Token indices of `meUid` that can be tapped right now. */
  movable: number[]
  meUid: string
  onToken: (token: number) => void
  className?: string
}) {
  const tokens: TokenView[] = []
  for (const uid of state.order) {
    const p = state.players[uid]
    if (!p) continue
    const pos = positions[uid] ?? p.tokens
    pos.forEach((v, i) => {
      const cell = cellOf(p.colour, v, i)
      tokens.push({
        key: `${uid}:${i}`,
        uid,
        colour: p.colour,
        index: i,
        pos: v,
        cell,
        group: v < 0 ? `${uid}:${i}` : `${cell.row},${cell.col}`,
      })
    })
  }
  const groups = new Map<string, TokenView[]>()
  for (const t of tokens) {
    const g = groups.get(t.group)
    if (g) g.push(t)
    else groups.set(t.group, [t])
  }
  // The token that just moved is drawn last, so it passes over the others
  const lastMoved =
    state.last?.type === "move" ? `${state.last.by}:${state.last.token}` : null
  const ordered = lastMoved
    ? [
        ...tokens.filter((t) => t.key !== lastMoved),
        ...tokens.filter((t) => t.key === lastMoved),
      ]
    : tokens

  return (
    <svg
      viewBox="0 0 15 15"
      className={cn("block h-auto w-full select-none", className)}
      role="img"
      aria-label="Ludo board"
    >
      <BoardBackground />
      {ordered.map((t) => {
        const group = groups.get(t.group)!
        const spot = clusterSpot(group.length, group.indexOf(t))
        const x = t.cell.col + 0.5 + spot.dx
        const y = t.cell.row + 0.5 + spot.dy
        const fill = TOKEN_COLOURS[t.colour]
        const isMovable = t.uid === meUid && movable.includes(t.index)
        const isFlying = flying.includes(t.key)
        return (
          <g
            key={t.key}
            className={isMovable ? "cursor-pointer" : undefined}
            style={{
              transform: `translate(${x}px, ${y}px)`,
              transition: `transform ${isFlying ? FLY_MS : STEP_MS}ms ${isFlying ? "cubic-bezier(.4,0,.2,1)" : "linear"}`,
            }}
            role={isMovable ? "button" : undefined}
            tabIndex={isMovable ? 0 : undefined}
            aria-label={`${t.colour} token ${t.index + 1}${isMovable ? ", tap to move" : ""}`}
            onClick={isMovable ? () => onToken(t.index) : undefined}
            onKeyDown={
              isMovable
                ? (e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault()
                      onToken(t.index)
                    }
                  }
                : undefined
            }
          >
            {isMovable && (
              <circle
                r={spot.r}
                fill={fill}
                fillOpacity={0.6}
                className="animate-ping"
                style={{ transformBox: "fill-box", transformOrigin: "center" }}
              />
            )}
            <circle cy={0.06} r={spot.r} fill="rgb(0 0 0 / 0.28)" />
            <circle
              r={spot.r}
              fill={fill}
              stroke="#fff"
              strokeWidth={isMovable ? 0.09 : 0.07}
            />
            <circle
              cx={-spot.r * 0.28}
              cy={-spot.r * 0.3}
              r={spot.r * 0.3}
              fill="#fff"
              fillOpacity={0.7}
            />
            {/* A generous hit area: roughly 40px on a phone-width board */}
            {isMovable && <circle r={0.9} fill="transparent" />}
          </g>
        )
      })}
      {[...groups.values()]
        .filter((g) => g.length > 2 && g[0].pos >= 0)
        .map((g) => {
          const { row, col } = g[0].cell
          return (
            <g
              key={`n-${g[0].group}`}
              transform={`translate(${col + 0.86} ${row + 0.16})`}
              pointerEvents="none"
            >
              <circle r={0.24} fill="var(--foreground)" />
              <text
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={0.32}
                fontWeight={700}
                fill="var(--background)"
              >
                {g.length}
              </text>
            </g>
          )
        })}
    </svg>
  )
}
