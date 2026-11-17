import type { FrameId } from "@/lib/fun/catalog"
import type { Wallet } from "@/lib/types"
import { levelAchievement, levelOf, liveXp } from "./levels"

/**
 * Live-game achievements: reached on the wallet's live counters (each live
 * game is counted once when it ends, services/game-profile), rewarded with a
 * frame and/or the game characters whose `earn.achievement` names them
 * (components/game-avatar). The rewards show at the end of the game that
 * reached them — a popup on the result screen, never a notification — and
 * stay claimable in the Inventory.
 *
 * Goals and frames must match `achievementGoal` / `achievementFrame` in
 * firestore.rules. Levels (lib/live/levels) are achievements too, with the
 * id `lv<n>`, measured on your level.
 */

export type LiveStat = "liveWins" | "bestStreak" | "livePlayed"

export interface Achievement {
  id: string
  /** The headline when it's reached ("Win streak ×3!"). */
  title: string
  /** How to get it, for locked cards ("Win 3 in a row to unlock"). */
  how: string
  stat: LiveStat | "level"
  goal: number
  /** A frame it gives (lib/fun/catalog), besides any characters that name it. */
  frame?: FrameId
  /** Coins it gives, once (levels only). */
  coins?: number
}

export const ACHIEVEMENTS: Achievement[] = [
  { id: "first_win", title: "First win!", how: "Win a live game", stat: "liveWins", goal: 1, frame: "laurel" },
  { id: "win_streak_3", title: "Win streak ×3!", how: "Win 3 in a row", stat: "bestStreak", goal: 3, frame: "flame" },
  { id: "win_streak_5", title: "Win streak ×5!", how: "Win 5 in a row", stat: "bestStreak", goal: 5, frame: "inferno" },
  { id: "wins_25", title: "25 wins!", how: "Win 25 live games", stat: "liveWins", goal: 25, frame: "royal_crown" },
]

const BY_ID = new Map(ACHIEVEMENTS.map((a) => [a.id, a]))
/** An achievement, or a level (`lv<n>`). */
export const achievementById = (id: string | null | undefined) =>
  id ? (BY_ID.get(id) ?? levelAchievement(id)) : undefined

type Counters = Pick<Wallet, LiveStat> | null | undefined

/** Where you stand on an achievement (a level: the level you're at, of the one it needs). */
export function achievementProgress(wallet: Counters, a: Achievement) {
  const value = a.stat === "level" ? levelOf(liveXp(wallet)) : (wallet?.[a.stat] ?? 0)
  return { value: Math.min(value, a.goal), goal: a.goal, done: value >= a.goal }
}

/** Achievements `after` reaches that `before` didn't (a live game just counted). */
export function newlyReached(before: Counters, after: Counters): Achievement[] {
  return ACHIEVEMENTS.filter((a) => !achievementProgress(before, a).done && achievementProgress(after, a).done)
}

export type LiveOutcome = "win" | "lose" | "draw"

/** The counters after one more live game (mirrors liveResultOk in the rules). */
export function countLiveGame(wallet: Counters & Pick<Wallet, "streak">, outcome: LiveOutcome) {
  const won = outcome === "win"
  const streak = won ? (wallet?.streak ?? 0) + 1 : 0
  return {
    livePlayed: (wallet?.livePlayed ?? 0) + 1,
    liveWins: (wallet?.liveWins ?? 0) + (won ? 1 : 0),
    streak,
    bestStreak: Math.max(wallet?.bestStreak ?? 0, streak),
  }
}

/** A live game's record id: the room code and when it started (known mid-game too, for a forfeit). */
export const liveGameId = (code: string, startedAt: number) => `${code}_${Math.round(startedAt)}`
