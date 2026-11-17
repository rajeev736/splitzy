/**
 * Drawing kit for the animated ("live") profile frames.
 *
 * Same geometry as every other frame: SVG children for a 200x200 viewBox,
 * painted on top of a round photo centred at (100,100) with r=60. Live frames
 * also carry their own <style>: CSS keyframes on transform / opacity only,
 * scoped under the frame's root class, and switched off under
 * prefers-reduced-motion. With motion off a frame rests in its drawn pose, so
 * every animated piece is drawn where it looks best standing still.
 *
 * Animated pieces never carry a `transform` attribute themselves (CSS would
 * replace it): they sit in a positioned group, and pivot on that group's
 * origin (the SVG default) unless their class asks for `fill-box`.
 */
import type React from "react"

export type FrameDraw = (p: { id: (name: string) => string }) => React.ReactElement

export type Pt = [number, number]
export type Stops = [number, string, number?][]

/* ── Geometry ─────────────────────────────────────────────────────────── */

export const r2 = (n: number) => Math.round(n * 100) / 100
const rad = (d: number) => (d * Math.PI) / 180
/** Point at radius r, angle a in degrees clockwise from 12 o'clock. */
export const pt = (r: number, a: number, cx = 100, cy = 100): Pt => [
  r2(cx + r * Math.sin(rad(a))),
  r2(cy - r * Math.cos(rad(a))),
]
const f = (p: Pt) => `${p[0]} ${p[1]}`
export const url = (s: string) => `url(#${s})`

