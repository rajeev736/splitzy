import gsap from "gsap"
import * as THREE from "three"

import { portalSwirl } from "./textures"

/**
 * The effects: lightning for ladders, a swirling portal for snakes, sparks
 * that race along a ladder or a snake's body, dust puffs on landing, and
 * confetti at the summit. All hidden until a timeline shows them; each
 * `add…` method schedules its tweens on the caller's GSAP timeline, so a
 * cut-short move cleans up with `reset()`.
 */

const BOLT_SEGS = 9
const CONFETTI = 60
const PUFFS = 8

export class Fx {
  readonly group = new THREE.Group()
  private bolt: THREE.Group
  private boltCore: THREE.Mesh
  private boltGlow: THREE.Mesh
  private flash: THREE.Mesh
  private sparks: THREE.Mesh[] = []
  readonly portal: THREE.Group
  private portalDisc: THREE.Mesh
  private puffs: THREE.Mesh[] = []
  private puffNext = 0
  private confetti: THREE.InstancedMesh
  private burst: THREE.Mesh
  private disposables: { dispose: () => void }[] = []

  constructor(
    dot: THREE.Texture,
    private readonly camQuat: THREE.Quaternion,
    /** The page-level white flash over the board (a DOM element), or null. */
    private readonly screen: HTMLElement | null
  ) {
    const add = <T extends { dispose: () => void }>(x: T) => (this.disposables.push(x), x)
    const glowMat = (c: string, o = 1) =>
      add(new THREE.MeshBasicMaterial({ map: dot, color: c, transparent: true, opacity: o, depthWrite: false, blending: THREE.AdditiveBlending }))

    // Lightning: a white-hot core inside a wide yellow glow, re-jagged every strike
    this.bolt = new THREE.Group()
    this.boltCore = new THREE.Mesh(this.boltGeometry(), add(new THREE.MeshBasicMaterial({ color: "#fffef2", transparent: true, depthWrite: false, side: THREE.DoubleSide })))
    this.boltGlow = new THREE.Mesh(
      this.boltGeometry(),
      add(new THREE.MeshBasicMaterial({ color: "#ffe14d", transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }))
    )
    this.boltCore.renderOrder = 9
    this.boltGlow.renderOrder = 8
    this.bolt.add(this.boltGlow, this.boltCore)
    this.bolt.quaternion.copy(camQuat)
    this.bolt.visible = false

    const quad = add(new THREE.PlaneGeometry(1, 1))
    this.flash = new THREE.Mesh(quad, glowMat("#fff4b0"))
    this.flash.quaternion.copy(camQuat)
    this.flash.renderOrder = 10
    this.flash.visible = false

    for (let i = 0; i < 4; i++) {
      const s = new THREE.Mesh(quad, glowMat("#ffe680", 1 - i * 0.2))
      s.quaternion.copy(camQuat)
      s.renderOrder = 10
      s.visible = false
      this.sparks.push(s)
    }

    // The portal: a swirl disc with a bright rim, lying on the grass
    this.portal = new THREE.Group()
    const swirl = add(portalSwirl())
    this.portalDisc = new THREE.Mesh(add(new THREE.CircleGeometry(0.44, 32)), add(new THREE.MeshBasicMaterial({ map: swirl, transparent: true, depthWrite: false })))
    this.portalDisc.rotation.x = -Math.PI / 2
    const rim = new THREE.Mesh(
      add(new THREE.RingGeometry(0.42, 0.5, 32)),
      add(new THREE.MeshBasicMaterial({ color: "#f0b6ff", transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending }))
    )
    rim.rotation.x = -Math.PI / 2
    rim.position.y = 0.002
    this.portal.add(this.portalDisc, rim)
    this.portal.renderOrder = 3
    this.portalDisc.renderOrder = 3
    rim.renderOrder = 3
    this.portal.visible = false

    const puffMat = (i: number) => add(new THREE.MeshBasicMaterial({ map: dot, color: i % 2 ? "#f6efd9" : "#e9f4e0", transparent: true, opacity: 0, depthWrite: false }))
    for (let i = 0; i < PUFFS; i++) {
      const p = new THREE.Mesh(quad, puffMat(i))
      p.quaternion.copy(camQuat)
      p.renderOrder = 4
      p.visible = false
      this.puffs.push(p)
    }

    const bit = add(new THREE.PlaneGeometry(0.1, 0.15))
    this.confetti = new THREE.InstancedMesh(bit, add(new THREE.MeshBasicMaterial({ side: THREE.DoubleSide })), CONFETTI)
    const colours = ["#ff5a5f", "#ffd60a", "#4cc9f0", "#80ed99", "#f72585", "#ffffff", "#ff9f1c"].map((c) => new THREE.Color(c))
    for (let i = 0; i < CONFETTI; i++) this.confetti.setColorAt(i, colours[i % colours.length])
    this.confetti.visible = false
    this.confetti.frustumCulled = false
    this.confetti.renderOrder = 11

    this.burst = new THREE.Mesh(
      add(new THREE.RingGeometry(0.4, 0.55, 40)),
      add(new THREE.MeshBasicMaterial({ color: "#ffe680", transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }))
    )
    this.burst.quaternion.copy(camQuat)
    this.burst.visible = false
    this.burst.renderOrder = 10

    this.group.add(this.bolt, this.flash, ...this.sparks, this.portal, ...this.puffs, this.confetti, this.burst)
  }

