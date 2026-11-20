/**
 * Live games: friends in one room, playing at the same time (Scribble, Ludo,
 * Chess, Checkers, Tic Tac Toe), with voice and stickers. Rooms live in the
 * Realtime Database under `rooms/{code}`:
 *
 *   meta       who / what / status            (any player writes; see rules)
 *   players    one entry per seat             (each player writes their own)
 *   state      the game itself                (shape owned by each game module)
 *   chat       messages, oldest first         (append-only)
 *   reactions  stickers thrown on screen      (append-only)
 *   voice      who has their mic on           (each their own)
 *   signals    WebRTC offers/answers/ICE      (readable only by the addressee)
 *   secret     per-player secrets, e.g. the word being drawn (readable only by that player)
 *
 * There is no server: the "referee" — the first online player by seat — moves
 * the room along (countdown, turn timeouts, game over). Every client computes
 * timers from server time, so they agree to the second.
 */

export type LiveGameId = "scribble" | "ludo" | "chess" | "checkers" | "tictactoe" | "snakes" | "snakes3d" | "sudoku"

export type RoomStatus = "lobby" | "countdown" | "playing" | "ended"

export type RoomOptions = Record<string, number | string | boolean>

export interface LiveResult {
  /** Empty = draw / nobody. Several in team-less games with tied top scores. */
  winnerIds: string[]
  /** Best to worst, when the game ranks everyone (Ludo, Scribble). */
  ranking?: string[]
  scores?: Record<string, number>
  /** "checkmate", "timeout", "resign", "abandoned", "all_home", "rounds_over", … */
  reason?: string
  /** Per player numbers for the result screen, e.g. Ludo { kills, deaths }. */
  stats?: Record<string, Record<string, number>>
}

export interface RoomMeta {
  code: string
  game: LiveGameId
  hostId: string
  hostName: string
  /** Server ms */
  createdAt: number
  minPlayers: number
  maxPlayers: number
  status: RoomStatus
  options: RoomOptions
  /** Countdown target (server ms) once every seat is taken. */
  startsAt?: number
  startedAt?: number
  endedAt?: number
  result?: LiveResult
  /** A rematch was started: everyone is invited to this room. */
  rematchCode?: string
  /** A discount game (Challenge game "live"): the challenge this room decides. */
  challengeId?: string
  /** A private room: only these players may take a seat (a discount game's two, a group round's players). */
  only?: string[]
  /** A game started in a group's game room (services/lounges): its group. Skips the lobby. */
  lounge?: string
}

export interface RoomPlayer {
  uid: string
  name: string
  photo?: string
  /**
   * 0-based; colours / turn order follow it. Taken when joining; in a team
   * room (lib/live/seats) players may move seats in the lobby, and
   * seat === maxPlayers is the bench.
   */
  seat: number
  /** Server ms the current seat was claimed (moved into); absent = since joining. */
  seatAt?: number
  joinedAt: number
  online: boolean
  lastSeen: number
  /** Left for good (forfeit). Their entry stays so the game keeps their seat. */
  left?: boolean
  /** Game profile: character id (components/game-avatar) and frame id, shown instead of the photo. */
  avatar?: string
  frame?: string
  /** Game level (lib/live/levels), shown as a badge. Self-reported: a look, never a reward. */
  level?: number
}

export interface ChatMessage {
  uid: string
  name: string
  text: string
  at: number
  /** chat: normal · system: room notice · correct: "X guessed it" · close: "close!" (Scribble) */
  kind?: "chat" | "system" | "correct" | "close"
}

export interface Reaction {
  uid: string
  name: string
  /** A sticker id from components/live/stickers, or `t:<id>` for a throwable (lib/live/throwables). */
  sticker: string
  at: number
  /** A throwable's target. */
  to?: string
}

export interface VoiceState {
  on: boolean
  muted: boolean
}

/** What every screen of a room subscribes to (the game state is fetched by the game itself). */
export interface RoomCore {
  meta: RoomMeta
  players: Record<string, RoomPlayer>
  voice?: Record<string, VoiceState>
}

/** Everything a game component gets from the room shell. */
export interface LiveGameProps {
  code: string
  meta: RoomMeta
  /** Seat order, including players who left (flagged). */
  players: RoomPlayer[]
  uid: string
  me: RoomPlayer
  /** This device moves the room along (timeouts, turn skips, game over). */
  isReferee: boolean
  /** Server-synced clock, ticking once a second. */
  now: number
  /** Server-synced clock on demand (for finer timers). */
  serverNow: () => number
  /** Ends the game for everyone. Idempotent. */
  endGame: (result: LiveResult) => Promise<void>
}
