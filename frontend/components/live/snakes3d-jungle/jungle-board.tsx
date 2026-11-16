"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import { BACK_PILL_W, EdgeMarkers, type EdgeMarkersHandle } from "../snakes3d/edge-markers"
import type { Snakes3DBoardProps } from "../snakes3d/snakes3d-board"
import { JungleWorld } from "./jungle-world"

/**
 * The jungle tower in real 3D (three.js, loaded only with this theme). Pure
 * like the night tower: it draws the state it's given and animates each
 * change; the camera follows `followUid` until you swipe away — then
 * "Back to me" brings it back (and so do your turn and your own move).
 * Arrows on the edges point at the pieces out of view. `onFail`: WebGL
 * couldn't start, so the caller shows the night tower instead.
 */
export default function JungleBoard({
  state,
  meUid,
  followUid,
  hidden,
  onSound,
  nameOf,
  onFail,
  className,
}: Snakes3DBoardProps & { onFail?: () => void }) {
  const host = React.useRef<HTMLDivElement>(null)
  const flash = React.useRef<HTMLDivElement>(null)
  const world = React.useRef<JungleWorld | null>(null)
  const markers = React.useRef<EdgeMarkersHandle>(null)
  const [free, setFree] = React.useState(false)
  const soundRef = React.useRef(onSound)
  const failRef = React.useRef(onFail)
  React.useEffect(() => {
    soundRef.current = onSound
    failRef.current = onFail
  })

  // The scene lives as long as the board
  React.useEffect(() => {
    const el = host.current
    if (!el) return
    let w: JungleWorld
    try {
      w = new JungleWorld({
        host: el,
        flash: flash.current,
        reduced: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
        onSound: (s) => soundRef.current?.(s),
        onFree: setFree,
        onMarkers: (points, width, height) => markers.current?.update(points, width, height),
      })
    } catch {
      failRef.current?.()
      return
    }
    world.current = w
    return () => {
      world.current = null
      w.dispose()
    }
  }, [])

  // Every state change plays out (or snaps) in the scene
  const hiddenKey = (hidden ?? []).join("|")
  React.useEffect(() => {
    world.current?.sync(state, meUid, hiddenKey ? hiddenKey.split("|") : [])
  }, [state, meUid, hiddenKey])

  React.useEffect(() => {
    world.current?.setFollow(followUid)
  }, [followUid])

  const arrows = state.order
    .filter((u) => state.players[u])
    .map((u) => ({ uid: u, colour: state.players[u].colour, name: nameOf?.(u) ?? "Player", isMe: u === meUid }))

  return (
    <div className={cn("relative min-h-0 overflow-hidden bg-[#86cdb9] select-none", className)}>
      <div ref={host} className="absolute inset-0 cursor-grab active:cursor-grabbing" role="img" aria-label="The Snakes and Ladders jungle tower" />
      {/* The lightning's flash */}
      <div ref={flash} aria-hidden className="pointer-events-none absolute inset-0 bg-white opacity-0" />
      {/* Soft edges, so the jungle seems to carry on */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-6 bg-gradient-to-b from-black/20 to-transparent" />
      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-6 bg-gradient-to-t from-black/25 to-transparent" />
      <EdgeMarkers ref={markers} players={arrows} reserveBottomRight={free && followUid ? BACK_PILL_W : 0} onPick={(u) => world.current?.focus(u)} />
      {free && followUid && (
        <button
          type="button"
          onClick={() => world.current?.backToMe()}
          className="absolute right-2.5 bottom-2.5 z-20 flex h-8 items-center gap-1.5 rounded-full bg-white/90 px-3 text-xs font-semibold text-[#0b4a3f] shadow-lg backdrop-blur-sm transition-transform active:scale-95 animate-in fade-in-0 zoom-in-95"
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
