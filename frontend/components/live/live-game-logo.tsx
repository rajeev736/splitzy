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
  const picture = PICTURE_LOGOS[game]
  if (picture)
    return (
      // eslint-disable-next-line @next/next/no-img-element -- a small static icon; no optimising needed
      <img src={picture} alt="" aria-hidden draggable={false} className={cn("size-12 shrink-0 object-contain", className)} />
    )
  return (
    <svg viewBox="0 0 48 48" role="img" aria-hidden className={cn("size-12 shrink-0", className)}>
      <Art id={uid} />
    </svg>
  )
}

/** Games whose logo is a painted picture (public/game-logos) rather than drawn art. */
const PICTURE_LOGOS: Partial<Record<LiveGameId, string>> = {
  tictactoe: "/game-logos/tictactoe.webp",
  snakes: "/game-logos/snakes.webp",
  snakes3d: "/game-logos/snakes3d.webp",
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

/** A glossy grid: three coral X's winning across the middle, amber O's, and the winning stroke. */
function TicTacToe({ id }: ArtProps) {
  const x = (cx: number, cy: number, key: string) => (
    <g key={key} strokeLinecap="round">
      <path d={`M${cx - 2.7} ${cy - 1.7}l5.4 5.4M${cx + 2.7} ${cy - 1.7}l-5.4 5.4`} stroke="#1e1b4b" strokeOpacity="0.3" strokeWidth="3" />
      <path d={`M${cx - 2.7} ${cy - 2.7}l5.4 5.4M${cx + 2.7} ${cy - 2.7}l-5.4 5.4`} stroke={`url(#${id}-x)`} strokeWidth="3" />
    </g>
  )
  const o = (cx: number, cy: number, key: string) => (
    <g key={key}>
      <circle cx={cx} cy={cy + 1} r="2.8" fill="none" stroke="#1e1b4b" strokeOpacity="0.3" strokeWidth="2.7" />
      <circle cx={cx} cy={cy} r="2.8" fill="none" stroke={`url(#${id}-o)`} strokeWidth="2.7" />
    </g>
  )
  return (
    <>
      <defs>
        <linearGradient id={`${id}-x`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fda4af" />
          <stop offset="1" stopColor="#e11d48" />
        </linearGradient>
        <linearGradient id={`${id}-o`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fef08a" />
          <stop offset="1" stopColor="#f59e0b" />
        </linearGradient>
      </defs>
      <Tile id={id} from="#60a5fa" to="#1e3a8a" />
      {/* The board: a soft panel and its grid */}
      <rect x="7" y="7" width="34" height="34" rx="7" fill="#fff" fillOpacity="0.12" />
      <g stroke="#fff" strokeOpacity="0.9" strokeWidth="2" strokeLinecap="round">
        <path d="M19.3 10.5v27M28.7 10.5v27M10.5 19.3h27M10.5 28.7h27" />
      </g>
      {o(14.4, 14.4, "o1")}
      {o(33.6, 33.6, "o2")}
      {x(14.4, 24, "x1")}
      {x(24, 24, "x2")}
      {x(33.6, 24, "x3")}
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

/**
 * The jungle tower in two steps: a grass-topped stone block with an explorer
 * on it, a bamboo ladder up to a taller block behind, and a fat orange snake
 * coiled on top, draping down its side. Sunlit teal haze behind.
 */
function Snakes3D({ id }: ArtProps) {
  // An isometric block: top diamond centred at (cx, cy), half-width w, sides h deep
  const block = (cx: number, cy: number, w: number, h: number, key: string) => {
    const q = w / 2
    return (
      <g key={key}>
        <path d={`M${cx - w} ${cy}L${cx} ${cy + q}V${cy + q + h}L${cx - w} ${cy + h}z`} fill={`url(#${id}-stoneL)`} />
        <path d={`M${cx + w} ${cy}L${cx} ${cy + q}V${cy + q + h}L${cx + w} ${cy + h}z`} fill={`url(#${id}-stoneR)`} />
        {/* Stone courses */}
        <path
          d={`M${cx - w} ${cy + h * 0.45}L${cx} ${cy + q + h * 0.45}L${cx + w} ${cy + h * 0.45}`}
          fill="none"
          stroke="#1e293b"
          strokeOpacity="0.25"
          strokeWidth="0.7"
        />
        {/* Grass fringe and top */}
        <path d={`M${cx - w} ${cy}L${cx} ${cy + q}L${cx + w} ${cy}v2.4L${cx} ${cy + q + 2.4}L${cx - w} ${cy + 2.4}z`} fill="#15803d" />
        <path d={`M${cx - w} ${cy}L${cx} ${cy - q}L${cx + w} ${cy}L${cx} ${cy + q}z`} fill={`url(#${id}-grass)`} />
        <path d={`M${cx - w + 2.5} ${cy}L${cx} ${cy - q + 1.25}`} stroke="#fff" strokeOpacity="0.5" strokeWidth="0.9" strokeLinecap="round" />
      </g>
    )
  }
  const body = "M33.5 13.6c3.6.6 6.4 2.4 6.2 5.2-.2 2.6-2.8 3.6-2.6 6.6.2 3 2.6 4.6 1.8 8"
  return (
    <>
      <defs>
        <linearGradient id={`${id}-sky`} x1="0" y1="0" x2="0.35" y2="1">
          <stop offset="0" stopColor="#99f6e4" />
          <stop offset="0.5" stopColor="#14b8a6" />
          <stop offset="1" stopColor="#065f46" />
        </linearGradient>
        <radialGradient id={`${id}-sun`} cx="0.82" cy="0.1" r="0.45">
          <stop offset="0" stopColor="#fffbeb" />
          <stop offset="1" stopColor="#fffbeb" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${id}-grass`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#d9f99d" />
          <stop offset="1" stopColor="#4ade80" />
        </linearGradient>
        <linearGradient id={`${id}-stoneL`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#94a3b8" />
          <stop offset="1" stopColor="#475569" />
        </linearGradient>
        <linearGradient id={`${id}-stoneR`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#64748b" />
          <stop offset="1" stopColor="#334155" />
        </linearGradient>
        <linearGradient id={`${id}-snake`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fdba74" />
          <stop offset="1" stopColor="#f97316" />
        </linearGradient>
        <clipPath id={`${id}-clip`}>
          <rect width="48" height="48" rx="11" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${id}-clip)`}>
        <rect width="48" height="48" fill={`url(#${id}-sky)`} />
        <rect width="48" height="48" fill={`url(#${id}-sun)`} />
        {/* Far jungle, then mist */}
        <path d="M0 24c3-3 6-2 8-4s5-4 8-2 4 3 7 1 5-3 8-1v30H0z" fill="#0d9488" opacity="0.55" />
        <rect y="30" width="48" height="18" fill="#ccfbf1" opacity="0.12" />
        {block(31, 16, 11, 26, "high")}
        {block(17, 28, 11, 14, "low")}
        {/* Bamboo ladder from the low step up to the high one */}
        <g strokeLinecap="round">
          <path d="M18.6 30.4L24.4 17.8M22.8 31.6L28.6 19" stroke="#a16207" strokeWidth="1.8" />
          <path d="M19.9 27.9l4 1.2M21.3 24.8l4 1.2M22.7 21.7l4 1.2" stroke="#facc15" strokeWidth="1.3" />
        </g>
        {/* The snake: coiled on the high block, draping down its side */}
        <path d={body} fill="none" stroke="#9a3412" strokeWidth="4.6" strokeLinecap="round" />
        <path d={body} fill="none" stroke={`url(#${id}-snake)`} strokeWidth="3.1" strokeLinecap="round" />
        <path d={body} fill="none" stroke="#7c2d12" strokeWidth="3.1" strokeDasharray="1 2.4" strokeOpacity="0.5" />
        <ellipse cx="31.6" cy="12.6" rx="3.6" ry="2.9" fill="#fb923c" stroke="#9a3412" strokeWidth="0.9" />
        <circle cx="30.5" cy="11.8" r="1.15" fill="#fff" />
        <circle cx="33" cy="11.8" r="1.15" fill="#fff" />
        <circle cx="30.3" cy="12" r="0.55" fill="#0f172a" />
        <circle cx="32.8" cy="12" r="0.55" fill="#0f172a" />
        <path d="M28.2 13.4h-1.6l-.8-.8M26.6 13.4l-.8.8" stroke="#dc2626" strokeWidth="0.65" strokeLinecap="round" fill="none" />
        {/* The explorer on the low step */}
        <ellipse cx="12.5" cy="29.4" rx="2.8" ry="0.9" fill="#14532d" opacity="0.45" />
        <path d="M10.3 29c0-2.6 1-4 2.2-4s2.2 1.4 2.2 4z" fill="#ef4444" />
        <circle cx="12.5" cy="23.6" r="2" fill="#fde68a" />
        <ellipse cx="12.5" cy="22.2" rx="2.9" ry="0.9" fill="#92400e" />
        <path d="M10.8 22.2a1.7 1.7 0 0 1 3.4 0z" fill="#d97706" />
        {/* A leaf in front, for depth */}
        <path d="M-1 48c2-8 7-12 13-12-2 6-6 10-13 12z" fill="#166534" />
        <path d="M0 47c3-4 6-7 10-9.5" stroke="#4ade80" strokeWidth="0.6" fill="none" opacity="0.7" />
      </g>
      <rect width="48" height="48" rx="11" fill="none" stroke="#000" strokeOpacity="0.1" />
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
