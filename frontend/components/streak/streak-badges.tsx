"use client"

import * as React from "react"
import { LockIcon, Tick02Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { Coins } from "@/components/fun/coin"
import { GameDialog } from "@/components/game-ui/kit"
import { STREAK_BADGES, STREAK_MILESTONES, type StreakMilestone } from "@/lib/live/streak"
import type { Wallet } from "@/lib/types"
import { cn } from "@/lib/utils"
import { StreakMedal } from "./streak-art"
import { hasStreakBadge, streakView, useToday } from "./use-streak"

/**
 * The five streak badges (7, 30, 50, 100, 365 days in a row) in a row of
 * medallions: earned in colour with a tick, the rest grey with how far you
 * are. Tap one for the big view. `earnedIds`: the badge doc ids
 * (useBadges(uid).ids); `bestPlayStreak` covers the moment before a new one lands.
 */
export function StreakBadges({
  wallet,
  earnedIds,
  className,
  readOnly,
}: {
  wallet: Wallet | null | undefined
  earnedIds: ReadonlySet<string> | undefined
  className?: string
  /** Someone else's: no "how far you are". */
  readOnly?: boolean
}) {
  const today = useToday()
  const view = streakView(wallet, today)
  const [open, setOpen] = React.useState<StreakMilestone | null>(null)

  return (
    <>
      <div className={cn("grid grid-cols-5 gap-1", className)} role="list" aria-label="Streak badges">
        {STREAK_MILESTONES.map((d) => {
          const have = hasStreakBadge(d, wallet, earnedIds)
          return (
            <button
              key={d}
              type="button"
              role="listitem"
              onClick={() => setOpen(d)}
              aria-label={`${STREAK_BADGES[d].name}, ${d} days in a row${have ? ", earned" : ", locked"}`}
              className="group flex min-w-0 flex-col items-center gap-0.5 rounded-2xl px-0.5 pt-1 pb-1 transition-transform active:scale-95"
            >
              <span className="relative block w-full max-w-[64px]">
                <StreakMedal days={d} locked={!have} className="block aspect-square w-full" />
                {have ? (
                  <span className="absolute -top-0.5 right-0 flex size-[18px] items-center justify-center rounded-full bg-[var(--gu-green)] text-white shadow-[0_0_0_2px_#fff]">
                    <HugeiconsIcon icon={Tick02Icon} className="size-3" strokeWidth={3} />
                  </span>
                ) : (
                  <span className="absolute -top-0.5 right-0 flex size-[18px] items-center justify-center rounded-full bg-[#7d77b0] text-white shadow-[0_0_0_2px_#fff]">
                    <HugeiconsIcon icon={LockIcon} className="size-2.5" strokeWidth={2.6} />
                  </span>
                )}
              </span>
              <span
                className={cn(
                  "max-w-full truncate text-[10px] leading-tight font-bold tabular-nums",
                  have ? "text-[var(--gu-green-deep)]" : "text-[var(--gu-ink-soft)]"
                )}
              >
                {have ? "Earned" : readOnly ? "Locked" : `${Math.min(view.days, d)}/${d}`}
              </span>
            </button>
          )
        })}
      </div>

      {open !== null && (
        <StreakBadgeDialog
          days={open}
          open
          onClose={() => setOpen(null)}
          earned={hasStreakBadge(open, wallet, earnedIds)}
          current={view.days}
          best={view.best}
          readOnly={readOnly}
        />
      )}
    </>
  )
}

/** One streak badge, big: its medallion on rays, name, what it takes, its coins, and how far along you are. */
export function StreakBadgeDialog({
  days,
  open,
  onClose,
  earned,
  current,
  best,
  readOnly,
}: {
  days: StreakMilestone
  open: boolean
  onClose: () => void
  earned: boolean
  current: number
  best: number
  readOnly?: boolean
}) {
  const info = STREAK_BADGES[days]
  const pct = Math.min(100, (Math.min(current, days) / days) * 100)
  return (
    <GameDialog open={open} onClose={onClose} title="Streak badge">
      <div className="flex flex-col items-center text-center">
        <div className="relative flex h-[150px] w-full items-center justify-center" aria-hidden>
          {earned && <span className="ds-rays" />}
          <StreakMedal days={days} locked={!earned} shine={earned} className="relative size-[136px]" />
        </div>
        <h3 className="text-[1.6rem] leading-tight font-bold">{info.name}</h3>
        <p className="mt-0.5 text-sm font-semibold text-[var(--gu-ink-soft)]">{info.blurb}</p>
        <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
          <span className="gu-chip h-7 !px-2.5 text-xs">
            Reward <Coins amount={info.coins} iconClassName="size-3.5" />
          </span>
          {earned ? (
            <span className="gu-chip h-7 !bg-[var(--gu-green)] !px-2.5 text-xs !text-white">
              <HugeiconsIcon icon={Tick02Icon} className="size-3.5" strokeWidth={3} />
              Unlocked
            </span>
          ) : (
            <span className="gu-chip h-7 !px-2.5 text-xs !text-[var(--gu-ink-soft)]">
              <HugeiconsIcon icon={LockIcon} className="size-3" strokeWidth={2.6} />
              Locked
            </span>
          )}
        </div>
        {!earned && !readOnly && (
          <div className="mt-4 w-full">
            <div className="mb-1 flex items-center justify-between text-xs font-bold">
              <span className="text-[var(--gu-brown)]">Current streak</span>
              <span className="tabular-nums">
                {Math.min(current, days)} / {days} days
              </span>
            </div>
            <div className="stk-bar">
              <span style={{ width: `${Math.max(current > 0 ? 6 : 0, pct)}%` }} />
            </div>
            <p className="mt-2 text-xs font-semibold text-[var(--gu-ink-soft)]">
              Play a live game every day to get there — miss a day and the streak starts again.
              {best > current ? ` Your best: ${best} days.` : ""}
            </p>
          </div>
        )}
      </div>
    </GameDialog>
  )
}
