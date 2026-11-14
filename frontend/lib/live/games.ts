import type { LiveGameId, RoomOptions, RoomPlayer } from "./types"

/** One setting the host picks when creating a room. */
export interface LiveOption {
  key: string
  label: string
  choices: { value: number | string; label: string }[]
  default: number | string
}

export interface LiveGameInfo {
  id: LiveGameId
  name: string
  tagline: string
  /** How it's played, one short paragraph for the lobby. */
  howTo: string
  emoji: string
  minPlayers: number
  maxPlayers: number
  /** "~10 min" */
  duration: string
  options: LiveOption[]
  /** Soft background tone for cards. */
  tone: string
}

export const LIVE_GAMES: Record<LiveGameId, LiveGameInfo> = {
  scribble: {
    id: "scribble",
    name: "Scribble",
    tagline: "Draw it, guess it — fastest guess wins",
    howTo:
      "Everyone takes turns drawing a secret word while the rest guess in the chat. The faster you guess, the more points you get, and the artist scores when people get it. Most points after all rounds wins.",
    emoji: "🎨",
    minPlayers: 2,
    maxPlayers: 8,
    duration: "~10 min",
    options: [
      {
        key: "rounds",
        label: "Rounds",
        choices: [2, 3, 4, 5].map((n) => ({ value: n, label: `${n}` })),
        default: 3,
      },
      {
        key: "drawTime",
        label: "Draw time",
        choices: [
          { value: 50, label: "50s" },
          { value: 80, label: "80s" },
          { value: 110, label: "110s" },
        ],
        default: 80,
      },
      {
        key: "pack",
        label: "Words",
        choices: [
          { value: "mix", label: "Everything" },
          { value: "food", label: "Food & chai" },
          { value: "travel", label: "Travel" },
          { value: "desi", label: "Desi life" },
          { value: "money", label: "Money & shopping" },
        ],
        default: "mix",
      },
    ],
    tone: "bg-pink-500/12",
  },
  ludo: {
    id: "ludo",
    name: "Ludo",
    tagline: "Roll a six, race home, send friends back",
    howTo:
      "Each player has 4 tokens. Roll a 6 to bring a token out; a 6 (or a capture, or getting a token home) gives you another roll — three 6s in a row and you lose the turn. Landing on a rival's token sends it back, except on the safe (star) squares. First to get all 4 tokens home wins. Power Ludo adds power-ups on the track — freeze, number-lock or push back a rival's piece; jump, shield or double your own roll. Land on one to grab it (the first piece out and the first piece home earn one too), and use it on your turn before you roll.",
    emoji: "🎲",
    minPlayers: 2,
    maxPlayers: 4,
    duration: "~20 min",
    options: [
      {
        key: "mode",
        label: "Mode",
        choices: [
          { value: "classic", label: "Classic" },
          { value: "powers", label: "Power Ludo" },
        ],
        default: "classic",
      },
    ],
    tone: "bg-red-500/12",
  },
  chess: {
    id: "chess",
    name: "Chess",
    tagline: "The real thing, with a clock",
    howTo:
      "Standard chess: castling, en passant, promotion, check and checkmate — the app only allows legal moves. Run out of time and you lose (if a clock is set). You can offer a draw or resign at any time.",
    emoji: "♟️",
    minPlayers: 2,
    maxPlayers: 2,
    duration: "~15 min",
    options: [
      {
        key: "clock",
        label: "Clock",
        choices: [
          { value: "none", label: "No clock" },
          { value: "3+2", label: "3 min +2s" },
          { value: "5+0", label: "5 min" },
          { value: "10+0", label: "10 min" },
          { value: "15+10", label: "15 min +10s" },
        ],
        default: "10+0",
      },
      {
        key: "colour",
        label: "You play",
        choices: [
          { value: "random", label: "Random" },
          { value: "white", label: "White" },
          { value: "black", label: "Black" },
        ],
        default: "random",
      },
    ],
    tone: "bg-slate-500/12",
  },
  checkers: {
    id: "checkers",
    name: "Checkers",
    tagline: "Jump, capture, crown your kings",
    howTo:
      "Pieces move diagonally forward one square and capture by jumping over a rival. If a capture is available you must take it, and you keep jumping while you can. Reach the far side to become a king, which also moves backwards. Capture everything or leave your rival with no moves to win.",
    emoji: "⚪",
    minPlayers: 2,
    maxPlayers: 2,
    duration: "~10 min",
    options: [
      {
        key: "colour",
        label: "You play",
        choices: [
          { value: "random", label: "Random" },
          { value: "light", label: "Light (moves first)" },
          { value: "dark", label: "Dark" },
        ],
        default: "random",
      },
    ],
    tone: "bg-amber-700/12",
  },
  tictactoe: {
    id: "tictactoe",
    name: "Tic Tac Toe",
    tagline: "Quick rounds, best of five",
    howTo:
      "Three in a row wins a round; the loser starts the next one. First to win the most rounds out of the set takes the match.",
    emoji: "❌",
    minPlayers: 2,
    maxPlayers: 2,
    duration: "~3 min",
    options: [
      {
        key: "bestOf",
        label: "Rounds",
        choices: [
          { value: 1, label: "Just one" },
          { value: 3, label: "Best of 3" },
          { value: 5, label: "Best of 5" },
        ],
        default: 3,
      },
    ],
    tone: "bg-sky-500/12",
  },
}

/** Display order on the Games tab. */
export const LIVE_GAME_IDS: LiveGameId[] = ["scribble", "ludo", "chess", "checkers", "tictactoe"]

export const isLiveGameId = (v: unknown): v is LiveGameId => typeof v === "string" && v in LIVE_GAMES

/** The host's picks, filled in with defaults. */
export function defaultOptions(game: LiveGameId, picked: RoomOptions = {}): RoomOptions {
  const out: RoomOptions = {}
  for (const o of LIVE_GAMES[game].options) {
    const v = picked[o.key]
    out[o.key] = o.choices.some((c) => c.value === v) ? (v as number | string) : o.default
  }
  return out
}

/** Players in seat order. */
export const seatOrder = (players: Record<string, RoomPlayer> | undefined) =>
  Object.values(players ?? {}).sort((a, b) => a.seat - b.seat || a.joinedAt - b.joinedAt)

/** Players still in the game (haven't left for good). */
export const activePlayers = (players: Record<string, RoomPlayer> | undefined) =>
  seatOrder(players).filter((p) => !p.left)
