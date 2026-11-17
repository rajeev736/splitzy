"use client"

import * as React from "react"
import gsap from "gsap"

import { playSound } from "@/lib/live/sound"
import { cn } from "@/lib/utils"
import { GameAvatar } from "../game-avatar"
import { characterById } from "../registry"
import { shapeSvg } from "./shapes"
import type { Burst, CharSticker, FlightPath } from "./types"

/**
 * Plays one signature sticker across the room, everyone's screen alike:
 *
 * 1. launch — a flare in the character's colour at the sender's seat and a
 *    badge (their character + the sticker's name);
 * 2. flight — along its path (arc, bounce, loop-de-loop, from the sky, a
 *    beam…) with a trail of little bits;
 * 3. the hit — the item's own finish (lands on their head, sticks, thumps),
 *    a flash, shockwaves, the screen glowing from the target, particle
 *    bursts, a stamp on the target, a spinning halo in the character's
 *    colour, a comic word, and the target's photo reacting.
 *
 * Under reduced motion nothing flies or shakes: the item, its stamp and the
 * word simply show on the target for a moment.
 */

type Point = { x: number; y: number }

/** A player's photo on screen (marked `data-throw-anchor`, see components/live/throwables). */
function anchorOf(uid: string): { el: HTMLElement; at: Point; r: number } | null {
  const el = document.querySelector<HTMLElement>(`[data-throw-anchor="${CSS.escape(uid)}"]`)
  if (!el) return null
  const b = el.getBoundingClientRect()
  return { el, at: { x: b.left + b.width / 2, y: b.top + b.height / 2 }, r: Math.min(b.width, b.height) / 2 }
}

const prefersReducedMotion = () =>
  typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches

const rand = (a: number, b: number) => a + Math.random() * (b - a)
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

/** A sticker's flying art, for pickers and lists. */
export function CharStickerArt({ sticker, className }: { sticker: CharSticker; className?: string }) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden className={cn("size-10", className)}>
      {sticker.art}
    </svg>
  )
}

const CSS_RULES =
  ".cstk-live .cstk-eq{transform-box:fill-box;transform-origin:50% 100%;animation:cstk-eq .3s ease-in-out infinite alternate}" +
  "@keyframes cstk-eq{from{transform:scaleY(.25)}to{transform:scaleY(1)}}" +
  ".cstk-bloom{transform-box:fill-box;transform-origin:center;transform:scale(0)}" +
  ".cstk-live .cstk-bloom{animation:cstk-bloom .45s cubic-bezier(.3,1.6,.5,1) both}" +
  "@keyframes cstk-bloom{from{transform:scale(0)}to{transform:scale(1)}}" +
  "@media (prefers-reduced-motion: reduce){.cstk-live .cstk-eq,.cstk-live .cstk-bloom{animation:none;transform:none}}"

const DEFAULT_DURATION: Record<FlightPath, number> = {
  arc: 0.9,
  straight: 0.4,
  bounce: 1.1,
  loop: 1.25,
  sky: 0.6,
  drop: 1.3,
  hover: 0.9,
  beam: 0.16,
}

const EASE: Record<FlightPath, string> = {
  arc: "power1.inOut",
  straight: "power2.in",
  bounce: "none",
  loop: "sine.inOut",
  sky: "power2.in",
  drop: "power1.out",
  hover: "power2.out",
  beam: "none",
}

