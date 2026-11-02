/**
 * JoySplit's fun layer: coins, profile frames, gifts, moments between
 * friends, bonds (relationship tags), moods and badges.
 *
 * Prices here are mirrored in firestore.rules (framePrice / giftPrice), which
 * check every coin that moves — keep the two in sync.
 */

/* ── Coins ────────────────────────────────────────────────────────────── */

/** Welcome bonus every account claims once (wallets start at 0). */
export const STARTING_COINS = 10000
/** A premium frame every account gets free, once. */
export const WELCOME_FRAME = "star_1"
/** Coin stakes a host can put on a 1-on-1 game played just for fun. */
export const STAKE_PRESETS = [0, 50, 100, 250, 500] as const
export const MAX_STAKE = 5000

/* ── Frames ───────────────────────────────────────────────────────────── */

export type FrameCategory = "classic" | "games" | "cute" | "love" | "milestone"

export const FRAME_CATEGORIES: { id: FrameCategory; label: string }[] = [
  { id: "classic", label: "Classic" },
  { id: "games", label: "Games" },
  { id: "cute", label: "Cute" },
  { id: "love", label: "Love" },
  { id: "milestone", label: "Milestones" },
]

export const FRAME_IDS = [
  // Classic
  "gold_ring",
  "silver_ring",
  "rose_ring",
  // Games
  "laurel",
  "star_1",
  "flame",
  "star_3",
  "crystal_wings",
  "gold_wings",
  "royal_crown",
  // Cute
  "bunny",
  "kitty",
  "ribbon",
  "blossom",
  "cloud_moon",
  "pumpkin",
  "festive",
  // Love
  "heart_halo",
  "sweethearts",
  "cupid",
  "rose_vine",
  "love_wings",
  // More: games
  "silver_wings",
  "gem_wings",
  "inferno",
  // More: cute
  "fox",
  "headphones",
  "rainbow",
  "horns",
  "unicorn",
  "butterfly",
  "witch",
  // More: love
  "neon_heart",
  "sweet_candy",
  "love_letter",
  "party",
  // Milestones (earned, never sold)
  "victor",
  "conqueror",
  "legend",
  "regular",
  "veteran",
  "immortal",
  "coin_hunter",
  "tycoon",
] as const

export type FrameId = (typeof FRAME_IDS)[number]

export interface FrameInfo {
  name: string
  category: FrameCategory
  /** 0 = free for everyone (milestone frames are never sold). */
  price: number
  /** Milestone frames: what unlocks it. */
  milestone?: { stat: MilestoneStat; goal: number }
}

/** Lifetime numbers milestones are measured on (kept on the wallet, checked by the rules). */
export type MilestoneStat = "wins" | "played" | "coinsWon"

export const MILESTONE_LABEL: Record<MilestoneStat, (goal: number) => string> = {
  wins: (n) => `Win ${n.toLocaleString("en-IN")} games`,
  played: (n) => `Play ${n.toLocaleString("en-IN")} games`,
  coinsWon: (n) => `Win ${n.toLocaleString("en-IN")} coins in games`,
}

