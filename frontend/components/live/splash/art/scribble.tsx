import type * as React from "react"

import type { SplashArtProps } from "../types"

/**
 * Scribble's splash: a crayon-box world. A chunky rainbow "SCRIBBLE" with a
 * "DRAW & GUESS" ribbon, a taped sheet with a cat being drawn while the
 * guesses pop up, paint splats in the corners and a row of crayons along the
 * bottom, under a striped rainbow loading bar.
 */
export default function Splash({ progress }: SplashArtProps) {
  const pct = Math.max(0, Math.min(1, progress)) * 100
  return (
    <div className="spl-scribble-root relative size-full overflow-hidden">
      <style>{CSS}</style>
      <div className="spl-scribble-rays" aria-hidden />
      <Doodles />
      <Splat className="absolute -top-[6vmin] -left-[8vmin] w-[46vmin] max-w-80" color="#f472b6" seed={7} />
      <Splat className="absolute -top-[4vmin] -right-[10vmin] w-[40vmin] max-w-72" color="#facc15" seed={21} />
      <Splat className="absolute top-[46%] -left-[12vmin] w-[28vmin] max-w-52" color="#22d3ee" seed={3} />
      <Splat className="absolute top-[40%] -right-[9vmin] w-[24vmin] max-w-44" color="#4ade80" seed={11} />
      <Crayons />

      <div className="relative flex h-full flex-col items-center px-4 pt-[6vh] pb-[calc(clamp(84px,15vh,150px)+3vh)]">
        <div className="spl-scribble-float w-[min(94vw,62vh,600px)] shrink-0">
          <Logotype />
        </div>
        <div className="flex min-h-0 w-full flex-1 items-center justify-center py-[2vh]">
          <Sheet />
        </div>
        <div className="flex shrink-0 flex-col items-center">
          <div className="spl-scribble-track">
            <div className="spl-scribble-fill" style={{ width: `${pct}%` }} />
          </div>
          <p className="spl-scribble-loading">LOADING…</p>
        </div>
      </div>
    </div>
  )
}

const INK = "#2e1065"

const LETTERS = [
  { ch: "S", from: "#fbcfe8", to: "#db2777" },
  { ch: "C", from: "#fed7aa", to: "#ea580c" },
  { ch: "R", from: "#fef08a", to: "#eab308" },
  { ch: "I", from: "#bbf7d0", to: "#16a34a" },
  { ch: "B", from: "#a5f3fc", to: "#0891b2" },
  { ch: "B", from: "#bfdbfe", to: "#2563eb" },
  { ch: "L", from: "#ddd6fe", to: "#7c3aed" },
  { ch: "E", from: "#fecdd3", to: "#e11d48" },
]
/** Each letter hops a little off the line and leans its own way. */
const HOP = "0 -9 13 -11 9 -11 13 -9"
const LEAN = "-7 5 -4 6 -5 4 -6 7"

/** The word in one coat: an outline, the rim, the depth, the colour fill or the gloss. */
function Word({ coat }: { coat: "fill" | "gloss" | { color: string; width: number } }) {
  const paint =
    coat === "fill"
      ? {}
      : coat === "gloss"
        ? { fill: "url(#spl-scribble-gloss)" }
        : {
            fill: coat.color,
            stroke: coat.color,
            strokeWidth: coat.width,
            strokeLinejoin: "round" as const,
          }
  return (
    <text
      x="320"
      y="148"
      dy={HOP}
      rotate={LEAN}
      textAnchor="middle"
      fontSize="118"
      fontWeight="900"
      textLength="560"
      lengthAdjust="spacingAndGlyphs"
      {...paint}
    >
      {coat === "fill"
        ? LETTERS.map((l, i) => (
            <tspan key={i} fill={`url(#spl-scribble-l${i})`} stroke={`url(#spl-scribble-l${i})`} strokeWidth="4" strokeLinejoin="round">
              {l.ch}
            </tspan>
          ))
        : "SCRIBBLE"}
    </text>
  )
}

