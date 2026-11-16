"use client"

import * as React from "react"

import {
  isFrozen,
  isShielded,
  lockOf,
  PENTA_COLOURS,
  PENTA_GEO,
  pieceKey,
  type LudoColour,
  type LudoState,
} from "@/lib/live/ludo"
import {
  armSquareCorners,
  baseFrame,
  BASE_HALF,
  baseSlot,
  pentagonCorners,
  pentaPoint,
  rotate,
  trackPoint,
  trackSquare,
  type Point,
} from "@/lib/live/ludo-penta"
import { cn } from "@/lib/utils"
import { Piece, PieceDefs } from "./ludo-board"
import { LUDO_THEMES, type LudoLook } from "@/lib/live/themes"
import { PowerSpawn } from "./power-art"
import type { Positions } from "./use-ludo-animation"

/** How far the board reaches from its centre (arms, bases, a little margin). */
const EXTENT = 9.6

const poly = (pts: Point[]) => pts.map((p) => `${p.x.toFixed(3)},${p.y.toFixed(3)}`).join(" ")

function star(c: Point, outer: number, inner: number) {
  const pts: Point[] = []
  for (let k = 0; k < 10; k++) {
    const r = k % 2 === 0 ? outer : inner
    const a = -Math.PI / 2 + (k * Math.PI) / 5
    pts.push({ x: c.x + r * Math.cos(a), y: c.y + r * Math.sin(a) })
  }
  return poly(pts)
}

/** Track index → colour whose start square it is. */
const START_OF = new Map<number, LudoColour>(PENTA_COLOURS.map((c) => [PENTA_GEO.start[c] ?? 0, c]))
const STARS = PENTA_GEO.safe.filter((g) => !START_OF.has(g))

