"use client"

import { useMutation } from "@tanstack/react-query"

import { Coins } from "@/components/fun/coin"
import { useSession } from "@/components/providers/session-provider"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import { useWallet } from "@/hooks/use-fun"
import { AppError } from "@/lib/errors"
import type { Challenge } from "@/lib/types"
import { cn } from "@/lib/utils"
import { joinStake } from "@/services/challenges"
import { isFriendDraw } from "@/services/fun"

/** A staked game: put your coins in before you play. */
export function StakeGate({ challenge }: { challenge: Challenge }) {
  const { user } = useSession()
  const wallet = useWallet()
  const stake = challenge.stake ?? 0
  const join = useMutation({
    mutationFn: () => {
      if (!user) throw new AppError("Please log in first")
      return joinStake(user, challenge)
    },
  })
  const short = wallet !== undefined && (wallet?.balance ?? 0) < stake

  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 text-center">
        <Coins amount={stake * 2} className="text-2xl" iconClassName="size-7" />
        <div>
          <p className="text-sm font-semibold">Winner takes {stake * 2} coins</p>
          <p className="text-xs text-muted-foreground">
            {challenge.hostName.split(" ")[0]} put in {stake}. Match it to play — a draw gives everyone their coins back.
          </p>
        </div>
        <Button className="w-full" disabled={join.isPending || short || wallet === undefined} onClick={() => join.mutate()}>
          {join.isPending && <Spinner />}
          {short ? `You need ${stake - (wallet?.balance ?? 0)} more coins` : <>Put in <Coins amount={stake} iconClassName="size-4" /> and play</>}
        </Button>
      </CardContent>
    </Card>
  )
}

/** After a staked game: what it meant for your coins. */
export function StakeOutcome({ challenge, uid }: { challenge: Challenge; uid: string }) {
  const stake = challenge.stake ?? 0
  if (stake <= 0 || !challenge.staked?.includes(uid)) return null

  let delta = 0
  let label = ""
  if (challenge.status === "CANCELLED") {
    label = "Your stake came back"
  } else if (challenge.status === "DONE" && challenge.result) {
    if (isFriendDraw(challenge)) {
      label = "A draw — stakes returned"
    } else {
      const player = challenge.players[0]
      const won = challenge.result.winners.includes(player) === (uid === player)
      delta = won ? stake * 2 : -stake
      label = won ? `You won ${stake * 2} coins` : `You lost your ${stake} coins`
    }
  } else {
    return null
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border bg-card px-4 py-3">
      <span className="text-sm font-medium">{label}</span>
      <span
        className={cn(
          "text-sm font-semibold tabular-nums",
          delta > 0 ? "text-success" : delta < 0 ? "text-destructive" : "text-muted-foreground"
        )}
      >
        {delta > 0 ? "+" : delta < 0 ? "−" : ""}
        <Coins amount={delta === 0 ? stake : Math.abs(delta)} iconClassName="size-3.5" />
      </span>
    </div>
  )
}
