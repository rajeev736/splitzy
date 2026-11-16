"use client"

import * as React from "react"
import gsap from "gsap"

import type { SnakesState } from "@/lib/live/snakes"
import { standOf, tileCentre, type Pt } from "./geometry"

/** The SVG groups that make up one piece and its effects. */
export interface CharRefs {
  /** Position on the tower. */
  root: SVGGElement | null
  /** The body: hops, shrinks into portals, pops back out. */
  hop: SVGGElement | null
  shadow: SVGEllipseElement | null
  /** Lightning for the ladders. */
  fx: SVGGElement | null
  /** The hole in the ground for the snakes. */
  portal: SVGGElement | null
}

export interface CameraHandle {
  /** Keep `uid` in view as they move to `pt` over `dur` seconds (no-op unless the camera follows them). */
  track: (uid: string, pt: Pt, dur: number) => void
}

/** Time per square when a piece hops. */
export const STEP_S = 0.24

const CHAR_SCALE = { scale: 1, opacity: 1, x: 0, y: 0 }

/**
 * Drives the pieces with GSAP from state changes: each new `seq` whose
 * `last` is a move by a piece drawn at `last.from` plays out — the gate,
 * one hop per square, then the ladder's lightning or the snake's portal —
 * while the state (and so the seats) is already at the result. Anything else
 * (joining late, a skipped state, a turn skip) just snaps every piece to
 * where the state says.
 */
