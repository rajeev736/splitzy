import gsap from "gsap"
import * as THREE from "three"

import type { SnakesLast, SnakesState } from "@/lib/live/snakes"
import type { SnakesSound } from "@/lib/live/sound"
import type { EdgePoint } from "../snakes3d/edge-markers"
import { disposeCharacterCache, disposePiece, makePiece, MARKER_Y, setDim, type Piece } from "./characters"
import { Fx } from "./fx"
import { axisAt, COLS, DEPTH, LADDER_SHAPES, RISE, rowOfZ, SNAKE_SHAPES, SPACING, standOf, tileTop, TOP } from "./layout"
import { FOG_COLOUR, skyGradient } from "./textures"
import { buildWorld, type WorldParts } from "./world"

/** Time per square when a piece hops (as on the night tower). */
const STEP_S = 0.24
/** The camera: vertical field of view, elevation and a slight turn to show the pillars' sides. */
const FOV = 38
const ELEVATION = THREE.MathUtils.degToRad(48)
const YAW = 0.13
const VIEW_DIR = new THREE.Vector3(Math.sin(YAW) * Math.cos(ELEVATION), Math.sin(ELEVATION), Math.cos(YAW) * Math.cos(ELEVATION))
/** How far up the screen one terrace climbs (world units at the target's distance). */
const ROW_SCREEN = DEPTH * Math.sin(ELEVATION) + RISE * Math.cos(ELEVATION)
/** The view never goes much below the start platform or above the summit (rows, at the view's edges). */
const VIEW_BOTTOM = -2.3
const VIEW_TOP = 21.6
/** The followed piece sits a little below the middle, so you see what's ahead. */
const LOOK_AHEAD = 0.6
/** Where the sun sits relative to what the camera looks at. */
const SUN_OFFSET = new THREE.Vector3(5, 11, 7)
/** Half the tower's width, from a row's centre to its outer squares' edges. */
const TOWER_HALF = ((COLS - 1) / 2) * SPACING + TOP / 2


export interface JungleOptions {
  /** The element the canvas fills. */
  host: HTMLElement
  /** A white overlay for the lightning's flash (opacity animated), or null. */
  flash: HTMLElement | null
  reduced: boolean
  /** A moment of the animation that has a sound (each hop, the gate, a ladder, a snake, the summit). */
  onSound: (sound: SnakesSound) => void
  /** The player took the camera (true) or handed it back (false). */
  onFree: (free: boolean) => void
  /** Each drawn frame: where the other pieces (and yours, in free camera) are on screen, for the off-screen arrows. */
  onMarkers?: (points: EdgePoint[], w: number, h: number) => void
}

/** Where on a piece the off-screen arrows point (its middle, above its feet). */
const BODY_Y = 0.45

/**
 * The jungle tower in three.js: owns the renderer, the scene, the camera and
 * the pieces, and turns each new state into an animation exactly like the
 * night tower does (see snakes3d/use-tower-animation.ts): a new `seq` whose
 * `last` is a move by a piece drawn at `last.from` plays out — the gate, one
 * hop per square, then the ladder's lightning or the snake's portal — while
 * anything else snaps every piece to where the state says.
 */
export class JungleWorld {
  private readonly renderer: THREE.WebGLRenderer
  private readonly scene = new THREE.Scene()
  private readonly camera: THREE.PerspectiveCamera
  private readonly parts: WorldParts
  private readonly fx: Fx
  private readonly sky: THREE.Texture
  private readonly pieces = new Map<string, Piece>()
  private meUid = ""
  /** Players who left or are out (no off-screen arrow for them). */
  private hidden = new Set<string>()
  /** The canvas's size in CSS px, and a scratch vector for projecting the pieces onto it. */
  private w = 1
  private h = 1
  private readonly onScreenAt = new THREE.Vector3()

  /** Where each piece is drawn (or will be once the running timeline ends). */
  private shown: Record<string, number> = {}
  private seen: number | null = null
  private tl: gsap.core.Timeline | null = null

  /** The camera looks at the trail's centre line at row `h`, `x` to the side of it (within `xMax`). */
  private readonly cam = { h: 0, x: 0 }
  private camTween: gsap.core.Tween | null = null
  private dist = 12
  private xMax = 0
  /** A warm glow of sunlight in the view's top corner (rides on the camera). */
  private readonly sunGlow: THREE.Mesh
  private free = false
  private followUid: string | null = null
  private started = false
  private lastShadowH = NaN
  private lastShadowX = NaN

  private raf = 0
  private running = false
  private onScreen = true
  private dirty = true
  private busyUntil = 0
  private lastFrame = 0
  private slowFrames = 0
  private fastFrames = 0
  private pixelRatio: number
  private drag: { id: number; y: number; h: number; px: number; x: number; lastY: number; lastT: number; v: number; moved: boolean } | null = null
  private readonly cleanups: (() => void)[] = []
  private readonly opts: JungleOptions

