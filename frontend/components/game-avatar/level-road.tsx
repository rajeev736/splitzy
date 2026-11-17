"use client"

import * as React from "react"
import { ArrowRight01Icon, LockIcon, Tick02Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { toast } from "sonner"

import { CoinIcon } from "@/components/fun/coin"
import { FramedAvatar } from "@/components/fun/framed-avatar"
import { BottomSheet } from "@/components/shared/bottom-sheet"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { useClaimReward } from "@/hooks/use-fun-mutations"
import { XP_PLAY, XP_WIN, levelInfo, levelTitle } from "@/lib/live/levels"
import type { Wallet } from "@/lib/types"
import { cn } from "@/lib/utils"
import { CharacterTile } from "./character-tile"
import { LevelBadge, XpBar } from "./level-badge"
import { levelRewards, rewardId, rewardName, unclaimed, type Reward } from "./ownership"
import { CHARACTERS } from "./registry"
import type { CharacterDef } from "./types"

type RoadUser = { displayName: string; photoURL?: string }
type RoadWallet = Wallet | null | undefined

const fmt = new Intl.NumberFormat("en-IN")

/** Level rewards you've reached and not taken yet (the profile's "to claim"). */
export function claimableLevelRewards(wallet: RoadWallet, characters: CharacterDef[] = CHARACTERS) {
  const { level } = levelInfo(wallet)
  return levelRewards(characters)
    .filter((x) => x.level <= level)
    .reduce((n, x) => n + unclaimed(x.rewards, wallet).length, 0)
}

/** Your level big: the crest, its title, and the XP to the next one. */
export function LevelSummary({ wallet, className }: { wallet: RoadWallet; className?: string }) {
  const info = levelInfo(wallet)
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <LevelBadge level={info.level} size={48} />
      <div className="min-w-0 flex-1">
        <p className="flex items-baseline justify-between gap-2">
          <span className="truncate text-base leading-tight font-semibold">
            Level {info.level} · {info.title}
          </span>
          <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
            {info.max ? `${fmt.format(info.xp)} XP` : `${fmt.format(info.into)} / ${fmt.format(info.need)} XP`}
          </span>
        </p>
        <XpBar value={info.progress} className="mt-1.5" />
        <p className="mt-1 text-[11px] text-muted-foreground">
          {info.max ? "Top level — you're a Legend" : `+${XP_PLAY} XP a game, +${XP_WIN} more for a win`}
        </p>
      </div>
    </div>
  )
}

/**
 * The levels road: every level that gives something, as a track — taken ✓,
 * ready (a glowing Claim), or locked until you get there. `compact` shows
 * only what's ready and the next two, with a way to the whole road.
 */
export function LevelRoad({
  user,
  wallet,
  characters = CHARACTERS,
  compact = false,
  onSeeAll,
}: {
  user: RoadUser
  wallet: RoadWallet
  characters?: CharacterDef[]
  compact?: boolean
  onSeeAll?: () => void
}) {
  const { level } = levelInfo(wallet)
  const all = levelRewards(characters)
  const here = React.useRef<HTMLLIElement>(null)

  // The whole road opens at where you are
  React.useEffect(() => {
    if (!compact) here.current?.scrollIntoView({ block: "center" })
  }, [compact])

  const rows = compact
    ? [
        ...all.filter((x) => x.level <= level && unclaimed(x.rewards, wallet).length),
        ...all.filter((x) => x.level > level).slice(0, 2),
      ]
    : all
  const next = all.find((x) => x.level > level)?.level

  return (
    <div className="flex flex-col gap-2">
      <ol className="flex flex-col" aria-label="Level rewards">
        {rows.map((x, i) => (
          <LevelStep
            key={x.level}
            ref={x.level === next ? here : undefined}
            level={x.level}
            reached={x.level <= level}
            rewards={x.rewards}
            user={user}
            wallet={wallet}
            last={i === rows.length - 1}
          />
        ))}
      </ol>
      {compact && onSeeAll && (
        <button
          type="button"
          onClick={onSeeAll}
          className="flex items-center justify-between gap-2 rounded-xl border border-dashed px-3.5 py-2.5 text-sm transition-colors hover:bg-muted/60"
        >
          <span>
            <span className="font-medium">All {all.length} level rewards</span>
            <span className="text-muted-foreground"> up to level {all[all.length - 1]?.level}</span>
          </span>
          <HugeiconsIcon icon={ArrowRight01Icon} className="size-4 text-muted-foreground" />
        </button>
      )}
    </div>
  )
}

