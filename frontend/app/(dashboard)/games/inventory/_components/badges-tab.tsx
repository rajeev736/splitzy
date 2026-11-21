"use client"

import * as React from "react"
import { ArrowRight01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { BadgeArt } from "@/components/fun/badge-art"
import { BadgeDetail } from "@/components/fun/badge-grid"
import { FramedAvatar } from "@/components/fun/framed-avatar"
import { StreakFlame } from "@/components/streak/streak-art"
import { StreakBadges } from "@/components/streak/streak-badges"
import { hasStreakBadge, streakView, useToday } from "@/components/streak/use-streak"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import type { BadgeSummary } from "@/hooks/use-fun"
import { BADGES, FRAME_IDS, isMilestoneFrame, isSingleBadge } from "@/lib/fun/catalog"
import { STREAK_MILESTONES } from "@/lib/live/streak"
import type { Wallet } from "@/lib/types"
import { cn } from "@/lib/utils"
import type { InventoryUser } from "./frames-tab"

const TIER = ["Locked", "Bronze", "Silver", "Gold"] as const
const MILESTONES = FRAME_IDS.filter(isMilestoneFrame)

/** Badges are earned, never bought: each with its level and what the next one takes. */
export function BadgesTab({
  user,
  wallet,
  badges,
  badgeIds,
  earlyBird,
  onShowMilestones,
}: {
  user: InventoryUser
  wallet: Wallet | null | undefined
  badges: BadgeSummary[] | undefined
  /** Every badge doc id: the streak badges are `streak_<days>` docs. */
  badgeIds?: ReadonlySet<string>
  earlyBird?: number
  /** Opens the milestone frames (also earned). */
  onShowMilestones: () => void
}) {
  const [open, setOpen] = React.useState<BadgeSummary | null>(null)
  const claimed = MILESTONES.filter((id) => wallet?.frames.includes(id)).length

  return (
    <div className="flex flex-col gap-4">
      <p className="px-1 text-xs text-muted-foreground">
        Badges can&apos;t be bought. You earn them by paying fast, playing and sending gifts, and friends see them on your
        profile.
      </p>

      <StreakBadgesCard wallet={wallet} badgeIds={badgeIds} />

      <div className="flex flex-col gap-2">
        {badges
          ? badges.map((b) => <BadgeRow key={b.id} badge={b} earlyBird={earlyBird} onClick={() => setOpen(b)} />)
          : Array.from({ length: 5 }, (_, i) => <div key={i} className="h-[4.5rem] animate-pulse rounded-xl bg-muted" />)}
      </div>

      {/* Milestone frames are earned too: they live with the frames */}
      <button
        type="button"
        onClick={onShowMilestones}
        className="flex items-center gap-3 rounded-xl border border-card-stroke bg-card px-3 py-3 text-left shadow-xs transition-colors hover:bg-subtle-hover"
      >
        <span className="shrink-0 p-2">
          <FramedAvatar src={user.photoURL} name={user.displayName} frame="legend" size={32} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold">Milestone frames</span>
          <span className="block truncate text-xs text-muted-foreground">
            {claimed} of {MILESTONES.length} unlocked · win and play games
          </span>
        </span>
        <HugeiconsIcon icon={ArrowRight01Icon} className="size-4 shrink-0 text-muted-foreground" />
      </button>

      <Dialog open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent className="gu max-w-sm">{open && <BadgeDetail badge={open} earlyBird={earlyBird} />}</DialogContent>
      </Dialog>
    </div>
  )
}

/** The five play-streak badges, in their own card at the top: your streak now and best, then the medallions. */
function StreakBadgesCard({ wallet, badgeIds }: { wallet: Wallet | null | undefined; badgeIds?: ReadonlySet<string> }) {
  const today = useToday()
  const s = streakView(wallet, today)
  const have = STREAK_MILESTONES.filter((d) => hasStreakBadge(d, wallet, badgeIds)).length
  return (
    <section className="rounded-xl border border-card-stroke bg-card px-2.5 pt-2.5 pb-2 shadow-xs" aria-label="Play streak badges">
      <div className="flex items-center gap-2.5 px-0.5">
        <span className="stk-badge size-10 !rounded-[14px]" data-out={s.days === 0 || undefined}>
          <StreakFlame lit={s.days > 0} still className="size-6" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold">Play streak</span>
          <span className="block truncate text-xs text-muted-foreground">
            {s.days > 0 ? `${s.days} day${s.days === 1 ? "" : "s"} now` : "Play a live game every day"}
            {s.best > 0 ? ` · best ${s.best}` : ""}
          </span>
        </span>
        <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary tabular-nums">
          {have}/{STREAK_MILESTONES.length}
        </span>
      </div>
      <StreakBadges wallet={wallet} earnedIds={badgeIds} className="mt-2" />
    </section>
  )
}

function BadgeRow({ badge, earlyBird, onClick }: { badge: BadgeSummary; earlyBird?: number; onClick: () => void }) {
  const info = BADGES[badge.id]
  const earned = badge.tier > 0
  const single = isSingleBadge(badge.id)
  // The next level and how far along it you are
  const next = single || badge.tier === 3 ? null : info.tiers[badge.tier]
  const from = badge.tier === 0 ? 0 : info.tiers[badge.tier - 1]
  const pct = next ? Math.min(100, ((badge.count - from) / Math.max(1, next - from)) * 100) : 100

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-3 rounded-xl border border-card-stroke bg-card px-3 py-2.5 text-left shadow-xs transition-colors hover:bg-subtle-hover"
    >
      <BadgeArt badge={badge.id} tier={badge.tier} className={cn("size-12 shrink-0", !earned && "opacity-60 saturate-[.35]")} />
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="flex items-center gap-2">
          <span className={cn("truncate text-sm font-semibold", !earned && "text-muted-foreground")}>{info.name}</span>
          <span
            className={cn(
              "shrink-0 rounded-full px-1.5 py-px text-[10px] font-semibold",
              earned ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
            )}
          >
            {!earned
              ? "Locked"
              : single
                ? badge.id === "earlybird" && earlyBird
                  ? `#${earlyBird}`
                  : "Earned"
                : TIER[badge.tier]}
          </span>
        </span>
        <span className="truncate text-xs text-muted-foreground">{info.how}</span>
        {next && (
          <span className="flex items-center gap-2">
            <span className="block h-1 flex-1 overflow-hidden rounded-full bg-muted">
              <span className="block h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
            </span>
            <span className="shrink-0 text-[10px] text-muted-foreground tabular-nums">
              {badge.count}/{next} to {TIER[badge.tier + 1]}
            </span>
          </span>
        )}
      </span>
    </button>
  )
}
