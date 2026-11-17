import type * as React from "react"

import type { SplashArtProps } from "../types"

/**
 * Snakes & Ladders 3D: a sunlit jungle tower of grass-topped stone pillars
 * (the front one holds the gate, open on a 1), a waterfall spilling down the
 * tallest, explorers, a bamboo ladder and a fat orange snake. The chunky
 * title sits in the light rays up top with a second snake peeking round it;
 * the loading bar sits in the foliage at the bottom.
 */
export default function Splash({ progress }: SplashArtProps) {
  return (
    <div className="spl-snakes3d relative size-full overflow-hidden">
      <style>{CSS}</style>
      {/* Sky, sun and rays */}
      <div className="absolute inset-0 bg-[linear-gradient(180deg,#bff7ec_0%,#5fdccb_32%,#1fb5a4_58%,#0b7f73_100%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_45%_at_50%_22%,rgba(255,252,220,0.9),rgba(255,252,220,0)_70%)]" />
      <div className="spl-snakes3d-rays absolute top-[24%] left-1/2 size-[220vmax]" />
      <Clouds />
      <FarJungle />
      <Tower />
      <Vines />
      <Undergrowth />
      <CornerLeaves side="left" />
      <CornerLeaves side="right" />
      {/* Title */}
      <div className="absolute inset-x-0 top-[max(5%,env(safe-area-inset-top))] flex justify-center">
        <Title />
      </div>
      <LoadingBar progress={progress} />
    </div>
  )
}

const FONT = "var(--font-inter), system-ui, sans-serif"
const INK = "#0f2e1c"

/* ───────────────────────────── Title ───────────────────────────── */

/**
 * One chunky word: a soft drop shadow, a dark outline extruded downwards,
 * a darker "side" in the word's hue, the gradient face, and a gloss on the
 * top half of the letters. `top` and `bottom` bound the face gradient.
 */
function Word({
  id,
  text,
  x,
  y,
  size,
  colors,
  side,
  rotate,
}: {
  id: string
  text: string
  x: number
  y: number
  size: number
  colors: [string, string, string]
  side: string
  rotate?: string
}) {
  const t = { x, y, fontSize: size, textAnchor: "middle" as const, rotate, style: { fontFamily: FONT, fontWeight: 900 } }
  const o = size * 0.3
  const d = size * 0.09
  const cap = size * 0.73
  return (
    <g strokeLinejoin="round" strokeLinecap="round">
      <defs>
        <linearGradient id={`${id}-face`} gradientUnits="userSpaceOnUse" x1="0" y1={y - cap} x2="0" y2={y}>
          <stop offset="0" stopColor={colors[0]} />
          <stop offset="0.5" stopColor={colors[1]} />
          <stop offset="1" stopColor={colors[2]} />
        </linearGradient>
        <linearGradient id={`${id}-gloss`} gradientUnits="userSpaceOnUse" x1="0" y1={y - cap - 2} x2="0" y2={y}>
          <stop offset="0" stopColor="#fff" stopOpacity="0.85" />
          <stop offset="0.42" stopColor="#fff" stopOpacity="0.25" />
          <stop offset="0.46" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <text {...t} transform={`translate(0 ${d + size * 0.07})`} fill="#03251a" fillOpacity="0.35" stroke="#03251a" strokeOpacity="0.35" strokeWidth={o}>
        {text}
      </text>
      <text {...t} transform={`translate(0 ${d})`} fill={INK} stroke={INK} strokeWidth={o}>
        {text}
      </text>
      <text {...t} fill={INK} stroke={INK} strokeWidth={o}>
        {text}
      </text>
      <text {...t} transform={`translate(0 ${d * 0.7})`} fill={side} stroke={side} strokeWidth={o * 0.32}>
        {text}
      </text>
      <text {...t} fill={`url(#${id}-face)`} stroke={`url(#${id}-face)`} strokeWidth={o * 0.18}>
        {text}
      </text>
      <text {...t} fill={`url(#${id}-gloss)`}>
        {text}
      </text>
    </g>
  )
}

/** A cute orange snake head looking left, centred on (0, 0). */
function SnakeHead({ tongue = true }: { tongue?: boolean }) {
  return (
    <g>
      {tongue && (
        <path d="M-17 7h-9l-4-4M-26 7l-4 4" fill="none" stroke="#e11d48" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      )}
      <path d="M-18 4c0-10 8-16 18-16s19 6 19 15-9 13-19 13S-18 13-18 4z" fill="url(#spl-s3d-snake)" stroke={INK} strokeWidth="3" />
      <path d="M-10-6c4-4 12-5 18-2" fill="none" stroke="#fff" strokeOpacity="0.6" strokeWidth="3" strokeLinecap="round" />
      <circle cx="-5" cy="-4" r="6.2" fill="#fff" stroke={INK} strokeWidth="2.2" />
      <circle cx="8" cy="-5" r="6.2" fill="#fff" stroke={INK} strokeWidth="2.2" />
      <circle cx="-6.5" cy="-3" r="3.2" fill="#14121c" />
      <circle cx="6.5" cy="-4" r="3.2" fill="#14121c" />
      <circle cx="-5.5" cy="-4.5" r="1.1" fill="#fff" />
      <circle cx="7.5" cy="-5.5" r="1.1" fill="#fff" />
      <ellipse cx="-12" cy="6" rx="3" ry="1.8" fill="#fb7185" opacity="0.7" />
      <path d="M-15 9c3 2.4 7 2.6 10 1" fill="none" stroke={INK} strokeWidth="2" strokeLinecap="round" />
    </g>
  )
}

