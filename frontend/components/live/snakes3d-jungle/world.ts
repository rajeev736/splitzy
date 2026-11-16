import * as THREE from "three"

import { between, Builder, col, mix, shade, tf, tube, type Colour } from "./builder"
import {
  cellOf,
  colX,
  COLS,
  DEPTH,
  GATE,
  GROUND_Y,
  LADDER_SHAPES,
  NUM_D,
  NUM_W,
  NUM_Z,
  RAIL_R,
  rand,
  ROWS,
  rowShift,
  rowZ,
  SNAKE_SHAPES,
  START,
  TOP,
  tileTop,
  tileY,
  topNear,
} from "./layout"
import { canopyBands, foamRing, FOG_COLOUR, lightShaft, numberAtlas, poolRipples, softDot, waterStreaks } from "./textures"

/**
 * Builds the jungle: every static thing is merged into a handful of meshes
 * (stone + wood, foliage + snakes, numbers, water, backdrop, mist), so the
 * whole scene draws in a few dozen calls.
 */

/* ── Palette ─────────────────────────────────────────────────────────── */

const GRASS_A = col("#93dd56")
const GRASS_B = col("#7fd14b")
const GRASS_WARM = col("#b2e35a")
const GRASS_COOL = col("#6cc95a")
const GRASS_SIDE = col("#4c9a3a")
const GRASS_DRIP = col("#367f33")
const BEVEL = col("#bdf07f")
const GOLD = col("#ffd54a")
/** Cool slate, so the sunlit grass and the shaded stone read apart. */
const STONES = ["#8f9ba7", "#83909e", "#9aa5af", "#8794a1", "#a1aab2"].map(col)
/** What the stone fades toward deep down between the pillars. */
const DEEP = col("#2b5a60")
const MOSS = [col("#5d9c45"), col("#4f8f3c"), col("#6aa94e")]
const LEAF = [col("#2f8f3a"), col("#3fa548"), col("#267a31"), col("#47b04c")]
const WOOD = col("#a8743f")
const WOOD_DARK = col("#7a4f27")

const smooth = (t: number) => t * t * (3 - 2 * t)
const clamp01 = (t: number) => Math.max(0, Math.min(1, t))
const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z)
const UP = V(0, 1, 0)

/* ── Stone pillars and grass tops ─────────────────────────────────────── */

/** A square ring at height y (corners in increasing angle from +x toward +z). */
function square(x: number, y: number, z: number, h: number) {
  return [V(x + h, y, z - h), V(x + h, y, z + h), V(x - h, y, z + h), V(x - h, y, z - h)]
}

/** An octagonal ring (a square with chamfered corners). */
function octagon(x: number, y: number, z: number, h: number) {
  const c = h * 0.3
  return [
    V(x + h, y, z - h + c),
    V(x + h, y, z + h - c),
    V(x + h - c, y, z + h),
    V(x - h + c, y, z + h),
    V(x - h, y, z + h - c),
    V(x - h, y, z - h + c),
    V(x - h + c, y, z - h),
    V(x + h - c, y, z - h),
  ]
}

function ngon(x: number, y: number, z: number, r: number, n: number, rot = 0) {
  return Array.from({ length: n }, (_, i) => {
    const a = rot + (i / n) * Math.PI * 2
    return V(x + Math.cos(a) * r, y, z + Math.sin(a) * r)
  })
}

/** Side walls between two rings (lower, upper); faces pointing away from the camera are skipped. */
function wall(b: Builder, lo: THREE.Vector3[], hi: THREE.Vector3[], cx: number, cz: number, colour: Colour | ((v: THREE.Vector3, n: THREE.Vector3) => Colour), keepBack = false) {
  const n = lo.length
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n
    const out = V((lo[i].x + lo[j].x) / 2 - cx, 0, (lo[i].z + lo[j].z) / 2 - cz).normalize()
    if (!keepBack && out.z < -0.45) continue
    b.quadOut(lo[i], hi[i], hi[j], lo[j], out, typeof colour === "function" ? (_c, nn, v) => colour(v, nn) : colour)
  }
}

/** A cap over a ring, facing `out`. */
function cap(b: Builder, ring: THREE.Vector3[], out: THREE.Vector3, colour: Colour) {
  for (let i = 1; i < ring.length - 1; i++) b.triOut(ring[0], ring[i], ring[i + 1], out, colour)
}

/**
 * A chunky stone pillar: stacked, slightly uneven blocks with chamfered
 * edges, darkened under the grass (contact shadow) and toward the ground.
 */
function pillar(b: Builder, x: number, z: number, top: number, bottom: number, half: number, r: () => number, seams = 3) {
  const ao = (y: number) => {
    const under = 0.42 + 0.58 * smooth(clamp01((top - y) / 0.55))
    const ground = 0.45 + 0.55 * clamp01((y - GROUND_Y) / 3.2)
    return under * ground
  }
  let yt = top
  for (let i = 0; yt > bottom + 0.05; i++) {
    const last = i >= seams || yt - bottom < 0.9
    const h = last ? yt - bottom : 0.42 + r() * 0.2
    const yb = yt - h
    const base = shade(STONES[Math.floor(r() * STONES.length)], 0.94 + r() * 0.1)
    const ox = (r() - 0.5) * 0.03
    const oz = (r() - 0.5) * 0.02
    const hh = half * (0.97 + r() * 0.04)
    const e = 0.045
    const rings = [octagon(x + ox, yb, z + oz, hh - e), octagon(x + ox, yb + e, z + oz, hh), octagon(x + ox, yt - e, z + oz, hh), octagon(x + ox, yt, z + oz, hh - e)]
    const colour = (v: THREE.Vector3, n: THREE.Vector3) =>
      mix(shade(base, ao(v.y) * (n.y > 0.3 ? 1.12 : n.y < -0.3 ? 0.72 : 1)), DEEP, 0.6 * smooth(clamp01((top - v.y - 0.5) / 4.5)))
    for (let k = 0; k < 3; k++) wall(b, rings[k], rings[k + 1], x, z, colour)
    // Moss creeping over the top block
    if (i === 0 && r() < 0.55) mossPatch(b, x + (r() - 0.5) * half, yt - 0.12 - r() * 0.18, z + hh + 0.006, 0.08 + r() * 0.12, r)
    yt = yb
  }
}

/** An irregular moss blob stuck on a front face. */
function mossPatch(b: Builder, x: number, y: number, z: number, s: number, r: () => number) {
  const c = MOSS[Math.floor(r() * MOSS.length)]
  const pts = Array.from({ length: 7 }, (_, i) => {
    const a = (i / 7) * Math.PI * 2
    const d = s * (0.6 + r() * 0.5)
    return V(x + Math.cos(a) * d, y + Math.sin(a) * d * 0.7, z)
  })
  const centre = V(x, y, z)
  for (let i = 0; i < 7; i++) b.triOut(centre, pts[i], pts[(i + 1) % 7], V(0, 0, 1), c)
}

/**
 * A grass slab with a bevelled top and a jagged fringe of grass hanging over
 * its front and sides. `top` is the top face's colour.
 */
function slab(b: Builder, x: number, y: number, z: number, size: number, top: Colour, r: () => number, thick = 0.22) {
  const h = size / 2
  const bev = 0.075
  const A = square(x, y, z, h - bev)
  const B = square(x, y - bev, z, h)
  const C = square(x, y - thick, z, h)
  // The top: a soft cushion, lighter in the middle, with a little mottling
  const N = 3
  const hb = h - bev
  const P = (i: number, j: number) => V(x - hb + (2 * hb * i) / N, y, z - hb + (2 * hb * j) / N)
  const tint = (_c: THREE.Vector3, _n: THREE.Vector3, v: THREE.Vector3) => {
    const dx = (v.x - x) / hb
    const dz = (v.z - z) / hb
    const noise = Math.sin(v.x * 12.9 + v.z * 7.3) * Math.sin(v.x * 5.1 - v.z * 11.7)
    return shade(top, 1.07 - 0.1 * ((dx * dx + dz * dz) / 2) + 0.035 * noise - 0.03 * dz)
  }
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) b.quadOut(P(i, j), P(i + 1, j), P(i + 1, j + 1), P(i, j + 1), UP, tint)
  for (let i = 0; i < 4; i++) {
    const j = (i + 1) % 4
    const out = V((B[i].x + B[j].x) / 2 - x, 0, (B[i].z + B[j].z) / 2 - z).normalize()
    b.quadOut(B[i], A[i], A[j], B[j], out.clone().add(UP), i === 3 ? shade(BEVEL, 0.9) : BEVEL)
    if (i === 3) continue
    b.quadOut(C[i], B[i], B[j], C[j], out, GRASS_SIDE)
    // The fringe
    const from = C[i]
    const to = C[j]
    const steps = 9
    for (let s = 0; s < steps; s++) {
      const p0 = from.clone().lerp(to, s / steps).addScaledVector(out, 0.004)
      const p1 = from.clone().lerp(to, (s + 1) / steps).addScaledVector(out, 0.004)
      const m = p0.clone().lerp(p1, 0.5)
      m.y -= 0.05 + r() * 0.13
      b.triOut(p0, p1, m, out, r() < 0.5 ? GRASS_DRIP : GRASS_SIDE)
    }
  }
}