export const FRAMES: Record<FrameId, FrameInfo> = {
  gold_ring: { name: "Gold Ring", category: "classic", price: 0 },
  silver_ring: { name: "Silver Ring", category: "classic", price: 0 },
  rose_ring: { name: "Rose Gold", category: "classic", price: 0 },

  laurel: { name: "Laurel", category: "games", price: 300 },
  star_1: { name: "Rising Star", category: "games", price: 400 },
  flame: { name: "Blaze", category: "games", price: 700 },
  star_3: { name: "Superstar", category: "games", price: 800 },
  crystal_wings: { name: "Crystal Wings", category: "games", price: 900 },
  gold_wings: { name: "Champion Wings", category: "games", price: 1000 },
  royal_crown: { name: "Royal Crown", category: "games", price: 1200 },

  bunny: { name: "Bunny", category: "cute", price: 0 },
  kitty: { name: "Kitty", category: "cute", price: 300 },
  ribbon: { name: "Ribbon", category: "cute", price: 350 },
  blossom: { name: "Blossom", category: "cute", price: 400 },
  cloud_moon: { name: "Dreamy", category: "cute", price: 500 },
  pumpkin: { name: "Spooky", category: "cute", price: 500 },
  festive: { name: "Festive", category: "cute", price: 600 },

  heart_halo: { name: "Heart Halo", category: "love", price: 0 },
  sweethearts: { name: "Sweethearts", category: "love", price: 400 },
  cupid: { name: "Cupid", category: "love", price: 500 },
  rose_vine: { name: "Rose Vine", category: "love", price: 700 },
  love_wings: { name: "Love Wings", category: "love", price: 900 },

  silver_wings: { name: "Silver Wings", category: "games", price: 450 },
  gem_wings: { name: "Amethyst Wings", category: "games", price: 650 },
  inferno: { name: "Inferno Crest", category: "games", price: 1100 },

  fox: { name: "Fox", category: "cute", price: 400 },
  headphones: { name: "Bunny Beats", category: "cute", price: 450 },
  rainbow: { name: "Rainbow Sky", category: "cute", price: 500 },
  horns: { name: "Little Devil", category: "cute", price: 550 },
  unicorn: { name: "Unicorn", category: "cute", price: 600 },
  butterfly: { name: "Butterfly", category: "cute", price: 650 },
  witch: { name: "Witch", category: "cute", price: 700 },

  neon_heart: { name: "Neon Heart", category: "love", price: 350 },
  sweet_candy: { name: "Sweet Candy", category: "love", price: 450 },
  love_letter: { name: "Love Letter", category: "love", price: 550 },
  party: { name: "Party Time", category: "love", price: 600 },

  victor: { name: "Victor", category: "milestone", price: 0, milestone: { stat: "wins", goal: 10 } },
  conqueror: { name: "Conqueror", category: "milestone", price: 0, milestone: { stat: "wins", goal: 50 } },
  legend: { name: "Legend", category: "milestone", price: 0, milestone: { stat: "wins", goal: 100 } },
  regular: { name: "Regular", category: "milestone", price: 0, milestone: { stat: "played", goal: 50 } },
  veteran: { name: "Veteran", category: "milestone", price: 0, milestone: { stat: "played", goal: 200 } },
  immortal: { name: "Immortal", category: "milestone", price: 0, milestone: { stat: "played", goal: 500 } },
  coin_hunter: { name: "Coin Hunter", category: "milestone", price: 0, milestone: { stat: "coinsWon", goal: 1000 } },
  tycoon: { name: "Tycoon", category: "milestone", price: 0, milestone: { stat: "coinsWon", goal: 10000 } },
}

export const isFrameId = (v: unknown): v is FrameId => typeof v === "string" && v in FRAMES
export const isMilestoneFrame = (id: FrameId) => !!FRAMES[id].milestone
export const isFreeFrame = (id: FrameId) => FRAMES[id].price === 0 && !isMilestoneFrame(id)

/* ── Gifts ────────────────────────────────────────────────────────────── */

/** Cheapest first. */
export const GIFT_IDS = [
  "chai",
  "rose",
  "sunflower",
  "coffee",
  "kiss",
  "icecream",
  "balloon",
  "chocolate",
  "momos",
  "pizza",
  "cake",
  "teddy",
  "bouquet",
  "diamond",
] as const
export type GiftId = (typeof GIFT_IDS)[number]

export const GIFTS: Record<GiftId, { name: string; price: number }> = {
  chai: { name: "Chai", price: 40 },
  rose: { name: "Rose", price: 50 },
  sunflower: { name: "Sunflower", price: 70 },
  coffee: { name: "Coffee", price: 80 },
  kiss: { name: "Kiss", price: 90 },
  icecream: { name: "Ice cream", price: 100 },
  balloon: { name: "Heart balloon", price: 120 },
  chocolate: { name: "Chocolates", price: 120 },
  momos: { name: "Momos", price: 150 },
  pizza: { name: "Pizza", price: 180 },
  cake: { name: "Cake", price: 250 },
  teddy: { name: "Teddy", price: 400 },
  bouquet: { name: "Bouquet", price: 600 },
  diamond: { name: "Diamond ring", price: 1000 },
}

export const isGiftId = (v: unknown): v is GiftId => typeof v === "string" && v in GIFTS

/* ── Bonds (relationship tags, both people agree) ─────────────────────── */

export const BOND_IDS = ["buddy", "bestie", "bromance", "siblings", "love"] as const
export type BondId = (typeof BOND_IDS)[number]

export const BONDS: Record<BondId, { name: string; pair: string; blurb: string }> = {
  buddy: { name: "Buddy", pair: "Buddies", blurb: "Always up for a plan" },
  bestie: { name: "Bestie", pair: "Besties", blurb: "Your favourite person to split with" },
  bromance: { name: "Bromance", pair: "Bromance", blurb: "Brothers from another mother" },
  siblings: { name: "Siblings", pair: "Siblings", blurb: "Family, but on JoySplit" },
  love: { name: "Love", pair: "In love", blurb: "Unlocks hugs, kisses and miss-yous" },
}

