import * as THREE from "three"

import type { SnakesColour } from "@/lib/live/snakes"
import { SHADES } from "../ludo/ludo-board"
import { Builder, col, shade, tf, type Colour } from "./builder"

/**
 * A little explorer in the player's colour: a round body, a big head with a
 * pith helmet, button eyes and rosy cheeks, a dark cartoon outline and a
 * warm rim of light so they pop off the grass. Feet at y = 0, facing +z.
 *
 *   root  (where on the board)
 *   ├─ shadow  (a soft blob on the ground)
 *   ├─ ring    (your own piece: a glowing ring underfoot)
 *   ├─ hop     (jumps, squash and stretch, vanishing)
 *   │   └─ bob (the idle bounce)
 *   │       └─ turn (which way they face) → body
 *   └─ marker  (your own piece: a bobbing arrow overhead)
 */
export interface Piece {
  root: THREE.Group
  hop: THREE.Group
  bob: THREE.Group
  turn: THREE.Group
  shadow: THREE.Mesh
  shadowMat: THREE.MeshBasicMaterial
  marker: THREE.Group | null
  ring: THREE.Mesh | null
  material: THREE.MeshLambertMaterial
  /** Seat index: its spot on a shared square, the phase of its idle bounce. */
  slot: number
  dim: boolean
}

/** How big the explorers are drawn. */
const SCALE = 1.38
/** Where the "you" arrow floats (it bobs around this height). */
export const MARKER_Y = 1.2
/** Pieces draw after the board's numbers (which are lifted over ladders and snakes, not over pieces). */
export const PIECE_ORDER = 6

const SKIN = col("#ffd6ad")
const CHEEK = col("#ff9a9a")
const EYE = col("#1d1b22")
const WHITE = col("#ffffff")

const charCache = new Map<SnakesColour, THREE.BufferGeometry>()

const V = new THREE.Vector3()
const W = new THREE.Vector3()
const X = new THREE.Vector3()
const NM = new THREE.Matrix3()

/**
 * An inverted hull: the shape pushed out along its (smooth) normals and turned inside out, so
 * only its rim shows behind the real one — a cartoon outline with no extra draw call.
 */
function hull(b: Builder, geo: THREE.BufferGeometry, m: THREE.Matrix4, width: number, colour: Colour) {
  const g = geo.index ? geo.toNonIndexed() : geo
  const pos = g.getAttribute("position")
  const nor = g.getAttribute("normal")
  NM.getNormalMatrix(m)
  const out = (i: number, v: THREE.Vector3) => {
    v.fromBufferAttribute(pos, i).applyMatrix4(m)
    const n = new THREE.Vector3().fromBufferAttribute(nor, i).applyMatrix3(NM).normalize()
    return v.addScaledVector(n, width)
  }
  for (let i = 0; i < pos.count; i += 3) b.tri(out(i, V).clone(), out(i + 2, X).clone(), out(i + 1, W).clone(), colour)
  if (g !== geo) g.dispose()
  geo.dispose()
}