/** A few blades of grass. */
function tuft(b: Builder, x: number, y: number, z: number, r: () => number, sway: Builder | null = null) {
  const t = sway ?? b
  for (let i = 0; i < 3; i++) {
    const a = r() * Math.PI
    const dx = Math.cos(a) * 0.035
    const dz = Math.sin(a) * 0.035
    const lean = (r() - 0.5) * 0.08
    const tip = V(x + lean, y + 0.1 + r() * 0.08, z + (r() - 0.5) * 0.04)
    const c = r() < 0.5 ? LEAF[1] : LEAF[3]
    t.triOut(V(x - dx, y, z - dz), V(x + dx, y, z + dz), tip, V(0, 0.3, 1), c, (v) => (v === tip ? 0.025 : 0))
  }
}

/** A vine hanging from (x, y, z) down a face that looks along `out`, `along` the face sideways. */
function vine(b: Builder, x: number, y: number, z: number, len: number, out: THREE.Vector3, along: THREE.Vector3, r: () => number) {
  const n = Math.max(3, Math.round(len / 0.075))
  let px = 0
  for (let i = 0; i < n; i++) {
    const t = i / n
    px += (r() - 0.5) * 0.03
    const base = V(x, y - t * len, z).addScaledVector(along, px).addScaledVector(out, 0.012)
    const side = i % 2 === 0 ? 1 : -1
    const c = LEAF[Math.floor(r() * LEAF.length)]
    const sway = 0.012 + t * 0.035
    // A diamond leaf, alternating sides
    const s = 0.045 + r() * 0.03
    const tip = base.clone().addScaledVector(along, side * s * 1.6).add(V(0, -s * 0.6, 0)).addScaledVector(out, 0.02)
    const l = base.clone().add(V(0, s * 0.35, 0)).addScaledVector(along, side * s * 0.6)
    const rr = base.clone().add(V(0, -s * 0.6, 0)).addScaledVector(along, side * s * 0.5)
    b.quadOut(base, l, tip, rr, out, c, sway)
    // The stem
    const next = V(x, y - (t + 1 / n) * len, z).addScaledVector(along, px).addScaledVector(out, 0.011)
    b.quadOut(base.clone().addScaledVector(along, -0.008), base.clone().addScaledVector(along, 0.008), next.clone().addScaledVector(along, 0.008), next.clone().addScaledVector(along, -0.008), out, LEAF[2], sway)
    if (r() < 0.05) {
      const f = base.clone().addScaledVector(out, 0.025)
      b.geometry(new THREE.IcosahedronGeometry(0.035, 0), tf(f.x, f.y, f.z), r() < 0.5 ? col("#ff7eb6") : col("#ffe066"), { sway })
    }
  }
}

/* ── Foliage ─────────────────────────────────────────────────────────── */

/** A blob of leaves: an icosahedron, lighter on top (fake sunlight), darker underneath. */
function blob(b: Builder, x: number, y: number, z: number, rad: number, base: Colour, r: () => number, sway = 0.02, sy = 0.85) {
  b.geometry(
    new THREE.IcosahedronGeometry(rad, 1),
    tf(x, y, z, r() * 3, r() * 3, 0, 1, sy, 1),
    (_c, n) => shade(base, 0.78 + Math.max(0, n.y) * 0.35 + (r() - 0.5) * 0.08),
    { sway }
  )
}

function palm(b: Builder, x: number, y: number, z: number, height: number, leanX: number, leanZ: number, r: () => number) {
  const pts: THREE.Vector3[] = []
  const N = 7
  for (let i = 0; i <= N; i++) {
    const t = i / N
    pts.push(V(x + leanX * t * t * height, y + t * height, z + leanZ * t * t * height))
  }
  tube(b, pts, (i) => 0.075 * (1 - (i / N) * 0.45), 6, (i) => (i % 2 ? col("#8b5a2b") : col("#a26c36")), (i) => 0.03 * (i / N) ** 2)
  const top = pts[N]
  const fronds = 7
  for (let f = 0; f < fronds; f++) {
    const a = (f / fronds) * Math.PI * 2 + r() * 0.4
    const d = V(Math.cos(a), 0, Math.sin(a))
    const side = V(-d.z, 0, d.x)
    const L = 0.75 + r() * 0.25
    const S = 6
    let prevL: THREE.Vector3 | null = null
    let prevR: THREE.Vector3 | null = null
    let prevC: THREE.Vector3 | null = null
    for (let s = 0; s <= S; s++) {
      const t = s / S
      const c = top.clone().addScaledVector(d, L * t).add(V(0, (0.28 * t - 0.62 * t * t) * L, 0))
      const w = 0.2 * Math.sin(Math.PI * Math.min(1, t * 1.1)) + 0.01
      const lp = c.clone().addScaledVector(side, w).add(V(0, -0.05 * w, 0))
      const rp = c.clone().addScaledVector(side, -w).add(V(0, -0.05 * w, 0))
      const cc = c.clone().add(V(0, 0.03, 0))
      if (prevL && prevR && prevC) {
        const sw = 0.02 + t * 0.05
        b.quadOut(prevC, cc, lp, prevL, UP, LEAF[1], sw)
        b.quadOut(prevC, prevR, rp, cc, UP, LEAF[0], sw)
      }
      prevL = lp
      prevR = rp
      prevC = cc
    }
  }
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2
    b.geometry(new THREE.IcosahedronGeometry(0.065, 0), tf(top.x + Math.cos(a) * 0.07, top.y - 0.06, top.z + Math.sin(a) * 0.07), col("#7a4a1f"), { sway: 0.02 })
  }
}

function tree(b: Builder, x: number, y: number, z: number, height: number, r: () => number) {
  const pts = [V(x, y, z), V(x + 0.03, y + height * 0.5, z), V(x - 0.02, y + height, z)]
  tube(b, pts, (i) => [0.1, 0.075, 0.05][i], 6, () => col("#7b5130"), (i) => i * 0.01)
  const greens = [col("#3d9b45"), col("#4fb34f"), col("#358a3e")]
  const top = y + height
  blob(b, x, top + 0.1, z, 0.5, greens[0], r, 0.025)
  blob(b, x - 0.32, top - 0.08, z + 0.1, 0.36, greens[1], r, 0.025)
  blob(b, x + 0.33, top - 0.04, z + 0.05, 0.38, greens[2], r, 0.025)
  blob(b, x + 0.05, top + 0.42, z - 0.05, 0.32, greens[1], r, 0.03)
}

function bush(b: Builder, x: number, y: number, z: number, s: number, r: () => number) {
  const greens = [col("#4caf50"), col("#3d9b45"), col("#5cbf54")]
  blob(b, x, y + 0.12 * s, z, 0.24 * s, greens[0], r, 0.012)
  blob(b, x - 0.2 * s, y + 0.08 * s, z + 0.06, 0.18 * s, greens[1], r, 0.012)
  blob(b, x + 0.2 * s, y + 0.09 * s, z + 0.03, 0.19 * s, greens[2], r, 0.012)
  if (r() < 0.6) {
    const fc = [col("#ff6fa8"), col("#ffd23f"), col("#ffffff"), col("#ff8a3d")][Math.floor(r() * 4)]
    for (let i = 0; i < 4; i++) b.geometry(new THREE.IcosahedronGeometry(0.04 * s, 0), tf(x + (r() - 0.5) * 0.4 * s, y + (0.18 + r() * 0.12) * s, z + 0.12 * s + r() * 0.06), fc, { sway: 0.012 })
  }
}

