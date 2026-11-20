"use client"

import { PEEK_CLASS, peekTriggerProps } from "@/components/profile-peek/peek"
import { Avatar, AvatarBadge, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
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

export interface UserAvatarProps {
  src?: string | null
  name: string
  size?: keyof typeof SIZES
  className?: string
  /** Small status dot / icon rendered at the bottom-right. */
  badge?: React.ReactNode
  /** Whose avatar it is: a tap opens their profile peek (components/profile-peek). */
  uid?: string
  /** Ignored: the Split side shows photos plain — frames are for the Games side (GameAvatar). */
  frame?: string
  /** `false`: a tap doesn't open the profile peek (the avatar has its own job here). */
  peek?: boolean
}

/**
 * A person's photo (or initials) on the Split side: always plain — no profile
 * frame anywhere here (frames are a Games thing: components/game-avatar).
 */
export function UserAvatar({ src, name, size = "md", className, badge, uid, peek = true }: UserAvatarProps) {
  const tap = peek && uid ? peekTriggerProps({ uid, look: "app", hint: { name, photo: src } }, name) : null
  const photo = (
    <>
      {src ? <AvatarImage src={src} alt={name || "Avatar"} /> : null}
      <AvatarFallback className={cn("font-bold tracking-tight", colorFor(name || "User"))}>
        {getInitials(name)}
      </AvatarFallback>
    </>
  )

  return (
    <Avatar {...tap} className={cn(SIZES[size], tap && PEEK_CLASS, className)}>
      {photo}
      {badge ? <AvatarBadge className="size-auto! bg-transparent ring-0">{badge}</AvatarBadge> : null}
    </Avatar>
  )
}
