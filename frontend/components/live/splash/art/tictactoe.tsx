import type * as React from "react"

import type { SplashArtProps } from "../types"

/**
 * Tic Tac Toe's splash: a chunky glossy "TIC TAC TOE" (its O an amber ring)
 * over sky-blue rays, a board with X's winning strike, and two cute 3D
 * pieces — a coral X and an amber O — sizing each other up in front of it,
 * with more pieces floating around the edges, over an amber loading bar.
 */
export default function Splash({ progress }: SplashArtProps) {
  const pct = Math.max(0, Math.min(1, progress)) * 100
  return (
    <div className="spl-ttt-root relative size-full overflow-hidden">
      <style>{CSS}</style>
      <PieceDefs />
      <div className="spl-ttt-rays" aria-hidden />
      <GridPattern />
      <div className="spl-ttt-floor" aria-hidden />
      {FLOATERS.map((f, i) => (
        <svg
          key={i}
          viewBox="-90 -90 180 190"
          aria-hidden
          className="spl-ttt-drift absolute"
          style={{
            ...f.at,
            width: f.size,
            rotate: `${f.turn}deg`,
            filter: f.blur ? `blur(${f.blur}px)` : undefined,
            opacity: f.fade ?? 1,
            animationDelay: `${-i * 0.7}s`,
          }}
        >
          {f.piece === "x" ? <XPiece /> : <OPiece />}
        </svg>
      ))}

      <div className="relative flex h-full flex-col items-center px-4 pt-[6vh] pb-[9vh]">
        <div className="spl-ttt-float w-[min(90vw,56vh,560px)] shrink-0">
          <Logotype />
        </div>
        <div className="flex min-h-0 w-full flex-1 items-center justify-center py-[2vh]">
          <Hero />
        </div>
        <div className="flex shrink-0 flex-col items-center">
          <div className="spl-ttt-track">
            <div className="spl-ttt-fill" style={{ width: `${pct}%` }} />
          </div>
          <p className="spl-ttt-loading">LOADING…</p>
        </div>
      </div>
    </div>
  )
}

const NAVY = "#0b1a4a"
const FONT = {
  fontFamily: "var(--font-inter), ui-sans-serif, system-ui, sans-serif",
}

type Coat = "fill" | "gloss" | { color: string; width: number }

/** The logotype in one coat: "TIC TAC" on top, then "T", an O ring and "E". */
function Lines({ coat }: { coat: Coat }) {
  const solid = typeof coat === "object"
  const paint = solid
    ? {
        fill: coat.color,
        stroke: coat.color,
        strokeWidth: coat.width,
        strokeLinejoin: "round" as const,
      }
    : coat === "gloss"
      ? { fill: "url(#spl-ttt-gloss)" }
      : {}
  const big = {
    y: 272,
    fontSize: 150,
    fontWeight: 900,
    textAnchor: "middle" as const,
    ...paint,
  }
  const thick = (fill: string) => (coat === "fill" ? { fill, stroke: fill, strokeWidth: 4, strokeLinejoin: "round" as const } : {})
  return (
    <>
      <text
        x="320"
        y="126"
        dy="0 -7 7 0 -7 7 -7"
        rotate="-4 3 -3 0 4 -3 3"
        textAnchor="middle"
        fontSize="112"
        fontWeight="900"
        textLength="480"
        lengthAdjust="spacingAndGlyphs"
        {...paint}
        {...thick("url(#spl-ttt-ice)")}
      >
        TIC TAC
      </text>
      <text x="206" rotate="-6" {...big} {...thick("url(#spl-ttt-coral)")}>
        T
      </text>
      <text x="434" rotate="6" {...big} {...thick("url(#spl-ttt-coral)")}>
        E
      </text>
      <circle
        cx="320"
        cy="217"
        r="39"
        fill="none"
        stroke={solid ? coat.color : coat === "gloss" ? "url(#spl-ttt-ring-gloss)" : "url(#spl-ttt-ring)"}
        strokeWidth={solid ? 34 + coat.width : 34}
      />
    </>
  )
}

