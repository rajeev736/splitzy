import type { RoomMeta, RoomPlayer } from "../types"

/**
 * Checking a finished live game on the server (app/api/live/settle): the
 * game is replayed from its own start (initialStateFor, the same seed) through
 * its move log (lib/live/log), with the same rules the devices play by. It
 * counts only if the replay lands on the board that was played and agrees on
 * who won.
 */
export interface VerifyInput {
  code: string
  meta: RoomMeta
  /** Everyone who had a seat (left ones included, `left: true`). */
  players: RoomPlayer[]
  /** The final game state as stored (with `log`). */
  state: unknown
}

export type VerifyResult =
  | { ok: true; winners: string[] }
  /** Couldn't be confirmed: a move that isn't legal, a board that doesn't match, a result that wasn't earned. */
  | { ok: false; reason: string }

export type Verifier = (input: VerifyInput) => VerifyResult

/** Same people, any order. */
export const sameSet = (a: readonly string[], b: readonly string[]) =>
  a.length === b.length && a.every((x) => b.includes(x))
