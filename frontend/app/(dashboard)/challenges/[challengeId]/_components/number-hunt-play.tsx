"use client"

import * as React from "react"
import { ArrowDown01Icon, ArrowUp01Icon, Tick02Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { AnimatePresence, motion } from "motion/react"

import { huntHeat, NumberBoard } from "@/components/games/number-board"
import { useSession } from "@/components/providers/session-provider"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import { useSubmitMove } from "@/hooks/mutations"
import {
  howToWin,
  HUNT_GUESSES,
  HUNT_MAX,
  HUNT_MIN,
  huntRange,
  isForFun,
  type HuntHint,
} from "@/lib/games"
import type { Challenge } from "@/lib/types"
import { cn } from "@/lib/utils"
import { huntGuess, readHuntHint } from "@/services/challenges"

/**
 * A player's turn in Number Hunt: up to 5 guesses at a number from 1 to 60,
 * each answered with "go higher", "go lower" or "found it". Each guess is
 * saved before its hint can be read (security rules allow a hint only for a
 * number you've guessed), so hints come one at a time. When it's found or the
 * guesses run out, the guesses lock in as the move.
 */
export function NumberHuntPlay({ challenge, uid }: { challenge: Challenge; uid: string }) {
  const { user } = useSession()
  const submit = useSubmitMove()
  const host = challenge.hostName.split(" ")[0]

  const [guesses, setGuesses] = React.useState<number[]>(() => (challenge.progress?.[uid] ?? []).slice(0, HUNT_GUESSES))
  const [hints, setHints] = React.useState<Record<number, HuntHint>>({})
  const [selected, setSelected] = React.useState<number | null>(null)
  const [pending, setPending] = React.useState<number | null>(null)
  const [failed, setFailed] = React.useState(false)

  const live = React.useRef(challenge)
  React.useEffect(() => {
    live.current = challenge
  }, [challenge])

  // After a reload: the hints for guesses already made
  const [initialGuesses] = React.useState(guesses)
  React.useEffect(() => {
    if (initialGuesses.length === 0) return
    let cancelled = false
    Promise.all(initialGuesses.map(async (n) => [n, await readHuntHint(challenge.id, n)] as const))
      .then((entries) => !cancelled && setHints((h) => ({ ...h, ...Object.fromEntries(entries) })))
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [initialGuesses, challenge.id])

  const known = guesses.filter((g) => g in hints).map((guess) => ({ guess, hint: hints[guess] }))
  const allKnown = known.length === guesses.length
  const range = huntRange(known)
  const found = known.some((k) => k.hint === "found")
  const over = allKnown && (found || guesses.length >= HUNT_GUESSES)
  const last = known[known.length - 1]
  const heat = huntHeat(range.low, range.high)
  const left = HUNT_GUESSES - guesses.length

  // Found it or out of guesses: lock the guesses in, once
  const completed = React.useRef(false)
  React.useEffect(() => {
    if (!over || completed.current || guesses.length === 0) return
    completed.current = true
    submit.mutate({ challenge, move: guesses })
  }, [over, guesses, challenge, submit])

  const guess = async (n: number, retry: boolean) => {
    if (!user) return
    setFailed(false)
    setPending(n)
    let hint: HuntHint
    try {
      // A retry may follow a save that worked but a read that didn't
      const saved = retry ? await readHuntHint(challenge.id, n).catch(() => null) : null
      hint =
        saved ??
        (await huntGuess(user, { ...live.current, progress: { ...live.current.progress, [uid]: guesses } }, n))
    } catch {
      setFailed(true)
      return
    }
    setGuesses((g) => (g.includes(n) ? g : [...g, n]))
    setHints((h) => ({ ...h, [n]: hint }))
    setPending(null)
    setSelected(null)
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-4">
        <div>
          <p className="text-sm font-semibold">Your turn</p>
          <p className="text-xs text-muted-foreground">
            {host} hid a number from {HUNT_MIN} to {HUNT_MAX}. {howToWin(challenge)}
            {isForFun(challenge) ? "." : ` to get ${challenge.discountPercent}% off.`} Every guess is final.
          </p>
        </div>

        {/* Hint, heat and guesses left */}
        <div className="flex items-center gap-3 rounded-lg border px-3 py-2.5">
          <div className="min-w-0 flex-1" aria-live="polite">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={last ? `${last.guess}-${last.hint}` : "start"}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="flex items-center gap-2"
              >
                {last ? (
                  <>
                    <motion.span
                      className={cn(
                        "flex size-8 shrink-0 items-center justify-center rounded-full",
                        last.hint === "found" ? "bg-success text-success-foreground" : "bg-sky-500/15 text-sky-600 dark:text-sky-300"
                      )}
                      animate={last.hint === "found" ? { scale: [1, 1.25, 1] } : { y: last.hint === "higher" ? [0, -4, 0] : [0, 4, 0] }}
                      transition={{ duration: 0.8, repeat: last.hint === "found" ? 0 : Infinity, repeatDelay: 0.4 }}
                    >
                      <HugeiconsIcon
                        icon={last.hint === "found" ? Tick02Icon : last.hint === "higher" ? ArrowUp01Icon : ArrowDown01Icon}
                        className="size-4"
                        strokeWidth={3}
                      />
                    </motion.span>
                    <span className="min-w-0">
                      <span className="block text-base leading-tight font-bold">
                        {last.hint === "found" ? `Found it — ${last.guess}!` : `Go ${last.hint} than ${last.guess}`}
                      </span>
                      {last.hint !== "found" && (
                        <span className="block text-xs text-muted-foreground tabular-nums">
                          It&apos;s between {range.low} and {range.high} ·{" "}
                          <span className={cn("font-semibold", heat.tone)}>{heat.label}</span>
                        </span>
                      )}
                    </span>
                  </>
                ) : (
                  <span className="text-sm font-semibold">Pick your first guess</span>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            <span className="flex gap-1" aria-label={`${left} guesses left`}>
              {Array.from({ length: HUNT_GUESSES }, (_, i) => (
                <span
                  key={i}
                  className={cn(
                    "size-2 rounded-full transition-colors duration-300",
                    i < guesses.length
                      ? hints[guesses[i]] === "found"
                        ? "bg-success"
                        : "bg-muted-foreground/30"
                      : "bg-primary"
                  )}
                />
              ))}
            </span>
            <span className="text-[11px] text-muted-foreground tabular-nums">
              {left} {left === 1 ? "guess" : "guesses"} left
            </span>
          </div>
        </div>

        <NumberBoard
          mode="play"
          hints={hints}
          range={range}
          selected={selected}
          onSelect={setSelected}
          pending={pending}
          disabled={over || !allKnown || submit.isPending || failed}
        />

        {over ? (
          submit.isError && submit.variables ? (
            <Button variant="outline" onClick={() => submit.variables && submit.mutate(submit.variables)}>
              Couldn&apos;t save your guesses — try again
            </Button>
          ) : (
            <p
              className={cn(
                "flex items-center justify-center gap-2 text-center text-sm font-semibold",
                found ? "text-success" : "text-destructive"
              )}
            >
              <Spinner />
              {found
                ? `Found in ${guesses.length} ${guesses.length === 1 ? "guess" : "guesses"}!`
                : "Out of guesses."}
            </p>
          )
        ) : failed && pending !== null ? (
          <Button variant="outline" onClick={() => void guess(pending, true)}>
            Couldn&apos;t check {pending} — try again
          </Button>
        ) : (
          <Button
            size="lg"
            className="h-11 w-full"
            disabled={selected === null || pending !== null || !allKnown || submit.isPending}
            onClick={() => selected !== null && void guess(selected, false)}
          >
            {pending !== null && <Spinner />}
            {selected === null ? "Tap a number" : `Guess ${selected}`}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