export function CharStickerFlight({
  id,
  character,
  sticker,
  from,
  to,
  onDone,
}: {
  id: string
  character: string
  sticker: CharSticker
  from: string
  to: string
  onDone: (key: string) => void
}) {
  const root = React.useRef<HTMLDivElement>(null)
  const def = characterById(character)
  const accent = def?.accent ?? "#f59e0b"
  const { flight, impact } = sticker
  const size = flight.size ?? 60
  const count = flight.count ?? 1

  React.useLayoutEffect(() => {
    const box = root.current
    const target = anchorOf(to)
    if (!box || !target) {
      onDone(id)
      return
    }
    const host: HTMLElement = box
    const q = <T extends Element = HTMLElement>(sel: string) => box.querySelector<T>(sel)
    const shots = Array.from(box.querySelectorAll<HTMLElement>("[data-shot]"))
    const fx = q("[data-fx=layer]")!
    const badge = q("[data-fx=badge]")!
    const charge = q("[data-fx=charge]")!
    const stamp = q("[data-fx=stamp]")
    const word = q("[data-fx=word]")
    const tint = q("[data-fx=tint]")
    const halo = q("[data-fx=halo]")!

    const W = window.innerWidth
    const H = window.innerHeight
    const end = target.at
    // Sizes follow the target's photo (big seats get big effects), within reason
    const u = Math.max(26, target.r)
    const k = clamp(u / 30, 0.9, 1.6)
    const sender = anchorOf(from)
    const home = sender?.at ?? { x: W / 2, y: H - 60 }
    const homeR = sender?.r ?? 0
    const side = end.x > W / 2 ? -1 : 1
    const reduced = prefersReducedMotion()

    // Badge over the sender, the word over the target (under it when there's no room above)
    const half = (el: HTMLElement) => el.offsetWidth / 2 + 8
    gsap.set(badge, {
      x: clamp(home.x, half(badge), W - half(badge)),
      y: home.y - homeR - 20 < 24 ? home.y + homeR + 20 : home.y - homeR - 20,
      xPercent: -50,
      yPercent: -50,
    })
    gsap.set(charge, { x: home.x, y: home.y, xPercent: -50, yPercent: -50 })
    gsap.set(fx, { x: end.x, y: end.y })
    if (word) {
      gsap.set(word, {
        x: clamp(end.x, half(word), W - half(word)),
        y: end.y - u - 30 < 36 ? end.y + u + 30 : end.y - u - 30,
        xPercent: -50,
        yPercent: -50,
      })
    }
    const st = impact.stamp
    if (stamp && st) {
      const w = st.size * u
      Object.assign(stamp.style, { width: `${w}px`, height: `${w * (st.ratio ?? 1)}px` })
      gsap.set(stamp, { x: end.x, y: end.y + (st.dy ?? 0) * u, xPercent: -50, yPercent: -50 })
    }
    const ringSize = 2 * u + 28
    Object.assign(halo.style, { width: `${ringSize}px`, height: `${ringSize}px`, left: `${-ringSize / 2}px`, top: `${-ringSize / 2}px` })
    if (tint && impact.tint) {
      tint.style.background = `radial-gradient(circle at ${end.x}px ${end.y}px, ${impact.tint} 0%, transparent ${Math.round(Math.max(W, H) * 0.55)}px)`
    }

    const tl = gsap.timeline({ onComplete: () => onDone(id), defaults: { immediateRender: false } })
    const loose: gsap.core.Tween[] = []

    // The sender's flare and badge
    tl.fromTo(badge, { scale: 0.4, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.3, ease: "back.out(2.5)" }, 0)
    tl.to(badge, { opacity: 0, y: "-=10", duration: 0.35, ease: "power1.in" }, reduced ? 1.6 : 1.5)

    if (reduced) {
      // Just show it on the target, with its stamp and word
      gsap.set(shots, { x: end.x, y: end.y, xPercent: -50, yPercent: -50, opacity: 0, scale: 1, rotation: 0 })
      tl.add(() => playSound(sticker.sound), 0.1)
      tl.to(shots[0], { opacity: 1, duration: 0.2 }, 0.1)
      tl.to(shots[0], { opacity: 0, duration: 0.3 }, 1.5)
      if (stamp) {
        stamp.classList.add("cstk-live")
        gsap.set(stamp.querySelectorAll("[data-draw]"), { attr: { "stroke-dasharray": "none" } })
        tl.to(stamp, { opacity: 1, duration: 0.2 }, 0.15)
        tl.to(stamp, { opacity: 0, duration: 0.3 }, 1.5)
      }
      if (word) {
        tl.to(word, { opacity: 1, duration: 0.2 }, 0.2)
        tl.to(word, { opacity: 0, duration: 0.3 }, 1.5)
      }
      return () => {
        tl.kill()
      }
    }

    tl.fromTo(charge, { scale: 0.3, opacity: 1 }, { scale: 2.4, opacity: 0, duration: 0.5, ease: "power2.out" }, 0.05)

    /* ── Flight ───────────────────────────────────────────── */

    const path = flight.path
    const duration = flight.duration ?? DEFAULT_DURATION[path]
    const lift = flight.lift ?? (path === "bounce" ? 70 : path === "loop" ? 60 : 90)
    const start: Point =
      path === "sky" ? { x: end.x + side * 200, y: -80 } : path === "drop" ? { x: end.x + side * 40, y: -90 } : home
    const goal: Point = path === "hover" ? { x: end.x, y: end.y - u * 2.4 } : end
    // Volley copies spread across the face, side by side
    const dir0 = { x: goal.x - start.x, y: goal.y - start.y }
    const len0 = Math.hypot(dir0.x, dir0.y) || 1
    const f = { x: dir0.x / len0, y: dir0.y / len0 }
    const perp = { x: -f.y, y: f.x }
    const up = perp.y <= 0 ? perp : { x: -perp.x, y: -perp.y }
    const ends = shots.map((_, i) => {
      const o = (i - (count - 1) / 2) * u * 0.7
      return { x: goal.x + perp.x * o, y: goal.y + perp.y * o }
    })

    const LOOP_AT = 0.3
    const LOOP_W = 0.4
    const pos = (t: number, e: Point): Point => {
      const dx = e.x - start.x
      const dy = e.y - start.y
      switch (path) {
        case "bounce":
          return { x: start.x + dx * t, y: start.y + dy * t - Math.abs(Math.sin(Math.PI * 3 * t)) * lift * (1 - t * 0.45) }
        case "loop": {
          // The base arc pauses while it flies a full loop, climbing first
          const b = t < LOOP_AT ? t / (1 - LOOP_W) : t < LOOP_AT + LOOP_W ? LOOP_AT / (1 - LOOP_W) : (t - LOOP_W) / (1 - LOOP_W)
          const base = { x: start.x + dx * b, y: start.y + dy * b - lift * 4 * b * (1 - b) }
          if (t < LOOP_AT || t > LOOP_AT + LOOP_W) return base
          const th = ((t - LOOP_AT) / LOOP_W) * Math.PI * 2
          const R = 34 * k
          return {
            x: base.x + up.x * R * (1 - Math.cos(th)) + f.x * R * Math.sin(th),
            y: base.y + up.y * R * (1 - Math.cos(th)) + f.y * R * Math.sin(th),
          }
        }
        case "drop":
          return { x: start.x + dx * t + Math.sin(t * Math.PI * 3) * 22 * (1 - t), y: start.y + dy * t }
        case "arc":
        case "hover":
          return { x: start.x + dx * t, y: start.y + dy * t - (path === "hover" ? 50 : lift) * 4 * t * (1 - t) }
        default:
          return { x: start.x + dx * t, y: start.y + dy * t }
      }
    }
    const heading = (t: number, e: Point) => {
      const a = pos(Math.max(0, t - 0.02), e)
      const b = pos(Math.min(1, t + 0.02), e)
      return (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI
    }
    const turn = (t: number, e: Point) =>
      flight.aim !== undefined
        ? heading(path === "beam" ? 1 : t, e) - flight.aim
        : path === "drop"
          ? Math.sin(t * Math.PI * 4) * 12
          : (flight.spin ?? 0) * t

    // The trail
    const trail = flight.trail
    let trailed = 0
    const dropTrail = (p: Point) => {
      if (!trail || trailed > 46) return
      trailed++
      const s = 11 * k * rand(0.7, 1.25)
      const el = document.createElement("span")
      Object.assign(el.style, { position: "absolute", left: `${-s / 2}px`, top: `${-s / 2}px`, width: `${s}px`, height: `${s}px` })
      el.innerHTML = shapeSvg(trail.shape, trail.colours[trailed % trail.colours.length])
      box.appendChild(el)
      gsap.set(el, { x: p.x + rand(-5, 5), y: p.y + rand(-5, 5), rotation: rand(0, 360) })
      loose.push(
        gsap.to(el, {
          opacity: 0,
          scale: 0.2,
          x: `+=${rand(-10, 10)}`,
          y: `+=${rand(-6, 16)}`,
          duration: 0.6,
          ease: "power1.out",
          onComplete: () => el.remove(),
        })
      )
    }

    // Lands (the last of a volley); a beam hits as soon as it reaches
    let hit = 0.4 + (count - 1) * 0.13 + duration
    if (path === "beam") {
      // The gun appears at the sender, turned on the target, kicks back as it fires
      const shot = shots[0]
      const muzzle = { x: home.x + f.x * size * 0.45, y: home.y + f.y * size * 0.45 }
      gsap.set(shot, { x: home.x, y: home.y, xPercent: -50, yPercent: -50, opacity: 0, scale: 0.4, rotation: turn(1, end) })
      tl.to(shot, { opacity: 1, scale: 1.15, duration: 0.2, ease: "back.out(2)" }, 0.15)
      tl.to(shot, { x: home.x - f.x * 10, y: home.y - f.y * 10, duration: 0.06, yoyo: true, repeat: 1 }, 0.45)
      const beam = q<SVGSVGElement>("[data-fx=beam]")
      if (beam) {
        const pts: Point[] = [muzzle]
        if (flight.beam?.jagged) {
          for (let i = 1; i < 9; i++) {
            const t = i / 9
            const o = rand(-16, 16) * k
            pts.push({ x: muzzle.x + (end.x - muzzle.x) * t + perp.x * o, y: muzzle.y + (end.y - muzzle.y) * t + perp.y * o })
          }
        }
        pts.push(end)
        const points = pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ")
        const lines = beam.querySelectorAll("polyline")
        lines.forEach((l) => l.setAttribute("points", points))
        gsap.set(lines, { attr: { "stroke-dasharray": "1 1", "stroke-dashoffset": 1 } })
        tl.set(beam, { opacity: 1 }, 0.45)
        tl.to(lines, { attr: { "stroke-dashoffset": 0 }, duration: 0.16, ease: "power2.in" }, 0.45)
        tl.to(beam, { opacity: 0.35, duration: 0.05, yoyo: true, repeat: 5, ease: "steps(1)" }, 0.62)
        tl.to(beam, { opacity: 0, duration: 0.25 }, 0.95)
      }
      hit = 0.61
      tl.to(shot, { opacity: 0, scale: 0.7, duration: 0.3 }, 1.2)
    } else {
      shots.forEach((shot, i) => {
        const e = ends[i]
        const at = 0.3 + i * 0.13
        const proxy = { t: 0 }
        let last = start
        gsap.set(shot, { x: start.x, y: start.y, xPercent: -50, yPercent: -50, opacity: 0, scale: 0.4, rotation: turn(0, e) })
        tl.to(shot, { opacity: 1, scale: 1.1, duration: 0.16, ease: "back.out(2)" }, at)
        tl.to(
          proxy,
          {
            t: 1,
            duration,
            ease: EASE[path],
            onUpdate: () => {
              const p = pos(proxy.t, e)
              gsap.set(shot, {
                x: p.x,
                y: p.y,
                rotation: turn(proxy.t, e),
                scale: path === "sky" ? 1.35 : path === "drop" ? 1.1 : 1.05 + 0.25 * Math.sin(Math.PI * proxy.t),
              })
              if (Math.hypot(p.x - last.x, p.y - last.y) > 18 * k) {
                last = p
                dropTrail(p)
              }
            },
          },
          at + 0.1
        )
        const lands = at + 0.1 + duration
        if (count > 1) {
          // Every star in a volley lands with its own clink
          tl.add(() => playSound(sticker.sound), lands)
          tl.add(() => sparks(e, 6), lands)
          tl.to(shot, { scale: 1.25, duration: 0.06, yoyo: true, repeat: 1 }, lands)
        }
        itemHit(shot, e, lands)
      })
    }

    function itemHit(el: HTMLElement, e: Point, at: number) {
      switch (impact.item) {
        case "pop":
          tl.to(el, { scale: 2, opacity: 0, duration: 0.3, ease: "power2.out" }, at)
          break
        case "smash":
          tl.to(el, { scaleX: 1.7, scaleY: 0.45, duration: 0.08, ease: "power2.in" }, at)
          tl.set(el, { opacity: 0 }, at + 0.1)
          break
        case "stick":
          tl.to(el, { scale: 1.2, duration: 0.08 }, at)
          tl.to(el, { opacity: 0, scale: 0.85, duration: 0.3 }, hit + 1)
          break
        case "land":
          tl.to(el, { x: e.x, y: e.y - u * 0.95, rotation: 0, scale: 1, duration: 0.45, ease: "bounce.out" }, at)
          tl.to(el, { opacity: 0, y: `-=${12}`, duration: 0.35 }, at + 1.4)
          break
        case "thump":
          tl.to(el, { scale: 1.45, duration: 0.09, yoyo: true, repeat: 7, ease: "power1.inOut" }, at)
          tl.to(el, { opacity: 0, scale: 0.8, duration: 0.3 }, at + 1)
          break
        case "tilt":
          tl.to(el, { rotation: -35, duration: 0.15, ease: "power2.out" }, at)
          tl.to(el, { rotation: 15, duration: 0.15, yoyo: true, repeat: 1 }, at + 0.15)
          tl.to(el, { opacity: 0, scale: 0.7, duration: 0.3 }, at + 0.9)
          break
        case "bob":
          tl.to(el, { y: `-=${8}`, duration: 0.22, yoyo: true, repeat: 5, ease: "sine.inOut" }, at)
          tl.to(el, { x: `+=${side * -90}`, y: -120, opacity: 0, rotation: side * -20, duration: 0.55, ease: "power2.in" }, at + 1.45)
          break
      }
    }

    /* ── The hit ──────────────────────────────────────────── */

    function particles(b: Burst, at: number, origin: Point = { x: 0, y: 0 }) {
      const motion = b.motion ?? "burst"
      for (let i = 0; i < b.count; i++) {
        const s = (b.size ?? 12) * k * rand(0.75, 1.25)
        const el = document.createElement("span")
        Object.assign(el.style, { position: "absolute", left: `${-s / 2}px`, top: `${-s / 2}px`, width: `${s}px`, height: `${s}px`, opacity: "0" })
        el.innerHTML = shapeSvg(b.shape, b.colours[i % b.colours.length])
        fx.appendChild(el)
        const a = (i / b.count) * Math.PI * 2 + rand(0, 0.5)
        const reach = b.reach * k * rand(0.6, 1.1)
        const ox = origin.x
        const oy = origin.y
        if (motion === "burst") {
          tl.fromTo(
            el,
            { x: ox, y: oy, scale: 1.1, opacity: 1, rotation: rand(0, 360) },
            { x: ox + Math.cos(a) * reach, y: oy + Math.sin(a) * reach + reach * 0.25, scale: 0.3, opacity: 0, rotation: `+=${rand(-200, 200)}`, duration: rand(0.7, 0.95), ease: "power2.out" },
            at
          )
        } else if (motion === "rise") {
          const x0 = ox + rand(-0.8, 0.8) * u
          tl.fromTo(
            el,
            { x: x0, y: oy + rand(-0.2, 0.4) * u, scale: 0.4, opacity: 1, rotation: rand(-20, 20) },
            { x: x0 + rand(-26, 26), y: `-=${reach * rand(0.9, 1.3)}`, scale: 1.1, opacity: 0, duration: rand(1, 1.3), ease: "power1.in" },
            at + rand(0, 0.25)
          )
        } else if (motion === "fall") {
          const x0 = ox + rand(-1, 1) * reach * 0.9
          tl.fromTo(
            el,
            { x: x0, y: oy - reach * rand(0.5, 1), scale: 1, opacity: 1, rotation: rand(0, 360) },
            { x: x0 + rand(-24, 24), y: `+=${reach * rand(1, 1.5)}`, rotation: `+=${rand(-300, 300)}`, opacity: 0, duration: rand(1.1, 1.5), ease: "sine.in" },
            at + rand(0, 0.3)
          )
        } else {
          // A spiral out
          const spin = { s: 0 }
          const dirn = i % 2 ? 1 : -1
          tl.fromTo(
            spin,
            { s: 0 },
            {
              s: 1,
              duration: rand(0.85, 1.1),
              ease: "power2.out",
              onUpdate: () => {
                const r = reach * spin.s
                const th = a + dirn * spin.s * Math.PI * 1.2
                gsap.set(el, { x: ox + Math.cos(th) * r, y: oy + Math.sin(th) * r, opacity: 1 - spin.s * spin.s, rotation: th * 57, scale: 1.1 - spin.s * 0.5 })
              },
            },
            at
          )
        }
      }
    }
    function sparks(e: Point, n: number) {
      // A volley's little clinks happen off the timeline (they're already at `lands`)
      for (let i = 0; i < n; i++) {
        const s = 8 * k
        const el = document.createElement("span")
        Object.assign(el.style, { position: "absolute", left: `${-s / 2}px`, top: `${-s / 2}px`, width: `${s}px`, height: `${s}px` })
        el.innerHTML = shapeSvg("sparkle", i % 2 ? "#ffffff" : "#fde68a")
        host.appendChild(el)
        const a = rand(0, Math.PI * 2)
        gsap.set(el, { x: e.x, y: e.y })
        loose.push(gsap.to(el, { x: e.x + Math.cos(a) * 34 * k, y: e.y + Math.sin(a) * 34 * k, opacity: 0, scale: 0.3, duration: 0.45, ease: "power2.out", onComplete: () => el.remove() }))
      }
    }

    tl.addLabel("hit", hit)
    if (count === 1) tl.add(() => playSound(sticker.sound), "hit")
    const flash = q("[data-fx=flash]")!
    const core = q("[data-fx=core]")!
    tl.fromTo(flash, { scale: 0.25, opacity: 1 }, { scale: 3.8, opacity: 0, duration: 0.8, ease: "power2.out" }, "hit")
    tl.fromTo(core, { scale: 0.3, opacity: 1 }, { scale: 1.8, opacity: 0, duration: 0.28, ease: "power1.out" }, "hit")
    box.querySelectorAll<HTMLElement>("[data-fx=ring]").forEach((r, i) =>
      tl.fromTo(r, { scale: 0.3, opacity: 0.95 }, { scale: 4.2 + i * 0.9, opacity: 0, duration: 0.85 + i * 0.15, ease: "power2.out" }, `hit+=${0.04 + i * 0.11}`)
    )
    if (tint) tl.fromTo(tint, { opacity: 0.6 }, { opacity: 0, duration: 1, ease: "power2.out" }, "hit")
    // The character's halo: a spinning ring in its colour, the "this was Zenko" moment
    tl.fromTo(halo, { scale: 0.6, opacity: 0, rotation: 0 }, { scale: 1, opacity: 1, duration: 0.3, ease: "back.out(2)" }, "hit+=0.05")
    tl.to(halo, { rotation: 300, duration: 1.3, ease: "none" }, "hit+=0.05")
    tl.to(halo, { opacity: 0, scale: 1.25, duration: 0.35, ease: "power1.in" }, "hit+=1.05")
    impact.bursts.forEach((b) => particles(b, hit + (b.delay ?? 0)))

    if (stamp && st) {
      const hold = st.hold ?? 0.9
      const at = hit + 0.05
      tl.add(() => stamp.classList.add("cstk-live"), at)
      const y0 = Number(gsap.getProperty(stamp, "y"))
      switch (st.motion) {
        case "pop":
          tl.fromTo(stamp, { scale: 0.2, opacity: 0, rotation: -12 }, { scale: 1, opacity: 1, rotation: 0, duration: 0.32, ease: "back.out(2.5)" }, at)
          break
        case "grow":
          tl.fromTo(stamp, { scale: 0, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.45, ease: "power3.out" }, at)
          break
        case "spin":
          tl.fromTo(stamp, { scale: 0.3, opacity: 0, rotation: -90 }, { scale: 1, opacity: 1, rotation: 0, duration: 0.4, ease: "back.out(1.8)" }, at)
          tl.to(stamp, { rotation: 140, duration: hold + 0.4, ease: "none" }, at + 0.4)
          break
        case "drop":
          tl.fromTo(stamp, { y: y0 - 70, opacity: 0 }, { y: y0, opacity: 1, duration: 0.55, ease: "bounce.out" }, at)
          break
        case "draw": {
          const paths = stamp.querySelectorAll("[data-draw]")
          gsap.set(paths, { attr: { "stroke-dasharray": "1 1", "stroke-dashoffset": 1 } })
          tl.set(stamp, { opacity: 1 }, at)
          tl.to(paths, { attr: { "stroke-dashoffset": 0 }, duration: 0.32, stagger: 0.07, ease: "power2.out" }, at)
          break
        }
        case "unroll":
          tl.fromTo(stamp, { scaleX: 0, opacity: 1 }, { scaleX: 1, duration: 0.42, ease: "power2.out" }, at)
          break
      }
      tl.to(stamp, { opacity: 0, scale: st.motion === "draw" ? 1 : 1.12, duration: 0.35, ease: "power1.in" }, at + 0.4 + hold)
    }

    if (word) {
      tl.fromTo(word, { scale: 0.2, opacity: 0, rotation: -16 }, { scale: 1, opacity: 1, rotation: -6, duration: 0.34, ease: "back.out(3)" }, "hit+=0.12")
      tl.to(word, { y: "-=14", opacity: 0, duration: 0.4, ease: "power1.in" }, "hit+=1.25")
    }

    // How the target takes it
    const T = target.el
    const ux = f.x
    const uy = f.y
    const react = impact.react
    if (react) {
      // Yoyos end on their start values, where a tween's own clearProps never fires: clear on complete instead
      tl.add(() => {
        switch (react) {
          case "shake":
            gsap.fromTo(T, { x: -8 }, { x: 8, duration: 0.05, repeat: 11, yoyo: true, ease: "none", onComplete: () => void gsap.set(T, { clearProps: "x" }) })
            break
          case "knock":
            gsap.fromTo(T, { x: ux * 18, y: uy * 18 }, { x: 0, y: 0, duration: 0.65, ease: "elastic.out(1, 0.35)", onComplete: () => void gsap.set(T, { clearProps: "x,y" }) })
            break
          case "yank":
            gsap.fromTo(T, { x: -ux * 20, y: -uy * 20 }, { x: 0, y: 0, duration: 0.7, ease: "elastic.out(1, 0.3)", onComplete: () => void gsap.set(T, { clearProps: "x,y" }) })
            break
          case "squash":
            gsap.fromTo(T, { scaleX: 1.25, scaleY: 0.7 }, { scaleX: 1, scaleY: 1, duration: 0.6, ease: "elastic.out(1, 0.4)", onComplete: () => void gsap.set(T, { clearProps: "scale,scaleX,scaleY" }) })
            break
          case "lift":
            gsap.fromTo(T, { y: 0 }, { y: -14, duration: 0.18, yoyo: true, repeat: 1, ease: "power2.out", onComplete: () => void gsap.set(T, { clearProps: "y" }) })
            break
          case "spin":
            gsap.fromTo(T, { rotation: 0 }, { rotation: 360, duration: 0.75, ease: "back.out(1.4)", onComplete: () => void gsap.set(T, { clearProps: "rotation" }) })
            break
          case "flicker":
            gsap.fromTo(T, { opacity: 0.15 }, { opacity: 1, duration: 0.07, repeat: 7, yoyo: true, ease: "steps(1)", onComplete: () => void gsap.set(T, { clearProps: "opacity" }) })
            break
          case "wobble":
            gsap.fromTo(T, { rotation: -10 }, { rotation: 10, duration: 0.09, repeat: 7, yoyo: true, ease: "sine.inOut", onComplete: () => void gsap.set(T, { clearProps: "rotation" }) })
            break
        }
      }, "hit")
    }
    tl.to({}, { duration: 0.2 })

    return () => {
      tl.kill()
      loose.forEach((t) => t.kill())
    }
    // Plays once, for this sticker
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const [f0, f1, f2] = impact.flash
  return (
    <div ref={root} className="absolute inset-0">
      <style>{CSS_RULES}</style>
      {impact.tint && <div data-fx="tint" className="fixed inset-0 opacity-0" />}
      {flight.path === "beam" && flight.beam && (
        <svg data-fx="beam" className="fixed inset-0 size-full opacity-0" aria-hidden>
          <polyline pathLength={1} fill="none" stroke={flight.beam.glow} strokeWidth="12" strokeLinejoin="round" strokeLinecap="round" opacity="0.55" />
          <polyline pathLength={1} fill="none" stroke={flight.beam.core} strokeWidth="4" strokeLinejoin="round" strokeLinecap="round" />
        </svg>
      )}
      <span
        data-fx="charge"
        className="absolute top-0 left-0 size-20 rounded-full opacity-0"
        style={{ background: `radial-gradient(circle, #ffffff 0%, ${accent} 40%, transparent 70%)` }}
      />
      <div data-fx="layer" className="absolute top-0 left-0">
        <span
          data-fx="halo"
          className="absolute rounded-full opacity-0"
          style={{
            background: `conic-gradient(from 0deg, ${accent}, #ffffff, ${accent}, transparent, ${accent}, #ffffff, ${accent})`,
            mask: "radial-gradient(farthest-side, transparent calc(100% - 6px), #000 calc(100% - 5px))",
            WebkitMask: "radial-gradient(farthest-side, transparent calc(100% - 6px), #000 calc(100% - 5px))",
            filter: `drop-shadow(0 0 6px ${accent})`,
          }}
        />
        <span
          data-fx="flash"
          className="absolute -top-16 -left-16 size-32 rounded-full opacity-0"
          style={{ background: `radial-gradient(circle, ${f0} 0%, ${f1} 30%, ${f2} 55%, transparent 72%)` }}
        />
        <span data-fx="core" className="absolute -top-8 -left-8 size-16 rounded-full bg-white opacity-0 blur-[2px]" />
        {(impact.rings ?? []).map((c, i) => (
          <span
            key={i}
            data-fx="ring"
            className={cn("absolute -top-10 -left-10 size-20 rounded-full opacity-0", i === 0 ? "border-[5px]" : "border-[3px]")}
            style={{ borderColor: c, boxShadow: i === 0 ? `0 0 12px ${c}` : undefined }}
          />
        ))}
      </div>
      {impact.stamp && (
        <div data-fx="stamp" className="absolute top-0 left-0 opacity-0 drop-shadow-md">
          {impact.stamp.art}
        </div>
      )}
      {Array.from({ length: count }, (_, i) => (
        <div key={i} data-shot className="absolute top-0 left-0 opacity-0 drop-shadow-lg" style={{ width: size, height: size }}>
          <CharStickerArt sticker={sticker} className="size-full" />
        </div>
      ))}
      {impact.word && (
        <span
          data-fx="word"
          className="absolute top-0 left-0 text-[26px] leading-none font-black tracking-tight whitespace-nowrap italic opacity-0"
          style={{
            color: impact.word.fill,
            WebkitTextStroke: `6px ${impact.word.stroke}`,
            paintOrder: "stroke fill",
            filter: "drop-shadow(0 3px 0 rgba(0,0,0,.25))",
          }}
        >
          {impact.word.text}
        </span>
      )}
      <span
        data-fx="badge"
        className="absolute top-0 left-0 flex items-center gap-1.5 rounded-full py-0.5 pr-3 pl-0.5 text-xs font-bold whitespace-nowrap text-white opacity-0"
        style={{ background: `linear-gradient(135deg, ${accent}, #1c1530)`, boxShadow: `0 0 0 1.5px #ffffffaa, 0 4px 16px -2px ${accent}` }}
      >
        <GameAvatar character={character} name={def?.name ?? character} size={22} />
        {sticker.name}
      </span>
    </div>
  )
}
