"use client"

import * as React from "react"
import { serverTimestamp } from "firebase/database"

import { UserAvatar } from "@/components/shared/user-avatar"
import { Spinner } from "@/components/ui/spinner"
import { useRoomNode } from "@/hooks/use-live-room"
import { ABANDON_MS } from "@/lib/live/room"
import {
  applyMark,
  markOf,
  matchOver,
  matchResult,
  nextRound,
  toWin,
  uidOf,
  type TicTacToeState,
} from "@/lib/live/tictactoe"
import type { LiveGameProps, RoomPlayer } from "@/lib/live/types"
import { cn } from "@/lib/utils"
import { playSound, useOnChange } from "@/lib/live/sound"
import { stateTransaction } from "@/services/live-rooms"

/** How long a finished round's board stays up before the next one. */
const ROUND_PAUSE_MS = 2500

/** Tic Tac Toe, a short match of rounds; X and O swap so the loser starts next. */
export function TicTacToeGame({
  code,
  players,
  uid,
  isReferee,
  now,
  endGame,
}: LiveGameProps) {
  const { data: state } = useRoomNode<TicTacToeState>(code, "state")
  // Sounds: a pop per mark
  useOnChange(state?.board?.replace(/[^xo]/g, "").length ?? 0, (n, was) => {
    if (n > was) playSound("place")
  })
  const byId = React.useMemo(
    () => Object.fromEntries(players.map((p) => [p.uid, p])),
    [players]
  )
  const [busy, setBusy] = React.useState(false)

  const s = state ?? null
  const myMark = s ? markOf(s, uid) : null
  const opponentId = s?.players.find((p) => p !== uid) ?? null
  const opponent = opponentId ? byId[opponentId] : undefined

  // Referee: after a round, start the next one or end the match
  const roundOver = s?.roundOver ?? null
  const seq = s?.seq ?? 0
  React.useEffect(() => {
    if (!isReferee || !roundOver) return
    const id = window.setTimeout(() => {
      void stateTransaction<TicTacToeState>(code, (cur) => {
        if (!cur || cur.seq !== seq || !cur.roundOver || matchOver(cur))
          return undefined
        return {
          ...nextRound(cur),
          turnAt: serverTimestamp() as unknown as number,
        }
      }).then((res) => {
        const cur = res.snapshot.val() as TicTacToeState | null
        if (cur && cur.roundOver && matchOver(cur))
          void endGame(matchResult(cur))
      })
    }, ROUND_PAUSE_MS)
    return () => window.clearTimeout(id)
  }, [isReferee, roundOver, seq, code, endGame])

  // Someone walked away: they forfeit (left now, offline after ABANDON_MS)
  React.useEffect(() => {
    if (!s || !isReferee) return
    for (const pid of s.players) {
      const p = byId[pid]
      const gone = !p || p.left || (!p.online && now - p.lastSeen > ABANDON_MS)
      if (gone) {
        const other = s.players.find((x) => x !== pid)
        if (other)
          void endGame({
            winnerIds: [other],
            ranking: [other, pid],
            reason: "abandoned",
          })
        return
      }
    }
  }, [s, byId, now, isReferee, endGame])

  if (!s) {
    return (
      <div className="flex justify-center py-16">
        <Spinner />
      </div>
    )
  }

  const myTurn = !!myMark && !s.roundOver && s.turn === myMark
  const play = async (cell: number) => {
    if (!myTurn || busy) return
    setBusy(true)
    try {
      await stateTransaction<TicTacToeState>(code, (cur) => {
        if (!cur || cur.seq !== s.seq) return undefined
        const next = applyMark(cur, uid, cell)
        return next
          ? { ...next, turnAt: serverTimestamp() as unknown as number }
          : undefined
      })
    } finally {
      setBusy(false)
    }
  }

  const turnUid = uidOf(s, s.turn)
  const status = s.roundOver
    ? s.roundOver === "draw"
      ? "Round drawn"
      : uidOf(s, s.roundOver) === uid
        ? "You won the round!"
        : `${first(byId[uidOf(s, s.roundOver)])} won the round`
    : myTurn
      ? "Your move"
      : `Waiting for ${first(byId[turnUid])}…`

  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-center gap-4">
      {/* Score */}
      <div className="grid w-full grid-cols-[1fr_auto_1fr] items-center gap-2">
        <PlayerChip
          player={byId[uid]}
          mark={myMark}
          wins={s.wins[uid] ?? 0}
          active={!s.roundOver && turnUid === uid}
          you
        />
        <div className="text-center text-xs text-muted-foreground">
          Round {Math.min(s.round, s.bestOf)}
          <br />
          first to {toWin(s.bestOf)}
        </div>
        <PlayerChip
          player={opponent}
          mark={opponentId ? markOf(s, opponentId) : null}
          wins={opponentId ? (s.wins[opponentId] ?? 0) : 0}
          active={!s.roundOver && turnUid === opponentId}
        />
      </div>

      <p
        className={cn(
          "text-sm font-semibold",
          s.roundOver &&
            s.roundOver !== "draw" &&
            uidOf(s, s.roundOver) === uid &&
            "text-success",
          myTurn && "text-primary"
        )}
        aria-live="polite"
      >
        {status}
      </p>

      {/* Board */}
      <div
        className="grid aspect-square w-full max-w-[min(88vw,22rem)] grid-cols-[repeat(3,minmax(0,1fr))] grid-rows-[repeat(3,minmax(0,1fr))] gap-2"
        role="grid"
        aria-label="Board"
      >
        {Array.from(s.board).map((cell, i) => {
          const win = s.winLine?.includes(i)
          const empty = cell === "."
          return (
            <button
              key={i}
              type="button"
              role="gridcell"
              aria-label={
                empty
                  ? `Square ${i + 1}, empty`
                  : `Square ${i + 1}, ${cell.toUpperCase()}`
              }
              disabled={!myTurn || !empty || busy}
              onClick={() => void play(i)}
              className={cn(
                "flex min-h-0 min-w-0 items-center justify-center overflow-hidden rounded-xl border-2 bg-card text-5xl leading-none font-black transition-all",
                empty &&
                  myTurn &&
                  "hover:border-primary/50 hover:bg-primary/5 active:scale-95",
                win && "border-success bg-success/10",
                !empty && "animate-in duration-200 zoom-in-50"
              )}
            >
              {cell === "x" && <span className="text-sky-500">✕</span>}
              {cell === "o" && <span className="text-rose-500">◯</span>}
            </button>
          )
        })}
      </div>
    </div>
  )
}

const first = (p?: RoomPlayer) => (p ? p.name.split(" ")[0] : "Someone")

function PlayerChip({
  player,
  mark,
  wins,
  active,
  you,
}: {
  player?: RoomPlayer
  mark: "x" | "o" | null
  wins: number
  active: boolean
  you?: boolean
}) {
  return (
    <div
      className={cn(
        "flex min-w-0 items-center gap-2 rounded-lg border bg-card px-2 py-2 transition-colors",
        you ? "flex-row" : "flex-row-reverse text-right",
        active && "border-primary ring-1 ring-primary"
      )}
    >
      <UserAvatar
        src={player?.photo}
        name={player?.name ?? "?"}
        size="sm"
        className="shrink-0"
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium">
          {you ? "You" : first(player)}{" "}
          <span className={mark === "x" ? "text-sky-500" : "text-rose-500"}>
            {mark === "x" ? "✕" : mark === "o" ? "◯" : ""}
          </span>
        </p>
        <p className="text-lg leading-none font-bold tabular-nums">{wins}</p>
      </div>
    </div>
  )
}