/** A snake body: outline, orange fill, darker bands, a shine down its back. */
function SnakeBody({ d, width }: { d: string; width: number }) {
  return (
    <g fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} stroke={INK} strokeWidth={width + 6} />
      <path d={d} stroke="url(#spl-s3d-snake)" strokeWidth={width} />
      <path d={d} stroke="#c2410c" strokeWidth={width} strokeDasharray={`${width * 0.35} ${width * 0.9}`} strokeOpacity="0.55" />
      <path d={d} stroke="#fff" strokeOpacity="0.35" strokeWidth={width * 0.22} transform={`translate(0 ${-width * 0.22})`} />
    </g>
  )
}

function Title() {
  return (
    <svg
      viewBox="0 0 400 268"
      className="spl-snakes3d-title w-[min(90vw,460px,52vh)] overflow-visible drop-shadow-[0_10px_18px_rgba(3,40,30,0.35)]"
      role="img"
      aria-label="Snakes & Ladders 3D"
    >
      <defs>
        <linearGradient id="spl-s3d-snake" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffc46b" />
          <stop offset="0.6" stopColor="#ff8a1f" />
          <stop offset="1" stopColor="#ea580c" />
        </linearGradient>
        <linearGradient id="spl-s3d-coin" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff6b0" />
          <stop offset="0.55" stopColor="#ffcf3d" />
          <stop offset="1" stopColor="#e89a0c" />
        </linearGradient>
        <linearGradient id="spl-s3d-ribbon" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ff7a59" />
          <stop offset="1" stopColor="#d9261c" />
        </linearGradient>
      </defs>
      {/* The peeking snake's body, behind the words */}
      <SnakeBody d="M374 34c20 8 26 40 16 66-8 22-22 30-20 56 2 18 18 22 28 14" width={17} />
      <Word id="spl-s3d-w1" text="SNAKES" x={196} y={96} size={84} colors={["#fff6a6", "#ffc22e", "#ff7a14"]} side="#b4410a" rotate="-4 2 -2 3 -2 3" />
      <Word id="spl-s3d-w2" text="LADDERS" x={200} y={196} size={70} colors={["#f3ffa8", "#a6e635", "#3fa51b"]} side="#22660f" rotate="3 -2 2 -3 2 -2 3" />
      {/* "&" on a gold coin between the words */}
      <g transform="translate(200 120)">
        <circle r="22" cy="4" fill={INK} />
        <circle r="22" fill={INK} />
        <circle r="17.5" fill="url(#spl-s3d-coin)" />
        <path d="M-12-6a14 14 0 0 1 24 0" fill="none" stroke="#fff" strokeOpacity="0.7" strokeWidth="3" strokeLinecap="round" />
        <text y="9.5" textAnchor="middle" fontSize="27" fill="#7a3d06" style={{ fontFamily: FONT, fontWeight: 900 }}>
          &amp;
        </text>
      </g>
      {/* The snake's head peeking over the end of SNAKES */}
      <g className="spl-snakes3d-peek" transform="translate(366 22) rotate(-10) scale(0.92)">
        <SnakeHead />
      </g>
      {/* The "3D" ribbon */}
      <g transform="translate(200 236)">
        <path d="M-74-8h34l-4 16 4 16h-34l10-16z" fill="#9f1c14" stroke={INK} strokeWidth="4" strokeLinejoin="round" />
        <path d="M74-8h-34l4 16-4 16h34l-10-16z" fill="#9f1c14" stroke={INK} strokeWidth="4" strokeLinejoin="round" />
        <path d="M-50-18q50-10 100 0v30q-50-10-100 0z" fill="url(#spl-s3d-ribbon)" stroke={INK} strokeWidth="4.5" strokeLinejoin="round" />
        <path d="M-44-12q44-8 88 0" fill="none" stroke="#fff" strokeOpacity="0.45" strokeWidth="3" strokeLinecap="round" />
        <text y="8" textAnchor="middle" fontSize="27" fill="#fff" stroke={INK} strokeWidth="6" strokeLinejoin="round" paintOrder="stroke" style={{ fontFamily: FONT, fontWeight: 900, letterSpacing: 1 }}>
          3D
        </text>
      </g>
    </svg>
  )
}