/** A big tropical leaf, rooted at (x, y, z), pointing along `dir`. */
function bigLeaf(b: Builder, x: number, y: number, z: number, dir: THREE.Vector3, len: number, c: Colour) {
  const d = dir.clone().normalize()
  const side = V(-d.z, 0, d.x).normalize()
  const base = V(x, y, z)
  const mid = base.clone().addScaledVector(d, len * 0.5).add(V(0, len * 0.18, 0))
  const tip = base.clone().addScaledVector(d, len).add(V(0, -len * 0.05, 0))
  const l = mid.clone().addScaledVector(side, len * 0.28)
  const rr = mid.clone().addScaledVector(side, -len * 0.28)
  const ridge = mid.clone().add(V(0, 0.03, 0))
  b.quadOut(base, l, tip, ridge, UP, c, (v) => (v === tip ? 0.05 : 0.02))
  b.quadOut(base, ridge, tip, rr, UP, shade(c, 0.85), (v) => (v === tip ? 0.05 : 0.02))
}

/* ── Ladders and snakes ──────────────────────────────────────────────── */

/** Three ladder woods (rail, node/grain, rung), so crossing ladders read apart. */
const LADDER_WOODS: [Colour, Colour, Colour][] = [
  [col("#dcae55"), col("#9a7130"), col("#f3d690")],
  [col("#a9653a"), col("#6f3d1e"), col("#dca36a")],
  [col("#c79e66"), col("#86663c"), col("#ecd6a6")],
]
const ROPE = col("#5d3c1f")

/** Sturdy ladders: thick rails (bamboo with nodes, or grained wood), clear rungs lashed with rope. */
function ladders(b: Builder) {
  for (const L of LADDER_SHAPES) {
    const kind = L.index % LADDER_WOODS.length
    const [rail, grain, rung] = LADDER_WOODS[kind]
    const len = L.curve.getLength()
    const M = Math.max(10, Math.ceil(len * 4.5))
    for (const s of [-1, 1]) {
      const pts = Array.from({ length: M + 1 }, (_, i) => L.curve.getPointAt(i / M).addScaledVector(L.side, s * L.half))
      // Stand the rails' feet slightly into the grass
      pts[0].y -= 0.03
      tube(b, pts, () => RAIL_R, 6, (i, _j, n) => {
        const d = (i * len) / M
        const node = kind === 0 ? d % 0.5 < 0.07 : Math.sin(d * 7 + s * 2) > 0.8
        return shade(node ? grain : rail, 0.9 + Math.max(0, n.y) * 0.16)
      })
      const e = pts[M]
      b.geometry(new THREE.SphereGeometry(RAIL_R * 1.1, 7, 4), tf(e.x, e.y, e.z), grain, { smooth: true })
    }
    const rungs = Math.max(2, Math.round(len / 0.27))
    for (let k = 1; k < rungs; k++) {
      const p = L.curve.getPointAt(k / rungs)
      const tan = L.curve.getTangentAt(k / rungs).multiplyScalar(0.032)
      const a = p.clone().addScaledVector(L.side, -L.half)
      const c = p.clone().addScaledVector(L.side, L.half)
      b.geometry(new THREE.CylinderGeometry(1, 1, 1, 5, 1, true), between(a, c, 0.034), (_c, n) => shade(rung, 0.88 + Math.max(0, n.y) * 0.22))
      // Rope lashings where the rung meets the rails
      for (const q of [a, c]) b.geometry(new THREE.CylinderGeometry(1, 1, 1, 5, 1, true), between(q.clone().sub(tan), q.clone().add(tan), RAIL_R * 1.3), ROPE)
    }
  }
}

/** Per snake: body, pattern, belly, side stripe. */
const SNAKE_COLOURS: [string, string, string, string][] = [
  ["#3fbf4f", "#17642a", "#f2fbbe", "#c2f27a"],
  ["#f58a1f", "#933806", "#ffe9b6", "#ffd27a"],
  ["#9b5be6", "#45197f", "#f3e0ff", "#d9b2ff"],
  ["#1fb5ad", "#0a5a55", "#d9fff7", "#90f2e2"],
  ["#ea4b3c", "#731510", "#ffe3cc", "#ffb894"],
  ["#f4c22c", "#855400", "#fff7c8", "#fff1a0"],
  ["#3d86ea", "#123a78", "#e0edff", "#a6ccff"],
  ["#ee5ca6", "#771542", "#ffe3f1", "#ffb8da"],
]

/**
 * The snakes, as one smooth-shaded mesh: chunky tapered bodies with chevrons down the back, a
 * light stripe along each side and a pale belly; big friendly heads with eyes that look up at
 * you, rosy cheeks and a forked tongue. Each vertex carries its sideways direction, its place
 * along the body and how far it sways, for the idle slither in the vertex shader.
 */
