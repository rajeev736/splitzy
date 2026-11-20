import type { LiveGameId, LiveResult, RoomOptions } from "./types"

/**
 * Games the server runs (hosted): every move goes through app/api/live/act,
 * and the server keeps what nobody may see — the deck, the hands, the tiles
 * face down. Devices only read:
 *
 *   rooms/{code}/state          the public table (written only by the server)
 *   rooms/{code}/secret/{uid}   your own private part, e.g. your hand (only you can read it)
 *   hosted/{code}               the server's copy of everything (no device can read it)
 *
 * So there's nothing to cheat with: you can't peek at a hand or the deck,
 * and you can't play a card you don't hold or out of turn.
 */
export const HOSTED_GAMES: readonly LiveGameId[] = ["colorclash", "memory"]
export const isHostedGame = (game: LiveGameId) => HOSTED_GAMES.includes(game)

/** What a device asks the server to do. `seq` is the table step it saw (stale taps are refused). */
export type HostedAction = { type: string; seq?: number } & Record<string, unknown>

/** The public table of a hosted game: what every engine's state has in common. */
export interface HostedTable {
  /** Bumped by every change; a device sends the one it saw with its move. */
  seq: number
  phase: string
  /** Whose turn (uid), or "" when nobody's. */
  turn: string
  /** Server ms the current turn started (for the idle clock). */
  turnAt: number
  /** Set once the game is over. */
  result?: LiveResult
}

export interface HostedStart {
  /** Players in seat order (uids). */
  players: string[]
  names: Record<string, string>
  options: RoomOptions
  /** Server randomness (crypto). */
  rand: () => number
  now: number
}

export interface HostedStep<S, P, H> {
  state: S
  /** Each player's private part (missing = nothing private). */
  secrets: Record<string, P>
  /** The server's own, never shown (the deck, the tile layout). */
  hidden: H
}

export interface HostedMove<S, P, H> extends HostedStep<S, P, H> {
  uid: string
  action: HostedAction
  now: number
  /** Players who left for good. */
  gone: string[]
  rand: () => number
}

/**
 * A hosted game's rules (pure; the server runs them — lib/server/hosted).
 * `act` throws an Error with a short reason for anything not allowed. The
 * action `{ type: "tick" }` may come from any player: the engine checks the
 * clock itself (an idle turn passes) and returns the step unchanged otherwise.
 * When the game is over, `state.result` is set (and phase "over").
 */
export interface HostedEngine<S extends HostedTable, P, H> {
  start(input: HostedStart): HostedStep<S, P, H>
  act(input: HostedMove<S, P, H>): HostedStep<S, P, H>
}
