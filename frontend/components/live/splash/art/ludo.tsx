import * as React from "react"

import type { SplashArtProps } from "../types"

/** The four Ludo colours: light (gloss), base, deep (shade). */
const TONES = {
  red: ["#ff9a9a", "#f43f3f", "#b91c1c"],
  green: ["#a7f3c0", "#22c55e", "#15803d"],
  yellow: ["#fff4a3", "#facc15", "#ca8a04"],
  blue: ["#a5c8ff", "#3b82f6", "#1d4ed8"],
} as const
type Tone = keyof typeof TONES

/** The logo's outline, the board's frame and the bar's track. */
const INK = "#1c1048"
const FONT = 'var(--font-inter), "Segoe UI", system-ui, sans-serif'

/**
 * Ludo's splash: a sunburst over royal purple, a big four-colour LUDO with a
 * ribbon, a pair of tumbling dice, the four pawns standing on a board that
 * runs away into the distance, and a bar that fills red → green → yellow → blue.
 */
export default function Splash({ progress }: SplashArtProps) {
  const uid = "spl-ludo-" + React.useId().replace(/[^a-zA-Z0-9_-]/g, "")
  return (
    <div
      className="relative isolate size-full overflow-hidden"
      style={{ background: "radial-gradient(130% 75% at 50% 28%, #8b5cf6 0%, #5b21b6 42%, #2e1065 78%, #1a0b45 100%)" }}
    >
      <style>{CSS}</style>
      <Rays />
      <Sparkles />
      <Board id={uid} />

      {/* Title, upper third */}
      <div className="absolute inset-x-0 top-[7%] flex justify-center">
        <Title id={uid} />
      </div>

      {/* Dice, between the title and the pawns */}
      <div className="spl-ludo-dice absolute top-[37.5%] left-1/2 flex -translate-x-1/2 items-end">
        <div className="spl-ludo-tumble">
          <Die id={`${uid}-a`} top={6} left={3} right={2} width="min(26vw, 15vh, 160px)" />
        </div>
        <div className="spl-ludo-tumble spl-ludo-tumble-b -ml-[2%] rotate-[14deg]">
          <Die id={`${uid}-b`} top={5} left={1} right={3} width="min(19vw, 11vh, 120px)" />
        </div>
      </div>

      {/* Stray dice drifting in at the edges */}
      <div className="spl-ludo-drift absolute top-[46%] left-[calc(50%-min(62vw,40vh))] -z-10 -rotate-[24deg] opacity-90 blur-[1px]">
        <Die id={`${uid}-c`} top={4} left={6} right={5} width="min(21vw, 13vh, 150px)" />
      </div>
      <div className="spl-ludo-drift spl-ludo-drift-b absolute top-[27%] right-[calc(50%-min(60vw,38vh))] -z-10 rotate-[20deg] opacity-80 blur-[1.5px]">
        <Die id={`${uid}-d`} top={2} left={4} right={6} width="min(15vw, 9vh, 110px)" />
      </div>

      {/* Pawns standing on the board */}
      <div className="spl-ludo-pawns absolute top-[59.5%] left-1/2 flex -translate-x-1/2 items-end">
        <Pawn id={uid} tone="red" className="spl-ludo-hop" />
        <Pawn id={uid} tone="green" className="spl-ludo-hop spl-ludo-hop-2 -translate-y-[18%] scale-90" />
        <Pawn id={uid} tone="yellow" className="spl-ludo-hop spl-ludo-hop-3 -translate-y-[18%] scale-90" />
        <Pawn id={uid} tone="blue" className="spl-ludo-hop spl-ludo-hop-4" />
      </div>

      {/* Loading bar, lower third */}
      <div className="absolute inset-x-0 bottom-[8%] flex flex-col items-center gap-[1.4vh]">
        <Bar progress={progress} />
        <p className="spl-ludo-loading">Loading…</p>
      </div>
    </div>
  )
}

