/**
 * Avatar frame artwork: more Games shop frames plus the Wins, Played and
 * Coins milestone families.
 *
 * Each draw returns SVG children for a 200x200 viewBox, painted on top of a
 * round photo centred at (100,100) with r=60. The ring covers r≈58–70;
 * wings, stars, crests and crowns reach out towards the edges. Every paint
 * server / filter / clip id goes through `id()` so many frames can share one
 * page.
 */
import type React from "react"
import type { FrameId } from "@/lib/fun/catalog"

export type FrameDraw = (p: { id: (name: string) => string }) => React.ReactElement

type Id = (name: string) => string
type Pt = [number, number]
type Stops = [number, string][]
type Gem3 = [string, string, string]

/* ── Geometry helpers ─────────────────────────────────────────────────── */

const r2 = (n: number) => Math.round(n * 100) / 100
const rad = (d: number) => (d * Math.PI) / 180
/** Point at radius r, angle a in degrees clockwise from 12 o'clock. */
const pt = (r: number, a: number, cx = 100, cy = 100): Pt => [
  r2(cx + r * Math.sin(rad(a))),
  r2(cy - r * Math.cos(rad(a))),
]
const add = (a: Pt, b: Pt, k = 1): Pt => [a[0] + b[0] * k, a[1] + b[1] * k]
const norm = (v: Pt): Pt => {
  const l = Math.hypot(v[0], v[1]) || 1
  return [v[0] / l, v[1] / l]
}
const f = (p: Pt) => `${r2(p[0])} ${r2(p[1])}`
const poly = (pts: Pt[]) => `M${pts.map(f).join("L")}Z`
const url = (s: string) => `url(#${s})`
const MIRROR = "matrix(-1 0 0 1 200 0)"

/** Clockwise arc along the circle centred at (100,100). */
const arc = (r: number, a0: number, a1: number) => {
  const sweep = (((a1 - a0) % 360) + 360) % 360
  return `M${f(pt(r, a0))}A${r} ${r} 0 ${sweep > 180 ? 1 : 0} 1 ${f(pt(r, a1))}`
}

/** Five-pointed star, first tip pointing up. */
const starPts = (cx: number, cy: number, R: number, k = 0.47): Pt[] =>
  Array.from({ length: 10 }, (_, i) => pt(i % 2 ? R * k : R, i * 36, cx, cy))

/** A slim kite from base B along direction `deg` (clockwise from up). */
const spike = (B: Pt, deg: number, L: number, w: number): Pt[] => {
  const d = pt(1, deg, 0, 0)
  const n: Pt = [-d[1], d[0]]
  const mid = add(B, d, L * 0.3)
  return [B, add(mid, n, w), add(B, d, L), add(mid, n, -w)]
}

const LIGHT = norm([-0.5, -0.86])

/**
 * Bevelled facets for a polygon: each edge gets a facet towards an inner
 * "table" polygon, shaded by how much it faces the light.
 */
function facets(pts: Pt[], c: Pt, table: number, power = 1) {
  const inner = pts.map((p) => add(c, [p[0] - c[0], p[1] - c[1]], table))
  return pts.map((p, i) => {
    const j = (i + 1) % pts.length
    const q = pts[j]
    let n = norm([q[1] - p[1], -(q[0] - p[0])])
    const mid: Pt = [(p[0] + q[0]) / 2 - c[0], (p[1] + q[1]) / 2 - c[1]]
    if (n[0] * mid[0] + n[1] * mid[1] < 0) n = [-n[0], -n[1]]
    const s = (n[0] * LIGHT[0] + n[1] * LIGHT[1]) * power
    const d = table > 0 ? poly([p, q, inner[j], inner[i]]) : poly([p, q, c])
    return (
      <path
        key={i}
        d={d}
        fill={s > 0 ? "#fff" : "#000"}
        fillOpacity={r2(s > 0 ? 0.6 * s : -0.38 * s)}
      />
    )
  })
}

/* ── Paint helpers ────────────────────────────────────────────────────── */

const lin = (gid: string, stops: Stops, x1: number, y1: number, x2: number, y2: number) => (
  <linearGradient id={gid} gradientUnits="userSpaceOnUse" x1={x1} y1={y1} x2={x2} y2={y2}>
    {stops.map(([o, c], i) => (
      <stop key={i} offset={o} stopColor={c} />
    ))}
  </linearGradient>
)

/** Radial glow: transparent inside `from`, peaking at `peak`, fading out by r. */
const glow = (gid: string, cx: number, cy: number, r: number, color: string, from: number, peak: number, op: number) => (
  <radialGradient id={gid} gradientUnits="userSpaceOnUse" cx={cx} cy={cy} r={r}>
    <stop offset={from} stopColor={color} stopOpacity="0" />
    <stop offset={peak} stopColor={color} stopOpacity={op} />
    <stop offset="1" stopColor={color} stopOpacity="0" />
  </radialGradient>
)

const shadow = (gid: string, dy = 1.6, sd = 1.4, op = 0.4) => (
  <filter id={gid} x="-10%" y="-10%" width="120%" height="125%" colorInterpolationFilters="sRGB">
    <feDropShadow dx="0" dy={dy} stdDeviation={sd} floodColor="#000" floodOpacity={op} />
  </filter>
)

/* ── Metals & stones ──────────────────────────────────────────────────── */

type Metal = { stops: Stops; edge: string }

const GOLD: Metal = {
  stops: [[0, "#fff7cf"], [0.2, "#f9d66e"], [0.45, "#dca631"], [0.6, "#a46a17"], [0.78, "#f2c95a"], [1, "#b67c1d"]],
  edge: "#5e3b0b",
}
const ROYAL: Metal = {
  stops: [[0, "#fffbe0"], [0.18, "#ffe08a"], [0.42, "#e3ae3a"], [0.6, "#9c6212"], [0.78, "#f7d36a"], [1, "#b8801f"]],
  edge: "#4d2e05",
}
const SILVER: Metal = {
  stops: [[0, "#ffffff"], [0.2, "#e6e9ef"], [0.45, "#b8bfcb"], [0.6, "#7c8493"], [0.78, "#e1e5ec"], [1, "#9aa2b1"]],
  edge: "#3f4550",
}
const IRIS: Metal = {
  stops: [[0, "#fdf0ff"], [0.18, "#e0b2ff"], [0.4, "#a066f7"], [0.58, "#5b4ce6"], [0.78, "#66c6ff"], [1, "#7a5cf0"]],
  edge: "#241466",
}
const STEEL: Metal = {
  stops: [[0, "#f2f8ff"], [0.2, "#b4cde6"], [0.45, "#6990b8"], [0.6, "#335680"], [0.78, "#a6c4e4"], [1, "#4b6f96"]],
  edge: "#15253b",
}
const NAVY: Metal = {
  stops: [[0, "#8fdcff"], [0.2, "#2c5596"], [0.45, "#152a58"], [0.6, "#0b1736"], [0.78, "#2d6cb0"], [1, "#11244c"]],
  edge: "#030a1c",
}
const CRIMSON: Stops = [[0, "#ffc2c2"], [0.3, "#ef4058"], [0.65, "#a3122a"], [1, "#4f0412"]]

