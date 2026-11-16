import * as THREE from "three"

import { GATE_LADDERS, SNAKES } from "@/lib/live/snakes"

/**
 * The jungle tower's layout, in world units (y up, the camera looks from +z).
 *
 * A switchback trail: 20 terraces of 5 stone pillars each, every terrace one
 * step back and one step up from the one in front. Along a terrace the
 * pillars climb a little (so each row is a ramp and the turns are short
 * steps), and the terraces sway left and right as they climb, so the trail
 * winds up the mountain. Square 1 is at the front, 100 at the summit.
 */

export const COLS = 5
export const ROWS = 20
/** Centre-to-centre distance of neighbouring pillars along a terrace. */
export const SPACING = 1.08
/** Size of a pillar's grass top. */
export const TOP = 0.98
/** How far each terrace sits behind the one in front. */
export const DEPTH = 1.14
/** How much higher each terrace starts than the one in front. */
export const RISE = 0.92
/** How much each pillar along a terrace climbs over the previous one. */
export const RAMP = 0.12
/** The ground the tower stands on. */
export const GROUND_Y = -1.7

/** The terraces sway sideways as they climb (r may be fractional, for the camera). */
export const rowShift = (r: number) => 1.15 * Math.sin(r * 0.47 + 0.4)

export interface Cell {
  row: number
  /** Index along the trail within the row. */
  k: number
  /** Column, left (0) to right (4). */
  col: number
}

export function cellOf(n: number): Cell {
  const i = Math.max(1, Math.min(100, n)) - 1
  const row = Math.floor(i / COLS)
  const k = i % COLS
  return { row, k, col: row % 2 === 0 ? k : COLS - 1 - k }
}

export const colX = (row: number, col: number) => rowShift(row) + (col - (COLS - 1) / 2) * SPACING
export const tileY = (row: number, k: number) => row * RISE + k * RAMP
export const rowZ = (row: number) => -row * DEPTH

/** Centre of square `n`'s grass top. */
export function tileTop(n: number, out = new THREE.Vector3()): THREE.Vector3 {
  const { row, k, col } = cellOf(n)
  return out.set(colX(row, col), tileY(row, k), rowZ(row))
}

/** The start platform in front of square 1, behind the gate. */
export const START = (() => {
  const t = tileTop(1)
  return new THREE.Vector3(t.x, t.y - 0.34, t.z + 1.95)
})()
/** The gate, between the start platform and square 1. */
export const GATE = (() => {
  const t = tileTop(1)
  return new THREE.Vector3(t.x, t.y - 0.02, t.z + 0.86)
})()

/**
 * A square's number is painted across the front of its grass top (centre `NUM_Z` toward the
 * camera, `NUM_W` × `NUM_D`); pieces stand on the back half, ladders start behind it and snakes
 * rest behind it, so it always shows.
 */
export const NUM_Z = 0.215
export const NUM_W = 0.8
export const NUM_D = 0.54

/** Each seat's own patch of a square (x right, z toward the camera), behind the number, so pieces sharing one stay visible. */
export const SLOTS: [number, number][] = [
  [0, -0.17],
  [-0.27, -0.22],
  [0.27, -0.22],
  [-0.14, -0.35],
  [0.14, -0.35],
]
/** On the round start platform there's more room. */
const START_SLOTS: [number, number][] = [
  [0, 0.05],
  [-0.4, -0.12],
  [0.4, -0.12],
  [-0.3, 0.32],
  [0.3, 0.32],
]

/** Where seat `slot` stands on square `pos` (0 = the start platform). */
export function standOf(pos: number, slot: number, out = new THREE.Vector3()): THREE.Vector3 {
  if (pos <= 0) {
    const s = START_SLOTS[slot % START_SLOTS.length]
    return out.set(START.x + s[0], START.y, START.z + s[1])
  }
  tileTop(pos, out)
  const s = SLOTS[slot % SLOTS.length]
  return out.set(out.x + s[0], out.y, out.z + s[1])
}