/** A point on the rays' rim, rounded so server and client agree. */
const xy = (a: number) => `${(Math.cos(a) * 140).toFixed(2)} ${(Math.sin(a) * 140).toFixed(2)}`

/** Slow sunburst behind the title. */
function Rays() {
  const n = 18
  return (
    <svg
      aria-hidden
      viewBox="-100 -100 200 200"
      className="spl-ludo-rays absolute top-[21%] left-1/2 -z-10 aspect-square w-[max(220vw,220vh)]"
    >
      {Array.from({ length: n }, (_, i) => {
        const a = (i / n) * Math.PI * 2
        const b = a + Math.PI / n
        return (
          <path
            key={i}
            d={`M0 0 L${xy(a)} L${xy(b)} Z`}
            fill="#fff"
            opacity={0.07}
          />
        )
      })}
      <defs>
        <radialGradient id="spl-ludo-glow">
          <stop offset="0" stopColor="#ddd6fe" stopOpacity="0.5" />
          <stop offset="1" stopColor="#ddd6fe" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle r="42" fill="url(#spl-ludo-glow)" />
    </svg>
  )
}

const SPARKLES = [
  { x: "8%", y: "6%", s: 1, d: "0s" },
  { x: "86%", y: "9%", s: 0.8, d: "0.6s" },
  { x: "91%", y: "34%", s: 0.6, d: "1.1s" },
  { x: "5%", y: "38%", s: 0.7, d: "1.6s" },
  { x: "22%", y: "48%", s: 0.5, d: "0.3s" },
  { x: "78%", y: "50%", s: 0.55, d: "0.9s" },
]

function Sparkles() {
  return (
    <>
      {SPARKLES.map((p, i) => (
        <svg
          key={i}
          aria-hidden
          viewBox="-10 -10 20 20"
          className="spl-ludo-twinkle absolute -z-10"
          style={{ left: p.x, top: p.y, width: `calc(${p.s} * clamp(16px, 3.4vh, 30px))`, animationDelay: p.d }}
        >
          <path d="M0 -10 Q1.4 -1.4 10 0 Q1.4 1.4 0 10 Q-1.4 1.4 -10 0 Q-1.4 -1.4 0 -10Z" fill="#fef9c3" />
        </svg>
      ))}
    </>
  )
}

/* ---------------------------------------------------------------- title */

/** Where each letter of LUDO sits, its tilt and its colour. */
const LETTERS: { ch: string; x: number; y: number; r: number; tone: Tone }[] = [
  { ch: "L", x: 56, y: 132, r: -9, tone: "red" },
  { ch: "U", x: 134, y: 124, r: 4, tone: "green" },
  { ch: "D", x: 220, y: 130, r: -4, tone: "yellow" },
  { ch: "O", x: 306, y: 122, r: 8, tone: "blue" },
]