const RUBY: Gem3 = ["#ffe0e0", "#e0203a", "#6e0414"]
const SAPH: Gem3 = ["#e6efff", "#3d7cff", "#0a2a8a"]
const EMER: Gem3 = ["#e6fff2", "#21c47a", "#04573a"]
const CYAN: Gem3 = ["#ffffff", "#43e6ff", "#0a5f9e"]

/**
 * The polished band: dark rim, metal gradient, tube shading, a specular
 * sweep at the top left and a soft inner shadow on the photo.
 */
function ring(id: Id, m: Metal, k = "rg", r = 64, w = 11.5) {
  const band = id(k + "b")
  const tube = id(k + "t")
  const spec = id(k + "s")
  const inner = id(k + "i")
  const ro = r + w / 2
  const ri = r - w / 2
  const t = (x: number) => r2(x / ro)
  return (
    <>
      <defs>
        {lin(band, m.stops, 42, 34, 158, 166)}
        <radialGradient id={tube} gradientUnits="userSpaceOnUse" cx="100" cy="100" r={ro}>
          <stop offset={t(ri)} stopColor="#000" stopOpacity="0.35" />
          <stop offset={t(ri + 1.6)} stopColor="#fff" stopOpacity="0" />
          <stop offset={t(r - 1.2)} stopColor="#fff" stopOpacity="0.38" />
          <stop offset={t(r + 1.5)} stopColor="#fff" stopOpacity="0" />
          <stop offset={t(ro - 1.4)} stopColor="#000" stopOpacity="0.05" />
          <stop offset="1" stopColor="#000" stopOpacity="0.4" />
        </radialGradient>
        <linearGradient id={spec} gradientUnits="userSpaceOnUse" x1="45" y1="45" x2="110" y2="55">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.45" stopColor="#fff" stopOpacity="0.95" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <radialGradient id={inner} gradientUnits="userSpaceOnUse" cx="100" cy="100" r="60">
          <stop offset="0.86" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.32" />
        </radialGradient>
      </defs>
      <circle cx="100" cy="100" r="60" fill={url(inner)} />
      <circle cx="100" cy="100" r={r} fill="none" stroke={m.edge} strokeWidth={w + 1.6} />
      <circle cx="100" cy="100" r={r} fill="none" stroke={url(band)} strokeWidth={w} />
      <circle cx="100" cy="100" r={r} fill="none" stroke={url(tube)} strokeWidth={w} />
      <path d={arc(r + 1.2, 282, 22)} fill="none" stroke={url(spec)} strokeWidth="2.4" strokeLinecap="round" />
      <path d={arc(r - 2, 118, 158)} fill="none" stroke="#fff" strokeOpacity="0.35" strokeWidth="1.4" strokeLinecap="round" />
    </>
  )
}

/** A thin metal wire around the ring: dark under-stroke plus a metal stroke. */
function wire(gid: string, edge: string, r: number, a0 = 0, a1 = 359.99, w = 1.6) {
  return (
    <>
      <path d={arc(r, a0, a1)} fill="none" stroke={edge} strokeWidth={w + 1.4} strokeLinecap="round" />
      <path d={arc(r, a0, a1)} fill="none" stroke={url(gid)} strokeWidth={w} strokeLinecap="round" />
    </>
  )
}

/** Small metal beads at radius r for each angle. */
const beads = (r: number, angles: number[], fill: string, edge: string, br = 1.5) =>
  angles.map((a) => {
    const p = pt(r, a)
    return (
      <g key={a}>
        <circle cx={p[0]} cy={p[1]} r={br} fill={fill} stroke={edge} strokeWidth="0.5" />
        <circle cx={r2(p[0] - br * 0.3)} cy={r2(p[1] - br * 0.3)} r={r2(br * 0.37)} fill="#fff" fillOpacity="0.9" />
      </g>
    )
  })

/** A round cabochon gem, optionally in a small metal bezel. */
function gem(id: Id, k: string, c: Pt, r: number, colors: Gem3, bezel?: Metal) {
  const g = id(k)
  const b = id(k + "z")
  return (
    <>
      <defs>
        <radialGradient id={g} gradientUnits="userSpaceOnUse" cx={c[0] - r * 0.35} cy={c[1] - r * 0.4} r={r * 1.5}>
          <stop offset="0" stopColor={colors[0]} />
          <stop offset="0.45" stopColor={colors[1]} />
          <stop offset="1" stopColor={colors[2]} />
        </radialGradient>
        {bezel && lin(b, bezel.stops, c[0] - r, c[1] - r, c[0] + r, c[1] + r)}
      </defs>
      {bezel && <circle cx={c[0]} cy={c[1]} r={r2(r * 1.45)} fill={url(b)} stroke={bezel.edge} strokeWidth="0.8" />}
      <circle cx={c[0]} cy={c[1]} r={r} fill={url(g)} stroke="#000" strokeOpacity="0.45" strokeWidth="0.6" />
      <ellipse
        cx={r2(c[0] - r * 0.32)}
        cy={r2(c[1] - r * 0.38)}
        rx={r2(r * 0.38)}
        ry={r2(r * 0.24)}
        fill="#fff"
        fillOpacity="0.85"
        transform={`rotate(-35 ${r2(c[0] - r * 0.32)} ${r2(c[1] - r * 0.38)})`}
      />
      <circle cx={r2(c[0] + r * 0.38)} cy={r2(c[1] + r * 0.4)} r={r2(r * 0.12)} fill="#fff" fillOpacity="0.6" />
    </>
  )
}

/** A faceted polygon gem (or star) with a gradient body and bevel facets. */
function cut(id: Id, k: string, pts: Pt[], c: Pt, stops: Stops, edge: string, table = 0.45, sw = 0.9) {
  const g = id(k)
  const xs = pts.map((p) => p[0])
  const ys = pts.map((p) => p[1])
  return (
    <>
      <defs>{lin(g, stops, Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys))}</defs>
      <path d={poly(pts)} fill={url(g)} />
      {facets(pts, c, table)}
      <path d={poly(pts)} fill="none" stroke={edge} strokeWidth={sw} strokeLinejoin="round" />
    </>
  )
}

const star = (id: Id, k: string, cx: number, cy: number, R: number, stops: Stops, edge: string) =>
  cut(id, k, starPts(cx, cy, R), [cx, cy], stops, edge, 0, Math.max(0.7, R * 0.07))

/** A four-pointed glint. */
const sparkle = (x: number, y: number, r: number, k: number, color = "#fff") => (
  <path
    key={k}
    d={`M${x} ${y - r}Q${x} ${y} ${x + r} ${y}Q${x} ${y} ${x} ${y + r}Q${x} ${y} ${x - r} ${y}Q${x} ${y} ${x} ${y - r}Z`}
    fill={color}
    fillOpacity="0.95"
  />
)

/* ── Wings ────────────────────────────────────────────────────────────── */

/** One right-side wing blade: [rootX, rootY, tipX, tipY, width, sag]. */
type Blade = [number, number, number, number, number, number]

/**
 * A sickle-shaped blade from root to tip. `sag` bows the blade downwards so
 * the tip sweeps up; the trailing edge is fuller than the leading edge.
 */