/** One level on the road: its crest on the track, and what it gives. */
function LevelStep({
  ref,
  level,
  reached,
  rewards,
  user,
  wallet,
  last,
}: {
  ref?: React.Ref<HTMLLIElement>
  level: number
  reached: boolean
  rewards: Reward[]
  user: RoadUser
  wallet: RoadWallet
  last: boolean
}) {
  const claim = useClaimReward()
  const [claiming, setClaiming] = React.useState<string | null>(null)
  const open = new Set(unclaimed(rewards, wallet).map(rewardId))
  const ready = reached && open.size > 0
  // A new title starts here (5 Challenger, 10 Pro, …)
  const title = levelTitle(level) !== levelTitle(level - 1) ? levelTitle(level) : null

  const take = (r: Reward) => {
    setClaiming(rewardId(r))
    claim.mutate(
      { achievement: r.achievement.id, kind: r.kind, id: rewardId(r) },
      {
        onSuccess: () => toast.success(`${rewardName(r)} — yours`),
        onSettled: () => setClaiming(null),
      }
    )
  }

  return (
    <li ref={ref} className="relative flex gap-3 pb-2.5">
      {/* The track: lit up to where you are */}
      {!last && (
        <span
          aria-hidden
          className={cn("absolute top-8 -bottom-1.5 left-5 w-1 -translate-x-1/2 rounded-full", reached ? "bg-amber-400" : "bg-muted")}
        />
      )}
      <span className={cn("relative z-10 flex w-10 shrink-0 justify-center pt-1", !reached && "opacity-55 grayscale")}>
        <LevelBadge level={level} size={34} />
      </span>
      <div
        className={cn(
          "min-w-0 flex-1 rounded-xl border border-card-stroke bg-card px-3 py-2.5 shadow-xs",
          ready && "border-amber-400/70 shadow-[0_0_0_3px_rgba(251,191,36,.18),0_4px_14px_rgba(251,191,36,.18)]"
        )}
      >
        <div className="flex items-center justify-between gap-2">
          <p className="min-w-0 truncate text-sm font-semibold">
            Level {level}
            {title && <span className="ml-1.5 text-xs font-medium text-amber-600 dark:text-amber-400">· {title}</span>}
          </p>
          {!reached ? (
            <span className="flex shrink-0 items-center gap-1 text-[11px] text-muted-foreground">
              <HugeiconsIcon icon={LockIcon} className="size-3" />
              Locked
            </span>
          ) : open.size === 0 ? (
            <span className="flex shrink-0 items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
              <HugeiconsIcon icon={Tick02Icon} className="size-3.5" />
              Claimed
            </span>
          ) : null}
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {rewards.map((r) => {
            const id = rewardId(r)
            const can = reached && open.has(id)
            return (
              <div key={id} className="flex min-w-0 items-center gap-1.5 rounded-lg bg-muted/60 py-1 pr-1.5 pl-1">
                <RewardThumb reward={r} user={user} />
                <span className="truncate text-xs font-medium">{rewardName(r)}</span>
                {can ? (
                  <Button
                    size="xs"
                    onClick={() => take(r)}
                    disabled={claim.isPending}
                    className="bg-amber-500 text-white shadow-[0_0_10px_rgba(245,158,11,.55)] hover:bg-amber-500/90"
                  >
                    {claiming === id ? <Spinner /> : "Claim"}
                  </Button>
                ) : reached ? (
                  <HugeiconsIcon icon={Tick02Icon} className="size-3.5 text-emerald-600 dark:text-emerald-400" aria-label="Yours" />
                ) : null}
              </div>
            )
          })}
        </div>
      </div>
    </li>
  )
}

/** A reward, small: the character, the frame on your photo, or a coin. */
export function RewardThumb({ reward, user }: { reward: Reward; user: RoadUser }) {
  if (reward.kind === "character") return <CharacterTile def={reward.def} size={28} />
  if (reward.kind === "frame")
    return (
      <span className="p-1">
        <FramedAvatar src={user.photoURL} name={user.displayName} frame={reward.frame} size={20} />
      </span>
    )
  return (
    <span className="flex size-7 items-center justify-center">
      <CoinIcon className="size-5" />
    </span>
  )
}

/** The whole levels road in a sheet, opened from the profile and the inventory. */
export function LevelRoadSheet({
  open,
  onOpenChange,
  user,
  wallet,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: RoadUser
  wallet: RoadWallet
}) {
  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Levels"
      description="Play live games to level up — every level on the road gives something."
      header={<LevelSummary wallet={wallet} />}
    >
      <div className="pt-1 pb-3">
        <LevelRoad user={user} wallet={wallet} />
      </div>
    </BottomSheet>
  )
}
