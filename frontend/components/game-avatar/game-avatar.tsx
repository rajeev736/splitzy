"use client"

import { FramedAvatar } from "@/components/fun/framed-avatar"
import { FrameArt, hasFrame } from "@/components/fun/frame-art"
import { cn } from "@/lib/utils"
import { characterById } from "./registry"
import type { CharacterMode } from "./types"

/**
 * A player as they appear in games: their game character (or, if they haven't
 * picked one, their photo / initials) in a round tile, with their frame.
 * `size` is the tile's diameter in px; frame ornaments spill outside it.
 * Use this everywhere inside live games instead of UserAvatar.
 */
export function GameAvatar({
  character,
  photo,
  name,
  frame,
  size,
  mode = "still",
  className,
}: {
  character?: string | null
  photo?: string | null
  name: string
  frame?: string | null
  size: number
  mode?: CharacterMode
  className?: string
}) {
  const def = characterById(character)
  if (!def) return <FramedAvatar src={photo} name={name} frame={frame ?? undefined} size={size} className={className} />
  const framed = hasFrame(frame ?? undefined)
  const box = (size * 200) / 120
  return (
    <span className={cn("relative inline-flex shrink-0 items-center justify-center", className)} style={{ width: size, height: size }}>
      <span className="size-full overflow-hidden rounded-full" style={{ background: def.accent }} role="img" aria-label={`${name} as ${def.name}`}>
        <def.Art mode={mode} size={size} />
      </span>
      {framed && (
        <FrameArt
          frame={frame as Parameters<typeof FrameArt>[0]["frame"]}
          className="absolute"
          style={{ width: box, height: box, left: (size - box) / 2, top: (size - box) / 2 }}
        />
      )}
    </span>
  )
}
