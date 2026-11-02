import type { Challenge } from "@/lib/types"

/**
 * Games between friends. A challenge is hosted by one person who hides a
 * secret (their moves, a number, coin flips, treasure boxes, grid cells for
 * the tile-by-tile grid games, a keeper's dives, a run of cards); the players
 * play against it. A game is either just for fun (`discountPercent` 0) or for
 * a discount: then the players are people who owe the host, and winners get
 * `discountPercent` off what they owe — only if they pay within
 * DISCOUNT_WINDOW_MS of the result.
 *
 * Every rule here is mirrored in firestore.rules, which verifies results, so
 * keep the two in sync.
 */

export type GameId =
  | "rps"
  | "lucky_number"
  | "coin_toss"
  | "treasure"
  | "minefield"
  | "gold_rush"
  | "penalty"
  | "hilo"
  | "number_hunt"

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
  /**
   * Games that reveal step by step in groups too (grid games, Higher or Lower,
   * Number Hunt) can't be played for a discount in groups: players who've
   * already played could tip off the rest.
   */
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
  penalty: {
    name: "Penalty Shootout",
    tagline: "5 penalties against the host's keeper — score 3 to win",
    emoji: "⚽",
    howToWin: {
      friend: "Score at least 3 of your 5 penalties",
      group: "Score at least 3 of your 5 penalties",
    },
    setup: "pick",
    // In groups the keeper's dives only show at the end, like Stone Paper Scissors
    groupDiscount: true,
  },
  hilo: {
    name: "Higher or Lower",
    tagline: "Call the next 5 cards higher or lower — get 3 right",
    emoji: "🃏",
    howToWin: {
      friend: "Call at least 3 of the 5 cards right",
      group: "Call at least 3 of the 5 cards right",
    },
    setup: "pick",
    groupDiscount: false,
  },
  number_hunt: {
    name: "Number Hunt",
    tagline: "Find the secret number from 1 to 60 in 5 guesses",
    emoji: "🔎",
    howToWin: {
      friend: "Find the secret number within 5 guesses",
      group: "Find the secret number within 5 guesses",
    },
    setup: "pick",
    groupDiscount: false,
  },
}

/** Display order. */
export const GAME_IDS: GameId[] = [
  "rps",
  "penalty",
  "minefield",
  "gold_rush",
  "hilo",
  "number_hunt",
  "coin_toss",
  "treasure",
  "lucky_number",
]

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
/**
 * A player's move in a round: a real move, or "none" when their round timer
 * ran out — which always loses that round. Hosts always pick real moves.
 */
export const RPS_TIMEOUT = "none"
export type RpsPlay = RpsMove | typeof RPS_TIMEOUT
export const RPS_ROUNDS = 3
/** Seconds a player has to pick each round. */
export const RPS_ROUND_SECONDS = 10
export const RPS_LABEL: Record<RpsPlay, { name: string; emoji: string }> = {
  rock: { name: "Stone", emoji: "✊" },
  paper: { name: "Paper", emoji: "✋" },
  scissors: { name: "Scissors", emoji: "✌️" },
  none: { name: "Time's up", emoji: "⏱️" },
}

/** Does `a` win against `b`? Running out of time loses to any move. */
export const beats = (a: RpsPlay, b: RpsPlay) =>
  a !== RPS_TIMEOUT &&
  (b === RPS_TIMEOUT ||
    (a === "rock" && b === "scissors") ||
    (a === "paper" && b === "rock") ||
    (a === "scissors" && b === "paper"))

/** The host's 3 secret moves (never a timeout). */
export const isRpsMoves = (v: unknown): v is RpsMove[] =>
  Array.isArray(v) && v.length === RPS_ROUNDS && v.every((m) => (RPS_MOVES as readonly string[]).includes(m))

/** A player's 3 moves: real moves, or timeouts for rounds they didn't pick in time. */
export const isRpsPlays = (v: unknown): v is RpsPlay[] =>
  Array.isArray(v) &&
  v.length === RPS_ROUNDS &&
  v.every((m) => m === RPS_TIMEOUT || (RPS_MOVES as readonly string[]).includes(m))

export interface RpsRound {
  host: RpsMove
  player: RpsPlay
  outcome: "player" | "host" | "draw"
}