function snakeGeometry(): THREE.BufferGeometry {
  const pos: number[] = []
  const nor: number[] = []
  const clr: number[] = []
  const sideA: number[] = []
  const phaseA: number[] = []
  const ampA: number[] = []
  const idx: number[] = []
  const vert = (p: THREE.Vector3, n: THREE.Vector3, c: Colour, sd: THREE.Vector3, ph: number, am: number) => {
    pos.push(p.x, p.y, p.z)
    nor.push(n.x, n.y, n.z)
    clr.push(c.r, c.g, c.b)
    sideA.push(sd.x, sd.y, sd.z)
    phaseA.push(ph)
    ampA.push(am)
    return pos.length / 3 - 1
  }
  const K = (Math.PI * 2) / 1.7
  const ampAt = (u: number) => 0.024 + 0.018 * Math.sin(Math.PI * u)
  const camDir = V(Math.sin(0.13) * Math.cos(0.84), Math.sin(0.84), Math.cos(0.13) * Math.cos(0.84)).normalize()
  const NM = new THREE.Matrix3()

  for (const S of SNAKE_SHAPES) {
    const [bodyHex, patHex, bellyHex, stripeHex] = SNAKE_COLOURS[S.index % SNAKE_COLOURS.length]
    const body = col(bodyHex)
    const pat = col(patHex)
    const belly = col(bellyHex)
    const stripe = col(stripeHex)
    const len = S.curve.getLength()
    const M = Math.max(20, Math.ceil(len / 0.085))
    const R = 10
    let nUp = V(0, 1, 0)
    const c = V(0, 0, 0)
    const t = V(0, 0, 0)
    const first = pos.length / 3
    let lastSide = V(1, 0, 0)
    for (let i = 0; i <= M; i++) {
      const u = i / M
      S.curve.getPointAt(u, c)
      S.curve.getTangentAt(u, t)
      // A frame carried along the body (no sudden twists)
      nUp = nUp.addScaledVector(t, -t.dot(nUp)).normalize()
      const bin = V(0, 0, 0).crossVectors(t, nUp).normalize()
      const sideH = V(-t.z, 0, t.x)
      if (sideH.lengthSq() < 1e-6) sideH.copy(lastSide)
      sideH.normalize()
      lastSide = sideH
      const r = S.radius(u)
      const s = u * len
      const fade = clamp01((0.94 - u) / 0.1)
      for (let j = 0; j < R; j++) {
        const a = (j / R) * Math.PI * 2
        const n = nUp.clone().multiplyScalar(Math.cos(a)).addScaledVector(bin, Math.sin(a))
        const lat = n.dot(sideH)
        let k: Colour
        if (n.y < -0.32) k = belly
        else if (Math.abs(lat) > 0.8 && n.y < 0.28) k = stripe
        else {
          // Saddle bands across the back
          const q = Math.atan2(lat, n.y) / (Math.PI / 2)
          const ph = (s / 0.5) % 1
          k = Math.abs(q) < 0.72 && ph < 0.34 * fade ? pat : shade(body, 1 + 0.08 * n.y)
        }
        vert(c.clone().addScaledVector(n, r), n, k, sideH, s * K, ampAt(u))
      }
      if (i > 0) {
        const a0 = first + (i - 1) * R
        const b0 = first + i * R
        for (let j = 0; j < R; j++) {
          const j2 = (j + 1) % R
          idx.push(a0 + j, b0 + j2, b0 + j, a0 + j, a0 + j2, b0 + j2)
        }
      }
    }
    // Close the tail's tip
    const tip = vert(c.clone().addScaledVector(t, S.radius(1) * 1.2), t, shade(body, 0.9), lastSide, len * K, ampAt(1))
    const lastRing = first + M * R
    for (let j = 0; j < R; j++) idx.push(lastRing + j, lastRing + ((j + 1) % R), tip)

    // The head, in its own frame: looking toward the camera, nose tipped down a little
    const h0 = S.curve.getPointAt(0)
    const yaw = ((S.index % 3) - 1) * 0.22
    const fwd = V(Math.sin(yaw), -0.26, Math.cos(yaw)).normalize()
    const right = V(0, 0, 0).crossVectors(UP, fwd).normalize()
    const up = V(0, 0, 0).crossVectors(fwd, right).normalize()
    const frame = new THREE.Matrix4().makeBasis(right, up, fwd).setPosition(h0.x, h0.y, h0.z)
    const look = camDir.clone().applyMatrix4(new THREE.Matrix4().extractRotation(frame).invert())
    const neckSide = right.clone()
    const add = (geo: THREE.BufferGeometry, local: THREE.Matrix4, colour: Colour | ((n: THREE.Vector3) => Colour)) => {
      const m = frame.clone().multiply(local)
      NM.getNormalMatrix(m)
      const g = geo.index ? geo.toNonIndexed() : geo
      const p = g.getAttribute("position")
      const n = g.getAttribute("normal")
      const base = pos.length / 3
      for (let i = 0; i < p.count; i++) {
        const v = V(0, 0, 0).fromBufferAttribute(p, i).applyMatrix4(m)
        const nn = V(0, 0, 0).fromBufferAttribute(n, i).applyMatrix3(NM).normalize()
        vert(v, nn, typeof colour === "function" ? colour(nn) : colour, neckSide, 0, ampAt(0))
      }
      for (let i = 0; i < p.count; i++) idx.push(base + i)
      if (g !== geo) g.dispose()
      geo.dispose()
    }
    const skin = (n: THREE.Vector3) => (n.dot(up) < -0.35 ? belly : shade(body, 1 + 0.1 * n.dot(up)))
    add(new THREE.SphereGeometry(1, 14, 10), tf(0, 0.015, 0.04, 0, 0, 0, 0.215, 0.14, 0.25), skin)
    add(new THREE.SphereGeometry(1, 10, 7), tf(0, -0.01, 0.2, 0, 0, 0, 0.165, 0.1, 0.17), skin)
    add(new THREE.SphereGeometry(1, 10, 5), tf(0, -0.06, 0.09, 0, 0, 0, 0.17, 0.07, 0.21), belly)
    // Big eyes looking up at the player, with a glint
    for (const sx of [-1, 1]) {
      const e = V(sx * 0.105, 0.105, 0.085)
      add(new THREE.SphereGeometry(0.08, 10, 7), tf(e.x, e.y, e.z), col("#ffffff"))
      const p = e.clone().addScaledVector(look, 0.05).add(V(sx * 0.008, 0, 0))
      add(new THREE.SphereGeometry(0.046, 8, 6), tf(p.x, p.y, p.z), col("#15121c"))
      const g = e.clone().addScaledVector(look, 0.078).add(V(-0.016, 0.018, 0))
      add(new THREE.SphereGeometry(0.017, 5, 3), tf(g.x, g.y, g.z), col("#ffffff"))
      add(new THREE.SphereGeometry(1, 6, 4), tf(sx * 0.165, 0.0, 0.17, 0, 0, 0, 0.045, 0.022, 0.04), col("#ff8fa6"))
      add(new THREE.SphereGeometry(0.014, 4, 3), tf(sx * 0.045, 0.06, 0.345), shade(pat, 0.7))
    }
    // A forked tongue
    const red = col("#e8344e")
    add(new THREE.BoxGeometry(0.032, 0.012, 0.13), tf(0, -0.05, 0.4, 0.1, 0, 0), red)
    for (const sx of [-1, 1]) add(new THREE.BoxGeometry(0.022, 0.01, 0.07), tf(sx * 0.02, -0.058, 0.48, 0.1, sx * 0.45, 0), red)
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3))
  g.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3))
  g.setAttribute("color", new THREE.Float32BufferAttribute(clr, 3))
  g.setAttribute("aSide", new THREE.Float32BufferAttribute(sideA, 3))
  g.setAttribute("aPhase", new THREE.Float32BufferAttribute(phaseA, 1))
  g.setAttribute("aAmp", new THREE.Float32BufferAttribute(ampA, 1))
  g.setIndex(idx)
  g.computeBoundingSphere()
  return g
}

/**
 * Soft contact shadows where things touch the grass: ladder feet and tops, a snake's head and
 * the stretches of body resting on a square. One mesh, strength in the vertex alpha.
 */
function contactShadows(): THREE.BufferGeometry {
  const pos: number[] = []
  const uv: number[] = []
  const clr: number[] = []
  const blob = (x: number, y: number, z: number, w: number, d: number, strength: number, yaw = 0) => {
    const ax = V(Math.cos(yaw), 0, -Math.sin(yaw)).multiplyScalar(w / 2)
    const az = V(Math.sin(yaw), 0, Math.cos(yaw)).multiplyScalar(d / 2)
    const c = V(x, y, z)
    const p = [c.clone().sub(ax).add(az), c.clone().add(ax).add(az), c.clone().add(ax).sub(az), c.clone().sub(ax).sub(az)]
    const uvs = [0, 0, 1, 0, 1, 1, 0, 1]
    for (const k of [0, 1, 2, 0, 2, 3]) {
      pos.push(p[k].x, p[k].y, p[k].z)
      uv.push(uvs[k * 2], uvs[k * 2 + 1])
      clr.push(1, 1, 1, strength)
    }
  }
  for (const L of LADDER_SHAPES) {
    const a = L.curve.getPoint(0)
    const b = L.curve.getPoint(1)
    const yaw = Math.atan2(-L.side.z, L.side.x)
    blob(a.x, a.y + 0.008, a.z - 0.02, L.half * 2 + 0.42, 0.36, 0.6, yaw)
    blob(b.x, b.y - 0.022, b.z - 0.1, L.half * 2 + 0.36, 0.3, 0.5, yaw)
  }
  for (const S of SNAKE_SHAPES) {
    const H = tileTop(S.head)
    blob(H.x, H.y + 0.008, H.z - 0.12, 0.62, 0.5, 0.55)
    const len = S.curve.getLength()
    const n = Math.ceil(len / 0.2)
    const p = V(0, 0, 0)
    for (let i = 2; i < n; i++) {
      S.curve.getPointAt(i / n, p)
      const r = S.radius(i / n)
      const g = topNear(p.x, p.z, 0)
      const gap = p.y - r - g
      if (gap > 0.16 || gap < -0.05) continue
      blob(p.x, g + 0.008, p.z, r * 3.4, r * 3.4, 0.45 * (1 - Math.max(0, gap) / 0.16))
    }
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3))
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2))
  g.setAttribute("color", new THREE.Float32BufferAttribute(clr, 4))
  g.computeBoundingSphere()
  return g
}

/* ── The gate and the summit ─────────────────────────────────────────── */

/** One gate door, hinged at x = 0 and opening to +x (mirror for the other). */
function doorGeometry(mirror: boolean): THREE.BufferGeometry {
  const b = new Builder()
  const W = 0.45
  const H = 0.46
  const s = mirror ? -1 : 1
  const planks = 3
  for (let i = 0; i < planks; i++) {
    const x0 = (i * W) / planks + 0.01
    const x1 = ((i + 1) * W) / planks - 0.01
    const top = H - (i === planks - 1 ? 0.05 : i === 0 ? 0 : 0.02)
    const c = [WOOD, shade(WOOD, 1.1), shade(WOOD, 0.92)][i]
    b.geometry(new THREE.BoxGeometry(x1 - x0, top, 0.055), tf(s * (x0 + x1) / 2, top / 2, 0), c)
  }
  for (const y of [0.11, H - 0.12]) b.geometry(new THREE.BoxGeometry(W - 0.02, 0.07, 0.03), tf((s * W) / 2, y, 0.04), WOOD_DARK)
  b.geometry(new THREE.BoxGeometry(0.06, 0.42, 0.03), tf((s * W) / 2, H / 2 - 0.01, 0.045, 0, 0, s * -0.7), WOOD_DARK)
  for (const y of [0.11, H - 0.12]) b.geometry(new THREE.CylinderGeometry(0.03, 0.03, 0.08, 6), tf(s * 0.02, y, 0.035), col("#3a3a3a"))
  return b.build()
}