function bodyGeometry(colour: SnakesColour): THREE.BufferGeometry {
  const hit = charCache.get(colour)
  if (hit) return hit
  const s = SHADES[colour]
  const mid = col(s.mid)
  const dark = col(s.dark)
  const light = col(s.light)
  const ink = shade(dark, 0.32)
  const b = new Builder()
  const sm = { smooth: true }
  const OUT = 0.016
  // The head tips back a little so the face reads from the camera up above
  const neck = new THREE.Matrix4().makeTranslation(0, 0.34, 0).multiply(new THREE.Matrix4().makeRotationX(-0.38)).multiply(new THREE.Matrix4().makeTranslation(0, -0.34, 0))
  const hd = (m: THREE.Matrix4) => neck.clone().multiply(m)
  // Outlines first (body, head, helmet, feet, arms)
  hull(b, new THREE.SphereGeometry(1, 10, 7), tf(0, 0.2, 0, 0, 0, 0, 0.165, 0.18, 0.15), OUT, ink)
  hull(b, new THREE.SphereGeometry(1, 12, 8), hd(tf(0, 0.47, 0.01, 0, 0, 0, 0.2, 0.19, 0.19)), OUT, ink)
  hull(b, new THREE.CylinderGeometry(0.255, 0.265, 0.025, 14), hd(tf(0, 0.545, 0.0, -0.12, 0, 0)), OUT, ink)
  hull(b, new THREE.SphereGeometry(1, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), hd(tf(0, 0.545, -0.005, -0.12, 0, 0, 0.205, 0.17, 0.205)), OUT, ink)
  for (const x of [-0.075, 0.075]) hull(b, new THREE.SphereGeometry(1, 7, 5), tf(x, 0.035, 0.03, 0, 0, 0, 0.06, 0.04, 0.08), OUT * 0.8, ink)
  for (const sx of [-1, 1]) hull(b, new THREE.SphereGeometry(1, 7, 5), tf(sx * 0.165, 0.2, 0.02, 0, 0, sx * 0.4, 0.05, 0.08, 0.05), OUT * 0.8, ink)
  // Feet
  for (const x of [-0.075, 0.075]) b.geometry(new THREE.SphereGeometry(1, 8, 6), tf(x, 0.035, 0.03, 0, 0, 0, 0.06, 0.04, 0.08), dark, sm)
  // Body: a little pear, the belly lighter
  b.geometry(new THREE.SphereGeometry(1, 12, 9), tf(0, 0.2, 0, 0, 0, 0, 0.165, 0.18, 0.15), (_c, n) => (n.z > 0.55 && n.y < 0.5 ? light : n.y < -0.6 ? dark : mid), sm)
  // A satchel strap and bag
  b.geometry(new THREE.TorusGeometry(0.163, 0.014, 4, 18), tf(0, 0.22, 0, 0, 0, 0.75, 1, 1, 0.95), col("#7a4f27"))
  b.geometry(new THREE.BoxGeometry(0.1, 0.09, 0.05), tf(0.13, 0.12, 0.08, 0, 0.4, 0), col("#a8743f"))
  // Arms
  for (const sx of [-1, 1]) b.geometry(new THREE.SphereGeometry(1, 8, 6), tf(sx * 0.165, 0.2, 0.02, 0, 0, sx * 0.4, 0.05, 0.08, 0.05), mid, sm)
  // Head
  b.geometry(new THREE.SphereGeometry(1, 14, 11), hd(tf(0, 0.47, 0.01, 0, 0, 0, 0.2, 0.19, 0.19)), SKIN, sm)
  // Eyes with a glint, cheeks, a smile
  for (const sx of [-1, 1]) {
    b.geometry(new THREE.SphereGeometry(1, 8, 6), hd(tf(sx * 0.07, 0.465, 0.175, 0, 0, 0, 0.034, 0.045, 0.02)), EYE, sm)
    b.geometry(new THREE.SphereGeometry(1, 5, 4), hd(tf(sx * 0.07 + 0.01, 0.48, 0.192, 0, 0, 0, 0.012, 0.012, 0.006)), WHITE, sm)
    b.geometry(new THREE.SphereGeometry(1, 8, 5), hd(tf(sx * 0.12, 0.425, 0.15, 0, sx * 0.6, 0, 0.037, 0.023, 0.012)), CHEEK, sm)
  }
  b.geometry(new THREE.TorusGeometry(0.028, 0.007, 4, 10, Math.PI), hd(tf(0, 0.418, 0.186, 0, 0, Math.PI)), col("#8a3b2a"))
  // Pith helmet: dome, band, brim, a little feather in the band
  b.geometry(new THREE.SphereGeometry(1, 14, 7, 0, Math.PI * 2, 0, Math.PI / 2), hd(tf(0, 0.545, -0.005, -0.12, 0, 0, 0.205, 0.17, 0.205)), (_c, n) => (n.y > 0.85 ? light : mid), sm)
  b.geometry(new THREE.CylinderGeometry(0.207, 0.207, 0.035, 16, 1, true), hd(tf(0, 0.56, -0.005, -0.12, 0, 0)), dark)
  b.geometry(new THREE.CylinderGeometry(0.255, 0.265, 0.025, 16), hd(tf(0, 0.545, 0.0, -0.12, 0, 0)), (_c, n) => (n.y > 0.5 ? shade(mid, 1.05) : dark))
  b.geometry(new THREE.SphereGeometry(1, 6, 4), hd(tf(0, 0.73, -0.02, 0, 0, 0, 0.03, 0.02, 0.03)), light, sm)
  b.geometry(new THREE.ConeGeometry(0.03, 0.18, 4), hd(tf(-0.17, 0.66, -0.06, 0.2, 0, 0.45)), col("#fff3c4"))
  const g = b.build()
  charCache.set(colour, g)
  return g
}

