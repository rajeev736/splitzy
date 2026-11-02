/**
 * Avatar frame artwork for the Cute and Love sets.
 *
 * Each draw returns SVG children for a 200x200 viewBox, painted on top of a
 * round photo centred at (100,100) with r=60. The ring covers r≈57.5–70.5;
 * ears, bows, wings and clouds reach out towards the edges. Every paint
 * server / filter id goes through `id()` so many frames can share one page.
 */
import type React from "react"
import type { FrameId } from "@/lib/fun/catalog"

export type FrameDraw = (p: { id: (name: string) => string }) => React.ReactElement

type Pt = [number, number]
type Stops = [number, string, number?][]

/* ── Geometry helpers ─────────────────────────────────────────────────── */

const r2 = (n: number) => Math.round(n * 100) / 100
const rad = (d: number) => (d * Math.PI) / 180
/** Point at radius r, angle a in degrees clockwise from 12 o'clock. */
const pt = (r: number, a: number, cx = 100, cy = 100): Pt => [
  r2(cx + r * Math.sin(rad(a))),
  r2(cy - r * Math.cos(rad(a))),
]
const f = (p: Pt) => `${p[0]} ${p[1]}`
const url = (s: string) => `url(#${s})`
const MIRROR = "matrix(-1 0 0 1 200 0)"

/** Clockwise arc along the circle centred at (100,100). */
const arc = (r: number, a0: number, a1: number) => {
  const sweep = (((a1 - a0) % 360) + 360) % 360
  return `M${f(pt(r, a0))}A${r} ${r} 0 ${sweep > 180 ? 1 : 0} 1 ${f(pt(r, a1))}`
}

/** Heart centred near (cx,cy); s is half its width. Point faces down. */
const heart = (cx: number, cy: number, s: number) => {
  const p = (x: number, y: number) => `${r2(cx + x * s)} ${r2(cy + y * s)}`
  return (
    `M${p(0, 0.86)}C${p(-0.16, 0.72)} ${p(-1, 0.22)} ${p(-1, -0.3)}` +
    `C${p(-1, -0.72)} ${p(-0.7, -0.96)} ${p(-0.46, -0.96)}` +
    `C${p(-0.22, -0.96)} ${p(-0.06, -0.84)} ${p(0, -0.62)}` +
    `C${p(0.06, -0.84)} ${p(0.22, -0.96)} ${p(0.46, -0.96)}` +
    `C${p(0.7, -0.96)} ${p(1, -0.72)} ${p(1, -0.3)}` +
    `C${p(1, 0.22)} ${p(0.16, 0.72)} ${p(0, 0.86)}Z`
  )
}

/** Four-point twinkle. */
const sparkle = (cx: number, cy: number, r: number) => {
  const k = r * 0.16
  return (
    `M${r2(cx)} ${r2(cy - r)}Q${r2(cx + k)} ${r2(cy - k)} ${r2(cx + r)} ${r2(cy)}` +
    `Q${r2(cx + k)} ${r2(cy + k)} ${r2(cx)} ${r2(cy + r)}` +
    `Q${r2(cx - k)} ${r2(cy + k)} ${r2(cx - r)} ${r2(cy)}` +
    `Q${r2(cx - k)} ${r2(cy - k)} ${r2(cx)} ${r2(cy - r)}Z`
  )
}

/* ── Paint helpers ────────────────────────────────────────────────────── */

const stopsOf = (stops: Stops) =>
  stops.map(([o, c, op], i) => <stop key={i} offset={o} stopColor={c} stopOpacity={op ?? 1} />)

/** Linear gradient in user space. */
const lin = (gid: string, stops: Stops, x1: number, y1: number, x2: number, y2: number) => (
  <linearGradient id={gid} gradientUnits="userSpaceOnUse" x1={x1} y1={y1} x2={x2} y2={y2}>
    {stopsOf(stops)}
  </linearGradient>
)
/** Linear gradient across the shape's own box (top to bottom by default). */
const box = (gid: string, stops: Stops, x1 = 0, y1 = 0, x2 = 0, y2 = 1) => (
  <linearGradient id={gid} x1={x1} y1={y1} x2={x2} y2={y2}>
    {stopsOf(stops)}
  </linearGradient>
)
/** Radial gradient across the shape's own box, lit from the upper left. */
const ball = (gid: string, stops: Stops, fx = 0.35, fy = 0.3, r = 0.7) => (
  <radialGradient id={gid} cx={fx} cy={fy} r={r} fx={fx} fy={fy}>
    {stopsOf(stops)}
  </radialGradient>
)
/** Radial gradient in user space (glows). */
const glow = (gid: string, cx: number, cy: number, r: number, color: string, op = 0.6) => (
  <radialGradient id={gid} gradientUnits="userSpaceOnUse" cx={cx} cy={cy} r={r}>
    <stop offset={0} stopColor={color} stopOpacity={op} />
    <stop offset={0.45} stopColor={color} stopOpacity={op * 0.4} />
    <stop offset={1} stopColor={color} stopOpacity={0} />
  </radialGradient>
)

const shadow = (gid: string, dy = 1.2, sd = 1.1, op = 0.3) => (
  <filter id={gid} x="-10%" y="-10%" width="120%" height="125%" colorInterpolationFilters="sRGB">
    <feDropShadow dx={0} dy={dy} stdDeviation={sd} floodColor="#1a0614" floodOpacity={op} />
  </filter>
)

/* ── Shared pieces ────────────────────────────────────────────────────── */

interface BandOpts {
  stops: Stops
  edge: string
  inner: string
  /** Colour of the soft shade along the bottom (defaults to `inner`). */
  shade?: string
  r?: number
  w?: number
  gloss?: number
}

/**
 * The main ring: a gradient band with a dark rim on both edges, a glossy
 * highlight along the top left and a soft shade along the bottom.
 */
function band(gid: string, { stops, edge, inner, shade, r = 64, w = 13, gloss = 0.55 }: BandOpts) {
  return (
    <g>
      <defs>{lin(gid, stops, 0, 100 - r - w / 2, 0, 100 + r + w / 2)}</defs>
      <circle cx={100} cy={100} r={r} fill="none" stroke={url(gid)} strokeWidth={w} />
      <circle cx={100} cy={100} r={r + w / 2} fill="none" stroke={edge} strokeWidth={1.6} />
      <circle cx={100} cy={100} r={r - w / 2} fill="none" stroke={inner} strokeWidth={1.6} />
      <path
        d={arc(r + w * 0.2, 285, 395)}
        fill="none"
        stroke="#fff"
        strokeOpacity={gloss}
        strokeWidth={w * 0.24}
        strokeLinecap="round"
      />
      <path
        d={arc(r - w * 0.18, 120, 240)}
        fill="none"
        stroke={shade ?? inner}
        strokeOpacity={0.22}
        strokeWidth={w * 0.3}
        strokeLinecap="round"
      />
    </g>
  )
}

/** Soft inner shade where the ring meets the photo. */
const innerShade = (r = 57.5) => (
  <circle cx={100} cy={100} r={r - 1} fill="none" stroke="#000" strokeOpacity={0.14} strokeWidth={2} />
)

