"use client"

import * as React from "react"
import { LockIcon, RepeatIcon, Tick02Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { FilterPills } from "@/app/(dashboard)/_components/filter-pills"
import { Coins } from "@/components/fun/coin"
import { CharacterAction, Progress } from "@/components/game-avatar/character-action"
import { CharacterFill, TierChip } from "@/components/game-avatar/character-tile"
import { LevelRoad, LevelSummary, RewardThumb } from "@/components/game-avatar/level-road"
import {
  earnedBy,
  isForSale,
  isFree,
  ownsCharacter,
  rewardId,
  rewardName,
  rewardsOf,
  unclaimed,
  type Reward,
} from "@/components/game-avatar/ownership"
import { CHARACTERS } from "@/components/game-avatar/registry"
import { SignatureStickers } from "@/components/game-avatar/stickers/ui"
import { announceReward } from "@/components/rewards/reward-notice"
import type { CharacterDef } from "@/components/game-avatar/types"
import { BottomSheet } from "@/components/shared/bottom-sheet"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { useClaimReward } from "@/hooks/use-fun-mutations"
import { ACHIEVEMENTS, achievementProgress, type Achievement } from "@/lib/live/achievements"
import type { Wallet } from "@/lib/types"
import { cn } from "@/lib/utils"
import type { InventoryUser } from "./frames-tab"

export type CharacterFilter = "all" | "owned" | "store" | "earn"

const TIER_ORDER = { legend: 0, premium: 1, basic: 2 } as const

const FILTERS: { value: CharacterFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "owned", label: "Owned" },
  { value: "store", label: "Store" },
  { value: "earn", label: "Earn" },
]

/**
 * Game characters, like a store: the ones you have, the ones for coins, and
 * the ones you win. Each card idles; tap one to see its entrance, then use,
 * buy or see what unlocks it — the same button as the profile's picker.
 */
export function CharactersTab({
  user,
  wallet,
  filter,
  onFilter,
  characters = CHARACTERS,
}: {
  user: InventoryUser
  wallet: Wallet | null | undefined
  filter: CharacterFilter
  onFilter: (filter: CharacterFilter) => void
  characters?: CharacterDef[]
}) {
  const owned = wallet?.avatars
  const [picked, setPicked] = React.useState<CharacterDef | null>(null)
  const [open, setOpen] = React.useState(false)

  // Legends, then premium, then the free ones
  const list = [...characters].sort((a, b) => TIER_ORDER[a.tier] - TIER_ORDER[b.tier]).filter((c) =>
    filter === "owned"
      ? ownsCharacter(c, owned)
      : filter === "store"
        ? isForSale(c) && !ownsCharacter(c, owned)
        : filter === "earn"
          ? !!c.earn
          : true
  )
  const have = characters.filter((c) => ownsCharacter(c, owned)).length

  const openCharacter = (c: CharacterDef) => {
    setPicked(c)
    setOpen(true)
  }

  return (
    <div className="flex flex-col gap-4">
      <FilterPills aria-label="Show characters" value={filter} onValueChange={onFilter} options={FILTERS} />

      {filter === "earn" && <Levels user={user} wallet={wallet} characters={characters} />}
      {filter === "earn" && <Rewards user={user} wallet={wallet} characters={characters} />}

      <section className="flex flex-col gap-2.5">
        <div className="flex items-baseline justify-between gap-2 px-1">
          <h3 className="text-sm font-semibold">
            {filter === "earn" ? "Characters to win" : filter === "store" ? "For coins" : "Characters"}
          </h3>
          <span className="text-xs text-muted-foreground tabular-nums">
            {have} of {characters.length} owned
          </span>
        </div>
        {list.length ? (
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            {list.map((c) => (
              <CharacterCard
                key={c.id}
                def={c}
                owned={ownsCharacter(c, owned)}
                wearing={user.gameAvatar === c.id}
                wallet={wallet}
                onClick={() => openCharacter(c)}
              />
            ))}
          </div>
        ) : (
          <p className="rounded-xl border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
            {filter === "store"
              ? "You have every character that's for sale."
              : filter === "earn"
                ? "Characters to win are on their way."
                : "No characters yet."}
          </p>
        )}
      </section>

      <p className="px-1 text-center text-xs text-muted-foreground">
        Your character is who you are in live games — your photo stays for splits, groups and friends.
      </p>

      {picked && (
        <CharacterSheet
          def={picked}
          open={open}
          onOpenChange={setOpen}
          wallet={wallet}
          wearing={user.gameAvatar === picked.id}
        />
      )}
    </div>
  )
}

