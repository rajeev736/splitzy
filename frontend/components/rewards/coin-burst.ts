"use client"

import { playCoinTing } from "./ui-sounds"

/**
 * The game-style coin collect: a burst of coins pops out of where they were
 * won, then each flies in an arc into the coin counter (any element marked
 * `data-coin-target`; with none on screen, the top-right corner), landing with
 * a "ting" while the counter bumps. Drawn on one fixed layer straight in the
 * DOM with the Web Animations API — transform and opacity only, so nothing
 * re-lays out and React never re-renders for it. With reduced motion it's a
 * quick "+N" fade at the counter and a single ting.
 *
 * Use it for every coin claim (level rewards, game winnings…) — not for the
 * welcome bonus, which has its own moment.
 */

export type CoinOrigin = DOMRect | { x: number; y: number } | Element | null | undefined

const COIN = 28
const fmt = new Intl.NumberFormat("en-IN")

let layer: HTMLDivElement | null = null

function getLayer(): HTMLDivElement {
  if (layer && layer.isConnected) return layer
  layer = document.createElement("div")
  layer.setAttribute("aria-hidden", "true")
  layer.dataset.coinBurst = ""
  Object.assign(layer.style, {
    position: "fixed",
    inset: "0",
    zIndex: "120",
    pointerEvents: "none",
    overflow: "hidden",
    contain: "strict",
  } satisfies Partial<CSSStyleDeclaration>)
  // Shared gradients for every coin sprite
  layer.innerHTML = `<svg width="0" height="0" style="position:absolute"><defs>
<linearGradient id="cb-rim" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe08a"/><stop offset="1" stop-color="#d98a0b"/></linearGradient>
<linearGradient id="cb-face" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffd34d"/><stop offset="1" stop-color="#f0a30a"/></linearGradient>
</defs></svg>`
  document.body.appendChild(layer)
  return layer
}

const COIN_SVG = `<svg viewBox="0 0 24 24" width="${COIN}" height="${COIN}" style="display:block;filter:drop-shadow(0 2px 2px rgba(120,60,0,.35))">
<circle cx="12" cy="12" r="11" fill="url(#cb-rim)"/>
<circle cx="12" cy="12" r="8.4" fill="url(#cb-face)" stroke="#c47a06" stroke-opacity=".35" stroke-width=".8"/>
<path d="M12 7.2l1.42 2.9 3.2.46-2.31 2.25.55 3.18L12 14.5l-2.86 1.5.55-3.18-2.31-2.25 3.2-.46z" fill="#fff6d6" stroke="#c47a06" stroke-opacity=".45" stroke-width=".6" stroke-linejoin="round"/>
<path d="M5.6 8.2A7.5 7.5 0 0 1 10 4.6" stroke="#fff" stroke-opacity=".7" stroke-width="1.2" stroke-linecap="round" fill="none"/>
</svg>`

function sprite(html: string, extra?: Partial<CSSStyleDeclaration>): HTMLDivElement {
  const el = document.createElement("div")
  el.innerHTML = html
  Object.assign(el.style, {
    position: "absolute",
    left: "0",
    top: "0",
    willChange: "transform, opacity",
    opacity: "0",
    ...extra,
  } satisfies Partial<CSSStyleDeclaration>)
  getLayer().appendChild(el)
  return el
}

function centerOf(from: CoinOrigin): { x: number; y: number } {
  if (from && typeof (from as Element).getBoundingClientRect === "function") {
    from = (from as Element).getBoundingClientRect()
  }
  if (from && "width" in from) return { x: from.left + from.width / 2, y: from.top + from.height / 2 }
  if (from && "x" in from) return { x: from.x, y: from.y }
  return { x: window.innerWidth / 2, y: window.innerHeight * 0.55 }
}

/** The coin counter on screen (the first visible `[data-coin-target]`), if any. */
function findTarget(): Element | null {
  const all = document.querySelectorAll("[data-coin-target]")
  for (const el of all) {
    const r = el.getBoundingClientRect()
    if (r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < window.innerHeight && r.right > 0 && r.left < window.innerWidth)
      return el
  }
  return null
}

function targetPoint(target: Element | null): { x: number; y: number } {
  if (target) {
    const r = target.getBoundingClientRect()
    // The coin icon usually sits at the chip's left: aim a little left of centre
    return { x: r.left + Math.min(r.width / 2, 18), y: r.top + r.height / 2 }
  }
  return { x: window.innerWidth - 32, y: 30 }
}

let bumping: Animation | null = null
function bump(target: Element | null) {
  if (!target || typeof (target as HTMLElement).animate !== "function") return
  bumping?.cancel()
  const frames = [{ transform: "scale(1)" }, { transform: "scale(1.18)", offset: 0.35 }, { transform: "scale(1)" }]
  try {
    // "add" keeps whatever transform the counter already has
    bumping = target.animate(frames, { duration: 240, easing: "ease-out", composite: "add" })
  } catch {
    bumping = target.animate(frames, { duration: 240, easing: "ease-out" })
  }
}

