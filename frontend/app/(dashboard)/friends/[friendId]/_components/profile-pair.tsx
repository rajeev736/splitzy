"use client"

import Link from "next/link"
import { Link04Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { GameAvatar } from "@/components/game-avatar/game-avatar"
import { PhotoZoom } from "@/components/shared/photo-zoom"
import { UserAvatar } from "@/components/shared/user-avatar"
import type { UserProfile } from "@/lib/types"

/**
 * A friend's two faces, left and right of a small link: their photo as it is
 * for splitting (plain — tap it to see it big) and their game self, character
 * and frame (tap for their game profile). Nothing else: the name and the rest
 * follow below, as always.
 */
export function ProfilePair({
  friend,
}: {
  friend: Pick<UserProfile, "uid" | "displayName" | "photoURL" | "gameAvatar" | "frame">
}) {
  const photo = friend.photoURL || null
  return (
    <div className="flex items-center justify-center gap-4 pt-2 pb-1 sm:gap-6">
      <PhotoZoom src={photo} alt={friend.displayName} className="rounded-full">
        <UserAvatar src={friend.photoURL} name={friend.displayName} size="xl" className="size-24 text-2xl" peek={false} />
      </PhotoZoom>

      {/* The same person, on both sides of the app */}
      <span
        aria-hidden
        className="flex size-9 shrink-0 items-center justify-center rounded-full border border-card-stroke bg-card text-muted-foreground shadow-xs"
      >
        <HugeiconsIcon icon={Link04Icon} className="size-4" strokeWidth={2} />
      </span>

      {/* Frames spill around a game avatar: room for them, so nothing is cut */}
      <Link
        href={`/games/player/${friend.uid}`}
        aria-label={`${friend.displayName}'s game profile`}
        className="flex size-24 shrink-0 items-center justify-center rounded-full transition-transform active:scale-95"
      >
        <GameAvatar character={friend.gameAvatar} photo={friend.photoURL} name={friend.displayName} frame={friend.frame} size={80} mode="idle" peek={false} />
      </Link>
    </div>
  )
}
