"use client"

import { getInitials } from "@/components/shared/user-avatar"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import { FrameArt, hasFrame } from "./frame-art"

/**
 * A round photo with the person's profile frame around it. `size` is the
 * photo's diameter in px; a frame's ornaments (wings, ears, crowns) spill
 * outside it, so leave some room around. Without a frame it's a plain avatar.
 */
export function FramedAvatar({
  src,
  name,
  frame,
  size,
  className,
}: {
  src?: string | null
  name: string
  frame?: string
  size: number
  className?: string
}) {
  const framed = hasFrame(frame)
  // The frame's 200-unit box is drawn around a 120-unit photo
  const box = framed ? (size * 200) / 120 : size
  return (
    <span
      className={cn("relative inline-flex shrink-0 items-center justify-center", className)}
      style={{ width: size, height: size }}
    >
      <Avatar className="size-full" style={{ fontSize: Math.max(10, size * 0.34) }}>
        {src ? <AvatarImage src={src} alt={name || "Avatar"} /> : null}
        <AvatarFallback className="bg-muted font-bold tracking-tight text-muted-foreground">{getInitials(name)}</AvatarFallback>
      </Avatar>
      {framed && (
        <FrameArt
          frame={frame}
          className="absolute"
          // centred on the photo, overflowing it evenly
          style={{ width: box, height: box, left: (size - box) / 2, top: (size - box) / 2 }}
        />
      )}
    </span>
  )
}
