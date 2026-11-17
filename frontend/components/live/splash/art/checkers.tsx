import * as React from "react"

import type { SplashArtProps } from "../types"

/**
 * Checkers: a warm wooden table under a sunburst. A red-and-black board runs
 * away in perspective, a red piece leaps over a black one, two crowned kings
 * (stacked pieces) stand guard in front, and a chunky red "CHECKERS"
 * logotype with a crown and a black ribbon sits up top. Vector only.
 */
export default function Splash({ progress }: SplashArtProps) {
  const uid = React.useId().replace(/[^\w-]/g, "")
  const id = (name: string) => `${uid}-${name}`
  const width = Math.min(Math.max(progress, 0.06), 1) * 100

  return (
    <div className="spl-checkers" aria-hidden>
      <style>{CSS}</style>
      <svg className="spl-checkers-defs" width="0" height="0">
        <PieceDefs id={id} />
      </svg>
      <Wood id={id} />
      <div className="spl-checkers-rays" />

      {/* Stray pieces tumbling in the air */}
      <svg
        className="spl-checkers-fly spl-checkers-fly-a"
        viewBox="-60 -60 120 120"
      >
        <g transform="rotate(-24)">
          <Disc id={id} x={0} y={16} r={44} k={0.42} color="red" />
        </g>
      </svg>
      <svg
        className="spl-checkers-fly spl-checkers-fly-b"
        viewBox="-60 -60 120 120"
      >
        <g transform="rotate(30)">
          <Disc id={id} x={0} y={16} r={44} k={0.5} color="black" />
        </g>
      </svg>

      <Table id={id} />

      <div className="spl-checkers-title">
        <Title id={id} />
      </div>

      <div className="spl-checkers-load">
        <div className="spl-checkers-bar">
          <div className="spl-checkers-track">
            <div className="spl-checkers-fill" style={{ width: `${width}%` }}>
              <div className="spl-checkers-stripes" />
              <div className="spl-checkers-gloss" />
            </div>
          </div>
        </div>
        <p className="spl-checkers-loading">Loading…</p>
      </div>
    </div>
  )
}

type Id = (name: string) => string
type Color = "red" | "black"

