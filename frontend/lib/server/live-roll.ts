import { randomInt } from "node:crypto"
import type { App } from "firebase-admin/app"
import { getDatabase } from "firebase-admin/database"

import { withLog } from "@/lib/live/log"
import {
  applyRoll as applyLudoRoll,
  rollFor as ludoRollFor,
  seededRandom,
  type LudoState,
} from "@/lib/live/ludo"
import { applyRoll as applySnakesRoll, rollFor as snakesRollFor, type SnakesState } from "@/lib/live/snakes"
import type { RoomMeta, RoomPlayer } from "@/lib/live/types"

/** A uniform [0, 1) from the server's CSPRNG: the only source of dice. */
const serverRand = () => randomInt(0, 2 ** 31) / 2 ** 31

export type RollOutcome =
  | { ok: true; value: number; seq: number }
  | { ok: false; status: number; reason: string }

/**
 * Rolls the dice for `uid` in room `code` — on the server, so nobody can pick
 * their number (Ludo, Snakes & Ladders). It's their turn to roll, at step
 * `seq` (a stale tap is refused), and the roll goes into the game in one
 * transaction: the board, the turn, and a log entry ("r<value>") that only
 * the server may write. The catch-up weighting (rollFor) runs here too.
 */
export async function serverRoll(app: App, uid: string, code: string, seq: number): Promise<RollOutcome> {
  const db = getDatabase(app)
  const room = db.ref(`rooms/${code}`)
  const stateRef = room.child("state")
  // Everything read in one go; reading the state also gives the transaction below
  // the real value on its first pass (no extra round trip)
  const [metaSnap, playersSnap] = await Promise.all([room.child("meta").get(), room.child("players").get(), stateRef.get()])
  const meta = metaSnap.val() as RoomMeta | null
  if (!meta) return { ok: false, status: 404, reason: "no room" }
  if (meta.status !== "playing") return { ok: false, status: 409, reason: "not playing" }
  if (meta.game !== "ludo" && meta.game !== "snakes" && meta.game !== "snakes3d")
    return { ok: false, status: 400, reason: "no dice in this game" }
  const players = Object.values((playersSnap.val() ?? {}) as Record<string, RoomPlayer>)
  const me = players.find((p) => p.uid === uid)
  if (!me || me.left) return { ok: false, status: 403, reason: "not playing in this room" }
  const gone = players.filter((p) => p.left).map((p) => p.uid)

  let rolled: { value: number; seq: number } | null = null
  let refusal: RollOutcome | null = null
  const res = await stateRef.transaction((cur: (LudoState | SnakesState) & { log?: unknown } | null) => {
    rolled = null
    refusal = null
    if (cur === null) return cur
    if (cur.turn !== uid || cur.phase !== "roll") {
      refusal = { ok: false, status: 409, reason: "not your roll" }
      return undefined
    }
    // Still the step the tap saw — or one on, where only a power fizzled out (Ludo)
    const last = (cur as LudoState).last
    if (cur.seq !== seq && !(cur.seq === seq + 1 && last?.type === "expired")) {
      refusal = { ok: false, status: 409, reason: "stale" }
      return undefined
    }
    const now = Date.now()
    try {
      if (meta.game === "ludo") {
        const s = cur as LudoState
        const value = ludoRollFor(s, uid, serverRand)
        // Power Ludo's random draws are seeded by the step, so a replay draws the same
        const next = applyLudoRoll(s, uid, value, { now, gone, rand: seededRandom(`${code}:${s.seq}`) })
        const stamped: LudoState = {
          ...next,
          turnAt: next.turnAt === s.turnAt ? s.turnAt : now,
          ...(next.dice && next.dice !== s.dice ? { dice: { ...next.dice, at: now } } : {}),
        }
        rolled = { value, seq: s.seq }
        return withLog(stamped, cur, uid, `r${value}`, now)
      }
      const s = cur as SnakesState
      const value = snakesRollFor(s, uid, serverRand)
      const next = applySnakesRoll(s, uid, value, { now, gone })
      rolled = { value, seq: s.seq }
      return withLog({ ...next, turnAt: now }, cur, uid, `r${value}`, now)
    } catch (e) {
      refusal = { ok: false, status: 409, reason: e instanceof Error ? e.message : "refused" }
      return undefined
    }
  })
  if (res.committed && rolled) return { ok: true, ...(rolled as { value: number; seq: number }) }
  return refusal ?? { ok: false, status: 409, reason: "not rolled" }
}

/**
 * Gets the server ready to roll before anyone taps: the function is up, the
 * admin SDK is set up and its database connection is open — so the first
 * roll of a game doesn't pay for any of that.
 */
export async function warmRoller(app: App): Promise<void> {
  await getDatabase(app).ref(".info/serverTimeOffset").get().catch(() => undefined)
}
