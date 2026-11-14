"use client"

import * as React from "react"
import gsap from "gsap"

import {
  BASE_ORIGIN,
  cellOf,
  HOME_COLUMN,
  isFrozen,
  isShielded,
  lockOf,
  pieceKey,
  SAFE_SQUARES,
  START_INDEX,
  TRACK,
  trackToCell,
  type Cell,
  type LudoColour,
  type SquareColour,
  type LudoState,
} from "@/lib/live/ludo"
import { cn } from "@/lib/utils"
import { playSound } from "@/lib/live/sound"
import { PowerSpawn } from "./power-art"
import { FLY_MS, STEP_MS, type Positions } from "./use-ludo-animation"

export const TOKEN_COLOURS: Record<LudoColour, string> = {
  red: "#e53935",
  green: "#2e9e44",
  yellow: "#f4b400",
  blue: "#1e6fe0",
  purple: "#8e24aa",
}

/** Light / mid / dark of each colour, for the board and the 3D pieces. */
export const SHADES: Record<LudoColour, { light: string; mid: string; dark: string }> = {
  red: { light: "#ff8a80", mid: "#e53935", dark: "#8e1b1b" },
  green: { light: "#86e08f", mid: "#2e9e44", dark: "#13561f" },
  yellow: { light: "#ffe082", mid: "#f4b400", dark: "#8a6100" },
  blue: { light: "#8ab4ff", mid: "#1e6fe0", dark: "#0b3478" },
  purple: { light: "#d59cf0", mid: "#8e24aa", dark: "#4a148c" },
}

const COLOURS: SquareColour[] = ["red", "green", "yellow", "blue"]
/** Every piece colour (the 5-player board adds purple). */
const ALL_COLOURS: LudoColour[] = [...COLOURS, "purple"]

/**
 * Quarter turns (clockwise) that bring a colour's base to the bottom-left,
 * in front of its player — like sitting at your side of a real board.
 * Bases go red top-left, green top-right, yellow bottom-right, blue bottom-left.
 */
export const TURNS_FOR: Record<SquareColour, number> = { red: 3, green: 2, yellow: 1, blue: 0 }

/** The colour whose base shows in screen corner `corner` (0 top-left, clockwise) after `turns`. */
export const colourAtCorner = (corner: number, turns: number): SquareColour =>
  COLOURS[(((corner - turns) % 4) + 4) % 4]

/** A board point after `turns` clockwise quarter turns around the centre. */
function turn(x: number, y: number, turns: number): [number, number] {
  let px = x
  let py = y
  for (let i = 0; i < ((turns % 4) + 4) % 4; i++) [px, py] = [15 - py, px]
  return [px, py]
}
const START_COLOUR = new Map<number, SquareColour>(COLOURS.map((c) => [START_INDEX[c], c]))
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
    pts.push(`${(cx + r * Math.cos(a)).toFixed(3)},${(cy + r * Math.sin(a)).toFixed(3)}`)
  }
  return `M${pts.join("L")}Z`
}
const STAR_PATHS = STAR_SQUARES.map((i) => {
  const c = trackToCell(i)
  return starPath(c.col + 0.5, c.row + 0.5, 0.34, 0.15)
})
const START_STAR_PATHS = COLOURS.map((c) => {
  const cell = trackToCell(START_INDEX[c])
  return starPath(cell.col + 0.5, cell.row + 0.5, 0.34, 0.15)
})

