import type { RoomMeta, RoomPlayer } from "./types"

/** Room codes: 6 characters, no 0/O or 1/I so they're easy to read out. */
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
export const ROOM_CODE_LENGTH = 6
const CODE_PATTERN = new RegExp(`^[${CODE_ALPHABET}]{${ROOM_CODE_LENGTH}}$`)

export function randomRoomCode() {
  const buf = new Uint32Array(ROOM_CODE_LENGTH)
  crypto.getRandomValues(buf)
  return Array.from(buf, (n) => CODE_ALPHABET[n % CODE_ALPHABET.length]).join("")
}

/** Typed / pasted / scanned input → a room code, or null. Accepts the share link too. */
export function parseRoomCode(input: string | null | undefined): string | null {
  if (!input) return null
  const fromLink = input.match(/\/play\/([A-Za-z0-9]{6})(?:[/?#]|$)/)
  const code = (fromLink ? fromLink[1] : input)
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
  return CODE_PATTERN.test(code) ? code : null
}

export const roomLink = (code: string) =>
  `${(process.env.NEXT_PUBLIC_SITE_URL || (typeof window !== "undefined" ? window.location.origin : "")).replace(/\/$/, "")}/play/${code}`

/** Seconds from "every seat taken" to the game starting by itself. */
export const AUTO_START_SECONDS = 3
/** Offline this long during a game and the room treats you as gone (your turn is skipped / forfeited). */
export const ABANDON_MS = 60 * 1000
/** Rooms that never started disappear after this. */
export const LOBBY_TTL_MS = 6 * 60 * 60 * 1000
/** Finished rooms can be deleted by anyone after this (see database.rules.json). */
export const ENDED_TTL_MS = 24 * 60 * 60 * 1000

/**
 * The referee: the first online player in seat order. Everyone computes the
 * same answer from the same data, so exactly one device acts; if they drop,
 * the next one takes over on the next tick.
 */
export function refereeOf(players: RoomPlayer[]): string | null {
  const live = players.filter((p) => !p.left)
  return (live.find((p) => p.online) ?? live[0])?.uid ?? null
}

export const isJoinable = (meta: RoomMeta) => meta.status === "lobby" || meta.status === "countdown"

/** Ludo colours by seat. */
export const SEAT_COLOURS = ["red", "green", "yellow", "blue", "purple"] as const
export type SeatColour = (typeof SEAT_COLOURS)[number]

/** Deterministic pick from a room, e.g. which side is white: same on every device. */
export function seededIndex(seed: string, n: number) {
  let h = 2166136261
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619)
  return Math.abs(h >>> 0) % n
}
