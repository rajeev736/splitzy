import type { Challenge } from "@/lib/types"

/**
 * Settle-up games. A challenge is hosted by the person who is owed money; the
 * players are people who owe them. Winners get `discountPercent` off what they
 * owe — but only if they pay within DISCOUNT_WINDOW_MS of the result.
 *
 * Every rule here is mirrored in firestore.rules, which verifies results, so
 * keep the two in sync.
 */

export type GameId = "rps" | "lucky_number"

export const GAMES: Record<GameId, { name: string; tagline: string; emoji: string; multiplayer: boolean }> = {
  rps: {
    name: "Stone Paper Scissors",
    tagline: "Best of 3 against the person you owe",
    emoji: "✊",
    multiplayer: false,
  },
  lucky_number: {
    name: "Lucky Number",
    tagline: "Guess 1–100. Closest to the secret number wins",
    emoji: "🎯",
    multiplayer: true,
  },
}

/** How long a winner's discount lasts after the result. */
export const DISCOUNT_WINDOW_MS = 10 * 60 * 1000
export const DISCOUNT_PRESETS = [10, 20, 30, 50]
export const MAX_GROUP_PLAYERS = 15

/* ── Stone Paper Scissors ─────────────────────────────────────────────── */

export const RPS_MOVES = ["rock", "paper", "scissors"] as const
export type RpsMove = (typeof RPS_MOVES)[number]
export const RPS_ROUNDS = 3
export const RPS_LABEL: Record<RpsMove, { name: string; emoji: string }> = {
  rock: { name: "Stone", emoji: "✊" },
  paper: { name: "Paper", emoji: "✋" },
  scissors: { name: "Scissors", emoji: "✌️" },
}

export const beats = (a: RpsMove, b: RpsMove) =>
  (a === "rock" && b === "scissors") || (a === "paper" && b === "rock") || (a === "scissors" && b === "paper")

export const isRpsMoves = (v: unknown): v is RpsMove[] =>
  Array.isArray(v) && v.length === RPS_ROUNDS && v.every((m) => (RPS_MOVES as readonly string[]).includes(m))

export interface RpsRound {
  host: RpsMove
  player: RpsMove
  outcome: "player" | "host" | "draw"
}

/** Rounds and totals; the player wins with more round wins than the host. */
export function scoreRps(hostMoves: RpsMove[], playerMoves: RpsMove[]) {
  const rounds: RpsRound[] = hostMoves.map((host, i) => {
    const player = playerMoves[i]
    return { host, player, outcome: beats(player, host) ? "player" : beats(host, player) ? "host" : "draw" }
  })
  const playerWins = rounds.filter((r) => r.outcome === "player").length
  const hostWins = rounds.filter((r) => r.outcome === "host").length
  return { rounds, playerWins, hostWins, playerWon: playerWins > hostWins }
}

/* ── Lucky Number ─────────────────────────────────────────────────────── */

export const LUCKY_MIN = 1
export const LUCKY_MAX = 100

export const isLuckyGuess = (v: unknown): v is number =>
  Number.isInteger(v) && (v as number) >= LUCKY_MIN && (v as number) <= LUCKY_MAX

export function randomLuckyNumber() {
  const buf = new Uint32Array(1)
  crypto.getRandomValues(buf)
  return LUCKY_MIN + (buf[0] % (LUCKY_MAX - LUCKY_MIN + 1))
}

/** Everyone who guessed exactly as close as the closest guess wins. */
export function scoreLuckyNumber(secret: number, guesses: Record<string, number>) {
  const entries = Object.entries(guesses)
  if (entries.length === 0) return { winners: [] as string[], winningDistance: 0 }
  const winningDistance = Math.min(...entries.map(([, g]) => Math.abs(g - secret)))
  return {
    winners: entries.filter(([, g]) => Math.abs(g - secret) === winningDistance).map(([uid]) => uid),
    winningDistance,
  }
}

/* ── Results & discounts ──────────────────────────────────────────────── */

export const allPlayed = (c: Challenge) => c.players.every((p) => c.moves?.[p] !== undefined)

/** When a resolved challenge's discount stops applying (ms since epoch). */
export const discountExpiresAt = (c: Challenge) =>
  c.resolvedAt ? new Date(c.resolvedAt).getTime() + DISCOUNT_WINDOW_MS : 0

/** Discount (paise) this player gets off what they owe the host — 0 if they lost or it expired. */
export function activeDiscountPaise(c: Challenge, uid: string, now = Date.now()): number {
  if (c.status !== "DONE" || !c.result?.winners.includes(uid)) return 0
  if (c.redeemed?.[uid]) return 0 // already used
  if (now >= discountExpiresAt(c)) return 0
  const base = c.bases?.[uid] ?? 0
  return Math.floor((base * c.discountPercent) / 100)
}

/** Your game record: money saved as a winner, and given away as a host. */
export function gameStats(challenges: Challenge[], uid: string) {
  const finished = challenges.filter((c) => c.status === "DONE")
  const played = finished.filter((c) => c.players.includes(uid) && c.moves?.[uid] !== undefined)
  const won = played.filter((c) => c.result?.winners.includes(uid))
  const hosted = finished.filter((c) => c.hostId === uid)
  return {
    savedPaise: won.reduce((sum, c) => sum + (c.redeemed?.[uid] ?? 0), 0),
    played: played.length,
    won: won.length,
    winRate: played.length ? Math.round((won.length / played.length) * 100) : 0,
    hosted: hosted.length,
    givenPaise: hosted.reduce((sum, c) => sum + Object.values(c.redeemed ?? {}).reduce((a, b) => a + b, 0), 0),
    /** Wins where the discount was actually used, newest first. */
    savings: won
      .filter((c) => (c.redeemed?.[uid] ?? 0) > 0)
      .map((c) => ({ challenge: c, savedPaise: c.redeemed![uid] })),
  }
}

/** Random secret for the challenge, created on the host's device. */
export function newSecretFor(game: GameId, hostRpsMoves?: RpsMove[]) {
  if (game === "rps") {
    if (!isRpsMoves(hostRpsMoves)) throw new Error("Pick all 3 moves first")
    return { moves: hostRpsMoves }
  }
  return { number: randomLuckyNumber() }
}
