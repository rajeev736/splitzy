"use client"

import * as React from "react"
import { serverTimestamp } from "firebase/database"
import { toast } from "sonner"

import { UserAvatar } from "@/components/shared/user-avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import { useRoomNode } from "@/hooks/use-live-room"
import { getErrorMessage } from "@/lib/errors"
import {
  applyMove,
  applyRoll,
  describeLast,
  distinctMoves,
  HOME,
  homeCount,
  isGone,
  isOver,
  legalMoves,
  LUDO_AUTO_MOVE_MS,
  LUDO_IDLE_MS,
  LUDO_MAX_MISSED,
  ordinal,
  passTurn,
  resultOf,
  rollDice,
  type LudoColour,
  type LudoPlayer,
  type LudoSkipReason,
  type LudoState,
} from "@/lib/live/ludo"
import { ABANDON_MS } from "@/lib/live/room"
import type { LiveGameProps, RoomPlayer } from "@/lib/live/types"
import { cn } from "@/lib/utils"
import { stateTransaction } from "@/services/live-rooms"
import { colourAtCorner, LudoBoard, TOKEN_COLOURS, TURNS_FOR } from "./ludo-board"
import { ThrowOverlay, ThrowPicker } from "../throwables"
import { LudoDice } from "./ludo-dice"
import { useLudoAnimation } from "./use-ludo-animation"

const NO_MOVES: number[] = []
/** Let the last token walk into home before the results screen takes over. */
const END_DELAY_MS = 1200

const ts = () => serverTimestamp() as unknown as number

/** The engine fills `turnAt` / `dice.at` with a local guess; the server's clock goes in the database. */
function stamp(next: LudoState, prev: LudoState): LudoState {
  const out: LudoState = { ...next, turnAt: ts() }
  if (out.dice && out.dice !== prev.dice) out.dice = { ...out.dice, at: ts() }
  return out
}

/** Why the referee should pass this player's turn right now, if at all. */
function skipReason(
  player: RoomPlayer,
  since: number,
  now: number
): LudoSkipReason | null {
  if (player.left) return "left"
  if (!player.online && now - player.lastSeen >= ABANDON_MS) return "offline"
  if (since > 0 && now - since >= LUDO_IDLE_MS)
    return player.online ? "idle" : "offline"
  return null
}

/** The one token a roll can play, when there's no real choice (tokens on the same square count as one). */
function singleMove(state: LudoState, uid: string): number {
  if (state.phase !== "move" || !state.dice) return -1
  const options = distinctMoves(state, uid, state.dice.value)
  return options.length === 1 ? options[0] : -1
}

const isRollEvent = (state: LudoState) =>
  state.last?.type === "roll" ||
  state.last?.type === "no_move" ||
  state.last?.type === "three_sixes"

function moveLabel(pos: number, dice: number) {
  if (pos < 0) return "Out of base"
  if (pos + dice === HOME) return "Into home"
  return `${pos + 1} → ${pos + dice + 1}`
}

/**
 * Ludo for 2–4 players. The current player's device rolls and moves (the
 * rules require the roller to write the dice); the referee passes the turn
 * of anyone idle, offline or gone, and declares the end. Every change is a
 * transaction on the whole state, so racing devices can't disagree.
 */
