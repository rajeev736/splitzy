"use client"

import * as React from "react"

import { KickTally, PenaltyPitch, type KickOutcome } from "@/components/games/penalty-pitch"
import { useSession } from "@/components/providers/session-provider"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import { useSubmitMove } from "@/hooks/mutations"
import {
  hasHostRounds,
  howToWin,
  isForFun,
  PENALTY_KICKS,
  PENALTY_TO_WIN,
  type PenaltyDir,
} from "@/lib/games"
import type { Challenge } from "@/lib/types"
import { cn } from "@/lib/utils"
import { playPenaltyKick, readKeeperDive } from "@/services/challenges"

/** How long the ball flies before the verdict, and how long the verdict stays up. */
const FLIGHT_MS = 650
const SAVE_FLIGHT_MS = 950
const VERDICT_MS = 1500

const wait = (ms: number) => new Promise((r) => window.setTimeout(r, ms))

interface InFlight {
  kick: number
  shot: PenaltyDir
  /** The keeper's dive once known; "hidden" in group games (shown at the end). */
  dive: PenaltyDir | "hidden" | null
  verdict: boolean
}

/**
 * A player's turn in Penalty Shootout: 5 kicks, one at a time. One-on-one,
 * each shot is saved before the keeper's dive for it is read, so the keeper
 * dives live and every kick is a goal or a save on the spot. In a group the
 * keeper's dives stay hidden until the results. After the 5th kick the shots
 * lock in as the move.
 */
