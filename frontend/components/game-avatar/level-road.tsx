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
import { MAX_LEVEL, XP_PLAY, XP_WIN, levelInfo, levelTitle } from "@/lib/live/levels"
import type { Wallet } from "@/lib/types"
import { cn } from "@/lib/utils"
import { CharacterTile } from "./character-tile"
import { GameAvatar } from "./game-avatar"
import { LevelBadge, XpBar } from "./level-badge"
import { levelRewards, rewardId, rewardName, unclaimed, type Reward } from "./ownership"
import { CHARACTERS } from "./registry"
import type { CharacterDef } from "./types"

/*
 * Levels in the game theme (components/game-ui): the summary card, the level
 * map (every level on a winding road, rewards beside the ones that give
 * something) and a short list of what's next. Everything here sits on the
 * Games side's sky or cream panels.
 */

type RoadUser = { displayName: string; photoURL?: string; gameAvatar?: string; frame?: string }
type RoadWallet = Wallet | null | undefined

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

/** Claims every reward of a level still waiting, one after the other. */
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

function useClaimLevel() {
  const claim = useClaimReward()
  const [busy, setBusy] = React.useState<number | null>(null)
  const take = async (level: number, rewards: Reward[]) => {
    // Where the coins burst from: the Claim just pressed (the focused button, or —
    // Safari doesn't focus on tap — the spot last pressed)
    const pressed =
      document.activeElement instanceof HTMLButtonElement ? document.activeElement.getBoundingClientRect() : lastPress ?? undefined
    setBusy(level)
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

/* ── The level map ───────────────────────────────────────────────────── */

/** Where a level's stop sits across the map (% of the width): a gentle winding road. */
const xOf = (level: number) => 50 + 28 * Math.sin((level - 1) * 0.8)

/**
 * Every level, 1 at the bottom up to the Legend at the top, on a winding road
 * like a game's level map: the road is lit gold up to where you are, your
 * character stands on your level, levels above are dimmed, and the ones that
 * give something show their rewards beside the stop — with Claim when ready.
 * Opens scrolled to where you are.
 */
export function LevelMap({
  user,
  wallet,
  characters = CHARACTERS,
}: {
  user: RoadUser
  wallet: RoadWallet
  characters?: CharacterDef[]
}) {
  const { level } = levelInfo(wallet)
  const rewards = React.useMemo(() => new Map(levelRewards(characters).map((x) => [x.level, x.rewards])), [characters])
  const levels = Array.from({ length: MAX_LEVEL }, (_, i) => MAX_LEVEL - i)
  const here = React.useRef<HTMLDivElement>(null)
  const { take, busy } = useClaimLevel()

  React.useEffect(() => {
    here.current?.scrollIntoView({ block: "center" })
  }, [])

  return (
    <ol className="relative flex flex-col" aria-label="Level map">
      {levels.map((lv) => (
        <MapStop
          key={lv}
          ref={lv === level ? here : undefined}
          level={lv}
          current={lv === level}
          reached={lv <= level}
          aboveLit={lv + 1 <= level}
          rewards={rewards.get(lv)}
          user={user}
          wallet={wallet}
          busy={busy === lv}
          disabled={busy !== null}
          onClaim={(open) => take(lv, open)}
        />
      ))}
    </ol>
  )
}

function MapStop({
  ref,
  level,
  current,
  reached,
  aboveLit,
  rewards,
  user,
  wallet,
  busy,
  disabled,
  onClaim,
}: {
  ref?: React.Ref<HTMLDivElement>
  level: number
  current: boolean
  reached: boolean
  /** The road up to the next level is lit (you're past this one). */
  aboveLit: boolean
  rewards: Reward[] | undefined
  user: RoadUser
  wallet: RoadWallet
  busy: boolean
  disabled: boolean
  onClaim: (open: Reward[]) => void
}) {
  const x = xOf(level)
  const top = level < MAX_LEVEL ? (xOf(level + 1) + x) / 2 : null
  const bottom = level > 1 ? (xOf(level - 1) + x) / 2 : null
  const cardLeft = x >= 50
  const title = level === 1 || levelTitle(level) !== levelTitle(level - 1) ? levelTitle(level) : null

  return (
    <li className="relative flex items-center" style={{ minHeight: rewards ? 136 : 86 }}>
      {/* The road through this stop: half from the stop above, half down to the one below */}
      <svg
        aria-hidden
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="pointer-events-none absolute inset-0 size-full overflow-visible"
      >
        {top !== null && <Road x1={top} y1={0} x2={x} y2={50} lit={aboveLit} />}
        {bottom !== null && <Road x1={x} y1={50} x2={bottom} y2={100} lit={reached} />}
      </svg>

      {/* The stop */}
      <div
        ref={ref}
        className="absolute top-1/2 z-20 -translate-x-1/2 -translate-y-1/2 scroll-my-40"
        style={{ left: `${x}%` }}
      >
        <span
          className={cn(
            "relative flex items-center justify-center rounded-full",
            current
              ? "size-[74px] bg-[linear-gradient(180deg,#fff3b0,#ffcd3c)] shadow-[0_0_0_4px_#fff,0_6px_0_4px_#d99a0b,0_0_0_14px_rgba(255,205,60,.35),0_12px_22px_rgba(20,30,90,.3)]"
              : reached
                ? "size-[58px] bg-[var(--gu-cream)] shadow-[0_0_0_4px_#fff,0_5px_0_4px_#d99a0b,0_10px_16px_rgba(20,30,90,.22)]"
                : "size-[58px] bg-[#e6e3f5] shadow-[0_0_0_4px_rgba(255,255,255,.7),0_5px_0_4px_#9a93c9]"
          )}
        >
          <span className={cn(!reached && "opacity-60 grayscale")}>
            <LevelBadge level={level} size={current ? 40 : 32} />
          </span>
          {!reached && (
            <span className="absolute -right-1 -bottom-1 flex size-6 items-center justify-center rounded-full bg-[#7d77b0] text-white shadow-[0_0_0_2.5px_#fff]">
              <HugeiconsIcon icon={LockIcon} className="size-3.5" strokeWidth={2.4} />
            </span>
          )}
          {/* You, standing on your level */}
          {current && (
            <span className="absolute -top-12 left-1/2 flex -translate-x-1/2 flex-col items-center">
              <GameAvatar
                character={user.gameAvatar}
                photo={user.photoURL}
                name={user.displayName}
                frame={user.frame}
                size={40}
                mode="idle"
              />
            </span>
          )}
        </span>
        {current && (
          <span className="gu-chip absolute -bottom-7 left-1/2 -translate-x-1/2 !bg-[var(--gu-ink)] !py-0 text-[11px] leading-5 !text-white">
            YOU
          </span>
        )}
        {level === 1 && !current && (
          <span className="gu-chip absolute -bottom-7 left-1/2 -translate-x-1/2 !py-0 text-[11px] leading-5">START</span>
        )}
      </div>

      {/* What this level gives, beside the stop */}
      {rewards ? (
        <div
          className="relative z-10 w-full py-2"
          style={cardLeft ? { paddingRight: `calc(${100 - x}% + 46px)`, paddingLeft: 4 } : { paddingLeft: `calc(${x}% + 46px)`, paddingRight: 4 }}
        >
          <LevelCard
            level={level}
            title={title}
            reached={reached}
            rewards={rewards}
            user={user}
            wallet={wallet}
            busy={busy}
            disabled={disabled}
            onClaim={onClaim}
          />
        </div>
      ) : title ? (
        <span
          className={cn(
            "gu-chip absolute top-1/2 z-10 -translate-y-1/2 text-[11px]",
            cardLeft ? "right-[calc(var(--x)+46px)]" : "left-[calc(var(--x)+46px)]"
          )}
          style={{ "--x": cardLeft ? `${100 - x}%` : `${x}%` } as React.CSSProperties}
        >
          {title}
        </span>
      ) : null}
    </li>
  )
}

/** A piece of the road: a thick band (gold where you've been) with a darker edge. */
function Road({ x1, y1, x2, y2, lit }: { x1: number; y1: number; x2: number; y2: number; lit: boolean }) {
  const d = `M${x1} ${y1} L${x2} ${y2}`
  return (
    <>
      <path d={d} stroke={lit ? "#d99a0b" : "rgba(44,63,115,.22)"} strokeWidth={22} strokeLinecap="round" fill="none" vectorEffect="non-scaling-stroke" />
      <path d={d} stroke={lit ? "#ffcd3c" : "rgba(255,255,255,.55)"} strokeWidth={15} strokeLinecap="round" fill="none" vectorEffect="non-scaling-stroke" />
    </>
  )
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
        {!reached ? (
          <HugeiconsIcon icon={LockIcon} className="size-4 shrink-0 text-[var(--gu-ink-soft)]" aria-label="Locked" />
        ) : open.length === 0 ? (
          <span className="flex shrink-0 items-center gap-0.5 text-[11px] font-bold text-[var(--gu-green-deep)]">
            <HugeiconsIcon icon={Tick02Icon} className="size-3.5" strokeWidth={2.6} />
            Got it
          </span>
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
    ...all.filter((x) => x.level > level).slice(0, 2),
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
              busy={busy === x.level}
              disabled={busy !== null}
              onClaim={(open) => take(x.level, open)}
            />
          </div>
        </div>
      ))}
      <Link href={LEVELS_HREF} className="gu-btn gu-cream gu-btn-sm w-full">
        Level map · all {all.length} rewards
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
