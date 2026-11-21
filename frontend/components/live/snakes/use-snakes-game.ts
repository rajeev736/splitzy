"use client"

import * as React from "react"
import { rollOnServer, useWarmDice } from "@/services/live-server"
import { serverTimestamp } from "firebase/database"
import { toast } from "sonner"

import { useRoomNode } from "@/hooks/use-live-room"
import { getErrorMessage } from "@/lib/errors"
import { withLog } from "@/lib/live/log"
import {
  isOver,
  passTurn,
  resultOf,
  skipAction,
  skipReason,
  SNAKES_IDLE_MS,
  type SnakesState,
} from "@/lib/live/snakes"
import { playSound, useOnChange } from "@/lib/live/sound"
import type { LiveGameProps, RoomPlayer } from "@/lib/live/types"
import { stateTransaction } from "@/services/live-rooms"

const ts = () => serverTimestamp() as unknown as number
/** Let the last move play out before the results screen takes over. */
const END_DELAY_MS = 2900

/**
 * Everything a Snakes & Ladders screen needs, shared by the flat board and
 * the 3D tower: the live state, your roll, the referee's turn skips and the
 * end of the game, and the sounds. The screens only draw.
 */
export function useSnakesGame({ code, meta, players, uid, me, isReferee, now, serverNow, endGame }: LiveGameProps) {
  const { data: state } = useRoomNode<SnakesState>(code, "state")
  const gone = React.useMemo(() => players.filter((p) => p.left).map((p) => p.uid), [players])
  const byId = React.useMemo(() => Object.fromEntries(players.map((p) => [p.uid, p])) as Record<string, RoomPlayer>, [players])
  const nameOf = React.useCallback((id: string) => (byId[id]?.name ?? "Someone").split(" ")[0], [byId])

  /** A change to the board by this device, logged as `action` (lib/live/log): the server replays the log at the end. */
  const commit = React.useCallback(
    async (fn: (s: SnakesState) => SnakesState, action: string, quiet = false) => {
      try {
        const res = await stateTransaction<SnakesState>(code, (cur) => {
          if (!cur) return undefined
          try {
            // `turnAt` and the entry's time are the same server clock: a skip is timed from the turn's start
            return withLog({ ...fn(cur), turnAt: ts() }, cur, uid, action, ts())
          } catch {
            return undefined
          }
        })
        return res.committed
      } catch (e) {
        if (!quiet) toast.error(getErrorMessage(e, "Couldn't update the game"))
        return false
      }
    },
    [code, uid]
  )

  const myTurn = !!state && state.phase !== "over" && state.turn === uid && !me.left && !state.players[uid]?.out
  const [rollLock, setRollLock] = React.useState(-1)
  // The dice come from the server: have it ready before the first tap
  useWarmDice(!me.left)
  const seq = state?.seq ?? -1
  /** Tapped and waiting for the roll to land. */
  const rolling = rollLock === seq && myTurn
  const canRoll = myTurn && state?.phase === "roll" && !rolling
  const roll = () => {
    if (!state || !canRoll) return
    // The server rolls (app/api/live/roll) and moves the piece: nobody can pick their number
    const at = state.seq
    setRollLock(at)
    void rollOnServer(code, at).catch((e) => {
      setRollLock(-1)
      if (!/stale|not your roll/.test(String((e as Error)?.message))) toast.error(getErrorMessage(e, "Couldn't roll — tap again"))
    })
  }

  // Referee: pass the turn of someone idle, offline or gone
  React.useEffect(() => {
    if (!isReferee || !state || state.phase === "over" || isOver(state, gone)) return
    const cur = byId[state.turn]
    if (!cur) return
    const reason = skipReason(cur, state.turnAt || meta.startedAt || 0, now)
    if (!reason) return
    const { turn, seq: at } = state
    void commit(
      (s) => {
        if (s.seq !== at) throw new Error("stale")
        return passTurn(s, turn, reason, { now: serverNow(), gone })
      },
      skipAction(reason, turn),
      true
    )
  }, [isReferee, state, byId, now, gone, meta.startedAt, commit, serverNow])

  // The end: the engine said so, or everyone else left
  const ended = React.useRef(false)
  React.useEffect(() => {
    if (!state || ended.current) return
    const over = state.phase === "over" || (gone.length > 0 && isOver(state, gone))
    if (!over || !(isReferee || state.turn === uid)) return
    const id = window.setTimeout(() => {
      ended.current = true
      endGame(resultOf(state, gone)).catch(() => {
        ended.current = false
      })
    }, END_DELAY_MS)
    return () => window.clearTimeout(id)
  }, [state, gone, isReferee, uid, endGame])

  // Sounds: the dice, a 6 and your turn here; the boards play the hops, ladders, snakes, the gate and
  // the summit themselves, as each one animates (once per move: a new `seq`, never Firebase's echo)
  useOnChange(seq, () => {
    const last = state?.last
    if (!state || !last) return
    if (last.type === "move" || last.type === "blocked" || last.type === "three_sixes") playSound("dice")
    if (last.type === "move" && last.value === 6 && !last.finished) window.setTimeout(() => playSound("six"), 650)
    if (state.phase === "roll" && state.turn === uid && last.by !== uid && !me.left)
      window.setTimeout(() => playSound("your_turn"), 1200)
  })

  const since = state?.turnAt || meta.startedAt || 0
  /** 1 → 0 share of the current player's decision time left. */
  const countdown = !state || state.phase === "over" || !since ? null : Math.max(0, Math.min(1, 1 - (now - since) / SNAKES_IDLE_MS))

  return { state, myTurn, canRoll, rolling, roll, byId, nameOf, gone, countdown }
}
