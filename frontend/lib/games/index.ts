import type { Challenge } from "@/lib/types"

/**
 * Games between friends. A challenge is hosted by one person who hides a
 * secret (their moves, a number, coin flips, treasure boxes, or grid cells for
 * the tile-by-tile grid games); the players play against it. A game is either just for fun (`discountPercent` 0) or for
 * a discount: then the players are people who owe the host, and winners get
 * `discountPercent` off what they owe — only if they pay within
 * DISCOUNT_WINDOW_MS of the result.
 *
 * Every rule here is mirrored in firestore.rules, which verifies results, so
 * keep the two in sync.
 */

export type GameId = "rps" | "lucky_number" | "coin_toss" | "treasure" | "minefield" | "gold_rush"

export interface GameInfo {
  name: string
  tagline: string
  emoji: string
  /** How a player wins, as an instruction to them. Every winner of a group game wins, except in Lucky Number. */
  howToWin: { friend: string; group: string }
  /**
   * What the host sets up as the secret: their RPS moves, cells on the grid
   * (bombs / gold), or their pick of flips / boxes / number (which can also be
   * left to chance).
   */
  setup: "moves" | "cells" | "pick"
  /** Grid games can't be played for a discount in groups: players who've dug could tip off the rest. */
  groupDiscount: boolean
}

export const GAMES: Record<GameId, GameInfo> = {
  rps: {
    name: "Stone Paper Scissors",
    tagline: "Best of 3 against the host's secret moves",
    emoji: "✊",
    howToWin: {
      friend: "Win more of the 3 rounds than the host",
      group: "Beat the host in more of the 3 rounds",
    },
    setup: "moves",
    groupDiscount: true,
  },
  coin_toss: {
    name: "Coin Toss",
    tagline: "Call 5 coin flips — get 3 right to win",
    emoji: "🤞",
    howToWin: {
      friend: "Call at least 3 of the 5 flips right",
      group: "Call at least 3 of the 5 flips right",
    },
    setup: "pick",
    groupDiscount: true,
  },
  treasure: {
    name: "Treasure Hunt",
    tagline: "3 of 9 boxes hide treasure — pick one",
    emoji: "🎁",
    howToWin: {
      friend: "Open a box with treasure in it",
      group: "Open a box with treasure in it",
    },
    setup: "pick",
    groupDiscount: true,
  },
  lucky_number: {
    name: "Lucky Number",
    tagline: "Guess the secret number from 1 to 100",
    emoji: "🎯",
    howToWin: {
      friend: "Guess within 10 of the secret number",
      group: "Get closest to the secret number",
    },
    setup: "pick",
    groupDiscount: true,
  },
  minefield: {
    name: "Minefield",
    tagline: "Open every safe tile before 3 bombs go off",
    emoji: "💣",
    howToWin: {
      friend: "Open all 13 safe tiles before the 3rd bomb goes off",
      group: "Open all 13 safe tiles before the 3rd bomb goes off",
    },
    setup: "cells",
    groupDiscount: false,
  },
  gold_rush: {
    name: "Gold Rush",
    tagline: "4 gold coins are buried — find 2 in 5 digs",
    emoji: "⛏️",
    howToWin: {
      friend: "Find 2 of the 4 gold coins within 5 digs",
      group: "Find 2 of the 4 gold coins within 5 digs",
    },
    setup: "cells",
    groupDiscount: false,
  },
}

/** Display order. */
export const GAME_IDS: GameId[] = ["rps", "minefield", "gold_rush", "coin_toss", "treasure", "lucky_number"]

/** How long a winner's discount lasts after the result. */
export const DISCOUNT_WINDOW_MS = 10 * 60 * 1000
export const DISCOUNT_PRESETS = [10, 20, 30, 50]
export const MAX_GROUP_PLAYERS = 15

/** A game played just for fun: no discount, anyone can be challenged. */
export const isForFun = (c: Pick<Challenge, "discountPercent">) => c.discountPercent === 0

/** "20% off" or "Just for fun". */
export const stakeLabel = (c: Pick<Challenge, "discountPercent">) =>
  isForFun(c) ? "Just for fun" : `${c.discountPercent}% off`

/** Uniform random integer in [0, n). */
function randomInt(n: number) {
  const buf = new Uint32Array(1)
  crypto.getRandomValues(buf)
  return buf[0] % n
}

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

/* ── Coin Toss ────────────────────────────────────────────────────────── */

export const COIN_SIDES = ["H", "T"] as const
export type CoinSide = (typeof COIN_SIDES)[number]
export const COIN_FLIPS = 5
export const COIN_TO_WIN = 3
export const COIN_LABEL: Record<CoinSide, string> = { H: "Heads", T: "Tails" }

export const isCoinCalls = (v: unknown): v is CoinSide[] =>
  Array.isArray(v) && v.length === COIN_FLIPS && v.every((s) => (COIN_SIDES as readonly string[]).includes(s))