/* ───────────────────────────── Scenery ───────────────────────────── */

/** Puffy clouds drifting either side of the title. */
function Clouds() {
  const cloud = (x: number, y: number, s: number, key: string) => (
    <g key={key} transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M-40 10a16 16 0 0 1 14-22 22 22 0 0 1 40-6 18 18 0 0 1 30 14 12 12 0 0 1-2 14z" fill="#fff" opacity="0.85" />
      <path d="M-40 10h82" stroke="#bdeee6" strokeWidth="4" strokeLinecap="round" />
    </g>
  )
  return (
    <svg viewBox="0 0 1200 400" preserveAspectRatio="xMidYMin slice" className="absolute inset-x-0 top-0 h-[34%] w-full overflow-visible" aria-hidden>
      <g className="spl-snakes3d-drift">
        {cloud(320, 110, 1.3, "a")}
        {cloud(880, 70, 1.1, "b")}
        {cloud(470, 270, 0.8, "c")}
        {cloud(760, 300, 0.9, "d")}
        {cloud(120, 250, 1, "e")}
        {cloud(1100, 220, 1.2, "f")}
      </g>
    </svg>
  )
}

/** Misty far-off pillars and the jungle canopy, full width. */
function FarJungle() {
  const far: [number, number, number][] = [
    [80, 250, 40], [190, 330, 34], [300, 210, 38], [870, 230, 42], [990, 300, 34], [1110, 200, 44], [420, 360, 30], [760, 350, 30],
  ]
  return (
    <svg viewBox="0 0 1200 600" preserveAspectRatio="xMidYMax slice" className="absolute inset-x-0 bottom-0 h-[70%] w-full" aria-hidden>
      {far.map(([cx, cy, w]) => (
        <g key={cx} opacity="0.55">
          <path d={`M${cx - w} ${cy}L${cx} ${cy + w / 2}V600H${cx - w}z`} fill="#7cc7bb" />
          <path d={`M${cx + w} ${cy}L${cx} ${cy + w / 2}V600H${cx + w}z`} fill="#5aa99d" />
          <path d={`M${cx - w} ${cy}L${cx} ${cy - w / 2}L${cx + w} ${cy}L${cx} ${cy + w / 2}z`} fill="#a7e6a0" />
        </g>
      ))}
      <rect y="300" width="1200" height="300" fill="url(#spl-s3d-haze)" />
      <defs>
        <linearGradient id="spl-s3d-haze" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#c9f6ee" stopOpacity="0" />
          <stop offset="1" stopColor="#c9f6ee" stopOpacity="0.55" />
        </linearGradient>
      </defs>
      {/* Canopy: two rows of tree crowns */}
      <path
        d="M0 470c30-40 70-46 100-20 20-40 80-50 110-10 30-30 80-24 100 10 30-36 90-36 120 0 24-30 70-30 96 4 34-40 96-40 124 0 30-34 84-30 104 6 30-40 90-44 120-6 24-26 70-26 90 6 30-30 80-30 106 4 20-20 60-24 90-4c24-20 60-20 80 6V600H0z"
        fill="#2aa58f"
      />
      <path
        d="M0 520c40-34 90-30 116 0 30-30 90-30 112 6 40-34 100-30 124 4 30-26 84-26 108 6 36-30 96-28 120 4 30-30 90-30 116 0 34-28 90-26 112 6 30-24 80-26 104 2 30-30 84-30 112 0 22-20 60-22 76-4c30-26 80-26 100 6c10-8 20-10 30-8V600H0z"
        fill="#178a72"
      />
    </svg>
  )
}