function blade([rx, ry, tx, ty, w, sag]: Blade) {
  const root: Pt = [rx, ry]
  const tip: Pt = [tx, ty]
  const L = Math.hypot(tx - rx, ty - ry)
  const u: Pt = [(tx - rx) / L, (ty - ry) / L]
  const n: Pt = [u[1], -u[0]]
  const at = (a: number, b: number) => add(add(root, u, L * a), n, b)
  return {
    d: `M${f(at(0, w * 0.2))}C${f(at(0.4, w * 0.45 - sag))} ${f(at(0.68, -sag * 0.75))} ${f(tip)}C${f(at(0.8, -w * 0.75 - sag * 0.7))} ${f(at(0.42, -w * 0.85 - sag))} ${f(at(0, -w * 0.2))}Z`,
    edge: `M${f(at(0.08, w * 0.3))}C${f(at(0.4, w * 0.3 - sag))} ${f(at(0.68, -sag * 0.75 - 1))} ${f(at(0.94, -1.2))}`,
    shade: `M${f(at(0.92, -w * 0.12 - 1.4))}C${f(at(0.78, -w * 0.62 - sag * 0.65))} ${f(at(0.42, -w * 0.7 - sag))} ${f(at(0.06, -w * 0.38))}`,
  }
}

/** Clip that keeps wings off the photo (everything outside the ring's inner edge). */
const outside = (cid: string) => (
  <clipPath id={cid}>
    <path d="M0 0H200V200H0ZM100 41.7A58.3 58.3 0 1 0 100 158.3A58.3 58.3 0 1 0 100 41.7Z" clipRule="evenodd" />
  </clipPath>
)

/** Thin dark line on the ring's inner edge, drawn over wings that cross the ring. */
const rim = (color: string) => <circle cx="100" cy="100" r="58.2" fill="none" stroke={color} strokeWidth="1" />

/**
 * Draws blades for the right wing and the mirrored left wing. Blades are
 * listed top first; the top blade is painted last so it sits in front.
 */
function wingPair(gid: string, blades: Blade[], stroke: string, sheen = 0.75, sw = 0.8) {
  const bs = blades.map(blade).reverse()
  const side = (
    <>
      {bs.map((x, i) => (
        <g key={i}>
          <path d={x.d} fill={url(gid)} stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />
          <path d={x.shade} fill="none" stroke={stroke} strokeOpacity="0.3" strokeWidth="1.6" strokeLinecap="round" />
          <path d={x.edge} fill="none" stroke="#fff" strokeOpacity={sheen} strokeWidth="1.2" strokeLinecap="round" />
        </g>
      ))}
    </>
  )
  return (
    <>
      <g>{side}</g>
      <g transform={MIRROR}>{side}</g>
    </>
  )
}

/** Mirrors a right-side drawing to the left. */
const both = (side: React.ReactElement) => (
  <>
    <g>{side}</g>
    <g transform={MIRROR}>{side}</g>
  </>
)

/* ── Laurels ──────────────────────────────────────────────────────────── */

type Leaf = { d: string; lit: string; rib: string }

function leafAt(B: Pt, d: Pt, L: number, w: number): Leaf {
  const n: Pt = [d[1], -d[0]]
  const T = add(B, d, L)
  const at = (a: number, b: number) => add(add(B, d, L * a), n, b)
  const c1 = at(0.25, w * 1.3)
  const c2 = at(0.72, w * 1.05)
  return {
    d: `M${f(B)}C${f(c1)} ${f(c2)} ${f(T)}C${f(at(0.72, -w * 1.05))} ${f(at(0.25, -w * 1.3))} ${f(B)}Z`,
    lit: `M${f(B)}C${f(c1)} ${f(c2)} ${f(T)}Z`,
    rib: `M${f(at(0.1, 0))}Q${f(at(0.5, w * 0.12))} ${f(at(0.85, 0))}`,
  }
}

type Branch = { R: number; a0: number; a1: number; steps: number; L: [number, number]; w: [number, number] }

/**
 * Right-side laurel branch climbing from angle a0 (bottom) to a1: paired
 * leaves leaning outwards and inwards, plus a closing tip leaf.
 */
function branchLeaves({ R, a0, a1, steps, L, w }: Branch): Leaf[] {
  const out: Leaf[] = []
  const step = (a0 - a1) / steps
  const tilt = (a: number, deg: number) => {
    const tan: Pt = [-Math.cos(rad(a)), -Math.sin(rad(a))]
    const o: Pt = [Math.sin(rad(a)), -Math.cos(rad(a))]
    return norm(add([tan[0] * Math.cos(rad(deg)), tan[1] * Math.cos(rad(deg))], o, Math.sin(rad(deg))))
  }
  for (let i = 0; i < steps; i++) {
    const a = a0 - i * step
    const k = steps > 1 ? i / (steps - 1) : 0
    const len = L[0] + (L[1] - L[0]) * k
    const wd = w[0] + (w[1] - w[0]) * k
    out.push(leafAt(pt(R + 0.5, a), tilt(a, 40), len, wd))
    out.push(leafAt(pt(R - 0.5, a - step / 2), tilt(a - step / 2, -34), len * 0.92, wd * 0.95))
  }
  const at = a1 + step * 0.35
  out.push(leafAt(pt(R, at + 2), tilt(at, 0), L[1] * 0.9, w[1] * 0.9))
  return out
}

type LeafPaint = { fill: string; edge: string; lit: string; rib: string; stem: [string, string] }

function laurelSide(br: Branch, p: LeafPaint) {
  return (
    <>
      <path d={arc(br.R, br.a1 + 4, br.a0 + 6)} fill="none" stroke={p.stem[0]} strokeWidth="2.8" strokeLinecap="round" />
      <path d={arc(br.R, br.a1 + 4, br.a0 + 6)} fill="none" stroke={p.stem[1]} strokeWidth="1.3" strokeLinecap="round" />
      {branchLeaves(br).map((l, i) => (
        <g key={i}>
          <path d={l.d} fill={p.fill} stroke={p.edge} strokeWidth="0.8" strokeLinejoin="round" />
          <path d={l.lit} fill={p.lit} fillOpacity="0.32" />
          <path d={l.rib} fill="none" stroke={p.rib} strokeOpacity="0.8" strokeWidth="0.7" strokeLinecap="round" />
        </g>
      ))}
    </>
  )
}

/* ── Fire ─────────────────────────────────────────────────────────────── */

/**
 * A flame tongue in local units (base at 0,0, tip near 0,-1, bulb at the
 * bottom, tip hooking slightly right), as cubic segments.
 */
const FLAME: Pt[] = [
  [0.14, -1],
  [0.04, -0.74], [0.4, -0.58], [0.37, -0.3],
  [0.34, -0.08], [0.18, 0.02], [0, 0.02],
  [-0.2, 0.02], [-0.37, -0.12], [-0.35, -0.36],
  [-0.33, -0.58], [-0.06, -0.66], [0.14, -1],
]

