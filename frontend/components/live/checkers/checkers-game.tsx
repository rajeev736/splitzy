"use client"

import * as React from "react"
import { Flag02Icon, HandshakeIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { serverTimestamp } from "firebase/database"
import { toast } from "sonner"

import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { UserAvatar } from "@/components/shared/user-avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import { useRoomNode } from "@/hooks/use-live-room"
import { getErrorMessage } from "@/lib/errors"
import {
  applyMove,
  historyOf,
  legalMoves,
  MEN_PER_SIDE,
  movePiece,
  movesAlong,
  normaliseBoard,
  opponentOf,
  otherSide,
  pieceCounts,
  sideOf,
  toLiveResult,
  uidOf,
  type Board,
  type CheckersMove,
  type CheckersResult,
  type CheckersState,
  type Side,
} from "@/lib/live/checkers"
import { ABANDON_MS } from "@/lib/live/room"
import type { LiveGameProps, RoomPlayer } from "@/lib/live/types"
import { cn } from "@/lib/utils"
import { playSound, useOnChange } from "@/lib/live/sound"
import { stateTransaction, updateState } from "@/services/live-rooms"
import {
  CheckersBoard,
  CheckersStyles,
  Disc,
  type BoardTarget,
} from "./checkers-board"

/** Write-time placeholder for the server clock. */
const ts = () => serverTimestamp() as unknown as number
/** The referee's safety net: ends the room if whoever decided the game didn't get to. */
const END_FALLBACK_MS = 2000
const NO_PATH: number[] = []
const NO_MOVES: CheckersMove[] = []

/**
 * Checkers between the two seats of the room. A move is picked square by
 * square — a multi-jump keeps the piece in hand until the sequence is
 * complete — and then written as one read-modify-write transaction checked
 * against the engine (lib/live/checkers.ts), so a double tap or a stale board
 * can't corrupt the game. Whoever decides the game (last capture, no moves,
 * resign, draw) writes the result and ends the room.
 */
export function CheckersGame({
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
  const { data: state } = useRoomNode<CheckersState>(code, "state")
  // Sounds: a tap per move, a crack when a piece (goti) is taken
  useOnChange(state?.moves ?? 0, (n, was) => {
    if (n <= was) return
    playSound(state?.lastMove?.captured?.length ? "take" : "move")
  })
  const ready =
    !!state &&
    !!state.light &&
    !!state.dark &&
    state.board != null &&
    typeof state.turn === "string"

  // The squares tapped so far, tied to the ply they belong to: a new board drops them
  const [hand, setHand] = React.useState<{
    moves: number
    path: number[]
  } | null>(null)
  const [confirmResign, setConfirmResign] = React.useState(false)
  const [busy, setBusy] = React.useState(false)
  // One automatic write at a time (abandonment), never read while rendering
  const refereeBusy = React.useRef(false)

  // The board array is replaced as a whole on every move, so it's the memo key
  const rawBoard = ready ? state.board : null
  const board = React.useMemo<Board | null>(
    () => (rawBoard ? normaliseBoard(rawBoard) : null),
    [rawBoard]
  )

  const mySide = ready ? sideOf(state, uid) : null
  const turn: Side = ready ? state.turn : "l"
  const over = ready && !!state.result
  const moveCount = ready ? state.moves : 0
  const opponentId = ready ? opponentOf(state, uid) : null
  const opponent = players.find((p) => p.uid === opponentId) ?? null
  const flipped = mySide === "d"
  const myTurn = ready && !over && !me.left && mySide === turn
  const canInteract = myTurn && !busy

  const legal = React.useMemo(
    () => (board && myTurn ? legalMoves(board, turn) : NO_MOVES),
    [board, myTurn, turn]
  )
  const mustCapture = legal.length > 0 && legal[0].captured.length > 0
  const movable = React.useMemo(
    () => new Set(legal.map((m) => m.path[0])),
    [legal]
  )
  const path = hand && hand.moves === moveCount ? hand.path : NO_PATH
  const inHand = path.length > 0 ? path[path.length - 1] : null
  const along = React.useMemo(() => movesAlong(legal, path), [legal, path])
  const targets = React.useMemo(() => {
    const map = new Map<number, BoardTarget>()
    if (!canInteract) return map
    for (const m of along) {
      const next = m.path[path.length]
      if (next !== undefined) map.set(next, { capture: m.captured.length > 0 })
    }
    return map
  }, [along, path, canInteract])

  // Mid-jump: show the piece where it has got to, with what it has taken faded
  const midJump = path.length > 1
  const shown = React.useMemo(
    () =>
      board && midJump
        ? movePiece(board, path[0], path[path.length - 1])
        : board,
    [board, midJump, path]
  )
  const ghosts =
    midJump && along[0] ? along[0].captured.slice(0, path.length - 1) : NO_PATH

  /* ── Writes ──────────────────────────────────────────────────────────── */

  /** Writes a result (once) and ends the room. */
  const decide = React.useCallback(
    async (make: (s: CheckersState) => CheckersResult | null) => {
      const res = await stateTransaction<CheckersState>(code, (cur) => {
        if (!cur || cur.result) return undefined
        const result = make(cur)
        if (!result) return undefined
        return { ...cur, result, drawOffer: null }
      })
      const after = res.snapshot.val() as CheckersState | null
      if (after?.result) await endGame(toLiveResult(after.result))
    },
    [code, endGame]
  )

  const play = async (move: CheckersMove) => {
    if (busy) return
    setBusy(true)
    setHand(null)
    try {
      const res = await stateTransaction<CheckersState>(code, (cur) => {
        if (!cur) return undefined
        const next = applyMove(cur, uid, move, serverNow())
        return next ? { ...next, lastMoveAt: ts() } : undefined
      })
      const after = res.snapshot.val() as CheckersState | null
      if (!res.committed) toast.message("That move isn't possible any more")
      else if (after?.result) void endGame(toLiveResult(after.result))
    } catch (e) {
      toast.error(getErrorMessage(e, "Couldn't make that move"))
    } finally {
      setBusy(false)
    }
  }

  /** A tap on a square: pick a piece up, carry on a jump, finish the move, or put it down. */
  const tap = (sq: number) => {
    if (!canInteract) return
    if (path.length > 0) {
      const next = [...path, sq]
      const continuing = movesAlong(legal, next)
      if (continuing.length > 0) {
        // Every legal path is complete (you can't stop jumping early), so a match this long is the move
        const done = continuing.find((m) => m.path.length === next.length)
        if (done) void play(done)
        else setHand({ moves: moveCount, path: next })
        return
      }
    }
    if (movable.has(sq)) {
      // Tapping the piece in hand (before it has jumped) puts it down again
      const same = path.length === 1 && path[0] === sq
      setHand(same ? null : { moves: moveCount, path: [sq] })
      return
    }
    if (path.length > 0) setHand(null)
  }

  const resign = async () => {
    if (!ready || !opponentId) return
    setBusy(true)
    try {
      await decide(() => ({ winner: opponentId, reason: "resign" }))
    } catch (e) {
      toast.error(getErrorMessage(e, "Couldn't resign"))
    } finally {
      setBusy(false)
      setConfirmResign(false)
    }
  }

  /** Offer a draw — or, if the other side is offering too, take it. */
  const offerDraw = async () => {
    if (!ready || !opponentId) return
    try {
      const res = await stateTransaction<CheckersState>(code, (cur) => {
        if (!cur || cur.result || cur.drawOffer === uid) return undefined
        if (cur.drawOffer === opponentId)
          return {
            ...cur,
            drawOffer: null,
            result: { winner: null, reason: "draw_agreed" },
          }
        return { ...cur, drawOffer: uid }
      })
      const after = res.snapshot.val() as CheckersState | null
      if (res.committed && after?.result)
        void endGame(toLiveResult(after.result))
    } catch (e) {
      toast.error(getErrorMessage(e, "Couldn't offer a draw"))
    }
  }

  const acceptDraw = () =>
    decide((s) =>
      s.drawOffer === opponentId
        ? { winner: null, reason: "draw_agreed" }
        : null
    ).catch((e) => toast.error(getErrorMessage(e, "Couldn't accept")))

  const declineDraw = () =>
    updateState(code, { drawOffer: null }).catch(() =>
      toast.error("Couldn't decline")
    )

  /* ── The referee ─────────────────────────────────────────────────────── */

  // The other side left, or has been gone a minute: the game is yours
  const oppGoneAt =
    opponent && !opponent.online && opponent.lastSeen
      ? opponent.lastSeen + ABANDON_MS
      : null
  const oppLeft = !!opponent?.left
  const oppTimedOut = !oppLeft && oppGoneAt !== null && now >= oppGoneAt
  React.useEffect(() => {
    if (!ready || over || me.left || !opponentId) return
    if (!(oppLeft || (oppTimedOut && isReferee))) return
    if (refereeBusy.current) return
    refereeBusy.current = true
    decide((cur) =>
      cur.light === uid || cur.dark === uid
        ? { winner: uid, reason: "abandoned" }
        : null
    )
      .catch(() => undefined)
      .finally(() => {
        refereeBusy.current = false
      })
  }, [
    ready,
    over,
    me.left,
    opponentId,
    oppLeft,
    oppTimedOut,
    isReferee,
    uid,
    decide,
  ])

  // Safety net: the result is in but the room is still "playing" (the decider dropped out)
  const resultWinner = ready ? (state.result?.winner ?? null) : null
  const resultReason = ready ? (state.result?.reason ?? null) : null
  React.useEffect(() => {
    if (!resultReason || !isReferee || meta.status !== "playing") return
    const id = window.setTimeout(
      () =>
        void endGame({
          winnerIds: resultWinner ? [resultWinner] : [],
          reason: resultReason,
        }),
      END_FALLBACK_MS
    )
    return () => window.clearTimeout(id)
  }, [resultReason, resultWinner, isReferee, meta.status, endGame])

  /* ── Render ──────────────────────────────────────────────────────────── */

  if (!ready || !board || !shown) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
          <Spinner className="size-4" />
          {state === null ? "Waiting for the board…" : "Setting up the board…"}
        </CardContent>
      </Card>
    )
  }

  const bottomSide: Side = mySide ?? "l"
  const topSide = otherSide(bottomSide)
  const bottomPlayer =
    players.find((p) => p.uid === uidOf(state, bottomSide)) ?? null
  const topPlayer = players.find((p) => p.uid === uidOf(state, topSide)) ?? null
  const counts = pieceCounts(board)
  const firstName = (p: RoomPlayer | null) => (p?.name ?? "them").split(" ")[0]
  const drawOffer = state.drawOffer ?? null
  const history = historyOf(state)

  const status = (() => {
    if (over) {
      const r = state.result!
      if (!r.winner) return `Draw — ${reasonLabel(r.reason)}`
      return r.winner === uid
        ? `You win — ${reasonLabel(r.reason)}`
        : `${firstName(opponent)} wins — ${reasonLabel(r.reason)}`
    }
    if (me.left) return "You left — watching"
    if (opponent && oppGoneAt !== null && !oppLeft)
      return `${firstName(opponent)} is offline · forfeits in ${Math.max(0, Math.ceil((oppGoneAt - now) / 1000))}s`
    if (drawOffer && drawOffer === opponentId)
      return `${firstName(opponent)} offers a draw`
    if (drawOffer === uid)
      return `Draw offered — waiting for ${firstName(opponent)}`
    if (myTurn) {
      if (midJump) return "Keep jumping — tap the next square"
      if (mustCapture) return "You must capture — tap a marked piece"
      return "Your move"
    }
    return `Waiting for ${firstName(opponent)}…`
  })()

  const chip = (player: RoomPlayer | null, side: Side) => (
    <PlayerChip
      player={player}
      side={side}
      isYou={player?.uid === uid}
      men={counts[side].men}
      kings={counts[side].kings}
      // What this side has taken: the rival's missing pieces
      taken={
        MEN_PER_SIDE -
        counts[otherSide(side)].men -
        counts[otherSide(side)].kings
      }
      toMove={!over && turn === side}
    />
  )

  return (
    <div className="mx-auto flex w-full max-w-[min(92vw,30rem)] flex-col gap-2">
      <CheckersStyles />
      {chip(topPlayer, topSide)}

      <CheckersBoard
        board={shown}
        flipped={flipped}
        canInteract={canInteract}
        selected={inHand}
        trail={path}
        ghosts={ghosts}
        movable={movable}
        mustCapture={mustCapture}
        targets={targets}
        lastMove={state.lastMove ?? null}
        moveCount={moveCount}
        onTap={tap}
      />

      {chip(bottomPlayer, bottomSide)}

      {/* Status + draw answer */}
      <div className="flex min-h-10 items-center justify-between gap-2 px-1">
        <p
          className={cn(
            "text-sm font-medium",
            over
              ? "text-foreground"
              : myTurn && (mustCapture || midJump) && !drawOffer
                ? "text-warning"
                : myTurn
                  ? "text-primary"
                  : "text-muted-foreground"
          )}
          aria-live="polite"
        >
          {status}
        </p>
        {!over && !me.left && drawOffer === opponentId && (
          <div className="flex shrink-0 gap-1.5">
            <Button size="sm" onClick={() => void acceptDraw()} disabled={busy}>
              Accept draw
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => void declineDraw()}
              disabled={busy}
            >
              Decline
            </Button>
          </div>
        )}
      </div>

      <MoveList moves={history} />

      {!over && !me.left && (
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            className="h-10"
            onClick={() => void offerDraw()}
            disabled={busy || drawOffer === uid}
            aria-pressed={drawOffer === uid}
          >
            <HugeiconsIcon icon={HandshakeIcon} data-icon="inline-start" />
            {drawOffer === uid ? "Draw offered" : "Offer draw"}
          </Button>
          <Button
            variant="destructive"
            className="h-10"
            onClick={() => setConfirmResign(true)}
            disabled={busy}
          >
            <HugeiconsIcon icon={Flag02Icon} data-icon="inline-start" />
            Resign
          </Button>
        </div>
      )}

      <ConfirmDialog
        open={confirmResign}
        onOpenChange={setConfirmResign}
        title="Resign the game?"
        description={`${firstName(opponent)} wins. There's a rematch button at the end.`}
        confirmLabel="Resign"
        destructive
        icon={Flag02Icon}
        isPending={busy}
        onConfirm={() => void resign()}
      />
    </div>
  )
}

