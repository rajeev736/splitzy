/**
 * Avatar frame artwork for the second "more" set: storybook animals and
 * fantasy (fox, headphones, rainbow, horns, unicorn, butterfly, witch) and
 * sweet love themes (neon heart, candy, love letter, party).
 *
 * Each draw returns SVG children for a 200x200 viewBox, painted on top of a
 * round photo centred at (100,100) with r=60. The ring covers r≈57.5–70.5;
 * ears, wings, hats and props reach out towards the edges. Every paint
 * server / filter / clip id goes through `id()` so many frames can share
 * one page.
 */
import type React from "react"
import type { FrameId } from "@/lib/fun/catalog"

export type FrameDraw = (p: { id: (name: string) => string }) => React.ReactElement

type Pt = [number, number]
type Stops = [number, string, number?][]
type Circle = [number, number, number]

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

/** Smooth path through points (Catmull-Rom turned into cubic Béziers). */
function smooth(p: Pt[], closed = false) {
  const n = p.length
  const at = (i: number) => (closed ? p[(i + n) % n] : p[Math.max(0, Math.min(n - 1, i))])
  let d = `M${f(p[0])}`
  for (let i = 0; i < (closed ? n : n - 1); i++) {
    const [p0, p1, p2, p3] = [at(i - 1), at(i), at(i + 1), at(i + 2)]
    const c1: Pt = [r2(p1[0] + (p2[0] - p0[0]) / 6), r2(p1[1] + (p2[1] - p0[1]) / 6)]
    const c2: Pt = [r2(p2[0] - (p3[0] - p1[0]) / 6), r2(p2[1] - (p3[1] - p1[1]) / 6)]
    d += `C${f(c1)} ${f(c2)} ${f(p2)}`
  }
  return closed ? `${d}Z` : d
}

/**
 * Tapered strand that follows the ring from angle a0 to a1: centre radius
 * rc(t) and width w(t) for t in 0..1. Used for manes and tails.
 */
function strand(a0: number, a1: number, rc: (t: number) => number, w: (t: number) => number, n = 22) {
  const outer: Pt[] = []
  const inner: Pt[] = []
  for (let i = 0; i <= n; i++) {
    const t = i / n
    const a = a0 + (a1 - a0) * t
    const h = w(t) / 2
    outer.push(pt(rc(t) + h, a))
    inner.push(pt(rc(t) - h, a))
  }
  return smooth([...outer, ...inner.slice(0, -1).reverse()], true)
}

