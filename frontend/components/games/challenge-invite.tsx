"use client"

import * as React from "react"
import { useRouter } from "nextjs-toploader/app"

import { useSession } from "@/components/providers/session-provider"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useChallenges } from "@/hooks/queries"
import { DISCOUNT_WINDOW_MS, GAMES } from "@/lib/games"
import { formatPaise } from "@/lib/money"
import type { Challenge } from "@/lib/types"
import { cn } from "@/lib/utils"

/** A game this person sent you that you haven't played yet. */
export function useChallengeFrom(personId: string): Challenge | undefined {
  const { user } = useSession()
  const { data: challenges } = useChallenges()
  return React.useMemo(
    () =>
      user
        ? challenges.find(
            (c) =>
              c.status === "OPEN" &&
              c.hostId === personId &&
              c.players.includes(user.uid) &&
              c.moves?.[user.uid] === undefined
          )
        : undefined,
    [user, challenges, personId]
  )
}

/**
 * "Rajeev challenged you · 20% off — View" under a person's row. View opens a
 * small dialog with what you owe, what you'd pay if you win, and Play.
 * Renders nothing when there's no game waiting from this person.
 */
export function ChallengeInviteStrip({ personId, className }: { personId: string; className?: string }) {
  const challenge = useChallengeFrom(personId)
  const [open, setOpen] = React.useState(false)
  if (!challenge) return null

  return (
    // Sits inside clickable rows: keep taps here from opening the row
    <div onClick={(e) => e.stopPropagation()}>
      <div className={cn("flex items-center justify-between gap-3 rounded-xl bg-muted/50 px-3 py-2", className)}>
        <p className="min-w-0 truncate text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">{challenge.hostName.split(" ")[0]}</span> challenged you ·{" "}
          {challenge.discountPercent}% off
        </p>
        <Button size="sm" className="h-7 shrink-0 px-3 text-xs" onClick={() => setOpen(true)}>
          View
        </Button>
      </div>
      <ChallengeInviteDialog challenge={challenge} open={open} onOpenChange={setOpen} />
    </div>
  )
}

function ChallengeInviteDialog({
  challenge,
  open,
  onOpenChange,
}: {
  challenge: Challenge
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const router = useRouter()
  const { user } = useSession()
  const game = GAMES[challenge.game]
  const base = (user && challenge.bases?.[user.uid]) || 0
  const off = Math.floor((base * challenge.discountPercent) / 100)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm rounded-3xl">
        <DialogHeader>
          <DialogTitle>{challenge.hostName} challenged you</DialogTitle>
          <DialogDescription>
            {game.emoji} {game.name}
            {challenge.expenseTitle && ` · for "${challenge.expenseTitle}"`}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2 rounded-2xl border p-4 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">You owe</span>
            <span className="font-semibold tabular-nums">{formatPaise(base)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">If you win</span>
            <span className="text-base font-black text-success tabular-nums">{formatPaise(base - off)}</span>
          </div>
          <p className="border-t pt-2 text-xs text-muted-foreground">
            Save {formatPaise(off)} ({challenge.discountPercent}%). The discount lasts {DISCOUNT_WINDOW_MS / 60000}{" "}
            minutes after the result; the timer only starts once you play.
          </p>
        </div>

        <DialogFooter className="grid grid-cols-2 gap-2 sm:flex">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Later
          </Button>
          <Button
            onClick={() => {
              onOpenChange(false)
              router.push(`/challenges/${challenge.id}`)
            }}
          >
            Play now
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
