import * as React from "react"

import type { SplashArtProps } from "../types"

/**
 * Chess: a royal night. Gold light rays fan out behind a glossy gold
 * "CHESS" logotype under a jewelled crown, a checkerboard floor runs off to
 * the horizon, and a giant king and knight in obsidian and gold stand at the
 * edges. Vector only (SVG + CSS gradients), so it paints instantly.
 */
export default function Splash({ progress }: SplashArtProps) {
  const uid = React.useId().replace(/[^\w-]/g, "")
  const id = (name: string) => `${uid}-${name}`
  const width = Math.min(Math.max(progress, 0.06), 1) * 100

  return (
    <div className="spl-chess" aria-hidden>
      <style>{CSS}</style>
      <div className="spl-chess-rays" />

      <svg className="spl-chess-defs" width="0" height="0">
        <PieceDefs id={id} />
      </svg>
      <Floor id={id} />

      {SPARKLES.map(([left, top, size, delay], i) => (
        <Sparkle
          key={i}
          className="spl-chess-twinkle"
          style={{
            left: `${left}%`,
            top: `${top}%`,
            width: size,
            height: size,
            animationDelay: `${delay}s`,
          }}
        />
      ))}

      <div className="spl-chess-stage">
        <King id={id} />
        <Knight id={id} />
      </div>

      <div className="spl-chess-title">
        <Title id={id} />
      </div>

      <div className="spl-chess-load">
        <div className="spl-chess-bar">
          <div className="spl-chess-track">
            <div className="spl-chess-fill" style={{ width: `${width}%` }}>
              <div className="spl-chess-stripes" />
              <div className="spl-chess-gloss" />
            </div>
          </div>
        </div>
        <p className="spl-chess-loading">Loading…</p>
      </div>
    </div>
  )
}

type Id = (name: string) => string

/** [left %, top %, size px, delay s] */
const SPARKLES: [number, number, number, number][] = [
  [8, 10, 14, 0],
  [88, 7, 18, 0.9],
  [16, 41, 10, 1.6],
  [83, 38, 13, 0.4],
  [50, 3, 9, 2.1],
  [70, 47, 9, 1.2],
  [28, 50, 8, 2.6],
]

/** A four-pointed star, 20 units across, centred on the origin. */
function Star() {
  return (
    <>
      <path
        d="M0-10C.8-2.4 2.4-.8 10 0 2.4.8.8 2.4 0 10-.8 2.4-2.4.8-10 0-2.4-.8-.8-2.4 0-10z"
        fill="#fff6d0"
      />
      <circle r="2.2" fill="#fff" />
    </>
  )
}

function Sparkle({
  className,
  style,
}: {
  className?: string
  style?: React.CSSProperties
}) {
  return (
    <svg viewBox="-10 -10 20 20" className={className} style={style}>
      <Star />
    </svg>
  )
}

/* Floor: one path of dark squares in perspective (eye 4 squares above the
   floor, the nearest row 6 squares away), over a lighter purple ground. */
const FLOOR_PATH = (() => {
  const eye = 4
  const focal = 750
  const cx = 500
  const pt = (x: number, z: number) =>
    `${(cx + (x * focal) / z).toFixed(1)} ${((eye * focal) / z).toFixed(1)}`
  let d = ""
  for (let z = 6; z < 34; z++) {
    const reach = Math.ceil(z * 0.72) + 1
    for (let x = -reach; x < reach; x++) {
      if ((x + z + 1000) % 2) continue
      d += `M${pt(x, z)}L${pt(x + 1, z)}L${pt(x + 1, z + 1)}L${pt(x, z + 1)}z`
    }
  }
  return d
})()

