"use client"

import * as React from "react"
import { ArrowDown01Icon, ArrowUp01Icon, Cancel01Icon, Tick02Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { AnimatePresence, motion } from "motion/react"

import { CardBack, CardFace, FlipCard } from "@/components/games/playing-card"
import { useSession } from "@/components/providers/session-provider"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import { useSubmitMove } from "@/hooks/mutations"
import {
  CARD_MAX,
  CARD_MIN,
  cardRank,
  HILO_CARDS,
  HILO_GUESSES,
  HILO_LABEL,
  HILO_TO_WIN,
  hiloCallRight,
  howToWin,
  isForFun,
  type HiloCall,
} from "@/lib/games"
import type { Challenge } from "@/lib/types"
import { cn } from "@/lib/utils"
import { playHiloCall, readHiloCard } from "@/services/challenges"

/** How long a turned card's verdict shows before it becomes the card to beat. */
const VERDICT_MS = 1400
const FLIP_MS = 650

const wait = (ms: number) => new Promise((r) => window.setTimeout(r, ms))

/**
 * A player's turn in Higher or Lower: the first card is face up; call whether
 * the next is higher or lower, and it turns over. Each call is saved before its
 * card can be read (security rules allow card n+1 only after call n), so the
 * cards come one at a time. After the 5th call the calls lock in as the move.
 */
export function HiloPlay({ challenge, uid }: { challenge: Challenge; uid: string }) {
  const { user } = useSession()
  const submit = useSubmitMove()
  const host = challenge.hostName.split(" ")[0]

  const [initialCalls] = React.useState(() =>
    ((challenge.roundPlays?.[uid] ?? []) as HiloCall[]).slice(0, HILO_GUESSES)
  )
  const [calls, setCalls] = React.useState<HiloCall[]>(initialCalls)
  /** Cards turned over so far, by position. */
  const [cards, setCards] = React.useState<(number | null)[]>(() => Array.from({ length: HILO_CARDS }, () => null))
  /** The call being made: waiting for its card, then showing whether it was right. */
  const [turning, setTurning] = React.useState<{ call: HiloCall; card: number | null; verdict: boolean } | null>(null)
  const [failed, setFailed] = React.useState(false)
  const [loadFailed, setLoadFailed] = React.useState(false)

  const live = React.useRef(challenge)
  React.useEffect(() => {
    live.current = challenge
  }, [challenge])

  // The first card, plus (after a reload) every card already turned
  const [loadKey, setLoadKey] = React.useState(0)
  React.useEffect(() => {
    let cancelled = false
    void Promise.all(Array.from({ length: initialCalls.length + 1 }, (_, n) => readHiloCard(challenge.id, n))).then(
      (known) => {
        if (cancelled) return
        if (known.some((c) => c === null)) setLoadFailed(true)
        else setLoadFailed(false)
        setCards((prev) => prev.map((c, i) => known[i] ?? c))
      }
    )
    return () => {
      cancelled = true
    }
  }, [challenge.id, initialCalls.length, loadKey])

  const step = calls.length
  const done = step >= HILO_GUESSES && turning === null
  const right = calls.filter((c, i) => cards[i] !== null && cards[i + 1] !== null && hiloCallRight(c, cards[i]!, cards[i + 1]!)).length
  const wrong = calls.filter((c, i) => cards[i] !== null && cards[i + 1] !== null && !hiloCallRight(c, cards[i]!, cards[i + 1]!)).length

  // All 5 called: lock in, once
  const completed = React.useRef(false)
  React.useEffect(() => {
    if (!done || completed.current) return
    completed.current = true
    submit.mutate({ challenge, move: calls })
  }, [done, calls, challenge, submit])

  const turnOver = async (call: HiloCall, retry: boolean) => {
    if (!user) return
    setFailed(false)
    const next = [...calls, call]
    let card: number | null = null
    try {
      // A retry may follow a save that worked but a read that didn't
      if (retry) card = await readHiloCard(challenge.id, next.length)
      if (card === null) card = await playHiloCall(user, live.current, next)
    } catch {
      setFailed(true)
      return
    }
    setTurning({ call, card, verdict: false })
    await wait(FLIP_MS)
    setTurning((t) => t && { ...t, verdict: true })
    await wait(VERDICT_MS)
    setCards((prev) => prev.map((c, i) => (i === next.length ? card : c)))
    setCalls(next)
    setTurning(null)
  }

  const makeCall = (call: HiloCall) => {
    if (turning || done || cards[step] === null) return
    setTurning({ call, card: null, verdict: false })
    void turnOver(call, false)
  }

  const current = cards[step]
  const turned = turning?.card ?? null
  const turnedRight = turning && current !== null && turned !== null ? hiloCallRight(turning.call, current, turned) : null

  return (
    <Card>
      <CardContent className="flex flex-col gap-4">
        <div>
          <p className="text-sm font-semibold">Your turn</p>
          <p className="text-xs text-muted-foreground">
            {host} dealt {HILO_CARDS} cards (2 low, A high, never the same twice in a row). {howToWin(challenge)}
            {isForFun(challenge) ? "." : ` to get ${challenge.discountPercent}% off.`} Every call is final.
          </p>
        </div>

        {/* The deal so far */}
        <div className="flex items-end justify-center gap-1.5" aria-label="Cards so far">
          {Array.from({ length: HILO_CARDS }, (_, i) => {
            const v = cards[i]
            const result = i > 0 && i <= calls.length && cards[i - 1] !== null && v !== null
              ? hiloCallRight(calls[i - 1], cards[i - 1]!, v)
              : null
            return (
              <div key={i} className="flex flex-col items-center gap-1">
                {v !== null ? (
                  <CardFace value={v} index={i} size="xs" className={cn("animate-in duration-300 zoom-in-90", i === step && "ring-2 ring-primary ring-offset-1 ring-offset-background")} />
                ) : (
                  <CardBack size="xs" className={cn(i > step + 1 && "opacity-50")} />
                )}
                <span
                  className={cn(
                    "flex size-4 items-center justify-center rounded-full",
                    result === true ? "bg-success text-success-foreground" : result === false ? "bg-destructive text-white" : "bg-transparent"
                  )}
                  aria-hidden
                >
                  {result !== null && <HugeiconsIcon icon={result ? Tick02Icon : Cancel01Icon} className="size-2.5" strokeWidth={3} />}
                </span>
              </div>
            )
          })}
        </div>

        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-semibold tabular-nums">
            {done ? "All cards called" : step === HILO_GUESSES - 1 ? "Last card" : `Card ${step + 2} of ${HILO_CARDS}`}
          </span>
          <span className="text-xs font-semibold tabular-nums">
            <span className={cn(right > 0 && "text-success")}>{right}</span> right ·{" "}
            <span className={cn(wrong > 0 && "text-destructive")}>{wrong}</span> wrong
          </span>
        </div>

        {/* The table: the card to beat and the next one, face down until called */}
        <div className="relative flex items-center justify-center gap-6 rounded-lg bg-emerald-700/90 py-6 shadow-inner min-[400px]:gap-10"
          style={{ backgroundImage: "radial-gradient(ellipse at center, rgb(255 255 255 / 0.12), transparent 70%)" }}
        >
          {current === null ? (
            <div className="flex aspect-[5/7] w-[5.75rem] items-center justify-center min-[400px]:w-28">
              {loadFailed ? (
                <Button size="sm" variant="secondary" onClick={() => setLoadKey((k) => k + 1)}>
                  Retry
                </Button>
              ) : (
                <Spinner className="size-6 text-white" />
              )}
            </div>
          ) : (
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.div
                key={`current-${step}`}
                initial={{ x: 90, opacity: 0.6 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ type: "spring", stiffness: 260, damping: 26 }}
              >
                <CardFace value={current} index={step} />
              </motion.div>
            </AnimatePresence>
          )}

          {step < HILO_GUESSES || turning ? (
            <div className="relative">
              <motion.div
                key={`next-${step}`}
                initial={{ y: -14, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.3, delay: 0.1 }}
              >
                <FlipCard value={turned} index={step + 1} />
              </motion.div>
              {/* The call, then whether it was right */}
              <AnimatePresence>
                {turning && (
                  <motion.span
                    key={turning.verdict ? "verdict" : "call"}
                    className={cn(
                      "absolute -top-3 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold whitespace-nowrap text-white shadow-md",
                      !turning.verdict ? "bg-slate-900/80" : turnedRight ? "bg-success" : "bg-destructive"
                    )}
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.8, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 500, damping: 24 }}
                  >
                    {!turning.verdict ? (
                      <>
                        <HugeiconsIcon icon={turning.call === "H" ? ArrowUp01Icon : ArrowDown01Icon} className="size-3" strokeWidth={3} />
                        {HILO_LABEL[turning.call]}
                      </>
                    ) : turnedRight ? (
                      "Right!"
                    ) : (
                      "Wrong"
                    )}
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
          ) : null}
        </div>

        {done ? (
          submit.isError && submit.variables ? (
            <Button variant="outline" onClick={() => submit.variables && submit.mutate(submit.variables)}>
              Couldn&apos;t save your calls — try again
            </Button>
          ) : (
            <p className="flex items-center justify-center gap-2 text-sm font-medium">
              <Spinner /> {right} of {HILO_GUESSES} right — locking in the result…
            </p>
          )
        ) : failed && turning ? (
          <Button variant="outline" onClick={() => void turnOver(turning.call, true)}>
            Couldn&apos;t turn the card over — try again
          </Button>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2">
              {(["H", "L"] as const).map((call) => {
                // Nothing beats an ace, nothing is under a 2
                const impossible = current !== null && (call === "H" ? current >= CARD_MAX : current <= CARD_MIN)
                return (
                  <Button
                    key={call}
                    size="lg"
                    variant={call === "H" ? "default" : "outline"}
                    className="h-12 text-base"
                    disabled={!!turning || current === null || impossible || submit.isPending}
                    onClick={() => makeCall(call)}
                  >
                    <HugeiconsIcon icon={call === "H" ? ArrowUp01Icon : ArrowDown01Icon} strokeWidth={2.5} />
                    {HILO_LABEL[call]}
                  </Button>
                )
              })}
            </div>
            <p className="text-center text-[11px] text-muted-foreground" aria-live="polite">
              {current === null
                ? "Dealing…"
                : right >= HILO_TO_WIN
                  ? `${right} right — you've won it! Finish the deal.`
                  : wrong > HILO_GUESSES - HILO_TO_WIN
                    ? "Not this time — finish the deal."
                    : `Is the next card higher or lower than ${cardRank(current)}?`}
            </p>
          </>
        )}
      </CardContent>
    </Card>
  )
}