/** The trail's centre line at (fractional) row `h`: what the camera looks at. */
export function axisAt(h: number, out = new THREE.Vector3()): THREE.Vector3 {
  return out.set(rowShift(h) * 0.85, h * RISE + RAMP * 2, -h * DEPTH)
}
/** The row a world point belongs to (fractional). */
export const rowOfZ = (z: number) => -z / DEPTH

/** x of a lane at (fractional) row r: lanes 0…4 are the columns, 0.5 the gap between columns 0 and 1, -0.5 the tower's left edge… */
export const laneX = (r: number, lane: number) => rowShift(r) + (lane - (COLS - 1) / 2) * SPACING

/** The top of the grass within `pad` of (x, z): a square's slab, else the jungle floor. */
export function topNear(x: number, z: number, pad = 0): number {
  const r0 = Math.round(-z / DEPTH)
  let best = GROUND_Y
  for (let row = r0 - 1; row <= r0 + 1; row++) {
    if (row < 0 || row >= ROWS || Math.abs(z - rowZ(row)) > TOP / 2 + pad) continue
    const c0 = Math.round((x - rowShift(row)) / SPACING + (COLS - 1) / 2)
    for (let col = c0 - 1; col <= c0 + 1; col++) {
      if (col < 0 || col >= COLS || Math.abs(x - colX(row, col)) > TOP / 2 + pad) continue
      best = Math.max(best, tileY(row, row % 2 === 0 ? col : COLS - 1 - col))
    }
  }
  return best
}

/** A coarse height field over the tower: the tops of the snakes and ladders placed so far (what the next one must clear). */
class Heights {
  private readonly x0 = -6
  private readonly z0 = -24
  private readonly cell = 0.06
  private readonly nx = Math.ceil(12 / 0.06)
  private readonly nz = Math.ceil(27 / 0.06)
  private readonly data = new Float32Array(this.nx * this.nz).fill(-1e9)

  /** Everything within `rad` of (x, z) is at least `top` high. */
  stamp(x: number, z: number, rad: number, top: number) {
    const i0 = Math.max(0, Math.floor((x - rad - this.x0) / this.cell))
    const i1 = Math.min(this.nx - 1, Math.ceil((x + rad - this.x0) / this.cell))
    const j0 = Math.max(0, Math.floor((z - rad - this.z0) / this.cell))
    const j1 = Math.min(this.nz - 1, Math.ceil((z + rad - this.z0) / this.cell))
    for (let j = j0; j <= j1; j++) {
      for (let i = i0; i <= i1; i++) {
        const dx = this.x0 + (i + 0.5) * this.cell - x
        const dz = this.z0 + (j + 0.5) * this.cell - z
        if (dx * dx + dz * dz > rad * rad) continue
        const k = j * this.nx + i
        if (top > this.data[k]) this.data[k] = top
      }
    }
  }

  at(x: number, z: number): number {
    const i = Math.floor((x - this.x0) / this.cell)
    const j = Math.floor((z - this.z0) / this.cell)
    if (i < 0 || j < 0 || i >= this.nx || j >= this.nz) return -1e9
    return this.data[j * this.nx + i]
  }
}

/* ── Ladders and snakes, derived from the engine's maps ─────────────── */

export const LADDER_LIST = Object.entries(GATE_LADDERS).map(([f, t]) => ({ foot: Number(f), top: t }))
export const SNAKE_LIST = Object.entries(SNAKES).map(([h, t]) => ({ head: Number(h), tail: t }))

/** Rails half-width (a pair sharing a lane are a little narrower). */
export const LADDER_HALF = 0.19
/** Rail radius. */
export const RAIL_R = 0.052

export interface SnakeShape {
  head: number
  tail: number
  /** Head → tail: the head held up over its square, the body down a gap between the columns, the tail along the front of its square. */
  curve: THREE.CatmullRomCurve3
  /** Body radius at u (0 = the neck, 1 = the tail's tip). */
  radius: (u: number) => number
  index: number
}

