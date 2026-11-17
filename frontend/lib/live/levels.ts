import type { FrameId } from "@/lib/fun/catalog"
import type { Wallet } from "@/lib/types"
import type { Achievement } from "./achievements"

/**
 * Game levels. XP isn't stored: it comes from the wallet's live counters
 * (each live game counted once, every step checked by firestore.rules), so a
 * level can't be faked any more than a win can.
 *
 *   XP = games played × 10 + games won × 30   (a win is worth 40, any other game 10)
 *
 * Level n needs `levelXp(n)`: each level takes 30 XP more than the one before
 * (40, 70, 100, …), so the first few come in a game or two and the later ones
 * take a few dozen.
 *
 * Some levels give rewards: a frame and/or coins (LEVEL_REWARDS) and the game
 * characters whose `earn.level` names them (components/game-avatar). A level
 * works like an achievement with the id `lv<n>` (achievementById), so its
 * rewards are claimed the same way (`earn:lv<n>:<item>`); coins come once
 * each, listed in the wallet's `levelCoins`.
 *
 * Mirrored in firestore.rules: `levelFrame`, `levelBonus`, and the XP and
 * threshold formulas in `levelRewardOk`.
 */

export const XP_PLAY = 10
export const XP_WIN = 30
export const MAX_LEVEL = 30

/** Total XP that level `n` needs (level 1 = 0). */
export const levelXp = (n: number) => 40 * (n - 1) + 15 * (n - 1) * (n - 2)

type Counters = Pick<Wallet, "livePlayed" | "liveWins"> | null | undefined

/** Your XP, from the live counters. */
export const liveXp = (wallet: Counters) => (wallet?.livePlayed ?? 0) * XP_PLAY + (wallet?.liveWins ?? 0) * XP_WIN

/** The level `xp` reaches (1 to MAX_LEVEL). */
export function levelOf(xp: number): number {
  let n = 1
  while (n < MAX_LEVEL && xp >= levelXp(n + 1)) n++
  return n
}

/** A level name, for the profile: Rookie up to Legend. */
const TITLES: { from: number; title: string }[] = [
  { from: 30, title: "Legend" },
  { from: 25, title: "Master" },
  { from: 20, title: "Elite" },
  { from: 15, title: "Ace" },
  { from: 10, title: "Pro" },
  { from: 5, title: "Challenger" },
  { from: 1, title: "Rookie" },
]
export const levelTitle = (n: number) => TITLES.find((t) => n >= t.from)!.title

/** Where you stand: the level, its title and the XP into it (`need` = 0 at the top). */
export function levelInfo(wallet: Counters) {
  const xp = liveXp(wallet)
  const level = levelOf(xp)
  const max = level >= MAX_LEVEL
  const into = xp - levelXp(level)
  const need = max ? 0 : levelXp(level + 1) - levelXp(level)
  return { xp, level, title: levelTitle(level), into, need, max, progress: max ? 1 : into / need }
}

/** What a live game is worth. */
export const xpFor = (won: boolean) => XP_PLAY + (won ? XP_WIN : 0)

export interface LevelReward {
  level: number
  /** A frame (lib/fun/catalog): sold ones are free here, they're a level's prize. */
  frame?: FrameId
  /** Coins, given once. */
  coins?: number
}

/** Frames and coins by level (characters name their level in the registry). Mirrors `levelFrame` / `levelBonus` in the rules. */
export const LEVEL_REWARDS: LevelReward[] = [
  { level: 2, coins: 100 },
  { level: 3, frame: "silver_wings" },
  { level: 4, coins: 150 },
  { level: 5, frame: "star_3", coins: 250 },
  { level: 8, coins: 300 },
  { level: 10, frame: "deep_blue", coins: 500 },
  { level: 14, coins: 600 },
  { level: 15, frame: "gold_wings" },
  { level: 18, coins: 800 },
  { level: 20, frame: "thunder", coins: 1000 },
  { level: 24, coins: 1200 },
  { level: 25, frame: "frost_wings" },
  { level: 27, coins: 1500 },
  { level: 28, frame: "cosmic_cat" },
  { level: 30, coins: 2000 },
]

/** A level's id as an achievement (and in the claim, `earn:lv7:…`). */
export const levelKey = (n: number) => `lv${n}`

const LEVELS = new Map<string, Achievement>()

/** Level `id` (`lv<n>`) as an achievement: reached at level n, giving its frame / coins. */
export function levelAchievement(id: string): Achievement | undefined {
  const m = /^lv(\d{1,2})$/.exec(id)
  const n = m ? Number(m[1]) : 0
  if (n < 2 || n > MAX_LEVEL) return undefined
  let a = LEVELS.get(id)
  if (!a) {
    const r = LEVEL_REWARDS.find((x) => x.level === n)
    a = { id, title: `Level ${n}!`, how: `Reach level ${n}`, stat: "level", goal: n, frame: r?.frame, coins: r?.coins }
    LEVELS.set(id, a)
  }
  return a
}

/** Levels gained between two wallets (a live game just counted): the new ones, lowest first. */
export function levelsGained(before: Counters, after: Counters): number[] {
  const from = levelOf(liveXp(before))
  const to = levelOf(liveXp(after))
  return Array.from({ length: Math.max(0, to - from) }, (_, i) => from + i + 1)
}
