import * as React from "react"

import type { SplashArtProps } from "../types"

/** The logo's outline and the bar's track. */
const INK = "#16234a"
const FONT = 'var(--font-inter), "Segoe UI", system-ui, sans-serif'

/** The board's four colours: base and a lighter alternate. */
const BOARD = [
  ["#ef4444", "#f87171"],
  ["#facc15", "#fde047"],
  ["#22c55e", "#4ade80"],
  ["#3b82f6", "#60a5fa"],
] as const

/**
 * Snakes & Ladders' splash: a sunny sky, a chunky SNAKES & LADDERS with a
 * wooden ladder behind it and a cartoon snake draped over it, a bright
 * four-colour board tipped back on a grassy hill, and a golden loading bar.
 */
export default function Splash({ progress }: SplashArtProps) {
  const uid = "spl-snakes-" + React.useId().replace(/[^a-zA-Z0-9_-]/g, "")
  return (
    <div
      className="relative isolate size-full overflow-hidden"
      style={{ background: "linear-gradient(to bottom, #38bdf8 0%, #7dd3fc 38%, #bae6fd 62%, #e0f2fe 100%)" }}
    >
      <style>{CSS}</style>
      <Rays />
      <Cloud className="spl-snakes-cloud top-[7%] left-[calc(50%-min(64vw,40vh))] w-[min(34vw,20vh)]" />
      <Cloud className="spl-snakes-cloud spl-snakes-cloud-b top-[40%] right-[calc(50%-min(66vw,42vh))] w-[min(40vw,24vh)]" />
      <Cloud className="spl-snakes-cloud top-[46%] left-[calc(50%-min(70vw,46vh))] w-[min(30vw,18vh)] opacity-80" />
      <Hills />
      <Board id={uid} />

      {/* Pieces and a die on the board */}
      <div className="absolute top-[57%] left-1/2 flex -translate-x-1/2 items-end gap-[min(3vw,2vh)]">
        <Pawn id={uid} tone={0} className="spl-snakes-hop" />
        <div className="spl-snakes-roll mb-[2%]">
          <Die id={uid} />
        </div>
        <Pawn id={uid} tone={3} className="spl-snakes-hop spl-snakes-hop-b" />
      </div>

      {/* Title, upper third */}
      <div className="absolute inset-x-0 top-[5%] flex justify-center">
        <Title id={uid} />
      </div>

      {/* Loading bar, lower third */}
      <div className="absolute inset-x-0 bottom-[7%] flex flex-col items-center gap-[1.4vh]">
        <Bar progress={progress} />
        <p className="spl-snakes-loading">Loading…</p>
      </div>
    </div>
  )
}

/** A point on the rays' rim, rounded so server and client agree. */
const xy = (a: number) => `${(Math.cos(a) * 140).toFixed(2)} ${(Math.sin(a) * 140).toFixed(2)}`

/** Soft sunburst behind the title. */
function Rays() {
  const n = 16
  return (
    <svg
      aria-hidden
      viewBox="-100 -100 200 200"
      className="spl-snakes-rays absolute top-[22%] left-1/2 -z-10 aspect-square w-[max(220vw,220vh)]"
    >
      <defs>
        <radialGradient id="spl-snakes-sun">
          <stop offset="0" stopColor="#fffbeb" stopOpacity="0.8" />
          <stop offset="1" stopColor="#fffbeb" stopOpacity="0" />
        </radialGradient>
      </defs>
      {Array.from({ length: n }, (_, i) => {
        const a = (i / n) * Math.PI * 2
        return <path key={i} d={`M0 0 L${xy(a)} L${xy(a + Math.PI / n)} Z`} fill="#fff" opacity={0.13} />
      })}
      <circle r="40" fill="url(#spl-snakes-sun)" />
    </svg>
  )
}

function Cloud({ className }: { className: string }) {
  return (
    <svg aria-hidden viewBox="0 0 120 60" className={`absolute -z-10 h-auto ${className}`}>
      <g fill="#fff">
        <circle cx="30" cy="38" r="18" />
        <circle cx="55" cy="26" r="24" />
        <circle cx="84" cy="34" r="19" />
        <rect x="18" y="36" width="86" height="20" rx="10" />
      </g>
      <path d="M20 50 Q60 60 102 50 L102 56 L20 56 Z" fill="#bae6fd" opacity="0.7" />
    </svg>
  )
}

