"use client"

import * as React from "react"
import { useRouter } from "nextjs-toploader/app"

import { BottomSheet } from "@/components/shared/bottom-sheet"
import { UserAvatar } from "@/components/shared/user-avatar"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { useCreateChallenge } from "@/hooks/mutations"
import { GAMES } from "@/lib/games"
import { formatPaise } from "@/lib/money"
import { cn } from "@/lib/utils"
import { DiscountPicker } from "./discount-picker"
import { emptyRpsMoves, isComplete, RpsPicker } from "./rps-picker"

/**
 * Challenge someone who owes you to a game. You lock in your 3 Stone Paper
 * Scissors moves now; they play later, and if they win they get the discount
 * on what they owe — only if they pay right after the game.
 */
export function ChallengeFriendSheet({
  open,
  onOpenChange,
  friend,
  owedPaise,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  friend: { uid: string; name: string; photoURL?: string }
  /** What they owe you right now. */
  owedPaise: number
}) {
  const router = useRouter()
  const createChallenge = useCreateChallenge()
  const [discount, setDiscount] = React.useState(20)
  const [moves, setMoves] = React.useState(emptyRpsMoves)
  const game = GAMES.rps
  const discountPaise = Math.floor((owedPaise * discount) / 100)

  const send = () => {
    if (!isComplete(moves)) return
    createChallenge.mutate(
      {
        kind: "friend",
        game: "rps",
        discountPercent: discount,
        players: [{ uid: friend.uid, name: friend.name, basePaise: owedPaise }],
        hostRpsMoves: moves,
      },
      {
        onSuccess: (challenge) => {
          onOpenChange(false)
          setMoves(emptyRpsMoves())
          router.push(`/challenges/${challenge.id}`)
        },
      }
    )
  }

  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Challenge to a game"
      description={`${friend.name} owes you ${formatPaise(owedPaise)}. If they win, they pay less — but only if they pay right after the game.`}
      footer={
        <Button
          size="lg"
          className="h-11 w-full"
          disabled={!isComplete(moves) || createChallenge.isPending}
          onClick={send}
        >
          {createChallenge.isPending && <Spinner />}
          Send challenge
        </Button>
      }
    >
      <div className="flex flex-col gap-5 pb-2">
        <div className="flex items-center gap-3">
          <UserAvatar src={friend.photoURL} name={friend.name} size="md" />
          <div className="min-w-0">
            <p className="truncate text-sm font-bold">{friend.name}</p>
            <p className="text-xs text-muted-foreground">Owes you {formatPaise(owedPaise)}</p>
          </div>
        </div>

        <section className="flex flex-col gap-2">
          <h3 className="text-xs font-bold tracking-wider text-muted-foreground uppercase">1 · Game</h3>
          <div className={cn("flex items-center gap-3 rounded-2xl border border-primary bg-primary/5 p-3")}>
            <span className="text-3xl" aria-hidden>
              {game.emoji}
            </span>
            <div>
              <p className="text-sm font-bold">{game.name}</p>
              <p className="text-xs text-muted-foreground">{game.tagline}</p>
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground">More games coming soon.</p>
        </section>

        <section className="flex flex-col gap-2">
          <h3 className="text-xs font-bold tracking-wider text-muted-foreground uppercase">2 · Winner&apos;s discount</h3>
          <DiscountPicker value={discount} onChange={setDiscount} />
          <p className="text-xs text-muted-foreground">
            If {friend.name} wins, they pay <strong>{formatPaise(owedPaise - discountPaise)}</strong> instead of{" "}
            {formatPaise(owedPaise)} (save {formatPaise(discountPaise)}).
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h3 className="text-xs font-bold tracking-wider text-muted-foreground uppercase">3 · Your secret moves</h3>
          <p className="text-xs text-muted-foreground">
            Locked in now and hidden until {friend.name} plays. Best of 3 wins.
          </p>
          <RpsPicker value={moves} onChange={setMoves} disabled={createChallenge.isPending} />
        </section>
      </div>
    </BottomSheet>
  )
}