/** Vertical planks with a little grain, lit warm in the middle. */
function Wood({ id }: { id: Id }) {
  return (
    <svg className="spl-checkers-wood" preserveAspectRatio="none">
      <defs>
        {/* Three planks, each with its knot at a different height */}
        <pattern
          id={id("grain")}
          width="288"
          height="520"
          patternUnits="userSpaceOnUse"
        >
          {[0, 96, 192].map((x, i) => (
            <g key={x} transform={`translate(${x} 0)`}>
              <path
                d="M18 0c-6 70 8 120 2 260s6 140 0 260M44 0c6 60-6 150 2 250s-4 190 2 270M70 0c-4 90 8 160 0 270s4 150-2 250"
                fill="none"
                stroke="#5c2408"
                strokeOpacity="0.16"
                strokeWidth="2"
              />
              <ellipse
                cx={[58, 34, 62][i]}
                cy={[330, 90, 450][i]}
                rx="7"
                ry="16"
                fill="none"
                stroke="#5c2408"
                strokeOpacity="0.18"
                strokeWidth="2.5"
              />
              <rect
                x="93"
                y="0"
                width="3"
                height="520"
                fill="#4a1c05"
                fillOpacity="0.35"
              />
              <rect
                x="90"
                y="0"
                width="2"
                height="520"
                fill="#ffd9a8"
                fillOpacity="0.18"
              />
            </g>
          ))}
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id("grain")})`} />
    </svg>
  )
}

/* The board in perspective: the eye 12 squares above the table, the near edge
   10 squares away and the far edge 18, centred on x = 500. The scene's viewBox
   frames just the board and the two kings in front of it. */
const EYE = 12
const FOCAL = 700
const NEAR = 10
const project = (x: number, z: number) => ({
  x: 500 + (x * FOCAL) / z,
  y: (EYE * FOCAL) / z,
  /** Pixels per square here */
  s: FOCAL / z,
  /** How flat a round piece looks here (1 = seen straight down) */
  k: EYE / Math.hypot(EYE, z),
})
const pt = (x: number, z: number) => {
  const p = project(x, z)
  return `${p.x.toFixed(1)} ${p.y.toFixed(1)}`
}
/** Rows 0 (far) → 7 (near), columns 0 → 7; dark squares are where row + col is odd. */
const square = (row: number, col: number) =>
  project(col - 3.5, NEAR + 7.5 - row)
/** A quad on the table between x0 → x1 and z0 → z1. */
const quad = (x0: number, x1: number, z0: number, z1: number) =>
  `M${pt(x0, z1)}L${pt(x1, z1)}L${pt(x1, z0)}L${pt(x0, z0)}z`

const BOARD_DARK = (() => {
  let d = ""
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      if ((row + col) % 2 === 0) continue
      d += quad(col - 4, col - 3, NEAR + 7 - row, NEAR + 8 - row)
    }
  }
  return d
})()

const ON_BOARD: [number, number, Color][] = [
  [0, 1, "black"],
  [0, 5, "black"],
  [1, 2, "black"],
  [1, 6, "black"],
  [2, 5, "black"],
  [4, 3, "black"],
  [5, 6, "red"],
  [6, 1, "red"],
  [6, 5, "red"],
]

function Table({ id }: { id: Id }) {
  const from = square(5, 2)
  const over = square(4, 3)
  const to = square(3, 4)
  const lift = over.s * 1.7
  const frameNear = project(4.55, NEAR - 0.45)
  return (
    <svg className="spl-checkers-table" viewBox="170 430 660 500">
      <defs>
        <linearGradient id={id("frame")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8a4419" />
          <stop offset="1" stopColor="#4a1d06" />
        </linearGradient>
        <linearGradient id={id("red-sq")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#b8261d" />
          <stop offset="1" stopColor="#e2402f" />
        </linearGradient>
        <linearGradient id={id("dark-sq")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#14121a" />
          <stop offset="1" stopColor="#2c2733" />
        </linearGradient>
      </defs>

      {/* Shadow, front edge and top of the frame, then the squares */}
      <path
        d={quad(-4.55, 4.55, NEAR - 0.45, NEAR + 8.4)}
        fill="#2a0b02"
        opacity="0.35"
        transform="translate(0 30)"
      />
      <path
        d={`M${1000 - frameNear.x} ${frameNear.y}H${frameNear.x}v24H${1000 - frameNear.x}z`}
        fill="#3a1503"
        stroke="#2a0f02"
        strokeWidth="4"
        strokeLinejoin="round"
      />
      <path
        d={quad(-4.55, 4.55, NEAR - 0.45, NEAR + 8.4)}
        fill={`url(#${id("frame")})`}
        stroke="#2a0f02"
        strokeWidth="4"
        strokeLinejoin="round"
      />
      <path
        d={quad(-4, 4, NEAR, NEAR + 8)}
        fill={`url(#${id("red-sq")})`}
        stroke="#2a0f02"
        strokeWidth="3"
      />
      <path d={BOARD_DARK} fill={`url(#${id("dark-sq")})`} />
      <path
        d={`M${pt(-4.5, NEAR + 8.33)}L${pt(4.5, NEAR + 8.33)}`}
        stroke="#ffcf94"
        strokeOpacity="0.45"
        strokeWidth="3"
      />

      {ON_BOARD.map(([row, col, color]) => {
        const p = square(row, col)
        return (
          <Disc
            key={`${row}-${col}`}
            id={id}
            x={p.x}
            y={p.y + p.s * 0.12}
            r={p.s * 0.4}
            k={p.k}
            color={color}
          />
        )
      })}

      {/* The jump: a dotted arc from the red piece's square, over the black
          piece, to the empty square beyond */}
      <path
        d={`M${from.x} ${from.y}Q${over.x} ${over.y - lift * 2} ${to.x} ${to.y}`}
        fill="none"
        stroke="#fff3d6"
        strokeWidth="5"
        strokeLinecap="round"
        strokeDasharray="0.1 13"
      />
      <ellipse
        cx={to.x}
        cy={to.y}
        rx={to.s * 0.42}
        ry={to.s * 0.42 * to.k}
        fill="#fff3d6"
        fillOpacity="0.15"
        stroke="#fff3d6"
        strokeWidth="3"
        strokeDasharray="7 6"
      />
      {/* Its shadow on the piece it is jumping */}
      <ellipse
        cx={over.x}
        cy={over.y - over.s * 0.12}
        rx={over.s * 0.36}
        ry={over.s * 0.36 * over.k}
        fill="#1a0602"
        opacity="0.35"
        className="spl-checkers-hop-shadow"
      />
      <g className="spl-checkers-hop">
        <Disc
          id={id}
          x={over.x}
          y={over.y - lift}
          r={over.s * 0.47}
          k={over.k}
          color="red"
          shadow={false}
        />
      </g>

      {/* Two crowned kings up front */}
      <g className="spl-checkers-king-a">
        <King id={id} x={258} y={904} r={90} color="red" />
      </g>
      <g className="spl-checkers-king-b">
        <King id={id} x={744} y={910} r={84} color="black" />
      </g>
    </svg>
  )
}