/* ── Pieces of the screen ────────────────────────────────────────────── */

function PlayerChip({
  player,
  side,
  isYou,
  men,
  kings,
  taken,
  toMove,
}: {
  player: RoomPlayer | null
  side: Side
  isYou: boolean
  men: number
  kings: number
  taken: number
  toMove: boolean
}) {
  const total = men + kings
  return (
    <div
      className={cn(
        "flex items-center gap-2.5 rounded-lg border bg-card px-3 py-2 transition-colors",
        toMove && "border-primary/40 ring-1 ring-primary/20"
      )}
    >
      <UserAvatar
        src={player?.photo}
        name={player?.name ?? "?"}
        size="sm"
        uid={player?.uid}
        className="size-9"
      />
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 text-sm font-semibold">
          <Disc cell={side} className="text-[11px]" />
          <span className="truncate">
            {isYou ? "You" : (player?.name ?? "Waiting…")}
          </span>
          {player && !player.online && !player.left && (
            <span className="text-[11px] font-normal text-muted-foreground">
              offline
            </span>
          )}
          {player?.left && (
            <span className="text-[11px] font-normal text-muted-foreground">
              left
            </span>
          )}
        </p>
        <p className="flex h-4 items-center gap-1.5 text-[11px] text-muted-foreground">
          <span className="tabular-nums">
            {total} {total === 1 ? "piece" : "pieces"}
            {kings > 0 && ` · ${kings} ${kings === 1 ? "king" : "kings"}`}
          </span>
          {taken > 0 && (
            <span
              className="flex items-center gap-px"
              aria-label={`${taken} captured`}
            >
              {Array.from({ length: taken }, (_, i) => (
                // What this side took: the other side's pieces
                <Disc key={i} cell={otherSide(side)} className="text-[9px]" />
              ))}
            </span>
          )}
        </p>
      </div>
      {toMove && (
        <span className="shrink-0 text-[11px] font-medium text-primary">
          To move
        </span>
      )}
    </div>
  )
}

