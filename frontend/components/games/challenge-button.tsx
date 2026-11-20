"use client"

import * as React from "react"
import Link from "next/link"
import { GameController03Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { useSession } from "@/components/providers/session-provider"
import { useChallenges } from "@/hooks/queries"
import { cn } from "@/lib/utils"

/**
 * "Challenge to a game" for someone who owes you: opens the Games side's
 * discount set-up (/play/discount) with them picked — a live game one-on-one,
 * and a discount if they win. Shows "Challenge sent" while a discount game
 * with them is open, so two discounts never stack. Stops click propagation so
 * it can sit inside clickable rows.
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
  const pending = challenges.find(
    (c) => c.status === "OPEN" && c.discountPercent > 0 && c.hostId === user?.uid && c.players.includes(person.uid)
  )
  if (owedPaise <= 0) return null

  const pill = cn(
    "inline-flex shrink-0 items-center gap-1.5 rounded-md border font-medium whitespace-nowrap transition-colors",
    size === "lg" ? "h-11 justify-center px-4 text-sm" : "h-8 px-2.5 text-xs",
    className
  )

  if (pending) {
    return (
      <Link
        href={`/challenges/${pending.id}`}
        onClick={(e) => e.stopPropagation()}
        className={cn(pill, "border-transparent text-warning hover:bg-warning/10")}
      >
        <HugeiconsIcon icon={GameController03Icon} className="size-3.5" />
        Challenge sent
      </Link>
    )
  }

  return (
    <Link
      href={`/play/discount?to=${person.uid}`}
      onClick={(e) => e.stopPropagation()}
      className={cn(pill, "border-warning/40 text-warning hover:bg-warning/10")}
    >
      <HugeiconsIcon icon={GameController03Icon} className="size-3.5" />
      Challenge
    </Link>
  )
}