const PIECE = {
  red: {
    top: "#ff6a55",
    topTo: "#d8261b",
    side: "#a3160e",
    ring: "#ffb3a6",
    rim: "#5e0904",
  },
  black: {
    top: "#5a5d70",
    topTo: "#24252f",
    side: "#121219",
    ring: "#9aa0b8",
    rim: "#06060a",
  },
}

function PieceDefs({ id }: { id: Id }) {
  return (
    <defs>
      {(["red", "black"] as const).map((c) => (
        <React.Fragment key={c}>
          <radialGradient id={id(`${c}-top`)} cx="0.38" cy="0.3" r="0.8">
            <stop offset="0" stopColor={PIECE[c].top} />
            <stop offset="1" stopColor={PIECE[c].topTo} />
          </radialGradient>
          <linearGradient id={id(`${c}-side`)} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor={PIECE[c].rim} />
            <stop offset="0.35" stopColor={PIECE[c].side} />
            <stop offset="0.6" stopColor={PIECE[c].side} />
            <stop offset="1" stopColor={PIECE[c].rim} />
          </linearGradient>
        </React.Fragment>
      ))}
      <linearGradient id={id("gold")} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#fff6c8" />
        <stop offset="0.45" stopColor="#ffd34a" />
        <stop offset="0.5" stopColor="#f5a81f" />
        <stop offset="1" stopColor="#d27406" />
      </linearGradient>
    </defs>
  )
}

/** A piece is about a third as tall as it is wide; the steeper the view, the less of its edge shows. */
const thick = (r: number, k: number) => r * 0.4 * Math.sqrt(1 - k * k)

/**
 * One piece seen from above at an angle: its base sits at (x, y), r is its
 * radius, k how flat its top looks (1 = straight down), with a fluted edge.
 */
function Disc({
  id,
  x,
  y,
  r,
  k,
  color,
  shadow = true,
}: {
  id: Id
  x: number
  y: number
  r: number
  k: number
  color: Color
  shadow?: boolean
}) {
  const ry = r * k
  const t = thick(r, k)
  const ink = PIECE[color].rim
  const flutes = []
  for (let i = 1; i < 12; i++) {
    const a = (i / 12) * Math.PI
    const fx = x - r * Math.cos(a)
    const fy = y + ry * Math.sin(a)
    flutes.push(
      `M${fx.toFixed(1)} ${(fy - t * 0.85).toFixed(1)}V${(fy - t * 0.15).toFixed(1)}`
    )
  }
  return (
    <g>
      {shadow && (
        <ellipse
          cx={x + r * 0.08}
          cy={y + ry * 0.18}
          rx={r * 1.06}
          ry={ry * 1.1}
          fill="#1a0602"
          opacity="0.4"
        />
      )}
      <path
        d={`M${x - r} ${y - t}V${y}A${r} ${ry} 0 0 0 ${x + r} ${y}V${y - t}z`}
        fill={`url(#${id(`${color}-side`)})`}
        stroke={ink}
        strokeWidth={r * 0.05}
      />
      <path
        d={flutes.join("")}
        stroke={ink}
        strokeOpacity="0.45"
        strokeWidth={r * 0.045}
        strokeLinecap="round"
      />
      <ellipse
        cx={x}
        cy={y - t}
        rx={r}
        ry={ry}
        fill={`url(#${id(`${color}-top`)})`}
        stroke={ink}
        strokeWidth={r * 0.05}
      />
      <ellipse
        cx={x}
        cy={y - t}
        rx={r * 0.72}
        ry={ry * 0.72}
        fill="none"
        stroke={PIECE[color].ring}
        strokeOpacity="0.7"
        strokeWidth={r * 0.06}
      />
      <ellipse
        cx={x}
        cy={y - t}
        rx={r * 0.42}
        ry={ry * 0.42}
        fill="none"
        stroke={PIECE[color].ring}
        strokeOpacity="0.45"
        strokeWidth={r * 0.05}
      />
      <ellipse
        cx={x - r * 0.38}
        cy={y - t - ry * 0.42}
        rx={r * 0.3}
        ry={ry * 0.2}
        fill="#fff"
        opacity="0.4"
        transform={`rotate(-14 ${x - r * 0.38} ${y - t - ry * 0.42})`}
      />
    </g>
  )
}

