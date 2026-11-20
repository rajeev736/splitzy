import type { RoomMeta, RoomPlayer } from "./types"

/**
 * Is anyone actually in a room? `online` on a seat is true only while that
 * player has the room open (services/live-rooms watchPresence, cleared by the
 * server on disconnect), so a room whose players all closed the app — without
 * pressing Leave — is idle, whatever its status says. Lists use this so such
 * a room stops reading "In progress", and the next participant to see it
 * closes it for good.
 */

/** Nobody inside this long: the room is idle ("everyone's away"). */
export const IDLE_MS = 2 * 60 * 1000
/** A game nobody has come back to in this long is ended (no winner). */
export const ABANDONED_GAME_MS = 6 * 60 * 1000
/** A lobby nobody has been in for this long is closed. */
export const ABANDONED_LOBBY_MS = 20 * 60 * 1000

export type RoomLife =
  /** Lobby / countdown with someone inside. */
  | "waiting"
  /** Game on, someone playing. */
  | "playing"
  /** Lobby / countdown / game, but nobody has had it open for a while. */
  | "idle"
  | "ended"

export interface RoomLiveness {
  life: RoomLife
  /** Players (not left) with the room open right now. */
  online: number
  /** How long nobody has been inside (0 while someone is). */
  idleFor: number
  /** Idle long enough to be closed by whoever sees it next. */
  abandoned: boolean
}

export function roomLiveness(meta: RoomMeta, players: RoomPlayer[] | Record<string, RoomPlayer> | null | undefined, now: number): RoomLiveness {
  if (meta.status === "ended") return { life: "ended", online: 0, idleFor: 0, abandoned: false }
  const list = (Array.isArray(players) ? players : Object.values(players ?? {})).filter((p) => !p.left)
  const online = list.filter((p) => p.online).length
  const lobby = meta.status === "lobby" || meta.status === "countdown"
  if (online > 0) return { life: lobby ? "waiting" : "playing", online, idleFor: 0, abandoned: false }
  // Nobody inside: since the last one left (or since it opened / started)
  const since = Math.max(
    meta.startedAt ?? 0,
    meta.createdAt ?? 0,
    ...list.map((p) => p.lastSeen ?? 0)
  )
  const idleFor = since > 0 ? Math.max(0, now - since) : 0
  if (idleFor < IDLE_MS) return { life: lobby ? "waiting" : "playing", online, idleFor, abandoned: false }
  return { life: "idle", online, idleFor, abandoned: idleFor >= (lobby ? ABANDONED_LOBBY_MS : ABANDONED_GAME_MS) }
}

/** The result a game gets when everyone walked away from it. */
export const EVERYONE_LEFT_REASON = "everyone_left"