/** "TIC TAC TOE" stacked, chunky and glossy, with a white rim and a dark extruded edge. */
function Logotype() {
  return (
    <svg viewBox="0 0 640 320" role="img" aria-label="Tic Tac Toe" className="block w-full overflow-visible" style={FONT}>
      <defs>
        <linearGradient id="spl-ttt-ice" gradientUnits="userSpaceOnUse" x1="0" y1="34" x2="0" y2="134">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.5" stopColor="#dbeafe" />
          <stop offset="1" stopColor="#7dd3fc" />
        </linearGradient>
        <linearGradient id="spl-ttt-coral" gradientUnits="userSpaceOnUse" x1="0" y1="160" x2="0" y2="276">
          <stop offset="0" stopColor="#fecdd3" />
          <stop offset="0.5" stopColor="#fb7185" />
          <stop offset="1" stopColor="#e11d48" />
        </linearGradient>
        <linearGradient id="spl-ttt-ring" gradientUnits="userSpaceOnUse" x1="0" y1="160" x2="0" y2="274">
          <stop offset="0" stopColor="#fef9c3" />
          <stop offset="0.45" stopColor="#fcd34d" />
          <stop offset="1" stopColor="#f59e0b" />
        </linearGradient>
        <linearGradient id="spl-ttt-ring-gloss" gradientUnits="userSpaceOnUse" x1="0" y1="160" x2="0" y2="274">
          <stop offset="0" stopColor="#fff" stopOpacity="0.8" />
          <stop offset="0.3" stopColor="#fff" stopOpacity="0.25" />
          <stop offset="0.45" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="spl-ttt-gloss" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.75" />
          <stop offset="0.3" stopColor="#fff" stopOpacity="0.28" />
          <stop offset="0.45" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <g transform="rotate(-5 320 170)">
        <g transform="translate(0 22)" opacity="0.35">
          <Lines coat={{ color: "#020617", width: 36 }} />
        </g>
        <g transform="translate(0 12)">
          <Lines coat={{ color: "#fff", width: 36 }} />
        </g>
        <Lines coat={{ color: "#fff", width: 36 }} />
        <g transform="translate(0 12)">
          <Lines coat={{ color: NAVY, width: 16 }} />
        </g>
        <g transform="translate(0 6)">
          <Lines coat={{ color: NAVY, width: 16 }} />
        </g>
        <Lines coat={{ color: NAVY, width: 16 }} />
        <Lines coat="fill" />
        <Lines coat="gloss" />
        <path
          className="spl-ttt-twinkle"
          d="M596 36l7 17 17 7-17 7-7 17-7-17-17-7 17-7z"
          fill="#fff"
          stroke={NAVY}
          strokeWidth="5"
          strokeLinejoin="round"
        />
        <path
          className="spl-ttt-twinkle [animation-delay:-1.2s]"
          d="M60 196l5 12 12 5-12 5-5 12-5-12-12-5 12-5z"
          fill="#fde047"
          stroke={NAVY}
          strokeWidth="4"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  )
}

/** Gradients the pieces share, wherever on the page they're drawn. */
function PieceDefs() {
  return (
    <svg aria-hidden width="0" height="0" className="absolute">
      <defs>
        <linearGradient id="spl-ttt-x" gradientUnits="userSpaceOnUse" x1="0" y1="-72" x2="0" y2="72">
          <stop offset="0" stopColor="#fecdd3" />
          <stop offset="0.45" stopColor="#fb7185" />
          <stop offset="1" stopColor="#e11d48" />
        </linearGradient>
        <linearGradient id="spl-ttt-o" gradientUnits="userSpaceOnUse" x1="0" y1="-72" x2="0" y2="72">
          <stop offset="0" stopColor="#fef9c3" />
          <stop offset="0.45" stopColor="#fcd34d" />
          <stop offset="1" stopColor="#f59e0b" />
        </linearGradient>
        <linearGradient id="spl-ttt-board" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3b82f6" />
          <stop offset="1" stopColor="#1e40af" />
        </linearGradient>
        <filter id="spl-ttt-glow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="6" />
        </filter>
      </defs>
    </svg>
  )
}

const BARS = (
  <>
    <rect x="-74" y="-24" width="148" height="48" rx="24" transform="rotate(45)" />
    <rect x="-74" y="-24" width="148" height="48" rx="24" transform="rotate(-45)" />
  </>
)