/** Places FLAME at base B, rotated deg clockwise from straight up, height h, width scale k. */
function flame(B: Pt, deg: number, h: number, k: number) {
  const c = Math.cos(rad(deg))
  const sn = Math.sin(rad(deg))
  const P = FLAME.map(([x, y]): Pt => {
    const X = x * h * k
    const Y = y * h
    return [B[0] + X * c - Y * sn, B[1] + X * sn + Y * c]
  })
  let d = `M${f(P[0])}`
  for (let i = 1; i < P.length; i += 3) d += `C${f(P[i])} ${f(P[i + 1])} ${f(P[i + 2])}`
  return d + "Z"
}

/* ── Coins ────────────────────────────────────────────────────────────── */

/** A coin seen face-on, with a milled edge and an embossed star. */
function coin(id: Id, k: string, c: Pt, r: number, milled = true) {
  const g = id(k)
  const e = id(k + "e")
  const [x, y] = c
  return (
    <>
      <defs>
        <radialGradient id={g} gradientUnits="userSpaceOnUse" cx={r2(x - r * 0.35)} cy={r2(y - r * 0.4)} r={r2(r * 1.6)}>
          <stop offset="0" stopColor="#fffbe0" />
          <stop offset="0.35" stopColor="#ffd75e" />
          <stop offset="0.75" stopColor="#d9961c" />
          <stop offset="1" stopColor="#9a5e0a" />
        </radialGradient>
        {lin(e, [[0, "#fff1b0"], [0.5, "#c8861a"], [1, "#7a4a06"]], x - r, y - r, x + r, y + r)}
      </defs>
      <circle cx={x} cy={y} r={r} fill={url(e)} stroke="#4f3005" strokeWidth={r2(Math.max(0.5, r * 0.07))} />
      {milled && r > 6 && (
        <circle
          cx={x}
          cy={y}
          r={r2(r - 0.9)}
          fill="none"
          stroke="#6b4206"
          strokeOpacity="0.55"
          strokeWidth="1"
          strokeDasharray="0.7 1.1"
        />
      )}
      <circle cx={x} cy={y} r={r2(r * 0.8)} fill={url(g)} stroke="#7a4a06" strokeWidth={r2(Math.max(0.4, r * 0.05))} />
      <path
        d={poly(starPts(x, y + r * 0.02, r * 0.46))}
        fill="#c47f12"
        stroke="#fff3c0"
        strokeOpacity="0.8"
        strokeWidth={r2(Math.max(0.3, r * 0.04))}
        strokeLinejoin="round"
      />
      <path d={arc(r * 0.68, 290, 350)} transform={`translate(${r2(x - 100)} ${r2(y - 100)})`} fill="none" stroke="#fff" strokeOpacity="0.8" strokeWidth={r2(Math.max(0.4, r * 0.08))} strokeLinecap="round" />
    </>
  )
}

/** A short stack of coins seen from the side; base centre at B. */
function coinStack(id: Id, k: string, B: Pt, rx: number, n: number, jitter: number[]) {
  const side = id(k)
  const face = id(k + "f")
  const t = rx * 0.34
  const ry = rx * 0.36
  const items = []
  for (let i = 0; i < n; i++) {
    const cx = B[0] + (jitter[i % jitter.length] ?? 0)
    const y = B[1] - i * t
    items.push(
      <g key={i}>
        <path
          d={`M${r2(cx - rx)} ${r2(y - t)}V${r2(y)}A${rx} ${r2(ry)} 0 0 0 ${r2(cx + rx)} ${r2(y)}V${r2(y - t)}Z`}
          fill={url(side)}
          stroke="#4f3005"
          strokeWidth="0.6"
        />
        <path
          d={`M${r2(cx - rx + 0.4)} ${r2(y - t * 0.45)}A${rx} ${r2(ry)} 0 0 0 ${r2(cx + rx - 0.4)} ${r2(y - t * 0.45)}`}
          fill="none"
          stroke="#7a4a06"
          strokeOpacity="0.6"
          strokeWidth="0.5"
          strokeDasharray="0.6 0.9"
        />
      </g>,
    )
  }
  const tx = B[0] + (jitter[(n - 1) % jitter.length] ?? 0)
  const ty = B[1] - n * t
  return (
    <>
      <defs>
        {lin(side, [[0, "#8a5508"], [0.25, "#ffe48a"], [0.5, "#e0a22c"], [0.8, "#a8680d"], [1, "#6b4206"]], B[0] - rx, 0, B[0] + rx, 0)}
        {lin(face, [[0, "#fffbe0"], [0.5, "#ffd75e"], [1, "#c48416"]], tx - rx, ty - ry, tx + rx, ty + ry)}
      </defs>
      {items}
      <ellipse cx={r2(tx)} cy={r2(ty)} rx={rx} ry={r2(ry)} fill={url(face)} stroke="#4f3005" strokeWidth="0.6" />
      <ellipse cx={r2(tx)} cy={r2(ty)} rx={r2(rx * 0.72)} ry={r2(ry * 0.68)} fill="none" stroke="#a8680d" strokeWidth="0.6" />
    </>
  )
}

/* ── Crests ───────────────────────────────────────────────────────────── */

/** Heater shield pointing down, centred on x=100. */
const shieldPath = (top: number, w: number, h: number) => {
  const l = 100 - w / 2
  const r = 100 + w / 2
  return `M${l} ${top}Q100 ${top - 4} ${r} ${top}V${r2(top + h * 0.42)}C${r} ${r2(top + h * 0.72)} ${r2(100 + w * 0.22)} ${r2(top + h * 0.88)} 100 ${top + h}C${r2(100 - w * 0.22)} ${r2(top + h * 0.88)} ${l} ${r2(top + h * 0.72)} ${l} ${r2(top + h * 0.42)}Z`
}

/* ── Games shop ───────────────────────────────────────────────────────── */

function silverWings(id: Id) {
  const wg = id("wg")
  return (
    <>
      <defs>
        {outside(id("wc"))}
        {shadow(id("sh"))}
        {lin(wg, [[0, "#ffffff"], [0.28, "#eef1f6"], [0.55, "#b1bac9"], [0.8, "#737c8e"], [1, "#d3d8e2"]], 0, 126, 0, 184)}
      </defs>
      <g filter={url(id("sh"))}>
        {ring(id, SILVER)}
        <g clipPath={url(id("wc"))}>
          {wingPair(wg, [[103, 163, 194, 128, 17, 12], [104, 168, 184, 152, 13, 8], [104, 173, 164, 172, 10, 4]], "#454c5a", 0.9)}
        </g>
        {rim(SILVER.edge)}
        {gem(id, "sp", [100, 168], 6.4, SAPH, SILVER)}
        {star(id, "st", 100, 32, 14, SILVER.stops, SILVER.edge)}
        {sparkle(117, 160, 3.4, 1)}
      </g>
    </>
  )
}