/** Two pieces stacked with a gold crown on top. */
function King({
  id,
  x,
  y,
  r,
  color,
}: {
  id: Id
  x: number
  y: number
  r: number
  color: Color
}) {
  const k = 0.5
  const t = thick(r, k)
  return (
    <g>
      <Disc id={id} x={x} y={y} r={r} k={k} color={color} />
      <Disc id={id} x={x} y={y - t} r={r} k={k} color={color} shadow={false} />
      <g
        transform={`translate(${x} ${y - t * 2 + r * k * 0.12}) scale(${r / 70})`}
      >
        <Crown id={id} />
      </g>
    </g>
  )
}

/** A gold crown about 110 units wide, standing on the origin. */
function Crown({ id }: { id: Id }) {
  const ink = "#3a1503"
  return (
    <g>
      <path
        d="M-44 0l-12-54 30 24 26-42 26 42 30-24-12 54z"
        fill="#000"
        opacity="0.3"
        transform="translate(4 6)"
      />
      <path
        d="M-44 0l-12-54 30 24 26-42 26 42 30-24-12 54z"
        fill={`url(#${id("gold")})`}
        stroke={ink}
        strokeWidth="6"
        strokeLinejoin="round"
      />
      <rect
        x="-48"
        y="-12"
        width="96"
        height="18"
        rx="7"
        fill="#c9780c"
        stroke={ink}
        strokeWidth="5"
      />
      {[
        [-56, -54],
        [0, -72],
        [56, -54],
      ].map(([cx, cy]) => (
        <circle
          key={cx}
          cx={cx}
          cy={cy}
          r="8"
          fill={`url(#${id("gold")})`}
          stroke={ink}
          strokeWidth="4.5"
        />
      ))}
      <circle
        cx="0"
        cy="-3"
        r="5.5"
        fill="#ff3b5c"
        stroke={ink}
        strokeWidth="2.5"
      />
      <circle
        cx="-26"
        cy="-3"
        r="4"
        fill="#3ddc97"
        stroke={ink}
        strokeWidth="2.5"
      />
      <circle
        cx="26"
        cy="-3"
        r="4"
        fill="#3ddc97"
        stroke={ink}
        strokeWidth="2.5"
      />
      <path
        d="M-38-14l-6-26 14 10"
        fill="none"
        stroke="#fff"
        strokeOpacity="0.75"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </g>
  )
}

