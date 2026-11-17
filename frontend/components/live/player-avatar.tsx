"use client"

import * as React from "react"

import { GameAvatar } from "@/components/game-avatar/game-avatar"
import type { CharacterMode } from "@/components/game-avatar/types"
import type { RoomPlayer } from "@/lib/live/types"
import { cn } from "@/lib/utils"

/** What a seat needs to draw a player's game profile. */
export type PlayerLook = Pick<RoomPlayer, "name" | "photo" | "avatar" | "frame">

/**
 * A player inside a live game: their game character and frame (photo or
 * initials if they haven't picked one), at a fixed size in px.
 */
export function PlayerAvatar({
  player,
  size,
  mode,
  frame = true,
  className,
}: {
  player: Partial<PlayerLook> | null | undefined
  size: number
  mode?: CharacterMode
  /** Leave the frame off where its ornaments would be cut off. */
  frame?: boolean
  className?: string
}) {
  return (
    <GameAvatar
      character={player?.avatar}
      photo={player?.photo}
      name={player?.name ?? "?"}
      frame={frame ? player?.frame : undefined}
      size={size}
      mode={mode}
      className={className}
    />
  )
}

/**
 * The same, filling its box (a square sized by CSS — container queries,
 * percentages): it measures the box and draws at that size.
 */
export function PlayerAvatarFill({
  player,
  mode,
  frame = true,
  className,
}: {
  player: Partial<PlayerLook> | null | undefined
  mode?: CharacterMode
  frame?: boolean
  className?: string
}) {
  const box = React.useRef<HTMLSpanElement>(null)
  const [size, setSize] = React.useState(0)
  React.useLayoutEffect(() => {
    const el = box.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setSize(Math.round(Math.min(e.contentRect.width, e.contentRect.height))))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return (
    <span ref={box} className={cn("relative flex items-center justify-center", className)}>
      {size > 0 && <PlayerAvatar player={player} size={size} mode={mode} frame={frame} className="absolute" />}
    </span>
  )
}
