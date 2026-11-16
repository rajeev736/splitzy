"use client"

import * as React from "react"

import type { SnakesColour } from "@/lib/live/snakes"
import { SHADES } from "../ludo/ludo-board"

/** A piece's spot in the board's box: px from its top-left (outside the box when it's off-screen). */
export interface EdgePoint {
  uid: string
  x: number
  y: number
  /** The square it's on (0 = at the gate), for the label. */
  pos: number
}

export interface EdgeMarkersHandle {
  /**
   * Lay the arrows out for these pieces in a `w` × `h` board. Call it from a
   * render loop or a scroll handler: it writes the DOM directly (only what
   * changed) and never re-renders.
   */
  update: (points: EdgePoint[], w: number, h: number) => void
}

/** The badge's radius, its centre's distance from the edge (room for the tip), and the spacing along an edge. */
const R = 12
const C = 22
const GAP = 29
/** A piece within this of the edge still counts as in view. */
const IN = 4
/** The button is a little bigger than the badge, for fingers. */
const HIT = 34

/** Room the boards' "Back to me" pill takes at the bottom right (arrows keep clear of it). */
export const BACK_PILL_W = 118

type Side = "top" | "bottom" | "left" | "right"
type Drawn = { on: boolean; x: number; y: number; a: number; label: string }

/**
 * Off-screen arrows: a small badge in each player's colour on the board's
 * edge nearest to their piece, its tip pointing at it, with the square
 * they're on — so you always know where the others are. Badges on one edge
 * are pushed apart so they never overlap; tapping one calls `onPick`.
 */