/** Body radius along a snake: a slimmer neck, a chunky body, a long taper to the tip. */
export function snakeRadius(len: number): (u: number) => number {
  const neck = Math.min(0.12, 0.35 / len)
  return (u: number) => {
    const n = u < neck ? 0.78 + 0.22 * Math.sin((u / neck) * Math.PI * 0.5) : 1
    const tail = u > 0.4 ? 1 - 0.8 * Math.pow((u - 0.4) / 0.6, 1.25) : 1
    return 0.142 * n * tail
  }
}

/**
 * Each snake runs down one lane (a gap between two columns, or the tower's edge), so it lies on
 * the squares' edges instead of their numbers. Lanes are picked together (every combination of
 * "left or right of the head's column") so two snakes don't share a stretch of the same gap.
 */
const SNAKE_LANES: number[] = (() => {
  type Seg = { r0: number; r1: number; a: number; b: number }
  const segsOf = (head: number, tail: number, lane: number): Seg[] => {
    const h = cellOf(head)
    const t = cellOf(tail)
    return [
      { r0: h.row, r1: h.row, a: h.col - 0.3, b: h.col + 0.3 },
      { r0: t.row, r1: h.row, a: lane, b: lane },
      { r0: t.row, r1: t.row, a: Math.min(t.col, lane), b: Math.max(t.col, lane) },
    ]
  }
  const clash = (p: Seg, q: Seg) => p.r0 <= q.r1 && q.r0 <= p.r1 && p.a - 0.3 < q.b + 0.3 && q.a - 0.3 < p.b + 0.3
  const n = SNAKE_LIST.length
  let best: number[] = []
  let bestScore = Infinity
  for (let m = 0; m < 1 << n; m++) {
    const lanes = SNAKE_LIST.map(({ head }, i) => cellOf(head).col + ((m >> i) & 1 ? 0.5 : -0.5))
    const segs = SNAKE_LIST.map(({ head, tail }, i) => segsOf(head, tail, lanes[i]))
    let score = 0
    for (let i = 0; i < n; i++) {
      score += 0.3 * Math.abs(lanes[i] - cellOf(SNAKE_LIST[i].tail).col)
      for (let j = i + 1; j < n; j++) for (const p of segs[i]) for (const q of segs[j]) if (clash(p, q)) score += 10
    }
    if (score < bestScore) {
      bestScore = score
      best = lanes
    }
  }
  return best
})()

const heights = new Heights()

