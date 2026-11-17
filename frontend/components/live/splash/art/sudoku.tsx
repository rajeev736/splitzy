import type { SplashArtProps } from "../types"

/**
 * Sudoku Race: a playful purple puzzle world. The chunky SUDOKU / RACE title
 * (with speed streaks and a chequered flag) sits in light rays up top; a big
 * glossy board with a stopwatch floats in the middle, number tiles fly
 * around it, and a sudoku-grid track races towards you under the loading bar.
 */
export default function Splash({ progress }: SplashArtProps) {
  return (
    <div className="spl-sudoku relative size-full overflow-hidden">
      <style>{CSS}</style>
      <div className="absolute inset-0 bg-[linear-gradient(180deg,#b996ff_0%,#8656f0_34%,#5b2bc9_66%,#2e0f7a_100%)]" />
      <div className="spl-sudoku-pattern absolute inset-0" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_42%_at_50%_20%,rgba(255,240,255,0.75),rgba(255,240,255,0)_70%)]" />
      <div className="spl-sudoku-rays absolute top-[22%] left-1/2 size-[220vmax]" />
      <Track />
      <Tiles />
      <div className="relative flex size-full flex-col items-center px-4 pt-[max(6%,env(safe-area-inset-top))] pb-[max(8%,calc(env(safe-area-inset-bottom)+20px))]">
        <Title />
        <div className="flex min-h-0 w-full flex-1 items-center justify-center py-[2vh]">
          <Board />
        </div>
        <LoadingBar progress={progress} />
      </div>
    </div>
  )
}

const FONT = "var(--font-inter), system-ui, sans-serif"
const INK = "#270a5c"

/* ───────────────────────────── Title ───────────────────────────── */

/**
 * One chunky word: a soft drop shadow, a dark outline extruded downwards,
 * a darker "side" in the word's hue, the gradient face, and a gloss on the
 * top half of the letters.
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
      <text {...t} transform={`translate(0 ${d + size * 0.07})`} fill="#16033d" fillOpacity="0.4" stroke="#16033d" strokeOpacity="0.4" strokeWidth={o}>
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

/** A chequered flag on a pole, foot of the pole at (0, 0). */
function Flag() {
  const wave = "M0-96c16-8 30 6 46 0s28-10 40-4v46c-12-6-24-2-40 4s-30-8-46 0z"
  return (
    <g>
      <defs>
        <pattern id="spl-sudoku-check" width="20" height="20" patternUnits="userSpaceOnUse" patternTransform="rotate(-6)">
          <rect width="20" height="20" fill="#fff" />
          <rect width="10" height="10" fill="#1d1033" />
          <rect x="10" y="10" width="10" height="10" fill="#1d1033" />
        </pattern>
        <linearGradient id="spl-sudoku-flagshade" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#000" stopOpacity="0" />
          <stop offset="0.45" stopColor="#000" stopOpacity="0.25" />
          <stop offset="0.7" stopColor="#fff" stopOpacity="0.2" />
          <stop offset="1" stopColor="#000" stopOpacity="0.15" />
        </linearGradient>
      </defs>
      <path d="M0 0V-100" stroke={INK} strokeWidth="10" strokeLinecap="round" />
      <path d="M0 0V-100" stroke="#ffd23f" strokeWidth="5" strokeLinecap="round" />
      <g className="spl-sudoku-flag">
        <path d={wave} fill="url(#spl-sudoku-check)" />
        <path d={wave} fill="url(#spl-sudoku-flagshade)" />
        <path d={wave} fill="none" stroke={INK} strokeWidth="5" strokeLinejoin="round" />
      </g>
      <circle cy="-102" r="7" fill="#ffd23f" stroke={INK} strokeWidth="4" />
    </g>
  )
}

