"use client"

import * as React from "react"
import { useParams } from "next/navigation"
import { Clock01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { AppHeader } from "@/components/layout/app-header"
import { PageContainer } from "@/components/layout/app-shell"
import { useSession } from "@/components/providers/session-provider"
import { LuckyNumberPicker } from "@/components/games/lucky-number-picker"
import { emptyRpsMoves, isComplete, RpsPicker } from "@/components/games/rps-picker"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { EmptyState } from "@/components/shared/empty-state"
import { PersonSettlementDialog } from "@/components/shared/person-settlement-dialog"
import { ListSkeleton, QueryError } from "@/components/shared/query-state"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import { useCancelChallenge, useResolveChallenge, useSubmitMove } from "@/hooks/mutations"
import { useChallenges, useExpenses } from "@/hooks/queries"
import { formatCountdown, useNow } from "@/hooks/use-now"
import { activeDiscountPaise, allPlayed, DISCOUNT_WINDOW_MS, discountExpiresAt, GAMES } from "@/lib/games"
import { calculatePersonNetBreakdown, formatPaise } from "@/lib/money"
import type { Challenge } from "@/lib/types"
import { LuckyResult, RpsResult } from "./_components/results"

export default function ChallengePage() {
  const { challengeId } = useParams<{ challengeId: string }>()
  const { user } = useSession()
  const challenges = useChallenges()
  const challenge = challenges.data.find((c) => c.id === challengeId)

  return (
    <>
      <AppHeader title={challenge ? GAMES[challenge.game].name : "Game"} showBack />
      <PageContainer className="max-w-xl gap-4 pb-24">
        {challenges.isPending ? (
          <ListSkeleton rows={3} />
        ) : challenges.isError ? (
          <QueryError error={challenges.error} onRetry={() => challenges.refetch()} />
        ) : !challenge || !user ? (
          <Card>
            <EmptyState icon={Clock01Icon} title="Game not found" description="It may have been cancelled or deleted." />
          </Card>
        ) : (
          <ChallengeBody challenge={challenge} uid={user.uid} />
        )}
      </PageContainer>
    </>
  )
}

function ChallengeBody({ challenge, uid }: { challenge: Challenge; uid: string }) {
  const game = GAMES[challenge.game]
  const isHost = challenge.hostId === uid
  const resolve = useResolveChallenge({ errorMessage: false })

  // Whoever opens a game that everyone has played reveals the result
  const triedResolve = React.useRef(false)
  React.useEffect(() => {
    if (challenge.status !== "OPEN" || !allPlayed(challenge) || triedResolve.current) return
    triedResolve.current = true
    resolve.mutate(challenge)
  }, [challenge, resolve])

  return (
    <>
      <Card className="rounded-3xl">
        <CardContent className="flex items-center gap-3">
          <span className="text-4xl" aria-hidden>
            {game.emoji}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold">{game.name}</p>
            <p className="text-xs text-muted-foreground">
              {isHost ? "You're hosting" : `Hosted by ${challenge.hostName}`}
              {challenge.expenseTitle && ` · for "${challenge.expenseTitle}"`}
            </p>
          </div>
          <Badge className="shrink-0 bg-success/15 font-bold text-success">{challenge.discountPercent}% off</Badge>
        </CardContent>
      </Card>

      {challenge.status === "CANCELLED" ? (
        <Card>
          <EmptyState icon={Clock01Icon} title="Game cancelled" description={`${challenge.hostName} called off this game.`} />
        </Card>
      ) : challenge.status === "DONE" ? (
        <ResultSection challenge={challenge} uid={uid} />
      ) : isHost ? (
        <HostWaiting challenge={challenge} />
      ) : challenge.moves[uid] === undefined ? (
        <PlaySection challenge={challenge} />
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-6 text-center">
            {resolve.isPending ? <Spinner className="size-6" /> : <HugeiconsIcon icon={Clock01Icon} className="size-8 text-muted-foreground" />}
            <p className="text-sm font-bold">{resolve.isPending ? "Revealing the result…" : "You're locked in!"}</p>
            <p className="text-xs text-muted-foreground">
              {allPlayed(challenge) ? "Everyone has played." : "Waiting for the others to play. You'll get a notification with the result."}
            </p>
            {allPlayed(challenge) && !resolve.isPending && (
              <Button size="sm" onClick={() => resolve.mutate(challenge)}>
                Show result
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </>
  )
}

/** A player's turn: pick moves / a guess and lock in. */
function PlaySection({ challenge }: { challenge: Challenge }) {
  const submit = useSubmitMove()
  const [moves, setMoves] = React.useState(emptyRpsMoves)
  const [guess, setGuess] = React.useState(50)
  const isRps = challenge.game === "rps"

  return (
    <Card className="rounded-3xl">
      <CardContent className="flex flex-col gap-5">
        <div>
          <p className="text-base font-bold">Your turn</p>
          <p className="text-xs text-muted-foreground">
            {isRps
              ? `${challenge.hostName} has locked in 3 secret moves. Win more rounds to get ${challenge.discountPercent}% off.`
              : `${challenge.hostName} picked a secret number from 1 to 100. Get closest to win ${challenge.discountPercent}% off.`}
          </p>
        </div>
        {isRps ? (
          <RpsPicker value={moves} onChange={setMoves} disabled={submit.isPending} />
        ) : (
          <LuckyNumberPicker value={guess} onChange={setGuess} disabled={submit.isPending} />
        )}
        <Button
          size="lg"
          className="h-12 w-full text-base"
          disabled={submit.isPending || (isRps && !isComplete(moves))}
          onClick={() => {
            if (!isRps) submit.mutate({ challenge, move: guess })
            else if (isComplete(moves)) submit.mutate({ challenge, move: moves })
          }}
        >
          {submit.isPending && <Spinner />}
          Lock in {isRps ? "my moves" : `${guess}`}
        </Button>
        <p className="text-center text-[11px] text-muted-foreground">You can&apos;t change it after locking in.</p>
      </CardContent>
    </Card>
  )
}

/** Host view while the game is open: who has played, end early, cancel. */
function HostWaiting({ challenge }: { challenge: Challenge }) {
  const resolve = useResolveChallenge()
  const cancel = useCancelChallenge()
  const [confirmCancel, setConfirmCancel] = React.useState(false)
  const played = challenge.players.filter((p) => challenge.moves[p] !== undefined)

  return (
    <Card className="rounded-3xl">
      <CardContent className="flex flex-col gap-4">
        <div>
          <p className="text-base font-bold">Waiting for players</p>
          <p className="text-xs text-muted-foreground">
            {played.length} of {challenge.players.length} played. The result is revealed automatically when everyone has.
          </p>
        </div>
        <ul className="flex flex-col gap-1.5">
          {challenge.players.map((p) => (
            <li key={p} className="flex items-center justify-between rounded-2xl border px-3 py-2 text-sm">
              <span className="truncate font-semibold">{challenge.playerNames[p]}</span>
              <span className="text-xs text-muted-foreground">
                owes {formatPaise(challenge.bases[p] ?? 0)} ·{" "}
                {challenge.moves[p] !== undefined ? <strong className="text-success">Played ✓</strong> : "Not yet"}
              </span>
            </li>
          ))}
        </ul>
        <div className="flex flex-col gap-2 sm:flex-row">
          {challenge.kind === "group" && played.length > 0 && played.length < challenge.players.length && (
            <Button className="flex-1" disabled={resolve.isPending} onClick={() => resolve.mutate(challenge)}>
              {resolve.isPending && <Spinner />}
              End game now
            </Button>
          )}
          <Button variant="outline" className="flex-1" onClick={() => setConfirmCancel(true)}>
            Cancel game
          </Button>
        </div>
      </CardContent>
      <ConfirmDialog
        open={confirmCancel}
        onOpenChange={setConfirmCancel}
        destructive
        title="Cancel this game?"
        description="Nobody will get a discount from it."
        confirmLabel="Cancel game"
        isPending={cancel.isPending}
        onConfirm={() => cancel.mutate(challenge, { onSuccess: () => setConfirmCancel(false) })}
      />
    </Card>
  )
}

/** Outcome, plus the winner's limited-time "pay now with discount" offer. */
function ResultSection({ challenge, uid }: { challenge: Challenge; uid: string }) {
  const { data: expenses } = useExpenses()
  const [payOpen, setPayOpen] = React.useState(false)
  const isHost = challenge.hostId === uid
  const won = challenge.result?.winners.includes(uid) ?? false
  const expiresAt = discountExpiresAt(challenge)
  const now = useNow(won ? expiresAt : 0)
  const owedNow = React.useMemo(
    () => (isHost ? 0 : calculatePersonNetBreakdown(uid, challenge.hostId, expenses).netPayablePaise),
    [isHost, uid, challenge.hostId, expenses]
  )
  const discount = Math.min(activeDiscountPaise(challenge, uid, now), owedNow)
  const winnerNames = (challenge.result?.winners ?? []).map((w) => challenge.playerNames[w])

  const headline = isHost
    ? winnerNames.length > 0
      ? `${winnerNames.join(", ")} won`
      : "You won — no discount given"
    : won
      ? "You won! 🎉"
      : challenge.game === "rps" && challenge.result?.winners.length === 0
        ? "No luck this time"
        : "You didn't win this one"

  return (
    <>
      <Card className="rounded-3xl">
        <CardContent className="flex flex-col gap-4">
          <p className="text-center text-xl font-black">{headline}</p>
          {challenge.game === "rps" ? (
            <RpsResult challenge={challenge} viewerId={uid} />
          ) : (
            <LuckyResult challenge={challenge} viewerId={uid} />
          )}
        </CardContent>
      </Card>

      {won && !isHost && (
        <Card className="rounded-3xl border-success/40">
          <CardContent className="flex flex-col items-center gap-3 text-center">
            {challenge.redeemed?.[uid] ? (
              <p className="text-sm font-bold text-success">
                ✓ Discount used — you saved {formatPaise(challenge.redeemed[uid])} on this game
              </p>
            ) : discount > 0 ? (
              <>
                <p className="text-sm font-bold">
                  Pay {challenge.hostName} now and save {formatPaise(discount)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatPaise(owedNow - discount)} instead of {formatPaise(owedNow)} · offer ends in{" "}
                  <strong className="tabular-nums text-foreground">{formatCountdown(expiresAt - now)}</strong>
                </p>
                <Button size="lg" variant="success" className="h-12 w-full text-base" onClick={() => setPayOpen(true)}>
                  Pay {formatPaise(owedNow - discount)} now
                </Button>
              </>
            ) : owedNow === 0 ? (
              <p className="text-xs text-muted-foreground">You don&apos;t owe {challenge.hostName} anything right now.</p>
            ) : (
              <p className="text-xs text-muted-foreground">
                The discount has expired — it was only valid for {DISCOUNT_WINDOW_MS / 60000} minutes after the game.
                You owe the full {formatPaise(owedNow)}.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {payOpen && (
        <PersonSettlementDialog
          open={payOpen}
          onOpenChange={setPayOpen}
          personId={challenge.hostId}
          personName={challenge.hostName}
          gameDiscount={{
            challengeId: challenge.id,
            discountPaise: Math.floor(((challenge.bases[uid] ?? 0) * challenge.discountPercent) / 100),
            percent: challenge.discountPercent,
            expiresAt,
          }}
          onSettled={() => setPayOpen(false)}
        />
      )}
    </>
  )
}
