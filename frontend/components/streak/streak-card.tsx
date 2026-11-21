"use client"

import * as React from "react"
import { GameController03Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { useNow } from "@/hooks/use-now"
import { STREAK_BADGES } from "@/lib/live/streak"
import type { Wallet } from "@/lib/types"
import { cn } from "@/lib/utils"
import { openDailyReward } from "./daily-reward"
import { StreakFlame, StreakMedal, TreasureChest } from "./streak-art"
import { StreakBadges } from "./streak-badges"
import { formatTimeLeft, streakView, useToday } from "./use-streak"

/**
 * The play streak on the Games side: the flame with your days in a row, how
 * today stands (played / play before midnight IST to keep it), your best, and
 * the way to the next streak badge.
 *
 * - "hub": on the Games hub, with the daily reward's chest on the right;
 * - "profile": your game profile, with the five streak badges under it;
 * - "player": someone else's game profile (read-only).
 */
export function StreakCard({
  wallet,
  earnedIds,
  variant = "hub",
  className,
}: {
  wallet: Wallet | null | undefined
  /** Badge doc ids (useBadges(uid).ids), for the profile's badges. */
  earnedIds?: ReadonlySet<string>
  variant?: "hub" | "profile" | "player"
  className?: string
}) {
  const today = useToday()
  const s = streakView(wallet, today)
  const mine = variant !== "player"
  const giftReady = !!wallet && !!today && wallet.dailyDay !== today
  const toNext = s.next ? (s.days - s.prev) / (s.next - s.prev) : 1

  const status = !mine ? (
    <span className="text-[var(--gu-brown)]">{s.best > 0 ? `Best ${s.best} days` : "No streak yet"}</span>
  ) : s.atRisk ? (
    <span className="text-[var(--gu-orange-deep)]">
      Play today · <TimeLeft endsAt={s.endsAt} />
    </span>
  ) : s.safe ? (
    <span className="text-[var(--gu-green-deep)]">Played today · Best {s.best}</span>
  ) : (
    <span className="text-[var(--gu-brown)]">{s.best > 0 ? `Play a game to start again · Best ${s.best}` : "Play a live game to start one"}</span>
  )

  return (
    <section
      className={cn("gu-panel-flat flex flex-col gap-3 p-3", className)}
      aria-label={`Play streak: ${s.days} day${s.days === 1 ? "" : "s"}`}
    >
      <div className="flex items-center gap-3">
        <span className="stk-badge size-[52px]" data-out={s.days === 0 || undefined} data-risk={(mine && s.atRisk) || undefined}>
          <StreakFlame lit={s.days > 0} className="size-8" still={s.days === 0} />
          <span className="stk-count tabular-nums">{s.days}</span>
        </span>

        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <p className="truncate text-[17px] leading-tight font-bold">
            {s.days > 0 ? `${s.days}-day streak` : "Play streak"}
          </p>
          <p className="line-clamp-2 text-xs leading-tight font-bold">{status}</p>
          {s.next ? (
            <div className="mt-0.5 flex items-center gap-1.5" title={`Next badge: ${STREAK_BADGES[s.next].name}`}>
              <div className="stk-bar flex-1" aria-hidden>
                <span style={{ width: `${s.days > s.prev ? Math.max(8, toNext * 100) : 0}%` }} />
              </div>
              <span className="shrink-0 text-[11px] font-bold text-[var(--gu-ink-soft)] tabular-nums">
                {s.days}/{s.next}
              </span>
              <StreakMedal days={s.next} locked className="-my-1 size-7 shrink-0" />
            </div>
          ) : (
            <p className="truncate text-[11px] font-bold text-[var(--gu-purple-deep)]">All five streak badges earned!</p>
          )}
        </div>

        {variant === "hub" && (
          <button
            type="button"
            onClick={openDailyReward}
            aria-label={giftReady ? "Daily reward: ready to claim" : "Daily reward"}
            title="Daily reward"
            className={cn("gu-btn gu-btn-icon stk-gift", giftReady ? "gu-yellow" : "gu-cream")}
            data-ready={giftReady || undefined}
          >
            <TreasureChest />
            {giftReady && <span className="stk-gift-dot" aria-hidden />}
          </button>
        )}
      </div>

      {variant !== "hub" && (
        <div className="-mx-1 border-t-2 border-dashed border-[var(--gu-line)] pt-2">
          <StreakBadges wallet={wallet} earnedIds={earnedIds} readOnly={!mine} />
        </div>
      )}
    </section>
  )
}

/**
 * On the Games hub while the streak is at risk (played yesterday, not yet
 * today): how long is left before midnight IST, and a Play button. The app's
 * own "save your streak" reminder; the server sends the push.
 */
export function StreakRiskBanner({ wallet, onPlay }: { wallet: Wallet | null | undefined; onPlay: () => void }) {
  const today = useToday()
  const s = streakView(wallet, today)
  if (!s.atRisk) return null
  return (
    <div className="stk-risk" role="status">
      <StreakFlame className="relative size-9" />
      <div className="relative min-w-0 flex-1">
        <p className="stk-risk-title">Save your {s.days}-day streak!</p>
        <p className="stk-risk-line">
          Play any live game in the next <TimeLeft endsAt={s.endsAt} bare />
        </p>
      </div>
      <button type="button" onClick={onPlay} className="gu-btn gu-btn-sm gu-cream relative shrink-0 !h-9 !gap-1 !px-2.5 !text-[13px] !text-[var(--gu-orange-deep)]">
        <HugeiconsIcon icon={GameController03Icon} className="size-4" strokeWidth={2.4} />
        Play
      </button>
    </div>
  )
}

/** "3h 12m left", ticking (only this bit re-renders). `bare`: no "left". */
function TimeLeft({ endsAt, bare }: { endsAt: number; bare?: boolean }) {
  const now = useNow(endsAt)
  if (!now) return null
  const text = formatTimeLeft(endsAt - now)
  return <span className="tabular-nums">{bare ? text : `${text} left`}</span>
}
