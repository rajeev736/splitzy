/**
 * Avatar frame artwork for the Classic and Games sets.
 *
 * Each draw returns SVG children for a 200x200 viewBox, painted on top of a
 * round photo centred at (100,100) with r=60. The ring covers r≈57.5–70.5;
 * wings, stars and crowns reach out towards the edges. Every paint server /
 * filter id goes through `id()` so many frames can share one page.
 */
import type React from "react"
import type { FrameId } from "@/lib/fun/catalog"

export type FrameDraw = (p: { id: (name: string) => string }) => React.ReactElement

type Id = (name: string) => string
type Pt = [number, number]
type Stops = [number, string][]

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

const shadow = (gid: string, dy = 1.6, sd = 1.4, op = 0.4) => (
  <filter id={gid} x="-10%" y="-10%" width="120%" height="125%" colorInterpolationFilters="sRGB">
    <feDropShadow dx="0" dy={dy} stdDeviation={sd} floodColor="#000" floodOpacity={op} />
  </filter>
)

/* ── Metals ───────────────────────────────────────────────────────────── */

type Metal = { stops: Stops; edge: string; glint?: string }

const GOLD: Metal = {
  stops: [[0, "#fff7cf"], [0.2, "#f9d66e"], [0.45, "#dca631"], [0.6, "#a46a17"], [0.78, "#f2c95a"], [1, "#b67c1d"]],
  edge: "#5e3b0b",
}
const SILVER: Metal = {
  stops: [[0, "#ffffff"], [0.2, "#e6e9ef"], [0.45, "#b8bfcb"], [0.6, "#7c8493"], [0.78, "#e1e5ec"], [1, "#9aa2b1"]],
  edge: "#3f4550",
}
const ROSE: Metal = {
  stops: [[0, "#fff1ea"], [0.2, "#f7c6b3"], [0.45, "#de9581"], [0.6, "#a95c50"], [0.78, "#f1b6a2"], [1, "#c27868"]],
  edge: "#5e2c27",
}
const ANTIQUE: Metal = {
  stops: [[0, "#fff8d6"], [0.2, "#f0d27a"], [0.45, "#c99c38"], [0.6, "#8f6519"], [0.78, "#e8c461"], [1, "#a87a22"]],
  edge: "#4f360a",
}
const VIOLET: Metal = {
  stops: [[0, "#f6ecff"], [0.2, "#c9a2ff"], [0.45, "#8f5cf7"], [0.62, "#4c48e0"], [0.8, "#6fb0ff"], [1, "#3c6ff0"]],
  edge: "#241a6e",
}
const BRONZE: Metal = {
  stops: [[0, "#ffd9a8"], [0.2, "#c27a3e"], [0.45, "#6a3416"], [0.6, "#2e1408"], [0.78, "#b5652a"], [1, "#4a200c"]],
  edge: "#1a0b04",
}
const CANDY: Metal = {
  stops: [[0, "#ffe6f3"], [0.2, "#ff8fc8"], [0.45, "#e8399b"], [0.62, "#a42fc8"], [0.8, "#6f86ff"], [1, "#4f6dfa"]],
  edge: "#4a1046",
}
const ICE: Metal = {
  stops: [[0, "#ffffff"], [0.2, "#e6f7ff"], [0.45, "#ade0f7"], [0.62, "#6cb2dd"], [0.8, "#dcf3ff"], [1, "#89c6ea"]],
  edge: "#2f5f82",
}
const SUN: Metal = {
  stops: [[0, "#fff3bd"], [0.2, "#ffcc4d"], [0.45, "#ffa11f"], [0.62, "#dc5f0c"], [0.8, "#ffc23d"], [1, "#ee8612"]],
  edge: "#6e2c05",
}
const ROYAL: Metal = {
  stops: [[0, "#fffbe0"], [0.18, "#ffe08a"], [0.42, "#e3ae3a"], [0.6, "#9c6212"], [0.78, "#f7d36a"], [1, "#b8801f"]],
  edge: "#4d2e05",
}

