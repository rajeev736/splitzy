"use client"

import { FrameArt, hasFrame } from "@/components/fun/frame-art"
import { useSession } from "@/components/providers/session-provider"
import { Avatar, AvatarBadge, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useFriends } from "@/hooks/queries"
import { cn } from "@/lib/utils"

const SIZES = {
  xs: "size-6 text-[10px]",
  sm: "size-8 text-xs",
  md: "size-10 text-sm",
  lg: "size-14 text-base",
  xl: "size-20 text-xl",
} as const

/** Deterministic pastel palette for initials, keyed by name. */
const PALETTE = [
  "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300",
  "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300",
  "bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300",
]

export function getInitials(name: string) {
  if (!name) return "U"
  const parts = name.trim().split(" ")
  return (parts.length >= 2 ? `${parts[0][0]}${parts[1][0]}` : name.slice(0, 2)).toUpperCase()
}

function colorFor(name: string) {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return PALETTE[Math.abs(hash) % PALETTE.length]
}

/** The frame someone wears, when we know them: you, or one of your friends. */
function useKnownFrame(uid: string | undefined) {
  const { user } = useSession()
  const { data: friends } = useFriends()
  if (!uid) return undefined
  if (uid === user?.uid) return user.frame
  return friends.find((f) => f.uid === uid)?.frame
}

export interface UserAvatarProps {
  src?: string | null
  name: string
  size?: keyof typeof SIZES
  className?: string
  /** Small status dot / icon rendered at the bottom-right. */
  badge?: React.ReactNode
  /** Whose avatar it is: shows their profile frame (yours or a friend's). */
  uid?: string
  /** A frame to show regardless of who it is. */
  frame?: string
}

export function UserAvatar({ src, name, size = "md", className, badge, uid, frame }: UserAvatarProps) {
  const known = useKnownFrame(uid)
  const worn = frame ?? known
  const photo = (
    <>
      {src ? <AvatarImage src={src} alt={name || "Avatar"} /> : null}
      <AvatarFallback className={cn("font-bold tracking-tight", colorFor(name || "User"))}>
        {getInitials(name)}
      </AvatarFallback>
    </>
  )

  if (!hasFrame(worn)) {
    return (
      <Avatar className={cn(SIZES[size], className)}>
        {photo}
        {badge ? <AvatarBadge className="size-auto! bg-transparent ring-0">{badge}</AvatarBadge> : null}
      </Avatar>
    )
  }

  // Framed: the photo shrinks a little so the frame fits the same box (spilling
  // just 10% around it), so rows and headers keep their layout.
  return (
    <span className={cn("relative inline-flex shrink-0 items-center justify-center rounded-full", SIZES[size], className)}>
      <Avatar className="size-[72%] text-[0.8em]">{photo}</Avatar>
      <FrameArt frame={worn} className="absolute" style={{ inset: "-10%" }} />
      {badge ? <span className="absolute right-0 bottom-0 z-10">{badge}</span> : null}
    </span>
  )
}
