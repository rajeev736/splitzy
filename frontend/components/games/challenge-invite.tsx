"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "nextjs-toploader/app"

import { useSession } from "@/components/providers/session-provider"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useChallenges } from "@/hooks/queries"
import { DISCOUNT_WINDOW_MS, GAMES, isForFun, stakeLabel } from "@/lib/games"
import { formatPaise } from "@/lib/money"
import type { Challenge } from "@/lib/types"
import { cn } from "@/lib/utils"
import { GameGlyph } from "./game-glyph"

/** Games this person sent you that you haven't played yet, oldest first. */
export function useChallengesFrom(personId: string): Challenge[] {
  const { user } = useSession()
  const { data: challenges } = useChallenges()
  return React.useMemo(
    () =>
      user
        ? challenges
            .filter(
              (c) =>
                c.status === "OPEN" &&
                c.hostId === personId &&
                c.players.includes(user.uid) &&
                c.moves?.[user.uid] === undefined
            )
            .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
        : [],
    [user, challenges, personId]
  )
}

/**
 * "Rajeev challenged you · 20% off — View" under a person's row. View opens a
 * small dialog with the deal and Play. When they've sent several games, the
 * strip says how many and "All" opens the Games tab, where every one is listed.
 * Renders nothing when there's no game waiting from this person.
 */
export function ChallengeInviteStrip({
  personId,
  className,
}: {
  personId: string
  className?: string
}) {
  const pending = useChallengesFrom(personId)
  const [open, setOpen] = React.useState(false)
  const challenge = pending[0]
  if (!challenge) return null
  const more = pending.length - 1

  return (
    // Sits inside clickable rows: keep taps here from opening the row
    <div onClick={(e) => e.stopPropagation()}>
      <div
        className={cn(
          "flex items-center justify-between gap-3 rounded-md bg-primary/5 px-3 py-2",
          className
        )}
      >
        <p className="min-w-0 truncate text-xs text-muted-foreground">
          <span className="font-medium text-foreground">
            {challenge.hostName.split(" ")[0]}
          </span>{" "}
          {more > 0 ? (
            <>sent you {pending.length} games</>
          ) : (
            <>
              challenged you · <GameGlyph game={challenge.game} />{" "}
              {stakeLabel(challenge)}
            </>
          )}
        </p>
        <div className="flex shrink-0 gap-1.5">
          {more > 0 && (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-xs"
              nativeButton={false}
              render={<Link href="/challenges" />}
            >
              All
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            className="h-7 px-3 text-xs"
            onClick={() => setOpen(true)}
          >
            {more > 0 ? "Play first" : "View"}
          </Button>
        </div>
      </div>
      <ChallengeInviteDialog
        challenge={challenge}
        open={open}
        onOpenChange={setOpen}
      />
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
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{challenge.hostName} challenged you</DialogTitle>
          <DialogDescription>
            <GameGlyph game={challenge.game} /> {game.name}
            {challenge.expenseTitle
              ? ` · for "${challenge.expenseTitle}"`
              : challenge.groupName
                ? ` · ${challenge.groupName}`
                : ""}
          </DialogDescription>
        </DialogHeader>

        {isForFun(challenge) ? (
          <p className="border-y py-3 text-sm text-muted-foreground">
            Just for fun — no money involved. {GAMES[challenge.game].tagline}.
          </p>
        ) : (
          <div className="flex flex-col divide-y border-y text-sm">
            <div className="flex items-center justify-between py-2.5">
              <span className="text-muted-foreground">You owe</span>
              <span className="font-semibold tabular-nums">
                {formatPaise(base)}
              </span>
            </div>
            <div className="flex items-center justify-between py-2.5">
              <span className="text-muted-foreground">If you win</span>
              <span className="text-base font-semibold text-success tabular-nums">
                {formatPaise(base - off)}
              </span>
            </div>
            <p className="py-2.5 text-xs text-muted-foreground">
              Save {formatPaise(off)} ({challenge.discountPercent}%). The
              discount lasts {DISCOUNT_WINDOW_MS / 60000} minutes after the
              result; the timer only starts once you play.
            </p>
          </div>
        )}

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
