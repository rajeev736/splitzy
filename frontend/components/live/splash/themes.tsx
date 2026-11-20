import type * as React from "react"

import type { LiveGameId } from "@/lib/live/types"

/**
 * Each game's look on the match splash: a soft sky, cloud tint, the logo's
 * colours and three little item tiles floating around the logo. Everything
 * else (layout, clouds, bar) is shared — see splash-scene.tsx.
 */
export interface SplashTheme {
  /** The logotype, one entry per line. */
  title: string[]
  /** A small sticker next to the title ("3D"). */
  badge?: string
  /** Page background: a light top-to-bottom gradient. */
  sky: string
  /** The clouds' shaded underside. */
  cloudShade: string
  /** Logo rim (dark), also used for labels and the bar's track. */
  rim: string
  /** Lower half of the logo's face. */
  tint: string
  /** The three item tiles around the logo. */
  tiles: [TileIcon, TileIcon, TileIcon]
}

export type TileIcon = keyof typeof ICONS

export const SPLASH_THEMES: Record<LiveGameId, SplashTheme> = {
  tictactoe: {
    title: ["TIC TAC", "TOE"],
    sky: "linear-gradient(180deg,#7db4ff 0%,#a7c3ff 48%,#d9cbff 100%)",
    cloudShade: "#f2d3f2",
    rim: "#1d3a8f",
    tint: "#d3e3ff",
    tiles: ["x", "o", "grid"],
  },
  ludo: {
    title: ["LUDO"],
    sky: "linear-gradient(180deg,#ffa98a 0%,#ffc9a0 48%,#ffeac4 100%)",
    cloudShade: "#ffd9cf",
    rim: "#86203d",
    tint: "#ffe28c",
    tiles: ["dice", "pawnRed", "pawnBlue"],
  },
  chess: {
    title: ["CHESS"],
    sky: "linear-gradient(180deg,#8fd2c4 0%,#bfe5d4 50%,#f1f1da 100%)",
    cloudShade: "#d9efe0",
    rim: "#163d34",
    tint: "#e3f5ea",
    tiles: ["knight", "crown", "chessPawn"],
  },
  checkers: {
    title: ["CHECKERS"],
    sky: "linear-gradient(180deg,#ff9a9a 0%,#ffbfae 50%,#ffe6cf 100%)",
    cloudShade: "#ffd6cc",
    rim: "#7a1424",
    tint: "#ffd5c9",
    tiles: ["checkerRed", "crown", "checkerDark"],
  },
  snakes: {
    title: ["SNAKES &", "LADDERS"],
    sky: "linear-gradient(180deg,#86d88a 0%,#bce9a2 50%,#f2f6c6 100%)",
    cloudShade: "#e3f3c8",
    rim: "#1d5622",
    tint: "#e0ffb4",
    tiles: ["snake", "ladder", "dice"],
  },
  snakes3d: {
    title: ["SNAKES &", "LADDERS"],
    badge: "3D",
    sky: "linear-gradient(180deg,#6ccdc0 0%,#a5e4cf 50%,#e3f6cf 100%)",
    cloudShade: "#d5f0de",
    rim: "#0c4844",
    tint: "#c6fbeb",
    tiles: ["snake", "ladder", "dice"],
  },
  sudoku: {
    title: ["SUDOKU", "RACE"],
    sky: "linear-gradient(180deg,#8ea6ff 0%,#b5c5ff 50%,#e3e9ff 100%)",
    cloudShade: "#dcdcfa",
    rim: "#1b2a78",
    tint: "#d3dcff",
    tiles: ["seven", "three", "nine"],
  },
  scribble: {
    title: ["SCRIBBLE"],
    sky: "linear-gradient(180deg,#ff9fcf 0%,#ffbfdf 46%,#e6d0ff 100%)",
    cloudShade: "#f6d2ec",
    rim: "#651a74",
    tint: "#ffd6f0",
    tiles: ["pencil", "brush", "palette"],
  },
}

const INK = "#262a3a"