/** The chunky red "CHECKERS" on a gentle arch, a crown on the C, and a black ribbon. */
function Title({ id }: { id: Id }) {
  const depth = 11
  const word = (props: React.SVGProps<SVGTextElement>, dy = 0) => (
    <text
      transform={`translate(0 ${dy})`}
      strokeLinejoin="round"
      paintOrder="stroke"
      {...props}
    >
      <textPath
        href={`#${id("arch")}`}
        startOffset="50%"
        textAnchor="middle"
        textLength="588"
        lengthAdjust="spacingAndGlyphs"
      >
        CHECKERS
      </textPath>
    </text>
  )
  const both = (props: React.SVGProps<SVGTextElement>) => (
    <>
      {word(props, depth)}
      {word(props)}
    </>
  )
  return (
    <svg viewBox="0 0 640 400" className="spl-checkers-logo">
      <defs>
        <path id={id("arch")} d="M20 254Q320 206 620 254" />
        <path id={id("band")} d="M150 337Q320 318 490 337" />
        <linearGradient id={id("face")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffe3d6" />
          <stop offset="0.3" stopColor="#ff7a62" />
          <stop offset="0.52" stopColor="#f2402c" />
          <stop offset="0.55" stopColor="#d9281b" />
          <stop offset="1" stopColor="#a8150c" />
        </linearGradient>
        <linearGradient id={id("deep")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#7c0f08" />
          <stop offset="1" stopColor="#4a0602" />
        </linearGradient>
        <linearGradient id={id("ribbon")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#4a4452" />
          <stop offset="0.5" stopColor="#2a2630" />
          <stop offset="1" stopColor="#141218" />
        </linearGradient>
      </defs>

      {/* Logotype: shadow, cream rim, dark outline, extrusion, face */}
      <g fontSize="132">
        {word(
          {
            fill: "#2a0b02",
            stroke: "#2a0b02",
            strokeWidth: 40,
            opacity: 0.45,
          },
          depth + 10
        )}
        {both({ fill: "#fff1d6", stroke: "#fff1d6", strokeWidth: 36 })}
        {both({ fill: "#2a0b02", stroke: "#2a0b02", strokeWidth: 24 })}
        {word(
          {
            fill: `url(#${id("deep")})`,
            stroke: `url(#${id("deep")})`,
            strokeWidth: 6,
          },
          depth
        )}
        {word({
          fill: `url(#${id("face")})`,
          stroke: "#ffc4b5",
          strokeWidth: 1.5,
        })}
      </g>

      {/* Crown on the C */}
      <g className="spl-checkers-crown">
        <g transform="translate(92 152) rotate(-16) scale(0.95)">
          <Crown id={id} />
        </g>
      </g>

      {/* Ribbon */}
      <g strokeLinejoin="round">
        <path
          d="M146 328l-50 6 18 26-24 24 74-6z"
          fill="#18151c"
          stroke="#2a0b02"
          strokeWidth="7"
        />
        <path
          d="M494 328l50 6-18 26 24 24-74-6z"
          fill="#18151c"
          stroke="#2a0b02"
          strokeWidth="7"
        />
        <path
          d="M136 310Q320 284 504 310L506 364Q320 338 134 364z"
          fill={`url(#${id("ribbon")})`}
          stroke="#2a0b02"
          strokeWidth="8"
        />
        <path
          d="M146 318Q320 293 494 318M146 356Q320 331 494 356"
          fill="none"
          stroke="#f2c14e"
          strokeWidth="3"
          opacity="0.9"
        />
        <text
          fontSize="22"
          fontWeight="900"
          fill="#ffe9b0"
          stroke="#100d12"
          strokeWidth="4"
          paintOrder="stroke"
        >
          <textPath
            href={`#${id("band")}`}
            startOffset="50%"
            textAnchor="middle"
            textLength="300"
            lengthAdjust="spacingAndGlyphs"
          >
            JUMP • CAPTURE • CROWN
          </textPath>
        </text>
      </g>
    </svg>
  )
}

const CSS = `
.spl-checkers{position:relative;width:100%;height:100%;overflow:hidden;isolation:isolate;
  background:radial-gradient(120% 70% at 50% 30%,#ffb35c 0%,#e07a33 32%,#b9531f 62%,#6e2a0b 100%)}
.spl-checkers>*{position:absolute}
.spl-checkers-wood{inset:0;width:100%;height:100%}
.spl-checkers-rays{left:50%;top:27%;width:240vmax;height:240vmax;margin:-120vmax 0 0 -120vmax;
  background:repeating-conic-gradient(from 4deg,rgba(255,240,200,.22) 0deg 7deg,rgba(255,240,200,0) 7deg 20deg);
  -webkit-mask-image:radial-gradient(closest-side,#000 0%,rgba(0,0,0,.5) 18%,transparent 40%);
  mask-image:radial-gradient(closest-side,#000 0%,rgba(0,0,0,.5) 18%,transparent 40%);
  animation:spl-checkers-spin 90s linear infinite}
.spl-checkers-table{left:50%;bottom:15%;height:min(calc(100vw*500/660),calc(77vh - min(92vw,560px,60vh)*.6));width:auto;aspect-ratio:660/500;transform:translateX(-50%);overflow:visible}
.spl-checkers-fly{width:min(17vw,17vh);height:auto;overflow:visible;filter:drop-shadow(0 1vh 1vh rgba(60,15,0,.35));
  animation:spl-checkers-float 4s ease-in-out infinite}
.spl-checkers-fly-a{left:max(4%,calc(50% - 64vh));top:44%;rotate:-8deg}
.spl-checkers-fly-b{right:max(5%,calc(50% - 62vh));top:40%;rotate:10deg;animation-delay:-2s}
.spl-checkers-hop{animation:spl-checkers-hop 1.6s ease-in-out infinite;transform-box:fill-box;transform-origin:50% 100%}
.spl-checkers-hop-shadow{animation:spl-checkers-shade 1.6s ease-in-out infinite;transform-box:fill-box;transform-origin:center}
.spl-checkers-king-a,.spl-checkers-king-b{animation:spl-checkers-bob 3.4s ease-in-out infinite}
.spl-checkers-king-b{animation-delay:-1.7s}
.spl-checkers-title{left:50%;top:6%;width:min(92vw,560px,60vh);transform:translateX(-50%)}
.spl-checkers-logo{display:block;width:100%;height:auto;overflow:visible;font-family:var(--font-inter),system-ui,sans-serif;font-weight:900;
  filter:drop-shadow(0 0 2.4vmin rgba(255,226,170,.45))}
.spl-checkers-crown{animation:spl-checkers-tilt 3s ease-in-out infinite;transform-box:fill-box;transform-origin:50% 100%}
.spl-checkers-load{left:50%;bottom:6.5%;width:min(74vw,360px);transform:translateX(-50%);display:flex;flex-direction:column;align-items:center;gap:10px}
.spl-checkers-bar{width:100%;height:26px;padding:3px;border-radius:999px;background:linear-gradient(#fff4dc,#e7c48c);
  box-shadow:0 0 0 3px #2a0b02,0 5px 0 3px rgba(42,11,2,.55)}
.spl-checkers-track{position:relative;width:100%;height:100%;overflow:hidden;border-radius:999px;background:#2b1208;
  box-shadow:inset 0 3px 4px rgba(0,0,0,.7)}
.spl-checkers-fill{position:relative;height:100%;overflow:hidden;border-radius:999px;transition:width .35s ease-out;
  background:linear-gradient(#d4ff8a,#7bdc2c 45%,#45b21a 55%,#2f8f10);box-shadow:inset 0 -2px 0 rgba(20,70,0,.45)}
.spl-checkers-stripes{position:absolute;inset:0;background:repeating-linear-gradient(-45deg,rgba(255,255,255,.3) 0 8px,rgba(255,255,255,0) 8px 16px);
  background-size:22.63px 100%;animation:spl-checkers-stripes .7s linear infinite}
.spl-checkers-gloss{position:absolute;left:6px;right:6px;top:2px;height:38%;border-radius:999px;background:rgba(255,255,255,.55)}
.spl-checkers-loading{margin:0;font:900 13px/1 var(--font-inter),system-ui,sans-serif;letter-spacing:.28em;text-transform:uppercase;color:#fff4dc;
  text-shadow:0 2px 0 #2a0b02,0 0 8px rgba(42,11,2,.6)}
@keyframes spl-checkers-spin{to{transform:rotate(360deg)}}
@keyframes spl-checkers-float{0%,100%{transform:translateY(0) rotate(0)}50%{transform:translateY(-1.6vh) rotate(8deg)}}
@keyframes spl-checkers-hop{0%,100%{transform:translateY(0) rotate(-4deg)}50%{transform:translateY(-14%) rotate(4deg)}}
@keyframes spl-checkers-bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
@keyframes spl-checkers-shade{0%,100%{transform:scale(1);opacity:.35}50%{transform:scale(.75);opacity:.2}}
@keyframes spl-checkers-tilt{0%,100%{transform:rotate(0)}50%{transform:rotate(5deg)}}
@keyframes spl-checkers-stripes{to{background-position:22.63px 0}}
@media (prefers-reduced-motion:reduce){.spl-checkers *{animation:none!important}}
`
