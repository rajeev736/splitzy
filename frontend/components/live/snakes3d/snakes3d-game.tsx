"use client"

import * as React from "react"
import dynamic from "next/dynamic"

import { Card, CardContent } from "@/components/ui/card"
import { useWallet } from "@/hooks/use-fun"
import { SNAKES3D_THEMES, useBoardTheme } from "@/lib/live/themes"
import { Spinner } from "@/components/ui/spinner"
import { describeLast, ordinal, SNAKES_MAX_MISSED, type SnakesState } from "@/lib/live/snakes"
import { playSound, useOnChange } from "@/lib/live/sound"
import type { LiveGameProps, RoomPlayer } from "@/lib/live/types"
import { cn } from "@/lib/utils"
import { TOKEN_COLOURS } from "../ludo/ludo-board"
import { LudoDice } from "../ludo/ludo-dice"
import { useSnakesGame } from "../snakes/use-snakes-game"
import { ThrowOverlay, ThrowPicker } from "../throwables"
import { useStageFit } from "../use-stage-fit"
import { Snakes3DBoard } from "./snakes3d-board"

/** The jungle in real 3D: three.js loads only when this theme is on. */
const SNAKES3D_NIGHT_TABLE = SNAKES3D_THEMES[1].look.table

const JungleBoard = dynamic(() => import("../snakes3d-jungle/jungle-board"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center">
      <Spinner className="size-6 text-white/70" />
    </div>
  ),
})
import { TowerSeat } from "./tower-seat"

/** How long the summit banner stays up. */
const BANNER_MS = 3200

/**
 * Snakes & Ladders 3D: the jungle tower. The rules, the writes, the referee
 * and the sounds live in useSnakesGame; the table below seats the players,
 * hands the roller their dice, and draws the tower.
 */
export function Snakes3DGame(props: LiveGameProps) {
  const game = useSnakesGame(props)
  if (game.state === undefined) {
    return (
      <div className="flex justify-center py-16">
        <Spinner className="size-6" />
      </div>
    )
  }
  if (!game.state) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">Setting up the tower…</CardContent>
      </Card>
    )
  }
  return <Snakes3DTable {...game} state={game.state} code={props.code} uid={props.uid} me={props.me} />
}

export interface Snakes3DTableProps {
  /** The room; "" previews the table without one (no throwables). */
  code: string
  uid: string
  me: RoomPlayer
  state: SnakesState
  myTurn: boolean
  canRoll: boolean
  rolling: boolean
  roll: () => void
  byId: Record<string, RoomPlayer>
  nameOf: (uid: string) => string
  gone: string[]
  countdown: number | null
}