/** Smooth path through points (Catmull-Rom turned into cubic Béziers). */
export function smooth(p: Pt[], closed = false) {
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

/** Rounded square centred on the photo: half-size h, corner radius rc. */
export const roundSquare = (h: number, rc: number) => {
  const [a, b] = [100 - h, 100 + h]
  return (
    `M${a + rc} ${a}H${b - rc}A${rc} ${rc} 0 0 1 ${b} ${a + rc}V${b - rc}` +
    `A${rc} ${rc} 0 0 1 ${b - rc} ${b}H${a + rc}A${rc} ${rc} 0 0 1 ${a} ${b - rc}V${a + rc}A${rc} ${rc} 0 0 1 ${a + rc} ${a}Z`
  )
}

/** The round window for the photo; append to a shape drawn with fillRule="evenodd". */
export const hole = (r = 58) => `M100 ${100 - r}A${r} ${r} 0 1 0 100 ${100 + r}A${r} ${r} 0 1 0 100 ${100 - r}Z`

/** Four-point twinkle. */
export const sparkle = (cx: number, cy: number, r: number) => {
  const k = r * 0.16
  return (
    `M${r2(cx)} ${r2(cy - r)}Q${r2(cx + k)} ${r2(cy - k)} ${r2(cx + r)} ${r2(cy)}` +
    `Q${r2(cx + k)} ${r2(cy + k)} ${r2(cx)} ${r2(cy + r)}` +
    `Q${r2(cx - k)} ${r2(cy + k)} ${r2(cx - r)} ${r2(cy)}` +
    `Q${r2(cx - k)} ${r2(cy - k)} ${r2(cx)} ${r2(cy - r)}Z`
  )
}

/** Star with n points (draw with a round stroke join for a soft, puffy star). */
export const star = (cx: number, cy: number, R: number, rot = 0, k = 0.5, n = 5) =>
  `M${Array.from({ length: n * 2 }, (_, i) => f(pt(i % 2 ? R * k : R, rot + (i * 180) / n, cx, cy))).join("L")}Z`

/** Flame tongue standing on (0,0), w half its width at the base, L tall. */
export const tongue = (w: number, L: number, lean = 0) =>
  `M${-w} 0C${-w} ${r2(-L * 0.38)} ${r2(-w * 0.3 + lean)} ${r2(-L * 0.58)} ${r2(w * 0.08 + lean)} ${-L}` +
  `C${r2(w * 0.42 + lean * 0.6)} ${r2(-L * 0.62)} ${w} ${r2(-L * 0.42)} ${w} 0Z`

/** Soft flame standing on (0,0): w half its width at the base, L tall, its tip curling by `curl`. */
export const flame = (w: number, L: number, curl = 0) =>
  `M${-w} 0C${r2(-w * 1.15)} ${r2(-L * 0.32)} ${r2(-w * 0.25)} ${r2(-L * 0.42)} ${r2(-w * 0.42 + curl * 0.3)} ${r2(-L * 0.66)}` +
  `C${r2(-w * 0.55 + curl * 0.5)} ${r2(-L * 0.82)} ${r2(curl * 0.6)} ${r2(-L * 0.9)} ${r2(curl)} ${-L}` +
  `C${r2(w * 0.5 + curl * 0.4)} ${r2(-L * 0.82)} ${r2(w * 0.2 + curl * 0.2)} ${r2(-L * 0.62)} ${r2(w * 0.55)} ${r2(-L * 0.46)}` +
  `C${r2(w * 0.95)} ${r2(-L * 0.3)} ${r2(w * 1.1)} ${r2(-L * 0.14)} ${w} 0Z`

/* ── Paint ────────────────────────────────────────────────────────────── */

const stopsOf = (stops: Stops) =>
  stops.map(([o, c, op], i) => <stop key={i} offset={o} stopColor={c} stopOpacity={op ?? 1} />)

/** Linear gradient in user space. */
export const lin = (gid: string, stops: Stops, x1: number, y1: number, x2: number, y2: number) => (
  <linearGradient id={gid} gradientUnits="userSpaceOnUse" x1={x1} y1={y1} x2={x2} y2={y2}>
    {stopsOf(stops)}
  </linearGradient>
)
/** Linear gradient across the shape's own box (top to bottom by default). */
export const box = (gid: string, stops: Stops, x1 = 0, y1 = 0, x2 = 0, y2 = 1) => (
  <linearGradient id={gid} x1={x1} y1={y1} x2={x2} y2={y2}>
    {stopsOf(stops)}
  </linearGradient>
)
/** Radial gradient across the shape's own box, lit from the upper left. */
export const ball = (gid: string, stops: Stops, fx = 0.35, fy = 0.3, r = 0.7) => (
  <radialGradient id={gid} cx={fx} cy={fy} r={r} fx={fx} fy={fy}>
    {stopsOf(stops)}
  </radialGradient>
)
/** Soft round glow, in the shape's own box (fill a circle or ellipse with it). */
export const halo = (gid: string, color: string, op = 0.7) => (
  <radialGradient id={gid}>
    <stop offset={0} stopColor={color} stopOpacity={op} />
    <stop offset={0.45} stopColor={color} stopOpacity={op * 0.4} />
    <stop offset={1} stopColor={color} stopOpacity={0} />
  </radialGradient>
)

export const shadow = (gid: string, dy = 1.2, sd = 1.1, op = 0.3, color = "#1a0614") => (
  <filter id={gid} x="-10%" y="-10%" width="120%" height="125%" colorInterpolationFilters="sRGB">
    <feDropShadow dx={0} dy={dy} stdDeviation={sd} floodColor={color} floodOpacity={op} />
  </filter>
)

/* ── Motion ───────────────────────────────────────────────────────────── */

/**
 * A frame's motion: CSS scoped under `.${scope}` (the class on the frame's
 * root group, which also prefixes its keyframes). Under reduced motion every
 * animation stops and the frame rests in its drawn pose.
 */
export const motion = (scope: string, css: string) => (
  <style>{`.${scope} .fb{transform-box:fill-box;transform-origin:center}${css}@media (prefers-reduced-motion:reduce){.${scope} *{animation:none!important}}`}</style>
)

/** Inline animation delay; negative so every loop starts mid-way and nothing moves in step. */
export const lag = (s: number): React.CSSProperties => ({ animationDelay: `${-s}s` })

/** A group placed at (x,y), turned by rot degrees; animated children pivot on (x,y). */
export const at = (x: number, y: number, rot = 0, scale = 1) =>
  `translate(${r2(x)} ${r2(y)})${rot ? ` rotate(${r2(rot)})` : ""}${scale !== 1 ? ` scale(${scale})` : ""}`
