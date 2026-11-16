import * as THREE from "three"

/**
 * Collects triangles into one merged, vertex-coloured BufferGeometry — so a
 * whole category of the scene (all the stone, all the foliage) is a single
 * draw call. Normals are flat per triangle (the low-poly look) unless a
 * geometry asks to keep its smooth ones. An optional `aSway` weight per
 * vertex drives the breeze in the sway material's vertex shader.
 */

export type Colour = THREE.Color
/** Per-vertex colour from the triangle's centroid, the (world) normal and the vertex itself. */
export type ColourFn = (centroid: THREE.Vector3, normal: THREE.Vector3, vertex: THREE.Vector3) => Colour
export type SwayFn = (vertex: THREE.Vector3) => number

const A = new THREE.Vector3()
const B = new THREE.Vector3()
const C = new THREE.Vector3()
const N = new THREE.Vector3()
const CEN = new THREE.Vector3()
const AB = new THREE.Vector3()
const AC = new THREE.Vector3()
const NM = new THREE.Matrix3()

export const col = (hex: string | number) => new THREE.Color(hex)
/** `c` multiplied by f (darker < 1 < lighter). */
export const shade = (c: Colour, f: number) => c.clone().multiplyScalar(f)
export const mix = (a: Colour, b: Colour, t: number) => a.clone().lerp(b, t)

export class Builder {
  private p: number[] = []
  private n: number[] = []
  private c: number[] = []
  private s: number[] = []

  constructor(private readonly withSway = false) {}

  private push(v: THREE.Vector3, nrm: THREE.Vector3, colour: Colour, sway: number) {
    this.p.push(v.x, v.y, v.z)
    this.n.push(nrm.x, nrm.y, nrm.z)
    this.c.push(colour.r, colour.g, colour.b)
    if (this.withSway) this.s.push(sway)
  }

  /** One triangle (counter-clockwise from the visible side). */
  tri(a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3, colour: Colour | ColourFn, sway: number | SwayFn = 0) {
    AB.subVectors(b, a)
    AC.subVectors(c, a)
    N.crossVectors(AB, AC)
    if (N.lengthSq() < 1e-14) return
    N.normalize()
    CEN.copy(a).add(b).add(c).multiplyScalar(1 / 3)
    for (const v of [a, b, c]) {
      const k = typeof colour === "function" ? colour(CEN, N, v) : colour
      this.push(v, N, k, typeof sway === "function" ? sway(v) : sway)
    }
  }

  /** A quad a-b-c-d (counter-clockwise from the visible side). */
  quad(a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3, d: THREE.Vector3, colour: Colour | ColourFn, sway: number | SwayFn = 0) {
    this.tri(a, b, c, colour, sway)
    this.tri(a, c, d, colour, sway)
  }

  /** A triangle that faces `out` whichever way its corners were listed. */
  triOut(a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3, out: THREE.Vector3, colour: Colour | ColourFn, sway: number | SwayFn = 0) {
    AB.subVectors(b, a)
    AC.subVectors(c, a)
    if (N.crossVectors(AB, AC).dot(out) < 0) this.tri(a, c, b, colour, sway)
    else this.tri(a, b, c, colour, sway)
  }

  /** A quad (corners in order around it) that faces `out`. */
  quadOut(a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3, d: THREE.Vector3, out: THREE.Vector3, colour: Colour | ColourFn, sway: number | SwayFn = 0) {
    this.triOut(a, b, c, out, colour, sway)
    this.triOut(a, c, d, out, colour, sway)
  }