function CharacterCard({
  def,
  owned,
  wearing,
  wallet,
  onClick,
}: {
  def: CharacterDef
  owned: boolean
  wearing: boolean
  wallet: Wallet | null | undefined
  onClick: () => void
}) {
  const achievement = earnedBy(def)
  const progress = achievement ? achievementProgress(wallet, achievement) : null
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${def.name}, ${def.tier} character`}
      className={cn(
        "flex min-w-0 flex-col overflow-hidden rounded-xl border border-card-stroke bg-card text-left shadow-xs transition-[background-color,transform] [contain-intrinsic-height:auto_12rem] [content-visibility:auto] hover:bg-subtle-hover active:scale-[0.98]",
        wearing && "border-primary ring-2 ring-primary/20"
      )}
    >
      <div className="relative p-1.5 pb-0">
        {/* Not yours yet: soft and muted (tap for the full-colour preview) */}
        <CharacterFill
          def={def}
          mode={owned && def.tier !== "basic" ? "idle" : "still"}
          className={cn("rounded-[10px] transition-[filter,opacity]", !owned && "opacity-60 saturate-[.35]")}
        />
        {wearing && (
          <span className="absolute top-3 right-3 flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground shadow-sm">
            <HugeiconsIcon icon={Tick02Icon} className="size-3" />
            In use
          </span>
        )}
        {def.tier !== "basic" && <TierChip def={def} className="absolute top-3 left-3 shadow-sm" />}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5 px-2.5 pt-2 pb-2.5">
        <p className="truncate text-sm font-semibold">{def.name}</p>
        <p className="line-clamp-2 text-[11px] leading-snug text-muted-foreground">{def.tagline}</p>
        <div className="mt-auto pt-1.5 text-xs">
          {owned ? (
            <span className="font-medium text-muted-foreground">{isFree(def) ? "Free" : "Owned"}</span>
          ) : achievement && progress?.done ? (
            <span className="font-semibold text-amber-600 dark:text-amber-400">Ready to claim</span>
          ) : isForSale(def) ? (
            <Coins amount={def.price} iconClassName="size-3.5" />
          ) : achievement ? (
            <span className="inline-flex items-center gap-1 font-medium text-muted-foreground">
              <HugeiconsIcon icon={LockIcon} className="size-3.5" />
              {achievement.how}
            </span>
          ) : null}
        </div>
      </div>
    </button>
  )
}

/** One character, big, playing its entrance (tap to replay), with use / buy / what unlocks it. */
export function CharacterSheet({
  def,
  open,
  onOpenChange,
  wallet,
  wearing,
}: {
  def: CharacterDef
  open: boolean
  onOpenChange: (open: boolean) => void
  wallet: Wallet | null | undefined
  wearing: boolean
}) {
  const [replay, setReplay] = React.useState(0)
  const owned = ownsCharacter(def, wallet?.avatars)
  return (
    <BottomSheet
      className="gu"
      open={open}
      onOpenChange={onOpenChange}
      title={def.name}
      description={
        <span className="inline-flex items-center gap-1.5">
          Your coins: <Coins amount={wallet?.balance ?? 0} iconClassName="size-3.5" />
        </span>
      }
      footer={<CharacterAction def={def} wallet={wallet} wearing={wearing} onWorn={() => onOpenChange(false)} />}
    >
      <div className="flex flex-col gap-3 pb-3">
        <button
          type="button"
          onClick={() => setReplay((n) => n + 1)}
          aria-label={`Play ${def.name}'s entrance again`}
          className="relative mx-auto w-full max-w-[min(100%,34svh,15rem)] rounded-[22%] transition-transform active:scale-[0.98]"
        >
          <CharacterFill key={def.id} def={def} mode="intro" replay={replay} className="shadow-lg" />
          <span className="absolute right-3 bottom-3 flex size-8 items-center justify-center rounded-full bg-black/45 text-white">
            <HugeiconsIcon icon={RepeatIcon} className="size-4" />
          </span>
        </button>

        <div className="flex items-start justify-between gap-3 px-1 pt-1">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-base font-semibold">
              <span className="truncate">{def.name}</span>
              <TierChip def={def} />
            </p>
            <p className="text-xs text-muted-foreground">{def.tagline}</p>
          </div>
          <span className="shrink-0 pt-0.5 text-sm">
            {owned ? (
              <span className="text-xs font-medium text-muted-foreground">{isFree(def) ? "Free" : "Owned"}</span>
            ) : isForSale(def) ? (
              <Coins amount={def.price} iconClassName="size-4" />
            ) : null}
          </span>
        </div>

        <SignatureStickers def={def} />
      </div>
    </BottomSheet>
  )
}