/** A glossy 3D X, centred on the origin, about 150 across; with a face if it's a character. */
function XPiece({ face }: { face?: boolean }) {
  return (
    <g>
      {[14, 7, 0].map((dy) => (
        <g key={dy} transform={`translate(0 ${dy})`} fill={NAVY} stroke={NAVY} strokeWidth="10" strokeLinejoin="round">
          {BARS}
        </g>
      ))}
      {[14, 7].map((dy) => (
        <g key={dy} transform={`translate(0 ${dy})`} fill="#9f1239">
          {BARS}
        </g>
      ))}
      <g fill={NAVY} stroke={NAVY} strokeWidth="10">
        {BARS}
      </g>
      <g fill="url(#spl-ttt-x)">{BARS}</g>
      <g fill="#fff" opacity="0.6">
        <rect x="-60" y="-18" width="52" height="9" rx="4.5" transform="rotate(45)" />
        <rect x="8" y="-18" width="52" height="9" rx="4.5" transform="rotate(-45)" />
      </g>
      {face && <Face eyes={[-14, 14]} eyeY={-5} cheeks={[-27, 27]} cheekY={13} mouthY={9} blush="#ffe4e6" />}
    </g>
  )
}

/** A glossy 3D O ring, centred on the origin, about 150 across; with a face if it's a character. */
function OPiece({ face }: { face?: boolean }) {
  return (
    <g fill="none">
      {[14, 7, 0].map((dy) => (
        <circle key={dy} cy={dy} r="46" stroke={NAVY} strokeWidth="58" />
      ))}
      {[14, 7].map((dy) => (
        <circle key={dy} cy={dy} r="46" stroke="#b45309" strokeWidth="48" />
      ))}
      <circle r="46" stroke={NAVY} strokeWidth="58" />
      <circle r="46" stroke="url(#spl-ttt-o)" strokeWidth="48" />
      <path d="M-42-19a46 46 0 0 1 27-25" stroke="#fff" strokeOpacity="0.7" strokeWidth="10" strokeLinecap="round" />
      {/* Its "oh!" is the ring's hole */}
      {face && <Face eyes={[-25, 25]} eyeY={-37} cheeks={[-43, 43]} cheekY={10} blush="#fdba74" />}
    </g>
  )
}

/** Big shiny eyes that blink, rosy cheeks and (if it has room) a small smile. */
function Face({
  eyes,
  eyeY,
  cheeks,
  cheekY,
  mouthY,
  blush,
}: {
  eyes: number[]
  eyeY: number
  cheeks: number[]
  cheekY: number
  mouthY?: number
  blush: string
}) {
  return (
    <g>
      {cheeks.map((x) => (
        <ellipse key={x} cx={x} cy={cheekY} rx="7" ry="4.5" fill={blush} opacity="0.85" />
      ))}
      <g className="spl-ttt-blink">
        {eyes.map((x) => (
          <g key={x}>
            <ellipse cx={x} cy={eyeY} rx="10" ry="12.5" fill="#fff" stroke={NAVY} strokeWidth="3.5" />
            <circle cx={x + 2.5} cy={eyeY + 2} r="6.5" fill={NAVY} />
            <circle cx={x + 0.5} cy={eyeY - 1} r="2.4" fill="#fff" />
          </g>
        ))}
      </g>
      {mouthY !== undefined && <path d={`M-8 ${mouthY}q8 8 16 0`} fill="none" stroke={NAVY} strokeWidth="4" strokeLinecap="round" />}
    </g>
  )
}

const CELLS = [140, 210, 280]
const ROWS = [75, 145, 215]

