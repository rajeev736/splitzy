"use client"

import * as React from "react"
import Link from "next/link"
import { GameController03Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { useSession } from "@/components/providers/session-provider"
import { useChallenges } from "@/hooks/queries"
import { cn } from "@/lib/utils"
import { ChallengeFriendSheet } from "./challenge-friend-sheet"

/**
 * "Challenge to a game" for someone who owes you. Shows "Challenge sent"
 * (linking to the game) while one is already open with them, so the same
 * person never gets two at once. Stops click propagation so it can sit inside
 * clickable rows.
 */
export function ChallengeButton({
  person,
  owedPaise,
  size = "sm",
  className,
}: {
  person: { uid: string; name: string; photoURL?: string }
  owedPaise: number
  size?: "sm" | "lg"
  className?: string
}) {
  const { user } = useSession()
  const { data: challenges } = useChallenges()
  const [open, setOpen] = React.useState(false)
  const pending = challenges.find(
    (c) => c.status === "OPEN" && c.kind === "friend" && c.hostId === user?.uid && c.players.includes(person.uid)
  )
  if (owedPaise <= 0) return null

  const pill = cn(
    "inline-flex shrink-0 items-center gap-1.5 rounded-full font-bold transition active:scale-95",
    size === "lg" ? "h-11 justify-center px-4 text-sm" : "px-3 py-1 text-[11px]",
    className
  )

  if (pending) {
    return (
      <Link
        href={`/challenges/${pending.id}`}
        onClick={(e) => e.stopPropagation()}
        className={cn(pill, "border border-warning/40 bg-warning/10 text-warning hover:bg-warning/20")}
      >
        <HugeiconsIcon icon={GameController03Icon} className="size-3.5" />
        Challenge sent · view
      </Link>
    )
  }

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          setOpen(true)
        }}
        className={cn(
          pill,
          "bg-linear-to-r from-amber-500 to-orange-500 text-white shadow-sm hover:from-amber-600 hover:to-orange-600"
        )}
      >
        <HugeiconsIcon icon={GameController03Icon} className="size-3.5" />
        Challenge
      </button>
      {open && (
        // The sheet is portalled, but React events still bubble to a clickable parent row
        <span onClick={(e) => e.stopPropagation()}>
          <ChallengeFriendSheet open={open} onOpenChange={setOpen} friend={person} owedPaise={owedPaise} />
        </span>
      )}
    </>
  )
}