function buildSnake(head: number, tail: number, lane: number, index: number): SnakeShape {
  const h = cellOf(head)
  const t = cellOf(tail)
  const H = tileTop(head)
  const T = tileTop(tail)
  const toLane = Math.sign(lane - h.col)
  // Control points with a pinned height (head, neck, the tail along the front of its square) or
  // NaN (drape over whatever is underneath)
  const raw: { p: THREE.Vector3; pin: number }[] = []
  const add = (x: number, z: number, pin = NaN) => raw.push({ p: new THREE.Vector3(x, 0, z), pin })
  add(H.x, H.z - 0.08, H.y + 0.5)
  add(H.x + toLane * 0.06, H.z - 0.2, H.y + 0.4)
  add(H.x + toLane * 0.2, H.z - 0.27, H.y + 0.27)
  // Down the lane, from behind the head's square to the front of the tail's, wiggling gently
  const zA = rowZ(h.row) - 0.22
  const zB = rowZ(t.row) + 0.36
  const steps = Math.max(4, Math.round((zB - zA) / 0.11))
  const wig = (index % 2 === 0 ? 1 : -1) * 0.075
  for (let i = 0; i <= steps; i++) {
    const u = i / steps
    const z = zA + (zB - zA) * u
    const s = (zA - z) / 1.5
    const env = Math.sin(Math.PI * u)
    add(laneX(-z / DEPTH, lane) + Math.sin(s * Math.PI * 2) * wig * env, z)
  }
  // Along the front of the tail's row, just under the grass, then the tip curls up onto the square's lip
  const zF = rowZ(t.row) + TOP / 2 + 0.11
  const dir = Math.sign(t.col - lane) || 1
  const lipY = (x: number) => topNear(x, rowZ(t.row), 0.12) - 0.07
  const xL = laneX(t.row, lane)
  const xT = colX(t.row, t.col)
  const along = Math.max(1, Math.round(Math.abs(xT - xL) / 0.12))
  for (let i = 0; i <= along; i++) {
    const x = xL + ((xT - xL) * i) / along
    add(x, zF, lipY(x))
  }
  add(xT + dir * 0.14, zF - 0.03, T.y - 0.03)
  add(xT + dir * 0.24, rowZ(t.row) + TOP / 2 - 0.02, T.y + 0.04)

  // xz: round the corners off
  const pts = raw.map((r) => r.p)
  for (let pass = 0; pass < 3; pass++) {
    const copy = pts.map((p) => p.clone())
    for (let i = 3; i < pts.length - 2; i++) {
      pts[i].x = (copy[i - 1].x + copy[i].x * 2 + copy[i + 1].x) / 4
      pts[i].z = (copy[i - 1].z + copy[i].z * 2 + copy[i + 1].z) / 4
    }
  }
  // Heights: rest on the grass (and over any snake already there), glide from lip to lip
  let len = 0
  for (let i = 1; i < pts.length; i++) len += pts[i].distanceTo(pts[i - 1])
  const rad = snakeRadius(len)
  let acc = 0
  const us = pts.map((p, i) => (i === 0 ? 0 : (acc += p.distanceTo(pts[i - 1])) / len))
  const pinned = (i: number) => !Number.isNaN(raw[i].pin)
  const base = pts.map((p, i) => {
    if (pinned(i)) return raw[i].pin
    const r = rad(us[i])
    return Math.max(topNear(p.x, p.z, r * 0.8) + r * 0.92, heights.at(p.x, p.z) + r)
  })
  // Lie on each step and pour down the riser to the next, rounded off
  const y = base.slice()
  for (let pass = 0; pass < 6; pass++) {
    for (let i = 1; i < pts.length - 1; i++) if (!pinned(i)) y[i] = Math.max(base[i], (y[i - 1] + y[i] * 2 + y[i + 1]) / 4)
  }
  pts.forEach((p, i) => (p.y = y[i]))
  const curve = new THREE.CatmullRomCurve3(pts, false, "centripetal")
  // Leave this body for the next snakes (and the ladders) to clear
  const n = Math.ceil(len / 0.08)
  const q = new THREE.Vector3()
  for (let i = 0; i <= n; i++) {
    const u = i / n
    curve.getPointAt(u, q)
    const r = rad(u)
    heights.stamp(q.x, q.z, r + 0.04, q.y + r)
  }
  return { head, tail, curve, radius: rad, index }
}

/** Shorter snakes first: the long ones arch over them where they cross. */
export const SNAKE_SHAPES: SnakeShape[] = SNAKE_LIST.map((s, i) => ({ ...s, i, span: cellOf(s.head).row - cellOf(s.tail).row }))
  .sort((a, b) => a.span - b.span || a.head - b.head)
  .map(({ head, tail, i }) => buildSnake(head, tail, SNAKE_LANES[i], i))
  .sort((a, b) => a.index - b.index)

export interface LadderShape {
  foot: number
  top: number
  /** Centre line, foot → top. */
  curve: THREE.CubicBezierCurve3
  /** Unit sideways direction (rails at ± half). */
  side: THREE.Vector3
  half: number
  index: number
}

/**
 * A ladder stands on the back of its foot square (behind the number) and rests on the front lip
 * of its top square. It rises steeply off its foot (to clear the next step up), then runs along
 * the steps a hand's breadth above them — the least lean that clears the grass and the snakes
 * and ladders already placed. Two ladders running up the same column stand side by side.
 */