const pawn = (c: string) => (
  <>
    <ellipse cx="20" cy="34.5" rx="11" ry="2.6" fill="#000" opacity=".14" />
    <path d="M12.5 33 C12.5 25.5 15.5 21.5 20 19.5 C24.5 21.5 27.5 25.5 27.5 33 Z" fill={c} />
    <circle cx="20" cy="13" r="7" fill={c} />
    <circle cx="17.6" cy="10.6" r="2.2" fill="#fff" opacity=".6" />
    <rect x="10" y="31" width="20" height="4.5" rx="2.25" fill={c} />
  </>
)

const checker = (c: string, edge: string) => (
  <>
    <ellipse cx="20" cy="23.5" rx="13" ry="10" fill={edge} />
    <ellipse cx="20" cy="19.5" rx="13" ry="10" fill={c} />
    <ellipse cx="20" cy="19.5" rx="8.5" ry="6.4" fill="none" stroke="#fff" strokeOpacity=".45" strokeWidth="1.8" />
  </>
)

const digit = (d: string, c: string) => (
  <text
    x="20"
    y="30"
    textAnchor="middle"
    fontSize="27"
    fontWeight="900"
    fill={c}
    fontFamily='ui-rounded,"Arial Rounded MT Bold",var(--font-inter),system-ui,sans-serif'
  >
    {d}
  </text>
)

