"use client"

import * as React from "react"

import { GRID_ITEM, GridBoard } from "@/components/games/grid-board"
import { Card, CardContent } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import { useDigTile, useSubmitMove } from "@/hooks/mutations"
import {
  GOLD_DIGS,
  GOLD_TO_WIN,
  GRID_CELLS,
  gridMaxDigs,
  howToWin,
  isForFun,
  MINEFIELD_BOMBS,
  MINEFIELD_STRIKES,
  scoreGrid,
  type GridGameId,
} from "@/lib/games"
import type { Challenge } from "@/lib/types"
import { cn } from "@/lib/utils"
import { readTile } from "@/services/challenges"

/**
 * A player's turn in Minefield / Gold Rush: dig tiles one at a time and see
 * each one straight away. When the game is decided (3rd bomb, every safe tile,
 * 2nd coin, last dig) the digs are locked in as the move automatically.
 */
export function GridPlay({ challenge, uid }: { challenge: Challenge; uid: string }) {
  const game = challenge.game as GridGameId
  const item = GRID_ITEM[game]
  const dig = useDigTile()
  const submit = useSubmitMove()
  const dug = React.useMemo(() => challenge.progress?.[uid] ?? [], [challenge.progress, uid])

  // What each dug tile hid. Tiles dug in an earlier visit are read back once.
  const [hits, setHits] = React.useState<Record<number, boolean>>({})
  /** Tiles tapped, opening one after another in tap order (the head is being dug). */
  const [queue, setQueue] = React.useState<number[]>([])
  const dugKey = dug.join(",")
  React.useEffect(() => {
    // Tiles from an earlier visit; the ones being dug right now read themselves
    const unknown = dugKey ? dugKey.split(",").map(Number).filter((c) => !(c in hits) && !queue.includes(c)) : []
    if (unknown.length === 0) return
    let cancelled = false
    Promise.all(unknown.map(async (c) => [c, await readTile(challenge.id, c)] as const))
      .then((entries) => !cancelled && setHits((h) => ({ ...h, ...Object.fromEntries(entries) })))
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
    // `hits` is read only to skip known tiles; re-running on it would refetch nothing
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dugKey, challenge.id])

  const known = dug.filter((c) => c in hits)
  const opened = Object.fromEntries(known.map((c) => [c, hits[c]]))
  const score = scoreGrid(game, known.filter((c) => hits[c]), known)
  const allKnown = known.length === dug.length
  const over = allKnown && score.over

  // Decided: lock the digs in as the move (once)
  const submitted = React.useRef(false)
  React.useEffect(() => {
    if (!over || submitted.current || dug.length === 0) return
    submitted.current = true
    submit.mutate({ challenge, move: dug }, { onError: () => (submitted.current = false) })
  }, [over, dug, challenge, submit])

  // Taps never get lost: each one joins a queue, and tiles open one at a time
  // in the order tapped (that's the order recorded). Once the game is decided
  // — 3rd bomb, every safe tile, 2nd coin, last dig — the rest are dropped.
  const latest = React.useRef({ challenge, hits })
  React.useEffect(() => {
    latest.current = { challenge, hits }
  })
  /** Source of truth for the queue (the state copy above is for drawing it). */
  const pendingRef = React.useRef<number[]>([])
  const running = React.useRef(false)
  const setPending = (next: number[]) => {
    pendingRef.current = next
    setQueue(next)
  }

  const run = React.useCallback(async () => {
    if (running.current) return
    running.current = true
    const known: Record<number, boolean> = { ...latest.current.hits }
    const done: number[] = [...(latest.current.challenge.progress?.[uid] ?? [])]
    try {
      while (pendingRef.current.length > 0) {
        const cell = pendingRef.current[0]
        const hit = await dig.mutateAsync({ challenge: latest.current.challenge, cell })
        known[cell] = hit
        if (!done.includes(cell)) done.push(cell)
        setHits((h) => ({ ...h, [cell]: hit }))
        const decided = scoreGrid(game, done.filter((c) => known[c]), done).over
        setPending(decided ? [] : pendingRef.current.slice(1))
      }
    } catch {
      // The error is shown by the mutation; stop here and let them tap again
      setPending([])
    } finally {
      running.current = false
    }
  }, [dig, game, uid])

  const onDig = (cell: number) => {
    const waiting = pendingRef.current
    if (over || cell in hits || waiting.includes(cell)) return
    const digsLeft = gridMaxDigs(game) - dug.length - waiting.filter((c) => !dug.includes(c)).length
    if (digsLeft <= 0) return
    setPending([...waiting, cell])
    void run()
  }

  const stats =
    game === "minefield"
      ? [
          {
            label: "Bombs hit",
            value: `${score.hits}/${MINEFIELD_STRIKES}`,
            tone: score.hits > 0 ? "text-destructive" : undefined,
          },
          { label: "Safe tiles", value: `${score.safeOpened}/${GRID_CELLS - MINEFIELD_BOMBS}`, tone: "text-success" },
        ]
      : [
          { label: "Gold found", value: `${score.hits}/${GOLD_TO_WIN}`, tone: score.hits > 0 ? "text-warning" : undefined },
          { label: "Digs left", value: `${GOLD_DIGS - dug.length}`, tone: undefined },
        ]

  return (
    <Card>
      <CardContent className="flex flex-col gap-5">
        <div>
          <p className="text-sm font-semibold">Your turn</p>
          <p className="text-xs text-muted-foreground">
            {challenge.hostName} hid {game === "minefield" ? `${MINEFIELD_BOMBS} bombs` : "4 gold coins"} in this grid.{" "}
            {howToWin(challenge)}
            {isForFun(challenge) ? "." : ` to get ${challenge.discountPercent}% off.`} Every tap is final.
          </p>
        </div>

        <div className="grid grid-cols-2 divide-x rounded-md border">
          {stats.map((s) => (
            <div key={s.label} className="flex flex-col items-center gap-0.5 py-2.5">
              <span className={cn("text-xl font-bold tabular-nums", s.tone)}>{s.value}</span>
              <span className="text-[11px] text-muted-foreground">{s.label}</span>
            </div>
          ))}
        </div>

        <GridBoard
          game={game}
          mode="play"
          opened={opened}
          pending={queue}
          onDig={onDig}
          disabled={over || submit.isPending}
        />

        {over ? (
          <p
            className={cn(
              "flex items-center justify-center gap-2 text-center text-sm font-semibold",
              score.won ? "text-success" : "text-destructive"
            )}
          >
            {submit.isPending && <Spinner />}
            {score.won
              ? game === "minefield"
                ? "You cleared the field!"
                : "You struck gold!"
              : game === "minefield"
                ? `Boom — that's ${MINEFIELD_STRIKES} ${item.plural}.`
                : "Out of digs."}
          </p>
        ) : (
          <p className="text-center text-[11px] text-muted-foreground">
            {game === "minefield"
              ? `You can survive ${MINEFIELD_STRIKES - 1 - score.hits} more ${MINEFIELD_STRIKES - 1 - score.hits === 1 ? "bomb" : "bombs"}.`
              : `Find ${Math.max(0, GOLD_TO_WIN - score.hits)} more in ${GOLD_DIGS - dug.length} ${GOLD_DIGS - dug.length === 1 ? "dig" : "digs"}.`}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