/** The table: seats above and below the tower, the status line, the throwables. */
export function Snakes3DTable({ code, uid, me, state, myTurn, canRoll, rolling, roll, byId, nameOf, gone, countdown }: Snakes3DTableProps) {
  const [throwAt, setThrowAt] = React.useState<RoomPlayer | null>(null)
  const stageRef = useStageFit()
  const wallet = useWallet()
  const theme = useBoardTheme("snakes3d", wallet?.themes)
  // No WebGL on this device: the jungle gives way to the night tower
  const [noGl, setNoGl] = React.useState(false)
  const jungle = theme.look.scene === "jungle" && !noGl

  // The face each player's dice rests on: their last roll
  const last = state.last
  const rollEvent =
    last && (last.type === "move" || last.type === "blocked")
      ? { by: last.by, value: last.value }
      : last?.type === "three_sixes"
        ? { by: last.by, value: 6 }
        : null
  const [faces, setFaces] = React.useState<Record<string, number>>({})
  if (rollEvent && faces[rollEvent.by] !== rollEvent.value) setFaces((f) => ({ ...f, [rollEvent.by]: rollEvent.value }))

  // Someone reached 100: a banner over the tower for a moment
  const [banner, setBanner] = React.useState<string | null>(null)
  useOnChange(state.seq, () => {
    const l = state.last
    if (!l || l.type !== "move" || !l.finished) return
    const who = l.by === uid ? "You" : nameOf(l.by)
    const place = state.players[l.by]?.place ?? 1
    const delay = 400 + Math.abs(l.to - l.from) * 240
    window.setTimeout(() => setBanner(`${who} reached the summit — ${ordinal(place)}!`), delay)
    window.setTimeout(() => setBanner(null), delay + BANNER_MS)
  })

  const onStep = React.useCallback(() => playSound("step"), [])

  const mine = state.players[uid]
  const racing = !!mine && mine.place === 0 && !mine.out && !me.left
  // The camera stays on you while you race — and through your own summit moment — then follows whoever's turn it is
  const justFinished = last?.type === "move" && !!last.finished && last.by === uid
  const followUid = racing || justFinished ? uid : state.turn
  const hidden = state.order.filter((u) => gone.includes(u) || state.players[u]?.out)
  const current = byId[state.turn]
  const currentName = nameOf(state.turn)

  // Seats: the others above the tower, you below (with one more when there are four or five)
  const others = state.order.filter((u) => u !== uid)
  const n = state.order.length
  let topRow: string[]
  let bottomRow: string[]
  if (!mine) {
    topRow = state.order.slice(0, Math.ceil(n / 2))
    bottomRow = state.order.slice(Math.ceil(n / 2))
  } else if (n <= 3) {
    topRow = others
    bottomRow = [uid]
  } else {
    topRow = others.slice(0, n - 2)
    bottomRow = [uid, ...others.slice(n - 2)]
  }
  const rowCols = (k: number) => (k === 3 ? "grid-cols-3" : k === 1 ? "grid-cols-1" : "grid-cols-2")
  const alignOf = (i: number, k: number): "left" | "right" => (i === k - 1 && k > 1 ? "right" : "left")

  const bonus = last?.type === "move" && last.bonus && last.by === uid
  let headline: string
  let caption: string | null = null
  if (state.phase === "over") {
    headline = "Game over"
  } else if (mine?.out) {
    headline = "You're out"
    caption = `You missed ${SNAKES_MAX_MISSED} turns in a row`
  } else if (me.left) {
    headline = "You left the game"
    caption = "Watching how it ends"
  } else if (mine && mine.place > 0) {
    headline = `You finished ${ordinal(mine.place)}!`
    caption = "Waiting for the others to reach the summit…"
  } else if (myTurn && rolling) {
    headline = "Rolling…"
  } else if (myTurn) {
    headline = "Your turn — tap your dice"
    caption =
      mine?.pos === 0
        ? "Roll a 1 to open the gate"
        : bonus
          ? "You rolled a 6 — roll again"
          : mine?.missed
            ? `Missed ${mine.missed} of ${SNAKES_MAX_MISSED} — miss ${SNAKES_MAX_MISSED} in a row and you're out`
            : null
  } else {
    headline = `${currentName} is rolling…`
    caption = current && !current.online ? "They're offline — their turn is skipped shortly" : null
  }

  const seat = (id: string, align: "left" | "right", compact: boolean) => {
    const piece = state.players[id]
    const rp = byId[id]
    if (!piece || !rp) return <div key={id} aria-hidden />
    const isTurn = state.phase !== "over" && state.turn === id
    const rolledLast = rollEvent?.by === id
    const showDice = isTurn || rolledLast
    const mayRoll = isTurn && id === uid && canRoll
    const dice = !showDice ? null : (
      <LudoDice
        value={faces[id] ?? null}
        spin={rolledLast ? state.seq : null}
        rolling={id === uid && rolling}
        size={compact ? 28 : 32}
        dim={!isTurn}
        onRoll={mayRoll ? roll : undefined}
        glow={mayRoll ? TOKEN_COLOURS[piece.colour] : undefined}
      />
    )
    return (
      <TowerSeat
        key={id}
        player={rp}
        piece={piece}
        isTurn={isTurn}
        isMe={id === uid}
        countdown={isTurn ? countdown : null}
        align={align}
        dice={dice}
        compact={compact}
        onTap={id !== uid && !me.left && code ? () => setThrowAt(rp) : undefined}
      />
    )
  }

  return (
    <div
      ref={stageRef}
      className={cn(
        "flex flex-col gap-2.5",
        // Phones: the whole table fits between the header and the dock; only the tower scrolls
        "max-md:fixed max-md:inset-x-0 max-md:top-(--stage-top) max-md:z-20 max-md:h-(--stage-h) max-md:overflow-hidden max-md:bg-background max-md:p-2"
      )}
    >
      <div
        className="flex min-h-0 flex-1 flex-col rounded-2xl p-2 text-white shadow-lg ring-1 ring-black/10 sm:p-3"
        style={{ background: jungle ? theme.look.table : SNAKES3D_NIGHT_TABLE }}
      >
        <div className={cn("grid gap-2 px-1 pb-2", rowCols(topRow.length))}>
          {topRow.map((id, i) => seat(id, alignOf(i, topRow.length), topRow.length > 2))}
        </div>
        <div className="relative mx-auto min-h-0 w-full rounded-xl bg-white/15 p-1 shadow-[0_12px_30px_rgb(0_0_0/0.4)] max-md:min-h-[200px] max-md:flex-1 md:h-[min(62svh,36rem)] md:max-w-[30rem] md:flex-none">
          {jungle ? (
            <JungleBoard
              state={state}
              meUid={uid}
              followUid={followUid}
              hidden={hidden}
              onStep={onStep}
              onFail={() => setNoGl(true)}
              className="h-full rounded-lg"
            />
          ) : (
            <Snakes3DBoard state={state} meUid={uid} followUid={followUid} hidden={hidden} onStep={onStep} className="h-full rounded-lg" />
          )}
          {banner && (
            <div className="pointer-events-none absolute inset-x-0 top-1/3 flex justify-center px-4">
              <div className="rounded-2xl bg-black/70 px-4 py-2.5 text-center text-sm font-bold shadow-xl ring-1 ring-white/20 animate-in fade-in-0 zoom-in-90">
                <span className="mr-1.5" aria-hidden>
                  🏆
                </span>
                {banner}
              </div>
            </div>
          )}
        </div>
        <div className={cn("grid gap-2 px-1 pt-2", rowCols(bottomRow.length))}>
          {bottomRow.map((id, i) => seat(id, alignOf(i, bottomRow.length), bottomRow.length > 2))}
        </div>
        <div className="mt-2 flex min-h-12 flex-col justify-center rounded-xl bg-black/25 px-3 py-1.5 text-center">
          <p className="truncate text-sm font-semibold">{headline}</p>
          <p className="truncate text-xs text-white/70" aria-live="polite">
            {caption ?? describeLast(state, nameOf)}
          </p>
        </div>
      </div>

      <p className="px-1 text-center text-[11px] text-muted-foreground max-md:hidden">
        Swipe the tower to look around · tap another player&apos;s photo to throw something at them
      </p>

      {code && (
        <>
          <ThrowOverlay code={code} />
          <ThrowPicker code={code} target={throwAt} onOpenChange={(o) => !o && setThrowAt(null)} />
        </>
      )}
    </div>
  )
}