/** "SCRIBBLE" as a chunky glossy logotype — each letter a different crayon — over a ribbon. */
function Logotype() {
  return (
    <svg
      viewBox="0 0 640 300"
      role="img"
      aria-label="Scribble"
      className="block w-full overflow-visible"
      style={{
        fontFamily: "var(--font-inter), ui-sans-serif, system-ui, sans-serif",
      }}
    >
      <defs>
        {LETTERS.map((l, i) => (
          <linearGradient key={i} id={`spl-scribble-l${i}`} gradientUnits="userSpaceOnUse" x1="0" y1="52" x2="0" y2="160">
            <stop offset="0" stopColor={l.from} />
            <stop offset="0.55" stopColor={l.to} />
            <stop offset="1" stopColor={l.to} stopOpacity="0.85" />
          </linearGradient>
        ))}
        <linearGradient id="spl-scribble-gloss" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.75" />
          <stop offset="0.3" stopColor="#fff" stopOpacity="0.3" />
          <stop offset="0.44" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="spl-scribble-ribbon" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fde68a" />
          <stop offset="1" stopColor="#f59e0b" />
        </linearGradient>
      </defs>
      <g transform="rotate(-5 320 160)">
        {/* Ribbon behind the word: tails, then the band */}
        <g transform="rotate(3 320 228)">
          <g transform="translate(0 14)" opacity="0.35">
            <RibbonShape color="#1e0638" width={30} />
          </g>
          <RibbonShape color="#fff" width={30} />
          <g transform="translate(0 7)">
            <RibbonShape color={INK} width={12} />
          </g>
          <RibbonShape color={INK} width={12} />
          <path d="M138 214l52-8v52l-52 8 18-26z" fill="#f59e0b" />
          <path d="M502 214l-52-8v52l52 8-18-26z" fill="#f59e0b" />
          <path d="M190 206v52l26-4z M450 206v52l-26-4z" fill="#b45309" />
          <path d="M184 200Q320 184 456 200V254Q320 238 184 254Z" fill="url(#spl-scribble-ribbon)" />
          <path d="M196 206Q320 192 444 206" fill="none" stroke="#fff" strokeOpacity="0.6" strokeWidth="5" strokeLinecap="round" />
          <text
            x="320"
            y="238"
            textAnchor="middle"
            fontSize="30"
            fontWeight="900"
            letterSpacing="3"
            fill={INK}
            textLength="226"
            lengthAdjust="spacingAndGlyphs"
          >
            DRAW &amp; GUESS
          </text>
        </g>
        {/* The word: drop shadow, white rim, dark depth, dark outline, colour, gloss */}
        <g transform="translate(0 20)" opacity="0.35">
          <Word coat={{ color: "#1e0638", width: 36 }} />
        </g>
        <g transform="translate(0 11)">
          <Word coat={{ color: "#fff", width: 36 }} />
        </g>
        <Word coat={{ color: "#fff", width: 36 }} />
        <g transform="translate(0 11)">
          <Word coat={{ color: INK, width: 16 }} />
        </g>
        <g transform="translate(0 5)">
          <Word coat={{ color: INK, width: 16 }} />
        </g>
        <Word coat={{ color: INK, width: 16 }} />
        <Word coat="fill" />
        <Word coat="gloss" />
        {/* Sparkles */}
        <path
          className="spl-scribble-twinkle"
          d="M594 60l7 17 17 7-17 7-7 17-7-17-17-7 17-7z"
          fill="#fff"
          stroke={INK}
          strokeWidth="5"
          strokeLinejoin="round"
        />
        <path
          className="spl-scribble-twinkle [animation-delay:-1.1s]"
          d="M40 170l5 11 11 5-11 5-5 11-5-11-11-5 11-5z"
          fill="#fde047"
          stroke={INK}
          strokeWidth="4"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  )
}

/** The ribbon's silhouette (tails and band) in one colour, for the outline and rim coats. */
function RibbonShape({ color, width }: { color: string; width: number }) {
  return (
    <path
      d="M138 214l52-8V200Q320 184 450 200v6l52 8-18 26 18 26-52-8v4Q320 238 190 254v4l-52 8 18-26z"
      fill={color}
      stroke={color}
      strokeWidth={width}
      strokeLinejoin="round"
    />
  )
}