/** A five-pointed golden star. */
function starGeometry(): THREE.BufferGeometry {
  const shape = new THREE.Shape()
  for (let i = 0; i < 10; i++) {
    const a = Math.PI / 2 + (i / 10) * Math.PI * 2
    const rr = i % 2 === 0 ? 0.3 : 0.13
    if (i === 0) shape.moveTo(Math.cos(a) * rr, Math.sin(a) * rr)
    else shape.lineTo(Math.cos(a) * rr, Math.sin(a) * rr)
  }
  const g = new THREE.ExtrudeGeometry(shape, { depth: 0.08, bevelEnabled: true, bevelThickness: 0.035, bevelSize: 0.03, bevelSegments: 1 })
  g.translate(0, 0, -0.04)
  return g
}

/* ── Water, mist, backdrop ───────────────────────────────────────────── */

/** A vertical water sheet from (x0..x1, yTop) down to yBot at depth z, with a rounded lip on top. */
function waterSheet(pos: number[], uv: number[], x0: number, x1: number, yTop: number, yBot: number, z: number, lip = 0.18) {
  const rows: [number, number, number][] = [
    [yTop + 0.02, z - lip, 0],
    [yTop, z + lip * 0.35, 0.12],
    [yTop - 0.2, z + lip * 0.5, 0.3],
  ]
  const H = yTop - yBot
  rows.push([yBot + H * 0.5, z + lip * 0.55, 0.3 + (H * 0.5) / 1.4])
  rows.push([yBot, z + lip * 0.7, 0.3 + H / 1.4])
  const sx = 3
  for (let i = 0; i < rows.length - 1; i++) {
    for (let j = 0; j < sx; j++) {
      const xa = x0 + ((x1 - x0) * j) / sx
      const xb = x0 + ((x1 - x0) * (j + 1)) / sx
      const ua = j / sx
      const ub = (j + 1) / sx
      const [ya, za, va] = rows[i]
      const [yb, zb, vb] = rows[i + 1]
      // Two triangles, facing +z
      pos.push(xa, ya, za, xa, yb, zb, xb, yb, zb, xa, ya, za, xb, yb, zb, xb, ya, za)
      uv.push(ua, -va, ua, -vb, ub, -vb, ua, -va, ub, -vb, ub, -va)
    }
  }
}

/** Quads that always face the camera (its rotation never changes), for mist and glows. */
export function billboardQuad(pos: number[], uv: number[], c: THREE.Vector3, w: number, h: number, q: THREE.Quaternion) {
  const rx = V(w / 2, 0, 0).applyQuaternion(q)
  const ry = V(0, h / 2, 0).applyQuaternion(q)
  const p = [c.clone().sub(rx).sub(ry), c.clone().add(rx).sub(ry), c.clone().add(rx).add(ry), c.clone().sub(rx).add(ry)]
  const order = [0, 1, 2, 0, 2, 3]
  const uvs = [0, 0, 1, 0, 1, 1, 0, 1]
  for (const k of order) {
    pos.push(p[k].x, p[k].y, p[k].z)
    uv.push(uvs[k * 2], uvs[k * 2 + 1])
  }
}

function geo(pos: number[], uv: number[]): THREE.BufferGeometry {
  const g = new THREE.BufferGeometry()
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3))
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2))
  g.computeVertexNormals()
  g.computeBoundingSphere()
  return g
}

/* ── The scene ───────────────────────────────────────────────────────── */

export interface WorldParts {
  root: THREE.Group
  sun: THREE.DirectionalLight
  swayTime: { value: number }
  falls: THREE.Texture
  pool: THREE.Texture
  foam: THREE.Mesh[]
  mist: THREE.Mesh
  gate: { left: THREE.Object3D; right: THREE.Object3D; lock: THREE.Mesh; lockMat: THREE.MeshLambertMaterial }
  star: THREE.Object3D
  starGlow: THREE.Mesh
  dot: THREE.Texture
}

/** The water and the waterfall's cliff, placed beside the lower terraces (left of rows 1–4). */
export const FALLS = { x0: -3.45, x1: -2.62, top: 4.7, z: -2.05, poolX: -2.95, poolZ: -0.85 }