/** The board itself — arms, bases, the centre — drawn once (unturned). */
const PentaBackground = React.memo(function PentaBackground({ id, look }: { id: string; look: LudoLook }) {
  const corners = pentagonCorners()
  return (
    <g>
      <defs>
        {PENTA_COLOURS.map((c) => (
          <linearGradient key={c} id={`${id}-pb-${c}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={look.palette[c].light} />
            <stop offset="0.35" stopColor={look.palette[c].mid} />
            <stop offset="1" stopColor={look.palette[c].dark} />
          </linearGradient>
        ))}
      </defs>
      {/* Bases */}
      {PENTA_COLOURS.map((c) => {
        const { c: centre, u, v } = baseFrame(c)
        const corner = (a: number, b: number) => ({
          x: centre.x + u.x * a + v.x * b,
          y: centre.y + u.y * a + v.y * b,
        })
        const H = BASE_HALF
        const h = H - 0.38
        return (
          <g key={c}>
            <polygon points={poly([corner(-H, -H), corner(H, -H), corner(H, H), corner(-H, H)])} fill={`url(#${id}-pb-${c})`} stroke="#0f172a" strokeOpacity={0.25} strokeWidth={0.05} strokeLinejoin="round" />
            <polygon points={poly([corner(-h, -h), corner(h, -h), corner(h, h), corner(-h, h)])} fill="#fff" strokeLinejoin="round" />
            {[0, 1, 2, 3].map((t) => {
              const p = baseSlot(c, t)
              return <circle key={t} cx={p.x} cy={p.y} r={0.42} fill={look.palette[c].mid} stroke="#fff" strokeOpacity={0.6} strokeWidth={0.05} />
            })}
          </g>
        )
      })}
      {/* Track */}
      {Array.from({ length: PENTA_GEO.track }, (_, g) => {
        const s = trackSquare(g)
        const start = START_OF.get(g)
        return (
          <polygon
            key={g}
            points={poly(armSquareCorners(s.arm, s.o, s.j))}
            fill={start ? look.palette[start].mid : look.track}
            stroke={look.trackStroke}
            strokeWidth={0.035}
          />
        )
      })}
      {/* Home columns */}
      {PENTA_COLOURS.map((c, k) =>
        [0, 1, 2, 3, 4].map((j) => (
          <polygon key={`${c}${j}`} points={poly(armSquareCorners(k, 0, j))} fill={look.palette[c].mid} stroke="#fff" strokeOpacity={0.6} strokeWidth={0.035} />
        ))
      )}
      {STARS.map((g) => (
        <polygon key={`s${g}`} points={star(trackPoint(g), 0.34, 0.15)} fill="#e5e7eb" stroke="#9aa1ad" strokeWidth={0.05} strokeLinejoin="round" />
      ))}
      {[...START_OF.keys()].map((g) => (
        <polygon key={`st${g}`} points={star(trackPoint(g), 0.34, 0.15)} fill="#fff" fillOpacity={0.9} />
      ))}
      {/* Centre: a triangle per colour (home) */}
      {PENTA_COLOURS.map((c, k) => (
        <polygon
          key={`h${c}`}
          points={poly([{ x: 0, y: 0 }, corners[(k + 4) % 5], corners[k]])}
          fill={`url(#${id}-pb-${c})`}
          stroke="#fff"
          strokeOpacity={0.7}
          strokeWidth={0.05}
        />
      ))}
    </g>
  )
})

/** Where the n-th of a cluster of pieces on one square sits, and how big it is. */
function clusterSpot(n: number, i: number): { dx: number; dy: number; r: number } {
  if (n <= 1) return { dx: 0, dy: 0, r: 0.37 }
  if (n === 2) return { dx: i === 0 ? -0.17 : 0.17, dy: 0, r: 0.3 }
  if (n === 3) return { ...[{ dx: 0, dy: -0.17 }, { dx: -0.18, dy: 0.15 }, { dx: 0.18, dy: 0.15 }][i], r: 0.26 }
  const k = Math.min(i, 3)
  return { dx: k % 2 ? 0.17 : -0.17, dy: k < 2 ? -0.17 : 0.17, r: 0.24 }
}

/**
 * The 5-player Ludo board (a pentagon with five arms), with the same 3D
 * pieces, power-ups and effects as the square board. `rotation` (degrees)
 * turns it so the viewer's base is at the bottom-left; pieces stay upright.
 */
export function LudoPentaBoard({
  state,
  positions,
  flying,
  movable,
  meUid,
  onToken,
  rotation = 0,
  hidden,
  look = LUDO_THEMES[0].look,
  targets,
  onTarget,
  className,
}: {
  state: LudoState
  positions: Positions
  flying: string[]
  movable: number[]
  meUid: string
  onToken: (token: number) => void
  rotation?: number
  hidden?: string[]
  look?: LudoLook
  targets?: string[]
  onTarget?: (uid: string, token: number) => void
  className?: string
}) {
  const id = React.useId().replace(/:/g, "")
  type View = { key: string; uid: string; colour: LudoColour; index: number; pos: number; at: Point; group: string }
  const pieces: View[] = []
  for (const uid of state.order) {
    const p = state.players[uid]
    if (!p || hidden?.includes(uid)) continue
    const pos = positions[uid] ?? p.tokens
    pos.forEach((v, i) => {
      const at = pentaPoint(p.colour, v, i)
      pieces.push({
        key: `${uid}:${i}`,
        uid,
        colour: p.colour,
        index: i,
        pos: v,
        at,
        group: v < 0 ? `${uid}:${i}` : `${at.x.toFixed(2)},${at.y.toFixed(2)}`,
      })
    })
  }
  const groups = new Map<string, View[]>()
  for (const t of pieces) {
    const g = groups.get(t.group)
    if (g) g.push(t)
    else groups.set(t.group, [t])
  }
  const lastMoved = state.last?.type === "move" ? `${state.last.by}:${state.last.token}` : null
  const placed = pieces.map((t) => {
    const group = groups.get(t.group)!
    const spot = clusterSpot(group.length, group.indexOf(t))
    // Turn the square's centre with the board, then spread the cluster upright
    const c = rotate(t.at, rotation)
    return { t, x: c.x + spot.dx, y: c.y + spot.dy, scale: spot.r / 0.4 }
  })
  placed.sort((a, b) => (a.t.key === lastMoved ? 1 : b.t.key === lastMoved ? -1 : a.y - b.y))

  return (
    <svg
      viewBox={`${-EXTENT} ${-EXTENT} ${EXTENT * 2} ${EXTENT * 2}`}
      className={cn("block h-auto w-full select-none", className)}
      role="img"
      aria-label="Ludo board for five"
    >
      <g transform={`rotate(${rotation})`}>
        <PentaBackground id={id} look={look} />
      </g>
      <PieceDefs id={id} palette={look.palette} />
      {state.spawns?.map((sp) => {
        const c = rotate(trackPoint(sp.sq), rotation)
        return <PowerSpawn key={`s${sp.sq}`} kind={sp.kind} x={c.x} y={c.y} />
      })}
      {placed.map(({ t, x, y, scale }) => {
        const key = pieceKey(t.uid, t.index)
        const targetable = !!targets?.includes(key)
        const isMovable = !targets && t.uid === meUid && movable.includes(t.index)
        return (
          <Piece
            key={t.key}
            id={id}
            colour={t.colour}
            x={x}
            y={y}
            scale={scale}
            movable={isMovable}
            flying={flying.includes(t.key)}
            label={`${t.colour} token ${t.index + 1}${isMovable ? ", tap to move" : targetable ? ", tap to aim the power" : ""}`}
            onTap={() => (targetable ? onTarget?.(t.uid, t.index) : onToken(t.index))}
            targetable={targetable}
            frozen={t.pos >= 0 && isFrozen(state, t.uid, t.index)}
            lock={t.pos >= 0 ? lockOf(state, t.uid, t.index) : 0}
            shielded={t.pos >= 0 && isShielded(state, t.uid, t.index)}
            shade={look.palette[t.colour]}
          />
        )
      })}
      {[...groups.values()]
        .filter((g) => g.length > 2 && g[0].pos >= 0)
        .map((g) => {
          const c = rotate(g[0].at, rotation)
          return (
            <g key={`n-${g[0].group}`} transform={`translate(${c.x + 0.36} ${c.y - 0.4})`} pointerEvents="none">
              <circle r={0.24} fill="#111827" stroke="#fff" strokeWidth={0.04} />
              <text textAnchor="middle" dominantBaseline="central" fontSize={0.3} fontWeight={700} fill="#fff">
                {g.length}
              </text>
            </g>
          )
        })}
    </svg>
  )
}