  /**
   * A three.js geometry, transformed by `m`. Flat-shaded unless `smooth`.
   * `cull` drops triangles whose world normal it rejects (faces never seen).
   */
  geometry(
    geo: THREE.BufferGeometry,
    m: THREE.Matrix4,
    colour: Colour | ColourFn,
    opts: { smooth?: boolean; sway?: number | SwayFn; cull?: (n: THREE.Vector3) => boolean } = {}
  ) {
    const g = geo.index ? geo.toNonIndexed() : geo
    const pos = g.getAttribute("position")
    const nor = g.getAttribute("normal")
    NM.getNormalMatrix(m)
    const sway = opts.sway ?? 0
    const vn = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()]
    for (let i = 0; i < pos.count; i += 3) {
      A.fromBufferAttribute(pos, i).applyMatrix4(m)
      B.fromBufferAttribute(pos, i + 1).applyMatrix4(m)
      C.fromBufferAttribute(pos, i + 2).applyMatrix4(m)
      AB.subVectors(B, A)
      AC.subVectors(C, A)
      N.crossVectors(AB, AC)
      if (N.lengthSq() < 1e-14) continue
      N.normalize()
      if (opts.cull && opts.cull(N)) continue
      CEN.copy(A).add(B).add(C).multiplyScalar(1 / 3)
      const verts = [A, B, C]
      for (let j = 0; j < 3; j++) {
        const v = verts[j]
        let nrm = N
        if (opts.smooth && nor) nrm = vn[j].fromBufferAttribute(nor, i + j).applyMatrix3(NM).normalize()
        const k = typeof colour === "function" ? colour(CEN, N, v) : colour
        this.push(v, nrm, k, typeof sway === "function" ? sway(v) : sway)
      }
    }
    if (g !== geo) g.dispose()
    geo.dispose()
  }

  build(): THREE.BufferGeometry {
    const g = new THREE.BufferGeometry()
    g.setAttribute("position", new THREE.Float32BufferAttribute(this.p, 3))
    g.setAttribute("normal", new THREE.Float32BufferAttribute(this.n, 3))
    g.setAttribute("color", new THREE.Float32BufferAttribute(this.c, 3))
    if (this.withSway) g.setAttribute("aSway", new THREE.Float32BufferAttribute(this.s, 1))
    g.computeBoundingSphere()
    g.computeBoundingBox()
    return g
  }
}

/** A transform: position, (Euler) rotation and scale. */
export function tf(
  x: number,
  y: number,
  z: number,
  rx = 0,
  ry = 0,
  rz = 0,
  sx = 1,
  sy = sx,
  sz = sx
): THREE.Matrix4 {
  return new THREE.Matrix4().compose(
    new THREE.Vector3(x, y, z),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)),
    new THREE.Vector3(sx, sy, sz)
  )
}

/** A matrix that puts a +Y-aligned unit primitive from `a` to `b` (for cylinders and rungs). */
export function between(a: THREE.Vector3, b: THREE.Vector3, radiusScale = 1): THREE.Matrix4 {
  const dir = new THREE.Vector3().subVectors(b, a)
  const len = dir.length()
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize())
  const mid = new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5)
  return new THREE.Matrix4().compose(mid, q, new THREE.Vector3(radiusScale, len, radiusScale))
}

/**
 * A tube along `pts` with a radius per point, `radial` sides; colour by
 * (ring index, side index, outward normal). Used for snakes, rails, trunks.
 */
export function tube(
  b: Builder,
  pts: THREE.Vector3[],
  radius: (i: number) => number,
  radial: number,
  colour: (i: number, j: number, n: THREE.Vector3) => Colour,
  sway: number | ((i: number) => number) = 0
) {
  const rings: THREE.Vector3[][] = []
  const norms: THREE.Vector3[][] = []
  // Parallel-transport frames (no sudden twists)
  let up = new THREE.Vector3(0, 1, 0)
  const tan = new THREE.Vector3()
  for (let i = 0; i < pts.length; i++) {
    const prev = pts[Math.max(0, i - 1)]
    const next = pts[Math.min(pts.length - 1, i + 1)]
    tan.subVectors(next, prev).normalize()
    if (Math.abs(tan.dot(up)) > 0.98) up = new THREE.Vector3(1, 0, 0)
    const side = new THREE.Vector3().crossVectors(tan, up).normalize()
    const nUp = new THREE.Vector3().crossVectors(side, tan).normalize()
    up = nUp.clone()
    const r = radius(i)
    const ring: THREE.Vector3[] = []
    const ns: THREE.Vector3[] = []
    for (let j = 0; j < radial; j++) {
      const a = (j / radial) * Math.PI * 2
      const n = nUp.clone().multiplyScalar(Math.cos(a)).addScaledVector(side, Math.sin(a))
      ns.push(n)
      ring.push(pts[i].clone().addScaledVector(n, r))
    }
    rings.push(ring)
    norms.push(ns)
  }
  for (let i = 0; i < pts.length - 1; i++) {
    const s0 = typeof sway === "function" ? sway(i) : sway
    const s1 = typeof sway === "function" ? sway(i + 1) : sway
    for (let j = 0; j < radial; j++) {
      const j2 = (j + 1) % radial
      const n = norms[i][j].clone().add(norms[i][j2]).normalize()
      const k = colour(i, j, n)
      const sw = (v: THREE.Vector3) => (v === rings[i][j] || v === rings[i][j2] ? s0 : s1)
      b.quad(rings[i][j], rings[i][j2], rings[i + 1][j2], rings[i + 1][j], k, sw)
    }
  }
}
