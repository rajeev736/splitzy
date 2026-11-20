"use client"

import * as React from "react"

import { isLiveConfigured } from "@/lib/firebase/config"
import { LIVE_GAMES } from "@/lib/live/games"
import { cn } from "@/lib/utils"
import { watchStatus, type PresenceState, type UserStatus } from "@/services/presence"

/** Friends' statuses (services/presence), live, for the uids given. */
export function useFriendStatuses(uids: string[]): Record<string, UserStatus | null> {
  const [statuses, setStatuses] = React.useState<Record<string, UserStatus | null>>({})
  const key = [...uids].sort().join(",")
  React.useEffect(() => {
    if (!isLiveConfigured || !key) return
    const offs = key.split(",").map((uid) => watchStatus(uid, (s) => setStatuses((prev) => ({ ...prev, [uid]: s }))))
    return () => offs.forEach((off) => off())
  }, [key])
  return statuses
}

const LOOK: Record<PresenceState, { label: string; dot: string; chip: string }> = {
  game: { label: "In game", dot: "bg-[#ff8a1f]", chip: "bg-[#ffe9d1] text-[#b4560b]" },
  room: { label: "In room", dot: "bg-[#8b5cf6]", chip: "bg-[#ede4ff] text-[#6b3fd1]" },
  online: { label: "Online", dot: "bg-[#22c55e]", chip: "bg-[#d9f7d0] text-[#178a3e]" },
  offline: { label: "Offline", dot: "bg-[#a7a2b8]", chip: "bg-[#efedf3] text-[#7d7890]" },
}

/** The state to show: unknown counts as offline. */
export const presenceOf = (s: UserStatus | null | undefined): PresenceState => s?.state ?? "offline"

/** "In game · Ludo", "In room", "Online", "Offline" — as a small chip, or just the dot. */
export function StatusChip({ status, dotOnly, className }: { status: UserStatus | null | undefined; dotOnly?: boolean; className?: string }) {
  const state = presenceOf(status)
  const look = LOOK[state]
  const game = state === "game" && status?.game ? LIVE_GAMES[status.game]?.shortName ?? LIVE_GAMES[status.game]?.name : null
  const label = game ? `${look.label} · ${game}` : look.label
  if (dotOnly)
    return <span aria-label={label} title={label} className={cn("block size-3.5 rounded-full shadow-[0_0_0_2.5px_#fff]", look.dot, className)} />
  return (
    <span className={cn("inline-flex max-w-full items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] leading-none font-bold", look.chip, className)}>
      <span aria-hidden className={cn("size-1.5 shrink-0 rounded-full", look.dot)} />
      <span className="truncate">{label}</span>
    </span>
  )
}