/** An isometric stone pillar topped with grass: top diamond at (cx, cy), half-width w, sides h deep. */
function Pillar({ cx, cy, w, h, children }: { cx: number; cy: number; w: number; h: number; children?: React.ReactNode }) {
  const q = w / 2
  const course = 26
  const rows = Math.ceil(h / course)
  // The grass fringe: little drips hanging over both front edges
  let fringe = `M${cx - w} ${cy}`
  const n = Math.max(4, Math.round(w / 9))
  for (let i = 1; i <= n; i++) {
    const t = i / n
    const drip = i % 2 ? 9 : 6
    fringe += `Q${cx - w + w * (t - 0.5 / n)} ${cy + q * (t - 0.5 / n) + drip * 1.6} ${cx - w + w * t} ${cy + q * t + 3}`
  }
  for (let i = 1; i <= n; i++) {
    const t = i / n
    const drip = i % 2 ? 6 : 9
    fringe += `Q${cx + w * (t - 0.5 / n)} ${cy + q - q * (t - 0.5 / n) + drip * 1.6} ${cx + w * t} ${cy + q - q * t + 3}`
  }
  fringe += `L${cx + w} ${cy}L${cx} ${cy + q}z`
  return (
    <g>
      <path d={`M${cx - w} ${cy}L${cx} ${cy + q}V${cy + q + h}L${cx - w} ${cy + h}z`} fill="url(#spl-s3d-stoneL)" />
      <path d={`M${cx + w} ${cy}L${cx} ${cy + q}V${cy + q + h}L${cx + w} ${cy + h}z`} fill="url(#spl-s3d-stoneR)" />
      {/* Stone courses and staggered joints */}
      <g stroke="#23383a" strokeOpacity="0.32" strokeWidth="1.6" fill="none">
        {Array.from({ length: rows }, (_, k) => {
          const y = cy + (k + 1) * course
          const joints = (k % 2 ? [0.3, 0.72] : [0.12, 0.52, 0.9]).map((t) => {
            const lx = cx - w + w * t
            const rx = cx + w * t
            return `M${lx} ${y - course + q * t}v${course}M${rx} ${y - course + q - q * t}v${course}`
          })
          return <path key={k} d={`M${cx - w} ${y}L${cx} ${y + q}L${cx + w} ${y}${joints.join("")}`} />
        })}
      </g>
      <path d={`M${cx} ${cy + q}V${cy + q + h}`} stroke="#e9fbf6" strokeOpacity="0.45" strokeWidth="2" />
      <path d={`M${cx - w} ${cy}V${cy + h}`} stroke="#fff" strokeOpacity="0.25" strokeWidth="2" />
      {/* Moss down the faces */}
      <path
        d={`M${cx - w} ${cy + 8}c4 14 12 10 14 26s10 6 12-6 8-4 10 8 ${w * 0.3} -${q * 0.4} ${w - 36} -${q * 0.2}V${cy + q}z`}
        fill="#3f9e3a"
        opacity="0.55"
      />
      <path d={fringe} fill="#2f9a37" stroke={INK} strokeOpacity="0.35" strokeWidth="1.5" />
      <path d={`M${cx - w} ${cy}L${cx} ${cy - q}L${cx + w} ${cy}L${cx} ${cy + q}z`} fill="url(#spl-s3d-grass)" />
      <path d={`M${cx - w + 8} ${cy - 1}L${cx - 2} ${cy - q + 4}`} stroke="#fff" strokeOpacity="0.55" strokeWidth="2.5" strokeLinecap="round" />
      {/* Grass tufts */}
      <g stroke="#3a9b2c" strokeWidth="1.8" strokeLinecap="round" fill="none">
        <path d={`M${cx - w * 0.4} ${cy + 2}l-2-6M${cx - w * 0.4} ${cy + 2}l2-7M${cx - w * 0.4} ${cy + 2}l5-5`} />
        <path d={`M${cx + w * 0.35} ${cy - 4}l-2-6M${cx + w * 0.35} ${cy - 4}l2-7M${cx + w * 0.35} ${cy - 4}l5-5`} />
        <path d={`M${cx + w * 0.1} ${cy + q * 0.6}l-3-5M${cx + w * 0.1} ${cy + q * 0.6}l1-7M${cx + w * 0.1} ${cy + q * 0.6}l4-4`} />
      </g>
      {children}
    </g>
  )
}

