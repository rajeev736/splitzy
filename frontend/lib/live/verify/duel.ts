import { EVERYONE_LEFT_REASON } from "../liveness"
import { ABANDON_MS } from "../room"
import { initialStateFor } from "../start"
import type { LiveGameId, RoomMeta, RoomPlayer } from "../types"
import { sameSet, type VerifyResult } from "./types"

/**
 * Shared by the two-player board games (Chess, Checkers, Tic Tac Toe): how
 * their start is rebuilt, how a claim that the other side walked away is
 * checked, and how the replayed result is matched with the room's.
 */

/** Slack for a claim checked against the server clock (devices estimate it). */
export const CLOCK_SLACK_MS = 3000
/** How far a device's claimed "now" may be from the server time its write landed at. */
export const CLAIM_SLACK_MS = 5000

export const fail = (reason: string): VerifyResult => ({ ok: false, reason })

/** Seat order, the way the room lists players (lib/live/games seatOrder). */
const bySeat = (players: RoomPlayer[]) =>
  [...players].sort((a, b) => a.seat - b.seat || (a.joinedAt ?? 0) - (b.joinedAt ?? 0))

/**
 * The game's first state, as the referee wrote it (services/live-rooms
 * startGame: initialStateFor with the seated players not flagged `left`, in
 * seat order, seeded with the room code). Players flagged `left` now were
 * still in when it started (nobody can leave a lobby and keep a seat), so the
 * whole seat list is tried first, then the one without those who left;
 * `matches` picks the one whose sides are the stored game's.
 */
export function startOf<S>(
  game: LiveGameId,
  code: string,
  meta: RoomMeta,
  players: RoomPlayer[],
  matches: (start: S) => boolean
): S | null {
  const all = bySeat(players)
  const stayed = all.filter((p) => !p.left)
  const tries = stayed.length === all.length ? [all] : [all, stayed]
  for (const list of tries) {
    if (list.length === 0) continue
    const start = initialStateFor(game, list, meta.options ?? {}, code) as S
    if (matches(start)) return start
  }
  return null
}

/**
 * Had `uid` walked away when a claim was written at `t` (server ms)? Left for
 * good, or offline for the abandon time (with a little slack). A seat that is
 * gone altogether counts as away too.
 */
export function wasAway(players: RoomPlayer[], uid: string, t: number): boolean {
  const p = players.find((x) => x.uid === uid)
  if (!p || p.left) return true
  return !p.online && typeof p.lastSeen === "number" && p.lastSeen + ABANDON_MS <= t + CLOCK_SLACK_MS
}

/** "<what>@<ms>" → the action and the claimed time (null when none). */
export function splitClaim(action: string): { what: string; at: number | null } {
  const m = action.match(/^(.*)@(\d{1,16})$/)
  return m ? { what: m[1], at: Number(m[2]) } : { what: action, at: null }
}

/** A device's claimed "now" for an entry the server stamped at `t`: fine when close enough. */
export const claimFits = (claimed: number, t: number) =>
  Number.isFinite(claimed) && Math.abs(claimed - t) <= CLAIM_SLACK_MS

/**
 * The replay's winners against the room's. A game the room closed because
 * everyone walked away (services/live-rooms closeAbandonedRoom) has nobody to
 * reward, whatever the board says; otherwise a game must have been decided
 * on the board (`replayed` null = it wasn't) and agree on who won.
 */
export function settleWinners(meta: RoomMeta, replayed: string[] | null): VerifyResult {
  const claimed = meta.result?.winnerIds ?? []
  if (meta.result?.reason === EVERYONE_LEFT_REASON && claimed.length === 0) return { ok: true, winners: [] }
  if (!replayed) return fail("the game ended without a result on the board")
  if (!sameSet(replayed, claimed)) return fail("the room's winners aren't the ones the moves give")
  return { ok: true, winners: replayed }
}

/** Plain-value equality for the parts of a state that are compared (arrays / objects / primitives). */
export function same(a: unknown, b: unknown): boolean {
  // The database drops nulls: missing and null are the same thing
  if (a === b || (a == null && b == null)) return true
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false
    return a.every((x, i) => same(x, b[i]))
  }
  if (a && b && typeof a === "object" && typeof b === "object") {
    const ka = Object.keys(a).filter((k) => (a as Record<string, unknown>)[k] != null)
    const kb = Object.keys(b).filter((k) => (b as Record<string, unknown>)[k] != null)
    if (ka.length !== kb.length) return false
    return ka.every((k) => same((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]))
  }
  return false
}

/** RTDB hands an array back as an object when it has gaps (or a plain list): a list either way. */
export function listOf<T>(raw: unknown): T[] {
  if (Array.isArray(raw)) return raw as T[]
  if (raw && typeof raw === "object")
    return Object.keys(raw)
      .sort((x, y) => Number(x) - Number(y))
      .map((k) => (raw as Record<string, T>)[k])
  return []
}