/** Rounds and totals; the player wins with more round wins than the host. */
export function scoreRps(hostMoves: RpsMove[], playerMoves: RpsPlay[]) {
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

/* ── Penalty Shootout ─────────────────────────────────────────────────── */
// The host picks where their keeper dives for each of 5 kicks. Directions are
// as the shooter sees the goal: a shot to the left is saved by a dive to the
// left, and goes in otherwise.

export const PENALTY_DIRS = ["L", "C", "R"] as const
export type PenaltyDir = (typeof PENALTY_DIRS)[number]
export const PENALTY_KICKS = 5
export const PENALTY_TO_WIN = 3
export const PENALTY_LABEL: Record<PenaltyDir, string> = { L: "Left", C: "Centre", R: "Right" }

const isPenaltyDir = (v: unknown): v is PenaltyDir => (PENALTY_DIRS as readonly unknown[]).includes(v)

/** 5 directions: the keeper's dives, or the player's shots. */
export const isPenaltyDirs = (v: unknown): v is PenaltyDir[] =>
  Array.isArray(v) && v.length === PENALTY_KICKS && v.every(isPenaltyDir)

export const randomDives = (): PenaltyDir[] =>
  Array.from({ length: PENALTY_KICKS }, () => PENALTY_DIRS[randomInt(PENALTY_DIRS.length)])

/** A goal is a shot the keeper didn't dive towards. */
export const isGoal = (shot: PenaltyDir, dive: PenaltyDir) => shot !== dive

/** The kicks taken so far (there may be fewer than 5 shots); 3 goals or more wins. */
export function scorePenalty(dives: PenaltyDir[], shots: PenaltyDir[]) {
  const kicks = shots.map((shot, i) => ({ shot, dive: dives[i], goal: isGoal(shot, dives[i]) }))
  const goals = kicks.filter((k) => k.goal).length
  return { kicks, goals, saves: kicks.length - goals, won: goals >= PENALTY_TO_WIN }
}

/* ── Higher or Lower ──────────────────────────────────────────────────── */
// The host deals 6 cards (2–14: J=11, Q=12, K=13, A=14), never the same value
// twice in a row. Card 0 is face up from the start; the player calls whether
// each next card is higher or lower, and each call turns the next card over.

export const HILO_CARDS = 6
export const HILO_GUESSES = HILO_CARDS - 1
export const HILO_TO_WIN = 3
export const CARD_MIN = 2
export const CARD_MAX = 14
export const HILO_CALLS = ["H", "L"] as const
export type HiloCall = (typeof HILO_CALLS)[number]
export const HILO_LABEL: Record<HiloCall, string> = { H: "Higher", L: "Lower" }

const FACE_RANKS: Record<number, string> = { 11: "J", 12: "Q", 13: "K", 14: "A" }
/** "2"…"10", "J", "Q", "K", "A". */
export const cardRank = (value: number) => FACE_RANKS[value] ?? String(value)

export const isCardValue = (v: unknown): v is number =>
  Number.isInteger(v) && (v as number) >= CARD_MIN && (v as number) <= CARD_MAX

/** The host's 6 cards: real values, never the same twice in a row (so every call is right or wrong). */
export const isHiloCards = (v: unknown): v is number[] =>
  Array.isArray(v) && v.length === HILO_CARDS && v.every(isCardValue) && v.every((c, i) => i === 0 || c !== v[i - 1])

export const isHiloCalls = (v: unknown): v is HiloCall[] =>
  Array.isArray(v) && v.length === HILO_GUESSES && v.every((c) => (HILO_CALLS as readonly unknown[]).includes(c))

export function randomHiloCards() {
  const cards: number[] = []
  while (cards.length < HILO_CARDS) {
    const card = CARD_MIN + randomInt(CARD_MAX - CARD_MIN + 1)
    if (card !== cards[cards.length - 1]) cards.push(card)
  }
  return cards
}

/** Was `call` right going from card `from` to card `to`? Mirrors `hiloRight` in firestore.rules. */
export const hiloCallRight = (call: HiloCall, from: number, to: number) => (call === "H") === to > from

/** The calls made so far (there may be fewer than 5) against the cards; 3 right or more wins. */
export function scoreHilo(cards: number[], calls: HiloCall[]) {
  const rounds = calls.map((call, i) => ({
    from: cards[i],
    to: cards[i + 1],
    call,
    right: hiloCallRight(call, cards[i], cards[i + 1]),
  }))
  const right = rounds.filter((r) => r.right).length
  return { rounds, right, won: right >= HILO_TO_WIN }
}

/* ── Number Hunt ──────────────────────────────────────────────────────── */
// The host hides a number from 1 to 60. Like the grid games, each number has
// its own doc (challenges/{id}/tiles/{n}) with the hint for guessing it —
// "higher", "lower" or "found" — that a player can read only once n is in their
// append-only `progress` list. Their final move is that same list.

export const HUNT_MIN = 1
export const HUNT_MAX = 60
export const HUNT_GUESSES = 5
export type HuntHint = "higher" | "lower" | "found"

export const isHuntNumber = (v: unknown): v is number =>
  Number.isInteger(v) && (v as number) >= HUNT_MIN && (v as number) <= HUNT_MAX

/** A player's guesses, in order: different numbers, no more than 5. */
export const isHuntGuesses = (v: unknown): v is number[] =>
  Array.isArray(v) &&
  v.length >= 1 &&
  v.length <= HUNT_GUESSES &&
  v.every(isHuntNumber) &&
  new Set(v).size === v.length

export const randomHuntNumber = () => HUNT_MIN + randomInt(HUNT_MAX - HUNT_MIN + 1)

/** The hint for guessing `guess` when the secret is `secret`. Mirrors `huntHint` in firestore.rules. */
export const huntHint = (secret: number, guess: number): HuntHint =>
  secret > guess ? "higher" : secret < guess ? "lower" : "found"

/** Found within 5 guesses (a win), or out of guesses. */
export function scoreHunt(secret: number, guesses: number[]) {
  const foundAt = guesses.indexOf(secret)
  const won = foundAt !== -1 && guesses.length <= HUNT_GUESSES
  return { won, foundAt, over: won || guesses.length >= HUNT_GUESSES }
}

/** What's still possible after these hints: above every "higher" guess, below every "lower" one. */
export function huntRange(hints: { guess: number; hint: HuntHint }[]) {
  let low = HUNT_MIN
  let high = HUNT_MAX
  for (const { guess, hint } of hints) {
    if (hint === "found") return { low: guess, high: guess }
    if (hint === "higher") low = Math.max(low, guess + 1)
    else high = Math.min(high, guess - 1)
  }
  return { low, high }
}

/* ── Step-by-step reveals ─────────────────────────────────────────────── */
// Round games keep each player's picks in `roundPlays[uid]` (append-only, one
// round at a time). Where the host's side of each round shows as it's played,
// it sits in hostRounds/{n}, readable once the player has played round n — in
// Higher or Lower, card n+1 after call n, and card 0 from the start.

export type RoundGameId = "rps" | "penalty" | "hilo"
export const isRoundGame = (game: GameId): game is RoundGameId =>
  game === "rps" || game === "penalty" || game === "hilo"

/**
 * Games with a doc per round, so each round's result shows as it's played.
 * Stone Paper Scissors and Penalty Shootout only one-on-one: in a group an
 * early player could tip off the rest, so there the result comes at the end.
 * Higher or Lower always: calling cards blind isn't the game, so in groups it's
 * just for fun (`groupDiscount: false`).
 */
export const hasHostRounds = (c: Pick<Challenge, "game" | "kind">) =>
  c.game === "hilo" || ((c.game === "rps" || c.game === "penalty") && c.kind === "friend")

/** The hostRounds docs written with a new game, as [round, doc] pairs. */
export function hostRoundDocs(
  c: Pick<Challenge, "game" | "kind">,
  secret: GameSecret
): [number, Record<string, unknown>][] {
  if (!hasHostRounds(c)) return []
  if (c.game === "rps") return (secret.moves ?? []).map((move, n) => [n, { move }])
  if (c.game === "penalty") return (secret.dives ?? []).map((move, n) => [n, { move }])
  return (secret.cards ?? []).map((card, n) => [n, { card }])
}

/** Games with a doc per tile in tiles/{n}: grid cells, or each number in Number Hunt. */
export type TileGameId = GridGameId | "number_hunt"
export const isTileGame = (game: GameId): game is TileGameId => isGridGame(game) || game === "number_hunt"

/** The tile ids a tile game has. */
export const tileIds = (game: TileGameId) =>
  game === "number_hunt"
    ? Array.from({ length: HUNT_MAX - HUNT_MIN + 1 }, (_, i) => HUNT_MIN + i)
    : Array.from({ length: GRID_CELLS }, (_, n) => n)

/** The tiles docs written with a new game, as [tile, doc] pairs. */
export function tileDocs(game: GameId, secret: GameSecret): [number, Record<string, unknown>][] {
  if (!isTileGame(game)) return []
  if (game === "number_hunt") return tileIds(game).map((n) => [n, { hint: huntHint(secret.number as number, n) }])
  return tileIds(game).map((n) => [n, { hit: (secret.cells ?? []).includes(n) }])
}

/* ── Moves, secrets & results ─────────────────────────────────────────── */

/**
 * RPS moves, coin calls, a box, a guess, penalty shots, card calls — or, in
 * tile games, the list of digs / guesses.
 */
export type GameMove = RpsPlay[] | CoinSide[] | PenaltyDir[] | HiloCall[] | number[] | number

/** The host's hidden side of the game, stored in challenges/{id}/secret/value. */
export interface GameSecret {
  moves?: RpsMove[]
  /** Lucky Number, or the number to find in Number Hunt. */
  number?: number
  flips?: CoinSide[]
  boxes?: number[]
  /** Grid games: where the bombs / gold are. */
  cells?: number[]
  /** Penalty Shootout: where the keeper dives for each kick. */
  dives?: PenaltyDir[]
  /** Higher or Lower: the 6 cards, in order. */
  cards?: number[]
}

export function isValidMove(game: GameId, move: unknown): move is GameMove {
  if (game === "rps") return isRpsPlays(move)
  if (game === "coin_toss") return isCoinCalls(move)
  if (game === "treasure") return isTreasurePick(move)
  if (isGridGame(game)) return isValidDigs(game, move)
  if (game === "penalty") return isPenaltyDirs(move)
  if (game === "hilo") return isHiloCalls(move)
  if (game === "number_hunt") return isHuntGuesses(move)
  return isLuckyGuess(move)
}

/**
 * Secret for a new challenge, created on the host's device from what the host
 * picked. RPS moves and grid cells must be picked; flips, boxes, numbers,
 * dives and cards fall back to random when left out (e.g. games added to an
 * expense).
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
    case "penalty":
      if (host.dives === undefined) return { dives: randomDives() }
      if (!isPenaltyDirs(host.dives)) throw new Error("Pick all 5 dives first")
      return { dives: host.dives }
    case "hilo":
      if (host.cards === undefined) return { cards: randomHiloCards() }
      if (!isHiloCards(host.cards)) throw new Error("Pick 6 cards, never the same one twice in a row")
      return { cards: host.cards }
    case "number_hunt":
      if (host.number === undefined) return { number: randomHuntNumber() }
      if (!isHuntNumber(host.number)) throw new Error("Pick a number from 1 to 60")
      return { number: host.number }
  }
}

/** Did this one move beat the secret? (Every game except group Lucky Number scores players independently.) */
function beatsSecret(c: Pick<Challenge, "game">, secret: GameSecret, move: GameMove) {
  switch (c.game) {
    case "rps":
      return scoreRps(secret.moves as RpsMove[], move as RpsPlay[]).playerWon
    case "coin_toss":
      return scoreCoin(secret.flips as CoinSide[], move as CoinSide[]).won
    case "treasure":
      return (secret.boxes ?? []).includes(move as number)
    case "lucky_number":
      return Math.abs((move as number) - (secret.number as number)) <= LUCKY_FRIEND_RANGE
    case "minefield":
    case "gold_rush":
      return scoreGrid(c.game, secret.cells ?? [], move as number[]).won
    case "penalty":
      return scorePenalty(secret.dives as PenaltyDir[], move as PenaltyDir[]).won
    case "hilo":
      return scoreHilo(secret.cards as number[], move as HiloCall[]).won
    case "number_hunt":
      return scoreHunt(secret.number as number, move as number[]).won
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
            : c.game === "penalty"
              ? { dives: secret.dives }
              : c.game === "hilo"
                ? { cards: secret.cards }
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