/** Centre line of the strand above, for highlights. */
function strandLine(a0: number, a1: number, rc: (t: number) => number, t0 = 0, t1 = 1, n = 14) {
  const p: Pt[] = []
  for (let i = 0; i <= n; i++) {
    const t = t0 + ((t1 - t0) * i) / n
    p.push(pt(rc(t), a0 + (a1 - a0) * t))
  }
  return smooth(p)
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

/** Five-point star (draw with a round stroke join for a soft, cute star). */
const star = (cx: number, cy: number, R: number, rot = 0, k = 0.5) =>
  `M${Array.from({ length: 10 }, (_, i) => f(pt(i % 2 ? R * k : R, rot + i * 36, cx, cy))).join("L")}Z`

/** Archimedean spiral from the centre outwards. */
const spiral = (cx: number, cy: number, R: number, turns: number) => {
  const n = Math.round(turns * 12)
  return smooth(Array.from({ length: n + 1 }, (_, i) => pt((R * i) / n, (i / n) * turns * 360, cx, cy)))
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

/** Shapes drawn as a stack of circles with a single outer outline. */
function puff(circles: Circle[], body: string, shade: string, line: string, lw = 1.8) {
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

/** Leaf pointing up from (0,0). */
const LEAF = "M0 0C4.6 -3.4 5 -9.4 0 -14C-5 -9.4 -4.6 -3.4 0 0Z"

/** Rose seen from above, centred at (cx,cy). */
function rose(cx: number, cy: number, R: number, g: { petal: string; cup: string }, rot = 0) {
  const k = R / 10
  return (
    <g transform={`translate(${cx} ${cy}) rotate(${rot}) scale(${r2(k)})`}>
      {[0, 72, 144, 216, 288].map((a) => (
        <circle key={a} cx={0} cy={-5.2} r={5.6} transform={`rotate(${a})`} fill={g.petal} stroke="#6b0a2c" strokeWidth={1} />
      ))}
      <circle r={6.6} fill={g.cup} stroke="#6b0a2c" strokeWidth={0.9} />
      <path d="M-5.6 1.5C-5.5 -4.5 1 -7 5 -3.4" fill="none" stroke="#ffb0c8" strokeOpacity={0.8} strokeWidth={1.1} strokeLinecap="round" />
      <path d="M5.2 0.5C5 5 -1 7 -4.6 3.6" fill="none" stroke="#7a0c33" strokeWidth={1} strokeLinecap="round" />
      <path d="M-3.6 1C-3.6 -2.8 1.8 -4 3.3 -0.6C4.3 2.4 0.6 4.3 -1.6 2.6" fill="none" stroke="#7a0c33" strokeWidth={1} strokeLinecap="round" />
      <path d="M-1.2 0.6C-1.2 -1.4 1.6 -1.6 1.6 0.4" fill="none" stroke="#7a0c33" strokeWidth={0.9} strokeLinecap="round" />
      <ellipse cx={-2.6} cy={-3.4} rx={1.6} ry={0.9} transform="rotate(-30 -2.6 -3.4)" fill="#fff" fillOpacity={0.55} />
    </g>
  )
}

/** Little paw print centred on its pad. */
const paw = (x: number, y: number, s: number, rot: number, fill: string, op = 1) => (
  <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`} fill={fill} fillOpacity={op}>
    <ellipse cx={0} cy={1.6} rx={3.1} ry={2.6} />
    <circle cx={-3.3} cy={-2.3} r={1.35} />
    <circle cx={-1.15} cy={-4} r={1.35} />
    <circle cx={1.15} cy={-4} r={1.35} />
    <circle cx={3.3} cy={-2.3} r={1.35} />
  </g>
)

/** Bunny ear standing on (0,0), `len` tall. */
const bunnyEar = (fill: string, inner: string, line: string, len: number) => (
  <g>
    <path d={`M-13 3C-21 -14 -17 ${-len} 0 ${-len}C17 ${-len} 21 -14 13 3Z`} fill={fill} stroke={line} strokeWidth={2} />
    <path d={`M-6.6 1C-10.8 -12 -9.2 ${-len + 8} 0 ${-len + 8}C9.2 ${-len + 8} 10.8 -12 6.6 1Z`} fill={inner} />
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

/* ── Frames ───────────────────────────────────────────────────────────── */

export const MORE_FRAMES_B: Partial<Record<FrameId, FrameDraw>> = {
  /* ── Cute ── */

  fox: ({ id }) => {
    const earOuter = "M-25 -54Q-24 -77 -7 -96Q-1 -101.5 3.5 -96Q21 -77 25 -54Z"
    const earInner = "M-14 -60Q-12.5 -75 -3.5 -86Q0 -89 3 -85.5Q12 -74 14 -60Z"
    const ear = (a: number) => (
      <g transform={`rotate(${a} 100 100) translate(100 100)`}>
        <path d={earOuter} fill={url(id("ear"))} stroke="#8f360a" strokeWidth={2} strokeLinejoin="round" />
        <path d={earInner} fill={url(id("earIn"))} />
        <path d="M-9 -60L-7 -69M-3 -60L-2.4 -71M3 -60L2.6 -70M9 -60L7.4 -68" stroke="#fff" strokeWidth={1.6} strokeLinecap="round" />
        <path d="M-17 -62Q-16 -77 -7 -89" fill="none" stroke="#fff" strokeOpacity={0.5} strokeWidth={1.8} strokeLinecap="round" />
      </g>
    )
    // bushy tail sweeping round the bottom from the right and curling up the
    // left side; the white tip shares the tail's outer edge
    const TAIL_TIP =
      "C48 183 39 176 37 168C29 164 23 154 23 145C17 137 17 125 22 116C27 126 33 138 44 148"
    const tail =
      "M146 145C156 158 151 175 135 183Q128 189 120 187C112 193 98 194 89 189C79 193 66 190 60 183" +
      TAIL_TIP +
      "C56 158 74 166 96 166C116 166 134 160 146 145Z"
    const tip = `M60 183${TAIL_TIP}Q46 157 54 160Q49 169 57 171Q54 178 60 183Z`
    return (
      <>
        <defs>
          {box(id("ear"), [[0, "#4a1d0c"], [0.17, "#6e2d10"], [0.26, "#ff9f45"], [1, "#f07a1c"]])}
          {box(id("earIn"), [[0, "#ffe6c8"], [1, "#fff8ee"]])}
          {lin(id("tail"), [[0, "#ffa04a"], [1, "#e35d10"]], 0, 140, 0, 194)}
          {ball(id("tip"), [[0, "#ffffff"], [0.6, "#fff7ef"], [1, "#ecd9c6"]], 0.3, 0.3, 0.9)}
          {shadow(id("sh"))}
        </defs>
        <g filter={url(id("sh"))}>
          {ear(-36)}
          {ear(36)}
          {band(id("ring"), {
            stops: [[0, "#ffd89a"], [0.5, "#ffad55"], [1, "#f58a2c"]],
            edge: "#9a3c0a",
            inner: "#8f360a",
            gloss: 0.6,
          })}
          <circle
            cx={100}
            cy={100}
            r={64}
            fill="none"
            stroke="#fff3e0"
            strokeOpacity={0.85}
            strokeWidth={1.5}
            strokeDasharray="4 4.4"
            strokeLinecap="round"
          />
          {paw(...pt(64, 66), 1, 66, "#fff7ec")}
          {paw(...pt(64, 294), 1, -66, "#fff7ec")}
          {/* tail */}
          <path d={tail} fill={url(id("tail"))} stroke="#9a3c0a" strokeWidth={1.8} strokeLinejoin="round" />
          <path d={tip} fill={url(id("tip"))} stroke="#9a3c0a" strokeWidth={1.6} strokeLinejoin="round" />
          <g fill="none" strokeLinecap="round">
            <path d="M138 168Q126 180 108 181M98 183Q84 184 72 178" stroke="#ffd7a8" strokeOpacity={0.9} strokeWidth={2.2} />
            <path d="M126 172Q112 176 100 175" stroke="#c85a14" strokeOpacity={0.5} strokeWidth={1.4} />
            <path d="M38 158Q31 147 31 134M47 168Q41 164 37 158" stroke="#dccab8" strokeWidth={1.4} />
          </g>
        </g>
        {innerShade()}
      </>
    )
  },

  headphones: ({ id }) => {
    const ear = url(id("ear"))
    const earIn = url(id("earIn"))
    const cup = (
      <g>
        <rect x={2} y={-17} width={14} height={34} rx={7} fill={url(id("cush"))} stroke="#c47fae" strokeWidth={1.5} />
        <rect x={-11} y={-21} width={19} height={42} rx={9.5} fill={url(id("cup"))} stroke="#7a5bbd" strokeWidth={1.9} />
        <rect x={-7} y={-15} width={10} height={30} rx={5} fill={url(id("plate"))} stroke="#9d82d8" strokeWidth={1} />
        <path d={heart(-2, 0.5, 3.6)} fill="#ff8fbf" stroke="#e0679e" strokeWidth={0.8} />
        <path d="M-8.5 -13Q-9.4 -4 -8.6 5" fill="none" stroke="#fff" strokeOpacity={0.85} strokeWidth={1.8} strokeLinecap="round" />
      </g>
    )
    const note = (x: number, y: number, s: number, rot: number) => (
      <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`}>
        <path d="M2.4 2V-11L9 -9V-5L4.2 -6.6" fill="none" stroke="#9b78e6" strokeWidth={1.8} strokeLinejoin="round" strokeLinecap="round" />
        <ellipse cx={-0.4} cy={2.4} rx={3.2} ry={2.5} transform="rotate(-20 -0.4 2.4)" fill="#9b78e6" />
      </g>
    )
    return (
      <>
        <defs>
          {box(id("ear"), [[0, "#ffffff"], [0.7, "#f8f2ff"], [1, "#e5d7fb"]])}
          {box(id("earIn"), [[0, "#ffd6e8"], [0.55, "#ffb0d0"], [1, "#ff95c0"]])}
          {box(id("cup"), [[0, "#e7dcff"], [0.5, "#c3adf5"], [1, "#9e82e3"]], 0, 0, 1, 1)}
          {box(id("plate"), [[0, "#fdfbff"], [1, "#e4d8fb"]])}
          {box(id("cush"), [[0, "#ffd3e7"], [1, "#f6a6c9"]], 0, 0, 1, 0)}
          {lin(id("pad"), [[0, "#fbf8ff"], [1, "#d9cbfa"]], 0, 28, 0, 52)}
          {shadow(id("sh"))}
        </defs>
        <g filter={url(id("sh"))}>
          {/* upright ear */}
          <g transform={`translate(${f(pt(64, -24))}) rotate(-17)`}>{bunnyEar(ear, earIn, "#a88cdb", 41)}</g>
          {/* floppy ear, bent over at the top */}
          <g transform={`translate(${f(pt(64, 22))}) rotate(10)`} strokeLinejoin="round">
            <path d="M-13 3C-19 -12 -17 -28 -7 -34C2 -39.6 17 -39 25 -31C30 -26 27 -19 20 -20.4C13 -21.6 12 -13 13 3Z" fill={ear} stroke="#a88cdb" strokeWidth={2} />
            <path d="M-6.6 1C-10.4 -10 -9 -23 -2.6 -27.6C3 -31.6 12 -32 18 -28.6C20 -27.4 19.4 -25 16.4 -25.4C8 -26.2 6.6 -14 6.6 1Z" fill={earIn} />
            <path d="M-9 -12C-10 -20 -7 -27 -2 -31" fill="none" stroke="#fff" strokeOpacity={0.75} strokeWidth={1.8} strokeLinecap="round" />
          </g>
          {band(id("ring"), {
            stops: [[0, "#efe7ff"], [0.5, "#d2c1fb"], [1, "#b39ced"]],
            edge: "#8b6fd0",
            inner: "#7d61c4",
            gloss: 0.8,
          })}
          {/* cushioned headband across the top */}
          <path d={arc(64, -46, 46)} fill="none" stroke="#8b6fd0" strokeWidth={17.6} strokeLinecap="round" />
          <path d={arc(64, -46, 46)} fill="none" stroke={url(id("pad"))} strokeWidth={14.4} strokeLinecap="round" />
          <path d={arc(64, -40, 40)} fill="none" stroke="#b49ae8" strokeWidth={1.3} strokeDasharray="2.6 2.6" strokeLinecap="round" />
          <path d={arc(67.6, -36, 4)} fill="none" stroke="#fff" strokeWidth={2.2} strokeLinecap="round" />
          {/* mic boom from the left cup */}
          <path d="M23 124Q25 152 50 164" fill="none" stroke="#7a5bbd" strokeWidth={4.2} strokeLinecap="round" />
          <path d="M23 124Q25 152 50 164" fill="none" stroke="#d9cbfa" strokeWidth={2} strokeLinecap="round" />
          <g transform="translate(55 165.5) rotate(18)">
            <rect x={-7} y={-4.8} width={14} height={9.6} rx={4.8} fill={url(id("cup"))} stroke="#7a5bbd" strokeWidth={1.6} />
            <path d="M-3 -1.6V1.6M0 -1.6V1.6M3 -1.6V1.6" stroke="#7a5bbd" strokeOpacity={0.6} strokeWidth={1} strokeLinecap="round" />
          </g>
          <g transform="translate(26 106) rotate(5)">{cup}</g>
          <g transform={`${MIRROR} translate(26 106) rotate(5)`}>{cup}</g>
          {note(181, 62, 0.9, 12)}
          {note(17, 66, 0.7, -10)}
          <path d={sparkle(160, 18, 3)} fill="#c7b2ec" />
          <path d={sparkle(186, 148, 3.4)} fill="#ffb0d0" />
          <path d={sparkle(14, 150, 2.6)} fill="#c7b2ec" />
        </g>
        {innerShade()}
      </>
    )
  },

  rainbow: ({ id }) => {
    const bands = ["#ff93ad", "#ffc27d", "#ffe57e", "#9fe3ad", "#8fc9ff"]
    const [cx, cy] = [151, 166]
    const half = (r: number) => `M${cx - r} ${cy}A${r} ${r} 0 0 1 ${cx + r} ${cy}`
    const cloud = (c: Circle[]) => puff(c, "#ffffff", "#dfe5ff", "#8592dc", 1.6)
    return (
      <>
        <defs>
          {ball(id("star"), [[0, "#fffbe0"], [0.5, "#ffe066"], [1, "#ffbf2e"]], 0.4, 0.35, 0.8)}
          {shadow(id("sh"))}
        </defs>
        <g filter={url(id("sh"))}>
          {band(id("ring"), {
            stops: [[0, "#dfe3ff"], [0.5, "#b3bcff"], [1, "#8792f0"]],
            edge: "#6c77d6",
            inner: "#5f6ac7",
            gloss: 0.75,
          })}
          {Array.from({ length: 24 }, (_, i) => {
            const [x, y] = pt(64, i * 15 + 7.5)
            return <circle key={i} cx={x} cy={y} r={i % 2 ? 1.1 : 1.6} fill="#fff" fillOpacity={0.9} />
          })}
          {/* rainbow at the lower right, resting on two clouds */}
          <path d={half(18)} fill="none" stroke="#7c86d2" strokeWidth={19.4} />
          {bands.map((c, i) => (
            <path key={c} d={half(24.6 - i * 3.3)} fill="none" stroke={c} strokeWidth={3.5} />
          ))}
          <path d={`M${cx - 23} ${cy - 3}A23 23 0 0 1 ${cx - 6} ${cy - 21.6}`} fill="none" stroke="#fff" strokeOpacity={0.7} strokeWidth={1.4} strokeLinecap="round" />
          {cloud([
            [124, 170, 6.5],
            [133, 165, 7.5],
            [142, 171, 6],
            [131, 175, 5.5],
          ])}
          {cloud([
            [162, 170, 7.5],
            [174, 162, 9.5],
            [186, 169, 7],
            [175, 175, 7.5],
          ])}
          {/* star and cloud at the top */}
          <path d={star(70, 27, 10.5, -8)} fill={url(id("star"))} stroke="#e09a12" strokeWidth={1.8} strokeLinejoin="round" />
          <ellipse cx={66.5} cy={24} rx={2.4} ry={1.4} transform="rotate(-30 66.5 24)" fill="#fff" fillOpacity={0.85} />
          {cloud([
            [46, 46, 7.5],
            [57, 39, 9.5],
            [69, 43, 7.5],
            [58, 49, 7],
          ])}
          <path d={star(150, 34, 6.5, 10)} fill={url(id("star"))} stroke="#e09a12" strokeWidth={1.5} strokeLinejoin="round" />
          {cloud([
            [158, 55, 5],
            [166, 50, 6.5],
            [174, 56, 5],
          ])}
          {[
            [20, 98, 3.4],
            [184, 104, 2.8],
            [30, 154, 3],
            [118, 12, 2.6],
            [96, 186, 2.6],
          ].map(([x, y, r], i) => (
            <path key={i} d={star(x, y, r)} fill="#ffe066" stroke="#e09a12" strokeWidth={0.8} strokeLinejoin="round" />
          ))}
          <path d={sparkle(186, 30, 3.2)} fill="#b3bcff" />
          <path d={sparkle(16, 60, 2.6)} fill="#b3bcff" />
        </g>
        {innerShade()}
      </>
    )
  },

  horns: ({ id }) => {
    const horn = "M9 2C10 -12 4 -24 -8 -31C-11 -32.6 -14 -31 -13 -28C-8 -20 -8 -9 -9 2Z"
    const hornSide = (t: string) => (
      <g transform={`${t} translate(${f(pt(65, -25))}) rotate(-14)`} strokeLinejoin="round">
        <path d={horn} fill={url(id("horn"))} stroke="#1a1150" strokeWidth={1.9} />
        <path d="M-8.4 -5Q0 -1.6 8.8 -5.6M-8.2 -13Q-1 -10 7 -14M-8.6 -21Q-4 -19 1 -22" fill="none" stroke="#2b2073" strokeOpacity={0.5} strokeWidth={1.2} strokeLinecap="round" />
        <path d="M6 -4C6.4 -14 2 -22 -6 -27.6" fill="none" stroke="#fff" strokeOpacity={0.6} strokeWidth={1.6} strokeLinecap="round" />
      </g>
    )
    const drape =
      "M48 49C31 62 21 80 19 102C18 118 17 130 16 144Q20 149 24.4 143.6Q28.6 149 33 142.6Q37 147 40 140C35 128 33 116 36 102C38 84 45 67 58 56Z"
    const drapeSide = (t: string) => (
      <g transform={t}>
        <path d={drape} fill={url(id("cloth"))} stroke="#9c8fe0" strokeWidth={1.4} strokeLinejoin="round" />
        <path d="M45 58C33 74 26 96 25 118C24.6 128 24.4 136 24.4 141M52 58C42 74 33 94 31 112" fill="none" stroke="#a99cf0" strokeOpacity={0.7} strokeWidth={1.1} strokeLinecap="round" />
        <path d="M44 56C34 66 26 80 24 96" fill="none" stroke="#fff" strokeOpacity={0.8} strokeWidth={1.6} strokeLinecap="round" />
        <circle cx={53} cy={52.5} r={4.2} fill={url(id("bead"))} stroke="#1a1150" strokeWidth={1.3} />
        <circle cx={51.8} cy={51.2} r={1.1} fill="#fff" />
      </g>
    )
    return (
      <>
        <defs>
          {box(id("horn"), [[0, "#a796ff"], [0.5, "#5e4ccc"], [1, "#2f257d"]], 0, 0, 1, 1)}
          {box(id("cloth"), [[0, "#f6f3ff", 0.95], [1, "#d8d0ff", 0.86]])}
          {ball(id("bead"), [[0, "#ffd0ec"], [0.5, "#ff6fbd"], [1, "#c2187a"]])}
          {ball(id("tip"), [[0, "#ffc2e4"], [0.5, "#ff5aa8"], [1, "#c2127a"]], 0.35, 0.3, 0.8)}
          {shadow(id("sh"))}
        </defs>
        <g filter={url(id("sh"))}>
          {hornSide("")}
          {hornSide(MIRROR)}
          {/* little devil tail behind the ring */}
          <path d="M150 145C162 170 182 172 184 154" fill="none" stroke="#1a1150" strokeWidth={4.6} strokeLinecap="round" />
          <path d="M150 145C162 170 182 172 184 154" fill="none" stroke="#5446bf" strokeWidth={2.4} strokeLinecap="round" />
          <path d={heart(184.6, 148, 6)} transform="rotate(200 184.6 148)" fill={url(id("tip"))} stroke="#1a1150" strokeWidth={1.4} />
          {band(id("ring"), {
            stops: [[0, "#6152cf"], [0.5, "#3b3099"], [1, "#221a66"]],
            edge: "#140f40",
            inner: "#120d3a",
            gloss: 0.4,
          })}
          <circle cx={100} cy={100} r={59.2} fill="none" stroke="#ff8fd0" strokeOpacity={0.7} strokeWidth={1} />
          {[20, 52, 112, 140, 168, 196, 226, 250, 340].map((a, i) => {
            const [x, y] = pt(i % 2 ? 61.8 : 66.2, a)
            return <circle key={a} cx={x} cy={y} r={i % 3 ? 0.9 : 1.3} fill="#fff" fillOpacity={0.85} />
          })}
          <path d={sparkle(...pt(64, 180), 3.4)} fill="#ffd6f0" />
          <path d={sparkle(...pt(64, 120), 2.6)} fill="#ffd6f0" />
          <path d={sparkle(...pt(64, 240), 2.6)} fill="#ffd6f0" />
          {drapeSide("")}
          {drapeSide(MIRROR)}
          {[
            [100, 14, 3.4, "#ffb3e0"],
            [74, 22, 2.4, "#c9bcff"],
            [128, 20, 2.6, "#c9bcff"],
            [12, 72, 2.6, "#ffb3e0"],
            [188, 80, 3, "#c9bcff"],
            [44, 178, 3.2, "#ffb3e0"],
          ].map(([x, y, r, c], i) => (
            <path key={i} d={sparkle(x as number, y as number, r as number)} fill={c as string} />
          ))}
        </g>
        {innerShade()}
      </>
    )
  },

  unicorn: ({ id }) => {
    const hornD = "M-8.5 0Q-4.5 -17 0 -34Q4.5 -17 8.5 0Q0 2.5 -8.5 0Z"
    const earOuter = "M-11 -60Q-10 -74 -2 -81Q0 -83 2 -81Q10 -74 11 -60Z"
    const earInner = "M-5.5 -63Q-5 -71 -1 -75.5Q0 -76.5 1 -75.5Q5 -71 5.5 -63Z"
    const ear = (a: number) => (
      <g transform={`rotate(${a} 100 100) translate(100 100)`}>
        <path d={earOuter} fill="#fff" stroke="#d45a9c" strokeWidth={1.8} strokeLinejoin="round" />
        <path d={earInner} fill="#ffb0d6" />
      </g>
    )
    type Lock = [string, string, number, number, (t: number) => number, (t: number) => number]
    const wave = (t: number, k: number, ph: number) => Math.sin(t * Math.PI * k + ph)
    const locks: Lock[] = [
      ["mA", "#7c64d6", -2, -122, (t) => 73 + 6 * wave(t, 2.2, 0) + t * t * 7, (t) => 18 * (1 - t) ** 0.6 + 1],
      ["mB", "#4f9fd8", -6, -96, (t) => 70 + 6 * wave(t, 2.2, 1.2) + t * t * 10, (t) => 12 * (1 - t) ** 0.6 + 1],
      ["mC", "#3fae95", 0, -70, (t) => 81 + 5 * wave(t, 2, 2.4) + t * t * 6, (t) => 9 * (1 - t) ** 0.6 + 1],
      ["mD", "#e0954a", 6, 50, (t) => 72 + 4 * wave(t, 1.6, 0.5) + t * t * 8, (t) => 11 * (1 - t) ** 0.7 + 1],
    ]
    return (
      <>
        <defs>
          {box(id("mA"), [[0, "#e6dcff"], [1, "#b69df5"]])}
          {box(id("mB"), [[0, "#d6f0ff"], [1, "#8fc9f5"]])}
          {box(id("mC"), [[0, "#dcfff2"], [1, "#94e0c8"]])}
          {box(id("mD"), [[0, "#fff3dc"], [1, "#ffc98a"]], 0, 0, 1, 0)}
          {lin(id("horn"), [[0, "#fff6cf"], [0.5, "#ffd36b"], [1, "#e0a020"]], 92, 0, 108, 0)}
          {glow(id("hg"), 100, 22, 24, "#fff1a8", 0.7)}
          {ball(id("ht"), [[0, "#ffe0ee"], [0.5, "#ff8fc0"], [1, "#e25595"]], 0.35, 0.3, 0.8)}
          <clipPath id={id("hc")}>
            <path d={hornD} transform="translate(100 37)" />
          </clipPath>
          {shadow(id("sh"))}
        </defs>
        <circle cx={100} cy={22} r={24} fill={url(id("hg"))} />
        <g filter={url(id("sh"))}>
          {ear(-27)}
          {ear(27)}
          {band(id("ring"), {
            stops: [[0, "#ffd9ee"], [0.5, "#ffabd6"], [1, "#f27cbd"]],
            edge: "#d45a9c",
            inner: "#c24d8c",
            gloss: 0.75,
          })}
          {[118, 150, 180, 210, 242].map((a, i) => {
            const [x, y] = pt(64, a)
            return (
              <path
                key={a}
                d={heart(0, 0, i % 2 ? 3.6 : 4.4)}
                transform={`translate(${x} ${y}) rotate(${a})`}
                fill={i % 2 ? "#fff" : url(id("ht"))}
                stroke={i % 2 ? "#f08cc0" : "#c24d8c"}
                strokeWidth={0.9}
              />
            )
          })}
          {/* mane */}
          {locks.map(([g, line, a0, a1, rc, w]) => (
            <g key={g}>
              <path d={strand(a0, a1, rc, w, 40)} fill={url(id(g))} stroke={line} strokeWidth={1.6} strokeLinejoin="round" />
              <path d={strandLine(a0, a1, rc, 0.06, 0.7, 24)} fill="none" stroke="#fff" strokeOpacity={0.75} strokeWidth={1.6} strokeLinecap="round" />
            </g>
          ))}
          {/* spiral golden horn */}
          <g transform="translate(100 37)">
            <path d={hornD} fill={url(id("horn"))} stroke="#b07a0c" strokeWidth={1.8} strokeLinejoin="round" />
          </g>
          <g clipPath={url(id("hc"))} fill="none" stroke="#c98a10" strokeWidth={1.4} strokeLinecap="round">
            {[33, 26, 19, 12].map((y) => (
              <path key={y} d={`M90 ${y + 3}Q100 ${y + 1} 110 ${y - 4}`} />
            ))}
          </g>
          <path d="M97 33Q98 22 99.6 9" fill="none" stroke="#fff" strokeOpacity={0.85} strokeWidth={1.5} strokeLinecap="round" />
          <path d={sparkle(124, 12, 3.6)} fill="#ffd36b" />
          <path d={sparkle(76, 16, 2.6)} fill="#ffb0d6" />
          <path d={sparkle(186, 112, 3)} fill="#c7b2ec" />
          <path d={sparkle(172, 164, 2.6)} fill="#ffb0d6" />
          <path d={heart(176, 140, 4.2)} transform="rotate(16 176 140)" fill={url(id("ht"))} stroke="#fff" strokeWidth={1.2} />
          <path d={heart(36, 170, 3.4)} transform="rotate(-14 36 170)" fill={url(id("ht"))} stroke="#fff" strokeWidth={1.1} />
        </g>
        {innerShade()}
      </>
    )
  },

  butterfly: ({ id }) => {
    const upper = "M46 74C38 54 24 34 8 20C3 36 2 56 8 72C13 84 24 92 36 94Z"
    const lower = "M38 108C26 114 14 128 13 144C12 158 24 166 35 158C43 152 47 138 48 124Z"
    const wing = (t: string) => (
      <g transform={t} strokeLinejoin="round">
        <path d={upper} fill={url(id("wu"))} stroke="#4b3fb3" strokeWidth={1.8} />
        <path d={lower} fill={url(id("wl"))} stroke="#4b3fb3" strokeWidth={1.8} />
        <g fill="none" stroke="#5a4fd6" strokeOpacity={0.5} strokeWidth={1.1} strokeLinecap="round">
          <path d="M42 78L14 30M40 84L9 54M38 90L14 78" />
          <path d="M42 116L18 138M42 122L26 156" />
        </g>
        <ellipse cx={22} cy={46} rx={7.5} ry={9} transform="rotate(-30 22 46)" fill="#fff" fillOpacity={0.55} stroke="#6d63e6" strokeWidth={1.2} />
        <circle cx={22} cy={46} r={3.6} fill="#6d63e6" fillOpacity={0.85} />
        <circle cx={21} cy={44.8} r={1.1} fill="#fff" />
        <circle cx={24} cy={143} r={5} fill="#fff" fillOpacity={0.5} stroke="#c66ad8" strokeWidth={1.1} />
        <circle cx={24} cy={143} r={2.2} fill="#c66ad8" />
        {[
          [9, 30],
          [5.6, 46],
          [6, 61],
          [16, 155],
          [27, 162],
        ].map(([x, y], i) => (
          <circle key={i} cx={x + 2.6} cy={y} r={1.3} fill="#fff" fillOpacity={0.9} />
        ))}
        <path d="M40 72C34 58 24 42 13 30" fill="none" stroke="#fff" strokeOpacity={0.7} strokeWidth={1.5} strokeLinecap="round" />
      </g>
    )
    const antenna = "M92 36C89 22 82 13 72 11C64 9.6 61 18 66.4 20.4C70 22 72.4 17.6 69.4 16"
    return (
      <>
        <defs>
          {ball(id("wu"), [[0, "#e6d4ff", 0.8], [0.5, "#a5b4ff", 0.85], [1, "#7468f0", 0.92]], 0.85, 0.9, 0.95)}
          {ball(id("wl"), [[0, "#ffe0f6", 0.8], [0.55, "#d4a6ff", 0.88], [1, "#9a6cf0", 0.92]], 0.9, 0.1, 0.95)}
          {ball(id("gem"), [[0, "#e6fbff"], [0.4, "#7fdcff"], [1, "#3a7fe0"]])}
          {shadow(id("sh"))}
        </defs>
        <g filter={url(id("sh"))}>
          {wing("")}
          {wing(MIRROR)}
          {[0, 1].map((m) => (
            <g key={m} transform={m ? MIRROR : undefined}>
              <path d={antenna} fill="none" stroke="#3b31a0" strokeWidth={2.2} strokeLinecap="round" />
              <circle cx={69.2} cy={17.4} r={2} fill="#7fdcff" stroke="#3b31a0" strokeWidth={1} />
            </g>
          ))}
          {band(id("ring"), {
            stops: [[0, "#b3c2ff"], [0.5, "#8189f2"], [1, "#5a4fd6"]],
            edge: "#3b31a0",
            inner: "#352b92",
            gloss: 0.6,
          })}
          {Array.from({ length: 36 }, (_, i) => {
            const [x, y] = pt(64, i * 10 + 5)
            return <circle key={i} cx={x} cy={y} r={i % 3 ? 0.9 : 1.5} fill="#fff" fillOpacity={0.85} />
          })}
          {/* gem at the bottom */}
          <g transform="translate(100 168)">
            <path d="M-12 -2Q-6 -8 0 -2Q6 -8 12 -2Q6 2 0 -2Q-6 2 -12 -2Z" fill="#c9b8ff" stroke="#3b31a0" strokeWidth={1.2} strokeLinejoin="round" />
            <path d="M0 -8L6 0L0 9L-6 0Z" fill={url(id("gem"))} stroke="#2a3a9a" strokeWidth={1.3} strokeLinejoin="round" />
            <path d="M-2.6 -2L0 -5.4" stroke="#fff" strokeWidth={1.4} strokeLinecap="round" />
          </g>
          <path d={sparkle(100, 14, 3.6)} fill="#bdeaff" />
          <path d={sparkle(186, 108, 2.8)} fill="#bdeaff" />
          <path d={sparkle(14, 108, 2.8)} fill="#e6d4ff" />
          <path d={sparkle(60, 182, 2.6)} fill="#bdeaff" />
          <path d={sparkle(142, 184, 2.4)} fill="#e6d4ff" />
        </g>
        {innerShade()}
      </>
    )
  },

  witch: ({ id }) => {
    const [hx, hy] = pt(66, 36)
    const [bx, by] = pt(72, 228)
    const [px, py] = pt(76, 141)
    return (
      <>
        <defs>
          {lin(id("gold"), [[0, "#fff4c2"], [0.5, "#f3c552"], [1, "#b9831f"]], 0, 28, 0, 172)}
          {box(id("hat"), [[0, "#6a46d0"], [1, "#2d1a78"]], 0, 0, 1, 1)}
          {box(id("brim"), [[0, "#5a38c0"], [1, "#2a176e"]])}
          {box(id("hband"), [[0, "#ff8fd0"], [1, "#d93c95"]])}
          {box(id("buckle"), [[0, "#fff1b0"], [1, "#e0a020"]])}
          {ball(id("orb"), [[0, "#f4ffff"], [0.3, "#a6f4ff"], [0.75, "#46bfe6"], [1, "#2a6fc0"]], 0.35, 0.3, 0.8)}
          {glow(id("og"), bx, by, 30, "#7ff0ff", 0.7)}
          {ball(id("brew"), [[0, "#ffd0ef"], [0.5, "#ff6fc8"], [1, "#c21f8a"]], 0.4, 0.3, 0.8)}
          {shadow(id("sh"))}
        </defs>
        <circle cx={bx} cy={by} r={30} fill={url(id("og"))} />
        <g filter={url(id("sh"))}>
          {band(id("ring"), {
            stops: [[0, "#c6a2ff"], [0.5, "#915ce8"], [1, "#5c2db6"]],
            edge: url(id("gold")),
            inner: url(id("gold")),
            shade: "#3a1678",
            gloss: 0.6,
          })}
          <circle cx={100} cy={100} r={70.6} fill="none" stroke={url(id("gold"))} strokeWidth={2.2} />
          <circle cx={100} cy={100} r={71.9} fill="none" stroke="#5a3a0a" strokeOpacity={0.6} strokeWidth={0.7} />
          <circle cx={100} cy={100} r={57.9} fill="none" stroke={url(id("gold"))} strokeWidth={2} />
          {[78, 110, 162, 196, 282, 312, 340].map((a, i) => (
            <path key={a} d={star(...pt(64, a), i % 2 ? 2.4 : 3.2, a)} fill="#ffe28a" stroke="#c98a12" strokeWidth={0.6} strokeLinejoin="round" />
          ))}
          {/* witch hat, upper right */}
          <g transform={`translate(${hx} ${hy}) rotate(28)`} strokeLinejoin="round">
            <ellipse cx={0} cy={-1} rx={31} ry={8.6} fill={url(id("brim"))} stroke="#1c0f4a" strokeWidth={1.9} />
            <path
              d="M-16 -2C-13 -18 -6 -34 4 -42C10 -47 19 -47 25 -40C19 -41 14 -37 12 -30C10 -21 13 -10 16 -2Q0 3 -16 -2Z"
              fill={url(id("hat"))}
              stroke="#1c0f4a"
              strokeWidth={1.9}
            />
            <path d="M-15.4 -4.6Q0 0.4 15.4 -4.6L14 -11.6Q0 -7 -13.8 -11.6Z" fill={url(id("hband"))} stroke="#1c0f4a" strokeWidth={1.4} />
            <rect x={-4.6} y={-12.6} width={9.2} height={8.8} rx={1.6} fill={url(id("buckle"))} stroke="#8a5c08" strokeWidth={1.2} />
            <rect x={-2} y={-10.2} width={4} height={4} rx={0.6} fill="#c03a88" />
            <path d="M-10 -14C-8 -24 -3 -33 3 -38" fill="none" stroke="#b9a0ff" strokeOpacity={0.7} strokeWidth={1.6} strokeLinecap="round" />
            <path d="M-26 -4Q-10 -9.4 10 -8.6" fill="none" stroke="#8d6ae8" strokeOpacity={0.6} strokeWidth={1.3} strokeLinecap="round" />
            <path d={star(3, -24, 3.4, 10)} fill="#ffe28a" stroke="#c98a12" strokeWidth={0.6} strokeLinejoin="round" />
          </g>
          {/* crystal ball on a golden stand, lower left */}
          <g transform={`translate(${bx} ${by})`}>
            <path d="M-11 9Q0 13 11 9L14.5 17.5Q0 22 -14.5 17.5Z" fill={url(id("buckle"))} stroke="#8a5c08" strokeWidth={1.4} strokeLinejoin="round" />
            <circle cx={0} cy={-2} r={14} fill={url(id("orb"))} stroke="#2a5aa8" strokeWidth={1.7} />
            <path d="M-8 2C-4 -3 3 4 8 -1" fill="none" stroke="#fff" strokeOpacity={0.6} strokeWidth={1.4} strokeLinecap="round" />
            <path d={sparkle(3.4, -5, 3.4)} fill="#fff" />
            <ellipse cx={-6} cy={-9} rx={3.6} ry={2.2} transform="rotate(-35 -6 -9)" fill="#fff" fillOpacity={0.9} />
            <path d="M-12.6 17.4Q0 21 12.6 17.4" fill="none" stroke="#fff6cf" strokeWidth={1.1} />
          </g>
          {/* potion bottle, lower right */}
          <g transform={`translate(${px} ${py}) rotate(-12)`} strokeLinejoin="round">
            <circle cx={0} cy={5} r={9.4} fill="#fff" fillOpacity={0.55} stroke="#3a1678" strokeWidth={1.6} />
            <path d="M-9.2 4Q0 1 9.2 4A9.2 9.2 0 0 1 -9.2 4Z" fill={url(id("brew"))} />
            <rect x={-3.6} y={-10} width={7.2} height={8} fill="#fff" fillOpacity={0.6} stroke="#3a1678" strokeWidth={1.5} />
            <rect x={-4.8} y={-15} width={9.6} height={5.4} rx={1.6} fill="#c27a3a" stroke="#5c3010" strokeWidth={1.3} />
            <circle cx={3} cy={8} r={1.5} fill="#fff" fillOpacity={0.8} />
            <circle cx={-2.4} cy={10} r={1} fill="#fff" fillOpacity={0.8} />
            <path d="M-5.6 0C-7.2 2 -7.6 5 -7 7.6" fill="none" stroke="#fff" strokeWidth={1.6} strokeLinecap="round" />
            <circle cx={5.6} cy={-16} r={1.5} fill="#ffb0e0" />
            <circle cx={8} cy={-20.6} r={1.1} fill="#ffb0e0" />
          </g>
          {[
            [22, 108, 4, "#ffe28a"],
            [76, 186, 3, "#a6f4ff"],
            [186, 104, 3.2, "#ffe28a"],
            [60, 18, 3, "#d6c2ff"],
            [20, 66, 2.6, "#a6f4ff"],
            [178, 182, 2.6, "#ffb0e0"],
          ].map(([x, y, r, c], i) => (
            <path key={i} d={sparkle(x as number, y as number, r as number)} fill={c as string} />
          ))}
        </g>
        {innerShade()}
      </>
    )
  },

  /* ── Love ── */

  neon_heart: ({ id }) => {
    // the heart is drawn in one stroke: in from the ring, a small loop,
    // round the heart, and back out to the ring
    const line =
      `M${f(pt(68.6, 232))}C50 162 60 176 70 178C78 179.6 80 172 75.6 170.4C71 169 68.6 176 74 179.6` +
      "C80 183 90 184 100 186C92 180 83 172 83 164C83 157.6 88 154 93 154C97 154 99 157 100 160" +
      "C101 157 103 154 107 154C112 154 117 157.6 117 164C117 172 108 180 100 186" +
      "C112 186 126 182 134 174C140 168 146 166 150 168C154 170 152 175 148 173"
    const tubes = (
      <>
        <circle cx={100} cy={100} r={59.4} fill="none" strokeWidth={2.8} />
        <circle cx={100} cy={100} r={68.6} fill="none" strokeWidth={2} />
        <path d={line} fill="none" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" />
      </>
    )
    return (
      <>
        <defs>
          <filter id={id("blur")} x="0" y="0" width="200" height="200" filterUnits="userSpaceOnUse">
            <feGaussianBlur stdDeviation={2.6} />
          </filter>
        </defs>
        {/* dark glass the tubes are mounted on */}
        <circle cx={100} cy={100} r={64} fill="none" stroke="#230b2e" strokeOpacity={0.9} strokeWidth={13} />
        <circle cx={100} cy={100} r={70.5} fill="none" stroke="#4a1a52" strokeWidth={1} />
        <g filter={url(id("blur"))} stroke="#ff3fa4" strokeWidth={5}>
          <circle cx={100} cy={100} r={59.4} fill="none" strokeWidth={5} />
          <circle cx={100} cy={100} r={68.6} fill="none" stroke="#c45cff" strokeWidth={4} />
          <path d={line} fill="none" strokeWidth={5.6} strokeLinecap="round" />
        </g>
        <g stroke="#ff4fae">
          <circle cx={100} cy={100} r={59.4} fill="none" strokeWidth={2.8} />
          <path d={line} fill="none" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" />
        </g>
        <circle cx={100} cy={100} r={68.6} fill="none" stroke="#c76bff" strokeWidth={2} />
        <g stroke="#ffe0f1" strokeOpacity={0.95}>{tubes}</g>
        <g fill="none" stroke="#ff8ccb" strokeWidth={1.4} strokeLinecap="round">
          <path d="M162 34L170 26M166 38L174 36M158 30L159 22" />
          <path d="M36 52L28 46M34 58L24 58" />
        </g>
        <path d={sparkle(...pt(64, 52), 3.2)} fill="#fff0f8" />
        <path d={sparkle(...pt(64, 300), 2.6)} fill="#fff0f8" />
      </>
    )
  },

  sweet_candy: ({ id }) => {
    const [cx, cy] = pt(74, 220)
    const candy = (x: number, y: number, rot: number, s: number, g: string, line: string) => (
      <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`} strokeLinejoin="round">
        <path d="M-6 0L-12 -5L-11.4 5ZM6 0L12 -5L11.4 5Z" fill={g} stroke={line} strokeWidth={1.2} />
        <ellipse rx={7.2} ry={5.6} fill={g} stroke={line} strokeWidth={1.4} />
        <path d="M-3 -4L-5 4M1 -5.4L-1 5.4M5 -4L3 4" stroke="#fff" strokeOpacity={0.75} strokeWidth={1.3} strokeLinecap="round" />
        <ellipse cx={-2.4} cy={-2.6} rx={2} ry={1.1} fill="#fff" fillOpacity={0.8} />
      </g>
    )
    const sprinkles: [number, string][] = [
      [26, "#7fd6ff"],
      [48, "#ffe066"],
      [70, "#9fe3ad"],
      [96, "#c3a4ff"],
      [118, "#ffffff"],
      [142, "#7fd6ff"],
      [164, "#ffe066"],
      [262, "#9fe3ad"],
      [292, "#7fd6ff"],
      [316, "#ffe066"],
      [338, "#c3a4ff"],
      [4, "#ffffff"],
    ]
    return (
      <>
        <defs>
          {ball(id("pop"), [[0, "#ffffff"], [0.5, "#ffd0e4"], [1, "#ff8fbe"]], 0.4, 0.35, 0.75)}
          {box(id("wrap"), [[0, "#a8ecd8"], [1, "#5ec4a8"]], 0, 0, 1, 0)}
          {ball(id("frost"), [[0, "#ffffff"], [0.6, "#ffe2ee"], [1, "#ffbcd8"]], 0.4, 0.3, 0.8)}
          {ball(id("cherry"), [[0, "#ff9a9a"], [0.6, "#e8243a"], [1, "#a00d20"]])}
          {ball(id("cA"), [[0, "#fff6b0"], [1, "#ffbf2e"]])}
          {ball(id("cB"), [[0, "#d8f4ff"], [1, "#6cc0f5"]])}
          {shadow(id("sh"))}
        </defs>
        <g filter={url(id("sh"))}>
          {band(id("ring"), {
            stops: [[0, "#ffdcec"], [0.5, "#ffa8cd"], [1, "#ff7fb2"]],
            edge: "#e0558f",
            inner: "#d2467f",
            gloss: 0.75,
          })}
          <circle cx={100} cy={100} r={64} fill="none" stroke="#fff" strokeOpacity={0.4} strokeWidth={11} strokeDasharray="4.4 7.6" />
          {sprinkles.map(([a, c], i) => {
            const [x, y] = pt(64, a)
            return <rect key={i} x={x - 2.6} y={y - 0.9} width={5.2} height={1.8} rx={0.9} fill={c} transform={`rotate(${a * 2.3} ${x} ${y})`} />
          })}
          {/* swirl lollipop, stick behind the cupcake */}
          <path d="M28 128L54 160" stroke="#c9b6a8" strokeWidth={4.2} strokeLinecap="round" />
          <path d="M28 128L54 160" stroke="#ffffff" strokeWidth={2.4} strokeLinecap="round" />
          <circle cx={26} cy={122} r={14} fill={url(id("pop"))} stroke="#d2467f" strokeWidth={1.8} />
          <path d={spiral(26, 122, 12.4, 2.6)} fill="none" stroke="#ff4f95" strokeWidth={3.2} strokeLinecap="round" />
          <ellipse cx={20} cy={115} rx={3.4} ry={2} transform="rotate(-35 20 115)" fill="#fff" fillOpacity={0.85} />
          {/* cupcake */}
          <g transform={`translate(${cx} ${cy})`} strokeLinejoin="round">
            <path d="M-14 0L-10 17Q0 19.5 10 17L14 0Z" fill={url(id("wrap"))} stroke="#2f8f78" strokeWidth={1.7} />
            <path d="M-7 1.5L-5.4 17.4M0 2L0 18.4M7 1.5L5.4 17.4" stroke="#2f8f78" strokeOpacity={0.55} strokeWidth={1.2} />
            {puff(
              [
                [-9, -2, 6.6],
                [0, -3, 7.6],
                [9, -2, 6.6],
                [-4, -10, 6.4],
                [4.6, -10, 6],
                [0, -16, 4.6],
              ],
              url(id("frost")),
              "#ffbcd8",
              "#e0558f",
              1.6,
            )}
            {[
              [-8, -4, 30, "#7fd6ff"],
              [3, -5, -20, "#ffe066"],
              [-2, -11, 70, "#9fe3ad"],
              [7, -11, 10, "#c3a4ff"],
              [10, -3, 60, "#7fd6ff"],
            ].map(([x, y, r, c], i) => (
              <rect key={i} x={(x as number) - 2} y={(y as number) - 0.8} width={4} height={1.6} rx={0.8} fill={c as string} transform={`rotate(${r} ${x} ${y})`} />
            ))}
            <path d="M1 -22Q3 -28 8 -29" fill="none" stroke="#3f7a35" strokeWidth={1.3} strokeLinecap="round" />
            <circle cx={0} cy={-21} r={4.2} fill={url(id("cherry"))} stroke="#7a0a15" strokeWidth={1.2} />
            <circle cx={-1.4} cy={-22.4} r={1.1} fill="#fff" />
          </g>
          {candy(...pt(78, 196), 20, 0.95, url(id("cA")), "#c98a10")}
          {candy(...pt(79, 302), -40, 0.8, url(id("cB")), "#2f7fbf")}
          {candy(...pt(76, 42), 40, 0.8, url(id("cB")), "#2f7fbf")}
          <path d={heart(176, 128, 4.6)} transform="rotate(14 176 128)" fill="#ff7fb2" stroke="#fff" strokeWidth={1.2} />
          <path d={sparkle(160, 22, 3.4)} fill="#ffc2dc" />
          <path d={sparkle(186, 96, 2.8)} fill="#ffe066" />
          <path d={sparkle(100, 186, 2.8)} fill="#ffc2dc" />
          <path d={sparkle(44, 34, 2.6)} fill="#7fd6ff" />
          <circle cx={30} cy={178} r={1.8} fill="#ffe066" />
          <circle cx={14} cy={160} r={1.6} fill="#7fd6ff" />
        </g>
        {innerShade()}
      </>
    )
  },

  love_letter: ({ id }) => {
    const g = { petal: url(id("petal")), cup: url(id("cup")) }
    const leaf = (a: number, r: number, rot: number, s = 1) => {
      const [x, y] = pt(r, a)
      return (
        <g key={`${a}-${rot}`} transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`}>
          <path d={LEAF} fill={url(id("leaf"))} stroke="#2c5e24" strokeWidth={0.9} />
          <path d="M0 -1.5L0 -11" stroke="#2c5e24" strokeOpacity={0.5} strokeWidth={0.7} />
        </g>
      )
    }
    const [ex, ey] = pt(77, 136)
    return (
      <>
        <defs>
          {box(id("leaf"), [[0, "#a6dc84"], [1, "#3e8a36"]])}
          {ball(id("petal"), [[0, "#ff6f96"], [1, "#b8123f"]], 0.5, 0.5, 0.6)}
          {ball(id("cup"), [[0, "#ff8fae"], [0.6, "#e8325f"], [1, "#b01540"]], 0.4, 0.35, 0.75)}
          {box(id("env"), [[0, "#ffffff"], [1, "#f3eaf6"]])}
          {box(id("flap"), [[0, "#ffffff"], [1, "#e9def0"]])}
          {ball(id("seal"), [[0, "#ffa0b4"], [0.5, "#e8284e"], [1, "#a00d2c"]], 0.35, 0.3, 0.8)}
          {shadow(id("sh"))}
        </defs>
        <g filter={url(id("sh"))}>
          {band(id("ring"), {
            stops: [[0, "#e2e5ff"], [0.5, "#bac1f8"], [1, "#9198e6"]],
            edge: "#6f74c9",
            inner: "#6268bb",
            gloss: 0.8,
          })}
          {Array.from({ length: 30 }, (_, i) => {
            const [x, y] = pt(64, i * 12)
            return <circle key={i} cx={x} cy={y} r={1.2} fill="#fff" fillOpacity={0.9} />
          })}
          {/* roses with leaves, lower left */}
          {leaf(250, 72, 300, 1.1)}
          {leaf(236, 78, 252, 1.15)}
          {leaf(202, 76, 192)}
          {leaf(190, 70, 140, 0.9)}
          {leaf(222, 82, 210, 1.1)}
          {leaf(262, 70, 330)}
          {rose(...pt(70, 222), 13.5, g, 15)}
          {rose(...pt(71, 245), 10.5, g, 70)}
          {rose(...pt(72, 199), 9.5, g, 140)}
          <circle cx={pt(80, 212)[0]} cy={pt(80, 212)[1]} r={2} fill="#ffd6e2" stroke="#e8325f" strokeWidth={0.8} />
          <circle cx={pt(66, 260)[0]} cy={pt(66, 260)[1]} r={1.7} fill="#ffd6e2" stroke="#e8325f" strokeWidth={0.8} />
          {/* sealed love letter, lower right */}
          <g transform={`translate(${ex} ${ey}) rotate(-16)`} strokeLinejoin="round">
            <rect x={-18} y={-12} width={36} height={24} rx={2.4} fill={url(id("env"))} stroke="#6f74c9" strokeWidth={1.7} />
            <path d="M-17 11L-4 1M17 11L4 1" fill="none" stroke="#c7c9ee" strokeWidth={1.2} strokeLinecap="round" />
            <path d="M-17.4 -11L0 3L17.4 -11" fill={url(id("flap"))} stroke="#6f74c9" strokeWidth={1.5} />
            <path d={heart(0, 1.6, 5.4)} fill={url(id("seal"))} stroke="#7a0a20" strokeWidth={1.1} />
            <ellipse cx={-1.8} cy={-0.6} rx={1.5} ry={0.9} transform="rotate(-30 -1.8 -0.6)" fill="#fff" fillOpacity={0.8} />
          </g>
          {/* floating hearts */}
          <path d={heart(150, 28, 6.4)} transform="rotate(14 150 28)" fill={url(id("seal"))} stroke="#fff" strokeWidth={1.5} />
          <path d={heart(168, 46, 4.2)} transform="rotate(22 168 46)" fill="#ff8fae" stroke="#fff" strokeWidth={1.2} />
          <path d={heart(134, 16, 3)} transform="rotate(-10 134 16)" fill="#ffb0c4" stroke="#fff" strokeWidth={1} />
          <path d={sparkle(186, 112, 3)} fill="#bac1f8" />
          <path d={sparkle(30, 44, 3.2)} fill="#ffb0c4" />
          <path d={sparkle(100, 186, 2.6)} fill="#bac1f8" />
        </g>
        {innerShade()}
      </>
    )
  },

  party: ({ id }) => {
    const flags = ["#ff7fae", "#7fd6c0", "#7fb8ff", "#c3a4ff", "#ffa64d"]
    const rOf = (a: number) => 75.5 - 3 * Math.abs(Math.sin(rad(((a + 86) * 180) / 24)))
    const string: Pt[] = []
    for (let a = -86; a <= 14; a += 3) string.push(pt(rOf(a), a))
    const pennants = Array.from({ length: 9 }, (_, i) => {
      const a = -78 + i * 11
      const [x, y] = pt(rOf(a), a)
      return (
        <path
          key={i}
          d={`M${r2(x - 4.4)} ${y}L${r2(x + 4.4)} ${y}L${x} ${r2(y + 10)}Z`}
          transform={`rotate(${r2(a * 0.8)} ${x} ${y})`}
          fill={flags[i % flags.length]}
          stroke="#6b4a0c"
          strokeWidth={1}
          strokeLinejoin="round"
        />
      )
    })
    const balloon = (x: number, y: number, rx: number, ry: number, g: string, line: string, rot: number) => (
      <g transform={`rotate(${rot} ${x} ${y})`}>
        <path d={`M${x} ${y + ry - 1}L${x - 2.6} ${y + ry + 3.4}L${x + 2.6} ${y + ry + 3.4}Z`} fill={line} />
        <ellipse cx={x} cy={y} rx={rx} ry={ry} fill={g} stroke={line} strokeWidth={1.6} />
        <ellipse cx={x - rx * 0.4} cy={y - ry * 0.42} rx={rx * 0.24} ry={ry * 0.18} transform={`rotate(-30 ${x - rx * 0.4} ${y - ry * 0.42})`} fill="#fff" fillOpacity={0.85} />
      </g>
    )
    const confetti: [number, number, number, string][] = [
      [12, 120, 20, "#ff7fae"],
      [22, 108, -30, "#7fb8ff"],
      [8, 140, 60, "#ffd23a"],
      [30, 122, 45, "#7fd6c0"],
      [18, 132, -10, "#c3a4ff"],
      [36, 112, 80, "#ffa64d"],
      [6, 104, 10, "#7fd6c0"],
      [26, 96, -50, "#ff7fae"],
    ]
    return (
      <>
        <defs>
          {ball(id("bA"), [[0, "#ffd6e6"], [0.5, "#ff7fae"], [1, "#e0457f"]])}
          {ball(id("bB"), [[0, "#dcf0ff"], [0.5, "#7fb8ff"], [1, "#3f7fe0"]])}
          {ball(id("bC"), [[0, "#e6fff6"], [0.5, "#7fd6c0"], [1, "#2fa888"]])}
          {box(id("cone"), [[0, "#ffd86b"], [1, "#ff9a2e"]])}
          {ball(id("cloud"), [[0, "#ffffff"], [1, "#e4f1ff"]], 0.4, 0.3, 0.8)}
          {shadow(id("sh"))}
        </defs>
        <g filter={url(id("sh"))}>
          {/* balloon strings behind the ring */}
          <g fill="none" stroke="#8a6a3a" strokeWidth={1} strokeLinecap="round">
            <path d="M159 39Q154 50 148 60" />
            <path d="M180 56Q166 60 150 62" />
            <path d="M143 51Q145 56 148 60" />
          </g>
          {band(id("ring"), {
            stops: [[0, "#fff3b0"], [0.5, "#ffd23a"], [1, "#f29e14"]],
            edge: "#b8760a",
            inner: "#a86a08",
            gloss: 0.8,
          })}
          {[
            [130, "#ff7fae"],
            [160, "#7fb8ff"],
            [196, "#7fd6c0"],
            [250, "#c3a4ff"],
            [104, "#ffffff"],
            [180, "#ffffff"],
            [276, "#ff7fae"],
          ].map(([a, c], i) => {
            const [x, y] = pt(i % 2 ? 61.6 : 66, a as number)
            return <circle key={i} cx={x} cy={y} r={i % 2 ? 1.4 : 1.8} fill={c as string} />
          })}
          {/* bunting across the top */}
          <path d={smooth(string)} fill="none" stroke="#6b4a0c" strokeWidth={1.3} strokeLinecap="round" />
          {pennants}
          {/* balloons */}
          {balloon(144, 38, 9, 11, url(id("bC")), "#2a8a70", -14)}
          {balloon(180, 41, 10, 12, url(id("bB")), "#2f62b8", 16)}
          {balloon(160, 24, 11, 13.5, url(id("bA")), "#c0306a", 2)}
          {/* party popper with confetti, lower left */}
          <g transform="translate(62 160) rotate(37)" strokeLinejoin="round">
            <path d="M0 0L-30 -10Q-34 0 -30 10Z" fill={url(id("cone"))} stroke="#b8600a" strokeWidth={1.6} />
            <path d="M-10 -3.3L-13 4.3M-20 -6.6L-23 7.6" stroke="#ff7fae" strokeWidth={2.4} strokeLinecap="round" />
            <ellipse cx={-31} cy={0} rx={3.2} ry={10} fill="#ffe7a8" stroke="#b8600a" strokeWidth={1.4} />
          </g>
          <g fill="none" strokeWidth={1.8} strokeLinecap="round">
            <path d="M34 140C26 134 30 126 22 120C16 116 12 120 14 124" stroke="#ff7fae" />
            <path d="M38 136C38 126 44 120 40 110" stroke="#7fb8ff" />
            <path d="M30 146C22 148 16 144 8 148" stroke="#c3a4ff" />
          </g>
          {confetti.map(([x, y, r, c], i) => (
            <rect key={i} x={x - 2.2} y={y - 1.3} width={4.4} height={2.6} rx={0.6} fill={c} transform={`rotate(${r} ${x} ${y})`} />
          ))}
          <circle cx={46} cy={104} r={1.6} fill="#ffd23a" />
          <circle cx={4} cy={126} r={1.4} fill="#ff7fae" />
          {/* smiling cloud mascot, lower right */}
          <g>
            {puff(
              [
                [140, 162, 9],
                [152, 154, 11.5],
                [166, 158, 10],
                [176, 166, 7.5],
                [158, 170, 9],
                [145, 171, 7],
              ],
              url(id("cloud")),
              "#bcd9fb",
              "#4f86cf",
              1.7,
            )}
            <ellipse cx={150} cy={161} rx={1.7} ry={2.2} fill="#2b3a5c" />
            <ellipse cx={162} cy={161} rx={1.7} ry={2.2} fill="#2b3a5c" />
            <circle cx={150.6} cy={160.2} r={0.6} fill="#fff" />
            <circle cx={162.6} cy={160.2} r={0.6} fill="#fff" />
            <path d="M153 165Q156 168.4 159 165" fill="none" stroke="#2b3a5c" strokeWidth={1.4} strokeLinecap="round" />
            <ellipse cx={145.6} cy={165.4} rx={2.6} ry={1.6} fill="#ff8fb6" fillOpacity={0.75} />
            <ellipse cx={166.4} cy={165.4} rx={2.6} ry={1.6} fill="#ff8fb6" fillOpacity={0.75} />
          </g>
          <path d={sparkle(186, 92, 3.2)} fill="#ffd23a" />
          <path d={sparkle(124, 12, 2.6)} fill="#ff7fae" />
          <path d={sparkle(186, 186, 2.6)} fill="#7fb8ff" />
        </g>
        {innerShade()}
      </>
    )
  },
}
