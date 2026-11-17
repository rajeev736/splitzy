"use client"

import * as React from "react"
import { Chess, type Color, type PieceSymbol, type Square } from "chess.js"
import { serverTimestamp } from "firebase/database"
import { Flag02Icon, HandshakeIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { toast } from "sonner"

import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import { useRoomNode } from "@/hooks/use-live-room"
import { getErrorMessage } from "@/lib/errors"
import {
  applyMove,
  colourOf,
  flaggedSide,
  formatClock,
  material,
  movesOf,
  opponentOf,
  remainingMs,
  sideToMove,
  timeoutResult,
  toLiveResult,
  uidOf,
  type ChessMoveInput,
  type ChessResult,
  type ChessState,
} from "@/lib/live/chess"
import { ABANDON_MS } from "@/lib/live/room"
import type { LiveGameProps, RoomPlayer } from "@/lib/live/types"
import { cn } from "@/lib/utils"
import { playSound, useOnChange } from "@/lib/live/sound"
import { useBoardTheme } from "@/lib/live/themes"
import { useWallet } from "@/hooks/use-fun"
import { stateTransaction, updateState } from "@/services/live-rooms"
import { PlayerAvatar } from "../player-avatar"
import {
  ChessBoard,
  PieceGlyph,
  type BoardPiece,
  type BoardTarget,
} from "./chess-board"

/** Write-time placeholder for the server clock. */
const ts = () => serverTimestamp() as unknown as number
/** How often the running clock repaints. */
const CLOCK_TICK_MS = 200
/** The referee's safety net: ends the room if whoever decided the game didn't get to. */
const END_FALLBACK_MS = 2000

/**
 * Chess between the two seats of the room. Moves are read-modify-write
 * transactions on the state (see lib/live/chess.ts), so a double tap or a
 * flag falling mid-move can't corrupt the game. Whoever decides the game
 * (mate, flag, resign, draw) writes the result and ends the room.
 */
export function ChessGame({
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
  const { data: state } = useRoomNode<ChessState>(code, "state")
  const wallet = useWallet()
  const chessTheme = useBoardTheme("chess", wallet?.themes)
  // Sounds: a wooden knock per move, a sharper one for a capture, a chime for check
  useOnChange(state?.moves?.length ?? 0, (n, was) => {
    if (n <= was) return
    const san = state?.moves?.[n - 1] ?? ""
    playSound(san.includes("+") ? "check" : san.includes("x") ? "take" : "move")
  })
  const ready =
    !!state && typeof state.fen === "string" && !!state.white && !!state.black

  const [selected, setSelected] = React.useState<Square | null>(null)
  const [promotion, setPromotion] = React.useState<{
    from: Square
    to: Square
  } | null>(null)
  const [confirmResign, setConfirmResign] = React.useState(false)
  const [busy, setBusy] = React.useState(false)
  const [clockNow, setClockNow] = React.useState<number | null>(null)
  // One automatic write at a time (flag fall / abandonment), never read while rendering
  const refereeBusy = React.useRef(false)

  const fen = ready ? state.fen : null
  const position = React.useMemo(() => (fen ? new Chess(fen) : null), [fen])

  const myColour = ready ? colourOf(state, uid) : null
  const turn = ready ? sideToMove(state) : "w"
  const over = ready && !!state.result
  const opponentId = ready ? opponentOf(state, uid) : null
  const opponent = players.find((p) => p.uid === opponentId) ?? null
  const flipped = myColour === "b"
  const myTurn = ready && !over && !me.left && myColour === turn
  const canInteract = myTurn && !busy
  const inCheck = !!position && position.inCheck()
  const checkSquare =
    inCheck && position
      ? (position.findPiece({ type: "k", color: turn })[0] ?? null)
      : null
  const moves = ready ? movesOf(state) : []

  const pieces = React.useMemo<BoardPiece[]>(() => {
    if (!position) return []
    const out: BoardPiece[] = []
    for (const row of position.board())
      for (const sq of row)
        if (sq) out.push({ square: sq.square, type: sq.type, color: sq.color })
    return out
  }, [position])

  const targets = React.useMemo<Partial<Record<Square, BoardTarget>>>(() => {
    const map: Partial<Record<Square, BoardTarget>> = {}
    if (!position || !selected || !canInteract) return map
    for (const m of position.moves({ square: selected, verbose: true })) {
      map[m.to] = {
        capture: m.isCapture() || m.isEnPassant(),
        promotion: !!m.promotion,
      }
    }
    return map
  }, [position, selected, canInteract])

  /* ── Writes ──────────────────────────────────────────────────────────── */

  /** Writes a result (once) and ends the room. */
  const decide = React.useCallback(
    async (make: (s: ChessState) => ChessResult | null) => {
      const res = await stateTransaction<ChessState>(code, (cur) => {
        if (!cur || cur.result) return undefined
        const result = make(cur)
        if (!result) return undefined
        return { ...cur, result, drawOffer: null }
      })
      const after = res.snapshot.val() as ChessState | null
      if (after?.result) await endGame(toLiveResult(after.result))
    },
    [code, endGame]
  )

  const play = async (input: ChessMoveInput) => {
    if (busy) return
    setBusy(true)
    setSelected(null)
    setPromotion(null)
    try {
      const res = await stateTransaction<ChessState>(code, (cur) => {
        if (!cur) return undefined
        const next = applyMove(cur, uid, input, serverNow())
        return next ? { ...next.state, lastMoveAt: ts() } : undefined
      })
      const after = res.snapshot.val() as ChessState | null
      if (res.committed && after?.result)
        void endGame(toLiveResult(after.result))
    } catch (e) {
      toast.error(getErrorMessage(e, "Couldn't make that move"))
    } finally {
      setBusy(false)
    }
  }

  const tryMove = (from: Square, to: Square) => {
    if (targets[to]?.promotion) {
      setPromotion({ from, to })
      return
    }
    void play({ from, to })
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
      const res = await stateTransaction<ChessState>(code, (cur) => {
        if (!cur || cur.result || cur.drawOffer === uid) return undefined
        if (cur.drawOffer === opponentId)
          return {
            ...cur,
            drawOffer: null,
            result: { winner: null, reason: "draw_agreed" },
          }
        return { ...cur, drawOffer: uid }
      })
      const after = res.snapshot.val() as ChessState | null
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

  /* ── Clocks & the referee ────────────────────────────────────────────── */

  // A fine clock while a timed game is on; the same tick spots a fallen flag
  const hasClock = ready && !!state.clock && !over
  React.useEffect(() => {
    if (!hasClock || !state) return
    const check = () => {
      const t = serverNow()
      setClockNow(t)
      const flagged = flaggedSide(state, t)
      if (!flagged || me.left || refereeBusy.current) return
      // The other side confirms the flag; the flagged player only when nobody else is around
      const flaggedUid = uidOf(state, flagged)
      const other = players.find((p) => p.uid === opponentOf(state, flaggedUid))
      const otherHere = !!other && other.online && !other.left
      if (uid !== flaggedUid ? false : otherHere) return
      refereeBusy.current = true
      decide((cur) => {
        const side = flaggedSide(cur, serverNow())
        return side ? timeoutResult(cur, side) : null
      })
        .catch(() => undefined)
        .finally(() => {
          refereeBusy.current = false
        })
    }
    const id = window.setInterval(check, CLOCK_TICK_MS)
    return () => window.clearInterval(id)
  }, [hasClock, state, players, uid, me.left, serverNow, decide])

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
      cur.white === uid || cur.black === uid
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

  if (!ready) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
          <Spinner className="size-4" />
          {state === null ? "Waiting for the board…" : "Setting up the board…"}
        </CardContent>
      </Card>
    )
  }

  const displayNow = clockNow ?? now
  const bottomColour: Color = myColour ?? "w"
  const topColour: Color = bottomColour === "w" ? "b" : "w"
  const bottomPlayer =
    players.find((p) => p.uid === uidOf(state, bottomColour)) ?? null
  const topPlayer =
    players.find((p) => p.uid === uidOf(state, topColour)) ?? null
  const mat = material(state.fen)
  const firstName = (p: RoomPlayer | null) => (p?.name ?? "them").split(" ")[0]
  const drawOffer = state.drawOffer ?? null

  const status = (() => {
    if (over) {
      const r = state.result!
      if (!r.winner) return `Draw — ${reasonLabel(r.reason)}`
      return r.winner === uid
        ? `You win — ${reasonLabel(r.reason)}`
        : `${firstName(opponent)} wins — ${reasonLabel(r.reason)}`
    }
    if (me.left) return "You left — watching"
    if (opponent && oppGoneAt !== null && !oppLeft) {
      return `${firstName(opponent)} is offline · forfeits in ${Math.max(0, Math.ceil((oppGoneAt - now) / 1000))}s`
    }
    if (drawOffer && drawOffer === opponentId)
      return `${firstName(opponent)} offers a draw`
    if (drawOffer === uid)
      return `Draw offered — waiting for ${firstName(opponent)}`
    if (myTurn) return inCheck ? "Check! Your move" : "Your move"
    return inCheck
      ? `Check! Waiting for ${firstName(opponent)}…`
      : `Waiting for ${firstName(opponent)}…`
  })()

  const chip = (player: RoomPlayer | null, colour: Color) => (
    <PlayerChip
      player={player}
      colour={colour}
      isYou={player?.uid === uid}
      captured={mat.captured[colour]}
      // The point lead, shown on the side that has it
      lead={colour === "w" ? mat.diff : -mat.diff}
      clockMs={remainingMs(state, colour, displayNow)}
      ticking={!over && turn === colour}
      toMove={!over && turn === colour}
    />
  )

  return (
    <div className="mx-auto flex w-full max-w-[min(92vw,30rem)] flex-col gap-2">
      {chip(topPlayer, topColour)}

      <ChessBoard
        look={chessTheme.look}
        pieces={pieces}
        flipped={flipped}
        myColour={myColour}
        canInteract={canInteract}
        selected={selected}
        targets={targets}
        lastMove={state.last ?? null}
        checkSquare={checkSquare}
        moveCount={moves.length}
        promotion={promotion}
        onSelect={setSelected}
        onMove={tryMove}
        onPromote={(piece: PieceSymbol) =>
          promotion && void play({ ...promotion, promotion: piece })
        }
        onCancelPromotion={() => {
          setPromotion(null)
          setSelected(null)
        }}
      />

      {chip(bottomPlayer, bottomColour)}

      {/* Status + draw answer */}
      <div className="flex min-h-10 items-center justify-between gap-2 px-1">
        <p
          className={cn(
            "text-sm font-medium",
            over
              ? "text-foreground"
              : inCheck && !drawOffer
                ? "text-destructive"
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

      <MoveList moves={moves} />

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
  colour,
  isYou,
  captured,
  lead,
  clockMs,
  ticking,
  toMove,
}: {
  player: RoomPlayer | null
  colour: Color
  isYou: boolean
  captured: PieceSymbol[]
  lead: number
  clockMs: number | null
  ticking: boolean
  toMove: boolean
}) {
  const low = clockMs !== null && clockMs < 10_000
  return (
    <div
      className={cn(
        "flex items-center gap-2.5 rounded-lg border bg-card px-3 py-2 transition-colors",
        toMove && "border-primary/40 ring-1 ring-primary/20"
      )}
    >
      <PlayerAvatar player={player} size={36} className="shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 text-sm font-semibold">
          <span
            className={cn(
              "size-2.5 shrink-0 rounded-full border",
              colour === "w"
                ? "border-black/30 bg-white"
                : "border-white/30 bg-[#1f1f1f]"
            )}
            aria-label={colour === "w" ? "White" : "Black"}
          />
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
        <p
          className="flex h-4 items-center gap-0.5 text-sm leading-none"
          aria-label="Captured pieces"
        >
          {captured.map((type, i) => (
            // What this side took: the other side's pieces
            <PieceGlyph
              key={`${type}${i}`}
              type={type}
              color={colour === "w" ? "b" : "w"}
              className="text-[15px]"
            />
          ))}
          {lead > 0 && (
            <span className="ml-1 text-[11px] font-semibold text-muted-foreground">
              +{lead}
            </span>
          )}
        </p>
      </div>
      {clockMs !== null && (
        <div
          className={cn(
            "min-w-[4.5rem] rounded-md px-2 py-1 text-center font-mono text-lg font-semibold tabular-nums transition-colors",
            ticking
              ? low
                ? "bg-destructive/10 text-destructive"
                : "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground",
            !ticking && low && "text-destructive"
          )}
          aria-live={ticking && low ? "polite" : "off"}
        >
          {formatClock(clockMs)}
        </div>
      )}
    </div>
  )
}

/** SAN pairs, newest in view. */
function MoveList({ moves }: { moves: string[] }) {
  const ref = React.useRef<HTMLOListElement>(null)
  React.useEffect(() => {
    const el = ref.current
    if (el) el.scrollLeft = el.scrollWidth
  }, [moves.length])
  if (moves.length === 0) {
    return (
      <p className="px-1 text-xs text-muted-foreground">
        No moves yet — white starts.
      </p>
    )
  }
  const pairs: { n: number; w: string; b?: string }[] = []
  for (let i = 0; i < moves.length; i += 2)
    pairs.push({ n: i / 2 + 1, w: moves[i], b: moves[i + 1] })
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
                  !p.b &&
                  "rounded bg-primary/10 px-1 font-semibold text-primary"
              )}
            >
              {p.w}
            </span>
            {p.b && (
              <span
                className={cn(
                  lastPair &&
                    "rounded bg-primary/10 px-1 font-semibold text-primary"
                )}
              >
                {p.b}
              </span>
            )}
          </li>
        )
      })}
    </ol>
  )
}

function reasonLabel(reason: ChessResult["reason"]) {
  switch (reason) {
    case "checkmate":
      return "checkmate"
    case "stalemate":
      return "stalemate"
    case "insufficient":
      return "not enough material"
    case "repetition":
      return "threefold repetition"
    case "fifty_moves":
      return "fifty-move rule"
    case "timeout":
      return "on time"
    case "resign":
      return "by resignation"
    case "draw_agreed":
      return "agreed"
    case "abandoned":
      return "the other side left"
  }
}