/** The board with X's diagonal win, and the two pieces in front of it. */
function Hero() {
  return (
    <svg viewBox="0 0 420 390" aria-hidden className="h-full max-h-[min(50vh,480px)] w-auto max-w-full overflow-visible">
      <g transform="rotate(-6 210 145)">
        {/* Rim, depth, face */}
        {[16, 0].map((dy) => (
          <rect key={dy} x="85" y={20 + dy} width="250" height="250" rx="38" fill="#fff" stroke="#fff" strokeWidth="26" />
        ))}
        <rect x="85" y="20" width="250" height="250" rx="38" fill="#020617" opacity="0.25" transform="translate(4 34)" />
        {[16, 8].map((dy) => (
          <rect key={dy} x="85" y={20 + dy} width="250" height="250" rx="38" fill="#172554" stroke={NAVY} strokeWidth="10" />
        ))}
        <rect x="85" y="20" width="250" height="250" rx="38" fill="url(#spl-ttt-board)" stroke={NAVY} strokeWidth="10" />
        <rect x="100" y="32" width="220" height="80" rx="30" fill="#fff" opacity="0.12" />
        {/* Grid */}
        <g strokeLinecap="round" strokeWidth="13">
          <path d="M175 46v198M245 46v198M111 110h198M111 180h198" stroke={NAVY} strokeOpacity="0.45" transform="translate(0 5)" />
          <path d="M175 46v198M245 46v198M111 110h198M111 180h198" stroke="#dbeafe" />
        </g>
        {/* Pieces: X takes the diagonal */}
        {[0, 1, 2].map((i) => (
          <g key={i} transform={`translate(${CELLS[i]} ${ROWS[i] - 3}) scale(0.34)`}>
            <XPiece />
          </g>
        ))}
        <g transform={`translate(${CELLS[2]} ${ROWS[0] - 3}) scale(0.34)`}>
          <OPiece />
        </g>
        <g transform={`translate(${CELLS[0]} ${ROWS[1] - 3}) scale(0.34)`}>
          <OPiece />
        </g>
        {/* The winning strike */}
        <g className="spl-ttt-strike" strokeLinecap="round" fill="none">
          <path d="M116 51L304 239" stroke="#fde047" strokeWidth="26" filter="url(#spl-ttt-glow)" pathLength="1" />
          <path d="M116 51L304 239" stroke={NAVY} strokeWidth="18" pathLength="1" />
          <path d="M116 51L304 239" stroke="#fef9c3" strokeWidth="9" pathLength="1" />
        </g>
      </g>
      {/* The characters */}
      <ellipse cx="82" cy="372" rx="62" ry="12" fill="#020617" opacity="0.3" />
      <ellipse cx="340" cy="372" rx="62" ry="12" fill="#020617" opacity="0.3" />
      <g transform="translate(82 296) rotate(-8) scale(0.88)">
        <g className="spl-ttt-hop">
          <XPiece face />
        </g>
      </g>
      <g transform="translate(340 296) rotate(8) scale(0.88)">
        <g className="spl-ttt-hop [animation-delay:-0.55s]">
          <OPiece face />
        </g>
      </g>
    </svg>
  )
}

/** Faint tic-tac-toe grids tiled over the background. */
function GridPattern() {
  return (
    <svg aria-hidden className="absolute inset-0 size-full">
      <defs>
        <pattern id="spl-ttt-grid" width="150" height="150" patternUnits="userSpaceOnUse" patternTransform="rotate(-14)">
          <path d="M44 20v70M74 20v70M20 44h78M20 70h78" stroke="#fff" strokeWidth="5" strokeLinecap="round" fill="none" />
          <path d="M112 104l20 20m0-20l-20 20" stroke="#fff" strokeWidth="5" strokeLinecap="round" />
          <circle cx="40" cy="126" r="9" stroke="#fff" strokeWidth="5" fill="none" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#spl-ttt-grid)" opacity="0.08" />
    </svg>
  )
}

type Floater = {
  piece: "x" | "o"
  at: React.CSSProperties
  size: string
  turn: number
  blur?: number
  fade?: number
}

/** Pieces floating around the edges; the big blurred ones sit nearer the camera. */
const FLOATERS: Floater[] = [
  { piece: "x", at: { left: "3%", top: "31%" }, size: "13vmin", turn: -18 },
  { piece: "o", at: { right: "4%", top: "29%" }, size: "11vmin", turn: 10 },
  {
    piece: "x",
    at: { left: "17%", top: "2%" },
    size: "7vmin",
    turn: 24,
    fade: 0.75,
  },
  {
    piece: "o",
    at: { right: "15%", top: "1.5%" },
    size: "7vmin",
    turn: 0,
    fade: 0.75,
  },
  {
    piece: "o",
    at: { left: "-5vmin", top: "56%" },
    size: "17vmin",
    turn: 0,
    blur: 2,
  },
  {
    piece: "x",
    at: { right: "-4vmin", top: "60%" },
    size: "16vmin",
    turn: 16,
    blur: 2,
  },
  {
    piece: "x",
    at: { left: "-9vmin", bottom: "-8vmin" },
    size: "34vmin",
    turn: 14,
    blur: 4,
  },
  {
    piece: "o",
    at: { right: "-10vmin", bottom: "-10vmin" },
    size: "36vmin",
    turn: 0,
    blur: 4,
  },
]