/** A little explorer: round body, big head, pith helmet, button eyes, rosy cheeks. Feet at (0, 0). */
function Explorer({ x, y, color, wave, flip }: { x: number; y: number; color: string; wave?: boolean; flip?: boolean }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${flip ? -1 : 1} 1)`}>
      <ellipse cy="1" rx="12" ry="4" fill="#0b3b20" opacity="0.35" />
      <g className={wave ? "spl-snakes3d-hop" : undefined}>
        {wave && (
          <g className="spl-snakes3d-wave">
            <path d="M7-13l9-12" stroke={INK} strokeWidth="7.5" strokeLinecap="round" />
            <path d="M7-13l9-12" stroke={color} strokeWidth="4.5" strokeLinecap="round" />
            <circle cx="16.5" cy="-25.5" r="3.2" fill="#ffd6ad" stroke={INK} strokeWidth="1.8" />
          </g>
        )}
        <path d="M-9 0c-1.5-11 2-18 9-18s10.5 7 9 18z" fill={color} stroke={INK} strokeWidth="2.4" strokeLinejoin="round" />
        <path d="M-5-14c2-2 4-2.4 6-2.2" stroke="#fff" strokeOpacity="0.55" strokeWidth="2" strokeLinecap="round" fill="none" />
        <circle cy="-27" r="11" fill="#ffd6ad" stroke={INK} strokeWidth="2.4" />
        <circle cx="-5.5" cy="-23" r="2.2" fill="#ff9a9a" />
        <circle cx="5.5" cy="-23" r="2.2" fill="#ff9a9a" />
        <circle cx="-3.6" cy="-26" r="1.9" fill="#1d1b22" />
        <circle cx="3.6" cy="-26" r="1.9" fill="#1d1b22" />
        <circle cx="-3" cy="-26.7" r="0.6" fill="#fff" />
        <circle cx="4.2" cy="-26.7" r="0.6" fill="#fff" />
        <path d="M-2-21.5q2 1.8 4 0" stroke="#1d1b22" strokeWidth="1.3" strokeLinecap="round" fill="none" />
        <ellipse cy="-31" rx="14.5" ry="3.6" fill="#c9963c" stroke={INK} strokeWidth="2" />
        <path d="M-10-31.5a10 9.5 0 0 1 20 0z" fill="#efcb72" stroke={INK} strokeWidth="2" strokeLinejoin="round" />
        <path d="M-9.6-33.5h19.2" stroke="#8a5a1c" strokeWidth="2.2" />
        <path d="M-5-38c2-2 5-2.5 7-2" stroke="#fff" strokeOpacity="0.6" strokeWidth="1.8" strokeLinecap="round" fill="none" />
      </g>
    </g>
  )
}

/** A bamboo ladder from (x1, y1) at the foot to (x2, y2) at the top. */
function Ladder({ x1, y1, x2, y2, gap }: { x1: number; y1: number; x2: number; y2: number; gap: number }) {
  const len = Math.hypot(x2 - x1, y2 - y1)
  const ang = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI + 90
  const rungs = Math.floor(len / 17)
  return (
    <g transform={`translate(${x1} ${y1}) rotate(${ang})`} strokeLinecap="round">
      {Array.from({ length: rungs }, (_, i) => {
        const y = -(i + 0.7) * (len / (rungs + 0.4))
        return (
          <g key={i}>
            <path d={`M${-gap / 2} ${y}H${gap / 2}`} stroke={INK} strokeWidth="7" />
            <path d={`M${-gap / 2} ${y}H${gap / 2}`} stroke="#f5c84b" strokeWidth="3.6" />
          </g>
        )
      })}
      {[-gap / 2, gap / 2].map((x) => (
        <g key={x}>
          <path d={`M${x} 0V${-len}`} stroke={INK} strokeWidth="9" />
          <path d={`M${x} 0V${-len}`} stroke="#c58a1e" strokeWidth="5.4" />
          <path d={`M${x - 1} 0V${-len}`} stroke="#f7d774" strokeWidth="1.6" strokeOpacity="0.8" />
          {/* Bamboo nodes */}
          {Array.from({ length: Math.floor(len / 22) }, (_, i) => (
            <path key={i} d={`M${x - 3.6} ${-(i + 0.5) * 22}h7.2`} stroke="#7a4a0c" strokeWidth="1.8" />
          ))}
        </g>
      ))}
    </g>
  )
}

/** The tower: pillars back to front, with the waterfall, ladder, snake, explorers and the gate. */
function Tower() {
  return (
    <svg
      viewBox="0 0 360 520"
      preserveAspectRatio="xMidYMax meet"
      className="absolute inset-x-0 bottom-0 h-[68%] w-full overflow-visible"
      aria-hidden
    >
      <defs>
        <linearGradient id="spl-s3d-stoneL" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#c6d6d3" />
          <stop offset="0.55" stopColor="#93aaa8" />
          <stop offset="1" stopColor="#5d7a78" />
        </linearGradient>
        <linearGradient id="spl-s3d-stoneR" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#7f9a9a" />
          <stop offset="0.55" stopColor="#5b7676" />
          <stop offset="1" stopColor="#38514f" />
        </linearGradient>
        <linearGradient id="spl-s3d-grass" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#e6ffa0" />
          <stop offset="0.5" stopColor="#9be35a" />
          <stop offset="1" stopColor="#4cc04a" />
        </linearGradient>
        <linearGradient id="spl-s3d-water" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f0feff" />
          <stop offset="0.3" stopColor="#8ee6f7" />
          <stop offset="1" stopColor="#3cc2ea" />
        </linearGradient>
        <radialGradient id="spl-s3d-glow" cx="0.5" cy="0.6" r="0.6">
          <stop offset="0" stopColor="#fffbd1" />
          <stop offset="0.5" stopColor="#ffd84a" />
          <stop offset="1" stopColor="#f59e0b" />
        </radialGradient>
        <linearGradient id="spl-s3d-door" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#b8742a" />
          <stop offset="1" stopColor="#7c4513" />
        </linearGradient>
        <linearGradient id="spl-s3d-mist" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#dcfbf4" stopOpacity="0" />
          <stop offset="0.6" stopColor="#dcfbf4" stopOpacity="0.5" />
          <stop offset="1" stopColor="#dcfbf4" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Back: the tall pillar with the waterfall down its lit face */}
      <Pillar cx={226} cy={64} w={54} h={460}>
        <ellipse cx="208" cy="62" rx="15" ry="6.5" fill="#5fd3ef" stroke="#e8fdff" strokeWidth="2" />
        <path d="M196 64l-10 12 20 10 8-14z" fill="#5fd3ef" />
        <g transform="matrix(1 0.5 0 1 172 64)">
          <path d="M10 2c4 2 14 2 20 0V420H10z" fill="url(#spl-s3d-water)" opacity="0.95" />
          <g stroke="#fff" strokeLinecap="round" strokeOpacity="0.85" className="spl-snakes3d-fall">
            <path d="M14 6V420" strokeWidth="2.4" strokeDasharray="26 18" />
            <path d="M20 0V420" strokeWidth="1.6" strokeDasharray="14 30" strokeDashoffset="9" />
            <path d="M26 4V420" strokeWidth="2.2" strokeDasharray="20 24" strokeDashoffset="20" />
          </g>
          <ellipse cx="20" cy="3" rx="13" ry="4.5" fill="#fff" opacity="0.9" />
        </g>
      </Pillar>

      {/* Left: explorer waving from the top */}
      <Pillar cx={92} cy={156} w={52} h={370}>
        <Explorer x={84} y={154} color="#ef4444" wave />
      </Pillar>

      {/* Mist between the back and front rows */}
      <rect x="-1200" y="170" width="2760" height="90" fill="url(#spl-s3d-mist)" className="spl-snakes3d-mist" />

      {/* Right: the orange snake coiled on top, tail draped down the side */}
      <Pillar cx={304} cy={206} w={46} h={320}>
        <SnakeBody d="M318 214c14 6 20 20 16 36-4 14 6 24 14 30" width={12} />
        <ellipse cx="300" cy="212" rx="25" ry="10" fill={INK} opacity="0.3" />
        <SnakeBody d="M282 206c-2-12 36-12 38 0s-34 10-34-2c0-9 26-10 28-1" width={12} />
        <SnakeBody d="M314 202c6-12 0-26-12-30" width={12} />
        <g transform="translate(296 168) scale(0.72)" className="spl-snakes3d-sway">
          <SnakeHead />
        </g>
      </Pillar>

      {/* Spray where the waterfall drops behind the front pillar */}
      <g fill="#fff" opacity="0.9" className="spl-snakes3d-spray">
        <circle cx="184" cy="232" r="9" />
        <circle cx="196" cy="226" r="11" />
        <circle cx="209" cy="234" r="8" />
        <circle cx="176" cy="226" r="5" />
      </g>

      {/* Front: the gate pillar */}
      <Pillar cx={168} cy={262} w={66} h={270}>
        <g transform="matrix(1 0.5 0 1 102 262)">
          {/* Stone arch, the warm light of the tower inside, doors swung open */}
          <path d="M10 98V44a23 23 0 0 1 46 0v54z" fill="#e5ddc8" stroke={INK} strokeWidth="2.4" />
          <path d="M17 98V46a16 16 0 0 1 32 0v52z" fill="url(#spl-s3d-glow)" />
          <path d="M22 98h22M24 88h18M27 78h12" stroke="#c77d0e" strokeWidth="2" strokeOpacity="0.6" />
          <path d="M17 46a16 16 0 0 1 9-14.4V98h-9z" fill="url(#spl-s3d-door)" stroke={INK} strokeWidth="1.8" />
          <path d="M49 46a16 16 0 0 0-9-14.4V98h9z" fill="url(#spl-s3d-door)" stroke={INK} strokeWidth="1.8" />
          {/* The keystone: a gold 1 */}
          <circle cx="33" cy="22" r="11" fill="#ffd23f" stroke={INK} strokeWidth="2.4" />
          <text x="33" y="28" textAnchor="middle" fontSize="16" fill="#7a3d06" style={{ fontFamily: FONT, fontWeight: 900 }}>
            1
          </text>
        </g>
        {/* Rays out of the gate */}
        <path d="M136 300l-34 30 40-4zM140 318l-30 44 38-26z" fill="#fff5c4" opacity="0.35" className="spl-snakes3d-glint" />
        <Explorer x={170} y={266} color="#3b82f6" flip />
        <Explorer x={198} y={258} color="#facc15" />
      </Pillar>

      {/* The bamboo ladder from the front pillar up to the left one */}
      <Ladder x1={132} y1={262} x2={118} y2={150} gap={18} />

      {/* Sparkles */}
      <g fill="#fffbd1" className="spl-snakes3d-twinkle">
        <path d="M60 110l3 8 8 3-8 3-3 8-3-8-8-3 8-3z" />
        <path d="M300 120l2 6 6 2-6 2-2 6-2-6-6-2 6-2z" />
        <path d="M150 196l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" />
      </g>
    </svg>
  )
}

/** A leaf from (0, 0) to (0, -len), `w` wide, with a midrib. */
function Leaf({ len, w, fill, rib, transform }: { len: number; w: number; fill: string; rib: string; transform: string }) {
  return (
    <g transform={transform}>
      <path
        d={`M0 0C${w * 0.75} ${-len * 0.2} ${w * 0.65} ${-len * 0.78} 0 ${-len}C${-w * 0.65} ${-len * 0.78} ${-w * 0.75} ${-len * 0.2} 0 0z`}
        fill={fill}
        stroke={INK}
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <path d={`M0 -4Q${w * 0.08} ${-len * 0.5} 0 ${-len * 0.92}`} stroke={rib} strokeWidth="2.2" fill="none" strokeLinecap="round" />
      {[0.3, 0.5, 0.7].map((t) => (
        <path
          key={t}
          d={`M0 ${-len * t}l${w * 0.3} ${-len * 0.1}M0 ${-len * t}l${-w * 0.3} ${-len * 0.1}`}
          stroke={rib}
          strokeWidth="1.4"
          strokeOpacity="0.7"
          strokeLinecap="round"
        />
      ))}
    </g>
  )
}

/** A fan of big jungle leaves in a bottom corner, swaying. */
function CornerLeaves({ side }: { side: "left" | "right" }) {
  const leaves: [number, number, number, string][] = [
    [-46, 200, 66, "#38b052"],
    [-14, 240, 80, "#1f8a43"],
    [16, 210, 72, "#2fa84f"],
    [44, 150, 58, "#43c05a"],
    [70, 100, 44, "#1f8a43"],
  ]
  return (
    <svg
      viewBox="0 0 220 260"
      className={`absolute bottom-0 h-[27%] max-h-[260px] overflow-visible ${side === "left" ? "-left-6" : "-right-6 -scale-x-100"}`}
      aria-hidden
    >
      <g className="spl-snakes3d-leaves">
        {leaves.map(([rot, len, w, fill], i) => (
          <Leaf key={i} len={len} w={w} fill={fill} rib="#b7f27a" transform={`translate(${20 + i * 8} 270) rotate(${rot})`} />
        ))}
      </g>
    </svg>
  )
}

/** Vines hanging from the top corners. */
function Vines() {
  const vine = (path: string, leaves: [number, number, number][]) => (
    <>
      <path d={path} fill="none" stroke={INK} strokeWidth="6" strokeLinecap="round" />
      <path d={path} fill="none" stroke="#3c9a3a" strokeWidth="3" strokeLinecap="round" />
      {leaves.map(([x, y, r]) => (
        <Leaf key={`${x}-${y}`} len={26} w={18} fill="#4cbf55" rib="#c9f59a" transform={`translate(${x} ${y}) rotate(${r})`} />
      ))}
    </>
  )
  return (
    <>
      <svg viewBox="0 0 120 260" className="spl-snakes3d-vine absolute -top-2 left-0 h-[30%] max-h-[300px] overflow-visible" aria-hidden>
        {vine("M10-10c10 50-8 90 6 140s-4 70 4 110", [[14, 40, -120], [6, 90, 110], [16, 150, -110], [10, 210, 120]])}
        {vine("M42-10c6 30-6 60 4 90", [[44, 30, -110], [46, 72, 120]])}
      </svg>
      <svg viewBox="0 0 120 260" className="spl-snakes3d-vine absolute -top-2 right-0 h-[26%] max-h-[260px] -scale-x-100 overflow-visible" aria-hidden>
        {vine("M12-10c10 40-6 80 6 120s-2 50 2 80", [[14, 34, -120], [8, 84, 110], [16, 140, -110]])}
        {vine("M44-10c6 26-6 50 2 76", [[44, 26, -110], [46, 64, 120]])}
      </svg>
    </>
  )
}

/** Dark bushes along the bottom, behind the loading bar. */
function Undergrowth() {
  return (
    <svg viewBox="0 0 1200 160" preserveAspectRatio="xMidYMax slice" className="absolute inset-x-0 bottom-0 h-[16%] w-full" aria-hidden>
      <path
        d="M0 60c30-30 80-34 110-6 26-30 86-34 112 0 30-24 80-24 104 6 30-32 92-34 118 0 28-26 84-26 108 4 30-30 90-30 116 0 28-28 86-28 110 4 30-28 86-30 112 0 26-24 80-26 104 2 28-24 76-24 106 0c30-26 80-26 104 4V160H0z"
        fill="#127256"
      />
      <path
        d="M0 100c40-26 90-24 120 2 34-26 96-26 124 4 34-24 90-22 116 6 30-26 92-26 120 2 36-26 96-26 124 2 30-24 88-24 116 4 32-26 90-26 120 0 30-22 84-22 112 2 30-20 80-22 148-4c30-20 70-16 100 8V160H0z"
        fill="#0b5a43"
      />
    </svg>
  )
}

/* ───────────────────────────── Loading bar ───────────────────────────── */

function LoadingBar({ progress }: { progress: number }) {
  const pct = Math.min(1, Math.max(0, progress)) * 100
  return (
    <div className="absolute inset-x-0 bottom-[max(9%,calc(env(safe-area-inset-bottom)+24px))] flex flex-col items-center gap-2.5">
      <div className="spl-snakes3d-rim h-7 w-[min(74vw,340px)] rounded-full p-[4px]">
        <div className="relative size-full overflow-hidden rounded-full bg-[#082a1f] shadow-[inset_0_3px_6px_rgba(0,0,0,0.6)]">
          <div className="spl-snakes3d-fill relative h-full min-w-5 rounded-full transition-[width] duration-500 ease-out" style={{ width: `${pct}%` }} />
        </div>
      </div>
      <p className="spl-snakes3d-label text-sm font-black tracking-[0.2em] text-white">LOADING…</p>
    </div>
  )
}

const CSS = `
.spl-snakes3d-rays {
  translate: -50% -50%;
  background: repeating-conic-gradient(from 0deg, rgba(255,255,255,0.2) 0deg 7deg, rgba(255,255,255,0) 7deg 15deg);
  -webkit-mask-image: radial-gradient(circle, #000 0, rgba(0,0,0,0.6) 12%, transparent 30%);
  mask-image: radial-gradient(circle, #000 0, rgba(0,0,0,0.6) 12%, transparent 30%);
}
.spl-snakes3d-rim {
  background: linear-gradient(180deg, #fff3b0, #f2b233 50%, #a8650d);
  box-shadow: 0 0 0 3px ${INK}, 0 5px 0 3px rgba(4, 34, 22, 0.55);
}
.spl-snakes3d-fill {
  background:
    linear-gradient(180deg, rgba(255,255,255,0.65) 0, rgba(255,255,255,0.15) 45%, rgba(255,255,255,0) 50%),
    repeating-linear-gradient(-45deg, rgba(255,255,255,0.3) 0 7px, rgba(255,255,255,0) 7px 14px),
    linear-gradient(180deg, #e2ff7a, #7fd92a 55%, #3c9c12);
  background-size: 100% 100%, 19.8px 19.8px, 100% 100%;
  box-shadow: inset 0 -2px 0 rgba(0,0,0,0.2);
}
.spl-snakes3d-label {
  -webkit-text-stroke: 5px ${INK};
  paint-order: stroke fill;
  text-shadow: 0 3px 0 ${INK};
}
@media (prefers-reduced-motion: no-preference) {
  .spl-snakes3d-rays { animation: spl-snakes3d-spin 90s linear infinite; }
  .spl-snakes3d-title { animation: spl-snakes3d-bob 3.2s ease-in-out infinite; }
  .spl-snakes3d-peek > g { animation: spl-snakes3d-peek 2.6s ease-in-out infinite; transform-box: fill-box; transform-origin: 70% 80%; }
  .spl-snakes3d-sway > g { animation: spl-snakes3d-peek 3s ease-in-out infinite reverse; transform-box: fill-box; transform-origin: 70% 80%; }
  .spl-snakes3d-fall { animation: spl-snakes3d-fall 0.9s linear infinite; }
  .spl-snakes3d-spray, .spl-snakes3d-twinkle { animation: spl-snakes3d-pulse 1.6s ease-in-out infinite; }
  .spl-snakes3d-drift { animation: spl-snakes3d-drift 9s ease-in-out infinite alternate; }
  .spl-snakes3d-mist { animation: spl-snakes3d-drift 7s ease-in-out infinite alternate; }
  .spl-snakes3d-leaves { animation: spl-snakes3d-leaves 4s ease-in-out infinite; transform-origin: 20% 100%; }
  .spl-snakes3d-vine { animation: spl-snakes3d-vine 5s ease-in-out infinite; transform-origin: 50% 0; }
  .spl-snakes3d-hop { animation: spl-snakes3d-hop 1.2s ease-in-out infinite; }
  .spl-snakes3d-wave { animation: spl-snakes3d-wave 0.6s ease-in-out infinite alternate; transform-box: fill-box; transform-origin: 0 100%; }
  .spl-snakes3d-fill { animation: spl-snakes3d-stripes 0.7s linear infinite; }
}
@keyframes spl-snakes3d-spin { to { rotate: 360deg; } }
@keyframes spl-snakes3d-bob { 50% { transform: translateY(-6px) scale(1.01); } }
@keyframes spl-snakes3d-peek { 0%, 100% { transform: rotate(-6deg); } 50% { transform: rotate(5deg) translateY(-2px); } }
@keyframes spl-snakes3d-fall { to { stroke-dashoffset: -44; } }
@keyframes spl-snakes3d-pulse { 50% { opacity: 0.45; } }
@keyframes spl-snakes3d-drift { to { transform: translateX(24px); } }
@keyframes spl-snakes3d-leaves { 50% { transform: rotate(2.5deg); } }
@keyframes spl-snakes3d-vine { 50% { transform: rotate(-2deg); } }
@keyframes spl-snakes3d-hop { 50% { transform: translateY(-3px); } }
@keyframes spl-snakes3d-wave { to { transform: rotate(-24deg); } }
@keyframes spl-snakes3d-stripes { to { background-position: 0 0, 19.8px 0, 0 0; } }
`