  constructor(opts: JungleOptions) {
    this.opts = opts
    const nav = navigator as Navigator & { deviceMemory?: number }
    const weak = (nav.hardwareConcurrency ?? 8) <= 4 || (nav.deviceMemory ?? 8) <= 4
    this.pixelRatio = Math.min(window.devicePixelRatio || 1, weak ? 1.5 : 2)
    // Throws when WebGL isn't available: the board falls back to the night tower
    this.renderer = new THREE.WebGLRenderer({ antialias: this.pixelRatio < 1.5, powerPreference: "high-performance", stencil: false })
    if (!this.renderer.getContext()) throw new Error("No WebGL")
    this.renderer.setPixelRatio(this.pixelRatio)
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFShadowMap
    this.renderer.shadowMap.autoUpdate = false
    const canvas = this.renderer.domElement
    canvas.style.display = "block"
    canvas.style.width = "100%"
    canvas.style.height = "100%"
    canvas.style.touchAction = "none"
    canvas.setAttribute("aria-hidden", "true")
    opts.host.appendChild(canvas)

    this.camera = new THREE.PerspectiveCamera(FOV, 1, 0.3, 200)
    this.camera.position.copy(VIEW_DIR)
    this.camera.lookAt(0, 0, 0)
    const camQuat = this.camera.quaternion.clone()

    this.sky = skyGradient()
    this.scene.background = this.sky
    this.scene.fog = new THREE.Fog(FOG_COLOUR, 20, 60)

    this.parts = buildWorld(camQuat, Math.min(4, this.renderer.capabilities.getMaxAnisotropy()))
    if (weak) this.parts.sun.shadow.mapSize.set(512, 512)
    this.scene.add(this.parts.root)
    this.fx = new Fx(this.parts.dot, camQuat, opts.flash)
    this.scene.add(this.fx.group)

    this.sunGlow = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({ map: this.parts.dot, color: "#ffe2a0", transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending, depthTest: false, depthWrite: false, fog: false })
    )
    this.sunGlow.renderOrder = 30
    this.camera.add(this.sunGlow)
    this.scene.add(this.camera)

