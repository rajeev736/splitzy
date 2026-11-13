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
  isOver,
  legalMoves,
  LUDO_AUTO_MOVE_MS,
  LUDO_IDLE_MS,
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
import { LudoBoard, TOKEN_COLOURS } from "./ludo-board"
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

/** The face to show: the pending roll, else whatever was rolled last. */
function shownDice(state: LudoState): number | null {
  if (state.dice) return state.dice.value
  const last = state.last
  if (!last) return null
  if (last.type === "three_sixes") return 6
  return "value" in last ? last.value : null
}

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
  } else if (me.left) {
    headline = "You left the game"
    caption = "Watching how it ends"
  } else if (mine && mine.place > 0) {
    headline = `You finished ${ordinal(mine.place)}!`
    caption = "Waiting for the others to get home…"
  } else if (myTurn && state.phase === "roll") {
    headline = "Your turn"
    caption = bonus
      ? state.last?.type === "move" && state.last.value === 6
        ? "You rolled a 6 — roll again"
        : "Bonus roll — go again"
      : "Roll the dice"
  } else if (myTurn) {
    headline = `You rolled a ${diceValue}`
    caption = options.length > 1 ? "Tap a token to move it" : "Moving…"
  } else if (state.phase === "roll") {
    headline = `${currentName} is rolling…`
    caption =
      current && !current.online
        ? "They're offline — their turn is skipped shortly"
        : null
  } else {
    headline = `${currentName} rolled a ${diceValue}`
    caption = "Choosing a token…"
  }

  const chip = (colour: LudoColour, align: "left" | "right") => {
    const id = byColour[colour]
    const lp = id ? state.players[id] : undefined
    const rp = id ? byId[id] : undefined
    if (!id || !lp || !rp) return <div key={colour} aria-hidden />
    const isTurn = state.phase !== "over" && state.turn === id
    const canRoll = isTurn && id === uid && state.phase === "roll"
    // Ludo King style: the dice sits next to whoever's turn it is; on yours, tap it to roll
    const face = (
      <LudoDice
        value={isTurn ? shownDice(state) : null}
        spin={isTurn && isRollEvent(state) ? state.seq : null}
        colour={TOKEN_COLOURS[colour]}
        className={cn("size-12 p-1.5", canRoll && "border-2")}
      />
    )
    const dice = !isTurn ? null : canRoll ? (
      <button
        type="button"
        onClick={roll}
        disabled={rollLock === state.seq}
        aria-label="Roll the dice"
        className="relative shrink-0 rounded-xl transition-transform active:scale-90 disabled:opacity-60"
        style={{ boxShadow: `0 0 0 3px ${TOKEN_COLOURS[colour]}` }}
      >
        {/* A pulse inviting the tap */}
        <span
          aria-hidden
          className="absolute -inset-1 animate-ping rounded-xl border-2 [animation-duration:1.4s]"
          style={{ borderColor: TOKEN_COLOURS[colour] }}
        />
        {face}
      </button>
    ) : (
      face
    )
    return (
      <PlayerChip
        key={colour}
        player={rp}
        ludo={lp}
        isTurn={isTurn}
        isMe={id === uid}
        countdown={isTurn ? countdown : null}
        align={align}
        dice={dice}
      />
    )
  }

  return (
    <div className="flex flex-col gap-2.5">
      <div className="grid grid-cols-2 gap-2">
        {chip("red", "left")}
        {chip("green", "right")}
      </div>
      <div className="mx-auto w-full max-w-[min(92vw,30rem)]">
        <LudoBoard
          state={state}
          positions={anim.positions}
          flying={anim.flying}
          movable={movable}
          meUid={uid}
          onToken={onToken}
          className="rounded-xl shadow-sm"
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        {chip("blue", "left")}
        {chip("yellow", "right")}
      </div>

      {/* What's happening (the dice itself sits on the player's chip) */}
      <Card size="sm" className="gap-0 py-0">
        <div className="flex items-center gap-3 px-3 py-2.5">
          <div className="min-w-0 flex-1 text-center">
            <p className="truncate text-sm font-semibold">{headline}</p>
            {caption && (
              <p className="truncate text-xs text-muted-foreground">
                {myTurn && state.phase === "roll"
                  ? "Tap your dice to roll"
                  : caption}
              </p>
            )}
          </div>
        </div>
        {/* Also a tap target off the board — and the fallback if the auto-move didn't land */}
        {options.length > 0 && diceValue !== null && mine && (
          <div
            className="no-scrollbar flex gap-1.5 overflow-x-auto border-t px-3 py-2"
            role="group"
            aria-label="Tokens you can move"
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
      </Card>
      <p
        className="px-1 text-center text-xs text-muted-foreground"
        aria-live="polite"
      >
        {describeLast(state, nameOf)}
      </p>
    </div>
  )
}

/* ── Player chip ─────────────────────────────────────────────────────── */

function PlayerChip({
  player,
  ludo,
  isTurn,
  isMe,
  countdown,
  align,
  dice,
}: {
  player: RoomPlayer
  ludo: LudoPlayer
  isTurn: boolean
  isMe: boolean
  /** 1 → 0 share of the decision time left, while a timer runs for them. */
  countdown: number | null
  align: "left" | "right"
  /** The dice, shown on the chip of whoever's turn it is. */
  dice?: React.ReactNode
}) {
  const colour = TOKEN_COLOURS[ludo.colour]
  const home = homeCount(ludo)
  const dim = player.left || !player.online
  const status =
    ludo.place > 0
      ? `Finished ${ordinal(ludo.place)}`
      : player.left
        ? "Left the game"
        : !player.online
          ? "Offline"
          : `${home}/4 home`
  return (
    <div
      className={cn(
        "relative flex min-h-16 items-center gap-2 rounded-lg border bg-card px-2 py-1.5 transition-[box-shadow,opacity] duration-200",
        align === "right" && "flex-row-reverse text-right",
        dim && "opacity-60"
      )}
      style={isTurn ? { boxShadow: `0 0 0 2px ${colour}` } : undefined}
      aria-current={isTurn ? "true" : undefined}
    >
      <span className="relative shrink-0">
        <UserAvatar
          src={player.photo}
          name={player.name}
          size="sm"
          uid={player.uid}
        />
        <span
          className="absolute -right-0.5 -bottom-0.5 size-3 rounded-full ring-2 ring-card"
          style={{ backgroundColor: colour }}
          aria-label={`${ludo.colour} tokens`}
        />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-semibold">
          {isMe ? "You" : player.name.split(" ")[0]}
        </p>
        <p
          className={cn(
            "truncate text-[11px]",
            ludo.place > 0
              ? "font-medium text-success"
              : "text-muted-foreground"
          )}
        >
          {status}
        </p>
      </div>
      {dice}
      {countdown !== null && (
        <span
          className={cn(
            "absolute bottom-0 h-0.5",
            align === "right" ? "right-0" : "left-0"
          )}
          style={{
            width: `${countdown * 100}%`,
            backgroundColor: colour,
            transition: "width 1s linear",
          }}
          aria-hidden
        />
      )}
    </div>
  )
}
