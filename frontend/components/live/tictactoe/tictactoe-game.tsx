"use client"

import * as React from "react"
import { serverTimestamp } from "firebase/database"

import { Spinner } from "@/components/ui/spinner"
import { useWallet } from "@/hooks/use-fun"
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
import { playSound, useOnChange } from "@/lib/live/sound"
import { useBoardTheme } from "@/lib/live/themes"
import { stateTransaction } from "@/services/live-rooms"
import { TTT_SKINS } from "./skins"
import type { TttSeat } from "./skins/types"

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
  // The table is drawn by the skin of this device's chosen (and owned) theme
  const wallet = useWallet()
  const theme = useBoardTheme("tictactoe", wallet?.themes)
  const Scene = TTT_SKINS[theme.look.skin]

  // The cell that was just played, so the skin can animate it in
  const board = state?.board ?? null
  const [seen, setSeen] = React.useState<{ board: string | null; lastMove: number | null }>({ board, lastMove: null })
  let lastMove = seen.lastMove
  if (seen.board !== board) {
    const was = seen.board
    const placed = board && was && board.length === was.length ? [...board].findIndex((c, i) => c !== "." && was[i] === ".") : -1
    lastMove = placed >= 0 ? placed : null
    setSeen({ board, lastMove })
  }

  const s = state ?? null
  const myMark = s ? markOf(s, uid) : null
  const opponentId = s?.players.find((p) => p !== uid) ?? null

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
  const roundWinner = s.roundOver && s.roundOver !== "draw" ? uidOf(s, s.roundOver) : null
  const status = s.roundOver
    ? s.roundOver === "draw"
      ? "Round drawn"
      : roundWinner === uid
        ? "You won the round!"
        : `${first(byId[roundWinner ?? ""])} won the round`
    : myTurn
      ? "Your move"
      : `Waiting for ${first(byId[turnUid])}…`
  const tone = s.roundOver
    ? s.roundOver === "draw"
      ? "draw"
      : roundWinner === uid
        ? "win"
        : "lose"
    : myTurn
      ? "turn"
      : "wait"
  const seat = (id: string | null, you: boolean): TttSeat => {
    const p = id ? byId[id] : undefined
    return {
      name: you ? "You" : first(p),
      photo: p?.photo,
      avatar: p?.avatar,
      frame: p?.frame,
      mark: id ? markOf(s, id) : null,
      wins: id ? (s.wins[id] ?? 0) : 0,
      active: !s.roundOver && !!id && turnUid === id,
      away: !!p && (p.left || !p.online),
    }
  }

  return (
    <Scene
      board={s.board}
      winLine={s.winLine}
      lastMove={lastMove}
      canPlay={myTurn && !busy}
      onPlay={(i) => void play(i)}
      me={seat(uid, true)}
      opponent={seat(opponentId, false)}
      status={status}
      tone={tone}
      round={s.round}
      bestOf={s.bestOf}
      toWin={toWin(s.bestOf)}
    />
  )
}

const first = (p?: RoomPlayer) => (p ? p.name.split(" ")[0] : "Someone")
