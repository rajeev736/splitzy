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
  /** For the small game tiles, when the name is too long for two short lines. */
  shortName?: string
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
      "Each player has 4 tokens. Roll a 6 to bring a token out; a 6 (or a capture, or getting a token home) gives you another roll — three 6s in a row and you lose the turn. Landing on a rival's token sends it back, except on the safe (star) squares. First to get all 4 tokens home wins. With 5 players the game moves to a five-armed board. Power Ludo adds power-ups on the track — freeze, number-lock or push back a rival's piece; jump, shield or double your own roll. Land on one to grab it (the first piece out and the first piece home earn one too), and use it on your turn before you roll — within 2 minutes, or it fizzles out. Your game character brings one power of its own too: use it once per game, it never runs out. Teams 2v2: four players, partners sit opposite and can't cut each other; your team wins once both of you have all four tokens home.",
    emoji: "🎲",
    minPlayers: 2,
    // 2–4 play on the square board; 5 get the pentagon board
    maxPlayers: 5,
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
      {
        // Teams 2v2 makes it a 4-seat room (lib/live/seats); works with either mode
        key: "teams",
        label: "Play",
        choices: [
          { value: "solo", label: "Every player alone" },
          { value: "2v2", label: "Teams 2v2" },
        ],
        default: "solo",
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
  snakes: {
    id: "snakes",
    name: "Snakes & Ladders",
    tagline: "Climb the ladders, dodge the snakes",
    howTo:
      "Roll and move your piece up the board from 1 to 100. Land at the foot of a ladder to climb it; land on a snake's head and slide down to its tail. A 6 rolls again (three 6s lose the turn). You must land on 100 exactly. First to 100 wins — the rest race for 2nd, 3rd…",
    emoji: "🐍",
    minPlayers: 2,
    maxPlayers: 5,
    duration: "~10 min",
    options: [],
    tone: "bg-emerald-500/12",
  },
  snakes3d: {
    id: "snakes3d",
    name: "Snakes & Ladders 3D",
    shortName: "Snakes 3D",
    tagline: "Climb the jungle tower — roll a 1 to open the gate",
    howTo:
      "Everyone starts behind the gate at the foot of a jungle tower; it opens only when you roll a 1. Then climb from 1 to 100: ladders zap you up in a flash of lightning, snakes drop you through a portal to their tail. A 6 rolls again; land on 100 exactly. Swipe up and down to look around the tower.",
    emoji: "🪜",
    minPlayers: 2,
    maxPlayers: 5,
    duration: "~12 min",
    options: [],
    tone: "bg-lime-500/12",
  },
  sudoku: {
    id: "sudoku",
    name: "Sudoku Race",
    tagline: "Same puzzle, everyone at once — fastest wins",
    howTo:
      "Everyone gets the same Sudoku, each on their own board. Fill every row, column and 3×3 box with 1–9. The first to finish is 1st, then 2nd, 3rd… When time runs out, the rest are ranked by how much they filled.",
    emoji: "🔢",
    minPlayers: 1,
    maxPlayers: 5,
    duration: "~15 min",
    options: [
      {
        key: "level",
        label: "Level",
        choices: [
          { value: "easy", label: "Easy" },
          { value: "medium", label: "Medium" },
          { value: "hard", label: "Hard" },
        ],
        default: "medium",
      },
      {
        key: "minutes",
        label: "Time",
        choices: [
          { value: 10, label: "10 min" },
          { value: 20, label: "20 min" },
          { value: 30, label: "30 min" },
        ],
        default: 20,
      },
    ],
    tone: "bg-violet-500/12",
  },
  // Run by the server (lib/live/hosted): the deck and hands stay hidden
  colorclash: {
    id: "colorclash",
    name: "Color Clash",
    tagline: "Match the colour or number — first to empty your hand wins",
    howTo:
      "Everyone gets 7 cards. On your turn play a card that matches the top card's colour, number or symbol — or a Wild. Skip, Reverse and +2 shake things up; Wild +4 makes the next player draw four. Can't play? Draw one. Down to one card? Tap \"One!\" before someone catches you. First to empty their hand wins the round.",
    emoji: "🃏",
    minPlayers: 2,
    maxPlayers: 6,
    duration: "~15 min",
    options: [
      {
        key: "rounds",
        label: "Rounds",
        choices: [
          { value: 1, label: "1 round" },
          { value: 3, label: "Best of 3" },
          { value: 5, label: "Best of 5" },
        ],
        default: 1,
      },
    ],
    tone: "bg-rose-500/12",
  },
  // Run by the server (lib/live/hosted): the tiles stay face down for real
  memory: {
    id: "memory",
    name: "Memory Tiles",
    shortName: "Memory",
    tagline: "Flip two tiles — find the pairs, keep your turn",
    howTo:
      "All tiles start face down. On your turn flip two: if they match, they're yours, you score a point and go again. If not, they flip back and the next player goes. Remember where everything is! Most pairs when the board is cleared wins the round.",
    emoji: "🧠",
    minPlayers: 2,
    maxPlayers: 4,
    duration: "~8 min",
    options: [
      {
        key: "size",
        label: "Board",
        choices: [
          { value: 16, label: "16 tiles" },
          { value: 24, label: "24 tiles" },
          { value: 36, label: "36 tiles" },
        ],
        default: 24,
      },
      {
        key: "rounds",
        label: "Rounds",
        choices: [
          { value: 1, label: "1 round" },
          { value: 3, label: "Best of 3" },
        ],
        default: 1,
      },
    ],
    tone: "bg-sky-500/12",
  },
}

/** Display order on the Games tab. */
export const LIVE_GAME_IDS: LiveGameId[] = [
  "scribble",
  "ludo",
  "colorclash",
  "memory",
  "snakes3d",
  "snakes",
  "sudoku",
  "chess",
  "checkers",
  "tictactoe",
]

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