export function PenaltyPlay({ challenge, uid }: { challenge: Challenge; uid: string }) {
  const { user } = useSession()
  const submit = useSubmitMove()
  const reveals = hasHostRounds(challenge)
  const host = challenge.hostName.split(" ")[0]

  // Kicks already taken (after a reload) can't be retaken
  const [initialShots] = React.useState(() =>
    reveals ? ((challenge.roundPlays?.[uid] ?? []) as PenaltyDir[]).slice(0, PENALTY_KICKS) : []
  )
  const [shots, setShots] = React.useState<PenaltyDir[]>(initialShots)
  const [dives, setDives] = React.useState<(PenaltyDir | "hidden" | null)[]>([])
  const [inFlight, setInFlight] = React.useState<InFlight | null>(null)
  const [failed, setFailed] = React.useState(false)

  // The live game, so a retried kick knows what the server already has
  const live = React.useRef(challenge)
  React.useEffect(() => {
    live.current = challenge
  }, [challenge])

  // After a reload: the dives for kicks already taken
  React.useEffect(() => {
    if (!reveals || initialShots.length === 0) return
    let cancelled = false
    void Promise.all(initialShots.map((_, i) => readKeeperDive(challenge.id, i))).then(
      (d) => !cancelled && setDives(d)
    )
    return () => {
      cancelled = true
    }
  }, [reveals, initialShots, challenge.id])

  const outcomeOf = (shot: PenaltyDir, dive: PenaltyDir | "hidden" | null): KickOutcome | null =>
    dive === null ? null : dive === "hidden" ? "taken" : dive === shot ? "save" : "goal"
  const outcomes = shots.map((s, i) => outcomeOf(s, dives[i] ?? (reveals ? null : "hidden")))
  const goals = outcomes.filter((o) => o === "goal").length
  const saves = outcomes.filter((o) => o === "save").length
  const done = shots.length >= PENALTY_KICKS && inFlight === null

  // All 5 taken (now or before a reload): lock the shots in, once
  const completed = React.useRef(false)
  React.useEffect(() => {
    if (!done || completed.current) return
    completed.current = true
    submit.mutate({ challenge, move: shots })
  }, [done, shots, challenge, submit])

  /** Saves the shot and finds out where the keeper went. */
  const keeperFor = async (next: PenaltyDir[], retry: boolean): Promise<PenaltyDir | "hidden"> => {
    if (!reveals || !user) return "hidden"
    // A retry may follow a save that worked but a read that didn't
    if (retry) {
      const known = await readKeeperDive(challenge.id, next.length - 1)
      if (known) return known
    }
    const dive = await playPenaltyKick(user, live.current, next)
    if (!dive) throw new Error("No dive")
    return dive
  }

  const kickOff = async (kick: number, shot: PenaltyDir, retry: boolean) => {
    setFailed(false)
    const next = [...shots, shot]
    let dive: PenaltyDir | "hidden"
    try {
      dive = await keeperFor(next, retry)
    } catch {
      setFailed(true)
      return
    }
    setInFlight({ kick, shot, dive, verdict: false })
    await wait(dive === shot ? SAVE_FLIGHT_MS : FLIGHT_MS)
    setShots(next)
    setDives((d) => {
      const copy = [...d]
      copy[kick] = dive
      return copy
    })
    setInFlight((f) => f && { ...f, verdict: true })
    await wait(VERDICT_MS)
    setInFlight(null)
  }

  const shoot = (dir: PenaltyDir) => {
    if (inFlight || shots.length >= PENALTY_KICKS) return
    setInFlight({ kick: shots.length, shot: dir, dive: null, verdict: false })
    void kickOff(shots.length, dir, false)
  }

  const kick = inFlight?.kick ?? shots.length
  const showing = inFlight?.verdict ? outcomeOf(inFlight.shot, inFlight.dive) : null
  const decided = reveals && (goals >= PENALTY_TO_WIN || saves > PENALTY_KICKS - PENALTY_TO_WIN)

  return (
    <Card>
      <CardContent className="flex flex-col gap-4">
        <div>
          <p className="text-sm font-semibold">Your turn</p>
          <p className="text-xs text-muted-foreground">
            {host} picked where their keeper dives for each kick. {howToWin(challenge)}
            {isForFun(challenge) ? "." : ` to get ${challenge.discountPercent}% off.`}{" "}
            {reveals ? "Every kick is final." : "The keeper's dives are revealed with the results."}
          </p>
        </div>

        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-semibold tabular-nums">
            {done ? "Shootout over" : kick === PENALTY_KICKS - 1 ? "Last kick" : `Kick ${kick + 1} of ${PENALTY_KICKS}`}
          </span>
          {reveals && (
            <span className="text-xs font-semibold tabular-nums">
              <span className={cn(goals > 0 && "text-success")}>{goals}</span>{" "}
              {goals === 1 ? "goal" : "goals"} ·{" "}
              <span className={cn(saves > 0 && "text-destructive")}>{saves}</span> saved
            </span>
          )}
        </div>

        <PenaltyPitch
          kick={kick}
          shot={inFlight?.shot ?? null}
          dive={inFlight?.dive ?? null}
          outcome={showing}
          onAim={done ? undefined : shoot}
          disabled={done || submit.isPending}
        />

        <KickTally outcomes={outcomes} current={done ? undefined : kick} />

        <div className="min-h-9 text-center" aria-live="polite">
          {failed && inFlight ? (
            <Button variant="outline" onClick={() => void kickOff(inFlight.kick, inFlight.shot, true)}>
              Couldn&apos;t take the kick — try again
            </Button>
          ) : done ? (
            submit.isError && submit.variables ? (
              <Button variant="outline" onClick={() => submit.variables && submit.mutate(submit.variables)}>
                Couldn&apos;t save your kicks — try again
              </Button>
            ) : (
              <p className="flex items-center justify-center gap-2 text-sm font-medium">
                <Spinner />
                {reveals
                  ? `${goals} of ${PENALTY_KICKS} scored — locking in the result…`
                  : "Locking in your kicks…"}
              </p>
            )
          ) : inFlight && !inFlight.dive ? (
            <p className="text-xs font-medium text-muted-foreground">{reveals ? `Up against ${host}'s keeper…` : "Shooting…"}</p>
          ) : decided && !inFlight ? (
            <p className="text-xs font-medium text-muted-foreground">
              {goals >= PENALTY_TO_WIN
                ? `${goals} goals — you've won it! Take the rest for glory.`
                : `${host}'s keeper has it this time. Finish the shootout.`}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              {inFlight ? " " : "Tap left, centre or right of the goal to shoot."}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