/** Bow centred on its knot at (0,0), about 76 wide. Optional tails. */
function bow(
  fill: string,
  dark: string,
  outline: string,
  knot: string,
  tails = true,
  sheen = 0.7,
) {
  const loopL = "M-4 -3C-13 -17 -33 -24 -37 -9C-40 4 -23 10 -4 4Z"
  const foldL = "M-4 -1C-11 -8 -21 -9 -25 -3C-20 2 -11 3 -4 3Z"
  const tailL = "M-3 3C-17 6 -34 10 -51 24L-59 35L-52 34L-49 44C-40 27 -22 15 -1 11Z"
  return (
    <g strokeLinejoin="round">
      {tails && (
        <g>
          <path d={tailL} fill={fill} stroke={outline} strokeWidth={1.6} />
          <path d={tailL} transform="scale(-1 1)" fill={fill} stroke={outline} strokeWidth={1.6} />
          <path d="M-6 8C-20 11 -34 17 -46 29" fill="none" stroke="#000" strokeOpacity={0.14} strokeWidth={3} strokeLinecap="round" />
          <path d="M6 8C20 11 34 17 46 29" fill="none" stroke="#000" strokeOpacity={0.14} strokeWidth={3} strokeLinecap="round" />
        </g>
      )}
      <path d={loopL} fill={fill} stroke={outline} strokeWidth={1.8} />
      <path d={loopL} transform="scale(-1 1)" fill={fill} stroke={outline} strokeWidth={1.8} />
      <path d={foldL} fill={dark} />
      <path d={foldL} transform="scale(-1 1)" fill={dark} />
      <path d="M-31 -11C-30 -17 -22 -18 -15 -13" fill="none" stroke="#fff" strokeOpacity={sheen} strokeWidth={2.4} strokeLinecap="round" />
      <path d="M31 -11C30 -17 22 -18 15 -13" fill="none" stroke="#fff" strokeOpacity={sheen * 0.7} strokeWidth={2.4} strokeLinecap="round" />
      <rect x={-6.5} y={-7.5} width={13} height={14} rx={4.5} fill={knot} stroke={outline} strokeWidth={1.8} />
      <path d="M-3 -4.5Q0 -5.5 3 -4.5" fill="none" stroke="#fff" strokeOpacity={sheen} strokeWidth={1.8} strokeLinecap="round" />
    </g>
  )
}

/** Shapes drawn as a stack of circles with a single outer outline. */
function puff(circles: [number, number, number][], body: string, shade: string, line: string, lw = 1.8) {
  return (
    <g>
      {circles.map(([x, y, r], i) => (
        <circle key={`o${i}`} cx={x} cy={y} r={r + lw} fill={line} />
      ))}
      {circles.map(([x, y, r], i) => (
        <circle key={`s${i}`} cx={x} cy={y} r={r} fill={shade} />
      ))}
      {circles.map(([x, y, r], i) => (
        <circle key={`b${i}`} cx={x - r * 0.08} cy={y - r * 0.16} r={r * 0.86} fill={body} />
      ))}
    </g>
  )
}

/** Five-petal flower. */
function flower(cx: number, cy: number, R: number, petal: string, line: string, centre: string, rot = 0) {
  return (
    <g transform={`translate(${cx} ${cy}) rotate(${rot})`}>
      {[0, 72, 144, 216, 288].map((a) => (
        <ellipse
          key={a}
          cx={0}
          cy={-R * 0.52}
          rx={R * 0.42}
          ry={R * 0.54}
          transform={`rotate(${a})`}
          fill={petal}
          stroke={line}
          strokeWidth={0.9}
        />
      ))}
      <circle r={R * 0.3} fill={centre} stroke="#d98a1c" strokeWidth={0.8} />
      <circle cx={-R * 0.09} cy={-R * 0.1} r={R * 0.1} fill="#fff" fillOpacity={0.8} />
    </g>
  )
}

/** Leaf pointing up from (0,0). */
const LEAF = "M0 0C4.6 -3.4 5 -9.4 0 -14C-5 -9.4 -4.6 -3.4 0 0Z"

/** Rose seen from above, centred at (cx,cy). */
function rose(cx: number, cy: number, R: number, g: { petal: string; cup: string }, rot = 0) {
  const k = R / 10
  return (
    <g transform={`translate(${cx} ${cy}) rotate(${rot}) scale(${r2(k)})`}>
      {[0, 72, 144, 216, 288].map((a) => (
        <circle key={a} cx={0} cy={-5.2} r={5.6} transform={`rotate(${a})`} fill={g.petal} stroke="#4d0412" strokeWidth={1} />
      ))}
      <circle r={6.6} fill={g.cup} stroke="#5c0716" strokeWidth={0.9} />
      <path d="M-5.6 1.5C-5.5 -4.5 1 -7 5 -3.4" fill="none" stroke="#ff8aa0" strokeOpacity={0.75} strokeWidth={1.1} strokeLinecap="round" />
      <path d="M5.2 0.5C5 5 -1 7 -4.6 3.6" fill="none" stroke="#5c0716" strokeWidth={1} strokeLinecap="round" />
      <path d="M-3.6 1C-3.6 -2.8 1.8 -4 3.3 -0.6C4.3 2.4 0.6 4.3 -1.6 2.6" fill="none" stroke="#5c0716" strokeWidth={1} strokeLinecap="round" />
      <path d="M-1.2 0.6C-1.2 -1.4 1.6 -1.6 1.6 0.4" fill="none" stroke="#5c0716" strokeWidth={0.9} strokeLinecap="round" />
      <ellipse cx={-2.6} cy={-3.4} rx={1.6} ry={0.9} transform="rotate(-30 -2.6 -3.4)" fill="#fff" fillOpacity={0.55} />
    </g>
  )
}

/* ── Frames ───────────────────────────────────────────────────────────── */