/** A soft gold ring flashing where the coins land. */
function flash(at: { x: number; y: number }) {
  const s = 44
  const el = sprite("", {
    width: `${s}px`,
    height: `${s}px`,
    borderRadius: "50%",
    boxShadow: "0 0 0 3px rgba(255,214,90,.9), 0 0 18px rgba(255,200,60,.8)",
  })
  const t = `translate(${at.x - s / 2}px, ${at.y - s / 2}px)`
  el.animate(
    [
      { transform: `${t} scale(.3)`, opacity: 0.9 },
      { transform: `${t} scale(1.15)`, opacity: 0 },
    ],
    { duration: 380, easing: "ease-out" }
  ).onfinish = () => el.remove()
}

/** "+1,250" rising and fading at `at`. */
function plusLabel(amount: number, at: { x: number; y: number }, delay = 0) {
  const el = sprite(`+${fmt.format(amount)}`, {
    font: `700 22px var(--font-game), ui-rounded, system-ui, sans-serif`,
    color: "#ffd23f",
    whiteSpace: "nowrap",
    textShadow: "0 2px 0 #b9660a, 0 0 2px #7a3e00, 0 4px 10px rgba(0,0,0,.35)",
    letterSpacing: ".02em",
  })
  const w = el.offsetWidth || 60
  const x = at.x - w / 2
  el.animate(
    [
      { transform: `translate(${x}px, ${at.y - 6}px) scale(.6)`, opacity: 0 },
      { transform: `translate(${x}px, ${at.y - 26}px) scale(1.08)`, opacity: 1, offset: 0.25 },
      { transform: `translate(${x}px, ${at.y - 40}px) scale(1)`, opacity: 1, offset: 0.7 },
      { transform: `translate(${x}px, ${at.y - 58}px) scale(1)`, opacity: 0 },
    ],
    { duration: 1100, delay, easing: "ease-out", fill: "backwards" }
  ).onfinish = () => el.remove()
}

const reducedMotion = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false

/** How many sprites for `amount`: a handful for a few coins, a shower for thousands. */
const spriteCount = (amount: number) => Math.max(5, Math.min(14, Math.round(4 + Math.log10(Math.max(1, amount)) * 2)))

/**
 * Fly `amount` coins from `from` (an element, a rect or a point; default the
 * middle of the screen) into the coin counter. Fire and forget; resolves once
 * the last coin has landed.
 */
export function flyCoins({ from, amount }: { from?: CoinOrigin; amount: number }): Promise<void> {
  if (typeof window === "undefined" || typeof document === "undefined" || amount <= 0) return Promise.resolve()
  const target = findTarget()
  const end = targetPoint(target)

  if (reducedMotion()) {
    plusLabel(amount, { x: end.x, y: end.y + 34 })
    playCoinTing(2)
    bump(target)
    return Promise.resolve()
  }

  const start = centerOf(from)
  const n = spriteCount(amount)
  plusLabel(amount, start)
  let landed = 0

  return new Promise((resolve) => {
    for (let i = 0; i < n; i++) {
      const el = sprite(COIN_SVG)
      // Burst: up and out from the origin
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.15
      const r = 38 + Math.random() * 58
      const p = { x: start.x + Math.cos(angle) * r, y: start.y + Math.sin(angle) * r * 0.85 }
      // Flight: a curve to the counter, bowing to one side
      const mid = { x: (p.x + end.x) / 2, y: (p.y + end.y) / 2 }
      const side = (Math.random() - 0.5) * 160
      const c = { x: mid.x + side, y: mid.y - 40 - Math.random() * 60 }
      const at = (t: number) => ({
        x: (1 - t) * (1 - t) * p.x + 2 * (1 - t) * t * c.x + t * t * end.x,
        y: (1 - t) * (1 - t) * p.y + 2 * (1 - t) * t * c.y + t * t * end.y,
      })
      const tr = (q: { x: number; y: number }, s: number, rot: number) =>
        `translate(${q.x - COIN / 2}px, ${q.y - COIN / 2}px) scale(${s}) rotate(${rot}deg)`
      const spin = (Math.random() < 0.5 ? -1 : 1) * (160 + Math.random() * 160)

      const frames: Keyframe[] = [
        { transform: tr(start, 0.2, 0), opacity: 0, offset: 0, easing: "cubic-bezier(.2,.9,.3,1.2)" },
        { transform: tr(p, 1.15, spin * 0.15), opacity: 1, offset: 0.24 },
        { transform: tr({ x: p.x, y: p.y - 6 }, 1, spin * 0.2), opacity: 1, offset: 0.34, easing: "ease-in" },
      ]
      // The arc, sampled so the coins speed up as they near the counter
      const steps = 6
      for (let k = 1; k <= steps; k++) {
        const t = k / steps
        frames.push({
          transform: tr(at(t * t * 0.4 + t * 0.6), 1 - 0.42 * t, spin * (0.2 + 0.8 * t)),
          opacity: 1,
          offset: 0.34 + 0.66 * t,
        })
      }

      const anim = el.animate(frames, {
        duration: 820 + Math.random() * 180,
        delay: i * 55 + Math.random() * 30,
        fill: "backwards",
      })
      anim.onfinish = () => {
        el.remove()
        playCoinTing(Math.floor((landed / n) * 6))
        bump(target)
        if (landed === 0) flash(end)
        landed += 1
        if (landed === n) {
          if (!target) flash(end)
          resolve()
        }
      }
      anim.oncancel = () => {
        el.remove()
        landed += 1
        if (landed === n) resolve()
      }
    }
  })
}