    this.bindInput(canvas)
    this.bindVisibility()
    this.resize()
    this.start()
  }

  /* ── Render loop ───────────────────────────────────────────────────── */

  private start() {
    if (this.running || !this.onScreen || document.hidden) return
    this.running = true
    this.lastFrame = performance.now()
    this.dirty = true
    this.raf = requestAnimationFrame(this.frame)
  }

  private stop() {
    this.running = false
    cancelAnimationFrame(this.raf)
  }

  private busy(now: number) {
    return !!this.tl?.isActive() || !!this.camTween?.isActive() || !!this.drag || now < this.busyUntil
  }

  private readonly frame = (now: number) => {
    if (!this.running) return
    this.raf = requestAnimationFrame(this.frame)
    const busy = this.busy(now)
    // Idle: ambient life at ~30 fps (none at all with reduced motion)
    if (!busy) {
      if (this.opts.reduced ? !this.dirty : now - this.lastFrame < 32) return
    }
    const dt = Math.min(0.1, (now - this.lastFrame) / 1000)
    if (busy) this.adapt(now - this.lastFrame)
    this.lastFrame = now
    this.dirty = false
    if (!this.opts.reduced) this.ambient(now / 1000, dt)
    else if (this.fx.portalOpen) this.fx.spin(dt)
    this.applyCamera()
    this.renderer.render(this.scene, this.camera)
    this.emitMarkers()
  }

  /** Project the pieces onto the canvas for the off-screen arrows (after a render, so the camera's matrices are fresh). */
  private emitMarkers() {
    const sink = this.opts.onMarkers
    if (!sink) return
    const points: EdgePoint[] = []
    for (const [uid, p] of this.pieces) {
      if (this.hidden.has(uid) || (uid === this.meUid && !this.free)) continue
      const v = this.onScreenAt.copy(p.root.position)
      v.y += BODY_Y
      v.project(this.camera)
      points.push({ uid, x: ((v.x + 1) / 2) * this.w, y: ((1 - v.y) / 2) * this.h, pos: this.shown[uid] ?? 0 })
    }
    sink(points, this.w, this.h)
  }

  /** Busy frames that keep coming slow: lower the resolution a step (never below 1×). */
  private adapt(ms: number) {
    if (ms > 28) this.slowFrames++
    else if (ms < 20) this.fastFrames++
    if (this.slowFrames + this.fastFrames < 60) return
    if (this.slowFrames > 40 && this.pixelRatio > 1) {
      this.pixelRatio = Math.max(1, this.pixelRatio - 0.5)
      this.renderer.setPixelRatio(this.pixelRatio)
      this.resize()
    }
    this.slowFrames = 0
    this.fastFrames = 0
  }

  private ambient(t: number, dt: number) {
    const p = this.parts
    p.swayTime.value = t
    p.falls.offset.y = (t * 1.25) % 1
    p.pool.offset.set((t * 0.03) % 1, (t * 0.05) % 1)
    p.foam.forEach((f, i) => {
      const s = 1 + Math.sin(t * 5 + i * 2) * 0.08
      f.scale.set(s, s, 1)
    })
    p.mist.position.x = Math.sin(t * 0.12) * 0.5
    p.star.rotation.y = t * 1.3
    ;(p.starGlow.material as THREE.MeshBasicMaterial).opacity = 0.55 + Math.sin(t * 2.4) * 0.2
    for (const piece of this.pieces.values()) {
      const ph = t * 2.6 + piece.slot * 1.3
      piece.bob.position.y = Math.abs(Math.sin(ph)) * 0.03
      const sq = 1 + Math.sin(ph * 2) * 0.018
      piece.bob.scale.set(1 / Math.sqrt(sq), sq, 1 / Math.sqrt(sq))
      if (piece.marker) piece.marker.position.y = MARKER_Y + Math.sin(t * 3.2) * 0.06
      if (piece.ring) (piece.ring.material as THREE.MeshBasicMaterial).opacity = 0.55 + Math.sin(t * 3.2) * 0.3
    }
    if (this.fx.portalOpen) this.fx.spin(dt)
  }

  private applyCamera() {
    const target = axisAt(this.cam.h)
    target.x += Math.max(-this.xMax, Math.min(this.xMax, this.cam.x))
    this.camera.position.copy(target).addScaledVector(VIEW_DIR, this.dist)
    const sun = this.parts.sun
    // (NaN after a resize: always redraw the shadows)
    if (!(Math.abs(this.cam.h - this.lastShadowH) <= 0.02 && Math.abs(target.x - this.lastShadowX) <= 0.03)) {
      this.lastShadowX = target.x
      sun.target.position.copy(target)
      sun.position.copy(target).add(SUN_OFFSET)
      sun.target.updateMatrixWorld()
      this.renderer.shadowMap.needsUpdate = true
      this.lastShadowH = this.cam.h
    }
  }

  /**
   * Frame the tower for the canvas: on a phone about 3½–4 squares across and 3–4 terraces up,
   * so the numbers are big (the camera slides sideways to keep your piece in view); a bigger
   * board shows the whole width and more terraces.
   */
  resize() {
    const host = this.opts.host
    const w = Math.max(1, host.clientWidth)
    const h = Math.max(1, host.clientHeight)
    this.w = w
    this.h = h
    this.renderer.setSize(w, h, false)
    this.camera.aspect = w / h
    const tanH = Math.tan(THREE.MathUtils.degToRad(FOV / 2))
    const k = Math.max(0, Math.min(1, (w - 340) / 130))
    const across = 4.7 + (6.4 - 4.7) * k
    const terraces = 3.6 + (5.4 - 3.6) * k
    const pxPerUnit = Math.min(w / across, h / (terraces * ROW_SCREEN))
    const d = h / (2 * pxPerUnit * tanH)
    this.dist = d
    this.xMax = Math.max(0, TOWER_HALF + 0.9 - d * tanH * this.camera.aspect)
    const fog = this.scene.fog as THREE.Fog
    fog.near = d - 1
    fog.far = d + 30
    this.camera.updateProjectionMatrix()
    // The sun's glow sits in the top right corner, 2 units in front of the camera
    const gh = 2 * tanH
    this.sunGlow.position.set(gh * this.camera.aspect * 0.95, gh * 1.02, -2)
    this.sunGlow.scale.setScalar(gh * 1.9)
    // How far the camera may look: the gate at the bottom edge, the summit at the top
    const halfRows = (d * tanH) / ROW_SCREEN
    this.hMin = VIEW_BOTTOM + halfRows
    this.hMax = Math.max(this.hMin, VIEW_TOP - halfRows)
    this.cam.h = this.clampH(this.cam.h)
    this.dirty = true
    this.lastShadowH = NaN
  }

  /* ── Camera control ────────────────────────────────────────────────── */

  private hMin = -1
  private hMax = 19

  private clampH(h: number) {
    return Math.max(this.hMin, Math.min(this.hMax, h))
  }

  /** The camera row that frames a piece standing at `p`. */
  private hOf(p: THREE.Vector3) {
    return this.clampH(rowOfZ(p.z) + LOOK_AHEAD)
  }

  /** Where the camera frames a piece standing at `p`: its row, and its offset from the trail's centre line. */
  private aim(p: THREE.Vector3): { h: number; x: number } {
    const h = this.hOf(p)
    const x = p.x - axisAt(h).x
    return { h, x: Math.max(-this.xMax, Math.min(this.xMax, x)) }
  }

  private glide(to: { h: number; x: number }, dur: number) {
    this.camTween?.kill()
    this.camTween = null
    const h = this.clampH(to.h)
    const x = Math.max(-this.xMax, Math.min(this.xMax, to.x))
    if (dur <= 0) {
      this.cam.h = h
      this.cam.x = x
      this.dirty = true
      return
    }
    this.camTween = gsap.to(this.cam, { h, x, duration: dur, ease: "power2.inOut" })
  }

  /** Keep `uid` in view as they move to `pos` over `dur` seconds (only while the camera follows them). */
  private track(uid: string, pos: THREE.Vector3, dur: number) {
    if (this.free || uid !== this.followUid) return
    this.glide(this.aim(pos), Math.max(0.35, dur))
  }

  private followTarget(): { h: number; x: number } | null {
    const uid = this.followUid
    if (!uid || !this.pieces.has(uid)) return null
    const p = this.pieces.get(uid)!
    return this.aim(standOf(this.shown[uid] ?? 0, p.slot))
  }

  /** The camera's target changed: glide there (snap on the first paint). */
  setFollow(uid: string | null) {
    const changed = uid !== this.followUid
    this.followUid = uid
    if (this.free || (!changed && this.started)) return
    const to = this.followTarget()
    if (to === null) return
    this.glide(to, this.started ? 0.7 : 0)
    this.started = true
  }

  /** The "back to me" pill. */
  backToMe() {
    this.free = false
    this.opts.onFree(false)
    this.dirty = true
    const to = this.followTarget()
    if (to !== null) this.glide(to, 0.6)
  }

  /** An off-screen arrow was tapped: glide to that piece and stay there (free camera) — or, for the followed piece, follow again. */
  focus(uid: string) {
    const p = this.pieces.get(uid)
    if (!p) return
    if (uid === this.followUid) return this.backToMe()
    this.letGo()
    this.glide(this.aim(p.root.position), 0.6)
  }

  private letGo() {
    if (this.free) return
    this.camTween?.kill()
    this.camTween = null
    this.free = true
    this.dirty = true
    this.opts.onFree(true)
  }

  /**
   * Your turn came, or your piece is about to move: the camera leaves free mode
   * and glides back to you (the move's own tracking then takes it along).
   */
  private reclaim() {
    this.free = false
    this.opts.onFree(false)
    this.dirty = true
    const p = this.pieces.get(this.meUid)
    if (p) this.glide(this.aim(standOf(this.shown[this.meUid] ?? 0, p.slot)), 0.5)
  }

  private unitsPerPx() {
    const h = Math.max(1, this.opts.host.clientHeight)
    return (2 * this.dist * Math.tan(THREE.MathUtils.degToRad(FOV / 2))) / h
  }

  private bindInput(canvas: HTMLCanvasElement) {
    const down = (e: PointerEvent) => {
      if (e.pointerType === "mouse" && e.button !== 0) return
      this.camTween?.kill()
      this.drag = {
        id: e.pointerId,
        y: e.clientY,
        h: this.cam.h,
        px: e.clientX,
        x: Math.max(-this.xMax, Math.min(this.xMax, this.cam.x)),
        lastY: e.clientY,
        lastT: performance.now(),
        v: 0,
        moved: false,
      }
      canvas.setPointerCapture?.(e.pointerId)
    }
    const move = (e: PointerEvent) => {
      const d = this.drag
      if (!d || d.id !== e.pointerId) return
      const dy = e.clientY - d.y
      const dx = e.clientX - d.px
      if (!d.moved && Math.max(Math.abs(dy), Math.abs(dx)) > 4) {
        d.moved = true
        this.letGo()
      }
      if (!d.moved) return
      // Drag down → look up the tower (like scrolling a page); sideways where the view is narrower than the tower
      const perRow = this.unitsPerPx() / ROW_SCREEN
      this.cam.h = this.clampH(d.h + dy * perRow)
      this.cam.x = Math.max(-this.xMax, Math.min(this.xMax, d.x - dx * this.unitsPerPx()))
      const now = performance.now()
      const dtm = Math.max(1, now - d.lastT)
      d.v = 0.7 * d.v + 0.3 * (((e.clientY - d.lastY) * perRow) / dtm) * 1000
      d.lastY = e.clientY
      d.lastT = now
    }
    const up = (e: PointerEvent) => {
      const d = this.drag
      if (!d || d.id !== e.pointerId) return
      this.drag = null
      canvas.releasePointerCapture?.(e.pointerId)
      // A flick keeps gliding
      if (d.moved && Math.abs(d.v) > 0.5 && performance.now() - d.lastT < 80) {
        this.camTween = gsap.to(this.cam, { h: this.clampH(this.cam.h + d.v * 0.3), duration: 0.7, ease: "power3.out" })
      }
      this.busyUntil = performance.now() + 100
    }
    const wheel = (e: WheelEvent) => {
      e.preventDefault()
      this.letGo()
      const px = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaMode === 2 ? e.deltaY * 400 : e.deltaY
      this.camTween?.kill()
      this.cam.h = this.clampH(this.cam.h - (px * this.unitsPerPx()) / ROW_SCREEN)
      this.busyUntil = performance.now() + 150
    }
    canvas.addEventListener("pointerdown", down)
    canvas.addEventListener("pointermove", move)
    canvas.addEventListener("pointerup", up)
    canvas.addEventListener("pointercancel", up)
    canvas.addEventListener("wheel", wheel, { passive: false })
    this.cleanups.push(() => {
      canvas.removeEventListener("pointerdown", down)
      canvas.removeEventListener("pointermove", move)
      canvas.removeEventListener("pointerup", up)
      canvas.removeEventListener("pointercancel", up)
      canvas.removeEventListener("wheel", wheel)
    })
  }

  private bindVisibility() {
    const vis = () => (document.hidden ? this.stop() : this.start())
    document.addEventListener("visibilitychange", vis)
    const io = new IntersectionObserver((entries) => {
      this.onScreen = entries.some((e) => e.isIntersecting)
      if (this.onScreen) this.start()
      else this.stop()
    })
    io.observe(this.opts.host)
    const ro = new ResizeObserver(() => {
      this.resize()
      if (!this.free) {
        const to = this.followTarget()
        if (to !== null) this.glide(to, 0)
      }
    })
    ro.observe(this.opts.host)
    const canvas = this.renderer.domElement
    const lost = (e: Event) => e.preventDefault()
    canvas.addEventListener("webglcontextlost", lost)
    this.cleanups.push(() => {
      document.removeEventListener("visibilitychange", vis)
      io.disconnect()
      ro.disconnect()
      canvas.removeEventListener("webglcontextlost", lost)
    })
  }

  /* ── Pieces ────────────────────────────────────────────────────────── */

  private ensurePieces(state: SnakesState, meUid: string) {
    if (meUid !== this.meUid) {
      // Whose piece wears the "you" marker changed: rebuild them all
      for (const p of this.pieces.values()) {
        this.scene.remove(p.root)
        disposePiece(p)
      }
      this.pieces.clear()
      this.meUid = meUid
    }
    state.order.forEach((uid, slot) => {
      const pl = state.players[uid]
      const have = this.pieces.get(uid)
      if (!pl || (have && have.slot === slot)) return
      if (have) {
        this.scene.remove(have.root)
        disposePiece(have)
      }
      const p = makePiece(pl.colour, slot, uid === meUid, this.parts.dot, this.camera.quaternion)
      this.pieces.set(uid, p)
      this.scene.add(p.root)
      this.place(uid, this.shown[uid] ?? pl.pos)
    })
    for (const [uid, p] of this.pieces) {
      if (state.order.includes(uid)) continue
      this.scene.remove(p.root)
      disposePiece(p)
      this.pieces.delete(uid)
    }
  }

  private place(uid: string, pos: number) {
    this.shown[uid] = pos
    const p = this.pieces.get(uid)
    if (!p) return
    standOf(pos, p.slot, p.root.position)
    p.hop.position.set(0, 0, 0)
    p.hop.scale.set(1, 1, 1)
    p.turn.rotation.set(0, 0, 0)
    p.shadow.scale.set(1, 1, 1)
    p.shadowMat.opacity = p.dim ? 0.2 : 0.5
    this.dirty = true
  }

  private resetGate() {
    const g = this.parts.gate
    g.left.rotation.set(0, 0, 0)
    g.right.rotation.set(0, 0, 0)
    g.lockMat.emissive.setRGB(0, 0, 0)
    g.lockMat.color.set("#f2c94c")
    this.parts.star.scale.set(1, 1, 1)
  }

  /* ── State → animation ─────────────────────────────────────────────── */

  sync(state: SnakesState, meUid: string, hidden: string[]) {
    this.ensurePieces(state, meUid)
    for (const [uid, p] of this.pieces) setDim(p, hidden.includes(uid))
    this.hidden = new Set(hidden)
    this.dirty = true

    const last = state.last
    const prev = this.seen
    // The same move again (the server stamping its clock on it): nothing new to play
    if (prev === state.seq) return
    this.seen = state.seq

    // Looking around freely: an opponent's move leaves the camera be, but your turn or your own move brings it home
    const mine = (last && (last.type === "move" || last.type === "blocked") && last.by === meUid) || (state.phase === "roll" && state.turn === meUid)
    if (this.free && prev !== null && mine && this.pieces.has(meUid)) this.reclaim()

    // A state landing mid-animation: finish what was playing, then continue from there
    if (this.tl) {
      this.tl.progress(1, true).kill()
      this.tl = null
    }
    this.fx.reset()
    this.resetGate()

    const mover = last && (last.type === "move" || last.type === "blocked") ? last.by : null
    const piece = mover ? this.pieces.get(mover) : undefined
    const canPlay = prev !== null && state.seq === prev + 1 && !!piece

    // Everyone not in the move stands where the state says
    for (const uid of state.order) {
      if (canPlay && uid === mover) continue
      this.place(uid, state.players[uid]?.pos ?? 0)
    }

    if (!last || !canPlay || !mover || !piece) {
      if (mover) this.place(mover, state.players[mover]?.pos ?? 0)
      this.refollow()
      return
    }

    if (last.type === "blocked") {
      if (this.shown[mover] !== 0) {
        this.place(mover, 0)
        this.refollow()
        return
      }
      this.place(mover, 0)
      this.tl = this.playBlocked(piece)
      return
    }

    if (last.type !== "move" || this.shown[mover] !== last.from) {
      this.place(mover, state.players[mover]?.pos ?? 0)
      this.refollow()
      return
    }

    this.place(mover, last.from)
    this.shown[mover] = state.players[mover]?.pos ?? last.end
    this.tl = this.playMove(mover, piece, last)
  }

  private refollow() {
    if (this.free || !this.started) return
    const to = this.followTarget()
    if (to !== null && (Math.abs(to.h - this.cam.h) > 0.05 || Math.abs(to.x - this.cam.x) > 0.05)) this.glide(to, 0.5)
  }

  private timeline() {
    const tl: gsap.core.Timeline = gsap.timeline({
      // fromTo() mustn't paint its start values when the timeline is built (they'd show before their turn)
      defaults: { immediateRender: false },
      onComplete: () => {
        if (this.tl === tl) this.tl = null
        this.dirty = true
      },
    })
    // Reduced motion: still shown, just quicker
    if (this.opts.reduced) tl.timeScale(1.8)
    return tl
  }

  private playBlocked(p: Piece): gsap.core.Timeline {
    const tl = this.timeline()
    const g = this.parts.gate
    // The piece bumps the gate, the gate shudders, the lock flashes red
    tl.to(p.hop.position, { z: -0.16, duration: 0.12, ease: "power2.out" })
    tl.to(p.hop.position, { z: 0, duration: 0.3, ease: "back.out(3)" })
    tl.to(g.left.rotation, { y: 0.07, duration: 0.06, yoyo: true, repeat: 5, ease: "sine.inOut" }, 0.1)
    tl.to(g.right.rotation, { y: -0.07, duration: 0.06, yoyo: true, repeat: 5, ease: "sine.inOut" }, 0.1)
    tl.set([g.left.rotation, g.right.rotation], { y: 0 }, 0.5)
    tl.fromTo(g.lockMat.color, { r: 1, g: 0.25, b: 0.25 }, { r: 0.95, g: 0.79, b: 0.3, duration: 0.7 }, 0)
    tl.fromTo(g.lockMat.emissive, { r: 0.8, g: 0, b: 0 }, { r: 0, g: 0, b: 0, duration: 0.7 }, 0)
    tl.to(p.turn.rotation, { z: 0.12, duration: 0.08, yoyo: true, repeat: 3, ease: "sine.inOut" }, 0.15)
    tl.call(() => this.opts.onSound("gate_shut"), [], 0.1)
    return tl
  }

  /** One hop from `from` to `to`: an arc with squash and stretch, turning to face the way it goes. */
  private hopTween(tl: gsap.core.Timeline, p: Piece, from: THREE.Vector3, to: THREE.Vector3, dur: number, lift: number, position?: gsap.Position) {
    const proxy = { t: 0 }
    const yaw = Math.abs(to.x - from.x) + Math.abs(to.z - from.z) > 0.01 ? Math.atan2(to.x - from.x, to.z - from.z) : 0
    const height = lift + Math.abs(to.y - from.y) * 0.45
    let startYaw: number | null = null
    tl.fromTo(
      proxy,
      { t: 0 },
      {
        t: 1,
        duration: dur,
        ease: "none",
        onUpdate: () => {
          const t = proxy.t
          if (startYaw === null) startYaw = p.turn.rotation.y
          p.root.position.lerpVectors(from, to, t)
          const arc = 4 * height * t * (1 - t)
          p.hop.position.y = arc
          // Stretch in the air, squash on landing
          const sy = t < 0.78 ? 1 + 0.16 * Math.sin((Math.PI * t) / 0.78) : 1 - 0.24 * Math.sin((Math.PI * (t - 0.78)) / 0.22)
          const sxz = 1 / Math.sqrt(sy)
          p.hop.scale.set(sxz, sy, sxz)
          const k = Math.min(1, t * 4)
          let d = yaw - startYaw
          d = Math.atan2(Math.sin(d), Math.cos(d))
          p.turn.rotation.y = startYaw + d * k
          const sh = 1 - Math.min(0.45, arc * 0.7)
          p.shadow.scale.set(sh, sh, 1)
        },
      },
      position
    )
  }

  private playMove(uid: string, p: Piece, last: Extract<SnakesLast, { type: "move" }>): gsap.core.Timeline {
    const tl = this.timeline()
    const slot = p.slot
    const g = this.parts.gate
    let at = standOf(last.from, slot)
    let landings = 0
    let cursor = 0
    const shadowOn = p.dim ? 0.2 : 0.5
    const track = (pos: THREE.Vector3, dur: number, position?: gsap.Position) =>
      tl.call(() => this.track(uid, pos, dur), [], position ?? "<")
    const sound = (s: SnakesSound, position: gsap.Position) => tl.call(() => this.opts.onSound(s), [], position)
    // Hops run back to back from `cursor`; each landing gets a puff and a hop sound. The hop's
    // call goes in last, so a following ">" means "after this landing", not after the puff fades.
    const hopTo = (pos: number, dur: number, lift = 0.36, startAt?: number) => {
      const to = standOf(pos, slot)
      const start = startAt ?? cursor
      this.hopTween(tl, p, at, to, dur, lift, start)
      const land = start + dur
      const label = `land${landings++}`
      tl.addLabel(label, land)
      this.fx.addPuff(tl, to, label)
      sound("hop", land)
      cursor = land
      at = to
    }

    // The walk (through the gate on a 1, straight onto square 1 — the tower has no ladder there)
    if (last.gate) {
      sound("gate_open", 0)
      tl.to(g.left.rotation, { y: 1.85, duration: 0.45, ease: "power2.inOut" }, 0)
      tl.to(g.right.rotation, { y: -1.85, duration: 0.45, ease: "power2.inOut" }, 0)
      track(standOf(1, slot), 0.6, 0.3)
      hopTo(1, 0.42, 0.55, 0.3)
      tl.to([g.left.rotation, g.right.rotation], { y: 0, duration: 0.4, ease: "power2.inOut" }, ">0.15")
    } else if (last.to > last.from) {
      const steps = last.to - last.from
      track(standOf(last.to, slot), steps * STEP_S)
      for (let q = last.from + 1; q <= last.to; q++) hopTo(q, STEP_S)
    } else if (last.stuck) {
      // Overshot: a hop on the spot and a shake of the head
      tl.to(p.hop.position, { y: 0.24, duration: 0.14, ease: "power1.out" })
      tl.to(p.hop.position, { y: 0, duration: 0.14, ease: "power1.in" })
      tl.fromTo(p.turn.rotation, { y: -0.5 }, { y: 0.5, duration: 0.09, yoyo: true, repeat: 3, ease: "sine.inOut" })
      tl.set(p.turn.rotation, { y: 0 })
    }

    // Ladder: struck by lightning, a spark races up the ladder, the piece pops out at the top
    if (last.via === "ladder") {
      const L = LADDER_SHAPES.find((l) => l.foot === last.to)
      const end = standOf(last.end, slot)
      tl.addLabel("ladder", ">0.1")
      this.fx.addStrike(tl, at, "ladder")
      tl.to(p.hop.scale, { x: 0, y: 0, z: 0, duration: 0.2, ease: "power2.in" }, "ladder+=0.05")
      tl.to(p.turn.rotation, { y: "+=3", duration: 0.25, ease: "power1.in" }, "ladder")
      tl.to(p.shadowMat, { opacity: 0, duration: 0.15 }, "ladder")
      tl.addLabel("climb", "ladder+=0.12")
      sound("climb", "ladder")
      if (L) this.fx.addSpark(tl, L.curve, "climb", 0.45, "#ffe680")
      track(end, 0.55, "ladder+=0.1")
      tl.addLabel("top", "ladder+=0.6")
      tl.set(p.root.position, { x: end.x, y: end.y, z: end.z }, "top")
      tl.set(p.turn.rotation, { y: 0 }, "top")
      this.fx.addStrike(tl, end, "top", false)
      tl.fromTo(p.hop.scale, { x: 0, y: 0, z: 0 }, { x: 1, y: 1, z: 1, duration: 0.45, ease: "back.out(2.6)" }, "top+=0.06")
      tl.to(p.shadowMat, { opacity: shadowOn, duration: 0.3 }, "top+=0.08")
      tl.addLabel("topPuff", "top+=0.1")
      this.fx.addPuff(tl, end, "topPuff", true)
      at = end
    }

    // Snake: a portal swallows the piece, a shiver runs down the snake, it pops out by the tail
    if (last.via === "snake") {
      const S = SNAKE_SHAPES.find((s) => s.head === last.to)
      const end = standOf(last.end, slot)
      const holeAt = tileTop(last.to)
      const tailAt = tileTop(last.end)
      tl.addLabel("snake", ">0.1")
      this.fx.addPortalOpen(tl, holeAt, "snake")
      sound("bite", "snake+=0.12")
      tl.to(p.hop.position, { y: -0.4, duration: 0.45, ease: "power2.in" }, "snake+=0.12")
      tl.to(p.hop.scale, { x: 0.15, y: 0.15, z: 0.15, duration: 0.45, ease: "power2.in" }, "snake+=0.12")
      tl.to(p.turn.rotation, { y: "+=7", duration: 0.55, ease: "power1.in" }, "snake+=0.1")
      tl.to(p.shadowMat, { opacity: 0, duration: 0.2 }, "snake+=0.12")
      tl.addLabel("swallow", "snake+=0.35")
      if (S) this.fx.addSpark(tl, S.curve, "swallow", 0.6, "#e7a6ff")
      tl.addLabel("shut", "snake+=0.6")
      this.fx.addPortalClose(tl, "shut")
      track(end, 0.6, "snake+=0.45")
      tl.addLabel("tail", "snake+=0.95")
      tl.set(p.root.position, { x: end.x, y: end.y, z: end.z }, "tail")
      this.fx.addPortalOpen(tl, tailAt, "tail")
      tl.fromTo(p.hop.position, { y: -0.4 }, { y: 0, duration: 0.5, ease: "back.out(1.9)" }, "tail+=0.12")
      tl.fromTo(p.hop.scale, { x: 0.15, y: 0.15, z: 0.15 }, { x: 1, y: 1, z: 1, duration: 0.5, ease: "back.out(1.9)" }, "tail+=0.12")
      tl.to(p.turn.rotation, { y: 0, duration: 0.5, ease: "power2.out" }, "tail+=0.12")
      tl.to(p.shadowMat, { opacity: shadowOn, duration: 0.3 }, "tail+=0.2")
      tl.addLabel("tailShut", "tail+=0.6")
      this.fx.addPortalClose(tl, "tailShut")
      at = end
    }

    // Face the camera again
    if (!last.via && (last.to > last.from || last.gate)) tl.to(p.turn.rotation, { y: 0, duration: 0.25, ease: "power2.out" }, ">")

    // The summit: victory jumps, a spin, a ring of light and confetti from the star
    if (last.finished) {
      const star = this.parts.star
      tl.addLabel("win", ">0.1")
      sound("summit", "win")
      tl.to(p.hop.position, { y: 0.42, duration: 0.22, ease: "power1.out", yoyo: true, repeat: 5 }, "win")
      tl.to(p.turn.rotation, { y: `+=${Math.PI * 2}`, duration: 0.9, ease: "power1.inOut" }, "win")
      this.fx.addBurst(tl, at.clone().add(new THREE.Vector3(0, 0.4, 0)), "win")
      this.fx.addConfetti(tl, at.clone().add(new THREE.Vector3(0, 0.9, 0.2)), "win")
      this.fx.addFlash(tl, star.position.clone().add(new THREE.Vector3(0, -0.35, 0)), "win", 2.4, "#fff1a8")
      tl.to(star.scale, { x: 1.5, y: 1.5, z: 1.5, duration: 0.3, ease: "back.out(3)", yoyo: true, repeat: 1 }, "win")
    }
    return tl
  }

  /* ── Teardown ──────────────────────────────────────────────────────── */

  dispose() {
    this.stop()
    this.tl?.kill()
    this.tl = null
    this.camTween?.kill()
    gsap.killTweensOf(this.cam)
    this.cleanups.forEach((c) => c())
    for (const p of this.pieces.values()) disposePiece(p)
    this.pieces.clear()
    disposeCharacterCache()
    this.fx.dispose()
    const seen = new Set<unknown>()
    this.scene.traverse((o) => {
      const m = o as THREE.Mesh
      if (m.geometry && !seen.has(m.geometry)) {
        seen.add(m.geometry)
        m.geometry.dispose()
      }
      const mats = m.material ? (Array.isArray(m.material) ? m.material : [m.material]) : []
      for (const mat of mats) {
        if (seen.has(mat)) continue
        seen.add(mat)
        for (const v of Object.values(mat)) if (v instanceof THREE.Texture) v.dispose()
        mat.dispose()
      }
    })
    if (this.parts.sun.shadow.map) this.parts.sun.shadow.map.dispose()
    this.sky.dispose()
    this.renderer.dispose()
    this.renderer.forceContextLoss()
    this.renderer.domElement.remove()
  }
}