export const randomFlips = (): CoinSide[] => Array.from({ length: COIN_FLIPS }, () => COIN_SIDES[randomInt(2)])

/** How many flips the player called right; 3 or more wins. */
export function scoreCoin(flips: CoinSide[], calls: CoinSide[]) {
  const matches = flips.filter((f, i) => f === calls[i]).length
  return { matches, won: matches >= COIN_TO_WIN }
}

/* ── Treasure Hunt ────────────────────────────────────────────────────── */

export const TREASURE_BOXES = 9
export const TREASURE_PRIZES = 3

export const isTreasurePick = (v: unknown): v is number =>
  Number.isInteger(v) && (v as number) >= 0 && (v as number) < TREASURE_BOXES

/** The host's treasure: 3 different boxes. */
export const isTreasureBoxes = (v: unknown): v is number[] =>
  Array.isArray(v) && v.length === TREASURE_PRIZES && v.every(isTreasurePick) && new Set(v).size === v.length

/** 3 different boxes out of 9. */
export function randomTreasureBoxes() {
  const boxes = new Set<number>()
  while (boxes.size < TREASURE_PRIZES) boxes.add(randomInt(TREASURE_BOXES))
  return [...boxes].sort((a, b) => a - b)
}

/* ── Grid games: Minefield & Gold Rush ────────────────────────────────── */
// The host hides cells on a 4×4 grid. Each tile lives in its own document
// (challenges/{id}/tiles/{n}) that a player can read only after digging it, so
// tiles open one by one with nothing to peek at. A player's digs are kept in
// `progress[uid]` (append-only), and their final move is that same list.

export const GRID_SIZE = 4
export const GRID_CELLS = GRID_SIZE * GRID_SIZE
export const MINEFIELD_BOMBS = 3
/** The game ends when this many bombs have gone off. */
export const MINEFIELD_STRIKES = 3
export const GOLD_COINS = 4
export const GOLD_DIGS = 5
export const GOLD_TO_WIN = 2

export type GridGameId = "minefield" | "gold_rush"
export const isGridGame = (game: GameId): game is GridGameId => game === "minefield" || game === "gold_rush"

/** How many cells the host hides. */
export const gridCellsToHide = (game: GridGameId) => (game === "minefield" ? MINEFIELD_BOMBS : GOLD_COINS)
/** Most tiles a player may open. */
export const gridMaxDigs = (game: GridGameId) => (game === "minefield" ? GRID_CELLS : GOLD_DIGS)

const isCell = (v: unknown): v is number => Number.isInteger(v) && (v as number) >= 0 && (v as number) < GRID_CELLS

/** The host's hidden cells: the right number of different cells on the grid. */
export const isValidCells = (game: GridGameId, v: unknown): v is number[] =>
  Array.isArray(v) && v.length === gridCellsToHide(game) && v.every(isCell) && new Set(v).size === v.length

/** A player's digs, in order: different cells, no more than the game allows. */
export const isValidDigs = (game: GridGameId, v: unknown): v is number[] =>
  Array.isArray(v) && v.length >= 1 && v.length <= gridMaxDigs(game) && v.every(isCell) && new Set(v).size === v.length

/**
 * Where a grid game stands after these digs. `hits` = bombs or gold found.
 * Minefield: lost at the 3rd bomb, won once every safe tile is open.
 * Gold Rush: won at the 2nd coin, lost when the 5 digs run out.
 */
export function scoreGrid(game: GridGameId, cells: number[], digs: number[]) {
  const hidden = new Set(cells)
  const hits = digs.filter((d) => hidden.has(d)).length
  if (game === "minefield") {
    const safeOpened = digs.length - hits
    const won = hits < MINEFIELD_STRIKES && safeOpened === GRID_CELLS - MINEFIELD_BOMBS
    return { hits, safeOpened, won, over: won || hits >= MINEFIELD_STRIKES }
  }
  const won = hits >= GOLD_TO_WIN
  return { hits, safeOpened: digs.length - hits, won, over: won || digs.length >= GOLD_DIGS }
}

/* ── Lucky Number ─────────────────────────────────────────────────────── */

export const LUCKY_MIN = 1
export const LUCKY_MAX = 100
/** One-on-one, there's no "closest": a guess this close to the secret wins. */
export const LUCKY_FRIEND_RANGE = 10

export const isLuckyGuess = (v: unknown): v is number =>
  Number.isInteger(v) && (v as number) >= LUCKY_MIN && (v as number) <= LUCKY_MAX