export function LudoGame({
  code,
  meta,
  players,
  uid,
  me,
  isReferee,
  now,
  serverNow,
  endGame,
}: LiveGameProps) {
  const { data: state } = useRoomNode<LudoState>(code, "state")
  const gone = React.useMemo(
    () => players.filter((p) => p.left).map((p) => p.uid),
    [players]
  )
  const byId = React.useMemo(
    () => Object.fromEntries(players.map((p) => [p.uid, p])),
    [players]
  )
  const nameOf = React.useCallback(
    (id: string) => (byId[id]?.name ?? "Someone").split(" ")[0],
    [byId]
  )
  const anim = useLudoAnimation(state)

  /* ── Writes ──────────────────────────────────────────────────────── */

  // Callers check `seq` inside `fn` and throw when the state moved on, so a
  // duplicate (double tap, two referees, a retry) simply aborts.
  const commit = React.useCallback(
    async (
      fn: (s: LudoState) => LudoState,
      quiet = false
    ): Promise<boolean> => {
      try {
        const res = await stateTransaction<LudoState>(code, (current) => {
          if (!current) return undefined
          try {
            return stamp(fn(current), current)
          } catch {
            // Stale: the game moved on under us (someone else's write landed first)
            return undefined
          }
        })
        return res.committed
      } catch (e) {
        if (!quiet) toast.error(getErrorMessage(e, "Couldn't update the game"))
        return false
      }
    },
    [code]
  )

  const myTurn =
    !!state && state.phase !== "over" && state.turn === uid && !me.left
  const seq = state?.seq ?? -1
  const diceValue = state?.dice?.value ?? null
  const movable = React.useMemo(
    () =>
      state && myTurn && state.phase === "move" && state.dice
        ? legalMoves(state, uid, state.dice.value)
        : NO_MOVES,
    [state, myTurn, uid]
  )
  const autoToken = state && myTurn ? singleMove(state, uid) : -1

  const [rollLock, setRollLock] = React.useState(-1)
  const roll = () => {
    if (!state || !myTurn || state.phase !== "roll") return
    const value = rollDice()
    const at = state.seq
    setRollLock(at)
    void commit((s) => {
      if (s.seq !== at) throw new Error("stale")
      return applyRoll(s, uid, value, { now: serverNow(), gone })
    }).then((ok) => {
      if (!ok) setRollLock(-1)
    })
  }

  const move = React.useCallback(
    (token: number, expectSeq: number, value: number) =>
      commit((s) => {
        if (s.seq !== expectSeq) throw new Error("stale")
        return applyMove(s, uid, token, value, { now: serverNow(), gone })
      }),
    [commit, uid, serverNow, gone]
  )
  const onToken = (token: number) => {
    if (!state?.dice || !movable.includes(token)) return
    void move(token, state.seq, state.dice.value)
  }

  // Ludo King style: a roll with only one possible move plays itself after a beat
  React.useEffect(() => {
    if (autoToken < 0 || diceValue === null) return
    const id = window.setTimeout(
      () => void move(autoToken, seq, diceValue),
      LUDO_AUTO_MOVE_MS
    )
    return () => window.clearTimeout(id)
  }, [autoToken, seq, diceValue, move])

  /* ── Referee ─────────────────────────────────────────────────────── */

  // Pass the turn of a player who left, dropped offline, or sat on their decision too long
  React.useEffect(() => {
    if (!isReferee || !state || state.phase === "over" || isOver(state, gone))
      return
    const current = byId[state.turn]
    if (!current) return
    const reason = skipReason(current, state.turnAt || meta.startedAt || 0, now)
    if (!reason) return
    const { turn, seq: at } = state
    void commit((s) => {
      if (s.seq !== at) throw new Error("stale")
      return passTurn(s, turn, reason, { now: serverNow(), gone })
    }, true)
  }, [isReferee, state, byId, now, gone, meta.startedAt, commit, serverNow])

  // Declare the end: the engine marked it over, or everyone else has left
  const ended = React.useRef(false)
  React.useEffect(() => {
    if (!state || ended.current) return
    const over =
      state.phase === "over" || (gone.length > 0 && isOver(state, gone))
    if (!over || !(isReferee || state.turn === uid)) return
    const id = window.setTimeout(() => {
      ended.current = true
      endGame(resultOf(state, gone)).catch(() => {
        ended.current = false
      })
    }, END_DELAY_MS)
    return () => window.clearTimeout(id)
  }, [state, gone, isReferee, uid, endGame])

  /* ── Dice faces ──────────────────────────────────────────────────── */

  // The face each player's dice rests on: their last roll (never blank)
  const rollEvent =
    state && state.last && isRollEvent(state)
      ? {
          by: state.last.by,
          value: state.last.type === "three_sixes" ? 6 : "value" in state.last ? state.last.value : 6,
        }
      : null
  const [faces, setFaces] = React.useState<Record<string, number>>({})
  if (rollEvent && faces[rollEvent.by] !== rollEvent.value) {
    setFaces((f) => ({ ...f, [rollEvent.by]: rollEvent.value }))
  }

  const [throwAt, setThrowAt] = React.useState<RoomPlayer | null>(null)

  /* ── Render ──────────────────────────────────────────────────────── */

  if (state === undefined) {
    return (
      <div className="flex justify-center py-16">
        <Spinner className="size-6" />
      </div>
    )
  }
  if (!state) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Setting up the board…
        </CardContent>
      </Card>
    )
  }

  const mine = state.players[uid]
  // Your colour sits at the bottom-left, in front of you, with your dice;
  // everyone else is at their own corner of the turned board
  const turns = mine ? TURNS_FOR[mine.colour] : 0
  const at = (corner: number) => colourAtCorner(corner, turns)
  const current = byId[state.turn]
  const currentName = nameOf(state.turn)
  const since = state.turnAt || meta.startedAt || 0
  const countdown =
    state.phase === "over" || !since
      ? null
      : Math.max(0, Math.min(1, 1 - (now - since) / LUDO_IDLE_MS))
  const byColour = Object.fromEntries(
    state.order.map((id) => [state.players[id].colour, id])
  ) as Partial<Record<LudoColour, string>>
  // Pieces of players who left or are out leave the board
  const offBoard = state.order.filter((id) => isGone(state, id, gone))
  // Tokens the roller can choose between (tokens on the same square count once)
  const options =
    myTurn && state.phase === "move" && diceValue !== null
      ? distinctMoves(state, uid, diceValue)
      : NO_MOVES
  const bonus =
    state.last?.type === "move" && state.last.bonus && state.last.by === uid

  let headline: string
  let caption: string | null = null
  if (state.phase === "over") {
    headline = "Game over"
  } else if (mine?.out) {
    headline = "You're out"
    caption = `You missed ${LUDO_MAX_MISSED} turns in a row`
  } else if (me.left) {
    headline = "You left the game"
    caption = "Watching how it ends"
  } else if (mine && mine.place > 0) {
    headline = `You finished ${ordinal(mine.place)}!`
    caption = "Waiting for the others to get home…"
  } else if (myTurn && state.phase === "roll") {
    headline = "Your turn — tap your dice"
    caption = bonus
      ? state.last?.type === "move" && state.last.value === 6
        ? "You rolled a 6 — roll again"
        : "Bonus roll — go again"
      : mine?.missed
        ? `Missed ${mine.missed} of ${LUDO_MAX_MISSED} — miss ${LUDO_MAX_MISSED} in a row and you're out`
        : null
  } else if (myTurn) {
    headline = `You rolled a ${diceValue}`
    caption = options.length > 1 ? "Tap a piece to move it" : "Moving…"
  } else if (state.phase === "roll") {
    headline = `${currentName} is rolling…`
    caption =
      current && !current.online
        ? "They're offline — their turn is skipped shortly"
        : null
  } else {
    headline = `${currentName} rolled a ${diceValue}`
    caption = "Choosing a piece…"
  }

  const seat = (colour: LudoColour, align: "left" | "right", row: "top" | "bottom") => {
    const id = byColour[colour]
    const lp = id ? state.players[id] : undefined
    const rp = id ? byId[id] : undefined
    if (!id || !lp || !rp) return <div key={colour} aria-hidden />
    const isTurn = state.phase !== "over" && state.turn === id
    const canRoll = isTurn && id === uid && state.phase === "roll" && rollLock !== state.seq
    const rolledLast = rollEvent?.by === id
    const showDice = isTurn || rolledLast
    const face = (
      <LudoDice
        value={faces[id] ?? null}
        spin={rolledLast ? state.seq : null}
        rolling={id === uid && rollLock === state.seq}
        size={40}
        dim={!isTurn}
      />
    )
    // Ludo King style: the dice sits next to whoever's turn it is; on yours, tap it to roll
    const dice = !showDice ? null : canRoll ? (
      <button
        type="button"
        onClick={roll}
        aria-label="Roll the dice"
        className="relative rounded-xl p-1 transition-transform active:scale-90"
      >
        <span
          aria-hidden
          className="absolute inset-0 animate-ping rounded-xl border-2 [animation-duration:1.3s]"
          style={{ borderColor: TOKEN_COLOURS[colour] }}
        />
        <span
          aria-hidden
          className="absolute inset-0 rounded-xl"
          style={{ boxShadow: `0 0 0 2px ${TOKEN_COLOURS[colour]}, 0 0 18px 2px ${TOKEN_COLOURS[colour]}` }}
        />
        {face}
      </button>
    ) : (
      <div className="p-1">{face}</div>
    )
    return (
      <Seat
        key={colour}
        player={rp}
        ludo={lp}
        isTurn={isTurn}
        isMe={id === uid}
        countdown={isTurn ? countdown : null}
        align={align}
        row={row}
        dice={dice}
        onTap={id !== uid && !me.left ? () => setThrowAt(rp) : undefined}
      />
    )
  }

  return (
    <div className="flex flex-col gap-2.5">
      {/* The table: players in their corners around the board, Ludo King style */}
      <div
        className="rounded-2xl p-2 text-white shadow-lg ring-1 ring-black/10 sm:p-3"
        style={{
          background:
            "radial-gradient(130% 90% at 50% 0%, #2f6be0 0%, #1a46a8 45%, #0d2463 100%)",
        }}
      >
        <div className="grid grid-cols-2 gap-2 px-1 pb-2">
          {seat(at(0), "left", "top")}
          {seat(at(1), "right", "top")}
        </div>
        <div className="mx-auto w-full max-w-[min(94vw,32rem)] rounded-xl bg-white/15 p-1 shadow-[0_12px_30px_rgb(0_0_0/0.4)]">
          <LudoBoard
            state={state}
            positions={anim.positions}
            flying={anim.flying}
            movable={movable}
            meUid={uid}
            onToken={onToken}
            turns={turns}
            hidden={offBoard}
            className="rounded-lg"
          />
        </div>
        <div className="grid grid-cols-2 gap-2 px-1 pt-2">
          {seat(at(3), "left", "bottom")}
          {seat(at(2), "right", "bottom")}
        </div>
        <div className="mt-2 rounded-xl bg-black/25 px-3 py-2 text-center">
          <p className="truncate text-sm font-semibold">{headline}</p>
          <p className="truncate text-xs text-white/70" aria-live="polite">
            {caption ?? describeLast(state, nameOf)}
          </p>
        </div>
      </div>

      {/* Also a tap target off the board — and the fallback if the auto-move didn't land */}
      {options.length > 1 && diceValue !== null && mine && (
        <div
          className="no-scrollbar flex gap-1.5 overflow-x-auto"
          role="group"
          aria-label="Pieces you can move"
        >
          {options.map((t) => (
            <Button
              key={t}
              size="sm"
              variant="outline"
              className="h-10 shrink-0"
              onClick={() => onToken(t)}
            >
              <span
                className="size-2.5 rounded-full"
                style={{ backgroundColor: TOKEN_COLOURS[mine.colour] }}
                aria-hidden
              />
              {moveLabel(mine.tokens[t], diceValue)}
            </Button>
          ))}
        </div>
      )}
      <p className="px-1 text-center text-[11px] text-muted-foreground">
        Tap another player&apos;s photo to throw something at them
      </p>

      <ThrowOverlay code={code} />
      <ThrowPicker code={code} target={throwAt} onOpenChange={(o) => !o && setThrowAt(null)} />
    </div>
  )
}

