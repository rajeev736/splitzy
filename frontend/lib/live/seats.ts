import { LIVE_GAMES } from "./games"
import type { LiveGameId, RoomMeta, RoomOptions, RoomPlayer } from "./types"

/**
 * Seats in a lobby, and Ludo's team-up (room option `teams: "2v2"`).
 *
 * Team rooms always have 4 seats. Teammates sit opposite on the board, so
 * seats 0 and 2 are Team A (red + yellow) and seats 1 and 3 are Team B
 * (green + blue); the creator starts in seat 0. A newcomer takes the lowest
 * free seat and may move to any free seat. When all four are taken, one
 * player can step onto the bench (seat index = maxPlayers) to free a seat
 * for a swap; nothing starts while someone sits there.
 *
 * Pure functions: the lobby, the referee and the room service all use them.
 */

export const TEAM_NAMES = ["Team A", "Team B"] as const
export type TeamIndex = 0 | 1

export const isTeamOptions = (game: LiveGameId, options: RoomOptions | undefined) =>
  game === "ludo" && options?.teams === "2v2"

export const isTeamRoom = (meta: Pick<RoomMeta, "game" | "options">) => isTeamOptions(meta.game, meta.options)

/** Seats for a new room: the game's own, except team Ludo, which is always four. */
export function seatsFor(game: LiveGameId, options: RoomOptions | undefined): { minPlayers: number; maxPlayers: number } {
  if (isTeamOptions(game, options)) return { minPlayers: 4, maxPlayers: 4 }
  const info = LIVE_GAMES[game]
  return { minPlayers: info.minPlayers, maxPlayers: info.maxPlayers }
}

/** Seats 0 and 2 are Team A, 1 and 3 Team B (teammates sit opposite). */
export const teamOfSeat = (seat: number): TeamIndex => (seat % 2) as TeamIndex
export const teamSeats = (team: TeamIndex): [number, number] => [team, team + 2]

/** Team rooms: the one waiting spot used while two players swap sides. */
export const benchSeat = (meta: Pick<RoomMeta, "maxPlayers">) => meta.maxPlayers

const inRoom = (players: RoomPlayer[]) => players.filter((p) => !p.left)

/** Players in a real seat (not on the bench). */
export const seatedPlayers = (meta: Pick<RoomMeta, "maxPlayers">, players: RoomPlayer[]) =>
  inRoom(players).filter((p) => p.seat < meta.maxPlayers)

/** Who's on the bench, if anyone. */
export const benchedPlayer = (meta: Pick<RoomMeta, "maxPlayers">, players: RoomPlayer[]) =>
  inRoom(players).find((p) => p.seat >= meta.maxPlayers) ?? null

/** The player in `seat`, if any (the earliest claim when two collide). */
export function playerInSeat(players: RoomPlayer[], seat: number): RoomPlayer | null {
  const here = inRoom(players)
    .filter((p) => p.seat === seat)
    .sort(byClaim)
  return here[0] ?? null
}

/** Free real seats, lowest first. */
export function freeSeats(meta: Pick<RoomMeta, "maxPlayers">, players: RoomPlayer[]): number[] {
  const taken = new Set(inRoom(players).map((p) => p.seat))
  return Array.from({ length: meta.maxPlayers }, (_, i) => i).filter((s) => !taken.has(s))
}

/** Every seat is taken and nobody waits on the bench: the countdown may run. */
export const isFull = (meta: Pick<RoomMeta, "maxPlayers">, players: RoomPlayer[]) =>
  seatedPlayers(meta, players).length >= meta.maxPlayers && !benchedPlayer(meta, players)

/** Enough players to start now (team rooms need all four, nobody on the bench). */
export function canStart(meta: Pick<RoomMeta, "game" | "options" | "minPlayers" | "maxPlayers">, players: RoomPlayer[]) {
  if (benchedPlayer(meta, players)) return false
  const seated = seatedPlayers(meta, players).length
  return isTeamRoom(meta) ? seated === 4 : seated >= meta.minPlayers
}

/**
 * Whether `uid` may move to `seat` (team rooms, before the game): a free real
 * seat, or the bench when it's empty and every real seat is taken.
 */
export function canMoveTo(
  meta: Pick<RoomMeta, "game" | "options" | "maxPlayers" | "status">,
  players: RoomPlayer[],
  uid: string,
  seat: number
): boolean {
  if (!isTeamRoom(meta) || (meta.status !== "lobby" && meta.status !== "countdown")) return false
  const me = inRoom(players).find((p) => p.uid === uid)
  if (!me || me.seat === seat) return false
  if (seat === benchSeat(meta))
    return !benchedPlayer(meta, players) && freeSeats(meta, players).length === 0
  return seat >= 0 && seat < meta.maxPlayers && !playerInSeat(players, seat)
}

/** Earlier claim first: when the seat was taken (moved or joined), then uid. */
const byClaim = (a: RoomPlayer, b: RoomPlayer) =>
  (a.seatAt ?? a.joinedAt) - (b.seatAt ?? b.joinedAt) || a.uid.localeCompare(b.uid)

/**
 * Two devices grabbed the same seat at once: the earlier claim keeps it and
 * the other moves on. Returns where `uid` should go — `prefer` (the seat they
 * came from) when it's free, else the lowest free seat, else the bench of a
 * team room — or null when there's no clash.
 */
export function resolveClash(
  meta: Pick<RoomMeta, "game" | "options" | "maxPlayers">,
  players: RoomPlayer[],
  uid: string,
  prefer?: number
): number | null {
  const me = inRoom(players).find((p) => p.uid === uid)
  if (!me) return null
  const holder = playerInSeat(players, me.seat)
  if (!holder || holder.uid === uid) return null
  const free = freeSeats(meta, players)
  if (prefer !== undefined && free.includes(prefer)) return prefer
  if (free.length) return free[0]
  if (isTeamRoom(meta) && me.seat !== benchSeat(meta) && !benchedPlayer(meta, players)) return benchSeat(meta)
  return null
}