/** Rolling green hills along the bottom. */
function Hills() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 400 200"
      preserveAspectRatio="none"
      className="absolute inset-x-0 bottom-0 -z-10 h-[42%] w-full"
    >
      <path d="M0 70 C80 30 150 40 210 62 C270 84 330 40 400 52 L400 200 L0 200 Z" fill="#86efac" />
      <path d="M0 110 C70 80 140 92 200 104 C270 118 330 84 400 96 L400 200 L0 200 Z" fill="#4ade80" />
      <path d="M0 150 C90 128 170 140 230 146 C300 152 350 132 400 138 L400 200 L0 200 Z" fill="#22c55e" />
    </svg>
  )
}

/* ---------------------------------------------------------------- title */

const SNAKES_FILL = ["#fff7b0", "#fbbf24", "#ea580c"]
const LADDERS_FILL = ["#ffc4c4", "#f43f5e", "#9f1239"]

function Title({ id }: { id: string }) {
  return (
    <svg
      viewBox="-10 -30 420 330"
      className="spl-snakes-title block h-auto overflow-visible"
      style={{ width: "min(94vw, 50vh, 560px)" }}
      role="img"
      aria-label="Snakes & Ladders"
    >
      <defs>
        <Grad id={`${id}-sn`} stops={SNAKES_FILL} />
        <Grad id={`${id}-ld`} stops={LADDERS_FILL} />
        <Grad id={`${id}-amp`} stops={["#bfdbfe", "#3b82f6", "#1e3a8a"]} />
        <linearGradient id={`${id}-gloss`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.7" />
          <stop offset="0.44" stopColor="#fff" stopOpacity="0.1" />
          <stop offset="0.45" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <radialGradient id={`${id}-head`} cx="0.4" cy="0.3" r="0.8">
          <stop offset="0" stopColor="#bef264" />
          <stop offset="0.55" stopColor="#4ade80" />
          <stop offset="1" stopColor="#15803d" />
        </radialGradient>
      </defs>

      <Ladder from={[18, 300]} to={[392, -22]} />

      {/* The snake's tail, behind the words */}
      <SnakeBody d="M100 214 C76 252 24 256 12 212 C2 174 34 146 26 112 C20 86 14 72 28 56" />

      <g className="spl-snakes-bob">
        <Word text="SNAKES" x={200} y={124} size={94} length={356} fill={`url(#${id}-sn)`} rim="#c2410c" gloss={`url(#${id}-gloss)`} />
      </g>
      <g transform="rotate(-4 220 210)">
        <g className="spl-snakes-bob spl-snakes-bob-b">
          <Word text="LADDERS" x={226} y={226} size={78} length={300} fill={`url(#${id}-ld)`} rim="#9f1239" gloss={`url(#${id}-gloss)`} />
        </g>
      </g>

      {/* "&" badge */}
      <g transform="translate(44 182) rotate(-10)">
        <circle r="30" fill={INK} />
        <circle r="24" fill={`url(#${id}-amp)`} stroke="#fff" strokeWidth="3" />
        <path d="M-17 -6 A20 16 0 0 1 17 -6" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" opacity="0.45" />
        <text
          y="12"
          textAnchor="middle"
          fontFamily={FONT}
          fontWeight={900}
          fontSize="34"
          fill="#fff"
          stroke={INK}
          strokeWidth="5"
          strokeLinejoin="round"
          paintOrder="stroke"
        >
          &amp;
        </text>
      </g>

      {/* The snake slithers over the top of SNAKES and rears up at the end */}
      <g className="spl-snakes-sway">
        <SnakeBody d="M28 56 C40 30 72 30 100 42 C130 54 150 30 186 32 C222 34 236 56 270 50 C302 44 318 22 340 18" />
        <Head id={id} />
      </g>
    </svg>
  )
}

function Grad({ id, stops }: { id: string; stops: readonly string[] }) {
  return (
    <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stopColor={stops[0]} />
      <stop offset="0.48" stopColor={stops[1]} />
      <stop offset="1" stopColor={stops[2]} />
    </linearGradient>
  )
}

/** One chunky word: a deep drop, a thick dark outline, a coloured rim, gradient fill and gloss. */
function Word(p: { text: string; x: number; y: number; size: number; length: number; fill: string; rim: string; gloss: string }) {
  const common = {
    x: p.x,
    textAnchor: "middle" as const,
    fontFamily: FONT,
    fontWeight: 900,
    fontSize: p.size,
    letterSpacing: -1,
    textLength: p.length,
    lengthAdjust: "spacingAndGlyphs" as const,
    strokeLinejoin: "round" as const,
  }
  return (
    <>
      <text {...common} y={p.y + 9} fill={INK} stroke={INK} strokeWidth="20">
        {p.text}
      </text>
      <text {...common} y={p.y + 4} fill={INK} stroke={INK} strokeWidth="20">
        {p.text}
      </text>
      <text {...common} y={p.y} fill={INK} stroke={INK} strokeWidth="18">
        {p.text}
      </text>
      <text {...common} y={p.y} fill={p.fill} stroke={p.rim} strokeWidth="6" paintOrder="stroke">
        {p.text}
      </text>
      <text {...common} y={p.y} fill={p.gloss}>
        {p.text}
      </text>
    </>
  )
}

/** A wooden ladder between two points, drawn with outlined rails and rungs. */
function Ladder({ from, to }: { from: [number, number]; to: [number, number] }) {
  const [x0, y0] = from
  const [x1, y1] = to
  const len = Math.hypot(x1 - x0, y1 - y0)
  const angle = (Math.atan2(y1 - y0, x1 - x0) * 180) / Math.PI
  const half = 22
  const rungs = Math.floor(len / 34)
  return (
    <g transform={`translate(${x0} ${y0}) rotate(${angle.toFixed(2)})`} strokeLinecap="round">
      {Array.from({ length: rungs }, (_, i) => {
        const x = 20 + i * 34
        return (
          <g key={i}>
            <line x1={x} y1={-half} x2={x} y2={half} stroke={INK} strokeWidth="13" />
            <line x1={x} y1={-half} x2={x} y2={half} stroke="#c2721f" strokeWidth="7.5" />
          </g>
        )
      })}
      {[-half, half].map((y) => (
        <g key={y}>
          <line x1="0" y1={y} x2={len} y2={y} stroke={INK} strokeWidth="17" />
          <line x1="0" y1={y} x2={len} y2={y} stroke="#d97706" strokeWidth="10.5" />
          <line x1="4" y1={y - 2} x2={len - 4} y2={y - 2} stroke="#fcd34d" strokeWidth="3" />
        </g>
      ))}
    </g>
  )
}

/** A thick banded snake body along a path. */
function SnakeBody({ d }: { d: string }) {
  return (
    <g fill="none" strokeLinejoin="round">
      <path d={d} stroke={INK} strokeWidth="33" strokeLinecap="round" />
      <path d={d} stroke="#22c55e" strokeWidth="25" strokeLinecap="round" />
      <path d={d} stroke="#fde047" strokeWidth="25" strokeDasharray="7 15" />
      <path d={d} stroke="#15803d" strokeWidth="25" strokeDasharray="2 20" strokeDashoffset="-9" opacity="0.5" />
      <path d={d} stroke="#dcfce7" strokeWidth="4.5" strokeLinecap="round" opacity="0.6" transform="translate(-1 -6.5)" />
    </g>
  )
}

/** A friendly snake head looking down at the title, tongue out. */
function Head({ id }: { id: string }) {
  return (
    <g transform="translate(348 4) rotate(-12)">
      <g className="spl-snakes-head">
        <g className="spl-snakes-tongue">
          <path d="M0 24 L0 44 L-8 53 M0 44 L8 53" fill="none" stroke={INK} strokeWidth="7.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M0 24 L0 44 L-8 53 M0 44 L8 53" fill="none" stroke="#ef4444" strokeWidth="3.8" strokeLinecap="round" strokeLinejoin="round" />
        </g>
        <path
          d="M0 -30 C26 -30 44 -14 42 4 C40 22 20 32 0 32 C-20 32 -40 22 -42 4 C-44 -14 -26 -30 0 -30 Z"
          fill={`url(#${id}-head)`}
          stroke={INK}
          strokeWidth="5.5"
        />
        <ellipse cx="0" cy="-22" rx="8" ry="4" fill="#15803d" opacity="0.55" />
        <ellipse cx="-17" cy="-19" rx="4" ry="2.5" fill="#15803d" opacity="0.5" />
        <ellipse cx="17" cy="-19" rx="4" ry="2.5" fill="#15803d" opacity="0.5" />
        <path d="M-24 -12 Q-14 -24 2 -24" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" opacity="0.5" />
        <path d="M-24 13 Q0 30 24 13" fill="none" stroke={INK} strokeWidth="4" strokeLinecap="round" />
        <circle cx="-5" cy="10" r="2" fill={INK} />
        <circle cx="5" cy="10" r="2" fill={INK} />
        <circle cx="-29" cy="10" r="5" fill="#fb7185" opacity="0.55" />
        <circle cx="29" cy="10" r="5" fill="#fb7185" opacity="0.55" />
        {[-15, 15].map((x) => (
          <g key={x} transform={`translate(${x} -5)`}>
            <ellipse rx="10.5" ry="12" fill="#fff" stroke={INK} strokeWidth="4" />
            <circle cx="-3" cy="4" r="5.8" fill={INK} />
            <circle cx="-4.8" cy="1.8" r="2" fill="#fff" />
          </g>
        ))}
      </g>
    </g>
  )
}

/* ---------------------------------------------------------------- board */

/** The game's ladders and snakes, drawn flat on the board (cell units). */
const BOARD_LADDERS: [number, number, number, number][] = [
  [15, 82, 35, 22],
  [72, 92, 88, 52],
]
const BOARD_SNAKES = ["M64 14 C40 26 76 40 54 52 C34 62 62 72 46 86", "M92 30 C78 40 96 56 80 66"]

/** A bright 10 × 10 board, tipped back on the hill. */
function Board({ id }: { id: string }) {
  return (
    <div className="spl-snakes-board absolute left-1/2 -z-10" aria-hidden>
      <svg viewBox="-5 -5 110 110" className="block size-full">
        <defs>
          <linearGradient id={`${id}-cell-gloss`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#fff" stopOpacity="0.28" />
            <stop offset="1" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
        </defs>
        <rect x="-5" y="-5" width="110" height="110" rx="5" fill={INK} />
        <rect x="-2.5" y="-2.5" width="105" height="105" rx="3" fill="#fde68a" />
        {Array.from({ length: 100 }, (_, i) => {
          const r = Math.floor(i / 10)
          const c = i % 10
          // Row 0 is the top; numbering snakes up from 1 at the bottom left
          const fromBottom = 9 - r
          const n = fromBottom * 10 + (fromBottom % 2 === 0 ? c + 1 : 10 - c)
          const colour = BOARD[(c % 2) + 2 * (r % 2)][(r + c) % 4 < 2 ? 0 : 1]
          return (
            <g key={i}>
              <rect x={c * 10} y={r * 10} width="10" height="10" fill={colour} />
              <text
                x={c * 10 + 1.2}
                y={r * 10 + 3.6}
                fontFamily={FONT}
                fontWeight={800}
                fontSize="3"
                fill="#fff"
                opacity="0.85"
              >
                {n}
              </text>
            </g>
          )
        })}
        <rect width="100" height="100" fill={`url(#${id}-cell-gloss)`} />
        {BOARD_LADDERS.map(([ax, ay, bx, by]) => {
          const len = Math.hypot(bx - ax, by - ay)
          const angle = (Math.atan2(by - ay, bx - ax) * 180) / Math.PI
          return (
            <g key={`${ax}-${ay}`} transform={`translate(${ax} ${ay}) rotate(${angle.toFixed(2)})`} strokeLinecap="round">
              {Array.from({ length: Math.floor(len / 6) }, (_, i) => (
                <line key={i} x1={4 + i * 6} y1="-3" x2={4 + i * 6} y2="3" stroke="#92400e" strokeWidth="1.4" />
              ))}
              <line x1="0" y1="-3.2" x2={len} y2="-3.2" stroke="#92400e" strokeWidth="1.8" />
              <line x1="0" y1="3.2" x2={len} y2="3.2" stroke="#92400e" strokeWidth="1.8" />
            </g>
          )
        })}
        {BOARD_SNAKES.map((d) => (
          <g key={d} fill="none" strokeLinecap="round">
            <path d={d} stroke={INK} strokeWidth="5.4" />
            <path d={d} stroke="#a855f7" strokeWidth="3.8" />
            <path d={d} stroke="#f0abfc" strokeWidth="3.8" strokeDasharray="1.6 3" />
            <circle cx={d.split(" ")[0].slice(1)} cy={d.split(" ")[1]} r="3.6" fill="#a855f7" stroke={INK} strokeWidth="1" />
          </g>
        ))}
      </svg>
    </div>
  )
}

/** A board-game pawn: a ball head on a bell-shaped body. */
function Pawn({ id, tone, className }: { id: string; tone: number; className?: string }) {
  const [base, light] = BOARD[tone]
  const g = `${id}-p${tone}`
  return (
    <svg viewBox="0 0 64 100" aria-hidden className={className} style={{ width: "min(14vw, 8vh, 84px)" }}>
      <defs>
        <linearGradient id={`${g}-b`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor={light} />
          <stop offset="0.4" stopColor={base} />
          <stop offset="1" stopColor={INK} stopOpacity="0.9" />
        </linearGradient>
        <radialGradient id={`${g}-h`} cx="0.36" cy="0.32" r="0.8">
          <stop offset="0" stopColor="#fff" />
          <stop offset="0.3" stopColor={light} />
          <stop offset="0.7" stopColor={base} />
          <stop offset="1" stopColor={INK} />
        </radialGradient>
      </defs>
      <ellipse cx="32" cy="92" rx="27" ry="6" fill="#000" opacity="0.25" />
      <g stroke={INK} strokeWidth="3.5" strokeLinejoin="round">
        <path d="M8 84 C10 66 21 56 24 44 L40 44 C43 56 54 66 56 84 Z" fill={`url(#${g}-b)`} />
        <ellipse cx="32" cy="84" rx="25" ry="8" fill={`url(#${g}-b)`} />
        <ellipse cx="32" cy="44" rx="14" ry="4.5" fill={`url(#${g}-b)`} />
        <circle cx="32" cy="26" r="16" fill={`url(#${g}-h)`} />
      </g>
      <ellipse cx="25" cy="19" rx="5" ry="3.4" fill="#fff" opacity="0.8" transform="rotate(-30 25 19)" />
    </svg>
  )
}

/** A white die showing a six, tipped toward the viewer. */
function Die({ id }: { id: string }) {
  return (
    <svg viewBox="0 0 100 112" aria-hidden className="block h-auto overflow-visible" style={{ width: "min(17vw, 9.5vh, 100px)" }}>
      <defs>
        <linearGradient id={`${id}-die`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff" />
          <stop offset="1" stopColor="#eef2ff" />
        </linearGradient>
      </defs>
      <ellipse cx="50" cy="104" rx="38" ry="7" fill="#000" opacity="0.22" />
      <path d="M50 8 L90 30 L90 74 L50 96 L10 74 L10 30 Z" fill={INK} stroke={INK} strokeWidth="9" strokeLinejoin="round" />
      <path d="M50 8 L90 30 L50 52 L10 30 Z" fill={`url(#${id}-die)`} />
      <path d="M10 30 L50 52 L50 96 L10 74 Z" fill="#e2e8f0" />
      <path d="M50 52 L90 30 L90 74 L50 96 Z" fill="#c7d2fe" />
      <g transform="matrix(0.4 -0.22 0.4 0.22 10 30)" fill="#ef4444">
        {[22, 50, 78].flatMap((y) => [27, 73].map((x) => <circle key={`${x}-${y}`} cx={x} cy={y} r="10" />))}
      </g>
      <g transform="matrix(0.4 0.22 0 0.44 10 30)" fill={INK}>
        <circle cx="27" cy="27" r="10" />
        <circle cx="73" cy="73" r="10" />
      </g>
      <g transform="matrix(0.4 -0.22 0 0.44 50 52)" fill={INK}>
        <circle cx="25" cy="25" r="10" />
        <circle cx="50" cy="50" r="10" />
        <circle cx="75" cy="75" r="10" />
      </g>
    </svg>
  )
}

/* ---------------------------------------------------------------- bar */

function Bar({ progress }: { progress: number }) {
  const pct = Math.max(0, Math.min(1, progress)) * 100
  return (
    <div className="spl-snakes-bar">
      <div className="spl-snakes-fill" style={{ width: `${pct}%` }} />
    </div>
  )
}

const CSS = `
.spl-snakes-rays{transform:translate(-50%,-50%);animation:spl-snakes-spin 80s linear infinite}
@keyframes spl-snakes-spin{from{transform:translate(-50%,-50%) rotate(0)}to{transform:translate(-50%,-50%) rotate(360deg)}}
.spl-snakes-title{filter:drop-shadow(0 10px 12px rgba(10,40,90,.35))}
.spl-snakes-bob{animation:spl-snakes-bob 2.4s ease-in-out infinite}
.spl-snakes-bob-b{animation-delay:-1.2s}
@keyframes spl-snakes-bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}
.spl-snakes-sway{animation:spl-snakes-bob 2.4s ease-in-out infinite;animation-delay:-.3s}
.spl-snakes-head{animation:spl-snakes-nod 2.4s ease-in-out infinite;transform-box:fill-box;transform-origin:50% 90%}
@keyframes spl-snakes-nod{0%,100%{rotate:0deg}50%{rotate:-7deg}}
.spl-snakes-tongue{animation:spl-snakes-flick 1.6s ease-in-out infinite;transform-box:fill-box;transform-origin:50% 0}
@keyframes spl-snakes-flick{0%,40%,100%{transform:scaleY(1)}20%{transform:scaleY(.35)}}
.spl-snakes-cloud{animation:spl-snakes-drift 9s ease-in-out infinite alternate}
.spl-snakes-cloud-b{animation-duration:11s;animation-direction:alternate-reverse}
@keyframes spl-snakes-drift{from{translate:-4vw 0}to{translate:4vw 0}}
.spl-snakes-board{top:64%;width:min(80vw,44vh,470px);aspect-ratio:1;transform:translate(-50%,-50%) perspective(1000px) rotateX(52deg);filter:drop-shadow(0 18px 0 #15803d) drop-shadow(0 12px 22px rgba(10,40,30,.35))}
.spl-snakes-hop{animation:spl-snakes-hop 2.6s cubic-bezier(.3,0,.3,1) infinite}
.spl-snakes-hop-b{animation-delay:1.3s}
@keyframes spl-snakes-hop{0%,26%,100%{translate:0 0}13%{translate:0 -18%}}
.spl-snakes-roll{animation:spl-snakes-roll 3s ease-in-out infinite;transform-origin:50% 80%}
@keyframes spl-snakes-roll{0%,100%{rotate:-5deg;translate:0 0}50%{rotate:6deg;translate:0 -8%}}
.spl-snakes-bar{position:relative;width:min(72vw,52vh,360px);height:clamp(20px,3.3vh,28px);border-radius:9999px;padding:3px;background:linear-gradient(#0b1530,#22325e);border:3px solid #fff;box-shadow:0 4px 0 ${INK},0 10px 20px rgba(10,30,60,.4),inset 0 3px 6px rgba(0,0,0,.6)}
.spl-snakes-fill{height:100%;min-width:calc(clamp(20px,3.3vh,28px) - 12px);border-radius:9999px;transition:width .3s ease-out;box-shadow:inset 0 -2px 0 rgba(0,0,0,.2);background:linear-gradient(to bottom,rgba(255,255,255,.6) 0 32%,rgba(255,255,255,0) 34%),linear-gradient(45deg,rgba(255,255,255,.25) 25%,transparent 25% 50%,rgba(255,255,255,.25) 50% 75%,transparent 75%),linear-gradient(#fef08a,#fbbf24 50%,#ea580c);background-size:100% 100%,22px 22px,100% 100%;animation:spl-snakes-stripes .7s linear infinite}
@keyframes spl-snakes-stripes{from{background-position:0 0,0 0,0 0}to{background-position:0 0,22px 0,0 0}}
.spl-snakes-loading{font-family:${FONT};font-weight:900;font-size:clamp(12px,1.9vh,16px);letter-spacing:.22em;text-transform:uppercase;color:#fff;text-shadow:0 2px 0 ${INK},0 0 10px rgba(10,30,60,.5)}
@media (prefers-reduced-motion:reduce){.spl-snakes-rays,.spl-snakes-bob,.spl-snakes-sway,.spl-snakes-head,.spl-snakes-tongue,.spl-snakes-cloud,.spl-snakes-hop,.spl-snakes-roll,.spl-snakes-fill{animation:none}}
`
