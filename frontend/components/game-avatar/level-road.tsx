"use client"

import * as React from "react"
import Link from "next/link"
import { ArrowRight01Icon, LockIcon, Tick02Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { CoinIcon } from "@/components/fun/coin"
import { FramedAvatar } from "@/components/fun/framed-avatar"
import { GameButton } from "@/components/game-ui/kit"
import { announceReward } from "@/components/rewards/reward-notice"
import { Spinner } from "@/components/ui/spinner"
import { useClaimReward } from "@/hooks/use-fun-mutations"
import { XP_PLAY, XP_WIN, levelInfo } from "@/lib/live/levels"
import type { Wallet } from "@/lib/types"
import { cn } from "@/lib/utils"
import { CharacterTile } from "./character-tile"
import { LevelBadge, XpBar } from "./level-badge"
import { levelRewards, rewardId, rewardName, unclaimed, type Reward } from "./ownership"
import { CHARACTERS } from "./registry"
import type { CharacterDef } from "./types"

/*
 * Levels in the game theme (components/game-ui): the summary card and a short
 * list of what's next. The whole road — every level on a vertical pass — is
 * ./level-pass (the Levels tab). Everything here sits on the Games side's sky
 * or cream panels.
 */

export type RoadUser = { displayName: string; photoURL?: string; gameAvatar?: string; frame?: string }
export type RoadWallet = Wallet | null | undefined

/** Where the whole map lives (the Games side's Levels tab). */
export const LEVELS_HREF = "/games/levels"

const fmt = new Intl.NumberFormat("en-IN")

/** Level rewards you've reached and not taken yet (the "to claim" badges). */
export function claimableLevelRewards(wallet: RoadWallet, characters: CharacterDef[] = CHARACTERS) {
  const { level } = levelInfo(wallet)
  return levelRewards(characters)
    .filter((x) => x.level <= level)
    .reduce((n, x) => n + unclaimed(x.rewards, wallet).length, 0)
}

/** Your level big, on cream: the crest, its title, and the XP to the next one. */
export function LevelSummary({ wallet, className }: { wallet: RoadWallet; className?: string }) {
  const info = levelInfo(wallet)
  return (
    <div className={cn("flex items-center gap-3.5", className)}>
      <LevelBadge level={info.level} size={54} />
      <div className="min-w-0 flex-1">
        <p className="flex items-baseline justify-between gap-2">
          <span className="truncate text-lg leading-tight font-bold">
            Level {info.level} <span className="text-[var(--gu-orange-deep)]">· {info.title}</span>
          </span>
          <span className="shrink-0 text-xs font-bold text-[var(--gu-ink-soft)] tabular-nums">
            {info.max ? `${fmt.format(info.xp)} XP` : `${fmt.format(info.into)} / ${fmt.format(info.need)} XP`}
          </span>
        </p>
        <XpBar
          value={info.progress}
          className="mt-2 h-3.5 bg-[#2a2747] shadow-[0_0_0_3px_#5b55a8,inset_0_2px_0_rgba(0,0,0,.3)]"
        />
        <p className="mt-1.5 text-[11px] font-bold text-[var(--gu-brown)]">
          {info.max ? "Top level — you're a Legend" : `+${XP_PLAY} XP a game, +${XP_WIN} more for a win`}
        </p>
      </div>
    </div>
  )
}

/** The last place the screen was pressed (for where claimed coins fly from). */
let lastPress: { x: number; y: number } | null = null
if (typeof document !== "undefined") {
  document.addEventListener(
    "pointerdown",
    (e) => {
      lastPress = { x: e.clientX, y: e.clientY }
    },
    { capture: true, passive: true }
  )
}

/**
 * Claims rewards (a level's, or one of them), one after the other. `busy` is
 * the key of the claim under way (the level by default), so only its button spins.
 */
export function useClaimLevel() {
  const claim = useClaimReward()
  const [busy, setBusy] = React.useState<string | null>(null)
  const take = async (level: number, rewards: Reward[], key: string = String(level)) => {
    // Where the coins burst from: the Claim just pressed (the focused button, or —
    // Safari doesn't focus on tap — the spot last pressed)
    const pressed =
      document.activeElement instanceof HTMLButtonElement ? document.activeElement.getBoundingClientRect() : lastPress ?? undefined
    setBusy(key)
    try {
      for (const r of rewards) {
        await claim.mutateAsync({ achievement: r.achievement.id, kind: r.kind, id: rewardId(r) })
      }
      // Game-style: coins fly into the counter, each item pops up
      for (const r of rewards) announceReward(r, { from: pressed })
    } catch {
      /* the mutation cache shows the error */
    } finally {
      setBusy(null)
    }
  }
  return { take, busy }
}

/** One level's rewards on a cream card: claimed ✓, ready (Claim), or locked until you get there. */
function LevelCard({
  level,
  title,
  reached,
  rewards,
  user,
  wallet,
  busy,
  disabled,
  onClaim,
}: {
  level: number
  title: string | null
  reached: boolean
  rewards: Reward[]
  user: RoadUser
  wallet: RoadWallet
  busy: boolean
  disabled: boolean
  onClaim: (open: Reward[]) => void
}) {
  const open = unclaimed(rewards, wallet)
  const openIds = new Set(open.map(rewardId))
  const ready = reached && open.length > 0
  return (
    <div
      className={cn(
        "gu-panel-flat flex min-w-0 flex-col gap-2 px-3 py-2.5",
        ready && "shadow-[0_0_0_3px_#ffcd3c,0_4px_0_3px_#d99a0b,0_0_22px_rgba(255,205,60,.55)]",
        !reached && "opacity-85"
      )}
    >
      <div className="flex min-w-0 items-center justify-between gap-2">
        <p className="min-w-0 truncate text-[13px] leading-tight font-bold">
          Level {level}
          {title && <span className="text-[var(--gu-orange-deep)]"> · {title}</span>}
        </p>
        {/* Claimed before the level curve changed: still yours, even above your level now */}
        {open.length === 0 ? (
          <span className="flex shrink-0 items-center gap-0.5 text-[11px] font-bold text-[var(--gu-green-deep)]">
            <HugeiconsIcon icon={Tick02Icon} className="size-3.5" strokeWidth={2.6} />
            Got it
          </span>
        ) : !reached ? (
          <HugeiconsIcon icon={LockIcon} className="size-4 shrink-0 text-[var(--gu-ink-soft)]" aria-label="Locked" />
        ) : null}
      </div>
      <ul className="flex flex-col gap-1">
        {rewards.map((r) => {
          const id = rewardId(r)
          const have = !openIds.has(id)
          return (
            <li key={id} className="flex min-w-0 items-center gap-1.5 rounded-xl bg-[var(--gu-cream-2)] py-0.5 pr-2 pl-0.5">
              <span className={cn("shrink-0", !reached && "opacity-70 grayscale")}>
                <RewardThumb reward={r} user={user} />
              </span>
              <span className="min-w-0 flex-1 truncate text-[11px] font-bold">{rewardName(r)}</span>
              {have && <HugeiconsIcon icon={Tick02Icon} className="size-3.5 shrink-0 text-[var(--gu-green-deep)]" strokeWidth={2.6} />}
            </li>
          )
        })}
      </ul>
      {ready && (
        <GameButton tone="yellow" size="sm" className="w-full" disabled={disabled} onClick={() => onClaim(open)}>
          {busy ? <Spinner /> : "Claim"}
        </GameButton>
      )}
    </div>
  )
}

/* ── What's next (short) ─────────────────────────────────────────────── */

/**
 * What's ready to claim and the next two levels that give something, as cream
 * cards, with the way to the whole map. For the inventory's "Earn" view.
 */
export function LevelRoad({
  user,
  wallet,
  characters = CHARACTERS,
}: {
  user: RoadUser
  wallet: RoadWallet
  characters?: CharacterDef[]
}) {
  const { level } = levelInfo(wallet)
  const all = levelRewards(characters)
  const { take, busy } = useClaimLevel()
  const rows = [
    ...all.filter((x) => x.level <= level && unclaimed(x.rewards, wallet).length),
    ...all.filter((x) => x.level > level && unclaimed(x.rewards, wallet).length).slice(0, 2),
  ]
  return (
    <div className="flex flex-col gap-2.5">
      {rows.map((x) => (
        <div key={x.level} className="flex items-center gap-3">
          <span className={cn("shrink-0", x.level > level && "opacity-60 grayscale")}>
            <LevelBadge level={x.level} size={34} />
          </span>
          <div className="min-w-0 flex-1">
            <LevelCard
              level={x.level}
              title={null}
              reached={x.level <= level}
              rewards={x.rewards}
              user={user}
              wallet={wallet}
              busy={busy === String(x.level)}
              disabled={busy !== null}
              onClaim={(open) => take(x.level, open)}
            />
          </div>
        </div>
      ))}
      <Link href={LEVELS_HREF} className="gu-btn gu-cream gu-btn-sm w-full">
        Level pass · all {all.length} rewards
        <HugeiconsIcon icon={ArrowRight01Icon} className="size-4" strokeWidth={2.4} />
      </Link>
    </div>
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