/** A warm rim of light around the silhouette (skipped on the dark outline). */
function addRim(m: THREE.MeshLambertMaterial) {
  m.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <opaque_fragment>",
      `float rimMask = step(0.2, max(vColor.r, max(vColor.g, vColor.b)));
      float rim = pow(1.0 - clamp(dot(normalize(normal), normalize(vViewPosition)), 0.0, 1.0), 2.6);
      outgoingLight += vec3(1.0, 0.95, 0.82) * rim * 0.42 * rimMask;
      #include <opaque_fragment>`
    )
  }
  m.customProgramCacheKey = () => "jungle-piece-rim"
}

/** The "you" arrow: a chunky white chevron with a dark rim, always facing the camera. */
function markerGroup(colour: SnakesColour, camQuat: THREE.Quaternion): THREE.Group {
  const g = new THREE.Group()
  const shape = new THREE.Shape()
  shape.moveTo(-0.13, 0.11)
  shape.lineTo(0.13, 0.11)
  shape.lineTo(0, -0.08)
  shape.closePath()
  const inner = new THREE.Mesh(new THREE.ShapeGeometry(shape), new THREE.MeshBasicMaterial({ color: "#ffffff" }))
  const outer = new THREE.Mesh(new THREE.ShapeGeometry(shape), new THREE.MeshBasicMaterial({ color: SHADES[colour].dark }))
  outer.scale.setScalar(1.38)
  outer.position.set(0, 0.014, -0.002)
  // Drawn just before the numbers: on a crowded tower the arrow tucks under the number of the
  // square behind, never over it
  inner.renderOrder = 0.95
  outer.renderOrder = 0.9
  for (const m of [inner, outer]) {
    const mat = m.material as THREE.MeshBasicMaterial
    mat.depthTest = false
    mat.transparent = true
  }
  g.add(outer, inner)
  g.quaternion.copy(camQuat)
  g.position.y = MARKER_Y
  return g
}

export function makePiece(colour: SnakesColour, slot: number, isMe: boolean, dot: THREE.Texture, camQuat: THREE.Quaternion): Piece {
  const root = new THREE.Group()
  const hop = new THREE.Group()
  const bob = new THREE.Group()
  const turn = new THREE.Group()
  // Transparent only to be drawn after the numbers; fully opaque unless dimmed
  const material = new THREE.MeshLambertMaterial({ vertexColors: true, transparent: true })
  addRim(material)
  const body = new THREE.Mesh(bodyGeometry(colour), material)
  body.scale.setScalar(SCALE)
  body.renderOrder = PIECE_ORDER
  turn.add(body)
  bob.add(turn)
  hop.add(bob)
  const shadowMat = new THREE.MeshBasicMaterial({ map: dot, color: "#06180d", transparent: true, opacity: 0.5, depthWrite: false })
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(0.78, 0.62), shadowMat)
  shadow.rotation.x = -Math.PI / 2
  shadow.position.y = 0.012
  shadow.renderOrder = 0
  root.add(shadow, hop)
  let marker: THREE.Group | null = null
  let ring: THREE.Mesh | null = null
  if (isMe) {
    marker = markerGroup(colour, camQuat)
    root.add(marker)
    ring = new THREE.Mesh(
      new THREE.RingGeometry(0.3, 0.38, 32),
      new THREE.MeshBasicMaterial({ color: SHADES[colour].light, transparent: true, opacity: 0.85, depthWrite: false })
    )
    ring.rotation.x = -Math.PI / 2
    ring.position.y = 0.015
    ring.renderOrder = 0
    root.add(ring)
  }
  return { root, hop, bob, turn, shadow, shadowMat, marker, ring, material, slot, dim: false }
}

export function setDim(p: Piece, dim: boolean) {
  if (p.dim === dim) return
  p.dim = dim
  p.material.opacity = dim ? 0.35 : 1
  p.material.depthWrite = !dim
  p.shadowMat.opacity = dim ? 0.2 : 0.5
}

export function disposePiece(p: Piece) {
  p.material.dispose()
  p.shadowMat.dispose()
  p.root.traverse((o) => {
    if (o instanceof THREE.Mesh && !charCacheHas(o.geometry)) {
      o.geometry.dispose()
      if (o !== p.shadow && o.material !== p.material) (o.material as THREE.Material).dispose()
    }
  })
}

const charCacheHas = (g: THREE.BufferGeometry) => Array.from(charCache.values()).includes(g)

/** Free the shared body geometries (when the last board unmounts). */
export function disposeCharacterCache() {
  charCache.forEach((g) => g.dispose())
  charCache.clear()
}