const CSS = `
.spl-ttt-root {
  background:
    radial-gradient(85% 50% at 50% 24%, #7dd3fc 0%, rgb(125 211 252 / 0) 70%),
    linear-gradient(180deg, #3b82f6 0%, #2563eb 45%, #1e3a8a 100%);
}
.spl-ttt-rays {
  position: absolute; left: 50%; top: 22%;
  width: 260vmax; height: 260vmax; translate: -50% -50%;
  background: repeating-conic-gradient(rgb(255 255 255 / 0.12) 0deg 7deg, transparent 7deg 15deg);
  -webkit-mask-image: radial-gradient(circle closest-side, #000 4%, transparent 42%);
  mask-image: radial-gradient(circle closest-side, #000 4%, transparent 42%);
  animation: spl-ttt-spin 90s linear infinite;
}
@keyframes spl-ttt-spin { to { rotate: 360deg } }
.spl-ttt-floor {
  position: absolute; left: 50%; bottom: 8%; width: 140vmin; height: 46vmin; translate: -50% 0;
  background: radial-gradient(closest-side, rgb(147 197 253 / 0.45), transparent);
}

.spl-ttt-float { animation: spl-ttt-float 3.4s ease-in-out infinite; }
@keyframes spl-ttt-float { 50% { translate: 0 -2.5%; rotate: 1.2deg } }

.spl-ttt-drift { animation: spl-ttt-drift 5s ease-in-out infinite; }
@keyframes spl-ttt-drift { 50% { translate: 0 -10%; } }

.spl-ttt-twinkle { transform-box: fill-box; transform-origin: center; animation: spl-ttt-twinkle 2.2s ease-in-out infinite; }
@keyframes spl-ttt-twinkle { 50% { scale: 0.6; rotate: 20deg } }

.spl-ttt-hop { animation: spl-ttt-hop 1.1s ease-in-out infinite alternate; }
@keyframes spl-ttt-hop { from { translate: 0 4px; scale: 1.04 0.96 } to { translate: 0 -12px; scale: 0.98 1.03 } }

.spl-ttt-blink { transform-box: fill-box; transform-origin: center; animation: spl-ttt-blink 4s infinite; }
@keyframes spl-ttt-blink { 0%, 92%, 100% { scale: 1 1 } 95% { scale: 1 0.1 } }

.spl-ttt-strike path { stroke-dasharray: 1; animation: spl-ttt-strike 3.6s ease-out infinite; }
@keyframes spl-ttt-strike { 0%, 12% { stroke-dashoffset: 1 } 40%, 100% { stroke-dashoffset: 0 } }

.spl-ttt-track {
  position: relative; width: min(72vw, 340px); height: 30px; padding: 5px;
  border-radius: 999px; background: #0a1640;
  box-shadow: 0 0 0 3px #fff, 0 0 0 7px ${NAVY}, 0 8px 0 7px rgb(2 6 23 / 0.35), inset 0 4px 6px rgb(0 0 0 / 0.6);
}
.spl-ttt-fill {
  position: relative; height: 100%; min-width: 20px; border-radius: 999px;
  background:
    linear-gradient(-45deg, rgb(255 255 255 / 0.32) 25%, transparent 25% 50%, rgb(255 255 255 / 0.32) 50% 75%, transparent 75%) 0 0 / 22px 22px,
    linear-gradient(180deg, #fde68a, #fbbf24 50%, #f59e0b);
  box-shadow: inset 0 -4px 0 rgb(180 83 9 / 0.45);
  transition: width 0.3s ease-out;
  animation: spl-ttt-stripes 0.8s linear infinite;
}
.spl-ttt-fill::after {
  content: ""; position: absolute; left: 7px; right: 7px; top: 3px; height: 32%;
  border-radius: 999px; background: rgb(255 255 255 / 0.65);
}
@keyframes spl-ttt-stripes { to { background-position: 22px 0, 0 0 } }

.spl-ttt-loading {
  margin-top: 16px; font-size: 15px; font-weight: 900; letter-spacing: 0.2em; color: #fff;
  font-family: var(--font-inter), ui-sans-serif, system-ui, sans-serif;
  text-shadow: 0 2px 0 ${NAVY}, 2px 0 0 ${NAVY}, -2px 0 0 ${NAVY}, 0 -2px 0 ${NAVY}, 2px 2px 0 ${NAVY}, -2px 2px 0 ${NAVY}, 0 4px 0 ${NAVY};
}

@media (prefers-reduced-motion: reduce) {
  .spl-ttt-root *, .spl-ttt-root *::after { animation: none !important; }
}
`