/** A zigzag of crayon strokes covering a box, for colouring in. */
function hatch(x0: number, x1: number, y0: number, y1: number, step: number) {
  let d = `M${x0} ${y1}`
  for (let x = x0; x <= x1; x += step * 2) d += `L${x + step} ${y0}L${x + step * 2} ${y1}`
  return d
}

/** The drawing being guessed: a cat in crayon on a taped sheet, a pencil still at it, and the guesses. */
function Sheet() {
  return (
    <svg viewBox="0 0 400 330" aria-hidden className="h-full max-h-[min(50vh,460px)] w-auto max-w-full overflow-visible">
      <defs>
        <clipPath id="spl-scribble-cat">
          <path d="M144 182c-3-36 24-62 58-62s58 26 56 60c-2 34-28 54-58 54s-54-20-56-52z" />
          <path d="M150 150l-2-54 40 28zM214 124l40-28-2 54z" />
        </clipPath>
        <linearGradient id="spl-scribble-q" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f9a8d4" />
          <stop offset="1" stopColor="#db2777" />
        </linearGradient>
      </defs>
      {/* A sheet underneath, then the drawing sheet */}
      <g transform="rotate(7 200 170)">
        <rect x="76" y="50" width="252" height="232" rx="12" fill="#1e0638" opacity="0.3" transform="translate(6 10)" />
        <rect x="76" y="50" width="252" height="232" rx="12" fill="#fce7f3" stroke={INK} strokeWidth="5" />
      </g>
      <g transform="rotate(-4 200 170)">
        <rect x="70" y="44" width="260" height="236" rx="12" fill="#1e0638" opacity="0.3" transform="translate(5 10)" />
        <rect x="70" y="44" width="260" height="236" rx="12" fill="#fff" stroke={INK} strokeWidth="5" />
        <g stroke="#bfdbfe" strokeWidth="2">
          {[84, 108, 132, 156, 180, 204, 228, 252].map((y) => (
            <path key={y} d={`M74 ${y}H326`} />
          ))}
        </g>
        <path d="M104 47V277" stroke="#fca5a5" strokeWidth="2.5" />
        {/* The cat */}
        <g clipPath="url(#spl-scribble-cat)">
          <path d={hatch(130, 270, 88, 244, 9)} fill="none" stroke="#fb923c" strokeWidth="8" strokeLinejoin="round" opacity="0.85" />
        </g>
        <g fill="none" stroke={INK} strokeWidth="7" strokeLinecap="round" strokeLinejoin="round">
          <path d="M152 146l-3-48 38 25M214 122l38-25-1 48" />
          <path d="M144 182c-3-36 24-62 58-62s58 26 56 60c-2 34-28 54-58 54s-54-20-56-52z" />
          <path d="M187 201q7 8 14 0q7 8 14 0" strokeWidth="5" />
          <path d="M166 190h-38M166 200l-34 10M236 190h38M236 200l34 10" strokeWidth="4" />
        </g>
        <ellipse cx="180" cy="168" rx="8" ry="10.5" fill={INK} />
        <ellipse cx="222" cy="168" rx="8" ry="10.5" fill={INK} />
        <circle cx="182.5" cy="164" r="2.6" fill="#fff" />
        <circle cx="224.5" cy="164" r="2.6" fill="#fff" />
        <path d="M194 185h14l-7 8z" fill="#ec4899" stroke={INK} strokeWidth="3" strokeLinejoin="round" />
        {/* The line the pencil is drawing */}
        <path
          className="spl-scribble-draw"
          d="M112 256q12-14 24 0t24 0t24 0t24 0t24 0t24 0t20-2"
          fill="none"
          stroke="#ec4899"
          strokeWidth="6"
          strokeLinecap="round"
          pathLength="1"
        />
        {/* Tape */}
        <rect x="92" y="30" width="62" height="24" rx="3" fill="#fde68a" opacity="0.85" transform="rotate(-14 123 42)" />
        <rect x="248" y="30" width="62" height="24" rx="3" fill="#a5f3fc" opacity="0.85" transform="rotate(12 279 42)" />
      </g>
      {/* The pencil, its tip on the line */}
      <g transform="translate(274 246) rotate(-38) scale(0.82)">
        <g className="spl-scribble-pencil">
          <Pencil />
        </g>
      </g>
      {/* The guesses */}
      <g className="spl-scribble-pop">
        <Bubble cx={58} cy={86} rx={46} ry={40} tail="M78 112l30 34-46-16z" />
        <text
          x="58"
          y="108"
          textAnchor="middle"
          fontSize="62"
          fontWeight="900"
          fill="url(#spl-scribble-q)"
          stroke={INK}
          strokeWidth="9"
          strokeLinejoin="round"
          paintOrder="stroke"
          style={{
            fontFamily: "var(--font-inter), ui-sans-serif, system-ui, sans-serif",
          }}
        >
          ?
        </text>
      </g>
      <g className="spl-scribble-pop [animation-delay:-1.4s]">
        <Bubble cx={340} cy={58} rx={60} ry={34} tail="M316 82l-26 30 44-20z" />
        <text
          x="340"
          y="71"
          textAnchor="middle"
          fontSize="34"
          fontWeight="900"
          fill="#22c55e"
          stroke={INK}
          strokeWidth="7"
          strokeLinejoin="round"
          paintOrder="stroke"
          style={{
            fontFamily: "var(--font-inter), ui-sans-serif, system-ui, sans-serif",
          }}
        >
          CAT!
        </text>
      </g>
    </svg>
  )
}