/** Your level, what's ready to claim and the next level rewards, with the whole road a tap away. */
function Levels({
  user,
  wallet,
  characters,
}: {
  user: InventoryUser
  wallet: Wallet | null | undefined
  characters: CharacterDef[]
}) {
  return (
    <section className="flex flex-col gap-2.5">
      <div className="flex items-baseline justify-between gap-2 px-1">
        <h3 className="text-sm font-semibold">Levels</h3>
        <span className="text-xs text-muted-foreground">XP from every live game</span>
      </div>
      <LevelSummary wallet={wallet} className="rounded-xl border border-card-stroke bg-card px-3.5 py-3 shadow-xs" />
      <LevelRoad user={user} wallet={wallet} characters={characters} />
    </section>
  )
}

/**
 * Live-game achievements with what each gives (a frame, characters), how far
 * you are, and Claim for those reached — the same rewards the result screen
 * pops up at the end of the game that reached them.
 */
function Rewards({
  user,
  wallet,
  characters,
}: {
  user: InventoryUser
  wallet: Wallet | null | undefined
  characters: CharacterDef[]
}) {
  return (
    <section className="flex flex-col gap-2.5">
      <div className="flex items-baseline justify-between gap-2 px-1">
        <h3 className="text-sm font-semibold">Achievements</h3>
        <span className="text-xs text-muted-foreground">Won in live games</span>
      </div>
      <div className="flex flex-col divide-y overflow-hidden rounded-xl border border-card-stroke bg-card shadow-xs">
        {ACHIEVEMENTS.map((a) => (
          <AchievementRow key={a.id} achievement={a} user={user} wallet={wallet} rewards={rewardsOf(a, characters)} />
        ))}
      </div>
    </section>
  )
}

function AchievementRow({
  achievement,
  user,
  wallet,
  rewards,
}: {
  achievement: Achievement
  user: InventoryUser
  wallet: Wallet | null | undefined
  rewards: Reward[]
}) {
  const claim = useClaimReward()
  const [claiming, setClaiming] = React.useState<string | null>(null)
  const p = achievementProgress(wallet, achievement)
  const open = new Set(unclaimed(rewards, wallet).map(rewardId))

  const take = (r: Reward, button: HTMLElement) => {
    // Where the coins burst from (the button turns into a tick once it's claimed)
    const from = button.getBoundingClientRect()
    setClaiming(rewardId(r))
    claim.mutate(
      { achievement: achievement.id, kind: r.kind, id: rewardId(r) },
      {
        onSuccess: () => announceReward(r, { from }),
        onSettled: () => setClaiming(null),
      }
    )
  }

  return (
    <div className="flex flex-col gap-2 px-3.5 py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{achievement.title.replace(/!$/, "")}</p>
          <p className="text-xs text-muted-foreground">{achievement.how}</p>
        </div>
        {p.done && open.size === 0 && (
          <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
            <HugeiconsIcon icon={Tick02Icon} className="size-3.5" />
            Claimed
          </span>
        )}
      </div>
      {!p.done && <Progress value={p.value} goal={p.goal} />}
      <div className="flex flex-wrap gap-2">
        {rewards.map((r) => {
          const id = rewardId(r)
          const ready = p.done && open.has(id)
          return (
            <div key={id} className="flex min-w-0 items-center gap-2 rounded-lg bg-muted/60 py-1 pr-1.5 pl-1">
              <RewardThumb reward={r} user={user} />
              <span className="truncate text-xs font-medium">{rewardName(r)}</span>
              {ready ? (
                <Button size="xs" onClick={(e) => take(r, e.currentTarget)} disabled={claim.isPending}>
                  {claiming === id ? <Spinner /> : "Claim"}
                </Button>
              ) : !open.has(id) ? (
                <HugeiconsIcon icon={Tick02Icon} className="size-3.5 text-emerald-600 dark:text-emerald-400" aria-label="Yours" />
              ) : (
                <HugeiconsIcon icon={LockIcon} className="size-3.5 text-muted-foreground" aria-label="Locked" />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

