"use client"

import * as React from "react"
import gsap from "gsap"

import type { SnakesColour, SnakesState } from "@/lib/live/snakes"
import { cn } from "@/lib/utils"
import { SHADES } from "../ludo/ludo-board"
import { SCENE_H, SCENE_W, standOf, type Pt } from "./geometry"
import { Scene, SCENE_CSS } from "./scene"
import { useTowerAnimation, type CameraHandle, type CharRefs } from "./use-tower-animation"

/** Where in the viewport the followed piece sits (share of the height from the top). */
const EYE_LINE = 0.56

/* ── Pieces ──────────────────────────────────────────────────────────── */

/** A little explorer in the player's colour, feet at (0, 0). */
function Character({
  colour,
  isMe,
  slot,
  dim,
  set,
}: {
  colour: SnakesColour
  isMe: boolean
  slot: number
  dim: boolean
  set: (k: keyof CharRefs, el: SVGGElement | SVGEllipseElement | null) => void
}) {
  const s = SHADES[colour]
  return (
    <g ref={(el) => set("root", el)} opacity={dim ? 0.35 : 1} style={{ transition: "opacity 0.4s" }}>
      <ellipse ref={(el) => set("shadow", el)} cx="0" cy="1" rx="9" ry="3.6" fill="#000" opacity="0.3" />
      <g ref={(el) => set("hop", el)}>
        <g className="s3d-idle" style={{ animationDelay: `${-slot * 0.45}s` }}>
          {/* Legs */}
          <rect x="-6" y="-7" width="4.6" height="8" rx="2" fill={s.dark} />
          <rect x="1.4" y="-7" width="4.6" height="8" rx="2" fill={s.dark} />
          {/* Body */}
          <rect x="-8.5" y="-23" width="17" height="18" rx="6.5" fill={s.mid} stroke={s.dark} strokeWidth="0.8" />
          <rect x="-6" y="-21.5" width="5" height="10" rx="2.5" fill={s.light} opacity="0.55" />
          {/* Arms */}
          <circle cx="-10" cy="-15" r="3" fill={s.mid} stroke={s.dark} strokeWidth="0.8" />
          <circle cx="10" cy="-15" r="3" fill={s.mid} stroke={s.dark} strokeWidth="0.8" />
          {/* Head and hat */}
          <circle cx="0" cy="-30" r="8" fill="#f8cfa6" stroke="#c98a5a" strokeWidth="0.6" />
          <circle cx="-3" cy="-30.5" r="1.3" fill="#1b1b1b" />
          <circle cx="3" cy="-30.5" r="1.3" fill="#1b1b1b" />
          <path d="M -2.5 -27 Q 0 -25 2.5 -27" fill="none" stroke="#9c5a3c" strokeWidth="0.9" strokeLinecap="round" />
          <path d="M -8.3 -32.5 A 8.3 8.3 0 0 1 8.3 -32.5 Z" fill={s.dark} />
          <rect x="-10.5" y="-34" width="21" height="2.8" rx="1.4" fill={s.dark} />
          <circle cx="-3" cy="-37" r="1.6" fill={s.light} opacity="0.8" />
          {isMe && (
            <g className="s3d-you">
              <path d="M -5.5 -52 L 5.5 -52 L 0 -44 Z" fill="#fff" stroke={s.dark} strokeWidth="1" strokeLinejoin="round" />
            </g>
          )}
        </g>
      </g>
    </g>
  )
}

/* ── The board ───────────────────────────────────────────────────────── */

export interface Snakes3DBoardProps {
  state: SnakesState
  meUid: string
  /** Whose piece the camera keeps in view: you while you're racing, else whoever's turn it is. */
  followUid: string | null
  /** Players who left or are out: their pieces fade. */
  hidden?: string[]
  /** Called on every hop (for the step sound). */
  onStep?: () => void
  className?: string
}