/** A speech bubble: the outline drawn under both shapes so the tail joins seamlessly. */
function Bubble({ cx, cy, rx, ry, tail }: { cx: number; cy: number; rx: number; ry: number; tail: string }) {
  return (
    <g strokeLinejoin="round">
      <g transform="translate(3 8)" fill="#1e0638" stroke="#1e0638" strokeWidth="10" opacity="0.3">
        <ellipse cx={cx} cy={cy} rx={rx} ry={ry} />
        <path d={tail} />
      </g>
      <g fill={INK} stroke={INK} strokeWidth="10">
        <ellipse cx={cx} cy={cy} rx={rx} ry={ry} />
        <path d={tail} />
      </g>
      <g fill="#fff">
        <ellipse cx={cx} cy={cy} rx={rx} ry={ry} />
        <path d={tail} />
      </g>
      <path
        d={`M${cx - rx * 0.62} ${cy - ry * 0.42}q${rx * 0.3} ${-ry * 0.42} ${rx * 0.66} ${-ry * 0.5}`}
        fill="none"
        stroke="#e0e7ff"
        strokeWidth="6"
        strokeLinecap="round"
      />
    </g>
  )
}

/** A yellow pencil lying along +x with its point at the origin. */
function Pencil() {
  return (
    <g stroke={INK} strokeWidth="4" strokeLinejoin="round">
      <path d="M0 0l36-15v30z" fill="#fde7c4" />
      <path d="M0 0l12-5v10z" fill="#ec4899" stroke="none" />
      <rect x="36" y="-15" width="140" height="30" fill="#facc15" />
      <rect x="36" y="-15" width="140" height="9" fill="#fde047" stroke="none" />
      <rect x="36" y="5" width="140" height="10" fill="#eab308" stroke="none" />
      <rect x="36" y="-15" width="140" height="30" fill="none" />
      <rect x="176" y="-16" width="22" height="32" fill="#cbd5e1" />
      <path d="M183-16v32M191-16v32" strokeWidth="2.5" />
      <path d="M198-16h16a14 14 0 0 1 0 32h-16z" fill="#f9a8d4" />
    </g>
  )
}

/** Faint doodles all over the background, like the margins of a school notebook. */
function Doodles() {
  return (
    <svg aria-hidden className="absolute inset-0 size-full">
      <defs>
        <pattern id="spl-scribble-doodles" width="170" height="170" patternUnits="userSpaceOnUse" patternTransform="rotate(-12)">
          <g fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M30 14l4 9 10 1-7 7 2 10-9-5-9 5 2-10-7-7 10-1z" />
            <path d="M112 44a4 4 0 1 1 6 3a9 9 0 1 1-12-8a14 14 0 1 1 18 13" />
            <path d="M14 112q8-12 16 0t16 0t16 0" />
            <path d="M128 132c-10-7-14-12-10-17 3-4 8-3 10 1 2-4 7-5 10-1 4 5 0 10-10 17z" />
            <circle cx="76" cy="78" r="7" />
            <path d="M156 92v12M150 98h12" />
            <path d="M60 156l8-10 8 10 8-10 8 10" />
          </g>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#spl-scribble-doodles)" opacity="0.13" />
    </svg>
  )
}