export const LADDER_SHAPES: LadderShape[] = (() => {
  const ends = LADDER_LIST.map(({ foot, top }) => {
    const a = tileTop(foot).add(new THREE.Vector3(0, 0.0, -0.2))
    const b = tileTop(top).add(new THREE.Vector3(0, 0.03, TOP / 2 - 0.04))
    const flat = new THREE.Vector3(b.x - a.x, 0, b.z - a.z)
    const side = new THREE.Vector3(-flat.z, 0, flat.x).normalize()
    if (side.x < 0) side.negate()
    return { foot, top, a, b, side, half: LADDER_HALF }
  })
  // Side by side where two share a lane for a while
  const xAt = (e: (typeof ends)[number], z: number) => e.a.x + ((e.b.x - e.a.x) * (z - e.a.z)) / (e.b.z - e.a.z)
  for (let i = 0; i < ends.length; i++) {
    for (let j = i + 1; j < ends.length; j++) {
      const p = ends[i]
      const q = ends[j]
      const z0 = Math.min(p.a.z, q.a.z)
      const z1 = Math.max(p.b.z, q.b.z)
      let shared = 0
      for (let z = z0; z >= z1; z -= 0.1) if (Math.abs(xAt(p, z) - xAt(q, z)) < 0.5) shared += 0.1
      if (shared < 1.5) continue
      const s = xAt(p, (z0 + z1) / 2) <= xAt(q, (z0 + z1) / 2) ? -1 : 1
      for (const [e, k] of [
        [p, s],
        [q, -s],
      ] as const) {
        e.a.addScaledVector(e.side, k * 0.23)
        e.b.addScaledVector(e.side, k * 0.23)
        e.half = 0.155
      }
    }
  }
  const out = new THREE.Vector3(0, DEPTH, RISE).normalize()
  const order = ends.map((e, i) => ({ e, i, len: e.a.distanceTo(e.b) })).sort((x, y) => x.len - y.len)
  const shapes: LadderShape[] = []
  const p = new THREE.Vector3()
  for (const { e, i, len } of order) {
    const dir = e.b.clone().sub(e.a).normalize()
    const margin = 0.25 / len
    const c1 = new THREE.Vector3()
    const c2 = new THREE.Vector3()
    const make = (rise: number, lift: number) => {
      c1.copy(e.a).add(new THREE.Vector3(0, rise, 0)).addScaledVector(dir, len * 0.12).addScaledVector(out, lift * 0.5)
      c2.copy(e.b).addScaledVector(dir, -len * 0.3).addScaledVector(out, lift)
      return new THREE.CubicBezierCurve3(e.a.clone(), c1.clone(), c2.clone(), e.b.clone())
    }
    const clears = (c: THREE.CubicBezierCurve3) => {
      for (let t = margin; t <= 1 - margin; t += 0.015) {
        c.getPoint(t, p)
        for (const s of [-e.half, e.half]) {
          const x = p.x + e.side.x * s
          const z = p.z + e.side.z * s
          if (p.y < Math.max(topNear(x, z, 0.06), heights.at(x, z)) + RAIL_R + 0.1) return false
        }
      }
      return true
    }
    let curve: THREE.CubicBezierCurve3 | null = null
    for (let lift = 0; lift < 4 && !curve; lift += 0.05) {
      for (let rise = 0; rise <= 1.6 && !curve; rise += 0.1) {
        const c = make(rise, lift)
        if (clears(c)) curve = c
      }
    }
    if (!curve) curve = make(1.6, 4)
    const n = Math.ceil(len / 0.08)
    for (let k = 0; k <= n; k++) {
      curve.getPoint(k / n, p)
      heights.stamp(p.x, p.z, e.half + 0.14, p.y + 0.14)
    }
    shapes[i] = { foot: e.foot, top: e.top, curve, side: e.side, half: e.half, index: i }
  }
  return shapes
})()

/** Simple deterministic noise for scenery placement. */
export function rand(seed: number): () => number {
  let s = seed >>> 0 || 1
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}