function gemWings(id: Id) {
  const bar = id("br")
  const st = id("sf")
  const fe = id("fe")
  const bars = (
    <>
      {/* layered strips peeking under the bar */}
      <path d="M106 184 C132 178 162 166 190 142 C182 158 166 168 150 175 C136 181 120 186 106 190 Z" fill={url(st)} stroke="#4b3a8a" strokeWidth="0.8" strokeLinejoin="round" />
      <path d="M108 190 C130 188 152 182 172 170 C164 181 150 186 138 189 C128 191 118 192 108 193 Z" fill={url(st)} stroke="#4b3a8a" strokeWidth="0.8" strokeLinejoin="round" />
      {/* the V bar: bevelled teal-blue metal */}
      <path d="M100 166 C128 160 164 142 197 115 C190 132 172 148 154 157 C136 166 116 176 100 191 Z" fill={url(bar)} stroke="#0e2a66" strokeWidth="0.9" strokeLinejoin="round" />
      <path d="M100 166 C128 160 164 142 197 115 C170 138 134 160 100 178 Z" fill="#fff" fillOpacity="0.28" />
      <path d="M106 168 C132 161 164 145 190 123" fill="none" stroke="#fff" strokeOpacity="0.9" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M108 184 C130 172 160 158 180 140" fill="none" stroke="#0b2c5c" strokeOpacity="0.3" strokeWidth="1.4" strokeLinecap="round" />
    </>
  )
  return (
    <>
      <defs>
        {outside(id("wc"))}
        {shadow(id("sh"))}
        {lin(bar, [[0, "#1c3c9c"], [0.28, "#2f8fd8"], [0.52, "#a8f2ff"], [0.72, "#36a9e0"], [1, "#2050b8"]], 100, 190, 196, 116)}
        {lin(st, [[0, "#ffffff"], [0.45, "#e6dcff"], [1, "#a28ae6"]], 0, 144, 0, 190)}
        {lin(fe, [[0, "#f6efff"], [0.45, "#c3a6ff"], [1, "#6f52dc"]], 0, 90, 0, 160)}
      </defs>
      <g filter={url(id("sh"))}>
        <g clipPath={url(id("wc"))}>
          {wingPair(fe, [[136, 146, 178, 92, 10, 9], [140, 152, 190, 108, 10, 8], [143, 158, 196, 126, 9, 6]], "#3a2a8a", 0.8, 0.7)}
        </g>
        {ring(id, IRIS)}
        <g clipPath={url(id("wc"))}>{both(bars)}</g>
        {rim(IRIS.edge)}
        {cut(
          id,
          "cr",
          [[89, 150], [111, 150], [120, 161], [100, 191], [80, 161]],
          [100, 163],
          [[0, "#f8efff"], [0.3, "#c79bff"], [0.65, "#6d2fe0"], [1, "#2a0c7a"]],
          "#1c0a55",
          0.42,
          1,
        )}
        <path d="M80 161 H120 M89 150 L95 161 L100 150 L105 161 L111 150" fill="none" stroke="#fff" strokeOpacity="0.55" strokeWidth="0.7" strokeLinejoin="round" />
        {sparkle(93, 156, 4, 1)}
        {star(id, "st", 100, 32, 14, [[0, "#fbf2ff"], [0.4, "#c79bff"], [1, "#6a35d8"]], "#2e1580")}
      </g>
    </>
  )
}

function inferno(id: Id) {
  const g1 = id("f1")
  const g2 = id("f2")
  const g3 = id("f3")
  const gd = id("gd")
  // Right-side tongues: [ring angle, height]; they lean further out lower down.
  const tongues: [number, number][] = [
    [58, 24],
    [72, 34],
    [86, 44],
    [100, 40],
    [114, 50],
    [128, 42],
    [142, 46],
    [156, 34],
  ]
  const layer = (hk: number, wk: number) => tongues.map(([a, h]) => flame(pt(64, a), 4 + (a - 58) * 0.42, h * hk, wk)).join("")
  const fire = (
    <>
      <path d={layer(1.07, 1.12)} fill="#6e0a0e" />
      <path d={layer(1, 1)} fill={url(g1)} />
      <path d={layer(0.8, 0.78)} fill={url(g2)} />
      <path d={layer(0.56, 0.58)} fill={url(g3)} />
    </>
  )
  const spikes: [number, number, number][] = [
    [-62, 26, 4.2],
    [62, 26, 4.2],
    [-32, 32, 5],
    [32, 32, 5],
    [0, 40, 6],
  ]
  return (
    <>
      <defs>
        {outside(id("wc"))}
        {shadow(id("sh"))}
        {lin(g1, [[0, "#ffb347"], [0.4, "#f2461f"], [1, "#a3121a"]], 0, 40, 0, 180)}
        {lin(g2, [[0, "#ffe680"], [0.45, "#ff9a26"], [1, "#ef5a1c"]], 0, 55, 0, 175)}
        {lin(g3, [[0, "#fffde0"], [0.5, "#ffe066"], [1, "#ffb02e"]], 0, 75, 0, 170)}
        {lin(gd, ROYAL.stops, 60, 20, 140, 190)}
      </defs>
      <g filter={url(id("sh"))}>
        <g clipPath={url(id("wc"))}>{both(fire)}</g>
        {wire(gd, ROYAL.edge, 72.5, 300, 60, 1.8)}
        {ring(id, ROYAL)}
        {beads(64, [22.5, 45, 67.5, 90, 112.5, 135, 225, 247.5, 270, 292.5, 315, 337.5], "#ffe08a", ROYAL.edge, 1.4)}
        {/* spiked crest with a ruby */}
        {spikes.map(([d, L, w]) => (
          <g key={d}>{cut(id, `sp${d}`, spike([100, 44], d, L, w), add([100, 44], pt(1, d, 0, 0), L * 0.3), ROYAL.stops, ROYAL.edge, 0, 0.8)}</g>
        ))}
        {cut(id, "cp", [[82, 37], [100, 29], [118, 37], [114, 48], [100, 54], [86, 48]], [100, 42], ROYAL.stops, ROYAL.edge, 0.55)}
        {gem(id, "rb", [100, 42], 5.4, RUBY)}
        {/* fiery gem crest flanked by gold flame flicks */}
        {both(
          <>
            <path d={flame([112, 170], 62, 22, 0.8)} fill={url(gd)} stroke={ROYAL.edge} strokeWidth="0.8" strokeLinejoin="round" />
            <path d={flame([110, 176], 82, 16, 0.8)} fill={url(gd)} stroke={ROYAL.edge} strokeWidth="0.8" strokeLinejoin="round" />
          </>,
        )}
        {cut(
          id,
          "cs",
          [[100, 149], [113, 155], [121, 166], [109, 176], [100, 191], [91, 176], [79, 166], [87, 155]],
          [100, 168],
          ROYAL.stops,
          ROYAL.edge,
          0.62,
        )}
        {cut(
          id,
          "fg",
          [[100, 154], [110, 166], [100, 184], [90, 166]],
          [100, 167],
          [[0, "#fffbe0"], [0.3, "#ffd36b"], [0.6, "#ff5a1f"], [1, "#9c0f0a"]],
          "#4a0904",
          0.38,
          0.8,
        )}
        {sparkle(96, 161, 3.8, 1)}
      </g>
    </>
  )
}

/* ── Milestones: Wins ─────────────────────────────────────────────────── */

const WIN_GOLD: Stops = [[0, "#fffbe3"], [0.3, "#ffe27a"], [0.65, "#e6a62a"], [1, "#9c5c08"]]
const STAR_GOLD: Stops = [[0, "#fffbe0"], [0.35, "#ffd84a"], [1, "#d97a06"]]