/** A smooth wobbly blob through `n` points around the origin, with drips, from a fixed seed. */
function splat(seed: number) {
  let s = seed
  const rand = () => (s = (s * 9301 + 49297) % 233280) / 233280
  const n = 18
  const pts = Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2
    const k = i % 2 ? 0.66 + rand() * 0.14 : 0.86 + rand() * 0.42
    return [Math.cos(a) * 50 * k, Math.sin(a) * 50 * k]
  })
  const f = (v: number) => v.toFixed(1)
  let d = `M${f(pts[0][0])} ${f(pts[0][1])}`
  for (let i = 0; i < n; i++) {
    const [p0, p1, p2, p3] = [pts[(i + n - 1) % n], pts[i], pts[(i + 1) % n], pts[(i + 2) % n]]
    d += `C${f(p1[0] + (p2[0] - p0[0]) / 6)} ${f(p1[1] + (p2[1] - p0[1]) / 6)} ${f(p2[0] - (p3[0] - p1[0]) / 6)} ${f(p2[1] - (p3[1] - p1[1]) / 6)} ${f(p2[0])} ${f(p2[1])}`
  }
  const drops = Array.from({ length: 5 }, (_, i) => {
    const a = (i / 5) * Math.PI * 2 + rand()
    const r = 66 + rand() * 18
    return { cx: Math.cos(a) * r, cy: Math.sin(a) * r, r: 3.5 + rand() * 6 }
  })
  return { d: `${d}Z`, drops }
}

function Splat({ className, color, seed }: { className: string; color: string; seed: number }) {
  const { d, drops } = splat(seed)
  return (
    <svg viewBox="-90 -90 180 180" aria-hidden className={className}>
      <g fill={color}>
        <path d={d} />
        {drops.map((p, i) => (
          <circle key={i} cx={p.cx.toFixed(1)} cy={p.cy.toFixed(1)} r={p.r.toFixed(1)} />
        ))}
      </g>
      <path
        d={d}
        fill="none"
        stroke="#fff"
        strokeOpacity="0.35"
        strokeWidth="5"
        transform="translate(-6 -7) scale(0.62)"
        strokeDasharray="40 260"
        strokeLinecap="round"
      />
    </svg>
  )
}

const CRAYONS = ["#ef4444", "#f97316", "#facc15", "#22c55e", "#06b6d4", "#3b82f6", "#8b5cf6", "#ec4899"]
const STAGGER = [22, 6, 30, 0, 14, 34, 4, 18, 26, 10, 32, 2]

/** A crayon box's worth of crayons standing along the bottom edge. */
function Crayons() {
  return (
    <div aria-hidden className="absolute inset-x-0 bottom-0 flex h-[clamp(84px,15vh,150px)] justify-center gap-[0.6vh]">
      {Array.from({ length: 36 }, (_, i) => (
        <svg
          key={i}
          viewBox="0 0 40 150"
          className="h-[125%] w-auto shrink-0"
          style={{ transform: `translateY(${STAGGER[i % STAGGER.length]}%)` }}
        >
          <Crayon color={CRAYONS[i % CRAYONS.length]} />
        </svg>
      ))}
    </div>
  )
}

function Crayon({ color }: { color: string }) {
  return (
    <g stroke={INK} strokeWidth="3" strokeLinejoin="round">
      <path d="M8 42l8-30q4-8 8 0l8 30z" fill={color} />
      <path d="M13 24q7-3 14 0" fill="none" strokeWidth="2" opacity="0.5" />
      <rect x="4" y="40" width="32" height="112" rx="4" fill={color} />
      <rect x="4" y="62" width="32" height="56" fill="#fff" fillOpacity="0.85" />
      <path d="M8 74h24M8 106h24" stroke={color} strokeWidth="4" />
      <path d="M11 84q9 6 18 0q-9 8-18 14" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" />
      <rect x="9" y="44" width="6" height="104" rx="3" fill="#fff" fillOpacity="0.35" stroke="none" />
    </g>
  )
}

