import * as React from "react"

import type { LiveGameId } from "@/lib/live/types"
import { cn } from "@/lib/utils"

/**
 * App-icon style logos for the live games: each one a rounded tile with its
 * own colours and a drawn mark (no emoji, so they look the same on every
 * phone). Size it with `className` (e.g. `size-12`); it fills the box.
 */
export function LiveGameLogo({ game, className }: { game: LiveGameId; className?: string }) {
  const uid = React.useId().replace(/:/g, "")
  const Art = ART[game]
  return (
    <svg viewBox="0 0 48 48" role="img" aria-hidden className={cn("size-12 shrink-0", className)}>
      <Art id={uid} />
    </svg>
  )
}

type ArtProps = { id: string }

/** The tile: rounded square with a top-left to bottom-right gradient and a soft top shine. */
function Tile({ id, from, to }: { id: string; from: string; to: string }) {
  return (
    <>
      <defs>
        <linearGradient id={`${id}-bg`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={from} />
          <stop offset="1" stopColor={to} />
        </linearGradient>
        <linearGradient id={`${id}-shine`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.22" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect width="48" height="48" rx="11" fill={`url(#${id}-bg)`} />
      <rect width="48" height="48" rx="11" fill={`url(#${id}-shine)`} />
    </>
  )
}

/** A sheet of paper with a colourful squiggle, and a pencil drawing on it. */
function Scribble({ id }: ArtProps) {
  return (
    <>
      <Tile id={id} from="#f472b6" to="#7c3aed" />
      <g transform="rotate(-8 22 25)">
        <rect x="9" y="11" width="27" height="26" rx="3" fill="#000" opacity="0.15" transform="translate(0 1.5)" />
        <rect x="9" y="11" width="27" height="26" rx="3" fill="#fff" />
        <path
          d="M13.5 29c2.5-6 5-9 6.5-6.5s-1 6.5 1.5 6.5 3.5-9 6.5-9 1.5 5 3.5 5"
          fill="none"
          stroke="#ec4899"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="15" cy="17" r="2.2" fill="#38bdf8" />
        <circle cx="21" cy="16.5" r="1.4" fill="#facc15" />
      </g>
      {/* Pencil */}
      <g transform="rotate(45 33 31)">
        <rect x="30.5" y="17" width="5" height="17" rx="1" fill="#fbbf24" />
        <rect x="30.5" y="17" width="1.7" height="17" fill="#f59e0b" />
        <rect x="30.5" y="14.5" width="5" height="3" rx="1" fill="#f9a8d4" />
        <rect x="30.5" y="17" width="5" height="1.3" fill="#cbd5e1" />
        <path d="M30.5 34h5L33 38.8z" fill="#fde7c4" />
        <path d="M32.2 37.2h1.6L33 38.8z" fill="#334155" />
      </g>
    </>
  )
}

/** The four home colours with a white dice tumbling in the middle. */
function Ludo({ id }: ArtProps) {
  return (
    <>
      <defs>
        <clipPath id={`${id}-clip`}>
          <rect width="48" height="48" rx="11" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${id}-clip)`}>
        <rect width="24" height="24" fill="#ef4444" />
        <rect x="24" width="24" height="24" fill="#22c55e" />
        <rect x="24" y="24" width="24" height="24" fill="#facc15" />
        <rect y="24" width="24" height="24" fill="#3b82f6" />
        <circle cx="9" cy="9" r="3.2" fill="#fff" opacity="0.55" />
        <circle cx="39" cy="9" r="3.2" fill="#fff" opacity="0.55" />
        <circle cx="39" cy="39" r="3.2" fill="#fff" opacity="0.55" />
        <circle cx="9" cy="39" r="3.2" fill="#fff" opacity="0.55" />
      </g>
      <rect width="48" height="48" rx="11" fill="none" stroke="#000" strokeOpacity="0.08" />
      <g transform="rotate(-14 24 24)">
        <rect x="12.5" y="14" width="23" height="23" rx="5.5" fill="#000" opacity="0.22" />
        <rect x="12.5" y="12.5" width="23" height="23" rx="5.5" fill="#fff" />
        <rect x="12.5" y="30" width="23" height="5.5" rx="2.75" fill="#e2e8f0" opacity="0.7" />
        <circle cx="18.2" cy="18.2" r="2.2" fill="#1e293b" />
        <circle cx="29.8" cy="18.2" r="2.2" fill="#1e293b" />
        <circle cx="24" cy="24" r="2.2" fill="#ef4444" />
        <circle cx="18.2" cy="29.8" r="2.2" fill="#1e293b" />
        <circle cx="29.8" cy="29.8" r="2.2" fill="#1e293b" />
      </g>
    </>
  )
}

/** A knight on a dark board. */
function Chess({ id }: ArtProps) {
  return (
    <>
      <Tile id={id} from="#475569" to="#0f172a" />
      {/* Board corner */}
      <g opacity="0.14" fill="#fff">
        <rect x="0" y="36" width="6" height="6" />
        <rect x="12" y="36" width="6" height="6" />
        <rect x="24" y="36" width="6" height="6" />
        <rect x="36" y="36" width="6" height="6" />
        <rect x="6" y="42" width="6" height="6" />
        <rect x="18" y="42" width="6" height="6" />
        <rect x="30" y="42" width="6" height="6" />
        <rect x="42" y="42" width="6" height="6" />
      </g>
      <g transform="translate(0 -1)">
        <path
          d="M17.5 36.5c0-4.6 2.6-7.4 4.6-10.4l-4.1 1.6c-2 .8-3.9-1-2.9-2.9l6.4-10.2c.9-1.4 2.2-2.4 3.7-2.7l.6-2.5 2.2 2.8c4 1.5 5.9 6.1 5.4 11.7-.5 5.3-2.6 8.7-2.6 12.6z"
          fill="#000"
          opacity="0.3"
          transform="translate(0.8 1.2)"
        />
        <path
          d="M17.5 36.5c0-4.6 2.6-7.4 4.6-10.4l-4.1 1.6c-2 .8-3.9-1-2.9-2.9l6.4-10.2c.9-1.4 2.2-2.4 3.7-2.7l.6-2.5 2.2 2.8c4 1.5 5.9 6.1 5.4 11.7-.5 5.3-2.6 8.7-2.6 12.6z"
          fill="#f8fafc"
        />
        <path d="M27.6 15.6c2.6 1.6 3.6 4.6 3.4 8.6" fill="none" stroke="#cbd5e1" strokeWidth="1.3" strokeLinecap="round" />
        <circle cx="24.6" cy="17.4" r="1.15" fill="#0f172a" />
        <rect x="14.5" y="36" width="19.5" height="4.5" rx="2" fill="#f8fafc" />
        <rect x="14.5" y="38.6" width="19.5" height="1.9" rx="0.95" fill="#cbd5e1" />
      </g>
    </>
  )
}

/** Two pieces on a wooden board: a black one and a crowned red king. */
function Checkers({ id }: ArtProps) {
  const disc = (cx: number, cy: number, top: string, side: string, ring: string) => (
    <>
      <circle cx={cx} cy={cy + 2.2} r="9.5" fill="#000" opacity="0.25" />
      <circle cx={cx} cy={cy + 1.6} r="9.5" fill={side} />
      <circle cx={cx} cy={cy} r="9.5" fill={top} />
      <circle cx={cx} cy={cy} r="6.6" fill="none" stroke={ring} strokeWidth="1.3" />
      <circle cx={cx} cy={cy} r="3.6" fill="none" stroke={ring} strokeWidth="1" opacity="0.7" />
    </>
  )
  return (
    <>
      <Tile id={id} from="#d97706" to="#7c2d12" />
      <g fill="#000" opacity="0.14">
        <rect x="0" y="0" width="12" height="12" />
        <rect x="24" y="0" width="12" height="12" />
        <rect x="12" y="12" width="12" height="12" />
        <rect x="36" y="12" width="12" height="12" />
        <rect x="0" y="24" width="12" height="12" />
        <rect x="24" y="24" width="12" height="12" />
        <rect x="12" y="36" width="12" height="12" />
        <rect x="36" y="36" width="12" height="12" />
      </g>
      {disc(18, 29, "#334155", "#0f172a", "#64748b")}
      {disc(30, 18, "#ef4444", "#991b1b", "#fca5a5")}
      {/* King's crown */}
      <path
        d="M25.6 20.4l-.9-5.2 3.1 2.4 2.2-3.4 2.2 3.4 3.1-2.4-.9 5.2z"
        fill="#fde047"
        stroke="#b45309"
        strokeWidth="0.6"
        strokeLinejoin="round"
      />
    </>
  )
}

/** The grid with an X and an O — three in a row waiting to happen. */
function TicTacToe({ id }: ArtProps) {
  return (
    <>
      <Tile id={id} from="#38bdf8" to="#1d4ed8" />
      <g stroke="#fff" strokeOpacity="0.85" strokeWidth="2.6" strokeLinecap="round">
        <path d="M19 9.5v29M29 9.5v29M9.5 19h29M9.5 29h29" />
      </g>
      <g stroke="#fff" strokeWidth="3.2" strokeLinecap="round">
        <path d="M11.2 11.2l4.6 4.6M15.8 11.2l-4.6 4.6" />
        <path d="M32.2 32.2l4.6 4.6M36.8 32.2l-4.6 4.6" />
      </g>
      <circle cx="24" cy="24" r="3" fill="none" stroke="#fde047" strokeWidth="3" />
      <circle cx="34.5" cy="13.5" r="2.8" fill="none" stroke="#fde047" strokeWidth="3" />
    </>
  )
}

/** A bright board with a ladder and a winding green snake. */
function Snakes({ id }: ArtProps) {
  const cells = ["#ef4444", "#facc15", "#22c55e", "#3b82f6"]
  return (
    <>
      <defs>
        <clipPath id={`${id}-clip`}>
          <rect width="48" height="48" rx="11" />
        </clipPath>
        <linearGradient id={`${id}-snake`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#86efac" />
          <stop offset="1" stopColor="#15803d" />
        </linearGradient>
      </defs>
      <g clipPath={`url(#${id}-clip)`}>
        {Array.from({ length: 16 }, (_, i) => (
          <rect key={i} x={(i % 4) * 12} y={Math.floor(i / 4) * 12} width="12" height="12" fill={cells[(i + Math.floor(i / 4)) % 4]} />
        ))}
        <rect width="48" height="48" fill="#fff" opacity="0.18" />
      </g>
      {/* Ladder */}
      <g stroke="#7c2d12" strokeWidth="2.6" strokeLinecap="round">
        <path d="M8 40L22 8M15 43L29 11" />
        <path d="M10.2 35l6.8 3M12.5 29.8l6.8 3M14.8 24.6l6.8 3M17.1 19.4l6.8 3M19.4 14.2l6.8 3" strokeWidth="2" />
      </g>
      {/* Snake */}
      <path d="M37 42c-8 1-11-4-7-8s9-4 9-10-8-6-9-11" fill="none" stroke="#14532d" strokeWidth="6.5" strokeLinecap="round" />
      <path d="M37 42c-8 1-11-4-7-8s9-4 9-10-8-6-9-11" fill="none" stroke={`url(#${id}-snake)`} strokeWidth="4.5" strokeLinecap="round" />
      <path d="M37 42c-8 1-11-4-7-8s9-4 9-10-8-6-9-11" fill="none" stroke="#fde047" strokeWidth="1" strokeDasharray="1.5 3" strokeLinecap="round" />
      <ellipse cx="30" cy="11" rx="4.6" ry="3.6" fill="#16a34a" stroke="#14532d" strokeWidth="1.2" />
      <circle cx="28.6" cy="10" r="0.9" fill="#fff" />
      <circle cx="31.4" cy="10" r="0.9" fill="#fff" />
      <path d="M30 14.5v2.5l-1.2 1.2M30 17l1.2 1.2" stroke="#dc2626" strokeWidth="0.9" strokeLinecap="round" fill="none" />
      <rect width="48" height="48" rx="11" fill="none" stroke="#000" strokeOpacity="0.1" />
    </>
  )
}

/** Isometric grass-topped blocks climbing up a jungle cliff, with a ladder and a spark of lightning. */
function Snakes3D({ id }: ArtProps) {
  // An isometric block: top diamond + two sides, at (x, y) with height h
  const block = (x: number, y: number, h: number, key: string) => (
    <g key={key}>
      <path d={`M${x} ${y}l9 4.5v${h}l-9-4.5z`} fill="#57534e" />
      <path d={`M${x + 18} ${y}l-9 4.5v${h}l9-4.5z`} fill="#44403c" />
      <path d={`M${x} ${y}l9-4.5 9 4.5-9 4.5z`} fill="#4ade80" />
      <path d={`M${x} ${y}l9 4.5 9-4.5`} fill="none" stroke="#166534" strokeWidth="1" />
    </g>
  )
  return (
    <>
      <Tile id={id} from="#166534" to="#052e16" />
      <circle cx="38" cy="10" r="5" fill="#fef9c3" opacity="0.25" />
      <path d="M40 2v14" stroke="#7dd3fc" strokeWidth="2.5" opacity="0.55" strokeLinecap="round" />
      {block(4, 34, 9, "a")}
      {block(14, 26, 14, "b")}
      {block(24, 18, 19, "c")}
      {/* Ladder up the steps */}
      <g stroke="#b45309" strokeWidth="1.6" strokeLinecap="round">
        <path d="M13 36L21 21M17 38L25 23" />
        <path d="M14.4 33.4l3.6 1.8M16.4 29.6l3.6 1.8M18.4 25.8l3.6 1.8" strokeWidth="1.3" />
      </g>
      {/* A little lightning over the top */}
      <path d="M34 4l-4 7h3l-2 6 6-8h-3l2-5z" fill="#fde047" stroke="#f59e0b" strokeWidth="0.8" strokeLinejoin="round" />
      <circle cx="9" cy="40" r="2.2" fill="#ef4444" stroke="#fff" strokeWidth="0.8" />
    </>
  )
}

/** A Sudoku grid with a few numbers. */
function Sudoku({ id }: ArtProps) {
  const nums: [number, number, string][] = [
    [0, 0, "5"], [1, 1, "3"], [2, 0, "7"], [0, 2, "9"], [2, 2, "1"], [1, 2, "8"],
  ]
  return (
    <>
      <Tile id={id} from="#a78bfa" to="#5b21b6" />
      <rect x="8" y="8" width="32" height="32" rx="4" fill="#fff" />
      <g stroke="#ddd6fe" strokeWidth="0.8">
        {[1, 2, 4, 5, 7, 8].map((k) => (
          <path key={k} d={`M${8 + (32 / 9) * k} 9v30M9 ${8 + (32 / 9) * k}h30`} />
        ))}
      </g>
      <g stroke="#5b21b6" strokeWidth="1.6">
        <path d="M18.67 8.5v31M29.33 8.5v31M8.5 18.67h31M8.5 29.33h31" />
      </g>
      <rect x="8" y="8" width="32" height="32" rx="4" fill="none" stroke="#5b21b6" strokeWidth="1.6" />
      {nums.map(([c, r, n]) => (
        <text key={`${c}${r}`} x={13.3 + c * 10.67} y={16.5 + r * 10.67} textAnchor="middle" fontSize="7.5" fontWeight="800" fill={n === "8" ? "#7c3aed" : "#1e1b4b"} fontFamily="system-ui, sans-serif">
          {n}
        </text>
      ))}
      <rect x="19.4" y="19.4" width="9.2" height="9.2" rx="1.5" fill="#7c3aed" opacity="0.18" />
    </>
  )
}

const ART: Record<LiveGameId, (props: ArtProps) => React.JSX.Element> = {
  snakes: Snakes,
  snakes3d: Snakes3D,
  sudoku: Sudoku,
  scribble: Scribble,
  ludo: Ludo,
  chess: Chess,
  checkers: Checkers,
  tictactoe: TicTacToe,
}