function Title() {
  return (
    <svg
      viewBox="0 0 400 236"
      className="spl-sudoku-title w-[min(88vw,460px,46vh)] shrink-0 overflow-visible drop-shadow-[0_10px_18px_rgba(30,5,80,0.4)]"
      role="img"
      aria-label="Sudoku Race"
    >
      <Word id="spl-sudoku-w1" text="SUDOKU" x={200} y={98} size={90} colors={["#fff8b0", "#ffd23f", "#ff9a14"]} side="#b8520a" rotate="-3 3 -2 2 -3 3" />
      {/* RACE leans forward, speed streaks behind it */}
      <g strokeLinecap="round" className="spl-sudoku-streaks">
        <path d="M8 150h40M-8 172h52M14 194h28" stroke={INK} strokeWidth="11" />
        <path d="M8 150h40M-8 172h52M14 194h28" stroke="#fff" strokeWidth="5" />
      </g>
      <g transform="translate(188 0) skewX(-12) translate(-188 0)">
        <Word id="spl-sudoku-w2" text="RACE" x={188} y={206} size={88} colors={["#e3fdff", "#55e2ff", "#1c8fe6"]} side="#0d4f9c" />
      </g>
      <g transform="translate(312 212) rotate(12) scale(0.86)">
        <Flag />
      </g>
    </svg>
  )
}

/* ───────────────────────────── The board ───────────────────────────── */

const SOLUTION = ["534678912", "672195348", "198342567", "859761423", "426853791", "713924856", "961537284", "287419635", "345286179"]
/** Which cells are filled in: given digits, and a few the racers have entered (purple). */
const GIVEN = ["110100100", "100110000", "011000010", "100010001", "100101001", "100010001", "010000110", "000110001", "001010011"]
const ENTERED: [number, number][] = [[0, 2], [1, 3], [3, 4], [4, 1], [5, 6], [7, 0]]

/** A stopwatch, centred on (0, 0), radius about 40. */
function Stopwatch() {
  return (
    <g>
      <defs>
        <linearGradient id="spl-sudoku-metal" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff6b0" />
          <stop offset="0.5" stopColor="#ffc22e" />
          <stop offset="1" stopColor="#e07c0a" />
        </linearGradient>
        <radialGradient id="spl-sudoku-dial" cx="0.4" cy="0.35" r="0.7">
          <stop offset="0" stopColor="#fff" />
          <stop offset="1" stopColor="#e6dcff" />
        </radialGradient>
      </defs>
      {/* Crown and side buttons */}
      <rect x="-9" y="-56" width="18" height="12" rx="3" fill="url(#spl-sudoku-metal)" stroke={INK} strokeWidth="4" />
      <rect x="-14" y="-62" width="28" height="9" rx="4" fill="url(#spl-sudoku-metal)" stroke={INK} strokeWidth="4" />
      <g transform="rotate(42)">
        <rect x="-6" y="-54" width="12" height="12" rx="3" fill="url(#spl-sudoku-metal)" stroke={INK} strokeWidth="4" />
      </g>
      <circle r="44" fill={INK} />
      <circle r="40" fill="url(#spl-sudoku-metal)" />
      <circle r="31" fill="url(#spl-sudoku-dial)" stroke={INK} strokeWidth="3.5" />
      {/* The elapsed sweep and ticks */}
      <path d="M0 0V-27A27 27 0 0 1 23.4 13.5z" fill="#ff5f8f" opacity="0.35" />
      <g stroke={INK} strokeWidth="3" strokeLinecap="round">
        {Array.from({ length: 12 }, (_, i) => (
          <path key={i} d={i % 3 ? "M0-27v3" : "M0-27v6"} transform={`rotate(${i * 30})`} />
        ))}
      </g>
      <g className="spl-sudoku-hand">
        <path d="M0 4V-24" stroke="#e11d48" strokeWidth="4.5" strokeLinecap="round" />
      </g>
      <circle r="4.5" fill={INK} />
      <path d="M-28-16a32 32 0 0 1 22-18" stroke="#fff" strokeOpacity="0.75" strokeWidth="5" strokeLinecap="round" fill="none" />
    </g>
  )
}