/** The items, drawn in a 40×40 box (simple flat shapes: cheap to paint). */
const ICONS = {
  dice: (
    <>
      <rect x="7" y="7" width="26" height="26" rx="7" fill="#ff5a4f" />
      <rect x="7" y="7" width="26" height="13" rx="7" fill="#fff" opacity=".18" />
      {[
        [14, 14],
        [26, 14],
        [20, 20],
        [14, 26],
        [26, 26],
      ].map(([cx, cy]) => (
        <circle key={`${cx}${cy}`} cx={cx} cy={cy} r="2.8" fill="#fff" />
      ))}
    </>
  ),
  pawnRed: pawn("#ef4444"),
  pawnBlue: pawn("#2f7cf6"),
  x: (
    <path d="M11 11 L29 29 M29 11 L11 29" stroke="#ff5a5f" strokeWidth="7" strokeLinecap="round" />
  ),
  o: <circle cx="20" cy="20" r="10" fill="none" stroke="#3b82f6" strokeWidth="6.5" />,
  grid: (
    <path
      d="M16 8 V32 M24 8 V32 M8 16 H32 M8 24 H32"
      stroke="#7b8fc4"
      strokeWidth="3.2"
      strokeLinecap="round"
    />
  ),
  knight: (
    <>
      <path
        d="M12 33 H29 C29 27 26.5 24 25 20.5 L28.5 22.5 C30.5 23.2 32 21.5 31 19.5 L26 10 C24 6.8 20 5.6 16.5 6.6 L15.5 3.5 L13 7.8 C10 10 8.8 14 9.8 18 C10.8 22 14 24.5 13.4 28.5 Z"
        fill={INK}
      />
      <circle cx="19" cy="12" r="1.6" fill="#fff" />
      <rect x="9" y="31.5" width="23" height="4.5" rx="2.25" fill={INK} />
    </>
  ),
  chessPawn: (
    <>
      <circle cx="20" cy="12" r="5.6" fill={INK} />
      <path d="M14.5 31 C14.5 25 16.5 21 18 18.5 H22 C23.5 21 25.5 25 25.5 31 Z" fill={INK} />
      <rect x="14" y="17" width="12" height="3" rx="1.5" fill={INK} />
      <rect x="10.5" y="30.5" width="19" height="5" rx="2.5" fill={INK} />
      <circle cx="18.3" cy="10.3" r="1.6" fill="#fff" opacity=".5" />
    </>
  ),
  crown: (
    <>
      <path d="M8 28 L9.5 13 L15.5 19.5 L20 9 L24.5 19.5 L30.5 13 L32 28 Z" fill="#ffc531" stroke="#d48a06" strokeWidth="1.6" strokeLinejoin="round" />
      <rect x="8" y="27" width="24" height="5.5" rx="2.2" fill="#f2a812" />
      <circle cx="20" cy="22" r="2.4" fill="#ef4444" />
      <circle cx="13.5" cy="23.5" r="1.7" fill="#3b82f6" />
      <circle cx="26.5" cy="23.5" r="1.7" fill="#22c55e" />
    </>
  ),
  checkerRed: checker("#ef4444", "#a8202a"),
  checkerDark: checker("#3a3f52", "#1c1f2b"),
  snake: (
    <>
      <path d="M7 31 C13 31 13 22 20 22 C27 22 26 14 31 13" fill="none" stroke="#38b24a" strokeWidth="7" strokeLinecap="round" />
      <path d="M7 31 C13 31 13 22 20 22 C27 22 26 14 31 13" fill="none" stroke="#a6ec7a" strokeWidth="2" strokeDasharray="2 4" strokeLinecap="round" />
      <circle cx="31" cy="12.5" r="5.4" fill="#38b24a" />
      <circle cx="32.6" cy="11" r="1.4" fill="#fff" />
      <circle cx="32.9" cy="11" r=".7" fill={INK} />
      <path d="M35.5 14 L38 15.5 M36.6 14.6 L37.6 13.2" stroke="#ef4444" strokeWidth="1.2" strokeLinecap="round" />
    </>
  ),
  ladder: (
    <>
      <path d="M13 6 V35 M27 6 V35" stroke="#b86a22" strokeWidth="4" strokeLinecap="round" />
      <path d="M13 11.5 H27 M13 18.5 H27 M13 25.5 H27 M13 32 H27" stroke="#e39a48" strokeWidth="3" strokeLinecap="round" />
    </>
  ),
  seven: digit("7", "#ef4444"),
  three: digit("3", "#2f7cf6"),
  nine: digit("9", "#16a34a"),
  pencil: (
    <g transform="rotate(40 20 20)">
      <rect x="15.5" y="2.5" width="9" height="5" rx="2" fill="#ff7aa8" />
      <rect x="15.5" y="7" width="9" height="2.4" fill="#c7c9d1" />
      <rect x="15.5" y="9.2" width="9" height="19" fill="#ffc531" />
      <rect x="15.5" y="9.2" width="3" height="19" fill="#ffdd75" />
      <path d="M15.5 28.2 H24.5 L20 37 Z" fill="#f6d3a2" />
      <path d="M18.4 33.6 H21.6 L20 37 Z" fill={INK} />
    </g>
  ),
  brush: (
    <g transform="rotate(-35 20 20)">
      <rect x="17.5" y="3" width="5" height="18" rx="2.5" fill="#9b5de5" />
      <rect x="16.5" y="20" width="7" height="4" fill="#c7c9d1" />
      <path d="M16.5 24 H23.5 C24 29 22.5 34 20 37 C17.5 34 16 29 16.5 24 Z" fill="#ff5a8a" />
    </g>
  ),
  palette: (
    <>
      <path
        d="M20 6 C29 6 35 12 35 19 C35 24 31 25 28 24.5 C25.5 24 24 26 25 28.5 C26 31.5 24 34 20 34 C11.5 34 5 28 5 20 C5 12 11.5 6 20 6 Z"
        fill="#f6d7a7"
        stroke="#d4a868"
        strokeWidth="1.4"
      />
      <circle cx="13" cy="16" r="3" fill="#ef4444" />
      <circle cx="20" cy="12" r="3" fill="#ffc531" />
      <circle cx="27.5" cy="14" r="3" fill="#2f7cf6" />
      <circle cx="12.5" cy="24.5" r="3" fill="#22c55e" />
    </>
  ),
} satisfies Record<string, React.ReactNode>

/** An item drawn on its own (e.g. riding the loading bar). */
export function TileArt({ icon, className }: { icon: TileIcon; className?: string }) {
  return (
    <svg viewBox="0 0 40 40" aria-hidden className={className}>
      {ICONS[icon]}
    </svg>
  )
}