function victor(id: Id) {
  const wg = id("wg")
  return (
    <>
      <defs>
        {outside(id("wc"))}
        {shadow(id("sh"))}
        {lin(wg, WIN_GOLD, 0, 140, 0, 182)}
      </defs>
      <g filter={url(id("sh"))}>
        {ring(id, GOLD)}
        <g clipPath={url(id("wc"))}>
          {wingPair(wg, [[103, 164, 176, 138, 13, 9], [104, 169, 166, 158, 11, 6], [104, 174, 150, 174, 9, 3]], "#6b4206")}
        </g>
        {rim(GOLD.edge)}
        {cut(id, "dm", [[100, 156], [108, 166], [100, 179], [92, 166]], [100, 166], [[0, "#ffe0e0"], [0.4, "#ef4058"], [1, "#6e0414"]], "#3d020c", 0.4, 0.8)}
        {star(id, "st", 100, 31, 14, STAR_GOLD, "#6b3305")}
      </g>
    </>
  )
}

function conqueror(id: Id) {
  const wg = id("wg")
  const cw = id("cw")
  const cr = id("cr")
  return (
    <>
      <defs>
        {outside(id("wc"))}
        {shadow(id("sh"))}
        {lin(wg, WIN_GOLD, 0, 120, 0, 186)}
        {lin(cw, CRIMSON, 0, 100, 0, 170)}
        {lin(cr, CRIMSON, 60, 30, 140, 170)}
        {lin(id("cg"), GOLD.stops, 87, 150, 113, 188)}
        {lin(id("ce"), CRIMSON, 0, 152, 0, 184)}
      </defs>
      <g filter={url(id("sh"))}>
        <g clipPath={url(id("wc"))}>
          {wingPair(cw, [[140, 144, 192, 104, 13, 9], [142, 152, 194, 124, 12, 7]], "#3d020c", 0.45)}
        </g>
        {wire(cr, "#3d020c", 71.6)}
        {ring(id, GOLD)}
        <g clipPath={url(id("wc"))}>
          {wingPair(wg, [[103, 163, 190, 124, 16, 13], [104, 167, 180, 146, 14, 9], [104, 172, 162, 167, 11, 5]], "#6b3305")}
        </g>
        {rim(GOLD.edge)}
        {gem(id, "g1", pt(64, 90), 3.2, RUBY, GOLD)}
        {gem(id, "g2", pt(64, 270), 3.2, RUBY, GOLD)}
        {/* ruby crest */}
        <path d={shieldPath(152, 26, 36)} fill={url(id("cg"))} stroke={GOLD.edge} strokeWidth="1" />
        <path d={shieldPath(156, 19, 28)} fill={url(id("ce"))} stroke="#3d020c" strokeWidth="0.8" />
        {gem(id, "rb", [100, 167], 5.4, RUBY)}
        {star(id, "s1", 88, 31, 11.5, STAR_GOLD, "#6b3305")}
        {star(id, "s2", 112, 31, 11.5, STAR_GOLD, "#6b3305")}
      </g>
    </>
  )
}

function legend(id: Id) {
  const wg = id("wg")
  const cw = id("cw")
  const cr = id("cr")
  const cg = id("cg")
  const gl = id("gl")
  const crown = "M81 44 L76 23 L87 32 L92 17 L97 29 L100 15 L103 29 L108 17 L113 32 L124 23 L119 44 Q100 39 81 44 Z"
  return (
    <>
      <defs>
        {outside(id("wc"))}
        {shadow(id("sh"))}
        {lin(wg, WIN_GOLD, 0, 112, 0, 190)}
        {lin(cw, CRIMSON, 0, 60, 0, 170)}
        {lin(cr, CRIMSON, 60, 30, 140, 170)}
        {lin(cg, [[0, "#fffbe0"], [0.3, "#ffd966"], [0.65, "#d99a24"], [1, "#8a5408"]], 100, 12, 100, 46)}
        {glow(gl, 100, 100, 99, "#ffab1f", 0.6, 0.72, 0.55)}
      </defs>
      <circle cx="100" cy="100" r="99" fill={url(gl)} />
      <g filter={url(id("sh"))}>
        <g clipPath={url(id("wc"))}>
          {wingPair(cw, [[136, 136, 190, 70, 15, 11], [140, 144, 196, 92, 15, 10], [143, 152, 198, 114, 13, 7]], "#3d020c", 0.5)}
          {wingPair(id("ws"), [[110, 40, 156, 12, 11, 8], [112, 44, 162, 28, 9, 6]], "#6b3305", 0.8, 0.7)}
        </g>
        <defs>
          {lin(id("ws"), WIN_GOLD, 0, 10, 0, 48)}
          {glow(id("sg"), 100, 14, 14, "#fff2b0", 0, 0.25, 0.9)}
          {lin(id("cb"), [[0, "#ff6b7d"], [0.5, "#c0162f"], [1, "#6e0414"]], 0, 36, 0, 47)}
        </defs>
        {wire(cr, "#3d020c", 72)}
        {ring(id, GOLD, "rg", 64, 12)}
        {beads(64, [20, 40, 60, 120, 140, 160, 200, 220, 240, 300, 320, 340], "#ffe08a", GOLD.edge, 1.4)}
        <g clipPath={url(id("wc"))}>
          {wingPair(wg, [[103, 162, 194, 118, 17, 15], [104, 166, 188, 140, 16, 12], [104, 170, 176, 160, 14, 9], [104, 174, 158, 178, 12, 6]], "#6b3305")}
        </g>
        {rim(GOLD.edge)}
        {gem(id, "g1", pt(64, 90), 3.6, RUBY, GOLD)}
        {gem(id, "g2", pt(64, 270), 3.6, RUBY, GOLD)}
        {/* jewelled crest */}
        {cut(
          id,
          "cs",
          [[100, 145], [117, 151], [125, 165], [112, 177], [100, 194], [88, 177], [75, 165], [83, 151]],
          [100, 167],
          GOLD.stops,
          GOLD.edge,
          0.7,
        )}
        {cut(id, "ce", [[100, 151], [112, 156], [117, 166], [100, 186], [83, 166], [88, 156]], [100, 166], CRIMSON, "#3d020c", 0.6, 0.8)}
        {gem(id, "rb", [100, 166], 6.2, RUBY, GOLD)}
        {gem(id, "e1", [84, 162], 2, EMER)}
        {gem(id, "e2", [116, 162], 2, EMER)}
        {/* crown */}
        <path d={crown} fill={url(cg)} stroke="#5a3404" strokeWidth="1.1" strokeLinejoin="round" />
        <path d="M78 27 L81 40 M92 20 L95 30" fill="none" stroke="#fffbe0" strokeOpacity="0.75" strokeWidth="0.9" strokeLinecap="round" />
        <path d="M80 40 Q100 35 120 40 L119 47 Q100 42 81 47 Z" fill={url(id("cb"))} stroke="#3d020c" strokeWidth="0.8" />
        {gem(id, "c1", [100, 41.4], 2.8, RUBY, GOLD)}
        {gem(id, "c2", [89, 42.8], 1.7, SAPH)}
        {gem(id, "c3", [111, 42.8], 1.7, SAPH)}
        {[[76, 23], [92, 17], [108, 17], [124, 23]].map(([x, y]) => (
          <g key={x}>
            <circle cx={x} cy={y} r="1.9" fill="#ffe08a" stroke="#5a3404" strokeWidth="0.6" />
            <circle cx={x - 0.6} cy={y - 0.6} r="0.7" fill="#fff" fillOpacity="0.9" />
          </g>
        ))}
        <circle cx="100" cy="14" r="14" fill={url(id("sg"))} />
        {star(id, "s2", 100, 13, 11, STAR_GOLD, "#6b3305")}
        {star(id, "s1", 66, 38, 11, STAR_GOLD, "#6b3305")}
        {star(id, "s3", 134, 38, 11, STAR_GOLD, "#6b3305")}
        {[sparkle(150, 150, 4.2, 1), sparkle(46, 140, 3.4, 2), sparkle(176, 72, 3, 3), sparkle(28, 92, 2.6, 4), sparkle(94, 159, 3.4, 5)]}
      </g>
    </>
  )
}