function Board() {
  const c = 32
  return (
    <svg viewBox="-40 -50 380 380" className="spl-sudoku-board h-full max-h-[380px] w-auto max-w-full overflow-visible" aria-hidden>
      <defs>
        <linearGradient id="spl-sudoku-face" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#efe8ff" />
        </linearGradient>
        <linearGradient id="spl-sudoku-gloss" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.7" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <g className="spl-sudoku-float">
        <g transform="rotate(-6 150 150)">
          {/* Shadow, thick purple edge, the white face */}
          <rect x="0" y="22" width="300" height="300" rx="26" fill="#16033d" opacity="0.35" />
          <rect x="0" y="12" width="300" height="300" rx="26" fill="#5b21b6" stroke={INK} strokeWidth="7" />
          <rect width="300" height="300" rx="26" fill="#7c3aed" stroke={INK} strokeWidth="7" />
          <rect x="6" y="6" width="288" height="288" rx="20" fill="url(#spl-sudoku-face)" />
          {/* The centre 3×3 box tinted, a glowing cursor cell */}
          <rect x={6 + c * 3} y={6 + c * 3} width={c * 3} height={c * 3} fill="#ede4ff" />
          <rect x={6 + c * 5 + 2} y={6 + c * 4 + 2} width={c - 4} height={c - 4} rx="6" fill="#ffe27a" className="spl-sudoku-cursor" />
          <g stroke="#c9b6f5" strokeWidth="1.6">
            {[1, 2, 4, 5, 7, 8].map((k) => (
              <path key={k} d={`M${6 + c * k} 8V292M8 ${6 + c * k}H292`} />
            ))}
          </g>
          <g stroke="#6d28d9" strokeWidth="4.5" strokeLinecap="round">
            <path d={`M${6 + c * 3} 8V292M${6 + c * 6} 8V292M8 ${6 + c * 3}H292M8 ${6 + c * 6}H292`} />
          </g>
          {SOLUTION.map((row, r) =>
            [...row].map((n, col) => {
              const entered = ENTERED.some(([er, ec]) => er === r && ec === col)
              if (GIVEN[r][col] !== "1" && !entered) return null
              return (
                <text
                  key={`${r}-${col}`}
                  x={6 + c * col + c / 2}
                  y={6 + c * r + c / 2 + 8}
                  textAnchor="middle"
                  fontSize="22"
                  fill={entered ? "#8b2cf5" : "#1e1452"}
                  style={{ fontFamily: FONT, fontWeight: entered ? 900 : 800 }}
                >
                  {n}
                </text>
              )
            })
          )}
          {/* Gloss across the top of the board */}
          <path d="M14 14h272a12 12 0 0 1 0 0v70c-90 26-180 30-272 6z" fill="url(#spl-sudoku-gloss)" opacity="0.6" />
        </g>
        <g transform="translate(296 6) rotate(14)" className="spl-sudoku-watch">
          <Stopwatch />
        </g>
      </g>
    </svg>
  )
}

/* ───────────────────────────── Tiles and track ───────────────────────────── */

/** A chunky number tile with speed streaks trailing behind it. */
function Tile({ n, color, trail }: { n: string; color: string; trail: number }) {
  return (
    <svg viewBox="-60 -10 120 80" className="size-full overflow-visible">
      <g transform={`rotate(${trail} 30 30)`} strokeLinecap="round" opacity="0.8">
        <path d="M-8 14h-24M-6 30h-40M-8 46h-22" stroke="#fff" strokeWidth="6" strokeOpacity="0.6" />
      </g>
      <rect y="6" width="60" height="60" rx="14" fill="#5b21b6" stroke={INK} strokeWidth="4" />
      <rect width="60" height="60" rx="14" fill="url(#spl-sudoku-tile)" stroke={INK} strokeWidth="4" />
      <path d="M10 10h40" stroke="#fff" strokeWidth="5" strokeLinecap="round" strokeOpacity="0.9" />
      <text
        x="30"
        y="46"
        textAnchor="middle"
        fontSize="40"
        fill={color}
        stroke={INK}
        strokeWidth="7"
        strokeLinejoin="round"
        paintOrder="stroke"
        style={{ fontFamily: FONT, fontWeight: 900 }}
      >
        {n}
      </text>
    </svg>
  )
}