export function useTowerAnimation({
  state,
  refs,
  svg,
  slotOf,
  camera,
  onStep,
}: {
  state: SnakesState | null | undefined
  refs: React.RefObject<Map<string, CharRefs>>
  svg: React.RefObject<SVGSVGElement | null>
  slotOf: (uid: string) => number
  camera: CameraHandle
  onStep?: () => void
}) {
  /** Where each piece is drawn (or will be when the running timeline ends). */
  const shown = React.useRef<Record<string, number>>({})
  const seen = React.useRef<number | null>(null)
  const timeline = React.useRef<gsap.core.Timeline | null>(null)
  const stepCb = React.useRef(onStep)
  const cam = React.useRef(camera)
  React.useEffect(() => {
    stepCb.current = onStep
    cam.current = camera
  })

  const place = React.useCallback(
    (uid: string, pos: number) => {
      const r = refs.current?.get(uid)
      shown.current[uid] = pos
      if (!r?.root) return
      const p = standOf(pos, slotOf(uid))
      gsap.set(r.root, { x: p.x, y: p.y })
      if (r.hop) gsap.set(r.hop, { ...CHAR_SCALE, transformOrigin: "50% 100%" })
      if (r.shadow) gsap.set(r.shadow, { scale: 1, opacity: 0.3, transformOrigin: "50% 50%" })
      if (r.fx) gsap.set(r.fx, { opacity: 0 })
      if (r.portal) gsap.set(r.portal, { opacity: 0 })
    },
    [refs, slotOf]
  )

  React.useEffect(() => {
    if (!state) return
    const last = state.last
    const prev = seen.current
    // The same move again (the server stamping its clock on it): nothing new to play
    if (prev === state.seq) return
    seen.current = state.seq
    const pieces = refs.current
    if (!pieces) return

    // A state landing mid-animation: finish what was playing, then continue from there
    if (timeline.current) {
      timeline.current.progress(1, true).kill()
      timeline.current = null
    }

    const r = last && (last.type === "move" || last.type === "blocked") ? pieces.get(last.by) : undefined
    const canPlay = prev !== null && state.seq === prev + 1 && !!r?.root && !!r.hop

    // Everyone not in the move stands where the state says
    for (const uid of state.order) {
      if (last && canPlay && uid === last.by) continue
      place(uid, state.players[uid]?.pos ?? 0)
    }

    if (!last || !canPlay || !r?.root || !r.hop) {
      if (last && (last.type === "move" || last.type === "blocked")) place(last.by, state.players[last.by]?.pos ?? 0)
      return
    }

    const uid = last.by
    const slot = slotOf(uid)
    const root = r.root
    const hop = r.hop
    const svgEl = svg.current
    const doors = svgEl ? Array.from(svgEl.querySelectorAll<SVGGElement>("[data-gate-door]")) : []
    const doorL = doors.find((d) => d.dataset.gateDoor === "l")
    const doorR = doors.find((d) => d.dataset.gateDoor === "r")

    if (last.type === "blocked") {
      if (shown.current[uid] !== 0) {
        place(uid, 0)
        return
      }
      // Rattle: the piece bumps the gate, the gate shudders
      const tl = gsap.timeline({ onComplete: () => (timeline.current = null) })
      tl.to(hop, { x: 4, duration: 0.07, yoyo: true, repeat: 5, ease: "sine.inOut" }).set(hop, { x: 0 })
      if (doorL && doorR) {
        tl.to([doorL, doorR], { rotation: 1.5, duration: 0.06, yoyo: true, repeat: 5, ease: "sine.inOut", transformOrigin: "50% 100%" }, 0.1)
        tl.set([doorL, doorR], { rotation: 0 })
      }
      const lock = svgEl?.querySelector("[data-gate-lock]")
      if (lock) tl.fromTo(lock, { fill: "#ff5a5f" }, { fill: "#f2c94c", duration: 0.6 }, 0)
      timeline.current = tl
      return
    }

    if (last.type !== "move" || shown.current[uid] !== last.from) {
      place(uid, state.players[uid]?.pos ?? 0)
      return
    }

    const target = state.players[uid]?.pos ?? last.end
    shown.current[uid] = target
    const tl = gsap.timeline({ onComplete: () => (timeline.current = null) })
    const hopTo = (pos: number, dur: number) => {
      const p = standOf(pos, slot)
      tl.to(root, { x: p.x, y: p.y, duration: dur, ease: "none" })
      tl.to(hop, { y: -14, duration: dur / 2, ease: "power1.out" }, "<")
      tl.to(hop, { y: 0, duration: dur / 2, ease: "power1.in" }, ">")
      if (r.shadow) {
        tl.to(r.shadow, { scale: 0.7, opacity: 0.18, duration: dur / 2, ease: "power1.out" }, "<-" + dur / 2)
        tl.to(r.shadow, { scale: 1, opacity: 0.3, duration: dur / 2, ease: "power1.in" }, ">")
      }
      tl.call(() => stepCb.current?.())
    }
    const track = (pos: number, dur: number) => {
      const p = standOf(pos, slot)
      tl.call(() => cam.current.track(uid, p, dur), [], "<")
    }

    // The walk (through the gate on a 1)
    if (last.gate) {
      if (doorL && doorR) {
        tl.to(doorL, { scaleX: 0.06, duration: 0.45, ease: "power2.inOut", transformOrigin: "0% 50%" }, 0)
        tl.to(doorR, { scaleX: 0.06, duration: 0.45, ease: "power2.inOut", transformOrigin: "100% 50%" }, 0)
      }
      tl.addLabel("in", 0.3)
      track(1, 0.6)
      hopTo(1, 0.36)
      if (doorL && doorR) tl.to([doorL, doorR], { scaleX: 1, duration: 0.4, ease: "power2.inOut" }, ">0.15")
    } else if (last.to > last.from) {
      const steps = last.to - last.from
      track(last.to, steps * STEP_S)
      for (let p = last.from + 1; p <= last.to; p++) hopTo(p, STEP_S)
    } else if (last.stuck) {
      // Overshot: a hop on the spot and a shake of the head
      tl.to(hop, { y: -10, duration: 0.14, ease: "power1.out" }).to(hop, { y: 0, duration: 0.14, ease: "power1.in" })
      tl.to(hop, { x: 3, duration: 0.08, yoyo: true, repeat: 3, ease: "sine.inOut" }).set(hop, { x: 0 })
    }

    // Ladder: gone in a flash, back at the top
    if (last.via === "ladder" && r.fx) {
      const at = standOf(last.to, slot)
      const end = standOf(last.end, slot)
      const glow = svgEl?.querySelector(`[data-ladder-glow="${last.to}"]`)
      tl.addLabel("ladder", ">0.1")
      tl.set(r.fx, { x: at.x, y: at.y, opacity: 1, scale: 0.5, transformOrigin: "50% 80%" }, "ladder")
      tl.to(r.fx, { scale: 1.25, duration: 0.2, ease: "power2.out" }, "ladder")
      tl.to(hop, { scale: 0, opacity: 0, duration: 0.2, ease: "power2.in" }, "ladder+=0.05")
      if (r.shadow) tl.to(r.shadow, { opacity: 0, duration: 0.15 }, "ladder")
      if (glow) tl.fromTo(glow, { opacity: 0.85 }, { opacity: 0, duration: 0.7, ease: "power1.out" }, "ladder")
      tl.to(r.fx, { opacity: 0, duration: 0.18 }, "ladder+=0.22")
      tl.addLabel("top", "ladder+=0.5")
      tl.call(() => cam.current.track(uid, end, 0.55), [], "ladder+=0.1")
      tl.set(root, { x: end.x, y: end.y }, "top")
      tl.set(r.fx, { x: end.x, y: end.y, opacity: 1, scale: 0.5 }, "top")
      tl.to(r.fx, { scale: 1.3, duration: 0.2, ease: "power2.out" }, "top")
      tl.to(hop, { scale: 1, opacity: 1, duration: 0.4, ease: "back.out(2.2)" }, "top+=0.08")
      if (r.shadow) tl.to(r.shadow, { opacity: 0.3, duration: 0.3 }, "top+=0.08")
      tl.to(r.fx, { opacity: 0, duration: 0.25 }, "top+=0.25")
    }

    // Snake: a portal opens, the piece drops in and pops out by the tail
    if (last.via === "snake" && r.portal) {
      const at = standOf(last.to, slot)
      const end = standOf(last.end, slot)
      const glow = svgEl?.querySelector(`[data-snake-glow="${last.to}"]`)
      tl.addLabel("snake", ">0.1")
      tl.set(r.portal, { x: at.x, y: at.y + 1, opacity: 1, scaleX: 0, scaleY: 0.7, transformOrigin: "50% 50%" }, "snake")
      tl.to(r.portal, { scaleX: 1, scaleY: 1, duration: 0.3, ease: "back.out(1.6)" }, "snake")
      if (glow) tl.fromTo(glow, { opacity: 0.7 }, { opacity: 0, duration: 0.9, ease: "power1.out" }, "snake")
      tl.to(hop, { y: 18, scale: 0.2, opacity: 0, duration: 0.45, ease: "power2.in" }, "snake+=0.12")
      if (r.shadow) tl.to(r.shadow, { opacity: 0, duration: 0.2 }, "snake+=0.12")
      tl.to(r.portal, { scaleX: 0, duration: 0.22, ease: "power2.in" }, "snake+=0.6")
      tl.addLabel("tail", "snake+=0.9")
      tl.call(() => cam.current.track(uid, end, 0.6), [], "snake+=0.45")
      tl.set(root, { x: end.x, y: end.y }, "tail")
      tl.set(r.portal, { x: end.x, y: end.y + 1, opacity: 1, scaleX: 0, scaleY: 1 }, "tail")
      tl.to(r.portal, { scaleX: 1, duration: 0.3, ease: "back.out(1.6)" }, "tail")
      tl.to(hop, { y: 0, scale: 1, opacity: 1, duration: 0.5, ease: "back.out(1.7)" }, "tail+=0.12")
      if (r.shadow) tl.to(r.shadow, { opacity: 0.3, duration: 0.3 }, "tail+=0.2")
      tl.to(r.portal, { scaleX: 0, opacity: 0, duration: 0.25, ease: "power2.in" }, "tail+=0.6")
    }

    // The summit: a victory jump and a burst of confetti
    if (last.finished) {
      const top = tileCentre(100)
      tl.addLabel("win", ">0.1")
      tl.to(hop, { y: -22, duration: 0.22, ease: "power1.out", yoyo: true, repeat: 3 }, "win")
      const bits = svgEl ? Array.from(svgEl.querySelectorAll<SVGElement>("[data-confetti]")) : []
      bits.forEach((b, i) => {
        const a = (i / bits.length) * Math.PI * 2 + (i % 2) * 0.3
        const d = 26 + (i % 4) * 11
        tl.fromTo(
          b,
          { x: top.x, y: top.y - 20, opacity: 1, scale: 1, rotation: 0 },
          { x: top.x + Math.cos(a) * d, y: top.y - 20 + Math.sin(a) * d * 0.7 + 30, opacity: 0, rotation: 200 + i * 40, scale: 0.6, duration: 1.1, ease: "power2.out" },
          "win"
        )
      })
    }

    timeline.current = tl
  }, [state, refs, svg, slotOf, place])

  // Unmount: stop the tweens
  React.useEffect(
    () => () => {
      timeline.current?.kill()
      timeline.current = null
    },
    []
  )

  /** Where `uid` is drawn right now (the real position once its move has played). */
  const drawnPos = React.useCallback((uid: string) => shown.current[uid] ?? state?.players[uid]?.pos ?? 0, [state])
  return { drawnPos }
}
