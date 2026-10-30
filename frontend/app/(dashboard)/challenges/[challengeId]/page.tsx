"use client"

import * as React from "react"
import { useParams } from "next/navigation"
import { Clock01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { AppHeader } from "@/components/layout/app-header"
import { PageContainer } from "@/components/layout/app-shell"
import { useSession } from "@/components/providers/session-provider"
import { CoinTossPicker, emptyCoinCalls, isCoinComplete } from "@/components/games/coin-toss-picker"
import { LuckyNumberPicker } from "@/components/games/lucky-number-picker"
import { emptyRpsMoves, isComplete, RpsPicker } from "@/components/games/rps-picker"
import { RpsTimedPlay } from "@/components/games/rps-timed-play"
import { TreasureGrid } from "@/components/games/treasure-picker"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { EmptyState } from "@/components/shared/empty-state"
import { PersonSettlementDialog } from "@/components/shared/person-settlement-dialog"
import { ListSkeleton, QueryError } from "@/components/shared/query-state"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import { useCancelChallenge, useResolveChallenge, useSettleWithGameWaiver, useSubmitMove } from "@/hooks/mutations"
import { useChallenges, useExpenses } from "@/hooks/queries"
import { useLiveGameDiscounts } from "@/hooks/use-game-discounts"
import { formatCountdown } from "@/hooks/use-now"
import {
  activeDiscountPaise,
  allPlayed,
  DISCOUNT_WINDOW_MS,
  discountExpiresAt,
  GAMES,
  howToWin,
  isForFun,
  isGridGame,
  stakeLabel,
  type GameMove,
  type RpsPlay,
} from "@/lib/games"
import { calculatePersonNetBreakdown, formatPaise } from "@/lib/money"
import type { Challenge } from "@/lib/types"
import { hasRoundByRoundRps, playRpsRound, readHostRound } from "@/services/challenges"
import { GridPlay } from "./_components/grid-play"
import { GameResult } from "./_components/results"
import { GameGlyph } from "@/components/games/game-glyph"

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
      <Card>
        <CardContent className="flex items-center gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-md border text-2xl" aria-hidden>
            <GameGlyph game={challenge.game} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">{game.name}</p>
            <p className="text-xs text-muted-foreground">
              {isHost ? "You're hosting" : `Hosted by ${challenge.hostName}`}
              {challenge.expenseTitle
                ? ` · for "${challenge.expenseTitle}"`
                : challenge.groupName
                  ? ` · ${challenge.groupName}`
                  : ""}
            </p>
          </div>
          <span
            className={
              isForFun(challenge)
                ? "shrink-0 text-xs font-medium text-muted-foreground"
                : "shrink-0 text-sm font-semibold tabular-nums text-success"
            }
          >
            {stakeLabel(challenge)}
          </span>
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
        isGridGame(challenge.game) ? (
          <GridPlay challenge={challenge} uid={uid} />
        ) : (
          challenge.game === "rps" ? (
            <RpsPlaySection challenge={challenge} />
          ) : (
            <PlaySection challenge={challenge} />
          )
        )
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-6 text-center">
            {resolve.isPending ? <Spinner className="size-6" /> : <HugeiconsIcon icon={Clock01Icon} className="size-8 text-muted-foreground" />}
            <p className="text-sm font-semibold">{resolve.isPending ? "Revealing the result…" : "You're locked in!"}</p>
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
/** Stone Paper Scissors, played one timed round at a time; the moves lock in after round 3. */
function RpsPlaySection({ challenge }: { challenge: Challenge }) {
  const submit = useSubmitMove()
  const { user } = useSession()
  const forFun = isForFun(challenge)
  // Friend games: each round is saved as it's played and its result shows right away
  const roundByRound = hasRoundByRoundRps(challenge)
  const [initialPlays] = React.useState(() => (user ? ((challenge.roundPlays?.[user.uid] ?? []) as RpsPlay[]) : []))
  const playRound = React.useCallback(
    (plays: RpsPlay[]) => {
      if (!user) return Promise.resolve(null)
      return playRpsRound(user, challenge, plays)
    },
    // The game doesn't change while playing
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [challenge.id, user?.uid]
  )
  const revealRound = React.useCallback((round: number) => readHostRound(challenge.id, round), [challenge.id])
  const onComplete = React.useCallback(
    (moves: RpsPlay[]) => submit.mutate({ challenge, move: moves }),
    // The game doesn't change while playing; submit's identity is stable enough
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [challenge.id]
  )
  return (
    <Card>
      <CardContent className="flex flex-col gap-4">
        <div>
          <p className="text-sm font-semibold">Your turn</p>
          <p className="text-xs text-muted-foreground">
            {howToWin(challenge)}
            {forFun ? "." : ` to get ${challenge.discountPercent}% off.`}
          </p>
        </div>
        <RpsTimedPlay
          hostName={challenge.hostName}
          disabled={submit.isPending}
          initialPlays={initialPlays}
          playRound={roundByRound ? playRound : undefined}
          revealRound={roundByRound ? revealRound : undefined}
          onComplete={onComplete}
        />
        {submit.isError && submit.variables && (
          <Button variant="outline" onClick={() => submit.variables && submit.mutate(submit.variables)}>
            Couldn&apos;t save your moves — try again
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

function PlaySection({ challenge }: { challenge: Challenge }) {
  const submit = useSubmitMove()
  const [moves, setMoves] = React.useState(emptyRpsMoves)
  const [calls, setCalls] = React.useState(emptyCoinCalls)
  const [box, setBox] = React.useState<number | null>(null)
  const [guess, setGuess] = React.useState(50)
  const forFun = isForFun(challenge)
  const disabled = submit.isPending

  // The move for this game, or null while it isn't complete yet
  const move: GameMove | null =
    challenge.game === "rps"
      ? isComplete(moves)
        ? moves
        : null
      : challenge.game === "coin_toss"
        ? isCoinComplete(calls)
          ? calls
          : null
        : challenge.game === "treasure"
          ? box
          : guess

  const intro = {
    rps: `${challenge.hostName} has locked in 3 secret moves.`,
    coin_toss: `${challenge.hostName} has locked in 5 secret coin flips. Call each one.`,
    treasure: `${challenge.hostName} hid treasure in 3 of these 9 boxes. Open one.`,
    lucky_number: `${challenge.hostName} picked a secret number between 1 and 100.`,
    // Grid games have their own screen (GridPlay)
    minefield: "",
    gold_rush: "",
  }[challenge.game]

  return (
    <Card>
      <CardContent className="flex flex-col gap-5">
        <div>
          <p className="text-sm font-semibold">Your turn</p>
          <p className="text-xs text-muted-foreground">
            {intro} {howToWin(challenge)}
            {forFun ? "." : ` to get ${challenge.discountPercent}% off.`}
          </p>
        </div>
        {challenge.game === "rps" ? (
          <RpsPicker value={moves} onChange={setMoves} disabled={disabled} />
        ) : challenge.game === "coin_toss" ? (
          <CoinTossPicker value={calls} onChange={setCalls} disabled={disabled} />
        ) : challenge.game === "treasure" ? (
          <TreasureGrid value={box} onChange={setBox} disabled={disabled} />
        ) : (
          <LuckyNumberPicker value={guess} onChange={setGuess} disabled={disabled} />
        )}
        <Button
          size="lg"
          className="h-11 w-full"
          disabled={disabled || move === null}
          onClick={() => move !== null && submit.mutate({ challenge, move })}
        >
          {submit.isPending && <Spinner />}
          {challenge.game === "treasure"
            ? box === null
              ? "Pick a box"
              : `Open box ${box + 1}`
            : challenge.game === "lucky_number"
              ? `Lock in ${guess}`
              : challenge.game === "coin_toss"
                ? "Lock in my calls"
                : "Lock in my moves"}
        </Button>
        <p className="text-center text-[11px] text-muted-foreground">
          You can&apos;t change it after locking in.
          {!forFun &&
            ` Take your time: the ${DISCOUNT_WINDOW_MS / 60000}-minute discount timer only starts once the result is out.`}
        </p>
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
    <Card>
      <CardContent className="flex flex-col gap-4">
        <div>
          <p className="text-sm font-semibold">Waiting for players</p>
          <p className="text-xs text-muted-foreground">
            {played.length} of {challenge.players.length} played. The result is revealed automatically when everyone has.
          </p>
        </div>
        <ul className="flex flex-col divide-y border-y">
          {challenge.players.map((p) => (
            <li key={p} className="flex items-center justify-between gap-3 py-2.5 text-sm">
              <span className="min-w-0 truncate font-medium">{challenge.playerNames[p]}</span>
              <span className="shrink-0 text-xs text-muted-foreground">
                {!isForFun(challenge) && <>owes {formatPaise(challenge.bases[p] ?? 0)} · </>}
                {challenge.moves[p] !== undefined ? <span className="font-medium text-success">Played</span> : "Not yet"}
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
        description={isForFun(challenge) ? "The players won't be able to play it." : "Nobody will get a discount from it."}
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
  const waive = useSettleWithGameWaiver()
  const isHost = challenge.hostId === uid
  const won = challenge.result?.winners.includes(uid) ?? false
  const expiresAt = discountExpiresAt(challenge)
  const breakdown = React.useMemo(
    () => (isHost ? null : calculatePersonNetBreakdown(uid, challenge.hostId, expenses)),
    [isHost, uid, challenge.hostId, expenses]
  )
  const owedNow = breakdown?.netPayablePaise ?? 0
  // Everything owed is reported: the payment is done, waiting on the host to confirm
  const paymentReported =
    !!breakdown?.aOwesBLines.length && breakdown.aOwesBLines.every((l) => l.status === "PAYMENT_REPORTED")
  // This game's own discount (another game with the same host can't hide it); gone once you pay
  const { now } = useLiveGameDiscounts()
  const discount = paymentReported ? 0 : Math.min(activeDiscountPaise(challenge, uid, now), owedNow)
  const winnerNames = (challenge.result?.winners ?? []).map((w) => challenge.playerNames[w])

  const forFun = isForFun(challenge)
  const headline = isHost
    ? winnerNames.length > 0
      ? `${winnerNames.join(", ")} won`
      : forFun
        ? "Nobody beat you — you win!"
        : "You won — no discount given"
    : won
      ? "You won!"
      : challenge.result?.winners.length === 0
        ? "No luck this time"
        : "You didn't win this one"

  return (
    <>
      <Card>
        <CardContent className="flex flex-col gap-4">
          <p className="text-center text-lg font-semibold">{headline}</p>
          <GameResult challenge={challenge} viewerId={uid} />
        </CardContent>
      </Card>

      {won && !isHost && !forFun && (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 text-center">
            {challenge.redeemed?.[uid] && challenge.discountPercent === 100 && owedNow > 0 && !paymentReported ? (
              // A win settles once; anything owed since then is paid the usual way
              <p className="text-xs text-muted-foreground">
                This win has already been used. You owe {challenge.hostName} {formatPaise(owedNow)} for other splits.
              </p>
            ) : challenge.redeemed?.[uid] ? (
              <p className="text-sm font-medium text-success">
                {challenge.discountPercent === 100
                  ? `Settled for free — your win covered ${formatPaise(challenge.redeemed[uid])}`
                  : `Discount used — you saved ${formatPaise(challenge.redeemed[uid])} on this game`}
              </p>
            ) : !challenge.resolvedAt ? (
              // Result saved locally, server time not in yet: the timer hasn't started
              <p className="flex items-center gap-2 text-xs text-muted-foreground">
                <Spinner /> Starting your {DISCOUNT_WINDOW_MS / 60000}-minute discount…
              </p>
            ) : discount > 0 && owedNow - discount <= 0 && challenge.discountPercent === 100 ? (
              // The win covers everything: nothing to pay, just settle
              <>
                <p className="flex items-center justify-center gap-2 text-sm font-semibold">
                  <Spinner />
                  Settling your {formatPaise(owedNow)} with {challenge.hostName}…
                </p>
                <p className="text-xs text-muted-foreground">
                  Your win covers all of it, so it settles by itself and {challenge.hostName} gets a message. Nothing
                  to pay.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={waive.isPending}
                  onClick={() => waive.mutate({ creditorId: challenge.hostId, challengeId: challenge.id })}
                >
                  Taking long? Settle now
                </Button>
              </>
            ) : discount > 0 ? (
              <>
                <p className="text-sm font-semibold">
                  Pay {challenge.hostName} now and save {formatPaise(discount)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatPaise(owedNow - discount)} instead of {formatPaise(owedNow)} · offer ends in{" "}
                  <strong className="tabular-nums text-foreground">{formatCountdown(expiresAt - now)}</strong>
                </p>
                <Button size="lg" variant="success" className="h-11 w-full" onClick={() => setPayOpen(true)}>
                  Pay {formatPaise(owedNow - discount)} now
                </Button>
              </>
            ) : paymentReported ? (
              <p className="text-xs text-muted-foreground">
                Payment reported — waiting for {challenge.hostName} to confirm.
              </p>
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