/**
 * The jungle tower, in a scrolling viewport. Pure: it draws the state it is
 * given, animating each change (see useTowerAnimation), and the camera
 * follows `followUid` until you swipe away — then "back to me" brings it back.
 */
export function Snakes3DBoard({ state, meUid, followUid, hidden, onStep, className }: Snakes3DBoardProps) {
  const viewport = React.useRef<HTMLDivElement>(null)
  const svg = React.useRef<SVGSVGElement>(null)
  const refs = React.useRef(new Map<string, CharRefs>())
  const setRef = React.useCallback((uid: string, k: keyof CharRefs, el: SVGGElement | SVGEllipseElement | null) => {
    const cur = refs.current.get(uid) ?? { root: null, hop: null, shadow: null, fx: null, portal: null }
    ;(cur as unknown as Record<string, Element | null>)[k] = el
    refs.current.set(uid, cur)
  }, [])
  const order = state.order
  const slotOf = React.useCallback((uid: string) => Math.max(0, order.indexOf(uid)), [order])

  /* Camera */
  const [free, setFree] = React.useState(false)
  const freeRef = React.useRef(false)
  const followRef = React.useRef(followUid)
  React.useLayoutEffect(() => {
    followRef.current = followUid
  }, [followUid])
  const camTween = React.useRef<gsap.core.Tween | null>(null)
  /** The last scrollTop the camera set itself, to tell its scrolls from the player's. */
  const ours = React.useRef(-1)

  const scrollToY = React.useCallback((sceneY: number, dur: number) => {
    const el = viewport.current
    const s = svg.current
    if (!el || !s) return
    const scale = s.clientWidth / SCENE_W
    const max = Math.max(0, el.scrollHeight - el.clientHeight)
    const target = Math.max(0, Math.min(max, sceneY * scale - el.clientHeight * EYE_LINE))
    camTween.current?.kill()
    if (dur <= 0) {
      ours.current = target
      el.scrollTop = target
      return
    }
    const proxy = { y: el.scrollTop }
    camTween.current = gsap.to(proxy, {
      y: target,
      duration: dur,
      ease: "power2.inOut",
      onUpdate: () => {
        ours.current = proxy.y
        el.scrollTop = proxy.y
      },
    })
  }, [])

  const camera = React.useMemo<CameraHandle>(
    () => ({
      track: (uid, pt, dur) => {
        if (freeRef.current || uid !== followRef.current) return
        scrollToY(pt.y, Math.max(0.35, dur))
      },
    }),
    [scrollToY]
  )

  const anim = useTowerAnimation({ state, refs, svg, slotOf, camera, onStep })

  const lookAt = React.useCallback(
    (uid: string | null, dur: number) => {
      if (!uid) return
      const p: Pt = standOf(anim.drawnPos(uid), slotOf(uid))
      scrollToY(p.y, dur)
    },
    [anim, slotOf, scrollToY]
  )

  // First paint: straight to the followed piece. Later: glide when the camera's target changes.
  const started = React.useRef(false)
  React.useLayoutEffect(() => {
    if (freeRef.current) return
    lookAt(followUid, started.current ? 0.7 : 0)
    started.current = true
  }, [followUid, lookAt])

  // Resized (rotation, keyboard): keep the followed piece in view
  React.useEffect(() => {
    const el = viewport.current
    if (!el) return
    const ro = new ResizeObserver(() => {
      if (!freeRef.current) lookAt(followRef.current, 0)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [lookAt])

  // Swiping, wheeling or dragging takes the camera off its leash
  const letGo = React.useCallback(() => {
    if (freeRef.current) return
    camTween.current?.kill()
    freeRef.current = true
    setFree(true)
  }, [])
  const onScroll = () => {
    const el = viewport.current
    if (el && Math.abs(el.scrollTop - ours.current) > 2) letGo()
  }
  const backToMe = () => {
    freeRef.current = false
    setFree(false)
    lookAt(followRef.current, 0.6)
  }

  // Desktop: drag the tower with the mouse
  const drag = React.useRef<{ y: number; top: number } | null>(null)
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== "mouse" || e.button !== 0 || !viewport.current) return
    drag.current = { y: e.clientY, top: viewport.current.scrollTop }
    viewport.current.setPointerCapture(e.pointerId)
  }
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!drag.current || !viewport.current) return
    const dy = e.clientY - drag.current.y
    if (Math.abs(dy) > 3) letGo()
    viewport.current.scrollTop = drag.current.top - dy
  }
  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!drag.current) return
    drag.current = null
    viewport.current?.releasePointerCapture(e.pointerId)
  }

  React.useEffect(
    () => () => {
      camTween.current?.kill()
    },
    []
  )

  const hiddenSet = hidden ?? []
  return (
    <div className={cn("relative min-h-0 overflow-hidden", className)}>
      <style>{SCENE_CSS}</style>
      <div
        ref={viewport}
        className="no-scrollbar h-full cursor-grab touch-pan-y overflow-x-hidden overflow-y-auto overscroll-contain select-none active:cursor-grabbing"
        onScroll={onScroll}
        onWheel={letGo}
        onTouchMove={letGo}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <svg
          ref={svg}
          viewBox={`0 0 ${SCENE_W} ${SCENE_H}`}
          className="block w-full"
          style={{ height: "auto" }}
          role="img"
          aria-label="The Snakes and Ladders tower"
        >
          <Scene />
          {/* Portals open under the pieces */}
          {order.map((uid) => (
            <g key={uid} ref={(el) => setRef(uid, "portal", el)} opacity="0">
              <ellipse rx="19" ry="7.5" fill="url(#s3d-portal)" />
              <ellipse rx="19" ry="7.5" fill="none" stroke="#e9d5ff" strokeWidth="1.5" opacity="0.9" />
              <ellipse rx="11" ry="4.2" fill="none" stroke="#f0abfc" strokeWidth="1" strokeDasharray="4 4" opacity="0.8" />
            </g>
          ))}
          {order.map((uid) => {
            const p = state.players[uid]
            if (!p) return null
            return (
              <Character
                key={uid}
                colour={p.colour}
                isMe={uid === meUid}
                slot={slotOf(uid)}
                dim={hiddenSet.includes(uid)}
                set={(k, el) => setRef(uid, k, el)}
              />
            )
          })}
          {/* Lightning flashes over the pieces */}
          {order.map((uid) => (
            <g key={uid} ref={(el) => setRef(uid, "fx", el)} opacity="0">
              <circle cy="-16" r="26" fill="url(#s3d-glow)" />
              <polygon points="-4,-44 7,-44 2,-22 9,-22 -5,6 -1,-14 -8,-14" fill="#fffbd1" stroke="#ffd60a" strokeWidth="1.2" strokeLinejoin="round" />
            </g>
          ))}
          {/* Confetti for the summit */}
          {Array.from({ length: 16 }, (_, i) => (
            <rect key={i} data-confetti width="4" height="6" rx="1" opacity="0" fill={["#ff5a5f", "#ffd60a", "#4cc9f0", "#80ed99", "#f72585"][i % 5]} />
          ))}
        </svg>
      </div>
      {/* Fade the viewport's edges so the tower looks like it continues */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-6 bg-gradient-to-b from-black/35 to-transparent" />
      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-6 bg-gradient-to-t from-black/35 to-transparent" />
      {free && followUid && (
        <button
          type="button"
          onClick={backToMe}
          className="absolute right-2.5 bottom-2.5 flex h-8 items-center gap-1.5 rounded-full bg-white/90 px-3 text-xs font-semibold text-[#0d2463] shadow-lg backdrop-blur-sm transition-transform active:scale-95 animate-in fade-in-0 zoom-in-95"
        >
          <svg viewBox="0 0 16 16" className="size-3.5" aria-hidden>
            <path d="M8 2 L8 14 M3 7 L8 2 L13 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {followUid === meUid ? "Back to me" : "Follow"}
        </button>
      )}
    </div>
  )
}