/* ── Seat ────────────────────────────────────────────────────────────── */

/** Ring colour for the share of time left: green → amber → red. */
const timeColour = (share: number) => `hsl(${Math.round(120 * share)} 85% 48%)`
const RING_R = 25
const RING_C = 2 * Math.PI * RING_R

/**
 * A player at the table: their photo with the turn timer running round it
 * (green to red), their colour, missed turns, and the dice beside them.
 */
export function Seat({
  player,
  ludo,
  isTurn,
  isMe,
  countdown,
  align,
  row,
  dice,
  onTap,
}: {
  player: RoomPlayer
  ludo: LudoPlayer
  isTurn: boolean
  isMe: boolean
  /** 1 → 0 share of the decision time left, while a timer runs for them. */
  countdown: number | null
  align: "left" | "right"
  row: "top" | "bottom"
  /** The dice, shown beside whoever's turn it is. */
  dice?: React.ReactNode
  /** Opens the throw picker (other players only). */
  onTap?: () => void
}) {
  const colour = TOKEN_COLOURS[ludo.colour]
  const out = !!ludo.out
  const dim = player.left || out || !player.online
  const missed = ludo.missed ?? 0
  const status = ludo.place > 0
    ? `${ordinal(ludo.place)} · finished`
    : out
      ? "Out"
      : player.left
        ? "Left"
        : !player.online
          ? "Offline"
          : `${homeCount(ludo)}/4 home`
  const share = countdown ?? 1
  const name = (
    <div className={cn("min-w-0 leading-tight", align === "right" && "text-right")}>
      <p className="truncate text-xs font-semibold">{isMe ? "You" : player.name.split(" ")[0]}</p>
      <p className="flex items-center gap-1 text-[10px] text-white/70" style={{ justifyContent: align === "right" ? "flex-end" : undefined }}>
        <span className="truncate">{status}</span>
        {missed > 0 && !out && (
          <span className="flex gap-0.5" aria-label={`Missed ${missed} of ${LUDO_MAX_MISSED} turns`}>
            {Array.from({ length: LUDO_MAX_MISSED }, (_, i) => (
              <span key={i} className={cn("size-1.5 rounded-full", i < missed ? "bg-red-400" : "bg-white/30")} />
            ))}
          </span>
        )}
      </p>
    </div>
  )
  return (
    <div className={cn("flex min-w-0 flex-col gap-1", align === "right" && "items-end", dim && "opacity-60")}>
      {row === "bottom" ? null : name}
      <div className={cn("flex items-center gap-1.5", align === "right" && "flex-row-reverse")}>
        <button
          type="button"
          data-throw-anchor={player.uid}
          onClick={onTap}
          disabled={!onTap}
          aria-label={onTap ? `Throw something at ${player.name}` : player.name}
          className="relative size-14 shrink-0 rounded-full transition-transform enabled:active:scale-95"
        >
          <svg viewBox="0 0 56 56" className="absolute inset-0 -rotate-90" aria-hidden>
            <circle cx="28" cy="28" r={RING_R} fill="none" stroke="rgb(255 255 255 / 0.18)" strokeWidth="4" />
            <circle
              cx="28"
              cy="28"
              r={RING_R}
              fill="none"
              stroke={countdown !== null ? timeColour(share) : colour}
              strokeOpacity={countdown !== null || isTurn ? 1 : 0.85}
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={RING_C}
              strokeDashoffset={countdown !== null ? RING_C * (1 - share) : 0}
              style={{ transition: "stroke-dashoffset 1s linear, stroke 1s linear" }}
            />
          </svg>
          <UserAvatar src={player.photo} name={player.name} size="md" className="absolute inset-[7px] size-[42px]" />
          <span
            className="absolute -right-0.5 -bottom-0.5 size-4 rounded-full ring-2 ring-[#0d2463]"
            style={{ backgroundColor: colour }}
            aria-label={`${ludo.colour} pieces`}
          />
          {isTurn && (
            <span
              aria-hidden
              className="absolute -inset-1 rounded-full"
              style={{ boxShadow: `0 0 16px 2px ${colour}` }}
            />
          )}
        </button>
        <div className="flex size-12 items-center justify-center">{dice}</div>
      </div>
      {row === "bottom" ? name : null}
    </div>
  )
}