export const CUTE_LOVE_FRAMES: Partial<Record<FrameId, FrameDraw>> = {
  /* ── Cute ── */

  bunny: ({ id }) => {
    const ear = (x: number, y: number, rot: number, len: number) => (
      <g transform={`translate(${x} ${y}) rotate(${rot})`}>
        <path
          d={`M-13 3C-21 -14 -17 ${-len} 0 ${-len}C17 ${-len} 21 -14 13 3Z`}
          fill={url(id("ear"))}
          stroke="#e49bbb"
          strokeWidth={2}
        />
        <path
          d={`M-6.6 1C-10.8 -12 -9.2 ${-len + 8} 0 ${-len + 8}C9.2 ${-len + 8} 10.8 -12 6.6 1Z`}
          fill={url(id("earIn"))}
        />
        <path
          d={`M-4.6 -10C-5.4 -18 -4.4 ${-len + 14} -1.2 ${-len + 11}`}
          fill="none"
          stroke="#fff"
          strokeOpacity={0.7}
          strokeWidth={1.8}
          strokeLinecap="round"
        />
      </g>
    )
    return (
      <>
        <defs>
          {box(id("ear"), [[0, "#ffffff"], [0.7, "#fff4f8"], [1, "#fbd9e7"]])}
          {box(id("earIn"), [[0, "#ffd2e2"], [0.55, "#ffa9c7"], [1, "#ff8db5"]])}
          {shadow(id("sh"))}
        </defs>
        <g filter={url(id("sh"))}>
          {ear(...pt(63, -26), -19, 41)}
          {ear(...pt(63, 25), 16, 40)}
          {band(id("ring"), {
            stops: [[0, "#ffe9f3"], [0.5, "#ffc8df"], [1, "#e6c3f3"]],
            edge: "#e6a0c0",
            inner: "#d793b8",
            gloss: 0.8,
          })}
          {[0, 30, 60, 90, 120, 150, 210, 240, 270, 300, 330].map((a) => {
            const [x, y] = pt(64, a)
            return <circle key={a} cx={x} cy={y} r={2.1} fill="#fff" fillOpacity={0.95} />
          })}
          {puff(
            [
              [100, 171, 8.5],
              [92, 168, 6],
              [108, 168, 6],
              [95, 176, 6],
              [105, 176, 6],
            ],
            "#ffffff",
            "#f6dbe7",
            "#e49bbb",
            1.8,
          )}
        </g>
        {innerShade()}
      </>
    )
  },

  kitty: ({ id }) => {
    const earOuter = "M-23 -55Q-19 -80 -5 -94Q0 -98.5 5 -94Q19 -80 23 -55Z"
    const earInner = "M-12.5 -63Q-10.5 -78 -2.4 -87.5Q0 -89.5 2.4 -87.5Q10.5 -78 12.5 -63Z"
    const ear = (a: number) => (
      <g transform={`rotate(${a} 100 100) translate(100 100)`}>
        <path d={earOuter} fill={url(id("ear"))} stroke="#4b2a8f" strokeWidth={2} strokeLinejoin="round" />
        <path d={earInner} fill={url(id("earIn"))} />
        <path d="M-4 -66L-2 -78M3 -66L2.4 -76" stroke="#fff" strokeOpacity={0.85} strokeWidth={1.4} strokeLinecap="round" />
      </g>
    )
    return (
      <>
        <defs>
          {box(id("ear"), [[0, "#d7c1ff"], [1, "#9b74e8"]])}
          {box(id("earIn"), [[0, "#ffc4dd"], [1, "#ff9cc6"]])}
          {ball(id("bell"), [[0, "#fffbe0"], [0.35, "#ffd65a"], [0.8, "#e8a312"], [1, "#b97a06"]])}
          {box(id("bow"), [[0, "#ff9cc8"], [1, "#f0619f"]])}
          {shadow(id("sh"))}
        </defs>
        <g filter={url(id("sh"))}>
          {ear(-40)}
          {ear(40)}
          {band(id("ring"), {
            stops: [[0, "#dccaff"], [0.5, "#b394f5"], [1, "#8a5fe0"]],
            edge: "#5530a5",
            inner: "#4b2a8f",
            gloss: 0.6,
          })}
          <circle
            cx={100}
            cy={100}
            r={64}
            fill="none"
            stroke="#f6efff"
            strokeOpacity={0.9}
            strokeWidth={1.7}
            strokeDasharray="4.6 3.8"
            strokeLinecap="round"
          />
          {/* whiskers */}
          <g stroke="#7b55d0" strokeWidth={1.6} strokeLinecap="round" fill="none">
            <path d="M33 96Q22 93 13 94M33 103Q23 104 14 108" />
            <path d="M167 96Q178 93 187 94M167 103Q177 104 186 108" />
          </g>
          {/* bell on a little bow */}
          <g transform="translate(100 166)">
            <g transform="scale(0.5)">{bow(url(id("bow")), "#c93c7c", "#a8255f", "#ff8fc0", false)}</g>
            <circle cx={0} cy={11} r={10.5} fill={url(id("bell"))} stroke="#8f5c05" strokeWidth={1.6} />
            <path d="M-10 9.5Q0 12.5 10 9.5" fill="none" stroke="#8f5c05" strokeWidth={1.4} />
            <path d="M-0.1 15L0 19.6" stroke="#5c3a03" strokeWidth={2.2} strokeLinecap="round" />
            <circle cx={0} cy={14.6} r={2} fill="#5c3a03" />
            <ellipse cx={-4} cy={5.6} rx={3} ry={1.8} transform="rotate(-25 -4 5.6)" fill="#fff" fillOpacity={0.85} />
          </g>
        </g>
        {innerShade()}
      </>
    )
  },

  ribbon: ({ id }) => {
    const lace = Array.from({ length: 40 }, (_, i) => pt(70.5, i * 9))
    return (
      <>
        <defs>
          {box(id("bow"), [[0, "#ff9cc4"], [0.55, "#ff6ea6"], [1, "#e4407f"]])}
          {box(id("knot"), [[0, "#ff8ab8"], [1, "#e0457f"]])}
          {shadow(id("sh"))}
        </defs>
        <g filter={url(id("sh"))}>
          {lace.map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r={4.4} fill="#fff" stroke="#f2b3cb" strokeWidth={1} />
          ))}
          {band(id("ring"), {
            stops: [[0, "#ffe0ec"], [0.5, "#ffbcd5"], [1, "#ff98bf"]],
            edge: "#e57aa4",
            inner: "#d9628f",
            gloss: 0.8,
          })}
          {Array.from({ length: 48 }, (_, i) => {
            const [x, y] = pt(64, i * 7.5)
            return <circle key={i} cx={x} cy={y} r={1.35} fill="#fff" fillOpacity={0.9} />
          })}
          <g transform="translate(100 31)">{bow(url(id("bow")), "#c62c69", "#a3184f", url(id("knot")))}</g>
        </g>
        {innerShade()}
      </>
    )
  },

  blossom: ({ id }) => {
    const leaves = Array.from({ length: 30 }, (_, i) => {
      const a = i * 12
      const out = i % 2 === 0
      const [x, y] = pt(out ? 66 : 62, a)
      return (
        <g key={i} transform={`translate(${x} ${y}) rotate(${a + (out ? 52 : 118)})`}>
          <path d={LEAF} fill={url(id(out ? "leafA" : "leafB"))} stroke="#3f7a35" strokeWidth={0.9} />
          <path d="M0 -1.5L0 -11" stroke="#2f6a2a" strokeOpacity={0.5} strokeWidth={0.7} />
        </g>
      )
    })
    const pink = url(id("pink"))
    const white = url(id("white"))
    const C = url(id("centre"))
    return (
      <>
        <defs>
          {box(id("leafA"), [[0, "#b6e290"], [1, "#58a447"]])}
          {box(id("leafB"), [[0, "#9fd67c"], [1, "#468f3c"]])}
          {ball(id("pink"), [[0, "#fff0f6"], [0.5, "#ffb3d0"], [1, "#ff7fae"]], 0.5, 0.5, 0.6)}
          {ball(id("white"), [[0, "#ffffff"], [0.6, "#fff6fa"], [1, "#ffd9e8"]], 0.5, 0.5, 0.6)}
          {ball(id("centre"), [[0, "#fff3b0"], [1, "#f5a623"]])}
          {shadow(id("sh"))}
        </defs>
        <g filter={url(id("sh"))}>
          {band(id("ring"), {
            stops: [[0, "#e4f5d4"], [0.5, "#c3e6a7"], [1, "#9fd184"]],
            edge: "#6aa957",
            inner: "#5c9a4b",
            gloss: 0.6,
          })}
          <circle cx={100} cy={100} r={64} fill="none" stroke="#6a9d4c" strokeWidth={1.6} />
          {leaves}
          {/* top cluster */}
          {flower(76, 41, 10, white, "#e8b2c8", C, 10)}
          {flower(124, 41, 10, white, "#e8b2c8", C, -12)}
          {flower(100, 33, 13, pink, "#e0628f", C)}
          {flower(62, 55, 7, pink, "#e0628f", C, 20)}
          {flower(139, 55, 7, pink, "#e0628f", C, -20)}
          {/* bottom cluster */}
          {flower(80, 164, 10, pink, "#e0628f", C, 15)}
          {flower(120, 164, 10, pink, "#e0628f", C, -15)}
          {flower(100, 168, 12.5, white, "#e8b2c8", C, 36)}
          {flower(64, 150, 6.5, white, "#e8b2c8", C)}
          {flower(136, 150, 6.5, white, "#e8b2c8", C)}
          {[
            [88, 24],
            [113, 23],
            [57, 42],
            [144, 44],
            [90, 180],
            [112, 181],
            [70, 168],
            [131, 169],
          ].map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r={1.8} fill="#fff" stroke="#e8b2c8" strokeWidth={0.6} />
          ))}
        </g>
        {innerShade()}
      </>
    )
  },

  cloud_moon: ({ id }) => {
    // crescent: outer circle R, inner bite of radius 0.88R
    const R = 19
    const moon = `M${0.5 * R} ${-0.866 * R}A${R} ${R} 0 1 0 ${0.5 * R} ${0.866 * R}A${0.882 * R} ${0.882 * R} 0 1 1 ${0.5 * R} ${-0.866 * R}Z`
    const lantern = (x: number, y: number, s: number, rot: number) => (
      <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`}>
        <circle r={13} fill={url(id("lglow"))} />
        <path d="M-4.4 -7.4C-8.4 -4.4 -8.4 4.4 -4.4 7.4L4.4 7.4C8.4 4.4 8.4 -4.4 4.4 -7.4Z" fill={url(id("lantern"))} stroke="#c0600f" strokeWidth={1.1} strokeLinejoin="round" />
        <path d="M0 -7.4C-2.6 -4 -2.6 4 0 7.4" fill="none" stroke="#e07a16" strokeOpacity={0.55} strokeWidth={0.9} />
        <rect x={-4.2} y={-9.4} width={8.4} height={2.6} rx={1} fill="#c9521a" />
        <rect x={-4.2} y={6.8} width={8.4} height={2.6} rx={1} fill="#c9521a" />
        <path d="M0 9.4L0 12.6" stroke="#e8402a" strokeWidth={1.4} strokeLinecap="round" />
        <path d="M-4 -3.6C-4.8 -1 -4.8 1.4 -4 3.6" fill="none" stroke="#fff" strokeOpacity={0.8} strokeWidth={1.4} strokeLinecap="round" />
      </g>
    )
    const back: [number, number, number][] = [
      [30, 162, 11],
      [44, 154, 13],
      [60, 162, 12],
      [22, 174, 9],
      [138, 166, 12],
      [154, 157, 14],
      [171, 164, 11],
      [182, 174, 8],
    ]
    const front: [number, number, number][] = [
      [40, 172, 12],
      [57, 177, 11],
      [74, 178, 10],
      [91, 182, 10],
      [110, 182, 10],
      [126, 178, 10.5],
      [145, 175, 12],
      [162, 176, 10],
    ]
    return (
      <>
        <defs>
          {ball(id("moon"), [[0, "#fffbe2"], [0.45, "#ffe27a"], [1, "#f2aa2c"]], 0.3, 0.35, 0.8)}
          {box(id("lantern"), [[0, "#fff1a8"], [0.5, "#ffc24a"], [1, "#ff8f2e"]])}
          {glow(id("lglow"), 0, 0, 13, "#ffd36b", 0.7)}
          {glow(id("mglow"), 46, 44, 32, "#ffe28a", 0.55)}
          {shadow(id("sh"))}
        </defs>
        <circle cx={46} cy={44} r={32} fill={url(id("mglow"))} />
        <g filter={url(id("sh"))}>
          {lantern(152, 26, 1, 8)}
          {lantern(173, 47, 0.75, -6)}
          {lantern(131, 13, 0.6, 4)}
          {band(id("ring"), {
            stops: [[0, "#4f73e6"], [0.45, "#2f48b8"], [1, "#1b2a80"]],
            edge: "#121d5c",
            inner: "#0f1850",
            gloss: 0.45,
          })}
          {[
            [24, 1.3],
            [62, 1.1],
            [100, 1.5],
            [128, 1],
            [200, 1.2],
            [232, 1.5],
            [300, 1.1],
            [338, 1.3],
          ].map(([a, r], i) => {
            const [x, y] = pt(i % 2 ? 61.5 : 66, a)
            return <circle key={i} cx={x} cy={y} r={r} fill="#fff" fillOpacity={0.9} />
          })}
          <path d={sparkle(...pt(64, 80), 3.6)} fill="#fff6c4" />
          <path d={sparkle(...pt(64, 312), 3)} fill="#fff6c4" />
          {/* moon with a sleepy face */}
          <g transform="translate(46 44) rotate(-35)">
            <path d={moon} fill={url(id("moon"))} stroke="#c98512" strokeWidth={1.8} strokeLinejoin="round" />
            <path d="M-13.5 -4Q-11.5 -1 -8.5 -3" fill="none" stroke="#8a5408" strokeWidth={1.5} strokeLinecap="round" transform="rotate(35)" />
            <ellipse cx={-12} cy={3} rx={2.6} ry={1.6} transform="rotate(35)" fill="#ff9a9a" fillOpacity={0.7} />
            <path d="M-14 -10C-12 -14 -8 -16 -4 -16.6" fill="none" stroke="#fff" strokeOpacity={0.8} strokeWidth={2} strokeLinecap="round" />
          </g>
          {/* clouds */}
          {puff(back, "#e3eaff", "#bccbf7", "#7f95dc", 1.6)}
          {puff(front, "#ffffff", "#d8e2fc", "#7f95dc", 1.6)}
          <g fill="none" stroke="#fff" strokeWidth={2.6} strokeLinecap="round">
            <path d="M24 190C40 186 58 192 76 190C84 189 86 183 81 182C77 181 76 186 79 187" />
            <path d="M124 192C140 189 160 194 178 188C185 185 184 179 179 180" />
          </g>
          <g fill="none" stroke="#8fa3e3" strokeWidth={1.2} strokeLinecap="round">
            <path d="M24 192.6C40 188.6 58 194.6 76 192.6" />
            <path d="M124 194.6C140 191.6 160 196.6 178 190.6" />
          </g>
          <path d={sparkle(186, 128, 4)} fill="#fff6c4" />
          <path d={sparkle(16, 104, 3.2)} fill="#fff6c4" />
          <path d={sparkle(110, 8, 2.6)} fill="#fff6c4" />
        </g>
        {innerShade()}
      </>
    )
  },

  pumpkin: ({ id }) => {
    const wing =
      "M0 4C-8 -10 -26 -24 -52 -24C-47 -18 -45 -12 -44 -6Q-36 -11 -28 -2Q-20 -8 -12 4Q-6 1 0 4Z"
    const wingSide = (t: string) => (
      <g transform={t}>
        <path d={wing} fill={url(id("wing"))} stroke="#1a0920" strokeWidth={1.8} strokeLinejoin="round" />
        <path d="M-2 2L-44 -6M-6 0L-28 -2M-6 1L-12 4M-4 -2L-48 -21" stroke="#b17fd0" strokeOpacity={0.8} strokeWidth={1.1} strokeLinecap="round" fill="none" />
        <path d="M-6 -6C-14 -15 -28 -21 -44 -21.5" fill="none" stroke="#f3d6ff" strokeOpacity={0.6} strokeWidth={1.6} strokeLinecap="round" />
      </g>
    )
    return (
      <>
        <defs>
          {box(id("wing"), [[0, "#7d4a9a"], [0.55, "#4f2766"], [1, "#331543"]])}
          {box(id("horn"), [[0, "#8a55a6"], [1, "#43205a"]])}
          {ball(id("pk"), [[0, "#ffd08a"], [0.45, "#ff9a2e"], [1, "#d4570f"]], 0.4, 0.35, 0.75)}
          {ball(id("pk2"), [[0, "#ffb75e"], [1, "#c94e0c"]], 0.4, 0.35, 0.8)}
          {box(id("stem"), [[0, "#8cc04a"], [1, "#4a7a24"]])}
          {glow(id("pglow"), 152, 154, 30, "#ffb347", 0.45)}
          {shadow(id("sh"))}
        </defs>
        <g filter={url(id("sh"))}>
          {wingSide("translate(58 50) rotate(8)")}
          {wingSide(`${MIRROR} translate(58 50) rotate(8)`)}
          {/* little bat ears on top */}
          <g fill={url(id("horn"))} stroke="#1a0920" strokeWidth={1.8} strokeLinejoin="round">
            <path d={`M${f(pt(64, -24))}Q${f(pt(82, -20))} ${f(pt(84, -14))}Q${f(pt(74, -10))} ${f(pt(66, -6))}Z`} />
            <path d={`M${f(pt(64, 24))}Q${f(pt(82, 20))} ${f(pt(84, 14))}Q${f(pt(74, 10))} ${f(pt(66, 6))}Z`} />
          </g>
          {band(id("ring"), {
            stops: [[0, "#6a3482"], [0.5, "#47205a"], [1, "#2c1238"]],
            edge: "#1a0920",
            inner: "#1a0920",
            gloss: 0.32,
          })}
          <circle cx={100} cy={100} r={69.1} fill="none" stroke="#9a64ba" strokeOpacity={0.75} strokeWidth={1} />
          <circle cx={100} cy={100} r={59.2} fill="none" stroke="#ff9ad5" strokeOpacity={0.75} strokeWidth={1.1} />
          <circle cx={100} cy={100} r={64} fill="none" stroke="#a46bc4" strokeOpacity={0.6} strokeWidth={1.2} strokeDasharray="3 5" strokeLinecap="round" />
          {/* sparkles */}
          {[
            [24, 92, 5, "#ffb3e0"],
            [178, 86, 4, "#ffb3e0"],
            [30, 128, 3, "#d9b3ff"],
            [180, 118, 3, "#d9b3ff"],
            [86, 13, 3.4, "#ffb3e0"],
            [122, 16, 2.6, "#d9b3ff"],
            [36, 160, 3.6, "#ffb3e0"],
          ].map(([x, y, r, c], i) => (
            <path key={i} d={sparkle(x as number, y as number, r as number)} fill={c as string} />
          ))}
          {/* jack-o-lantern */}
          <circle cx={152} cy={154} r={30} fill={url(id("pglow"))} />
          <g transform="translate(152 155) rotate(-8)">
            <path d="M-1 -14C-1 -19 1 -23 5 -25" fill="none" stroke="#3d5a1a" strokeWidth={5.2} strokeLinecap="round" />
            <path d="M-1 -14C-1 -19 1 -23 5 -25" fill="none" stroke={url(id("stem"))} strokeWidth={3.4} strokeLinecap="round" />
            <path d="M2 -19C8 -24 14 -20 12 -15" fill="none" stroke="#5f8f2c" strokeWidth={1.4} strokeLinecap="round" />
            <ellipse cx={-9} cy={0} rx={11} ry={13.5} fill={url(id("pk2"))} stroke="#8a3606" strokeWidth={1.6} />
            <ellipse cx={9} cy={0} rx={11} ry={13.5} fill={url(id("pk2"))} stroke="#8a3606" strokeWidth={1.6} />
            <ellipse cx={0} cy={0} rx={10.5} ry={14.5} fill={url(id("pk"))} stroke="#8a3606" strokeWidth={1.6} />
            <g fill="#ffd84a" stroke="#6b2402" strokeWidth={1.3} strokeLinejoin="round">
              <path d="M-9.5 -1.5L-6.5 -7L-3.5 -1.5Z" />
              <path d="M3.5 -1.5L6.5 -7L9.5 -1.5Z" />
              <path d="M-9 3Q0 12.5 9 3Q5 5 3 4.5L2 7L-0.5 4.8L-3 5Q-6 5 -9 3Z" />
            </g>
            <ellipse cx={-4} cy={-9} rx={3} ry={1.7} transform="rotate(-20 -4 -9)" fill="#fff" fillOpacity={0.65} />
          </g>
        </g>
        {innerShade()}
      </>
    )
  },

  festive: ({ id }) => {
    const NEEDLE = "M0 0C1.9 -3 1.9 -8 0 -12C-1.9 -8 -1.9 -3 0 0Z"
    const layers: [number, number, string, number][] = [
      [60.5, 112, "#1d6330", 0],
      [63.5, 84, "#236f36", 4.5],
      [67.5, 62, "#2e8441", 2],
      [65.5, 72, "#45a356", 6.5],
    ]
    const needles = layers.flatMap(([r, tilt, c, off], L) =>
      Array.from({ length: 40 }, (_, i) => {
        const a = i * 9 + off
        const [x, y] = pt(r, a)
        return [
          <path key={`${L}a${i}`} d={NEEDLE} fill={c} transform={`translate(${x} ${y}) rotate(${a + tilt})`} />,
          <path key={`${L}b${i}`} d={NEEDLE} fill={c} transform={`translate(${x} ${y}) rotate(${a - tilt})`} />,
        ]
      }),
    )
    const berries = (a: number) => {
      const [x, y] = pt(66, a)
      return (
        <g key={a} transform={`translate(${x} ${y}) rotate(${a})`}>
          {[
            [-3.6, 0.6],
            [3.6, 0.6],
            [0, -3.4],
          ].map(([bx, by], i) => (
            <g key={i}>
              <circle cx={bx} cy={by} r={3.7} fill={url(id("berry"))} stroke="#7a0a0f" strokeWidth={1} />
              <circle cx={bx - 1.1} cy={by - 1.2} r={1} fill="#fff" fillOpacity={0.85} />
            </g>
          ))}
        </g>
      )
    }
    const bell = (x: number, y: number, rot: number) => (
      <g transform={`translate(${x} ${y}) rotate(${rot})`}>
        <circle cx={0} cy={9.6} r={2.6} fill="#a86e08" />
        <path d="M-8.5 7C-8.5 -2 -6 -10 0 -10C6 -10 8.5 -2 8.5 7L10.5 9.6L-10.5 9.6Z" fill={url(id("bell"))} stroke="#8f5c05" strokeWidth={1.5} strokeLinejoin="round" />
        <path d="M-9 6.2L9 6.2" stroke="#b77d0c" strokeWidth={1.2} />
        <path d="M-4.6 -5C-5.6 -2 -5.8 1 -5.6 4" fill="none" stroke="#fff" strokeOpacity={0.85} strokeWidth={1.8} strokeLinecap="round" />
        <circle cx={0} cy={-10.6} r={2} fill="none" stroke="#8f5c05" strokeWidth={1.4} />
      </g>
    )
    return (
      <>
        <defs>
          {ball(id("berry"), [[0, "#ff7b7b"], [0.6, "#e01b25"], [1, "#a00d14"]])}
          {box(id("bell"), [[0, "#fff1a0"], [0.45, "#ffcf3a"], [1, "#d8900c"]], 0, 0, 1, 1)}
          {ball(id("orn"), [[0, "#fff7c8"], [0.5, "#ffcf3a"], [1, "#c98a06"]])}
          <pattern id={id("stripe")} width={7} height={7} patternUnits="userSpaceOnUse" patternTransform="rotate(38)">
            <rect width={7} height={7} fill="#e3262f" />
            <rect width={2.8} height={7} fill="#ffd24a" />
          </pattern>
          {box(id("shade"), [[0, "#fff", 0.35], [0.45, "#fff", 0], [1, "#000", 0.25]])}
          {shadow(id("sh"))}
        </defs>
        <g filter={url(id("sh"))}>
          {band(id("ring"), {
            stops: [[0, "#2f8a42"], [1, "#165227"]],
            edge: "#0f3d1c",
            inner: "#0f3d1c",
            gloss: 0,
          })}
          {needles}
          {Array.from({ length: 22 }, (_, i) => {
            const [x, y] = pt([62, 69, 65.5][i % 3], i * 16.4 + 5)
            return <circle key={i} cx={x} cy={y} r={i % 3 === 1 ? 1.4 : 1} fill="#fff" fillOpacity={0.9} />
          })}
          {[52, 128, 232, 308].map(berries)}
          {[
            [22, 44, 4],
            [180, 48, 3.4],
            [16, 150, 3],
            [186, 146, 3.6],
          ].map(([x, y, r], i) => (
            <path key={i} d={sparkle(x, y, r)} fill="#ffd34a" />
          ))}
          {[96, 264].map((a) => {
            const [x, y] = pt(66, a)
            return (
              <g key={a}>
                <circle cx={x} cy={y} r={4.6} fill={url(id("orn"))} stroke="#8f5c05" strokeWidth={1.1} />
                <circle cx={x - 1.4} cy={y - 1.6} r={1.2} fill="#fff" />
              </g>
            )
          })}
          {bell(89.5, 177, 14)}
          {bell(110.5, 177, -14)}
          <g transform="translate(100 165) scale(0.42)">{bow(url(id("stripe")), "#9e1219", "#7a0a0f", "#e3262f", false, 0.85)}</g>
          <g transform="translate(100 30)">
            {bow(url(id("stripe")), "#9e1219", "#7a0a0f", "#e3262f", true, 0.85)}
            <g opacity={1}>
              <path d="M-4 -3C-13 -17 -33 -24 -37 -9C-40 4 -23 10 -4 4Z" fill={url(id("shade"))} />
              <path d="M4 -3C13 -17 33 -24 37 -9C40 4 23 10 4 4Z" fill={url(id("shade"))} />
            </g>
          </g>
        </g>
        {innerShade()}
      </>
    )
  },

  /* ── Love ── */

  heart_halo: ({ id }) => {
    const wing = "M0 0C5 -8 18 -13 31 -10C28 -7 26 -6 24 -5C28 -3 29 0 26 2C22 2.5 20 3 18 3C20 6 18 8.5 14 8.5C8 9 2 6 0 0Z"
    return (
      <>
        <defs>
          {ball(id("hc"), [[0, "#ffc2cf"], [0.45, "#ff4f74"], [1, "#c2103a"]], 0.35, 0.3, 0.8)}
          {box(id("wing"), [[0, "#ffffff"], [1, "#ffe0ea"]])}
          {shadow(id("sh"))}
        </defs>
        <g filter={url(id("sh"))}>
          {band(id("ring"), {
            stops: [[0, "#ff8aa3"], [0.45, "#ef3a62"], [1, "#b8133c"]],
            edge: "#8a0c2b",
            inner: "#7d0a26",
            gloss: 0.6,
          })}
          {/* wings at the bottom */}
          {[0, 1].map((m) => (
            <g key={m} transform={`${m ? MIRROR : ""} translate(106 167) rotate(6) scale(1.4)`}>
              <path d={wing} fill={url(id("wing"))} stroke="#d97f97" strokeWidth={1.5} strokeLinejoin="round" />
              <path d="M5 -1C10 -4 16 -6 22 -6M6 2C10 1 14 1 18 1" fill="none" stroke="#e9a8ba" strokeWidth={1} strokeLinecap="round" />
            </g>
          ))}
          <path d={heart(100, 170, 8.5)} fill={url(id("hc"))} stroke="#fff" strokeWidth={1.8} />
          <ellipse cx={96.5} cy={166.5} rx={2.4} ry={1.4} transform="rotate(-30 96.5 166.5)" fill="#fff" fillOpacity={0.85} />
          {/* crest */}
          <path d={heart(100, 31, 11.5)} fill={url(id("hc"))} stroke="#fff" strokeWidth={2.2} strokeLinejoin="round" />
          <ellipse cx={95} cy={26.5} rx={3.6} ry={2.2} transform="rotate(-30 95 26.5)" fill="#fff" fillOpacity={0.85} />
          <path d={sparkle(78, 26, 3)} fill="#fff" />
          <path d={sparkle(123, 22, 2.4)} fill="#fff" />
        </g>
        {innerShade()}
      </>
    )
  },

  sweethearts: ({ id }) => {
    const N = 22
    const kinds = ["hA", "hB", "hC"]
    const hearts = Array.from({ length: N }, (_, i) => {
      const a = (i * 360) / N
      if (a > 345 || a < 15) return null
      const [x, y] = pt(64, a)
      return (
        <g key={i} transform={`translate(${x} ${y}) rotate(${a})`}>
          <path d={heart(0, 0, 8.6)} fill={url(id(kinds[i % 3]))} stroke="#a0103a" strokeWidth={1.1} strokeLinejoin="round" />
          <ellipse cx={-3.6} cy={-3.6} rx={2.2} ry={1.3} transform="rotate(-35 -3.6 -3.6)" fill="#fff" fillOpacity={0.8} />
        </g>
      )
    })
    return (
      <>
        <defs>
          {ball(id("hA"), [[0, "#ffd6e4"], [0.5, "#ff8fb4"], [1, "#e8558a"]], 0.35, 0.3, 0.8)}
          {ball(id("hB"), [[0, "#ffb0b8"], [0.5, "#f23b55"], [1, "#b80f32"]], 0.35, 0.3, 0.8)}
          {ball(id("hC"), [[0, "#fff0f5"], [0.5, "#ffc2d6"], [1, "#ff8cb2"]], 0.35, 0.3, 0.8)}
          {box(id("bow"), [[0, "#ff6f8e"], [1, "#d8143f"]])}
          {shadow(id("sh"))}
        </defs>
        <g filter={url(id("sh"))}>
          {band(id("ring"), {
            stops: [[0, "#ffe3ec"], [1, "#ffc1d4"]],
            edge: "#f2a2bd",
            inner: "#e58aab",
            w: 11,
            gloss: 0.5,
          })}
          {hearts}
          <g transform="translate(100 32) scale(0.78)">{bow(url(id("bow")), "#a30f31", "#8a0c2b", "#ff5c7f", false)}</g>
        </g>
        {innerShade()}
      </>
    )
  },

  cupid: ({ id }) => {
    const feather = "M0 0L-12 -10L-22 -10L-12 0Z"
    return (
      <>
        <defs>
          {lin(id("gold"), [[0, "#fff4c2"], [0.5, "#f3c552"], [1, "#b9831f"]], 0, 28, 0, 172)}
          {lin(id("shaft"), [[0, "#fff1b0"], [0.5, "#e9b33c"], [1, "#a8740f"]], 0, 98, 0, 102)}
          {lin(id("head"), [[0, "#fff3b8"], [0.5, "#f1bd3f"], [1, "#a8740f"]], 0, 90, 0, 110)}
          {box(id("fea"), [[0, "#ffd0dc"], [1, "#ff7ea4"]])}
          {ball(id("h1"), [[0, "#ffc2cf"], [0.45, "#ff4f74"], [1, "#c2103a"]], 0.35, 0.3, 0.8)}
          {ball(id("h2"), [[0, "#ffe0ea"], [0.5, "#ff9cbc"], [1, "#e55d8c"]], 0.35, 0.3, 0.8)}
          {shadow(id("sh"))}
        </defs>
        <g filter={url(id("sh"))}>
          {/* back half of the arrow, behind the ring */}
          <g transform="rotate(-45 100 100)">
            <rect x={158} y={98.2} width={26} height={3.6} rx={1.2} fill={url(id("shaft"))} stroke="#8a5c08" strokeWidth={1} />
            <path d="M198 100L180 89.5L184.5 100L180 110.5Z" fill={url(id("head"))} stroke="#8a5c08" strokeWidth={1.4} strokeLinejoin="round" />
            <path d="M196 100L182 92" stroke="#fff" strokeOpacity={0.8} strokeWidth={1.2} strokeLinecap="round" />
          </g>
          {band(id("ring"), {
            stops: [[0, "#ffe2dc"], [0.5, "#f6b3b0"], [1, "#dc8a92"]],
            edge: url(id("gold")),
            inner: url(id("gold")),
            shade: "#c0707e",
            gloss: 0.7,
          })}
          <circle cx={100} cy={100} r={70.4} fill="none" stroke={url(id("gold"))} strokeWidth={2.8} />
          <circle cx={100} cy={100} r={57.8} fill="none" stroke={url(id("gold"))} strokeWidth={2.4} />
          <circle cx={100} cy={100} r={71.9} fill="none" stroke="#9c6a14" strokeWidth={0.8} />
          {[0, 90, 180, 270].map((a) => {
            const [x, y] = pt(64, a)
            return (
              <g key={a} transform={`translate(${x} ${y}) rotate(${a})`}>
                <path d={heart(0, 0, 4)} fill={url(id("gold"))} stroke="#9c6a14" strokeWidth={0.9} />
              </g>
            )
          })}
          {/* front half of the arrow */}
          <g transform="rotate(-45 100 100)">
            <rect x={14} y={98.2} width={30} height={3.6} rx={1.2} fill={url(id("shaft"))} stroke="#8a5c08" strokeWidth={1} />
            {[0, 8].map((dx) => (
              <g key={dx} transform={`translate(${26 - dx} 100)`}>
                <path d={feather} transform="translate(0 -1.4)" fill={url(id("fea"))} stroke="#c2406c" strokeWidth={1.1} strokeLinejoin="round" />
                <path d={feather} transform="translate(0 1.4) scale(1 -1)" fill={url(id("fea"))} stroke="#c2406c" strokeWidth={1.1} strokeLinejoin="round" />
              </g>
            ))}
          </g>
          <path d={heart(38, 38, 9)} fill={url(id("h1"))} stroke="#fff" strokeWidth={1.6} transform="rotate(-18 38 38)" />
          <path d={heart(176, 140, 6.5)} fill={url(id("h2"))} stroke="#fff" strokeWidth={1.4} transform="rotate(16 176 140)" />
          <path d={heart(160, 170, 4.4)} fill={url(id("h1"))} stroke="#fff" strokeWidth={1.2} />
          <path d={sparkle(60, 22, 3.2)} fill="#ffe08a" />
          <path d={sparkle(22, 66, 2.6)} fill="#ffe08a" />
          <path d={sparkle(186, 108, 2.6)} fill="#ffe08a" />
        </g>
        {innerShade()}
      </>
    )
  },

  rose_vine: ({ id }) => {
    const vine: Pt[] = []
    for (let a = 150; a <= 372; a += 3) vine.push(pt(68 + 3.2 * Math.sin(rad(a * 5)), a))
    const vineD = `M${vine.map(f).join("L")}`
    const leafAt = (a: number, side: number, i: number) => {
      const [x, y] = pt(68 + 3.2 * Math.sin(rad(a * 5)), a)
      return (
        <g key={i} transform={`translate(${x} ${y}) rotate(${a + 90 + side * 55}) scale(0.95)`}>
          <path d={LEAF} fill={url(id(side > 0 ? "lfA" : "lfB"))} stroke="#2c5e24" strokeWidth={0.9} />
          <path d="M0 -1.5L0 -11" stroke="#2c5e24" strokeOpacity={0.55} strokeWidth={0.7} />
        </g>
      )
    }
    const leaves = [158, 172, 190, 214, 228, 246, 262, 280, 298, 316, 330, 352, 366].map((a, i) =>
      leafAt(a, i % 2 ? 1 : -1, i),
    )
    const g = { petal: url(id("petal")), cup: url(id("cup")) }
    const bud = (a: number, rot: number) => {
      const [x, y] = pt(70, a)
      return (
        <g key={a} transform={`translate(${x} ${y}) rotate(${rot})`}>
          <path d="M0 -6C4 -4 4 3 0 5C-4 3 -4 -4 0 -6Z" fill={g.cup} stroke="#5c0716" strokeWidth={1} />
          <path d="M-3.4 2C-2 5.5 2 5.5 3.4 2L2 6.6L-2 6.6Z" fill="#4f8f3e" stroke="#2c5e24" strokeWidth={0.8} strokeLinejoin="round" />
        </g>
      )
    }
    return (
      <>
        <defs>
          {lin(id("gold"), [[0, "#fff6cf"], [0.35, "#f6d16a"], [0.7, "#d9a437"], [1, "#a8781c"]], 0, 30, 0, 170)}
          {box(id("lfA"), [[0, "#9fd67c"], [1, "#3e8a36"]])}
          {box(id("lfB"), [[0, "#7cc062"], [1, "#2f7030"]])}
          {ball(id("petal"), [[0, "#e0334f"], [1, "#8c0c24"]], 0.5, 0.5, 0.6)}
          {ball(id("cup"), [[0, "#ff5470"], [0.6, "#d01e40"], [1, "#9c0f2a"]], 0.4, 0.35, 0.75)}
          {shadow(id("sh"))}
        </defs>
        <g filter={url(id("sh"))}>
          {band(id("ring"), {
            stops: [[0, "#fff6cf"], [0.35, "#f6d16a"], [0.7, "#d9a437"], [1, "#a8781c"]],
            edge: "#8a6114",
            inner: "#7d5610",
            w: 11,
            r: 63.6,
            gloss: 0.75,
          })}
          <circle cx={100} cy={100} r={63.6} fill="none" stroke="#8a6114" strokeOpacity={0.45} strokeWidth={0.9} />
          <circle cx={100} cy={100} r={64.6} fill="none" stroke="#fff6cf" strokeOpacity={0.6} strokeWidth={0.7} />
          <path d={vineD} fill="none" stroke="#2c5e24" strokeWidth={3.6} strokeLinecap="round" strokeLinejoin="round" />
          <path d={vineD} fill="none" stroke="#5a9a3e" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          <path d={`M${f(pt(72, 236))}c-6 -2 -9 4 -5 7c3 2 6 -1 4 -3`} fill="none" stroke="#4a8a36" strokeWidth={1.3} strokeLinecap="round" />
          <path d={`M${f(pt(72, 322))}c-2 -6 4 -9 7 -5c2 3 -1 6 -3 4`} fill="none" stroke="#4a8a36" strokeWidth={1.3} strokeLinecap="round" />
          {leaves}
          {bud(160, 200)}
          {bud(348, 330)}
          {bud(236, 260)}
          {rose(...pt(68, 196), 13, g, 20)}
          {rose(...pt(68, 268), 12, g, 80)}
          {rose(...pt(68, 314), 10, g, 140)}
          <path d={sparkle(...pt(84, 286), 3)} fill="#ffe7a3" />
          <path d={sparkle(...pt(86, 220), 2.6)} fill="#ffe7a3" />
          <path d={sparkle(...pt(80, 40), 2.6)} fill="#ffe7a3" />
        </g>
        {innerShade()}
      </>
    )
  },

  love_wings: ({ id }) => {
    // fanned feathers from a root at the lower right of the ring; each
    // wing's top feather is a rounded lobe so the pair reads as a heart
    // one wing (right side): three feather rows, each row a scalloped layer
    const W1 =
      "M0 0C6 -20 30 -40 60 -44C68 -45 72 -40 68 -34C74 -31 74 -24 67 -21C71 -16 68 -10 60 -10C61 -4 55 0 48 -2C46 4 39 6 33 3C29 8 20 9 14 5C8 7 2 5 0 0Z"
    const W2 =
      "M0 0C7 -15 25 -29 46 -31C53 -31 56 -26 52 -21C57 -17 54 -11 47 -11C48 -5 42 -2 36 -4C34 2 26 3 21 0C16 5 7 5 0 0Z"
    const W3 = "M0 0C7 -10 18 -17 30 -17C36 -17 38 -12 34 -9C36 -4 32 -1 26 -2C24 3 16 4 11 1C7 4 2 3 0 0Z"
    const [rx, ry] = pt(67, 150)
    const wing = (t: string, k: number) => (
      <g key={k} transform={`${t} translate(${rx} ${ry}) rotate(-8) scale(0.84)`} strokeLinejoin="round">
        <path d={W1} fill={url(id("w1"))} stroke="#4a1b7a" strokeWidth={1.7} />
        <path d="M44 -14L60 -18M36 -6L50 -6M24 -1L34 3" stroke="#3d1573" strokeOpacity={0.35} strokeWidth={1.2} strokeLinecap="round" />
        <path d={W2} fill={url(id("w2"))} stroke="#82288c" strokeWidth={1.5} />
        <path d={W3} fill={url(id("w3"))} stroke="#c23f8a" strokeWidth={1.3} />
        <path d="M8 -10C18 -26 36 -37 58 -40" fill="none" stroke="#fff" strokeOpacity={0.6} strokeWidth={1.8} strokeLinecap="round" />
        <path d={heart(18, -7, 3.6)} transform="rotate(-24 18 -7)" fill="#fff" fillOpacity={0.9} />
      </g>
    )
    return (
      <>
        <defs>
          {box(id("w1"), [[0, "#b07cff"], [1, "#6a2fc4"]], 0, 0, 1, 1)}
          {box(id("w2"), [[0, "#f39cff"], [1, "#b04ad6"]], 0, 0, 1, 1)}
          {box(id("w3"), [[0, "#ffd6ef"], [1, "#ff7fc4"]], 0, 0, 1, 1)}
          {ball(id("gem"), [[0, "#ffe0f2"], [0.35, "#ff6fc0"], [0.8, "#d4157e"], [1, "#9a0d5c"]], 0.38, 0.3, 0.8)}
          {lin(id("gold"), [[0, "#fff4c2"], [0.5, "#f3c552"], [1, "#b9831f"]], 0, 10, 0, 50)}
          {glow(id("gl"), 100, 32, 30, "#ff9ad8", 0.55)}
          {shadow(id("sh"))}
        </defs>
        <circle cx={100} cy={32} r={30} fill={url(id("gl"))} />
        <g filter={url(id("sh"))}>
          {wing("", 0)}
          {wing(MIRROR, 1)}
          {band(id("ring"), {
            stops: [[0, "#ff9be0"], [0.45, "#d466e6"], [1, "#7d3fd6"]],
            edge: "#47197e",
            inner: "#3d1573",
            gloss: 0.6,
          })}
          <circle cx={100} cy={100} r={58.6} fill="none" stroke="#ffd36b" strokeOpacity={0.9} strokeWidth={1} />
          {[90, 270].map((a) => {
            const [x, y] = pt(64, a)
            return (
              <g key={a} transform={`translate(${x} ${y}) rotate(45)`}>
                <rect x={-4.6} y={-4.6} width={9.2} height={9.2} rx={1.4} fill={url(id("gold"))} stroke="#8a5c08" strokeWidth={1} />
                <rect x={-2.6} y={-2.6} width={5.2} height={5.2} rx={0.8} fill={url(id("gem"))} />
              </g>
            )
          })}
          {/* gem at the bottom where the wings meet */}
          <path d={heart(100, 170, 7.5)} fill={url(id("gem"))} stroke="#fff" strokeWidth={1.6} />
          {/* heart gem crest */}
          <path d={heart(100, 31, 15.5)} fill={url(id("gold"))} stroke="#8a5c08" strokeWidth={1.4} strokeLinejoin="round" />
          <path d={heart(100, 31.4, 12.4)} fill={url(id("gem"))} />
          <path d={`M100 ${r2(31.4 - 7.7)}L100 ${r2(31.4 + 10.6)}M${r2(100 - 12.4)} ${r2(31.4 - 3.7)}L100 ${r2(31.4 + 2)}L${r2(100 + 12.4)} ${r2(31.4 - 3.7)}`} stroke="#fff" strokeOpacity={0.35} strokeWidth={0.9} fill="none" />
          <ellipse cx={93.5} cy={25.5} rx={4.4} ry={2.4} transform="rotate(-32 93.5 25.5)" fill="#fff" fillOpacity={0.9} />
          <circle cx={107.5} cy={25} r={1.3} fill="#fff" fillOpacity={0.8} />
          <path d={sparkle(72, 22, 4)} fill="#fff" />
          <path d={sparkle(130, 16, 3)} fill="#ffd6f0" />
          <path d={sparkle(24, 96, 3)} fill="#ffd6f0" />
          <path d={sparkle(178, 92, 3.6)} fill="#fff" />
        </g>
        {innerShade()}
      </>
    )
  },
}