  /** A jagged ribbon from y = 0 (the strike point) up to y = 1 (scaled later). */
  private boltGeometry() {
    const g = new THREE.BufferGeometry()
    g.setAttribute("position", new THREE.Float32BufferAttribute(new Float32Array(BOLT_SEGS * 6 * 3 + 2 * 6 * 3), 3))
    return g
  }

  private jag() {
    const pts: THREE.Vector2[] = []
    for (let i = 0; i <= BOLT_SEGS; i++) {
      const t = i / BOLT_SEGS
      pts.push(new THREE.Vector2(i === 0 || i === BOLT_SEGS ? 0 : (Math.random() - 0.5) * 0.5, t))
    }
    const fork = 2 + Math.floor(Math.random() * 4)
    const branch = [pts[fork], new THREE.Vector2(pts[fork].x + (Math.random() < 0.5 ? -1 : 1) * (0.3 + Math.random() * 0.2), pts[fork].y - 0.14)]
    for (const [mesh, w] of [
      [this.boltCore, 0.06],
      [this.boltGlow, 0.26],
    ] as const) {
      const a = (mesh.geometry.getAttribute("position") as THREE.BufferAttribute).array as Float32Array
      let k = 0
      const seg = (p: THREE.Vector2, q: THREE.Vector2, ww: number) => {
        const quad = [p.x - ww, p.y, q.x - ww, q.y, q.x + ww, q.y, p.x - ww, p.y, q.x + ww, q.y, p.x + ww, p.y]
        for (let j = 0; j < 6; j++) {
          a[k++] = quad[j * 2]
          a[k++] = quad[j * 2 + 1]
          a[k++] = 0
        }
      }
      for (let i = 0; i < BOLT_SEGS; i++) seg(pts[i], pts[i + 1], w)
      seg(branch[0], branch[1], w * 0.6)
      // Unused tail of the buffer: collapse it
      while (k < a.length) a[k++] = 0
      mesh.geometry.getAttribute("position").needsUpdate = true
      mesh.geometry.computeBoundingSphere()
    }
  }

  /** Hide everything (a new state arrived mid-effect). */
  reset() {
    this.bolt.visible = false
    this.flash.visible = false
    this.sparks.forEach((s) => (s.visible = false))
    this.portal.visible = false
    this.puffs.forEach((p) => (p.visible = false))
    this.confetti.visible = false
    this.burst.visible = false
    if (this.screen) this.screen.style.opacity = "0"
  }

  /** Is anything showing (keeps the render loop at full rate)? */
  get portalOpen() {
    return this.portal.visible
  }

  /** Spin the portal (the render loop calls this while it is open). */
  spin(dt: number) {
    this.portalDisc.rotation.z -= dt * 4
  }