const CSS = `
.spl-scribble-root {
  background:
    radial-gradient(90% 55% at 50% 24%, #e879f9 0%, rgb(232 121 249 / 0) 70%),
    linear-gradient(180deg, #a855f7 0%, #7c3aed 45%, #4c1d95 100%);
}
.spl-scribble-rays {
  position: absolute; left: 50%; top: 24%;
  width: 260vmax; height: 260vmax; translate: -50% -50%;
  background: repeating-conic-gradient(rgb(255 255 255 / 0.11) 0deg 7deg, transparent 7deg 15deg);
  -webkit-mask-image: radial-gradient(circle closest-side, #000 4%, transparent 42%);
  mask-image: radial-gradient(circle closest-side, #000 4%, transparent 42%);
  animation: spl-scribble-spin 90s linear infinite;
}
@keyframes spl-scribble-spin { to { rotate: 360deg } }

.spl-scribble-float { animation: spl-scribble-float 3.4s ease-in-out infinite; }
@keyframes spl-scribble-float { 50% { translate: 0 -2.5%; rotate: 1.2deg } }

.spl-scribble-twinkle { transform-box: fill-box; transform-origin: center; animation: spl-scribble-twinkle 2.2s ease-in-out infinite; }
@keyframes spl-scribble-twinkle { 50% { scale: 0.6; rotate: 20deg } }

.spl-scribble-pencil { animation: spl-scribble-pencil 1.6s ease-in-out infinite; }
@keyframes spl-scribble-pencil { 25% { translate: -3px 2px; rotate: -3deg } 75% { translate: 3px -2px; rotate: 3deg } }

.spl-scribble-draw { stroke-dasharray: 1; animation: spl-scribble-draw 3.2s ease-in-out infinite; }
@keyframes spl-scribble-draw { 0% { stroke-dashoffset: 1 } 60%, 100% { stroke-dashoffset: 0 } }

.spl-scribble-pop { transform-box: fill-box; transform-origin: 50% 100%; animation: spl-scribble-pop 2.8s ease-in-out infinite; }
@keyframes spl-scribble-pop { 0%, 100% { scale: 1; rotate: 0deg } 50% { scale: 1.07; rotate: -3deg } }

.spl-scribble-track {
  position: relative; width: min(72vw, 340px); height: 30px; padding: 5px;
  border-radius: 999px; background: #1e0638;
  box-shadow: 0 0 0 3px #fff, 0 0 0 7px ${INK}, 0 8px 0 7px rgb(30 6 56 / 0.4), inset 0 4px 6px rgb(0 0 0 / 0.6);
}
.spl-scribble-fill {
  position: relative; height: 100%; min-width: 20px; border-radius: 999px;
  background:
    linear-gradient(-45deg, rgb(255 255 255 / 0.3) 25%, transparent 25% 50%, rgb(255 255 255 / 0.3) 50% 75%, transparent 75%) 0 0 / 22px 22px,
    linear-gradient(90deg, #f472b6, #fb923c 30%, #facc15 55%, #4ade80 80%, #22d3ee) 0 0 / calc(min(72vw, 340px) - 10px) 100%;
  box-shadow: inset 0 -4px 0 rgb(0 0 0 / 0.18);
  transition: width 0.3s ease-out;
  animation: spl-scribble-stripes 0.8s linear infinite;
}
.spl-scribble-fill::after {
  content: ""; position: absolute; left: 7px; right: 7px; top: 3px; height: 32%;
  border-radius: 999px; background: rgb(255 255 255 / 0.6);
}
@keyframes spl-scribble-stripes { to { background-position: 22px 0, 0 0 } }

.spl-scribble-loading {
  margin-top: 16px; font-size: 15px; font-weight: 900; letter-spacing: 0.2em; color: #fff;
  font-family: var(--font-inter), ui-sans-serif, system-ui, sans-serif;
  text-shadow: 0 2px 0 ${INK}, 2px 0 0 ${INK}, -2px 0 0 ${INK}, 0 -2px 0 ${INK}, 2px 2px 0 ${INK}, -2px 2px 0 ${INK}, 0 4px 0 ${INK};
}

@media (prefers-reduced-motion: reduce) {
  .spl-scribble-root *, .spl-scribble-root *::after { animation: none !important; }
}
`
