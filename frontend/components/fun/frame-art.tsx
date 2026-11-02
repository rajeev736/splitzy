"use client"

import * as React from "react"

import { isFrameId, type FrameId } from "@/lib/fun/catalog"
import { cn } from "@/lib/utils"
import { CLASSIC_GAMES_FRAMES } from "./frames-classic-games"
import { CUTE_LOVE_FRAMES } from "./frames-cute-love"
import { MORE_FRAMES_A } from "./frames-more-a"
import { MORE_FRAMES_B } from "./frames-more-b"

const ART = { ...CLASSIC_GAMES_FRAMES, ...CUTE_LOVE_FRAMES, ...MORE_FRAMES_A, ...MORE_FRAMES_B }

/**
 * A profile frame, drawn in a 200×200 box around a photo of radius 60 at its
 * centre. Sized by the parent (see FramedAvatar).
 */
export function FrameArt({ frame, className, style }: { frame: FrameId; className?: string; style?: React.CSSProperties }) {
  const prefix = React.useId().replace(/:/g, "")
  const Draw = ART[frame]
  if (!Draw) return null
  return (
    <svg viewBox="0 0 200 200" aria-hidden style={style} className={cn("pointer-events-none overflow-visible", className)}>
      {Draw({ id: (name) => `${prefix}-${name}` })}
    </svg>
  )
}

export const hasFrame = (frame: string | undefined): frame is FrameId => isFrameId(frame)