/**
 * The polished band (r≈57.5–70.5): dark rim, metal gradient, tube shading,
 * a specular sweep at the top left and a soft inner shadow on the photo.
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

/** A round cabochon gem in a small metal bezel. */
function gem(id: Id, k: string, c: Pt, r: number, colors: [string, string, string], bezel?: Metal) {
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
      {bezel && (
        <circle cx={c[0]} cy={c[1]} r={r + r * 0.45} fill={url(b)} stroke={bezel.edge} strokeWidth="0.8" />
      )}
      <circle cx={c[0]} cy={c[1]} r={r} fill={url(g)} stroke="#000" strokeOpacity="0.45" strokeWidth="0.6" />
      <ellipse
        cx={c[0] - r * 0.32}
        cy={c[1] - r * 0.38}
        rx={r * 0.38}
        ry={r * 0.24}
        fill="#fff"
        fillOpacity="0.85"
        transform={`rotate(-35 ${c[0] - r * 0.32} ${c[1] - r * 0.38})`}
      />
      <circle cx={c[0] + r * 0.38} cy={c[1] + r * 0.4} r={r * 0.12} fill="#fff" fillOpacity="0.6" />
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
  const n: Pt = [u[1], -u[0]] // points "up" for a blade heading right
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

/** A four-pointed glint. */
const sparkle = (x: number, y: number, r: number, k: number) => (
  <path
    key={k}
    d={`M${x} ${y - r}Q${x} ${y} ${x + r} ${y}Q${x} ${y} ${x} ${y + r}Q${x} ${y} ${x - r} ${y}Q${x} ${y} ${x} ${y - r}Z`}
    fill="#fff"
    fillOpacity="0.95"
  />
)

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

/* ── Classic ──────────────────────────────────────────────────────────── */

/** Polished ring with four small faceted gems at the compass points. */
function classic(id: Id, m: Metal, gemStops: Stops, gemEdge: string) {
  return (
    <>
      <defs>{shadow(id("sh"), 1, 1, 0.3)}</defs>
      <g filter={url(id("sh"))}>
        {ring(id, m)}
        {[0, 90, 180, 270].map((a) => (
          <g key={a}>
            {cut(id, `gm${a}`, [pt(70.5, a), pt(64, a + 4.4), pt(57.5, a), pt(64, a - 4.4)], pt(64, a), gemStops, gemEdge, 0.42, 0.7)}
          </g>
        ))}
      </g>
    </>
  )
}

/* ── Games ────────────────────────────────────────────────────────────── */

function laurel(id: Id) {
  const leaves: { d: string; lit: string; rib: string }[] = []
  const leaf = (B: Pt, d: Pt, L: number, w: number) => {
    const n: Pt = [d[1], -d[0]]
    const T = add(B, d, L)
    const at = (a: number, b: number) => add(add(B, d, L * a), n, b)
    const c1 = at(0.25, w * 1.3)
    const c2 = at(0.72, w * 1.05)
    leaves.push({
      d: `M${f(B)}C${f(c1)} ${f(c2)} ${f(T)}C${f(at(0.72, -w * 1.05))} ${f(at(0.25, -w * 1.3))} ${f(B)}Z`,
      lit: `M${f(B)}C${f(c1)} ${f(c2)} ${f(T)}Z`,
      rib: `M${f(at(0.1, 0))}Q${f(at(0.5, w * 0.12))} ${f(at(0.85, 0))}`,
    })
  }
  const R = 72
  const steps = 10
  const tilt = (tan: Pt, out: Pt, deg: number) => norm(add([tan[0] * Math.cos(rad(deg)), tan[1] * Math.cos(rad(deg))], out, Math.sin(rad(deg))))
  for (let i = 0; i < steps; i++) {
    const a = 172 - i * 11.5
    const k = i / (steps - 1)
    const tan: Pt = [-Math.cos(rad(a)), -Math.sin(rad(a))]
    const out: Pt = [Math.sin(rad(a)), -Math.cos(rad(a))]
    const L = 20 - 7 * k
    const w = 4.4 - 1.3 * k
    leaf(pt(R + 0.5, a), tilt(tan, out, 40), L, w)
    const a2 = a - 5.75
    const tan2: Pt = [-Math.cos(rad(a2)), -Math.sin(rad(a2))]
    const out2: Pt = [Math.sin(rad(a2)), -Math.cos(rad(a2))]
    leaf(pt(R - 0.5, a2), tilt(tan2, out2, -34), L * 0.92, w * 0.95)
  }
  {
    const a = 172 - steps * 11.5 + 4
    leaf(pt(R, a + 2), [-Math.cos(rad(a)), -Math.sin(rad(a))], 13, 3)
  }
  const lg = id("lf")
  const side = (
    <>
      <path d={arc(R, 62, 178)} fill="none" stroke="#4a3a0c" strokeWidth="2.8" strokeLinecap="round" />
      <path d={arc(R, 62, 178)} fill="none" stroke="#d6b04a" strokeWidth="1.3" strokeLinecap="round" />
      {leaves.map((l, i) => (
        <g key={i}>
          <path d={l.d} fill={url(lg)} stroke="#27400f" strokeWidth="0.8" strokeLinejoin="round" />
          <path d={l.lit} fill="#fff6c0" fillOpacity="0.28" />
          <path d={l.rib} fill="none" stroke="#f6e7a0" strokeOpacity="0.8" strokeWidth="0.7" strokeLinecap="round" />
        </g>
      ))}
    </>
  )
  return (
    <>
      <defs>
        {shadow(id("sh"))}
        {lin(lg, [[0, "#d9e27a"], [0.4, "#8fc04a"], [0.75, "#4b8a2e"], [1, "#2f6322"]], 0, 70, 0, 185)}
        {lin(id("rb"), [[0, "#ff6b6b"], [0.5, "#c81e3a"], [1, "#7a0f22"]], 85, 160, 115, 196)}
      </defs>
      <g filter={url(id("sh"))}>
        {ring(id, ANTIQUE)}
        <g>{side}</g>
        <g transform={MIRROR}>{side}</g>
        {/* ribbon tie */}
        <path d="M96 172 L86 192 L91 190 L93 196 L99 175 Z" fill={url(id("rb"))} stroke="#4f0814" strokeWidth="0.8" strokeLinejoin="round" />
        <path d="M104 172 L114 192 L109 190 L107 196 L101 175 Z" fill={url(id("rb"))} stroke="#4f0814" strokeWidth="0.8" strokeLinejoin="round" />
        <path d="M100 171 C92 162 80 164 82 171 C84 178 94 176 100 171 Z" fill={url(id("rb"))} stroke="#4f0814" strokeWidth="0.8" />
        <path d="M100 171 C108 162 120 164 118 171 C116 178 106 176 100 171 Z" fill={url(id("rb"))} stroke="#4f0814" strokeWidth="0.8" />
        <path d="M85 168 C89 166 94 167 97 169" fill="none" stroke="#fff" strokeOpacity="0.5" strokeWidth="1" strokeLinecap="round" />
        <path d="M103 169 C106 167 111 166 115 168" fill="none" stroke="#fff" strokeOpacity="0.5" strokeWidth="1" strokeLinecap="round" />
        <ellipse cx="100" cy="171.5" rx="4" ry="4.4" fill={url(id("rb"))} stroke="#4f0814" strokeWidth="0.8" />
        <ellipse cx="99" cy="170" rx="1.6" ry="1.1" fill="#fff" fillOpacity="0.6" />
      </g>
    </>
  )
}

function risingStar(id: Id) {
  const wg = id("wg")
  return (
    <>
      <defs>
        {outside(id("wc"))}
        {shadow(id("sh"))}
        {lin(wg, [[0, "#ffffff"], [0.3, "#bfe3ff"], [0.65, "#7d8cf7"], [1, "#5130c9"]], 0, 120, 0, 186)}
      </defs>
      <g filter={url(id("sh"))}>
        {ring(id, VIOLET)}
        <g clipPath={url(id("wc"))}>
          {wingPair(wg, [[103, 162, 180, 126, 13, 10], [104, 167, 168, 148, 12, 8], [104, 172, 152, 166, 10, 5]], "#2a2380")}
        </g>
        {rim(VIOLET.edge)}
        {cut(
          id,
          "gm",
          [[100, 157], [110, 163], [100, 182], [90, 163]],
          [100, 165],
          [[0, "#e9e4ff"], [0.4, "#8f7bff"], [1, "#3b2bbd"]],
          "#221a73",
          0.42,
        )}
        {star(id, "st", 100, 33, 15, [[0, "#fff6ff"], [0.4, "#d6a8ff"], [1, "#7a3fe0"]], "#3c1a8a")}
      </g>
    </>
  )
}

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

function blaze(id: Id) {
  // Right-side tongues: [ring angle, height, lean towards vertical (0..1)].
  const tongues: [number, number, number][] = [
    [56, 26, 0.72],
    [74, 40, 0.66],
    [92, 34, 0.6],
    [108, 48, 0.58],
    [126, 38, 0.54],
    [142, 44, 0.5],
    [158, 36, 0.42],
    [172, 34, 0.34],
  ]
  // Layers share each tongue's base so the hot cores nest inside the bulb.
  const layer = (hk: number, wk: number) =>
    tongues.map(([a, h, lean]) => flame(pt(60, a), a * (1 - lean), h * hk, wk)).join("")
  const g1 = id("f1")
  const g2 = id("f2")
  const g3 = id("f3")
  const fire = (
    <>
      <path d={layer(1.07, 1.12)} fill="#7a0c10" />
      <path d={layer(1, 1)} fill={url(g1)} />
      <path d={layer(0.8, 0.8)} fill={url(g2)} />
      <path d={layer(0.58, 0.62)} fill={url(g3)} />
    </>
  )
  return (
    <>
      <defs>
        {outside(id("wc"))}
        {shadow(id("sh"))}
        {lin(g1, [[0, "#ffb347"], [0.4, "#f2461f"], [1, "#a3121a"]], 0, 30, 0, 190)}
        {lin(g2, [[0, "#ffe680"], [0.45, "#ff9a26"], [1, "#ef5a1c"]], 0, 45, 0, 185)}
        {lin(g3, [[0, "#fffde0"], [0.5, "#ffe066"], [1, "#ffb02e"]], 0, 70, 0, 180)}
        <radialGradient id={id("gl")} gradientUnits="userSpaceOnUse" cx="100" cy="112" r="88">
          <stop offset="0.68" stopColor="#ff6a00" stopOpacity="0.45" />
          <stop offset="1" stopColor="#ff6a00" stopOpacity="0" />
        </radialGradient>
        {lin(id("em"), [[0, "#ffe1a8"], [0.3, "#d08a46"], [0.65, "#7a3c18"], [1, "#3a1608"]], 86, 150, 114, 188)}
      </defs>
      <path d="M12 112A88 88 0 0 0 188 112L170 100A70 70 0 0 1 30 100Z" fill={url(id("gl"))} />
      <g filter={url(id("sh"))}>
        <g clipPath={url(id("wc"))}>
          <g>{fire}</g>
          <g transform={MIRROR}>{fire}</g>
        </g>
        {ring(id, BRONZE)}
        {/* emblem: bronze shield with an amber cut gem */}
        {cut(
          id,
          "es",
          [[100, 150], [116, 156], [114, 172], [100, 188], [86, 172], [84, 156]],
          [100, 166],
          [[0, "#ffd9a0"], [0.35, "#c47a3c"], [0.7, "#6e3416"], [1, "#2e1206"]],
          "#1a0b04",
          0.66,
        )}
        {cut(
          id,
          "eg",
          [[100, 156], [108, 165], [100, 180], [92, 165]],
          [100, 166],
          [[0, "#fff6c0"], [0.4, "#ff9a26"], [1, "#c2180c"]],
          "#4a0904",
          0.38,
          0.7,
        )}
      </g>
    </>
  )
}

function superstar(id: Id) {
  const w1 = id("w1")
  const w2 = id("w2")
  const sg: Stops = [[0, "#fff0f7"], [0.4, "#ff7fbf"], [1, "#d01f7a"]]
  return (
    <>
      <defs>
        {outside(id("wc"))}
        {shadow(id("sh"))}
        {lin(w1, [[0, "#ffc2e2"], [0.45, "#ec4f9c"], [1, "#8e1463"]], 0, 85, 0, 170)}
        {lin(w2, [[0, "#ffffff"], [0.35, "#ffc4e1"], [0.7, "#f773b4"], [1, "#c22c7c"]], 0, 112, 0, 188)}
        {lin(id("hg"), [[0, "#fff6cc"], [0.35, "#f8d466"], [0.7, "#d19a2a"], [1, "#8a5a10"]], 82, 150, 118, 186)}
      </defs>
      <g filter={url(id("sh"))}>
        <g clipPath={url(id("wc"))}>
          {wingPair(w1, [[138, 150, 192, 112, 13, 8], [138, 158, 190, 132, 12, 6]], "#6b0f45", 0.5)}
        </g>
        {ring(id, CANDY)}
        <g clipPath={url(id("wc"))}>
          {wingPair(w2, [[103, 162, 186, 122, 15, 13], [104, 166, 178, 143, 14, 10], [104, 170, 166, 161, 13, 8], [104, 174, 150, 176, 11, 5]], "#8a1855")}
        </g>
        {rim(CANDY.edge)}
        {star(id, "s1", 74, 41, 11, sg, "#7a0f45")}
        {star(id, "s3", 126, 41, 11, sg, "#7a0f45")}
        {star(id, "s2", 100, 32, 14, sg, "#7a0f45")}
        {/* gold heart crest */}
        <path
          d="M100 188 C86 178 78 168 80 159 C82 151 92 150 100 157 C108 150 118 151 120 159 C122 168 114 178 100 188 Z"
          fill={url(id("hg"))}
          stroke="#5e3a07"
          strokeWidth="1"
        />
        <path
          d="M100 182 C90 175 85 168 86 161 C87 156 94 156 100 161 C106 156 113 156 114 161 C115 168 110 175 100 182 Z"
          fill="none"
          stroke="#fff4c4"
          strokeOpacity="0.7"
          strokeWidth="1"
        />
        {gem(id, "hp", [100, 168], 5.2, ["#ffe4f2", "#ff4fa3", "#9c0a55"])}
      </g>
    </>
  )
}

function crystalWings(id: Id) {
  const back = id("wb")
  const front = id("wf")
  const clip = url(id("wc"))
  return (
    <>
      <defs>
        {outside(id("wc"))}
        {shadow(id("sh"), 1.4, 1.4, 0.35)}
        {lin(back, [[0, "#ffffff"], [0.5, "#cdeeff"], [1, "#78b9e2"]], 0, 85, 0, 170)}
        {lin(front, [[0, "#ffffff"], [0.4, "#e8f8ff"], [0.75, "#a9dcf6"], [1, "#6aa9d6"]], 0, 112, 0, 188)}
        {lin(id("mt"), SILVER.stops, 88, 150, 112, 186)}
        <radialGradient id={id("dg")} gradientUnits="userSpaceOnUse" cx="97" cy="168" r="14">
          <stop offset="0" stopColor="#e8f8ff" />
          <stop offset="0.4" stopColor="#4fb3ff" />
          <stop offset="1" stopColor="#0b3f9e" />
        </radialGradient>
      </defs>
      <g filter={url(id("sh"))}>
        <g clipPath={clip}>
          {wingPair(back, [[146, 134, 188, 82, 11, 9], [146, 142, 194, 100, 11, 8], [146, 150, 196, 118, 10, 7]], "#3a7aa6", 0.8, 0.7)}
        </g>
        {ring(id, ICE)}
        <g clipPath={clip}>
          {wingPair(front, [[103, 162, 190, 120, 13, 13], [104, 165, 184, 138, 12, 11], [104, 168, 176, 154, 11, 9], [104, 171, 164, 168, 10, 7], [104, 174, 148, 180, 9, 4]], "#3f80ad", 0.9, 0.75)}
        </g>
        {rim(ICE.edge)}
        {[sparkle(150, 146, 4.5, 1), sparkle(176, 126, 3.2, 2), sparkle(48, 156, 3.6, 3), sparkle(30, 112, 2.8, 4), sparkle(141, 47, 3, 5)]}
        {/* droplet gem in a silver mount */}
        <path d="M100 151 C107 160 113 167 113 173 C113 181 107 186 100 186 C93 186 87 181 87 173 C87 167 93 160 100 151 Z" fill={url(id("mt"))} stroke={SILVER.edge} strokeWidth="0.9" />
        <path d="M100 157 C105 164 109 169 109 173.5 C109 179 105 182 100 182 C95 182 91 179 91 173.5 C91 169 95 164 100 157 Z" fill={url(id("dg"))} stroke="#082d70" strokeWidth="0.7" />
        <path d="M96 166 C97 163 98.5 161 100 159" fill="none" stroke="#fff" strokeOpacity="0.9" strokeWidth="1.4" strokeLinecap="round" />
        <circle cx="104.5" cy="176" r="1.1" fill="#fff" fillOpacity="0.7" />
        {star(id, "st", 100, 33, 11, SILVER.stops, SILVER.edge)}
      </g>
    </>
  )
}

function championWings(id: Id) {
  const back = id("wb")
  const front = id("wf")
  const clip = url(id("wc"))
  return (
    <>
      <defs>
        {outside(id("wc"))}
        {shadow(id("sh"))}
        {lin(back, [[0, "#ffe27a"], [0.45, "#f0951a"], [1, "#94430a"]], 0, 85, 0, 170)}
        {lin(front, [[0, "#fffbe3"], [0.3, "#ffe36e"], [0.65, "#f6ab1e"], [1, "#b35d06"]], 0, 112, 0, 188)}
      </defs>
      <g filter={url(id("sh"))}>
        <g clipPath={clip}>
          {wingPair(back, [[140, 140, 192, 84, 15, 11], [142, 148, 196, 104, 14, 9], [142, 156, 196, 124, 13, 7]], "#5e2a04", 0.5)}
        </g>
        {ring(id, SUN)}
        <g clipPath={clip}>
          {wingPair(front, [[103, 162, 192, 116, 17, 15], [104, 166, 184, 140, 16, 12], [104, 170, 172, 160, 14, 9], [104, 174, 156, 177, 12, 6]], "#6b3305")}
        </g>
        {rim(SUN.edge)}
        {cut(
          id,
          "gm",
          [[100, 149], [106, 161], [119, 167], [106, 173], [100, 186], [94, 173], [81, 167], [94, 161]],
          [100, 167],
          [[0, "#ffffff"], [0.3, "#ffd36b"], [0.65, "#ff6a1f"], [1, "#a8160a"]],
          "#5e1a04",
          0,
          0.9,
        )}
        {sparkle(95, 160, 5, 1)}
        {star(id, "st", 100, 31, 16, [[0, "#fffbe0"], [0.35, "#ffd84a"], [1, "#d97a06"]], "#6b3305")}
      </g>
    </>
  )
}

function royalCrown(id: Id) {
  const cg = id("cg")
  const fl = url(id("fl"))
  const RUBY: [string, string, string] = ["#ffe0e0", "#e0203a", "#6e0414"]
  const SAPH: [string, string, string] = ["#e6efff", "#3d7cff", "#0a2a8a"]
  const EMER: [string, string, string] = ["#e6fff2", "#21c47a", "#04573a"]
  const PEARL: [string, string, string] = ["#ffffff", "#f2ead8", "#a89b80"]
  const crown = "M71 43 L66 14 L77 28 L84 9 L92 26 L100 4 L108 26 L116 9 L123 28 L134 14 L129 43 Q100 35 71 43 Z"
  const band = "M68 37 Q100 29 132 37 L131 47 Q100 39 69 47 Z"
  /** A gold scroll drawn as a dark under-stroke plus a metal stroke. */
  const curl = (d: string, k: number) => (
    <g key={k}>
      <path d={d} fill="none" stroke={ROYAL.edge} strokeWidth="3.6" strokeLinecap="round" />
      <path d={d} fill="none" stroke={fl} strokeWidth="2" strokeLinecap="round" />
    </g>
  )
  const side = (
    <>
      {curl("M168 86 C182 82 186 94 178 98 C172 101 168 94 174 92", 1)}
      {curl("M168 114 C182 118 186 106 178 102 C172 99 168 106 174 108", 2)}
    </>
  )
  return (
    <>
      <defs>
        {outside(id("wc"))}
        {shadow(id("sh"))}
        {lin(cg, [[0, "#fffbe0"], [0.3, "#ffd966"], [0.65, "#d99a24"], [1, "#8a5408"]], 100, 4, 100, 46)}
        {lin(id("lv"), [[0, "#fffbe0"], [0.35, "#ffd966"], [0.7, "#d99a24"], [1, "#8a5408"]], 0, 145, 0, 188)}
        {lin(id("fl"), ROYAL.stops, 140, 80, 190, 170)}
        <radialGradient id={id("vv")} gradientUnits="userSpaceOnUse" cx="94" cy="18" r="24">
          <stop offset="0" stopColor="#ff5a6e" />
          <stop offset="0.5" stopColor="#b3122e" />
          <stop offset="1" stopColor="#5a0414" />
        </radialGradient>
      </defs>
      <g filter={url(id("sh"))}>
        <path d={arc(73.5, 0, 359.9)} fill="none" stroke={ROYAL.edge} strokeWidth="3" />
        <path d={arc(73.5, 0, 359.9)} fill="none" stroke={fl} strokeWidth="1.6" />
        <g>{side}</g>
        <g transform={MIRROR}>{side}</g>
        {ring(id, ROYAL)}
        {Array.from({ length: 24 }, (_, i) => i * 15)
          .filter((a) => a % 45 !== 0)
          .map((a) => {
            const p = pt(64, a)
            return (
              <g key={a}>
                <circle cx={p[0]} cy={p[1]} r="1.5" fill="#ffe08a" stroke={ROYAL.edge} strokeWidth="0.5" />
                <circle cx={p[0] - 0.45} cy={p[1] - 0.45} r="0.55" fill="#fff" fillOpacity="0.9" />
              </g>
            )
          })}
        {gem(id, "g1", pt(64, 90), 3.6, EMER, ROYAL)}
        {gem(id, "g2", pt(64, 270), 3.6, EMER, ROYAL)}
        {gem(id, "g3", pt(64, 135), 3, SAPH, ROYAL)}
        {gem(id, "g4", pt(64, 225), 3, SAPH, ROYAL)}
        {gem(id, "g5", pt(64, 45), 3, SAPH, ROYAL)}
        {gem(id, "g6", pt(64, 315), 3, SAPH, ROYAL)}
        <g clipPath={url(id("wc"))}>
          {wingPair(id("lv"), [[104, 160, 150, 150, 10, 6], [104, 166, 146, 166, 10, 5], [104, 172, 136, 180, 9, 4]], "#5a3404", 0.85, 0.8)}
        </g>
        {rim(ROYAL.edge)}
        {/* bottom medallion */}
        {cut(
          id,
          "md",
          [[100, 152], [114, 158], [118, 169], [100, 188], [82, 169], [86, 158]],
          [100, 168],
          ROYAL.stops,
          ROYAL.edge,
          0.6,
        )}
        {gem(id, "g7", [100, 168], 5.6, RUBY)}
        {/* crown: velvet cap, body, band, jewels */}
        <path d="M70 40 C70 9 130 9 130 40 Z" fill={url(id("vv"))} stroke="#3d020c" strokeWidth="0.8" />
        <path d={crown} fill={url(cg)} stroke="#5a3404" strokeWidth="1.1" strokeLinejoin="round" />
        <path d="M72 38 L69 19 L76 29 M85 14 L91 27 M100 9 L104 25 M115 14 L109 27" fill="none" stroke="#fffbe0" strokeOpacity="0.75" strokeWidth="0.9" strokeLinecap="round" strokeLinejoin="round" />
        <path d={band} fill={url(cg)} stroke="#5a3404" strokeWidth="1" strokeLinejoin="round" />
        <path d="M70 39 Q100 31.5 130 39" fill="none" stroke="#fffbe0" strokeOpacity="0.85" strokeWidth="0.9" />
        {gem(id, "c1", [100, 38.5], 3.8, RUBY)}
        {gem(id, "c2", [86, 40.2], 2.5, SAPH)}
        {gem(id, "c3", [114, 40.2], 2.5, SAPH)}
        {gem(id, "c4", [75, 42.6], 2, EMER)}
        {gem(id, "c5", [125, 42.6], 2, EMER)}
        {gem(id, "p1", [66, 13], 2.6, PEARL)}
        {gem(id, "p2", [134, 13], 2.6, PEARL)}
        {gem(id, "p3", [84, 8], 2.6, PEARL)}
        {gem(id, "p4", [116, 8], 2.6, PEARL)}
        {gem(id, "p5", [100, 5], 3.2, RUBY, ROYAL)}
      </g>
    </>
  )
}

/* ── Registry ─────────────────────────────────────────────────────────── */

export const CLASSIC_GAMES_FRAMES: Partial<Record<FrameId, FrameDraw>> = {
  gold_ring: ({ id }) => classic(id, GOLD, [[0, "#ffffff"], [0.5, "#e4f4ff"], [1, "#8db3d4"]], "#5e3b0b"),
  silver_ring: ({ id }) => classic(id, SILVER, [[0, "#d6e4ff"], [0.45, "#3f6dff"], [1, "#11227a"]], "#2b3140"),
  rose_ring: ({ id }) => classic(id, ROSE, [[0, "#fff0f4"], [0.45, "#ff7fa6"], [1, "#a3204e"]], "#5e2c27"),
  laurel: ({ id }) => laurel(id),
  star_1: ({ id }) => risingStar(id),
  flame: ({ id }) => blaze(id),
  star_3: ({ id }) => superstar(id),
  crystal_wings: ({ id }) => crystalWings(id),
  gold_wings: ({ id }) => championWings(id),
  royal_crown: ({ id }) => royalCrown(id),
}