function Title({ id }: { id: string }) {
  return (
    <svg
      viewBox="-12 0 384 220"
      className="spl-ludo-title block h-auto overflow-visible"
      style={{ width: "min(88vw, 52vh, 540px)" }}
      role="img"
      aria-label="Ludo"
    >
      <defs>
        {(Object.keys(TONES) as Tone[]).map((t) => (
          <linearGradient key={t} id={`${id}-t-${t}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={TONES[t][0]} />
            <stop offset="0.45" stopColor={TONES[t][1]} />
            <stop offset="1" stopColor={TONES[t][2]} />
          </linearGradient>
        ))}
        <linearGradient id={`${id}-gloss`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.75" />
          <stop offset="0.42" stopColor="#fff" stopOpacity="0.12" />
          <stop offset="0.43" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={`${id}-rib`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ff7ab8" />
          <stop offset="0.5" stopColor="#ec4899" />
          <stop offset="1" stopColor="#be185d" />
        </linearGradient>
      </defs>

      {LETTERS.map((l, i) => (
        <g key={l.ch} transform={`translate(${l.x} ${l.y}) rotate(${l.r})`}>
          <g className="spl-ludo-bob" style={{ animationDelay: `${i * -0.35}s` }}>
            <Glyph ch={l.ch} fill={`url(#${id}-t-${l.tone})`} rim={TONES[l.tone][2]} gloss={`url(#${id}-gloss)`} size={124} />
          </g>
        </g>
      ))}

      {/* Ribbon */}
      <g transform="translate(180 178)">
        <g stroke={INK} strokeWidth="5" strokeLinejoin="round">
          <path d="M-150 -6 L-118 -10 L-118 26 L-150 22 L-138 8 Z" fill="#9d174d" />
          <path d="M150 -6 L118 -10 L118 26 L150 22 L138 8 Z" fill="#9d174d" />
          <path d="M-126 -20 Q0 -8 126 -20 L126 14 Q0 26 -126 14 Z" fill={`url(#${id}-rib)`} />
        </g>
        <path d="M-120 -14 Q0 -3 120 -14 L120 -5 Q0 6 -120 -5 Z" fill="#fff" opacity="0.28" />
        <text
          y="8"
          textAnchor="middle"
          fontFamily={FONT}
          fontWeight={900}
          fontSize="19"
          letterSpacing="2"
          fill="#fff"
          stroke={INK}
          strokeWidth="5"
          strokeLinejoin="round"
          paintOrder="stroke"
          textLength="214"
          lengthAdjust="spacingAndGlyphs"
        >
          ROLL · RACE · HOME
        </text>
      </g>
    </svg>
  )
}

/** One chunky letter: a deep drop, a thick dark outline, a coloured rim, gradient fill and gloss. */
function Glyph({ ch, fill, rim, gloss, size }: { ch: string; fill: string; rim: string; gloss: string; size: number }) {
  const common = {
    textAnchor: "middle" as const,
    fontFamily: FONT,
    fontWeight: 900,
    fontSize: size,
    strokeLinejoin: "round" as const,
  }
  return (
    <>
      <text {...common} y="10" fill={INK} stroke={INK} strokeWidth="22">
        {ch}
      </text>
      <text {...common} y="5" fill={INK} stroke={INK} strokeWidth="22">
        {ch}
      </text>
      <text {...common} fill={INK} stroke={INK} strokeWidth="20">
        {ch}
      </text>
      <text {...common} fill={fill} stroke={rim} strokeWidth="7" paintOrder="stroke">
        {ch}
      </text>
      <text {...common} fill={gloss}>
        {ch}
      </text>
    </>
  )
}

/* ---------------------------------------------------------------- props */

/** Pip positions on a 100 × 100 face. */
const PIPS: Record<number, [number, number][]> = {
  1: [[50, 50]],
  2: [
    [27, 27],
    [73, 73],
  ],
  3: [
    [25, 25],
    [50, 50],
    [75, 75],
  ],
  5: [
    [25, 25],
    [75, 25],
    [50, 50],
    [25, 75],
    [75, 75],
  ],
  4: [
    [27, 27],
    [73, 27],
    [27, 73],
    [73, 73],
  ],
  6: [
    [27, 22],
    [73, 22],
    [27, 50],
    [73, 50],
    [27, 78],
    [73, 78],
  ],
}

/** An isometric white die; each face's pips are mapped onto it with a matrix. */
function Die({ id, top, left, right, width }: { id: string; top: number; left: number; right: number; width: string }) {
  const faces = [
    { n: top, m: "matrix(0.4 -0.22 0.4 0.22 10 30)", fill: `url(#${id}-top)`, pip: "#e11d48" },
    { n: left, m: "matrix(0.4 0.22 0 0.44 10 30)", fill: "#e4e0f5", pip: INK },
    { n: right, m: "matrix(0.4 -0.22 0 0.44 50 52)", fill: "#bdb4e0", pip: INK },
  ]
  return (
    <svg
      viewBox="0 0 100 112"
      aria-hidden
      className="block h-auto overflow-visible"
      style={{ width }}
    >
      <defs>
        <linearGradient id={`${id}-top`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#f1edff" />
        </linearGradient>
      </defs>
      <ellipse cx="50" cy="104" rx="38" ry="7" fill="#000" opacity="0.28" />
      <path
        d="M50 8 L90 30 L90 74 L50 96 L10 74 L10 30 Z"
        fill={INK}
        stroke={INK}
        strokeWidth="9"
        strokeLinejoin="round"
      />
      <path d="M50 8 L90 30 L50 52 L10 30 Z" fill={faces[0].fill} stroke="#fff" strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M10 30 L50 52 L50 96 L10 74 Z" fill={faces[1].fill} stroke={faces[1].fill} strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M50 52 L90 30 L90 74 L50 96 Z" fill={faces[2].fill} stroke={faces[2].fill} strokeWidth="2.5" strokeLinejoin="round" />
      {faces.map((f, i) => (
        <g key={i} transform={f.m}>
          {PIPS[f.n].map(([x, y], j) => (
            <circle key={j} cx={x} cy={y} r="10" fill={f.pip} />
          ))}
        </g>
      ))}
      <path d="M18 30 L50 12 L60 17.5" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity="0.9" />
    </svg>
  )
}

/** A classic Ludo pawn: a ball head on a bell-shaped body. */
function Pawn({ id, tone, className }: { id: string; tone: Tone; className?: string }) {
  const [light, base, deep] = TONES[tone]
  const g = `${id}-p-${tone}`
  return (
    <svg
      viewBox="0 0 64 100"
      aria-hidden
      className={className}
      style={{ width: "min(17vw, 9.5vh, 96px)", marginInline: "max(-1.6vw, -1vh)" }}
    >
      <defs>
        <linearGradient id={`${g}-body`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor={light} />
          <stop offset="0.35" stopColor={base} />
          <stop offset="1" stopColor={deep} />
        </linearGradient>
        <radialGradient id={`${g}-head`} cx="0.36" cy="0.32" r="0.75">
          <stop offset="0" stopColor="#fff" />
          <stop offset="0.25" stopColor={light} />
          <stop offset="0.6" stopColor={base} />
          <stop offset="1" stopColor={deep} />
        </radialGradient>
      </defs>
      <ellipse cx="32" cy="92" rx="27" ry="6" fill="#000" opacity="0.3" />
      <g stroke={INK} strokeWidth="3.5" strokeLinejoin="round">
        <path d="M8 84 C10 66 21 56 24 44 L40 44 C43 56 54 66 56 84 Z" fill={`url(#${g}-body)`} />
        <ellipse cx="32" cy="84" rx="25" ry="8" fill={`url(#${g}-body)`} />
        <ellipse cx="32" cy="44" rx="14" ry="4.5" fill={`url(#${g}-body)`} />
        <circle cx="32" cy="26" r="16" fill={`url(#${g}-head)`} />
      </g>
      <ellipse cx="25" cy="19" rx="5" ry="3.4" fill="#fff" opacity="0.8" transform="rotate(-30 25 19)" />
      <path d="M17 76 C18 66 23 59 26 52" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity="0.55" />
    </svg>
  )
}

/* ---------------------------------------------------------------- board */

const CELL = 10
/** Coloured cells on the track: each colour's start square and home column. */
const TRACK_COLOURS: { x: number; y: number; tone: Tone }[] = [
  { x: 1, y: 6, tone: "red" },
  ...[1, 2, 3, 4, 5].map((x) => ({ x, y: 7, tone: "red" as Tone })),
  { x: 8, y: 1, tone: "green" },
  ...[1, 2, 3, 4, 5].map((y) => ({ x: 7, y, tone: "green" as Tone })),
  { x: 13, y: 8, tone: "yellow" },
  ...[9, 10, 11, 12, 13].map((x) => ({ x, y: 7, tone: "yellow" as Tone })),
  { x: 6, y: 13, tone: "blue" },
  ...[9, 10, 11, 12, 13].map((y) => ({ x: 7, y, tone: "blue" as Tone })),
]

/** Every track cell: the four 3-wide arms of the cross. */
const TRACK: [number, number][] = []
for (let a = 0; a < 6; a++) {
  for (let b = 6; b < 9; b++) {
    TRACK.push([b, a], [b, a + 9], [a, b], [a + 9, b])
  }
}

const YARDS: { x: number; y: number; tone: Tone }[] = [
  { x: 0, y: 0, tone: "red" },
  { x: 9, y: 0, tone: "green" },
  { x: 9, y: 9, tone: "yellow" },
  { x: 0, y: 9, tone: "blue" },
]

/** A full Ludo board laid flat and tipped back in perspective at the bottom of the screen. */
function Board({ id }: { id: string }) {
  return (
    <div className="spl-ludo-board absolute left-1/2 -z-10" aria-hidden>
      <svg viewBox="-6 -6 162 162" className="block size-full">
        <defs>
          <radialGradient id={`${id}-yard`} cx="0.5" cy="0.4" r="0.7">
            <stop offset="0" stopColor="#fff" />
            <stop offset="1" stopColor="#ece8f8" />
          </radialGradient>
        </defs>
        <rect x="-6" y="-6" width="162" height="162" rx="10" fill={INK} />
        <rect x="-2" y="-2" width="154" height="154" rx="6" fill="#4c1d95" />
        <rect width="150" height="150" fill="#f8f6ff" />
        {TRACK.map(([x, y]) => (
          <rect
            key={`${x}-${y}`}
            x={x * CELL}
            y={y * CELL}
            width={CELL}
            height={CELL}
            fill="#fff"
            stroke="#c9c1e6"
            strokeWidth="0.8"
          />
        ))}
        {TRACK_COLOURS.map((c) => (
          <rect
            key={`${c.x}-${c.y}`}
            x={c.x * CELL}
            y={c.y * CELL}
            width={CELL}
            height={CELL}
            fill={TONES[c.tone][1]}
            stroke="#c9c1e6"
            strokeWidth="0.8"
          />
        ))}
        {YARDS.map((y) => {
          const ox = y.x * CELL
          const oy = y.y * CELL
          return (
            <g key={y.tone}>
              <rect x={ox} y={oy} width="60" height="60" fill={TONES[y.tone][1]} />
              <rect x={ox + 9} y={oy + 9} width="42" height="42" rx="6" fill={`url(#${id}-yard)`} />
              {[
                [20, 20],
                [40, 20],
                [20, 40],
                [40, 40],
              ].map(([cx, cy]) => (
                <circle key={`${cx}-${cy}`} cx={ox + cx} cy={oy + cy} r="6.5" fill={TONES[y.tone][1]} stroke={TONES[y.tone][2]} strokeWidth="1.6" />
              ))}
            </g>
          )
        })}
        <path d="M60 60 L75 75 L60 90 Z" fill={TONES.red[1]} />
        <path d="M60 60 L90 60 L75 75 Z" fill={TONES.green[1]} />
        <path d="M90 60 L90 90 L75 75 Z" fill={TONES.yellow[1]} />
        <path d="M60 90 L75 75 L90 90 Z" fill={TONES.blue[1]} />
      </svg>
    </div>
  )
}

/* ---------------------------------------------------------------- bar */

/** A glossy pill whose fill reveals the four colours as it grows. */
function Bar({ progress }: { progress: number }) {
  const pct = Math.max(0, Math.min(1, progress)) * 100
  return (
    <div className="spl-ludo-bar">
      <div className="spl-ludo-fill" style={{ width: `${pct}%` }}>
        <div className="spl-ludo-fill-in" />
      </div>
    </div>
  )
}

const CSS = `
.spl-ludo-rays{transform:translate(-50%,-50%);animation:spl-ludo-spin 70s linear infinite}
@keyframes spl-ludo-spin{from{transform:translate(-50%,-50%) rotate(0)}to{transform:translate(-50%,-50%) rotate(360deg)}}
.spl-ludo-title{filter:drop-shadow(0 10px 14px rgba(20,6,60,.45))}
.spl-ludo-bob{animation:spl-ludo-bob 2.2s ease-in-out infinite}
@keyframes spl-ludo-bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
.spl-ludo-twinkle{animation:spl-ludo-twinkle 2.4s ease-in-out infinite}
@keyframes spl-ludo-twinkle{0%,100%{opacity:.25;transform:scale(.7)}50%{opacity:1;transform:scale(1)}}
.spl-ludo-tumble{animation:spl-ludo-tumble 2.6s ease-in-out infinite;transform-origin:50% 80%}
.spl-ludo-tumble-b{animation-delay:-1.3s}
@keyframes spl-ludo-tumble{0%,100%{translate:0 0;rotate:-4deg}50%{translate:0 -9%;rotate:5deg}}
.spl-ludo-drift{animation:spl-ludo-drift 5s ease-in-out infinite}.spl-ludo-drift-b{animation-delay:-2.5s}
@keyframes spl-ludo-drift{0%,100%{translate:0 0}50%{translate:0 -12%}}
.spl-ludo-pawns{filter:drop-shadow(0 6px 8px rgba(20,6,60,.35))}
.spl-ludo-hop{animation:spl-ludo-hop 2.8s cubic-bezier(.3,0,.3,1) infinite}
.spl-ludo-hop-2{animation-delay:.35s}.spl-ludo-hop-3{animation-delay:.7s}.spl-ludo-hop-4{animation-delay:1.05s}
@keyframes spl-ludo-hop{0%,24%,100%{translate:0 0}12%{translate:0 -16%}}
.spl-ludo-board{top:70%;width:min(66vw,40vh,440px);aspect-ratio:1;transform:translate(-50%,-50%) perspective(1100px) rotateX(58deg) rotateZ(45deg);box-shadow:0 0 0 min(1.2vw,.8vh) #2e1065,0 0 0 min(2.4vw,1.6vh) ${INK},min(3vw,2vh) min(3vw,2vh) 0 min(2.4vw,1.6vh) #12082f,0 0 min(14vw,9vh) rgba(196,181,253,.35);border-radius:3%}
.spl-ludo-bar{position:relative;width:min(72vw,52vh,360px);height:clamp(20px,3.3vh,28px);border-radius:9999px;padding:3px;background:linear-gradient(#0f0830,#2a1a66);border:3px solid #fff;box-shadow:0 4px 0 ${INK},0 10px 20px rgba(10,4,40,.45),inset 0 3px 6px rgba(0,0,0,.6)}
.spl-ludo-fill{position:relative;height:100%;min-width:calc(clamp(20px,3.3vh,28px) - 12px);border-radius:9999px;overflow:hidden;transition:width .3s ease-out;box-shadow:inset 0 -2px 0 rgba(0,0,0,.25)}
.spl-ludo-fill-in{position:absolute;inset:0 auto 0 0;width:calc(min(72vw,52vh,360px) - 12px);background:linear-gradient(to bottom,rgba(255,255,255,.6) 0 32%,rgba(255,255,255,0) 34%),linear-gradient(45deg,rgba(255,255,255,.2) 25%,transparent 25% 50%,rgba(255,255,255,.2) 50% 75%,transparent 75%),linear-gradient(to right,#f43f3f 0 25%,#22c55e 25% 50%,#facc15 50% 75%,#3b82f6 75%);background-size:100% 100%,22px 22px,100% 100%;animation:spl-ludo-stripes .7s linear infinite}
@keyframes spl-ludo-stripes{from{background-position:0 0,0 0,0 0}to{background-position:0 0,22px 0,0 0}}
.spl-ludo-loading{font-family:${FONT};font-weight:900;font-size:clamp(12px,1.9vh,16px);letter-spacing:.22em;text-transform:uppercase;color:#fff;text-shadow:0 2px 0 ${INK},0 0 10px rgba(20,6,60,.6)}
@media (prefers-reduced-motion:reduce){.spl-ludo-rays,.spl-ludo-bob,.spl-ludo-twinkle,.spl-ludo-tumble,.spl-ludo-drift,.spl-ludo-hop,.spl-ludo-fill-in{animation:none}}
`
