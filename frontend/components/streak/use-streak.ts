"use client"

import * as React from "react"

import {
  STREAK_MILESTONES,
  dayEndsAt,
  dayKey,
  liveStreak,
  streakBadgeId,
  type StreakMilestone,
} from "@/lib/live/streak"
import type { Wallet } from "@/lib/types"

/*
 * "Today" (the IST day, lib/live/streak) as a tiny external store: it only
 * changes at midnight IST, so one timer set for then — not a ticking clock —
 * keeps every streak chip, banner and the daily reward on the right day while
 * the app stays open overnight. Prerendering sees "" (no day yet).
 */
let today = ""
let timer: number | undefined
const listeners = new Set<() => void>()

function schedule() {
  today = dayKey(Date.now())
  // A little past the boundary, so dayKey has surely moved on
  timer = window.setTimeout(() => {
    schedule()
    listeners.forEach((l) => l())
  }, Math.max(1000, dayEndsAt(today) - Date.now() + 500))
}

function subscribe(l: () => void) {
  listeners.add(l)
  if (timer === undefined) schedule()
  return () => {
    listeners.delete(l)
    if (listeners.size === 0 && timer !== undefined) {
      window.clearTimeout(timer)
      timer = undefined
    }
  }
}

const getSnapshot = () => (timer === undefined ? dayKey(Date.now()) : today)

/** Today's IST day key ("YYYY-MM-DD"), live across midnight; "" while prerendering. */
export function useToday(): string {
  return React.useSyncExternalStore(subscribe, getSnapshot, () => "")
}

export interface StreakView {
  /** Days in a row as it stands today (0 once it's broken). */
  days: number
  /** Played yesterday, not yet today: play before midnight IST to keep it. */
  atRisk: boolean
  /** Played today already. */
  safe: boolean
  best: number
  /** When today ends (ms), for "time left". */
  endsAt: number
  /** The next badge to reach (null: all five earned). */
  next: StreakMilestone | null
  /** The milestone before it (0 at the start), for the progress bar. */
  prev: number
}

/** The play streak for a wallet on `today` (a day key from useToday). */
export function streakView(wallet: Wallet | null | undefined, today: string): StreakView {
  const { days, atRisk } = today ? liveStreak(wallet, today) : { days: 0, atRisk: false }
  const best = Math.max(days, wallet?.bestPlayStreak ?? 0)
  const next = STREAK_MILESTONES.find((m) => m > days) ?? null
  const prev = [...STREAK_MILESTONES].reverse().find((m) => m <= days) ?? 0
  return {
    days,
    atRisk,
    safe: days > 0 && !atRisk,
    best,
    endsAt: today ? dayEndsAt(today) : 0,
    next,
    prev,
  }
}

/**
 * Whether a streak badge is yours: its badge doc (users/{uid}/badges/streak_<n>,
 * written by the server) is there — or, before that lands, your best streak
 * already reached it.
 */
export function hasStreakBadge(
  days: StreakMilestone,
  wallet: Wallet | null | undefined,
  earnedIds: ReadonlySet<string> | undefined
): boolean {
  return !!earnedIds?.has(streakBadgeId(days)) || (wallet?.bestPlayStreak ?? 0) >= days || (wallet?.playStreak ?? 0) >= days
}

/** "3h 12m", "12m", "<1m" — for "time left today". */
export function formatTimeLeft(ms: number): string {
  const m = Math.max(0, Math.floor(ms / 60_000))
  if (m < 1) return "<1m"
  const h = Math.floor(m / 60)
  return h > 0 ? `${h}h ${m % 60}m` : `${m}m`
}