/** Moves in pairs (light, dark), newest in view. */
function MoveList({ moves }: { moves: string[] }) {
  const ref = React.useRef<HTMLOListElement>(null)
  React.useEffect(() => {
    const el = ref.current
    if (el) el.scrollLeft = el.scrollWidth
  }, [moves.length])
  if (moves.length === 0) {
    return (
      <p className="px-1 text-xs text-muted-foreground">
        No moves yet — light starts.
      </p>
    )
  }
  const pairs: { n: number; l: string; d?: string }[] = []
  for (let i = 0; i < moves.length; i += 2)
    pairs.push({ n: i / 2 + 1, l: moves[i], d: moves[i + 1] })
  return (
    <ol
      ref={ref}
      className="no-scrollbar flex gap-x-3 overflow-x-auto rounded-lg border bg-card px-3 py-2 text-sm whitespace-nowrap"
      aria-label="Moves"
    >
      {pairs.map((p, i) => {
        const lastPair = i === pairs.length - 1
        return (
          <li
            key={p.n}
            className="flex shrink-0 items-baseline gap-1 font-mono"
          >
            <span className="text-xs text-muted-foreground">{p.n}.</span>
            <span
              className={cn(
                lastPair &&
                  !p.d &&
                  "rounded bg-primary/10 px-1 font-semibold text-primary"
              )}
            >
              {p.l}
            </span>
            {p.d && (
              <span
                className={cn(
                  lastPair &&
                    "rounded bg-primary/10 px-1 font-semibold text-primary"
                )}
              >
                {p.d}
              </span>
            )}
          </li>
        )
      })}
    </ol>
  )
}

function reasonLabel(reason: CheckersResult["reason"]) {
  switch (reason) {
    case "no_pieces":
      return "all pieces captured"
    case "no_moves":
      return "no moves left"
    case "forty_moves":
      return "forty moves without progress"
    case "resign":
      return "by resignation"
    case "draw_agreed":
      return "agreed"
    case "abandoned":
      return "the other side left"
  }
}