/* ── Milestones: Played ───────────────────────────────────────────────── */

function regular(id: Id) {
  const lf = id("lf")
  const br: Branch = { R: 72, a0: 168, a1: 66, steps: 8, L: [17, 12], w: [3.8, 2.8] }
  const paint: LeafPaint = { fill: url(lf), edge: "#3f4550", lit: "#ffffff", rib: "#ffffff", stem: ["#3f4550", "#d9dee7"] }
  return (
    <>
      <defs>
        {shadow(id("sh"))}
        {lin(lf, [[0, "#ffffff"], [0.35, "#dfe4ec"], [0.7, "#9ea7b7"], [1, "#6c7486"]], 0, 70, 0, 185)}
      </defs>
      <g filter={url(id("sh"))}>
        {ring(id, SILVER)}
        {both(laurelSide(br, paint))}
        {gem(id, "kn", [100, 172.5], 4, ["#ffffff", "#c9d8ee", "#5f6f8c"], SILVER)}
      </g>
    </>
  )
}

function veteran(id: Id) {
  const lf = id("lf")
  const sg = id("sg")
  const sf = id("sf")
  const br: Branch = { R: 73, a0: 166, a1: 34, steps: 11, L: [19, 11], w: [4.2, 2.6] }
  const paint: LeafPaint = { fill: url(lf), edge: "#1b3550", lit: "#e8fbff", rib: "#e8fbff", stem: ["#1b3550", "#a6c4e4"] }
  return (
    <>
      <defs>
        {shadow(id("sh"))}
        {lin(lf, [[0, "#e6fbff"], [0.35, "#9fdbe6"], [0.7, "#4f97b3"], [1, "#2b5e80"]], 0, 40, 0, 185)}
        {lin(sg, SILVER.stops, 84, 148, 116, 190)}
        {lin(sf, [[0, "#9ec3ea"], [0.5, "#3f6fa6"], [1, "#16325a"]], 0, 154, 0, 186)}
      </defs>
      <g filter={url(id("sh"))}>
        {both(laurelSide(br, paint))}
        {ring(id, STEEL)}
        {gem(id, "t1", pt(64, 0), 3, ["#e8ffff", "#2fd3d8", "#05606e"], SILVER)}
        {gem(id, "t2", pt(64, 90), 2.4, ["#e8ffff", "#2fd3d8", "#05606e"], SILVER)}
        {gem(id, "t3", pt(64, 270), 2.4, ["#e8ffff", "#2fd3d8", "#05606e"], SILVER)}
        {/* shield crest with rank chevrons */}
        <path d={shieldPath(150, 30, 40)} fill={url(sg)} stroke={SILVER.edge} strokeWidth="1" strokeLinejoin="round" />
        <path d={shieldPath(154, 24, 32)} fill={url(sf)} stroke="#0d1f3a" strokeWidth="0.8" strokeLinejoin="round" />
        <path d="M90 162 L100 168 L110 162 M90 170 L100 176 L110 170" fill="none" stroke="#0d1f3a" strokeWidth="4.2" strokeLinejoin="round" strokeLinecap="round" />
        <path d="M90 162 L100 168 L110 162 M90 170 L100 176 L110 170" fill="none" stroke={url(sg)} strokeWidth="2.6" strokeLinejoin="round" strokeLinecap="round" />
        <path d="M90 154.5 Q100 152 110 154.5" fill="none" stroke="#fff" strokeOpacity="0.55" strokeWidth="1" strokeLinecap="round" />
      </g>
    </>
  )
}

function immortal(id: Id) {
  const back = id("wb")
  const front = id("wf")
  const hl = id("hl")
  const gl = id("gl")
  const cy = "#5ff3ff"
  return (
    <>
      <defs>
        {outside(id("wc"))}
        {shadow(id("sh"))}
        {lin(back, [[0, "#7fe9ff"], [0.35, "#2a73b8"], [0.75, "#12295a"], [1, "#0a1636"]], 0, 66, 0, 166)}
        {lin(front, [[0, "#ffffff"], [0.3, "#a6f4ff"], [0.65, "#2f8fd6"], [1, "#16306a"]], 0, 116, 0, 186)}
        {glow(hl, 100, 100, 96, cy, 0.74, 0.82, 0.6)}
        {glow(gl, 100, 168, 24, cy, 0, 0.25, 0.8)}
      </defs>
      {/* halo */}
      <circle cx="100" cy="100" r="96" fill={url(hl)} />
      <circle cx="100" cy="100" r="78.5" fill="none" stroke="#0a1636" strokeWidth="2.6" strokeOpacity="0.85" />
      <circle cx="100" cy="100" r="78.5" fill="none" stroke={cy} strokeWidth="1.2" />
      {beads(78.5, [0, 30, 330], "#c9fbff", "#0a1636", 1.6)}
      <g filter={url(id("sh"))}>
        <g clipPath={url(id("wc"))}>
          {wingPair(back, [[138, 138, 188, 70, 12, 9], [141, 145, 194, 88, 12, 8], [144, 152, 197, 106, 11, 7], [145, 159, 197, 124, 10, 6]], "#030a1c", 0.55, 0.7)}
        </g>
        {ring(id, NAVY)}
        <circle cx="100" cy="100" r="64" fill="none" stroke={cy} strokeOpacity="0.35" strokeWidth="4" />
        <circle cx="100" cy="100" r="64" fill="none" stroke={cy} strokeWidth="1.1" />
        <g clipPath={url(id("wc"))}>
          {wingPair(
            front,
            [[103, 162, 192, 120, 14, 13], [104, 165, 186, 138, 13, 11], [104, 168, 177, 154, 12, 9], [104, 171, 164, 168, 10, 7], [104, 174, 148, 180, 9, 4]],
            "#06173a",
            0.9,
            0.75,
          )}
        </g>
        {rim(NAVY.edge)}
        <circle cx="100" cy="168" r="24" fill={url(gl)} />
        {cut(id, "mt", [[100, 148], [114, 160], [114, 174], [100, 190], [86, 174], [86, 160]], [100, 168], NAVY.stops, NAVY.edge, 0.68)}
        {cut(id, "cg", [[100, 153], [109, 165], [100, 185], [91, 165]], [100, 167], [[0, "#ffffff"], [0.35, "#8ff6ff"], [0.7, "#19b6e6"], [1, "#0a4f9e"]], "#03203f", 0.38, 0.8)}
        {gem(id, "tg", pt(64, 0), 3.4, CYAN, NAVY)}
        {[sparkle(95, 160, 4, 1), sparkle(156, 52, 3, 2, "#c9fbff"), sparkle(40, 66, 2.6, 3, "#c9fbff"), sparkle(178, 150, 2.8, 4, "#c9fbff")]}
      </g>
    </>
  )
}

