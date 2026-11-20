"use client"

import { UserAvatar } from "@/components/shared/user-avatar"
import type { UserProfile } from "@/lib/types"

/**
 * A friend as they are for splitting: their photo, plain (no frame — game
 * looks live on the Games side), their name and JoySplit ID.
 */
export function ProfilePair({ friend }: { friend: Pick<UserProfile, "displayName" | "photoURL" | "splitzyId"> }) {
  return (
    <section aria-label="Profile" className="flex flex-col items-center gap-2.5 pt-1 text-center">
      {/* No uid: a worn frame is never looked up here */}
      <UserAvatar src={friend.photoURL} name={friend.displayName} size="xl" className="size-24 text-2xl shadow-sm ring-4 ring-card" />
      <span className="flex w-full min-w-0 flex-col gap-0.5">
        <span className="truncate text-xl leading-tight font-semibold">{friend.displayName}</span>
        <span className="truncate font-mono text-xs text-muted-foreground">{friend.splitzyId}</span>
      </span>
    </section>
  )
}