const TILES: { n: string; color: string; x: string; y: string; size: number; rot: number; trail: number; delay: number }[] = [
  { n: "7", color: "#ff5f8f", x: "3%", y: "33%", size: 15, rot: -14, trail: 10, delay: 0 },
  { n: "3", color: "#3fc8ff", x: "80%", y: "29%", size: 14, rot: 12, trail: 160, delay: 0.6 },
  { n: "5", color: "#7ee03b", x: "6%", y: "58%", size: 13, rot: 10, trail: -20, delay: 1.1 },
  { n: "9", color: "#ffb11a", x: "83%", y: "55%", size: 15, rot: -10, trail: 200, delay: 0.3 },
  { n: "1", color: "#ffb11a", x: "18%", y: "4%", size: 10, rot: 16, trail: 30, delay: 0.9 },
  { n: "4", color: "#7ee03b", x: "76%", y: "3%", size: 10, rot: -14, trail: 150, delay: 1.4 },
  { n: "2", color: "#3fc8ff", x: "88%", y: "75%", size: 10, rot: 8, trail: 190, delay: 0.5 },
  { n: "8", color: "#ff5f8f", x: "2%", y: "77%", size: 10, rot: -8, trail: -10, delay: 1.7 },
]

function Tiles() {
  return (
    <>
      <svg width="0" height="0" className="absolute" aria-hidden>
        <defs>
          <linearGradient id="spl-sudoku-tile" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ffffff" />
            <stop offset="1" stopColor="#e4d8ff" />
          </linearGradient>
        </defs>
      </svg>
      {TILES.map((t) => (
        <div
          key={t.n}
          className="spl-sudoku-tilebox absolute"
          style={{
            left: t.x,
            top: t.y,
            width: `clamp(40px, ${t.size}vmin, 92px)`,
            height: `clamp(40px, ${t.size}vmin, 92px)`,
            rotate: `${t.rot}deg`,
            animationDelay: `${-t.delay}s`,
          }}
        >
          <Tile n={t.n} color={t.color} trail={t.trail} />
        </div>
      ))}
    </>
  )
}

/** A sudoku-grid race track in perspective, rushing towards you. */
function Track() {
  return (
    <div className="spl-sudoku-trackwrap absolute inset-x-0 bottom-0 h-[42%] overflow-hidden" aria-hidden>
      <div className="spl-sudoku-track absolute -inset-x-full bottom-0 h-[300%] origin-bottom" />
    </div>
  )
}

/* ───────────────────────────── Loading bar ───────────────────────────── */

function LoadingBar({ progress }: { progress: number }) {
  const pct = Math.min(1, Math.max(0, progress)) * 100
  return (
    <div className="flex shrink-0 flex-col items-center gap-2.5">
      <div className="spl-sudoku-rim h-7 w-[min(74vw,340px)] rounded-full p-[4px]">
        <div className="relative size-full overflow-hidden rounded-full bg-[#1a0745] shadow-[inset_0_3px_6px_rgba(0,0,0,0.6)]">
          <div className="spl-sudoku-fill relative h-full min-w-5 rounded-full transition-[width] duration-500 ease-out" style={{ width: `${pct}%` }} />
        </div>
      </div>
      <p className="spl-sudoku-label text-sm font-black tracking-[0.2em] text-white">LOADING…</p>
    </div>
  )
}

