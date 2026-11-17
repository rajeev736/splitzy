"use client"

import { FrameArt, hasFrame } from "@/components/fun/frame-art"
import { GameAvatar } from "@/components/game-avatar/game-avatar"
import { characterById } from "@/components/game-avatar/registry"
import type { CharacterMode } from "@/components/game-avatar/types"
import { getInitials } from "@/components/shared/user-avatar"
import type { RoomPlayer } from "@/lib/live/types"
import { cn } from "@/lib/utils"
import { GlossyText } from "./glossy-text"

/**
 * A player in the intro: their character (playing `mode`) or photo through
 * GameAvatar; with neither, a glossy initials disc in their band's colour
 * (the plain grey fallback looks lost at this size), framed all the same.
 */
export function IntroAvatar({
  player,
  size,
  mode,
  accent,
  className,
}: {
  player: RoomPlayer
  size: number
  mode: CharacterMode
  accent: string
  className?: string
}) {
  if (characterById(player.avatar) || player.photo) {
    return (
      <GameAvatar
        character={player.avatar}
        photo={player.photo}
        name={player.name}
        frame={player.frame}
        size={size}
        mode={mode}
        className={className}
      />
    )
  }
  const frame = player.frame
  const box = (size * 200) / 120
  return (
    <span className={cn("relative inline-flex shrink-0 items-center justify-center", className)} style={{ width: size, height: size }}>
      <span
        role="img"
        aria-label={player.name}
        className="flex size-full items-center justify-center overflow-hidden rounded-full"
        style={{
          background: `radial-gradient(circle at 50% 30%, #fff 0%, color-mix(in oklab, ${accent} 30%, white) 55%, color-mix(in oklab, ${accent} 70%, white) 100%)`,
        }}
      >
        <GlossyText size={Math.round(size * 0.36)} rim={`color-mix(in oklab, ${accent} 60%, #12072e)`} tint={`color-mix(in oklab, ${accent} 65%, white)`}>
          {getInitials(player.name)}
        </GlossyText>
      </span>
      {hasFrame(frame) && (
        <FrameArt frame={frame} className="absolute" style={{ width: box, height: box, left: (size - box) / 2, top: (size - box) / 2 }} />
      )}
    </span>
  )
}