function Floor({ id }: { id: Id }) {
  return (
    <svg
      className="spl-chess-floor"
      viewBox="0 0 1000 500"
      preserveAspectRatio="xMidYMin slice"
    >
      <defs>
        <linearGradient id={id("ground")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#4b3a9e" />
          <stop offset="1" stopColor="#6a52c9" />
        </linearGradient>
        <linearGradient id={id("tiles")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1a1250" />
          <stop offset="1" stopColor="#120c3a" />
        </linearGradient>
        <radialGradient
          id={id("glow")}
          gradientUnits="userSpaceOnUse"
          cx="0"
          cy="0"
          r="520"
          gradientTransform="translate(500 0) scale(1 .42)"
        >
          <stop offset="0" stopColor="#ffe08a" stopOpacity="0.75" />
          <stop offset="0.5" stopColor="#ffb648" stopOpacity="0.12" />
          <stop offset="1" stopColor="#ffb648" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={id("fog")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#231763" />
          <stop offset="0.3" stopColor="#231763" stopOpacity="0.55" />
          <stop offset="0.62" stopColor="#231763" stopOpacity="0" />
          <stop offset="1" stopColor="#0a0726" stopOpacity="0.35" />
        </linearGradient>
      </defs>
      <rect
        x="-2000"
        y="0"
        width="5000"
        height="600"
        fill={`url(#${id("ground")})`}
      />
      <path d={FLOOR_PATH} fill={`url(#${id("tiles")})`} />
      <rect
        x="-2000"
        y="0"
        width="5000"
        height="600"
        fill={`url(#${id("fog")})`}
      />
      <rect
        x="-2000"
        y="-300"
        width="5000"
        height="800"
        fill={`url(#${id("glow")})`}
      />
      {/* Horizon line */}
      <rect
        x="-2000"
        y="0"
        width="5000"
        height="2.5"
        fill="#ffd86e"
        opacity="0.7"
      />
    </svg>
  )
}

/** The obsidian-and-gold fill shared by both giant pieces. */
function PieceDefs({ id }: { id: Id }) {
  return (
    <defs>
      <linearGradient id={id("stone")} x1="0" y1="0" x2="1" y2="0.35">
        <stop offset="0" stopColor="#5b47b8" />
        <stop offset="0.35" stopColor="#2a1f6e" />
        <stop offset="1" stopColor="#0c0828" />
      </linearGradient>
      <linearGradient id={id("rim")} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#fff1b0" />
        <stop offset="0.5" stopColor="#f5c04a" />
        <stop offset="1" stopColor="#b9740f" />
      </linearGradient>
    </defs>
  )
}

const STONE = (id: Id) => ({
  fill: `url(#${id("stone")})`,
  stroke: `url(#${id("rim")})`,
  strokeWidth: 4,
  strokeLinejoin: "round" as const,
})

/** The pedestal both pieces stand on (collar, flared foot, plinth), centred on `cx`. */
function Pedestal({ id, cx, top }: { id: Id; cx: number; top: number }) {
  const s = STONE(id)
  return (
    <g>
      <path
        d={`M${cx - 92} ${top + 56}c0-20 14-32 32-32h120c18 0 32 12 32 32z`}
        {...s}
      />
      <rect x={cx - 102} y={top + 52} width="204" height="20" rx="8" {...s} />
      <rect x={cx - 80} y={top} width="160" height="22" rx="9" {...s} />
    </g>
  )
}

function King({ id }: { id: Id }) {
  const s = STONE(id)
  return (
    <svg className="spl-chess-king" viewBox="-6 -40 232 412">
      {/* Cross, finial and the flared crown */}
      <path d="M101 0h18v20h18v16h-18v20h-18V36H83V20h18z" {...s} />
      <path d="M78 82c2-22 16-32 32-32s30 10 32 32z" {...s} />
      <path
        d="M74 146c-8-22-18-40-28-60 40-12 88-12 128 0-10 20-20 38-28 60z"
        {...s}
      />
      <rect x="58" y="140" width="104" height="20" rx="9" {...s} />
      {/* Body */}
      <path d="M78 160h64c2 58 12 100 34 134H44c22-34 32-76 34-134z" {...s} />
      <Pedestal id={id} cx={110} top={290} />
      {/* Highlights */}
      <path
        d="M90 172c-2 46-8 82-24 112"
        fill="none"
        stroke="#fff"
        strokeOpacity="0.28"
        strokeWidth="7"
        strokeLinecap="round"
      />
      <path
        d="M62 94c6 12 12 26 16 40"
        fill="none"
        stroke="#fff"
        strokeOpacity="0.3"
        strokeWidth="6"
        strokeLinecap="round"
      />
      <path
        d="M58 88c34-8 70-8 104 0"
        fill="none"
        stroke="#f5c04a"
        strokeOpacity="0.6"
        strokeWidth="3"
      />
      {/* The cross catches the light */}
      <g transform="translate(110 -16) scale(2.6)">
        <g className="spl-chess-glint">
          <Star />
        </g>
      </g>
    </svg>
  )
}

function Knight({ id }: { id: Id }) {
  const s = STONE(id)
  return (
    <svg className="spl-chess-knight" viewBox="0 0 240 372">
      <g className="spl-chess-bob">
        <path
          d="M78 282c-6-34 4-64 26-88-14 10-36 12-56 6l-14-10 10-12H26c-12-6-16-18-10-28 18-36 46-80 82-104l14-34 16 32c42 14 76 60 76 124 0 46-10 80-6 114z"
          {...s}
        />
        {/* Mane */}
        <path
          d="M136 66c30 14 48 46 50 92M128 88c22 14 34 38 36 68M118 112c14 12 20 28 22 46"
          fill="none"
          stroke="#f5c04a"
          strokeOpacity="0.55"
          strokeWidth="4"
          strokeLinecap="round"
        />
        {/* Eye, nostril, cheek */}
        <ellipse
          cx="82"
          cy="104"
          rx="10"
          ry="6"
          fill="#ffe7a0"
          transform="rotate(-38 82 104)"
        />
        <circle cx="30" cy="156" r="4.5" fill="#0b0726" />
        <path
          d="M70 146c14 6 26 18 30 34"
          fill="none"
          stroke="#f5c04a"
          strokeOpacity="0.5"
          strokeWidth="4"
          strokeLinecap="round"
        />
        <path
          d="M40 138c12-24 30-48 50-64"
          fill="none"
          stroke="#fff"
          strokeOpacity="0.3"
          strokeWidth="6"
          strokeLinecap="round"
        />
      </g>
      <Pedestal id={id} cx={124} top={278} />
    </svg>
  )
}

/** Crown, the chunky gold "CHESS" logotype and a ribbon underneath. */
function Title({ id }: { id: Id }) {
  const word = {
    x: 300,
    y: 262,
    textAnchor: "middle" as const,
    fontSize: 156,
    textLength: 536,
    lengthAdjust: "spacingAndGlyphs" as const,
    strokeLinejoin: "round" as const,
    paintOrder: "stroke",
  }
  const depth = 12
  // Both the face and its extrusion, so the outlines wrap the whole block
  const both = (props: React.SVGProps<SVGTextElement>) => (
    <>
      <text {...word} {...props} dy={depth}>
        CHESS
      </text>
      <text {...word} {...props}>
        CHESS
      </text>
    </>
  )
  return (
    <svg viewBox="0 0 600 410" className="spl-chess-logo">
      <defs>
        <linearGradient id={id("gold")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fffbe3" />
          <stop offset="0.36" stopColor="#ffe37e" />
          <stop offset="0.5" stopColor="#ffcb3d" />
          <stop offset="0.53" stopColor="#f6a821" />
          <stop offset="1" stopColor="#e37a06" />
        </linearGradient>
        <linearGradient id={id("deep")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#a8560a" />
          <stop offset="1" stopColor="#6b2f02" />
        </linearGradient>
        <linearGradient id={id("crown")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff6c8" />
          <stop offset="0.45" stopColor="#ffd34a" />
          <stop offset="0.5" stopColor="#f5a81f" />
          <stop offset="1" stopColor="#d27406" />
        </linearGradient>
        <linearGradient id={id("ribbon")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#9b5cff" />
          <stop offset="0.5" stopColor="#7434e0" />
          <stop offset="1" stopColor="#4c1ba6" />
        </linearGradient>
        <path id={id("arc")} d="M120 341Q300 315 480 341" />
      </defs>

      {/* Crown */}
      <g className="spl-chess-crown">
        <g transform="translate(0 6)" opacity="0.35">
          <path
            d="M228 128l-14-66 44 32 42-52 42 52 44-32-14 66z"
            fill="#000"
            stroke="#000"
            strokeWidth="18"
            strokeLinejoin="round"
          />
        </g>
        <path
          d="M228 128l-14-66 44 32 42-52 42 52 44-32-14 66z"
          fill={`url(#${id("crown")})`}
          stroke="#1c0b47"
          strokeWidth="9"
          strokeLinejoin="round"
          paintOrder="stroke"
        />
        <rect
          x="222"
          y="114"
          width="156"
          height="24"
          rx="10"
          fill={`url(#${id("deep")})`}
          stroke="#1c0b47"
          strokeWidth="8"
        />
        {[
          [214, 58],
          [300, 38],
          [386, 58],
        ].map(([cx, cy]) => (
          <circle
            key={cx}
            cx={cx}
            cy={cy}
            r="11"
            fill={`url(#${id("crown")})`}
            stroke="#1c0b47"
            strokeWidth="7"
          />
        ))}
        <circle
          cx="300"
          cy="126"
          r="7"
          fill="#ff3b6b"
          stroke="#1c0b47"
          strokeWidth="3"
        />
        <circle
          cx="262"
          cy="126"
          r="5"
          fill="#4fd1ff"
          stroke="#1c0b47"
          strokeWidth="3"
        />
        <circle
          cx="338"
          cy="126"
          r="5"
          fill="#4fd1ff"
          stroke="#1c0b47"
          strokeWidth="3"
        />
        <path
          d="M238 104l-6-28 16 12"
          fill="none"
          stroke="#fff"
          strokeOpacity="0.7"
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>

      {/* Logotype: shadow, gold rim, dark outline, extrusion, face */}
      <g className="spl-chess-word">
        <text
          {...word}
          dy={depth + 10}
          fill="#05031a"
          stroke="#05031a"
          strokeWidth="40"
          opacity="0.5"
        >
          CHESS
        </text>
        {both({ fill: "#f2c14e", stroke: "#f2c14e", strokeWidth: 36 })}
        {both({ fill: "#1c0b47", stroke: "#1c0b47", strokeWidth: 25 })}
        <text
          {...word}
          dy={depth}
          fill={`url(#${id("deep")})`}
          stroke={`url(#${id("deep")})`}
          strokeWidth="6"
        >
          CHESS
        </text>
        <text
          {...word}
          fill={`url(#${id("gold")})`}
          stroke="#fff3c0"
          strokeWidth="2"
        >
          CHESS
        </text>
      </g>

      {/* Ribbon */}
      <g>
        <path
          d="M118 334l-46 8 18 26-22 24 70-8z"
          fill="#3a1384"
          stroke="#1c0b47"
          strokeWidth="7"
          strokeLinejoin="round"
        />
        <path
          d="M482 334l46 8-18 26 22 24-70-8z"
          fill="#3a1384"
          stroke="#1c0b47"
          strokeWidth="7"
          strokeLinejoin="round"
        />
        <path
          d="M108 318Q300 290 492 318L494 372Q300 344 106 372z"
          fill={`url(#${id("ribbon")})`}
          stroke="#1c0b47"
          strokeWidth="8"
          strokeLinejoin="round"
        />
        <path
          d="M118 326Q300 299 482 326"
          fill="none"
          stroke="#f2c14e"
          strokeWidth="3"
          opacity="0.9"
        />
        <path
          d="M118 364Q300 337 482 364"
          fill="none"
          stroke="#f2c14e"
          strokeWidth="3"
          opacity="0.9"
        />
        <text
          fontSize="28"
          fontWeight="900"
          fill="#fff4c4"
          stroke="#1c0b47"
          strokeWidth="5"
          paintOrder="stroke"
          strokeLinejoin="round"
        >
          <textPath
            href={`#${id("arc")}`}
            startOffset="50%"
            textAnchor="middle"
            textLength="290"
            lengthAdjust="spacingAndGlyphs"
          >
            THE ROYAL GAME
          </textPath>
        </text>
      </g>
    </svg>
  )
}

const CSS = `
.spl-chess{position:relative;width:100%;height:100%;overflow:hidden;isolation:isolate;
  background:radial-gradient(130% 75% at 50% 26%,#6a49d1 0%,#3a259a 30%,#1d1460 58%,#0a0828 100%)}
.spl-chess>*{position:absolute}
.spl-chess-rays{left:50%;top:24%;width:240vmax;height:240vmax;margin:-120vmax 0 0 -120vmax;
  background:repeating-conic-gradient(from 0deg,rgba(255,216,120,.16) 0deg 6deg,rgba(255,216,120,0) 6deg 18deg);
  -webkit-mask-image:radial-gradient(closest-side,#000 0%,rgba(0,0,0,.55) 18%,transparent 42%);
  mask-image:radial-gradient(closest-side,#000 0%,rgba(0,0,0,.55) 18%,transparent 42%);
  animation:spl-chess-spin 80s linear infinite}
.spl-chess-floor{left:0;bottom:0;width:100%;overflow:visible;height:min(50%,calc(92.5% - min(90vw,540px,92vh)*.69))}
.spl-chess-twinkle{transform:translate(-50%,-50%);animation:spl-chess-twinkle 2.8s ease-in-out infinite}
.spl-chess-stage{left:50%;bottom:0;width:min(100%,72vh);height:100%;transform:translateX(-50%);pointer-events:none}
.spl-chess-stage>svg{position:absolute;width:auto;overflow:visible;filter:drop-shadow(0 1.2vh 1.4vh rgba(5,3,26,.6))}
.spl-chess-king{left:-12%;bottom:-3%;height:min(42%,112vw);aspect-ratio:232/412}
.spl-chess-knight{right:-9%;bottom:-3%;height:min(36%,96vw);aspect-ratio:240/372}
.spl-chess-glint{animation:spl-chess-twinkle 2.4s ease-in-out infinite;transform-box:fill-box;transform-origin:center}
.spl-chess-bob{animation:spl-chess-bob 3.2s ease-in-out infinite;transform-box:fill-box;transform-origin:50% 100%}
.spl-chess-title{left:50%;top:7.5%;width:min(90vw,540px,92vh);transform:translateX(-50%)}
.spl-chess-logo{display:block;width:100%;height:auto;overflow:visible;font-family:var(--font-inter),system-ui,sans-serif;font-weight:900;
  filter:drop-shadow(0 0 2.4vmin rgba(255,200,90,.35))}
.spl-chess-crown{animation:spl-chess-float 3.6s ease-in-out infinite}
.spl-chess-load{left:50%;bottom:10%;width:min(74vw,360px);transform:translateX(-50%);display:flex;flex-direction:column;align-items:center;gap:10px}
.spl-chess-bar{width:100%;height:26px;padding:3px;border-radius:999px;background:linear-gradient(#fbe29a,#c78a1c);
  box-shadow:0 0 0 3px #1c0b47,0 5px 0 3px rgba(5,3,26,.55),0 0 18px rgba(255,205,96,.45)}
.spl-chess-track{position:relative;width:100%;height:100%;overflow:hidden;border-radius:999px;background:#100a33;
  box-shadow:inset 0 3px 4px rgba(0,0,0,.7)}
.spl-chess-fill{position:relative;height:100%;overflow:hidden;border-radius:999px;transition:width .35s ease-out;
  background:linear-gradient(#fff3b0,#ffd23f 45%,#f39c12 55%,#e07b00);box-shadow:inset 0 -2px 0 rgba(120,50,0,.45)}
.spl-chess-stripes{position:absolute;inset:0;background:repeating-linear-gradient(-45deg,rgba(255,255,255,.34) 0 8px,rgba(255,255,255,0) 8px 16px);
  background-size:22.63px 100%;animation:spl-chess-stripes .7s linear infinite}
.spl-chess-gloss{position:absolute;left:6px;right:6px;top:2px;height:38%;border-radius:999px;background:rgba(255,255,255,.55)}
.spl-chess-loading{margin:0;font:900 13px/1 var(--font-inter),system-ui,sans-serif;letter-spacing:.28em;text-transform:uppercase;color:#ffe9a8;
  text-shadow:0 2px 0 #1c0b47,0 0 10px rgba(255,205,96,.5)}
@keyframes spl-chess-spin{to{transform:rotate(360deg)}}
@keyframes spl-chess-twinkle{0%,100%{opacity:.25;scale:.55}50%{opacity:1;scale:1}}
@keyframes spl-chess-bob{0%,100%{transform:translateY(0) rotate(0)}50%{transform:translateY(-1.5%) rotate(-1.2deg)}}
@keyframes spl-chess-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
@keyframes spl-chess-stripes{to{background-position:22.63px 0}}
@media (prefers-reduced-motion:reduce){.spl-chess *{animation:none!important}}
`