export function randomLuckyNumber() {
  return LUCKY_MIN + randomInt(LUCKY_MAX - LUCKY_MIN + 1)
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

/* ── Moves, secrets & results ─────────────────────────────────────────── */

/** RPS moves, coin calls, a box, a guess — or, in grid games, the list of digs. */
export type GameMove = RpsMove[] | CoinSide[] | number[] | number

/** The host's hidden side of the game, stored in challenges/{id}/secret/value. */
export interface GameSecret {
  moves?: RpsMove[]
  number?: number
  flips?: CoinSide[]
  boxes?: number[]
  /** Grid games: where the bombs / gold are. */
  cells?: number[]
}

export function isValidMove(game: GameId, move: unknown): move is GameMove {
  if (game === "rps") return isRpsMoves(move)
  if (game === "coin_toss") return isCoinCalls(move)
  if (game === "treasure") return isTreasurePick(move)
  if (isGridGame(game)) return isValidDigs(game, move)
  return isLuckyGuess(move)
}

/**
 * Secret for a new challenge, created on the host's device from what the host
 * picked. RPS moves and grid cells must be picked; flips, boxes and the lucky
 * number fall back to random when left out (e.g. games added to an expense).
 */
export function newSecretFor(game: GameId, host: GameSecret = {}): GameSecret {
  switch (game) {
    case "rps":
      if (!isRpsMoves(host.moves)) throw new Error("Pick all 3 moves first")
      return { moves: host.moves }
    case "minefield":
    case "gold_rush":
      if (!isValidCells(game, host.cells)) throw new Error(`Place all ${gridCellsToHide(game)} first`)
      return { cells: [...host.cells].sort((a, b) => a - b) }
    case "coin_toss":
      if (host.flips === undefined) return { flips: randomFlips() }
      if (!isCoinCalls(host.flips)) throw new Error("Pick all 5 flips first")
      return { flips: host.flips }
    case "treasure":
      if (host.boxes === undefined) return { boxes: randomTreasureBoxes() }
      if (!isTreasureBoxes(host.boxes)) throw new Error("Pick 3 different boxes first")
      return { boxes: [...host.boxes].sort((a, b) => a - b) }
    case "lucky_number":
      if (host.number === undefined) return { number: randomLuckyNumber() }
      if (!isLuckyGuess(host.number)) throw new Error("Pick a number from 1 to 100")
      return { number: host.number }
  }
}

/** Did this one move beat the secret? (Every game except group Lucky Number scores players independently.) */
function beatsSecret(c: Pick<Challenge, "game">, secret: GameSecret, move: GameMove) {
  switch (c.game) {
    case "rps":
      return scoreRps(secret.moves as RpsMove[], move as RpsMove[]).playerWon
    case "coin_toss":
      return scoreCoin(secret.flips as CoinSide[], move as CoinSide[]).won
    case "treasure":
      return (secret.boxes ?? []).includes(move as number)
    case "lucky_number":
      return Math.abs((move as number) - (secret.number as number)) <= LUCKY_FRIEND_RANGE
    case "minefield":
    case "gold_rush":
      return scoreGrid(c.game, secret.cells ?? [], move as number[]).won
  }
}

/**
 * The result of a game: the winners among those who played, plus the revealed
 * secret. Group Lucky Number is "closest wins"; every other game scores each
 * player against the secret on their own.
 */
export function computeResult(
  c: Pick<Challenge, "kind" | "game" | "players" | "moves">,
  secret: GameSecret
): NonNullable<Challenge["result"]> {
  const played = c.players.filter((p) => c.moves?.[p] !== undefined)

  if (c.game === "lucky_number" && c.kind === "group") {
    const guesses = Object.fromEntries(played.map((p) => [p, c.moves[p] as number]))
    const score = scoreLuckyNumber(secret.number as number, guesses)
    return { winners: score.winners, number: secret.number, winningDistance: score.winningDistance }
  }

  const winners = played.filter((p) => beatsSecret(c, secret, c.moves[p] as GameMove))
  const reveal =
    c.game === "rps"
      ? { hostMoves: secret.moves }
      : c.game === "coin_toss"
        ? { flips: secret.flips }
        : c.game === "treasure"
          ? { boxes: secret.boxes }
          : isGridGame(c.game)
            ? { cells: secret.cells }
            : { number: secret.number }
  return { winners, ...reveal }
}

/** How a player wins this particular game. */
export const howToWin = (c: Pick<Challenge, "game" | "kind">) => GAMES[c.game].howToWin[c.kind]

/* ── Results & discounts ──────────────────────────────────────────────── */

export const allPlayed = (c: Challenge) => c.players.every((p) => c.moves?.[p] !== undefined)

/** When a resolved challenge's discount stops applying (ms since epoch). */
export const discountExpiresAt = (c: Challenge) =>
  c.resolvedAt ? new Date(c.resolvedAt).getTime() + DISCOUNT_WINDOW_MS : 0

/**
 * Discount (paise) this player gets off what they owe the host — 0 if they
 * lost, it expired or it was for fun. A 100%-off win never expires: there's
 * nothing to pay, so it settles whenever the winner's app next sees it.
 */
export function activeDiscountPaise(c: Challenge, uid: string, now = Date.now()): number {
  if (c.status !== "DONE" || !c.result?.winners.includes(uid)) return 0
  if (c.redeemed?.[uid]) return 0 // already used
  if (c.discountPercent !== 100 && now >= discountExpiresAt(c)) return 0
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