const CSS = `
.spl-sudoku-pattern {
  background-image:
    linear-gradient(rgba(255,255,255,0.09) 2px, transparent 2px),
    linear-gradient(90deg, rgba(255,255,255,0.09) 2px, transparent 2px),
    linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px);
  background-size: 108px 108px, 108px 108px, 36px 36px, 36px 36px;
  background-position: center;
  -webkit-mask-image: linear-gradient(180deg, #000, rgba(0,0,0,0.3) 60%, transparent);
  mask-image: linear-gradient(180deg, #000, rgba(0,0,0,0.3) 60%, transparent);
}
.spl-sudoku-rays {
  translate: -50% -50%;
  background: repeating-conic-gradient(from 0deg, rgba(255,255,255,0.16) 0deg 7deg, rgba(255,255,255,0) 7deg 15deg);
  -webkit-mask-image: radial-gradient(circle, #000 0, rgba(0,0,0,0.6) 12%, transparent 30%);
  mask-image: radial-gradient(circle, #000 0, rgba(0,0,0,0.6) 12%, transparent 30%);
}
.spl-sudoku-trackwrap {
  perspective: 260px;
  perspective-origin: 50% 0%;
  -webkit-mask-image: linear-gradient(180deg, transparent, #000 45%);
  mask-image: linear-gradient(180deg, transparent, #000 45%);
}
.spl-sudoku-track {
  transform: rotateX(72deg);
  background-color: #4a1fb0;
  background-image:
    linear-gradient(#c4a8ff 6px, transparent 6px),
    linear-gradient(90deg, #c4a8ff 6px, transparent 6px),
    linear-gradient(rgba(196,168,255,0.45) 2px, transparent 2px),
    linear-gradient(90deg, rgba(196,168,255,0.45) 2px, transparent 2px);
  background-size: 240px 240px, 240px 240px, 80px 80px, 80px 80px;
  background-position: center bottom;
}
.spl-sudoku-rim {
  background: linear-gradient(180deg, #ffffff, #d9c8ff 50%, #9a78ea);
  box-shadow: 0 0 0 3px ${INK}, 0 5px 0 3px rgba(22, 3, 61, 0.55);
}
.spl-sudoku-fill {
  background:
    linear-gradient(180deg, rgba(255,255,255,0.7) 0, rgba(255,255,255,0.15) 45%, rgba(255,255,255,0) 50%),
    repeating-linear-gradient(-45deg, rgba(255,255,255,0.32) 0 7px, rgba(255,255,255,0) 7px 14px),
    linear-gradient(180deg, #fff27a, #ffc21a 55%, #f08400);
  background-size: 100% 100%, 19.8px 19.8px, 100% 100%;
  box-shadow: inset 0 -2px 0 rgba(0,0,0,0.2);
}
.spl-sudoku-label {
  -webkit-text-stroke: 5px ${INK};
  paint-order: stroke fill;
  text-shadow: 0 3px 0 ${INK};
}
.spl-sudoku-hand { transform: rotate(120deg); }
@media (prefers-reduced-motion: no-preference) {
  .spl-sudoku-rays { animation: spl-sudoku-spin 90s linear infinite; }
  .spl-sudoku-title { animation: spl-sudoku-bob 3.2s ease-in-out infinite; }
  .spl-sudoku-float { animation: spl-sudoku-bob 4s ease-in-out infinite reverse; }
  .spl-sudoku-hand { animation: spl-sudoku-tick 4s steps(16) infinite; }
  .spl-sudoku-cursor { animation: spl-sudoku-pulse 1.1s ease-in-out infinite; }
  .spl-sudoku-streaks { animation: spl-sudoku-dash 0.5s ease-in-out infinite alternate; }
  .spl-sudoku-flag { animation: spl-sudoku-wave 1.4s ease-in-out infinite alternate; transform-box: fill-box; transform-origin: 0 50%; }
  .spl-sudoku-tilebox { animation: spl-sudoku-fly 3.6s ease-in-out infinite; }
  .spl-sudoku-track { animation: spl-sudoku-run 1.2s linear infinite; }
  .spl-sudoku-fill { animation: spl-sudoku-stripes 0.7s linear infinite; }
}
@keyframes spl-sudoku-spin { to { rotate: 360deg; } }
@keyframes spl-sudoku-bob { 50% { transform: translateY(-6px); } }
@keyframes spl-sudoku-tick { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
@keyframes spl-sudoku-pulse { 50% { opacity: 0.4; } }
@keyframes spl-sudoku-dash { to { transform: translateX(-8px); } }
@keyframes spl-sudoku-wave { to { transform: skewY(-5deg) scaleX(0.94); } }
@keyframes spl-sudoku-fly { 50% { transform: translate(0, -10px) rotate(6deg); } }
@keyframes spl-sudoku-run { from { background-position: center calc(100% - 240px); } to { background-position: center 100%; } }
@keyframes spl-sudoku-stripes { to { background-position: 0 0, 19.8px 0, 0 0; } }
`