/* ── Milestones: Coins ────────────────────────────────────────────────── */

const GOLD_LEAF: Stops = [[0, "#fffbe0"], [0.35, "#ffe08a"], [0.7, "#d9a032"], [1, "#8a5a10"]]

function coinHunter(id: Id) {
  const lf = id("lf")
  const br: Branch = { R: 71, a0: 164, a1: 116, steps: 4, L: [17, 13], w: [3.8, 3.1] }
  const paint: LeafPaint = { fill: url(lf), edge: "#5e3b0b", lit: "#fffbe0", rib: "#fff6c0", stem: ["#5e3b0b", "#e6b84a"] }
  return (
    <>
      <defs>
        {shadow(id("sh"))}
        {lin(lf, GOLD_LEAF, 0, 120, 0, 190)}
      </defs>
      <g filter={url(id("sh"))}>
        {ring(id, GOLD)}
        {[0, 36, 72, 108, 252, 288, 324].map((a) => (
          <g key={a}>{coin(id, `c${a}`, pt(64, a), 5.6, false)}</g>
        ))}
        {both(laurelSide(br, paint))}
        {coin(id, "big", [100, 171], 16)}
        {[sparkle(90, 160, 3.6, 1), sparkle(133, 40, 2.8, 2), sparkle(36, 118, 2.6, 3)]}
      </g>
    </>
  )
}

function tycoon(id: Id) {
  const lf = id("lf")
  const cg = id("cg")
  const gd = id("gd")
  const br: Branch = { R: 73.5, a0: 152, a1: 40, steps: 10, L: [18, 11], w: [4, 2.6] }
  const paint: LeafPaint = { fill: url(lf), edge: "#5e3b0b", lit: "#fffbe0", rib: "#fff6c0", stem: ["#5e3b0b", "#e6b84a"] }
  const crown =
    "M72 44 L68 18 Q72 22 78 26 L84 12 Q88 22 92 26 L100 6 L108 26 Q112 22 116 12 L122 26 Q128 22 132 18 L128 44 Q100 37 72 44 Z"
  return (
    <>
      <defs>
        {shadow(id("sh"))}
        {lin(lf, GOLD_LEAF, 0, 40, 0, 180)}
        {lin(cg, [[0, "#fffbe0"], [0.3, "#ffd966"], [0.65, "#d99a24"], [1, "#8a5408"]], 100, 6, 100, 46)}
        {lin(gd, ROYAL.stops, 40, 30, 160, 170)}
      </defs>
      <g filter={url(id("sh"))}>
        {both(laurelSide(br, paint))}
        {wire(gd, ROYAL.edge, 72.6, 0, 359.99, 1.4)}
        {ring(id, ROYAL, "rg", 64, 14)}
        {beads(59.4, Array.from({ length: 36 }, (_, i) => i * 10), "#ffe9a8", ROYAL.edge, 0.9)}
        {beads(68.6, Array.from({ length: 36 }, (_, i) => i * 10 + 5), "#ffe9a8", ROYAL.edge, 0.9)}
        {gem(id, "g1", pt(64, 90), 3.8, EMER, ROYAL)}
        {gem(id, "g2", pt(64, 270), 3.8, EMER, ROYAL)}
        {gem(id, "g3", pt(64, 45), 3, RUBY, ROYAL)}
        {gem(id, "g4", pt(64, 315), 3, RUBY, ROYAL)}
        {gem(id, "g5", pt(64, 135), 3, SAPH, ROYAL)}
        {gem(id, "g6", pt(64, 225), 3, SAPH, ROYAL)}
        {/* stacked coins and the big coin */}
        {coinStack(id, "k1", [150, 186], 11, 6, [0, 1, -0.6, 0.8, -0.3, 0.4])}
        {coinStack(id, "k2", [50, 186], 11, 5, [0, -1, 0.6, -0.4, 0.5])}
        {coinStack(id, "k3", [127, 192], 9, 3, [0, 0.8, -0.5])}
        {coinStack(id, "k4", [73, 192], 9, 4, [0, -0.8, 0.5, -0.2])}
        {coin(id, "big", [100, 172], 16)}
        {/* crown */}
        <path d={crown} fill={url(cg)} stroke="#5a3404" strokeWidth="1.1" strokeLinejoin="round" />
        <path d="M70 21 L73 40 M84 16 L88 27 M100 11 L103 26" fill="none" stroke="#fffbe0" strokeOpacity="0.75" strokeWidth="0.9" strokeLinecap="round" />
        <path d="M70 37 Q100 30 130 37 L129 46 Q100 39 71 46 Z" fill={url(cg)} stroke="#5a3404" strokeWidth="1" strokeLinejoin="round" />
        {gem(id, "c1", [100, 39.2], 3.6, RUBY)}
        {gem(id, "c2", [88, 40.4], 2.4, EMER)}
        {gem(id, "c3", [112, 40.4], 2.4, EMER)}
        {gem(id, "c4", [77, 42.2], 2, SAPH)}
        {gem(id, "c5", [123, 42.2], 2, SAPH)}
        {gem(id, "p1", [100, 24], 2.6, SAPH)}
        {gem(id, "p2", [68, 18], 2.2, RUBY, ROYAL)}
        {gem(id, "p3", [132, 18], 2.2, RUBY, ROYAL)}
        {gem(id, "p4", [84, 12], 2.2, EMER, ROYAL)}
        {gem(id, "p5", [116, 12], 2.2, EMER, ROYAL)}
        {gem(id, "p6", [100, 6], 3, RUBY, ROYAL)}
        {[sparkle(162, 64, 4, 1), sparkle(36, 120, 3.4, 2), sparkle(172, 128, 3, 3), sparkle(30, 70, 2.6, 4), sparkle(92, 163, 3.6, 5)]}
      </g>
    </>
  )
}

/* ── Registry ─────────────────────────────────────────────────────────── */

export const MORE_FRAMES_A: Partial<Record<FrameId, FrameDraw>> = {
  silver_wings: ({ id }) => silverWings(id),
  gem_wings: ({ id }) => gemWings(id),
  inferno: ({ id }) => inferno(id),
  victor: ({ id }) => victor(id),
  conqueror: ({ id }) => conqueror(id),
  legend: ({ id }) => legend(id),
  regular: ({ id }) => regular(id),
  veteran: ({ id }) => veteran(id),
  immortal: ({ id }) => immortal(id),
  coin_hunter: ({ id }) => coinHunter(id),
  tycoon: ({ id }) => tycoon(id),
}
