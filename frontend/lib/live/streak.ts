/**
 * Daily play streak and the daily reward — shared by the server (which counts
 * and pays them: lib/server/streak.ts, app/api/games/daily) and the Games UI.
 *
 * Days are calendar days in India (IST, UTC+5:30, no daylight saving), as
 * "YYYY-MM-DD" strings, so "today" is the same for everyone and for the server.
 *
 * Wallet fields (written only by the server with the admin SDK):
 * - playStreak / bestPlayStreak / playDay: consecutive days with at least one
 *   live game counted (lib/server/live-settle), and the last such day.
 * - dailyDay / dailyRun: the last day the daily reward was taken, and how many
 *   days in a row it has been (drives the 7-day reward cycle).
 */

const IST_OFFSET_MS = (5 * 60 + 30) * 60_000
const DAY_MS = 86_400_000

/** The IST calendar day of `ms`, "YYYY-MM-DD". */
export function dayKey(ms: number): string {
  return new Date(ms + IST_OFFSET_MS).toISOString().slice(0, 10)
}

/** The day before `day` ("YYYY-MM-DD"). */
export function dayBefore(day: string): string {
  return new Date(Date.parse(`${day}T00:00:00Z`) - DAY_MS).toISOString().slice(0, 10)
}

/** When the IST day `day` ends (ms since epoch). */
export function dayEndsAt(day: string): number {
  return Date.parse(`${day}T00:00:00Z`) + DAY_MS - IST_OFFSET_MS
}

/**
 * A streak after something happened on `today`: same day → unchanged, the
 * next day → +1, a gap (or none yet) → starts again at 1.
 */
export function nextRun(lastDay: string | undefined, run: number | undefined, today: string): number {
  if (lastDay === today) return Math.max(1, run ?? 1)
  if (lastDay && lastDay === dayBefore(today)) return (run ?? 0) + 1
  return 1
}

/**
 * The play streak as it stands on `today`: still alive if the last game was
 * today or yesterday (yesterday = at risk: play today to keep it), else 0.
 */
export function liveStreak(
  w: { playStreak?: number; playDay?: string } | null | undefined,
  today: string
): { days: number; atRisk: boolean } {
  if (!w?.playDay || !w.playStreak) return { days: 0, atRisk: false }
  if (w.playDay === today) return { days: w.playStreak, atRisk: false }
  if (w.playDay === dayBefore(today)) return { days: w.playStreak, atRisk: true }
  return { days: 0, atRisk: false }
}

/** Streak badges: one each at these many days in a row. Badge doc ids: `streak_<days>`. */
export const STREAK_MILESTONES = [7, 30, 50, 100, 365] as const
export type StreakMilestone = (typeof STREAK_MILESTONES)[number]
export const streakBadgeId = (days: StreakMilestone) => `streak_${days}` as const

export const STREAK_BADGES: Record<StreakMilestone, { name: string; blurb: string; coins: number }> = {
  7: { name: "Week Warrior", blurb: "Played 7 days in a row", coins: 200 },
  30: { name: "Monthly Master", blurb: "Played 30 days in a row", coins: 1000 },
  50: { name: "Unstoppable", blurb: "Played 50 days in a row", coins: 2000 },
  100: { name: "Century Flame", blurb: "Played 100 days in a row", coins: 5000 },
  365: { name: "Year of Fire", blurb: "Played every day for a year", coins: 20000 },
}

/** The milestones reached going from `before` to `after` days. */
export const milestonesCrossed = (before: number, after: number): StreakMilestone[] =>
  STREAK_MILESTONES.filter((m) => before < m && after >= m)

/** The daily reward, a 7-day cycle (day 7 is the big one); a missed day starts it again at day 1. */
export const DAILY_REWARDS = [50, 75, 100, 150, 200, 300, 500] as const

/** Which day of the cycle (1–7) a run of `run` days in a row is on. */
export const cycleDay = (run: number) => ((Math.max(1, run) - 1) % DAILY_REWARDS.length) + 1

export const dailyCoins = (run: number) => DAILY_REWARDS[cycleDay(run) - 1]