  /** Lightning strikes `at`: bolt, a burst of light, a white flash over the board. */
  addStrike(tl: gsap.core.Timeline, at: THREE.Vector3, pos: string, strong = true) {
    const height = 5
    tl.call(() => this.jag(), [], pos)
    tl.set(this.bolt, { visible: true }, pos)
    tl.set(this.bolt.position, { x: at.x, y: at.y + 0.05, z: at.z }, pos)
    tl.fromTo(this.bolt.scale, { x: 1, y: height, z: 1 }, { x: 1.4, y: height, z: 1, duration: 0.25, ease: "power1.out" }, pos)
    tl.fromTo([this.boltCore.material, this.boltGlow.material], { opacity: 1 }, { opacity: 0, duration: 0.3, ease: "power2.in" }, `${pos}+=0.08`)
    tl.set(this.bolt, { visible: false }, `${pos}+=0.4`)
    this.addFlash(tl, at, pos, strong ? 1.9 : 1.2)
    if (this.screen && strong) {
      tl.fromTo(this.screen, { opacity: 0.5 }, { opacity: 0, duration: 0.35, ease: "power2.out" }, pos)
    }
  }

  /** A burst of light at `at`. */
  addFlash(tl: gsap.core.Timeline, at: THREE.Vector3, pos: string, size = 1.4, colour = "#fff4b0") {
    const m = this.flash.material as THREE.MeshBasicMaterial
    tl.set(this.flash, { visible: true }, pos)
    tl.call(() => void m.color.set(colour), [], pos)
    tl.set(this.flash.position, { x: at.x, y: at.y + 0.35, z: at.z }, pos)
    tl.fromTo(this.flash.scale, { x: size * 0.3, y: size * 0.3 }, { x: size, y: size, duration: 0.22, ease: "power2.out" }, pos)
    tl.fromTo(m, { opacity: 1 }, { opacity: 0, duration: 0.4, ease: "power1.in" }, `${pos}+=0.06`)
    tl.set(this.flash, { visible: false }, `${pos}+=0.48`)
  }

  /** A comet of sparks racing along `curve` (0 → 1). */
  addSpark(tl: gsap.core.Timeline, curve: THREE.Curve<THREE.Vector3>, pos: string, dur: number, colour: string, reverse = false) {
    const proxy = { t: 0 }
    const tmp = new THREE.Vector3()
    tl.call(
      () => {
        this.sparks.forEach((s, i) => {
          ;(s.material as THREE.MeshBasicMaterial).color.set(colour)
          s.scale.setScalar(0.85 - i * 0.15)
        })
      },
      [],
      pos
    )
    tl.set(this.sparks, { visible: true }, pos)
    tl.fromTo(
      proxy,
      { t: 0 },
      {
        t: 1,
        duration: dur,
        ease: "power1.inOut",
        onUpdate: () => {
          this.sparks.forEach((s, i) => {
            const u = Math.max(0, Math.min(1, proxy.t - i * 0.05))
            curve.getPointAt(reverse ? 1 - u : u, tmp)
            s.position.set(tmp.x, tmp.y + 0.1, tmp.z)
          })
        },
      },
      pos
    )
    tl.set(this.sparks, { visible: false }, `${pos}+=${dur + 0.05}`)
  }

  /** The portal opens (scale up) on `at`. */
  addPortalOpen(tl: gsap.core.Timeline, at: THREE.Vector3, pos: string) {
    tl.set(this.portal, { visible: true }, pos)
    tl.set(this.portal.position, { x: at.x, y: at.y + 0.02, z: at.z }, pos)
    tl.fromTo(this.portal.scale, { x: 0.01, y: 1, z: 0.01 }, { x: 1, y: 1, z: 1, duration: 0.32, ease: "back.out(1.8)" }, pos)
  }

  addPortalClose(tl: gsap.core.Timeline, pos: string) {
    tl.to(this.portal.scale, { x: 0.01, z: 0.01, duration: 0.22, ease: "power2.in" }, pos)
    tl.set(this.portal, { visible: false }, `${pos}+=0.23`)
  }