export function buildWorld(camQuat: THREE.Quaternion, maxAniso: number): WorldParts {
  const root = new THREE.Group()
  const r = rand(20240611)
  const stone = new Builder()
  const leafy = new Builder(true)

  /* Lights: a warm sunlit key from the upper right, a cool sky fill for the shadows */
  const hemi = new THREE.HemisphereLight("#cfeeff", "#2e4a40", 1.05)
  root.add(hemi)
  const sun = new THREE.DirectionalLight("#fff0d0", 2.55)
  sun.position.set(6, 12, 8)
  sun.castShadow = true
  sun.shadow.mapSize.set(1024, 1024)
  sun.shadow.camera.left = -7.5
  sun.shadow.camera.right = 7.5
  sun.shadow.camera.top = 8
  sun.shadow.camera.bottom = -8
  sun.shadow.camera.near = 1
  sun.shadow.camera.far = 45
  sun.shadow.bias = -0.0006
  sun.shadow.normalBias = 0.02
  sun.shadow.radius = 3
  root.add(sun)
  root.add(sun.target)

  /* The terraces */
  for (let n = 1; n <= 100; n++) {
    const t = tileTop(n)
    const { row, k } = cellOf(n)
    const r2 = rand(n * 977)
    pillar(stone, t.x, t.z, t.y - 0.2, GROUND_Y - 0.4, 0.44, r2)
    const grass = mix((row + k) % 2 === 0 ? GRASS_A : GRASS_B, r2() < 0.5 ? GRASS_WARM : GRASS_COOL, r2() * 0.4)
    const top = n === 100 ? GOLD : shade(grass, 0.97 + r2() * 0.06)
    slab(stone, t.x, t.y, t.z, TOP, top, r2)
    // Grass at the back corners, out of the number's way
    if (r2() < 0.6) tuft(stone, t.x - 0.36, t.y, t.z - 0.36, r2, leafy)
    if (r2() < 0.5) tuft(stone, t.x + 0.36, t.y, t.z - 0.36, r2, leafy)
    // Vines down the front (and the outer sides of the row ends)
    if (r2() < 0.55) vine(leafy, t.x + (r2() - 0.5) * 0.7, t.y - 0.2, t.z + 0.49, 0.35 + r2() * 1.1, V(0, 0, 1), V(1, 0, 0), r2)
    const { col: c } = cellOf(n)
    if ((c === 0 || c === COLS - 1) && r2() < 0.7) {
      const s = c === 0 ? -1 : 1
      vine(leafy, t.x + s * 0.49, t.y - 0.2, t.z + (r2() - 0.3) * 0.6, 0.5 + r2() * 1.2, V(s, 0, 0), V(0, 0, -s), r2)
    }
  }

  /* Ledges beside the rows, with palms, trees and bushes */
  for (let row = 0; row < ROWS; row++) {
    for (const s of [-1, 1]) {
      if (r() > 0.62) continue
      // Keep clear of the gate, the summit and the waterfall's cliff
      if (s < 0 && (row <= 4 || row >= 18)) continue
      const colEnd = s < 0 ? 0 : COLS - 1
      const k = row % 2 === 0 ? colEnd : COLS - 1 - colEnd
      const x = colX(row, colEnd) + s * (1.06 + r() * 0.1)
      const y = tileY(row, k) - 0.25 - r() * 0.35
      const z = rowZ(row) + (r() - 0.5) * 0.2
      const size = 0.82 + r() * 0.2
      pillar(stone, x, z, y - 0.2, GROUND_Y - 0.4, size / 2 - 0.04, r)
      slab(stone, x, y, z, size, shade(GRASS_B, 0.92 + r() * 0.08), r)
      const pick = r()
      if (pick < 0.4) palm(leafy, x + s * 0.1, y, z - 0.1, 1.15 + r() * 0.5, s * 0.35, -0.1, r)
      else if (pick < 0.65) tree(leafy, x, y, z - 0.1, 0.55 + r() * 0.3, r)
      else bush(leafy, x, y, z, 1 + r() * 0.4, r)
      if (r() < 0.6) bigLeaf(leafy, x - s * 0.1, y, z + 0.3, V(s * 0.4, 0, 1), 0.45 + r() * 0.2, LEAF[1])
      if (r() < 0.6) vine(leafy, x + (r() - 0.5) * 0.5, y - 0.2, z + size / 2, 0.6 + r() * 1.3, V(0, 0, 1), V(1, 0, 0), r)
    }
  }

  /* Big tropical leaves sprouting from the row ends */
  for (let row = 0; row < ROWS; row++) {
    for (const s of [-1, 1]) {
      if (r() > 0.45 || (s < 0 && row === 0)) continue
      const colEnd = s < 0 ? 0 : COLS - 1
      const k = row % 2 === 0 ? colEnd : COLS - 1 - colEnd
      const x = colX(row, colEnd) + s * 0.5
      const y = tileY(row, k) - 0.18
      bigLeaf(leafy, x, y, rowZ(row) + 0.35, V(s, -0.2, 0.6), 0.5 + r() * 0.25, LEAF[Math.floor(r() * 3)])
    }
  }

  /* The start: a round platform, the gate's posts and arch */
  {
    const R = 0.98
    const top = ngon(START.x, START.y, START.z, R - 0.07, 12)
    const lip = ngon(START.x, START.y - 0.07, START.z, R, 12)
    const side = ngon(START.x, START.y - 0.22, START.z, R, 12)
    cap(stone, top, UP, shade(GRASS_A, 0.95))
    wall(stone, lip, top, START.x, START.z, BEVEL)
    wall(stone, side, lip, START.x, START.z, GRASS_SIDE)
    const rock = ngon(START.x, GROUND_Y - 0.4, START.z, R * 0.86, 12)
    const rockTop = ngon(START.x, START.y - 0.22, START.z, R * 0.86, 12)
    wall(stone, rock, rockTop, START.x, START.z, (v) => shade(STONES[1], 0.45 + 0.55 * clamp01((v.y - GROUND_Y) / 2)))
    // A stone step up to square 1, under the gate
    const t1 = tileTop(1)
    stone.geometry(new THREE.BoxGeometry(0.9, 0.2, 0.52), tf(GATE.x, t1.y - 0.19, GATE.z - 0.13), STONES[2])
    // Posts
    for (const s of [-1, 1]) {
      const px = GATE.x + s * 0.53
      stone.geometry(new THREE.BoxGeometry(0.16, 0.7, 0.18), tf(px, START.y + 0.34, GATE.z), (_c, n) => shade(STONES[0], n.y > 0.5 ? 1.15 : 1))
      stone.geometry(new THREE.BoxGeometry(0.22, 0.1, 0.24), tf(px, START.y + 0.7, GATE.z), STONES[3])
      stone.geometry(new THREE.ConeGeometry(0.1, 0.18, 4), tf(px, START.y + 0.84, GATE.z, 0, Math.PI / 4), col("#c9a24a"))
    }
    // Lintel with a garland
    stone.geometry(new THREE.BoxGeometry(1.28, 0.12, 0.14), tf(GATE.x, START.y + 0.62, GATE.z + 0.01), WOOD)
    for (let i = 0; i < 7; i++) {
      const x = GATE.x - 0.48 + i * 0.16
      leafy.geometry(new THREE.IcosahedronGeometry(0.06, 0), tf(x, START.y + 0.55 - Math.sin((i / 6) * Math.PI) * 0.05, GATE.z + 0.09), i % 3 === 1 ? col("#ff7eb6") : LEAF[i % 2], { sway: 0.01 })
    }
    bush(leafy, START.x - 0.95, START.y - 0.05, START.z - 0.25, 0.9, r)
    bigLeaf(leafy, START.x + 0.75, START.y - 0.1, START.z + 0.45, V(1, 0, 0.8), 0.5, LEAF[0])
  }

  /* The summit: an arch over square 100 with bunting; the star sits on top */
  const t100 = tileTop(100)
  {
    for (const s of [-1, 1]) {
      const px = t100.x + s * 0.5
      stone.geometry(new THREE.BoxGeometry(0.15, 1.35, 0.17), tf(px, t100.y + 0.6, t100.z - 0.42), (_c, n) => shade(STONES[2], n.y > 0.5 ? 1.15 : 1))
      vine(leafy, px + s * 0.08, t100.y + 1.2, t100.z - 0.4, 0.8, V(s, 0, 0), V(0, 0, -s), r)
    }
    stone.geometry(new THREE.BoxGeometry(1.3, 0.16, 0.22), tf(t100.x, t100.y + 1.32, t100.z - 0.42), STONES[0])
    const flags = ["#ff5a5f", "#ffd60a", "#4cc9f0", "#80ed99", "#f72585", "#ff9f1c"]
    for (let i = 0; i < 8; i++) {
      const x = t100.x - 0.44 + i * 0.125
      const sag = Math.sin((i / 7) * Math.PI) * 0.12
      const y = t100.y + 1.2 - sag
      leafy.triOut(V(x - 0.05, y, t100.z - 0.3), V(x + 0.05, y, t100.z - 0.3), V(x, y - 0.13, t100.z - 0.3), V(0, 0, 1), col(flags[i % flags.length]), 0.02)
    }
    // The rest of the summit: a broad terrace behind the arch
    for (const dx of [-1.1, 0, 1.1, 2.2, 3.3]) {
      const x = t100.x + dx
      pillar(stone, x, t100.z - DEPTH, t100.y + 0.25, GROUND_Y - 0.4, 0.5, r, 3)
      slab(stone, x, t100.y + 0.45, t100.z - DEPTH, 1.08, shade(GRASS_B, 0.95), r)
    }
    palm(leafy, t100.x + 2.3, t100.y + 0.45, t100.z - DEPTH, 1.5, 0.3, -0.1, r)
    tree(leafy, t100.x + 1.15, t100.y + 0.45, t100.z - DEPTH - 0.1, 0.6, r)
    bush(leafy, t100.x - 1.1, t100.y + 0.45, t100.z - DEPTH, 1.2, r)
  }

  /* The waterfall's cliff, its pool and rocks */
  {
    const cx = (FALLS.x0 + FALLS.x1) / 2
    for (const [dx, dz, top, half] of [
      [0, -3.05, FALLS.top - 0.2, 0.95],
      [-1.35, -2.95, FALLS.top - 1.1, 0.8],
      [-0.4, -4.4, FALLS.top + 0.6, 0.95],
      [-1.7, -4.3, FALLS.top - 0.3, 0.8],
    ] as const) {
      pillar(stone, cx + dx, dz, top, GROUND_Y - 0.4, half, r, 6)
      slab(stone, cx + dx, top + 0.2, dz, half * 2 + 0.08, shade(GRASS_B, 0.9 + r() * 0.1), r)
      if (r() < 0.8) bush(leafy, cx + dx + (r() - 0.5) * 0.6, top + 0.2, dz - 0.1, 1.3, r)
      vine(leafy, cx + dx + half * 0.5, top, dz + half + 0.01, 1.2 + r() * 1.5, V(0, 0, 1), V(1, 0, 0), r)
      vine(leafy, cx + dx - half * 0.6, top, dz + half + 0.01, 0.8 + r() * 1.2, V(0, 0, 1), V(1, 0, 0), r)
    }
    palm(leafy, cx - 0.6, FALLS.top + 0.8, -4.2, 1.6, -0.35, 0.2, r)
    // Rocks around the pool
    for (let i = 0; i < 11; i++) {
      const a = (i / 11) * Math.PI * 2
      const x = FALLS.poolX + Math.cos(a) * 1.25
      const z = FALLS.poolZ + Math.sin(a) * 0.9
      if (z < -1.7) continue
      stone.geometry(new THREE.IcosahedronGeometry(0.18 + r() * 0.16, 0), tf(x, GROUND_Y + 0.05, z, r(), r(), r(), 1, 0.7, 1), (_c, n) => shade(STONES[i % 4], 0.8 + Math.max(0, n.y) * 0.3))
    }
    bush(leafy, FALLS.poolX - 1.3, GROUND_Y, FALLS.poolZ + 0.6, 1.4, r)
    bigLeaf(leafy, FALLS.poolX + 0.9, GROUND_Y + 0.1, FALLS.poolZ + 0.9, V(0.5, 0.3, 1), 0.7, LEAF[3])
  }

  /* Ground: the jungle floor, with bushes and ferns around the tower's foot */
  {
    const ring = 26
    const centre = V(0, GROUND_Y, -10)
    for (let i = 0; i < ring; i++) {
      const a0 = (i / ring) * Math.PI * 2
      const a1 = ((i + 1) / ring) * Math.PI * 2
      for (const [r0, r1] of [
        [0, 8],
        [8, 20],
        [20, 70],
      ]) {
        const p = (rr: number, a: number) => V(centre.x + Math.cos(a) * rr, GROUND_Y, centre.z + Math.sin(a) * rr)
        const c = (v: THREE.Vector3) => mix(col("#4f8f4f"), col("#2d6542"), clamp01(v.distanceTo(centre) / 30))
        stone.quadOut(p(r0, a0), p(r1, a0), p(r1, a1), p(r0, a1), UP, (_c, _n, v) => c(v))
      }
    }
    for (let i = 0; i < 26; i++) {
      const x = -6 + r() * 12
      const z = 2.5 - r() * 3.5
      if (Math.abs(x - FALLS.poolX) < 1.5 && Math.abs(z - FALLS.poolZ) < 1.2) continue
      if (Math.abs(x - START.x) < 1.1 && Math.abs(z - START.z) < 1.1) continue
      if (r() < 0.6) bush(leafy, x, GROUND_Y, z, 1 + r() * 0.8, r)
      else bigLeaf(leafy, x, GROUND_Y + 0.05, z, V(r() - 0.5, 0.3, 1), 0.5 + r() * 0.3, LEAF[Math.floor(r() * 4)])
    }
  }

  /* Tall jungle trees flanking the tower: frame the view, drift past as the camera climbs */
  for (let row = -1; row < ROWS + 2; row += 2) {
    for (const s of [-1, 1]) {
      if (r() < 0.25) continue
      const rr = Math.max(0, Math.min(ROWS - 1, row))
      const x = rowShift(rr) + s * (5.1 + r() * 1.6)
      const z = rowZ(row) - 0.5 - r() * 1.5
      const crownY = Math.max(0.5, tileY(rr, 2) - 0.5 + r() * 2)
      tube(leafy, [V(x, GROUND_Y, z), V(x + s * 0.2, (GROUND_Y + crownY) / 2, z), V(x - s * 0.1, crownY, z)], (i) => [0.22, 0.16, 0.12][i], 6, () => col("#5e4630"))
      const g = [col("#2f8a46"), col("#3c9c4c"), col("#2a7a42")]
      blob(leafy, x, crownY + 0.3, z, 1.15, g[0], r, 0.03, 0.7)
      blob(leafy, x - s * 0.9, crownY, z + 0.2, 0.85, g[1], r, 0.03, 0.7)
      blob(leafy, x + s * 0.7, crownY - 0.15, z - 0.3, 0.9, g[2], r, 0.03, 0.7)
    }
  }

  /* Ladders */
  ladders(stone)

  /* The meshes */
  const stoneMat = new THREE.MeshLambertMaterial({ vertexColors: true })
  const stoneMesh = new THREE.Mesh(stone.build(), stoneMat)
  stoneMesh.castShadow = true
  stoneMesh.receiveShadow = true
  root.add(stoneMesh)

  const swayTime = { value: 0 }
  const swayMat = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide })
  swayMat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = swayTime
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nattribute float aSway;\nuniform float uTime;")
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
        float ph = uTime * 1.7 + position.x * 1.3 + position.y * 0.9 + position.z * 1.9;
        transformed.x += sin(ph) * aSway;
        transformed.z += cos(ph * 0.8) * aSway * 0.6;
        transformed.y += sin(ph * 1.3) * aSway * 0.3;`
      )
  }
  swayMat.customProgramCacheKey = () => "jungle-sway"
  const leafyMesh = new THREE.Mesh(leafy.build(), swayMat)
  leafyMesh.castShadow = true
  leafyMesh.receiveShadow = true
  root.add(leafyMesh)

  /* The snakes: their own glossy mesh, slithering gently (the breeze's clock drives it) */
  {
    const m = new THREE.MeshPhongMaterial({ vertexColors: true, shininess: 55, specular: "#5a5a5a" })
    m.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = swayTime
      shader.vertexShader = shader.vertexShader
        .replace("#include <common>", "#include <common>\nattribute vec3 aSide;\nattribute float aPhase;\nattribute float aAmp;\nuniform float uTime;")
        .replace("#include <begin_vertex>", "#include <begin_vertex>\ntransformed += aSide * sin(aPhase - uTime * 2.3) * aAmp;")
    }
    m.customProgramCacheKey = () => "jungle-snake"
    const snakes = new THREE.Mesh(snakeGeometry(), m)
    snakes.castShadow = true
    snakes.receiveShadow = true
    root.add(snakes)
  }

  /* Numbers: one quad per square across the front of its grass, uv'd into the atlas. Drawn
     pulled toward the camera, so a ladder or snake passing over a square never hides its
     number (pieces draw after them, so they still stand in front). */
  {
    const pos: number[] = []
    const uv: number[] = []
    for (let n = 1; n <= 100; n++) {
      const t = tileTop(n)
      const i = n - 1
      const u0 = (i % 10) / 10
      const u1 = u0 + 0.1
      const v1 = 1 - Math.floor(i / 10) / 10
      const v0 = v1 - 0.1
      const w = NUM_W / 2
      const z0 = t.z + NUM_Z + NUM_D / 2
      const z1 = t.z + NUM_Z - NUM_D / 2
      const y = t.y + 0.004
      const BL = [t.x - w, y, z0]
      const BR = [t.x + w, y, z0]
      const TR = [t.x + w, y, z1]
      const TL = [t.x - w, y, z1]
      pos.push(...BL, ...BR, ...TR, ...BL, ...TR, ...TL)
      uv.push(u0, v0, u1, v0, u1, v1, u0, v0, u1, v1, u0, v1)
    }
    const atlas = numberAtlas(maxAniso)
    const m = new THREE.MeshBasicMaterial({ map: atlas, transparent: true, depthWrite: false })
    m.onBeforeCompile = (shader) => {
      shader.vertexShader = shader.vertexShader.replace(
        "#include <project_vertex>",
        `#include <project_vertex>
        mvPosition.xyz *= max(0.0, 1.0 - 2.0 / length(mvPosition.xyz));
        gl_Position = projectionMatrix * mvPosition;`
      )
    }
    m.customProgramCacheKey = () => "jungle-numbers"
    const numbers = new THREE.Mesh(geo(pos, uv), m)
    numbers.renderOrder = 1
    root.add(numbers)
  }

  /* Contact shadows under ladders and snakes */
  const dot = softDot()
  {
    const m = new THREE.MeshBasicMaterial({
      map: dot,
      color: "#082414",
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    })
    const shadows = new THREE.Mesh(contactShadows(), m)
    shadows.renderOrder = 0
    root.add(shadows)
  }

  /* Water: the falls (plus a far one in the haze) and the pool */
  const falls = waterStreaks()
  falls.repeat.set(1, 1)
  const pool = poolRipples()
  pool.repeat.set(2, 2)
  const foam: THREE.Mesh[] = []
  {
    const pos: number[] = []
    const uv: number[] = []
    waterSheet(pos, uv, FALLS.x0, FALLS.x1, FALLS.top, GROUND_Y + 0.02, FALLS.z)
    waterSheet(pos, uv, -10.5, -9.2, 9, GROUND_Y, -16, 0.3)
    waterSheet(pos, uv, 8.8, 9.6, 13, GROUND_Y, -24, 0.3)
    const m = new THREE.MeshBasicMaterial({ map: falls, transparent: true, depthWrite: false, color: "#e6fffd" })
    const sheet = new THREE.Mesh(geo(pos, uv), m)
    sheet.renderOrder = 2
    root.add(sheet)

    const disc = new THREE.CircleGeometry(1, 24)
    disc.rotateX(-Math.PI / 2)
    disc.scale(1.25, 1, 0.95)
    const pm = new THREE.MeshBasicMaterial({ map: pool, color: "#bff6ee", transparent: true, opacity: 0.95, depthWrite: false })
    const water = new THREE.Mesh(disc, pm)
    water.position.set(FALLS.poolX, GROUND_Y + 0.04, FALLS.poolZ)
    water.renderOrder = 2
    root.add(water)

    const foamTex = foamRing()
    const fm = new THREE.MeshBasicMaterial({ map: foamTex, transparent: true, depthWrite: false })
    for (let i = 0; i < 2; i++) {
      const f = new THREE.Mesh(new THREE.PlaneGeometry(1.5 - i * 0.4, 1.0 - i * 0.25), fm)
      f.rotation.x = -Math.PI / 2
      f.position.set((FALLS.x0 + FALLS.x1) / 2, GROUND_Y + 0.07 + i * 0.01, FALLS.z + 0.45)
      f.renderOrder = 3
      root.add(f)
      foam.push(f)
    }
  }

  /* Mist: soft sheets drifting around the tower at every height, plus spray at the falls */
  let mist: THREE.Mesh
  {
    const pos: number[] = []
    const uv: number[] = []
    for (let i = 0; i < 16; i++) {
      const h = i * 1.3 - 1
      const s = i % 2 === 0 ? -1 : 1
      const rr = Math.max(0, Math.min(ROWS - 1, h))
      billboardQuad(pos, uv, V(rowShift(rr) + s * (3.3 + r() * 1.5), h * 0.92 - 1.2 + r(), rowZ(h) - 1.5), 4 + r() * 3, 1.6 + r(), camQuat)
    }
    for (let i = 0; i < 4; i++) {
      billboardQuad(pos, uv, V((FALLS.x0 + FALLS.x1) / 2 + (r() - 0.5) * 0.9, GROUND_Y + 0.25 + r() * 0.4, FALLS.z + 0.4), 0.9 + r() * 0.6, 0.6 + r() * 0.3, camQuat)
    }
    const m = new THREE.MeshBasicMaterial({ map: dot, transparent: true, depthWrite: false, opacity: 0.32, color: "#f2fffb" })
    mist = new THREE.Mesh(geo(pos, uv), m)
    mist.renderOrder = 4
    root.add(mist)
  }

  /* Sun shafts slanting through the canopy, beside and behind the tower */
  {
    const pos: number[] = []
    const uv: number[] = []
    const slant = camQuat.clone().multiply(new THREE.Quaternion().setFromAxisAngle(V(0, 0, 1), -0.42))
    for (let i = 0; i < 12; i++) {
      const h = i * 1.75 - 0.5
      const s = i % 2 === 0 ? 1 : -1
      const rr = Math.max(0, Math.min(ROWS - 1, h))
      billboardQuad(pos, uv, V(rowShift(rr) + s * (4.2 + r() * 2), h * 0.92 - 1.5, rowZ(h) - 3.2), 1.4 + r() * 1.2, 8 + r() * 3, slant)
    }
    const m = new THREE.MeshBasicMaterial({ map: lightShaft(), transparent: true, depthWrite: false, opacity: 0.3, color: "#fff0c0", blending: THREE.AdditiveBlending, fog: false })
    const shafts = new THREE.Mesh(geo(pos, uv), m)
    shafts.renderOrder = 4
    root.add(shafts)
  }

  /* Far jungle: layered canopy silhouettes, each paler and bluer with distance */
  {
    const pos: number[] = []
    const uv: number[] = []
    const clr: number[] = []
    const fog = col(FOG_COLOUR)
    const layers: [number, number, string, number][] = [
      // z, top, colour, haze
      [-31, 6.5, "#2d7a55", 0.3],
      [-40, 4.2, "#3a8a66", 0.5],
      [-52, 2.4, "#4b9a7f", 0.68],
    ]
    layers.forEach(([z, top, hex, haze], band) => {
      const c = mix(col(hex), fog, haze)
      const low = mix(c, fog, 0.45)
      const W = 150
      const y0 = GROUND_Y - 1
      const v0 = 1 - (band + 1) / 3
      const v1 = 1 - band / 3
      const rep = W / 14
      const corners: [number, number, number, number, Colour][] = [
        [-W / 2, y0, 0, v0, low],
        [W / 2, y0, rep, v0, low],
        [W / 2, top, rep, v1, c],
        [-W / 2, top, 0, v1, c],
      ]
      for (const k of [0, 1, 2, 0, 2, 3]) {
        const [x, y, u, v, cc] = corners[k]
        pos.push(x + band * 7, y, z)
        uv.push(u, v)
        clr.push(cc.r, cc.g, cc.b)
      }
    })
    const g = geo(pos, uv)
    g.setAttribute("color", new THREE.Float32BufferAttribute(clr, 3))
    const m = new THREE.MeshBasicMaterial({ map: canopyBands(), vertexColors: true, alphaTest: 0.5, fog: false })
    root.add(new THREE.Mesh(g, m))
  }

  /* Backdrop: hazy layers of jungle and mountains, unlit and pre-tinted toward the fog */
  {
    const back = new Builder()
    const fog = col(FOG_COLOUR)
    const tint = (hex: string, t: number) => mix(col(hex), fog, t)
    // A canopy sea below and around the tower
    for (let i = 0; i < 70; i++) {
      const x = (r() - 0.5) * 70
      const z = -6 - r() * 50
      const towerRow = Math.max(0, Math.min(ROWS - 1, -z / DEPTH))
      if (Math.abs(x - rowShift(towerRow)) < 6.5 && z > -26) continue
      const s = 1.8 + r() * 2.5
      const far = clamp01((-z - 10) / 45)
      back.geometry(new THREE.DodecahedronGeometry(s, 0), tf(x, GROUND_Y + s * 0.3, z, r(), r(), 0, 1, 0.75, 1), (_c, n) => shade(tint(["#2f7d4f", "#3d8f55", "#2a6e48"][i % 3], 0.25 + far * 0.5), 0.85 + Math.max(0, n.y) * 0.25))
    }
    // Mountains far behind, in three paler layers
    for (let i = 0; i < 16; i++) {
      const layer = i % 3
      const x = (r() - 0.5) * (90 + layer * 40)
      const z = -48 - layer * 22 - r() * 8
      const h = 16 + r() * 18 + layer * 8
      const rad = 9 + r() * 8 + layer * 4
      const c = tint(["#3f8f74", "#4e9e86", "#5aa892"][layer], 0.35 + layer * 0.2)
      back.geometry(new THREE.ConeGeometry(rad, h, 7, 2), tf(x, GROUND_Y + h / 2 - 2, z, 0, r() * 3), (_c, n) => shade(c, 0.9 + n.x * 0.08 + Math.max(0, n.y) * 0.1))
    }
    const m = new THREE.MeshBasicMaterial({ vertexColors: true, fog: false })
    root.add(new THREE.Mesh(back.build(), m))
  }

  /* The gate's doors and lock */
  const doorMat = stoneMat
  const left = new THREE.Group()
  left.position.set(GATE.x - 0.46, START.y + 0.01, GATE.z)
  const ld = new THREE.Mesh(doorGeometry(false), doorMat)
  ld.castShadow = true
  left.add(ld)
  const right = new THREE.Group()
  right.position.set(GATE.x + 0.46, START.y + 0.01, GATE.z)
  const rd = new THREE.Mesh(doorGeometry(true), doorMat)
  rd.castShadow = true
  right.add(rd)
  const lockMat = new THREE.MeshLambertMaterial({ color: "#f2c94c", emissive: "#000000" })
  const lock = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.12, 0.06), lockMat)
  lock.position.set(-0.43, 0.24, 0.06)
  right.add(lock)
  root.add(left, right)

  /* The star over the summit */
  const starMat = new THREE.MeshLambertMaterial({ color: "#ffd23f", emissive: "#a86b00", flatShading: true })
  const star = new THREE.Mesh(starGeometry(), starMat)
  star.position.set(t100.x, t100.y + 1.72, t100.z - 0.42)
  root.add(star)
  const glowMat = new THREE.MeshBasicMaterial({ map: dot, color: "#fff1a8", transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.7 })
  const starGlow = new THREE.Mesh(new THREE.PlaneGeometry(2.1, 2.1), glowMat)
  starGlow.quaternion.copy(camQuat)
  starGlow.position.copy(star.position)
  starGlow.renderOrder = 5
  root.add(starGlow)

  /* The canopy right under the tower (instanced): lit, so it reads as near */
  {
    const COUNT = 60
    const g = new THREE.IcosahedronGeometry(1, 1)
    const m = new THREE.MeshLambertMaterial({ flatShading: true })
    const inst = new THREE.InstancedMesh(g, m, COUNT)
    const mtx = new THREE.Matrix4()
    let k = 0
    for (let tries = 0; k < COUNT && tries < 600; tries++) {
      const x = (r() - 0.5) * 22
      const z = 3 - r() * 26
      const towerRow = Math.max(0, Math.min(ROWS - 1, -z / DEPTH))
      if (Math.abs(x - rowShift(towerRow)) < 4.3) continue
      if (Math.abs(x - FALLS.poolX) < 2.2 && z > -5) continue
      if (z > 0 && Math.abs(x) < 7) continue
      const s = 0.9 + r() * 1.3
      mtx.compose(V(x, GROUND_Y + s * 0.25, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(r(), r(), 0)), V(s, s * 0.8, s))
      inst.setMatrixAt(k, mtx)
      inst.setColorAt(k, ["#3a9a4e", "#2f8746", "#47a852", "#2a7a40"].map(col)[k % 4])
      k++
    }
    inst.count = k
    inst.receiveShadow = true
    root.add(inst)
  }

  return { root, sun, swayTime, falls, pool, foam, mist, gate: { left, right, lock, lockMat }, star, starGlow, dot }
}