/** The board itself — Ludo King style: bright bases, white track, coloured home runs — drawn once. */
const BoardBackground = React.memo(function BoardBackground({ id }: { id: string }) {
  return (
    <g>
      <defs>
        {COLOURS.map((c) => (
          <linearGradient key={c} id={`${id}-base-${c}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={SHADES[c].light} />
            <stop offset="0.35" stopColor={SHADES[c].mid} />
            <stop offset="1" stopColor={SHADES[c].dark} />
          </linearGradient>
        ))}
        <radialGradient id={`${id}-slot`} cx="0.5" cy="0.35" r="0.6">
          <stop offset="0" stopColor="#fff" stopOpacity="0.5" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
        <filter id={`${id}-inset`} x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="0.05" stdDeviation="0.08" floodColor="#000" floodOpacity="0.35" />
        </filter>
      </defs>
      <rect x={0} y={0} width={15} height={15} rx={0.35} fill="#ffffff" />
      {COLOURS.map((c) => {
        const o = BASE_ORIGIN[c]
        return (
          <g key={c}>
            <rect x={o.col} y={o.row} width={6} height={6} rx={0.35} fill={`url(#${id}-base-${c})`} />
            <rect
              x={o.col + 0.85}
              y={o.row + 0.85}
              width={4.3}
              height={4.3}
              rx={0.45}
              fill="#ffffff"
              filter={`url(#${id}-inset)`}
            />
            {BASE_SLOTS.map(([r, cc]) => (
              <g key={`${r}-${cc}`}>
                <circle cx={o.col + cc + 0.5} cy={o.row + r + 0.5} r={0.6} fill={SHADES[c].mid} />
                <circle cx={o.col + cc + 0.5} cy={o.row + r + 0.5} r={0.6} fill={`url(#${id}-slot)`} />
                <circle
                  cx={o.col + cc + 0.5}
                  cy={o.row + r + 0.5}
                  r={0.42}
                  fill="none"
                  stroke="#fff"
                  strokeOpacity={0.55}
                  strokeWidth={0.05}
                />
              </g>
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
            fill={start ? SHADES[start].mid : "#ffffff"}
            stroke="#c9ced8"
            strokeWidth={0.035}
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
            fill={SHADES[c].mid}
            stroke="#ffffff"
            strokeOpacity={0.6}
            strokeWidth={0.035}
          />
        ))
      )}
      {STAR_PATHS.map((d, i) => (
        <path key={i} d={d} fill="#e5e7eb" stroke="#9aa1ad" strokeWidth={0.05} strokeLinejoin="round" />
      ))}
      {START_STAR_PATHS.map((d, i) => (
        <path key={i} d={d} fill="#fff" fillOpacity={0.9} />
      ))}
      {/* Home: four triangles meeting in the middle */}
      <polygon points="6,6 6,9 7.5,7.5" fill={`url(#${id}-base-red)`} />
      <polygon points="6,6 9,6 7.5,7.5" fill={`url(#${id}-base-green)`} />
      <polygon points="9,6 9,9 7.5,7.5" fill={`url(#${id}-base-yellow)`} />
      <polygon points="6,9 9,9 7.5,7.5" fill={`url(#${id}-base-blue)`} />
      <path d="M6 6L9 9M9 6L6 9" stroke="#fff" strokeOpacity={0.7} strokeWidth={0.05} />
      <rect x={6} y={6} width={3} height={3} fill="none" stroke="#fff" strokeOpacity={0.8} strokeWidth={0.06} />
      <rect
        x={0.03}
        y={0.03}
        width={14.94}
        height={14.94}
        rx={0.35}
        fill="none"
        stroke="#0f172a"
        strokeOpacity={0.35}
        strokeWidth={0.06}
      />
    </g>
  )
})

/* ── Pieces ──────────────────────────────────────────────────────────── */

/** Gradients for the 3D pins, one set per colour. */
export function PieceDefs({ id }: { id: string }) {
  return (
    <defs>
      {ALL_COLOURS.map((c) => (
        <React.Fragment key={c}>
          <linearGradient id={`${id}-body-${c}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor={SHADES[c].dark} />
            <stop offset="0.38" stopColor={SHADES[c].light} />
            <stop offset="0.62" stopColor={SHADES[c].mid} />
            <stop offset="1" stopColor={SHADES[c].dark} />
          </linearGradient>
          <radialGradient id={`${id}-head-${c}`} cx="0.36" cy="0.3" r="0.75">
            <stop offset="0" stopColor="#ffffff" stopOpacity="0.95" />
            <stop offset="0.18" stopColor={SHADES[c].light} />
            <stop offset="0.6" stopColor={SHADES[c].mid} />
            <stop offset="1" stopColor={SHADES[c].dark} />
          </radialGradient>
        </React.Fragment>
      ))}
    </defs>
  )
}

/** A glossy Ludo pin standing on its square — about one square tall at scale 1. */
function Pin({ id, colour }: { id: string; colour: LudoColour }) {
  const s = SHADES[colour]
  return (
    <>
      <ellipse cx={0.05} cy={0.36} rx={0.5} ry={0.16} fill="#000" opacity={0.35} />
      {/* Base */}
      <path d="M-.5 .26A.5 .17 0 0 0 .5 .26V.33A.5 .17 0 0 1 -.5 .33Z" fill={s.dark} />
      <ellipse cy={0.26} rx={0.5} ry={0.17} fill={`url(#${id}-body-${colour})`} stroke={s.dark} strokeWidth={0.025} />
      {/* Body */}
      <path
        d="M-.4 .24C-.36 .02-.2-.1-.17-.3L.17-.3C.2-.1.36 .02.4 .24A.4 .13 0 0 1-.4 .24Z"
        fill={`url(#${id}-body-${colour})`}
        stroke={s.dark}
        strokeWidth={0.025}
      />
      {/* Collar */}
      <ellipse cy={-0.3} rx={0.22} ry={0.075} fill={s.light} stroke={s.dark} strokeWidth={0.02} />
      {/* Head */}
      <circle cy={-0.56} r={0.3} fill={`url(#${id}-head-${colour})`} stroke={s.dark} strokeWidth={0.025} />
      <ellipse cx={-0.1} cy={-0.68} rx={0.09} ry={0.06} fill="#fff" opacity={0.9} />
    </>
  )
}

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

/** Where the n-th of a cluster of tokens on one square sits, and how big it is. */
function clusterSpot(n: number, i: number): { dx: number; dy: number; r: number } {
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
 * One piece. GSAP moves it: a hop per square while walking, a high arc when
 * it's knocked back to base, a glide when pieces on a square shuffle around.
 */
export function Piece({
  id,
  colour,
  x,
  y,
  scale,
  movable,
  flying,
  label,
  onTap,
  targetable = false,
  frozen = false,
  lock = 0,
  shielded = false,
}: {
  id: string
  colour: LudoColour
  x: number
  y: number
  scale: number
  movable: boolean
  flying: boolean
  label: string
  onTap: () => void
  /** Power Ludo: can be picked as a power's target right now. */
  targetable?: boolean
  frozen?: boolean
  /** The number this piece waits for (0 = not locked). */
  lock?: number
  shielded?: boolean
}) {
  const tappable = movable || targetable
  const outer = React.useRef<SVGGElement>(null)
  const hop = React.useRef<SVGGElement>(null)
  const bob = React.useRef<SVGGElement>(null)
  const at = React.useRef<{ x: number; y: number } | null>(null)

  React.useLayoutEffect(() => {
    const el = outer.current
    const h = hop.current
    if (!el || !h) return
    const prev = at.current
    at.current = { x, y }
    if (!prev) {
      gsap.set(el, { x, y })
      return
    }
    if (prev.x === x && prev.y === y) return
    const dist = Math.hypot(x - prev.x, y - prev.y)
    if (flying) {
      // Captured: a big arc back to base
      gsap.to(el, { x, y, duration: FLY_MS / 1000, ease: "power2.inOut", overwrite: true })
      gsap.fromTo(
        h,
        { y: 0 },
        { y: -2.2, duration: FLY_MS / 2000, ease: "power1.out", yoyo: true, repeat: 1, overwrite: true }
      )
      return
    }
    if (dist < 0.6) {
      // Pieces on one square making room for each other
      gsap.to(el, { x, y, duration: 0.25, ease: "power2.out", overwrite: true })
      return
    }
    // A step (or out of base): hop onto the next square, with a little squash on landing
    playSound("step")
    const t = dist > 1.6 ? 0.34 : (STEP_MS / 1000) * 0.92
    gsap.to(el, { x, y, duration: t, ease: "power1.inOut", overwrite: true })
    gsap.killTweensOf(h)
    gsap
      .timeline()
      .fromTo(h, { y: 0, scaleY: 1 }, { y: dist > 1.6 ? -0.9 : -0.42, duration: t / 2, ease: "power2.out" })
      .to(h, { y: 0, duration: t / 2, ease: "power2.in" })
      .to(h, { scaleY: 0.86, duration: 0.06, svgOrigin: "0 0.3", ease: "power1.out" })
      .to(h, { scaleY: 1, duration: 0.1, svgOrigin: "0 0.3", ease: "power1.out" })
  }, [x, y, flying])

  // Your pieces that can move bob, like in Ludo King
  React.useEffect(() => {
    const b = bob.current
    if (!b) return
    if (!movable) {
      gsap.to(b, { y: 0, duration: 0.15, overwrite: true })
      return
    }
    const tween = gsap.to(b, { y: -0.16, duration: 0.38, ease: "sine.inOut", yoyo: true, repeat: -1 })
    return () => {
      tween.kill()
    }
  }, [movable])

  return (
    <g
      ref={outer}
      className={tappable ? "cursor-pointer" : undefined}
      role={tappable ? "button" : undefined}
      tabIndex={tappable ? 0 : undefined}
      aria-label={label}
      onClick={tappable ? onTap : undefined}
      onKeyDown={
        tappable
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault()
                onTap()
              }
            }
          : undefined
      }
    >
      {movable && (
        <ellipse
          cy={0.3 * scale}
          rx={0.58 * scale}
          ry={0.22 * scale}
          fill="#fff"
          fillOpacity={0.35}
          stroke="#fff"
          strokeWidth={0.06}
          className="animate-pulse"
        />
      )}
      {targetable && (
        <circle r={0.62 * scale} fill="none" stroke="#ef4444" strokeWidth={0.09} strokeDasharray="0.18 0.12" className="animate-spin [animation-duration:3s] [transform-box:fill-box] [transform-origin:center]" />
      )}
      <g ref={hop}>
        <g ref={bob}>
          <g transform={`scale(${scale})`}>
            <Pin id={id} colour={colour} />
            {shielded && <ellipse cy={-0.2} rx={0.62} ry={0.78} fill="#fde047" fillOpacity={0.22} stroke="#facc15" strokeWidth={0.06} />}
            {frozen && (
              <>
                <ellipse cy={-0.2} rx={0.6} ry={0.76} fill="#7dd3fc" fillOpacity={0.45} stroke="#e0f2fe" strokeWidth={0.05} />
                <path d="M0 -.62v.5M-.22 -.5l.44 .26M.22 -.5l-.44 .26" stroke="#fff" strokeWidth={0.07} strokeLinecap="round" />
              </>
            )}
            {lock > 0 && (
              <g transform="translate(.36 -.72)">
                <circle r={0.26} fill="#334155" stroke="#fff" strokeWidth={0.04} />
                <text textAnchor="middle" dominantBaseline="central" fontSize={0.3} fontWeight={800} fill="#fff">
                  {lock}
                </text>
              </g>
            )}
          </g>
        </g>
      </g>
      {/* A generous hit area: roughly 40px on a phone-width board */}
      {tappable && <circle r={0.9} fill="transparent" />}
    </g>
  )
}

/**
 * The 15×15 board as SVG, scaled by its container, with 3D pieces that
 * GSAP walks square by square.
 */
export function LudoBoard({
  state,
  positions,
  flying,
  movable,
  meUid,
  onToken,
  turns = 0,
  hidden,
  targets,
  onTarget,
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
  /** Clockwise quarter turns, so the viewer's own colour sits at the bottom-left. */
  turns?: number
  /** Players whose pieces are off the board (left, or out for missing turns). */
  hidden?: string[]
  /** Power Ludo: pieces (`uid:token`) you may aim a power at right now. */
  targets?: string[]
  onTarget?: (uid: string, token: number) => void
  className?: string
}) {
  const id = React.useId().replace(/:/g, "")
  const tokens: TokenView[] = []
  for (const uid of state.order) {
    const p = state.players[uid]
    if (!p || hidden?.includes(uid)) continue
    const pos = positions[uid] ?? p.tokens
    pos.forEach((v, i) => {
      // This board only ever has the four square colours
      const cell = cellOf(p.colour as SquareColour, v, i)
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
  const lastMoved = state.last?.type === "move" ? `${state.last.by}:${state.last.token}` : null

  const placed = tokens.map((t) => {
    const group = groups.get(t.group)!
    const spot = clusterSpot(group.length, group.indexOf(t))
    const [x, y] = turn(t.cell.col + 0.5 + spot.dx, t.cell.row + 0.5 + spot.dy, turns)
    return { t, x, y, scale: spot.r / 0.4 }
  })
  // Painter's order: lower on the screen is nearer, so it's drawn later; the piece that just moved goes on top
  placed.sort((a, b) => (a.t.key === lastMoved ? 1 : b.t.key === lastMoved ? -1 : a.y - b.y))

  return (
    <svg
      viewBox="-0.15 -0.15 15.3 15.3"
      className={cn("block h-auto w-full select-none", className)}
      role="img"
      aria-label="Ludo board"
    >
      <g transform={`rotate(${turns * 90} 7.5 7.5)`}>
        <BoardBackground id={id} />
      </g>
      <PieceDefs id={id} />
      {/* Power Ludo: power-ups waiting on the track */}
      {state.spawns?.map((sp) => {
        const cell = trackToCell(sp.sq)
        const [x, y] = turn(cell.col + 0.5, cell.row + 0.5, turns)
        return <PowerSpawn key={`s${sp.sq}`} kind={sp.kind} x={x} y={y} />
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
          />
        )
      })}
      {[...groups.values()]
        .filter((g) => g.length > 2 && g[0].pos >= 0)
        .map((g) => {
          const { row, col } = g[0].cell
          // The count sits on the square's top-right corner, wherever the board has turned
          const [cx, cy] = turn(col + 0.5, row + 0.5, turns)
          return (
            <g key={`n-${g[0].group}`} transform={`translate(${cx + 0.36} ${cy - 0.4})`} pointerEvents="none">
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