  /** A little puff of dust where a piece lands. */
  addPuff(tl: gsap.core.Timeline, at: THREE.Vector3, pos: string, big = false) {
    const count = big ? 3 : 2
    for (let i = 0; i < count; i++) {
      const p = this.puffs[this.puffNext++ % PUFFS]
      const m = p.material as THREE.MeshBasicMaterial
      const dx = (i - (count - 1) / 2) * (big ? 0.28 : 0.22)
      tl.set(p, { visible: true }, pos)
      tl.set(p.position, { x: at.x + dx, y: at.y + 0.06, z: at.z + 0.1 }, pos)
      tl.fromTo(p.position, { x: at.x + dx }, { x: at.x + dx * 1.8, y: at.y + 0.14, duration: 0.4, ease: "power2.out" }, pos)
      tl.fromTo(p.scale, { x: 0.12, y: 0.1 }, { x: big ? 0.5 : 0.34, y: big ? 0.36 : 0.24, duration: 0.4, ease: "power2.out" }, pos)
      tl.fromTo(m, { opacity: 0.75 }, { opacity: 0, duration: 0.42, ease: "power1.in" }, pos)
      tl.set(p, { visible: false }, `${pos}+=0.43`)
    }
  }

  /** Confetti bursting from `from`, raining down over a second and a half. */
  addConfetti(tl: gsap.core.Timeline, from: THREE.Vector3, pos: string) {
    const vel = Array.from({ length: CONFETTI }, () => {
      const a = Math.random() * Math.PI * 2
      const up = 2.2 + Math.random() * 2.6
      const out = 0.9 + Math.random() * 1.9
      return new THREE.Vector3(Math.cos(a) * out, up, Math.sin(a) * out * 0.6 + 0.4)
    })
    const spin = Array.from({ length: CONFETTI }, () => new THREE.Vector3(Math.random() * 9, Math.random() * 9, Math.random() * 9))
    const proxy = { t: 0 }
    const m = new THREE.Matrix4()
    const q = new THREE.Quaternion()
    const e = new THREE.Euler()
    const p = new THREE.Vector3()
    const s = new THREE.Vector3(1, 1, 1)
    tl.set(this.confetti, { visible: true }, pos)
    tl.fromTo(
      proxy,
      { t: 0 },
      {
        t: 1.6,
        duration: 1.6,
        ease: "none",
        onUpdate: () => {
          const t = proxy.t
          for (let i = 0; i < CONFETTI; i++) {
            const v = vel[i]
            // Air drag: the bits flutter down slowly after the burst
            const k = (1 - Math.exp(-2.2 * t)) / 2.2
            p.set(from.x + v.x * k, from.y + v.y * k - 1.1 * t * t, from.z + v.z * k)
            e.set(spin[i].x * t, spin[i].y * t, spin[i].z * t)
            q.setFromEuler(e)
            s.setScalar(t > 1.2 ? Math.max(0, (1.6 - t) / 0.4) : 1)
            m.compose(p, q, s)
            this.confetti.setMatrixAt(i, m)
          }
          this.confetti.instanceMatrix.needsUpdate = true
        },
      },
      pos
    )
    tl.set(this.confetti, { visible: false }, `${pos}+=1.62`)
  }

  /** A ring of light expanding from `at`. */
  addBurst(tl: gsap.core.Timeline, at: THREE.Vector3, pos: string) {
    const m = this.burst.material as THREE.MeshBasicMaterial
    tl.set(this.burst, { visible: true }, pos)
    tl.set(this.burst.position, { x: at.x, y: at.y, z: at.z }, pos)
    tl.fromTo(this.burst.scale, { x: 0.3, y: 0.3 }, { x: 3.2, y: 3.2, duration: 0.7, ease: "power2.out" }, pos)
    tl.fromTo(m, { opacity: 1 }, { opacity: 0, duration: 0.7, ease: "power1.in" }, pos)
    tl.set(this.burst, { visible: false }, `${pos}+=0.72`)
  }

  dispose() {
    this.disposables.forEach((d) => d.dispose())
    this.boltCore.geometry.dispose()
    this.boltGlow.geometry.dispose()
  }
}
