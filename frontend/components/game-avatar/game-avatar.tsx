"use client"

import { FramedAvatar } from "@/components/fun/framed-avatar"
import { FrameArt, hasFrame } from "@/components/fun/frame-art"
import { PEEK_CLASS, peekTriggerProps } from "@/components/profile-peek/peek"
import { cn } from "@/lib/utils"
import { characterById } from "./registry"
import type { CharacterMode } from "./types"

/**
 * A player as they appear in games: their game character (or, if they haven't
 * picked one, their photo / initials) in a round tile, with their frame.
 * `size` is the tile's diameter in px; frame ornaments spill outside it.
 * Use this everywhere inside live games instead of UserAvatar.
 *
 * With a `uid`, a tap opens their game profile peek (components/profile-peek),
 * except on game boards and pickers, or with `peek={false}`.
 */
/** Frames on avatars smaller than this rest in their pose (rows and grids scroll smoothly); bigger ones animate. */
const STILL_BELOW = 72

export function GameAvatar({
  character,
  photo,
  name,
  frame,
  size,
  mode = "still",
  className,
  uid,
  peek = true,
}: {
  character?: string | null
  photo?: string | null
  name: string
  frame?: string | null
  size: number
  mode?: CharacterMode
  className?: string
  /** Whose avatar it is: a tap opens their game profile peek. */
  uid?: string | null
  /** `false`: a tap doesn't open the peek (the avatar has its own job here). */
  peek?: boolean
}) {
  const tap =
    peek && uid
      ? peekTriggerProps({ uid, look: "game", hint: { name, photo, avatar: character, frame } }, name)
      : null
  const def = characterById(character)
  if (!def)
    return (
      <FramedAvatar
        {...tap}
        src={photo}
        name={name}
        frame={frame ?? undefined}
        size={size}
        className={cn(tap && PEEK_CLASS, className)}
      />
    )
  const framed = hasFrame(frame ?? undefined)
  const box = (size * 200) / 120
  return (
    <span
      {...tap}
      className={cn("relative inline-flex shrink-0 items-center justify-center", tap && PEEK_CLASS, className)}
      style={{ width: size, height: size }}
    >
      <span className="size-full overflow-hidden rounded-full" style={{ background: def.accent }} role="img" aria-label={`${name} as ${def.name}`}>
        <def.Art mode={mode} size={size} />
      </span>
      {framed && (
        <FrameArt
          frame={frame as Parameters<typeof FrameArt>[0]["frame"]}
          className="absolute"
          style={{ width: box, height: box, left: (size - box) / 2, top: (size - box) / 2 }}
          still={size < STILL_BELOW}
        />
      )}
    </span>
  )
}
