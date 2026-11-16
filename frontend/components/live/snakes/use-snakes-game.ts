"use client"

import * as React from "react"
import { serverTimestamp } from "firebase/database"
import { toast } from "sonner"

import { useRoomNode } from "@/hooks/use-live-room"
import { getErrorMessage } from "@/lib/errors"
import { ABANDON_MS } from "@/lib/live/room"
import {
  applyRoll,
  isOver,
  passTurn,
  resultOf,
  SNAKES_IDLE_MS,
  type SnakesSkipReason,
  type SnakesState,
} from "@/lib/live/snakes"
import { playSound, useOnChange } from "@/lib/live/sound"
import type { LiveGameProps, RoomPlayer } from "@/lib/live/types"
import { stateTransaction } from "@/services/live-rooms"

const ts = () => serverTimestamp() as unknown as number
/** Let the last move play out before the results screen takes over. */
const END_DELAY_MS = 2200

/** A fair 1–6 from the browser's CSPRNG. Call from an event handler. */
function rollDice(): number {
  const buf = new Uint32Array(1)
  crypto.getRandomValues(buf)
  return (buf[0] % 6) + 1
}

function skipReason(p: RoomPlayer, since: number, now: number): SnakesSkipReason | null {
  if (p.left) return "left"
  if (!p.online && now - p.lastSeen >= ABANDON_MS) return "offline"
  if (since > 0 && now - since >= SNAKES_IDLE_MS) return p.online ? "idle" : "offline"
  return null
}

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

  const commit = React.useCallback(
    async (fn: (s: SnakesState) => SnakesState, quiet = false) => {
      try {
        const res = await stateTransaction<SnakesState>(code, (cur) => {
          if (!cur) return undefined
          try {
            return { ...fn(cur), turnAt: ts() }
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
    [code]
  )

  const myTurn = !!state && state.phase !== "over" && state.turn === uid && !me.left && !state.players[uid]?.out
  const [rollLock, setRollLock] = React.useState(-1)
  const seq = state?.seq ?? -1
  /** Tapped and waiting for the roll to land. */
  const rolling = rollLock === seq && myTurn
  const canRoll = myTurn && state?.phase === "roll" && !rolling
  const roll = () => {
    if (!state || !canRoll) return
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

  // Referee: pass the turn of someone idle, offline or gone
  React.useEffect(() => {
    if (!isReferee || !state || state.phase === "over" || isOver(state, gone)) return
    const cur = byId[state.turn]
    if (!cur) return
    const reason = skipReason(cur, state.turnAt || meta.startedAt || 0, now)
    if (!reason) return
    const { turn, seq: at } = state
    void commit((s) => {
      if (s.seq !== at) throw new Error("stale")
      return passTurn(s, turn, reason, { now: serverNow(), gone })
    }, true)
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