export function EdgeMarkers({
  ref,
  players,
  reserveBottomRight = 0,
  onPick,
}: {
  ref: React.Ref<EdgeMarkersHandle>
  players: { uid: string; colour: SnakesColour; name: string; isMe: boolean }[]
  /** Width kept clear at the bottom right (the "Back to me" pill). */
  reserveBottomRight?: number
  onPick: (uid: string) => void
}) {
  const els = React.useRef(new Map<string, HTMLButtonElement>())
  const drawn = React.useRef(new Map<string, Drawn>())
  const reserve = React.useRef(reserveBottomRight)
  React.useLayoutEffect(() => {
    reserve.current = reserveBottomRight
  }, [reserveBottomRight])

  React.useImperativeHandle(ref, () => {
    /** Write one badge, touching only what changed. */
    const draw = (uid: string, next: Drawn) => {
      const el = els.current.get(uid)
      if (!el) return
      const prev = drawn.current.get(uid)
      if (prev?.on !== next.on) el.dataset.on = next.on ? "1" : "0"
      if (!next.on) {
        drawn.current.set(uid, { ...(prev ?? next), on: false })
        return
      }
      if (!prev || Math.abs(prev.x - next.x) > 0.4 || Math.abs(prev.y - next.y) > 0.4)
        el.style.transform = `translate(${(next.x - HIT / 2).toFixed(1)}px, ${(next.y - HIT / 2).toFixed(1)}px)`
      if (!prev || Math.abs(prev.a - next.a) > 0.01) {
        const tip = el.firstElementChild as HTMLElement | null
        if (tip) tip.style.transform = `rotate(${next.a.toFixed(3)}rad)`
      }
      if (prev?.label !== next.label) {
        const label = el.lastElementChild
        if (label) label.textContent = next.label
      }
      drawn.current.set(uid, next)
    }
    return {
      update(points, w, h) {
        const sides: Record<Side, { p: EdgePoint; along: number }[]> = { top: [], bottom: [], left: [], right: [] }
        for (const p of points) {
          if (!els.current.has(p.uid)) continue
          if (p.x >= IN && p.x <= w - IN && p.y >= IN && p.y <= h - IN) continue
          const side: Side = p.y < IN ? "top" : p.y > h - IN ? "bottom" : p.x < IN ? "left" : "right"
          sides[side].push({ p, along: side === "top" || side === "bottom" ? p.x : p.y })
        }
        const shown = new Set<string>()
        for (const side of Object.keys(sides) as Side[]) {
          const list = sides[side].sort((a, b) => a.along - b.along)
          if (!list.length) continue
          const across = side === "top" || side === "bottom"
          const lo = C
          let hi = (across ? w : h) - C
          if (side === "bottom") hi -= reserve.current
          if (side === "right" && reserve.current) hi -= 40
          hi = Math.max(lo, hi)
          // Clamp to the edge, then push neighbours apart (forwards, backwards, and forwards again if they don't all fit)
          const c = list.map((m) => Math.max(lo, Math.min(hi, m.along)))
          for (let i = 1; i < c.length; i++) c[i] = Math.max(c[i], c[i - 1] + GAP)
          c[c.length - 1] = Math.min(c[c.length - 1], hi)
          for (let i = c.length - 2; i >= 0; i--) c[i] = Math.min(c[i], c[i + 1] - GAP)
          for (let i = 0; i < c.length; i++) c[i] = Math.max(c[i], lo + i * Math.min(GAP, (hi - lo) / Math.max(1, c.length - 1)))
          list.forEach(({ p }, i) => {
            const x = across ? c[i] : side === "left" ? C : w - C
            const y = across ? (side === "top" ? C : h - C) : c[i]
            shown.add(p.uid)
            draw(p.uid, { on: true, x, y, a: Math.atan2(p.y - y, p.x - x), label: p.pos > 0 ? String(p.pos) : "Go" })
          })
        }
        for (const [uid, d] of drawn.current) if (d.on && !shown.has(uid)) draw(uid, { ...d, on: false })
      },
    }
  }, [])

  return (
    <>
      {players.map((p) => {
        const s = SHADES[p.colour]
        return (
          <button
            key={p.uid}
            ref={(el) => {
              // (Re-attached on every render: what's drawn stays with the element, so it isn't forgotten here)
              if (!el) return
              els.current.set(p.uid, el)
              const d = drawn.current.get(p.uid)
              if (d && d.on !== (el.dataset.on === "1")) drawn.current.delete(p.uid)
              return () => {
                els.current.delete(p.uid)
              }
            }}
            type="button"
            data-on="0"
            onClick={() => onPick(p.uid)}
            aria-label={p.isMe ? "Show my piece" : `Show ${p.name}'s piece`}
            title={p.isMe ? "You" : p.name}
            className="pointer-events-none absolute top-0 left-0 z-10 flex items-center justify-center opacity-0 transition-opacity duration-200 data-[on=1]:pointer-events-auto data-[on=1]:opacity-100"
            style={{ width: HIT, height: HIT, transform: "translate(-200px, -200px)" }}
          >
            {/* The tip, turned to point at the piece */}
            <span aria-hidden className="absolute top-1/2 left-1/2 size-0">
              <svg viewBox="0 0 8 12" width="8" height="12" className="absolute -top-1.5 overflow-visible" style={{ left: R - 2 }}>
                <path d="M0 0.5 L7.5 6 L0 11.5 Z" fill={s.mid} stroke="#fff" strokeWidth="1.2" strokeLinejoin="round" />
              </svg>
            </span>
            <span
              aria-hidden
              className="relative flex items-center justify-center rounded-full font-extrabold leading-none text-white tabular-nums shadow-[0_2px_6px_rgb(0_0_0/0.45)]"
              style={{
                width: R * 2,
                height: R * 2,
                fontSize: 10,
                letterSpacing: "-0.02em",
                background: `radial-gradient(circle at 35% 30%, ${s.light}, ${s.mid} 55%, ${s.dark})`,
                boxShadow: `0 0 0 ${p.isMe ? 2.5 : 1.5}px #fff, 0 2px 6px rgb(0 0 0 / 0.45)`,
                textShadow: "0 1px 1px rgb(0 0 0 / 0.5)",
              }}
            />
          </button>
        )
      })}
    </>
  )
}