export const isBondId = (v: unknown): v is BondId => typeof v === "string" && v in BONDS

/* ── Moments (things friends send each other) ─────────────────────────── */

/** Only between two people whose bond is "love". */
export const LOVE_NUDGES = ["hug", "kiss", "miss"] as const
export type LoveNudge = (typeof LOVE_NUDGES)[number]

export const NUDGE_LABEL: Record<LoveNudge, { name: string; verb: string }> = {
  hug: { name: "Hug", verb: "sent you a hug" },
  kiss: { name: "Kiss", verb: "sent you a kiss" },
  miss: { name: "Miss you", verb: "misses you" },
}

export type MomentType = LoveNudge | "gift" | "wish" | "plan"

/** Plans one friend asks another for ("let's get momos"). */
export const PLAN_KINDS = ["momos", "movie", "coffee", "dinner", "trip", "other"] as const
export type PlanKind = (typeof PLAN_KINDS)[number]

export const PLAN_LABEL: Record<PlanKind, { name: string; suggestion: string }> = {
  momos: { name: "Momos", suggestion: "Let's go get momos" },
  movie: { name: "Movie", suggestion: "Movie this weekend?" },
  coffee: { name: "Coffee", suggestion: "Coffee and a long chat?" },
  dinner: { name: "Dinner", suggestion: "Dinner date tonight?" },
  trip: { name: "Trip", suggestion: "Let's plan a trip" },
  other: { name: "Something else", suggestion: "" },
}

export const PLAN_TEXT_MAX = 120
export const GIFT_NOTE_MAX = 80

/* ── Moods ────────────────────────────────────────────────────────────── */

export const MOOD_IDS = ["happy", "chill", "busy", "hungry", "sleepy", "sad", "party", "focused"] as const
export type MoodId = (typeof MOOD_IDS)[number]

export const MOODS: Record<MoodId, { name: string }> = {
  happy: { name: "Happy" },
  chill: { name: "Chilling" },
  busy: { name: "Busy" },
  hungry: { name: "Hungry" },
  sleepy: { name: "Sleepy" },
  sad: { name: "Low" },
  party: { name: "Party mode" },
  focused: { name: "Focused" },
}

export const isMoodId = (v: unknown): v is MoodId => typeof v === "string" && v in MOODS

/* ── Badges ───────────────────────────────────────────────────────────── */

export const BADGE_IDS = ["earlybird", "swift", "champ", "bigheart", "lovebird"] as const
export type BadgeId = (typeof BADGE_IDS)[number]
export type BadgeTier = 1 | 2 | 3

export const BADGES: Record<BadgeId, { name: string; how: string; detail: string; tiers: [number, number, number] }> = {
  earlybird: {
    name: "Early Bird",
    how: "One of the first 1,000 on JoySplit",
    detail: "For the first 1,000 people to join JoySplit — claimed once, right after the welcome gifts. Your member number stays with it.",
    tiers: [1, 1, 1],
  },
  swift: {
    name: "Swift Payer",
    how: "Paid a split within 5 minutes",
    detail: "Pay your share and tap “I paid” within 5 minutes of someone adding the split. Each split paid that fast counts once.",
    tiers: [1, 5, 20],
  },
  champ: {
    name: "Game Champ",
    how: "Won games against friends",
    detail: "Win a game — beat the host as a player, or as the host when your friend loses a 1-on-1. Draws don't count.",
    tiers: [1, 10, 25],
  },
  bigheart: {
    name: "Big Heart",
    how: "Sent gifts to friends",
    detail: "Send a gift to a friend from their profile. Every gift counts.",
    tiers: [1, 10, 25],
  },
  lovebird: {
    name: "Lovebird",
    how: "In a love bond on JoySplit",
    detail: "Have a Love tag with someone — one of you asks from their profile, the other accepts.",
    tiers: [1, 1, 1],
  },
}

/** Which tier a count reaches (0 = not earned yet). */
export function badgeTier(badge: BadgeId, count: number): 0 | BadgeTier {
  const [bronze, silver, gold] = BADGES[badge].tiers
  if (badge === "lovebird" || badge === "earlybird") return count > 0 ? 3 : 0
  return count >= gold ? 3 : count >= silver ? 2 : count >= bronze ? 1 : 0
}

/** Badges with a single level (no bronze / silver / gold). */
export const isSingleBadge = (badge: BadgeId) => badge === "lovebird" || badge === "earlybird"

/** Early Bird goes to this many people, in the order they claim it. */
export const EARLY_BIRD_LIMIT = 1000

/** How long after a split is added a payment still earns Swift Payer. */
export const SWIFT_WINDOW_MS = 5 * 60 * 1000
