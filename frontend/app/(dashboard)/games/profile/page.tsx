"use client"

import * as React from "react"
import Link from "next/link"
import { ArrowRight01Icon, Image01Icon, LockIcon, PencilEdit02Icon, Tick02Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { Coins } from "@/components/fun/coin"
import { FramedAvatar } from "@/components/fun/framed-avatar"
import { CharacterTile } from "@/components/game-avatar/character-tile"
import { GameAvatar } from "@/components/game-avatar/game-avatar"
import { LevelBadge } from "@/components/game-avatar/level-badge"
import { LEVELS_HREF, LevelSummary, RewardThumb, claimableLevelRewards } from "@/components/game-avatar/level-road"
import { earnedBy, isForSale, levelRewards, ownsCharacter } from "@/components/game-avatar/ownership"
import { CHARACTERS, characterById } from "@/components/game-avatar/registry"
import type { CharacterDef } from "@/components/game-avatar/types"
import { GameChoice, GameIconButton, GameScreen, GameSectionTitle, GameTopBar } from "@/components/game-ui/kit"
import { GameCoinChip } from "@/components/game-nav/coin-chip"
import { GameNavSpacer, useGameTabBack } from "@/components/game-nav/game-bottom-nav"
import { GAME_ROUTES } from "@/components/game-nav/items"
import { useSession } from "@/components/providers/session-provider"
import { gameToast } from "@/components/rewards/reward-notice"
import { Spinner } from "@/components/ui/spinner"
import { useWallet } from "@/hooks/use-fun"
import { useEquipFrame, useSetGameAvatar } from "@/hooks/use-fun-mutations"
import { FRAME_IDS, FRAMES, isFrameId, ownsFrame, type FrameId } from "@/lib/fun/catalog"
import { gameNameOf } from "@/lib/game-name"
import { achievementProgress } from "@/lib/live/achievements"
import { levelInfo } from "@/lib/live/levels"
import type { UserProfile, Wallet } from "@/lib/types"
import { cn } from "@/lib/utils"
import { CharacterSheet } from "../inventory/_components/characters-tab"
import { GameNameDialog } from "./_components/game-name-dialog"

const TIER_ORDER = { legend: 0, premium: 1, basic: 2 } as const
const fmt = new Intl.NumberFormat("en-IN")

/**
 * Your game profile, on the Games side: who you are in games — your
 * character (big, idling, with your frame and level crest), your game name
 * (separate from your Split name), then pick a character, a frame, and the
 * way to the level map. Your Split profile (/profile) stays about money.
 */
export default function GameProfilePage() {
  const { user } = useSession()
  const wallet = useWallet()
  const back = useGameTabBack()
  const [naming, setNaming] = React.useState(false)
  const [sheet, setSheet] = React.useState<{ def: CharacterDef; open: boolean } | null>(null)

  if (!user) return null
  const def = characterById(user.gameAvatar)
  const openCharacter = (c: CharacterDef) => setSheet({ def: c, open: true })

  return (
    <GameScreen>
      <GameTopBar title="Profile" subtitle="You in games" onBack={back} right={<GameCoinChip />} />
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 pt-2 pb-4">
        <Hero user={user} wallet={wallet} def={def} onRename={() => setNaming(true)} onCharacter={openCharacter} />
        <LevelCard user={user} wallet={wallet} />
        <CharacterPicker user={user} wallet={wallet} onOpen={openCharacter} />
        <FramePicker user={user} wallet={wallet} />
      </div>
      <GameNavSpacer />

      <GameNameDialog open={naming} onClose={() => setNaming(false)} user={user} />
      {sheet && (
        <CharacterSheet
          def={sheet.def}
          open={sheet.open}
          onOpenChange={(open) => setSheet((s) => (s ? { ...s, open } : s))}
          wallet={wallet}
          wearing={user.gameAvatar === sheet.def.id}
        />
      )}
    </GameScreen>
  )
}

type ProfileUser = Pick<UserProfile, "uid" | "displayName" | "gameName" | "photoURL" | "frame" | "gameAvatar">

/** You as a player: the character big, your game name (tap the pencil to change it), level and record. */
function Hero({
  user,
  wallet,
  def,
  onRename,
  onCharacter,
}: {
  user: ProfileUser
  wallet: Wallet | null | undefined
  def: CharacterDef | undefined
  onRename: () => void
  onCharacter: (def: CharacterDef) => void
}) {
  const info = levelInfo(wallet)
  const played = wallet?.livePlayed ?? 0
  const wins = wallet?.liveWins ?? 0
  return (
    <section className="gu-panel mt-1">
      <div
        className="flex flex-col items-center gap-2 rounded-[26px] px-4 pt-5 pb-4 text-center"
        style={def ? { backgroundImage: `radial-gradient(80% 70% at 50% 0%, ${def.accent}40, transparent 70%)` } : undefined}
      >
        <button
          type="button"
          onClick={() => def && onCharacter(def)}
          disabled={!def}
          aria-label={def ? `${def.name}: see the entrance` : "Your photo"}
          className="relative p-5 transition-transform active:scale-95 disabled:active:scale-100"
        >
          <GameAvatar
            character={user.gameAvatar}
            photo={user.photoURL}
            name={gameNameOf(user)}
            frame={user.frame}
            size={104}
            mode="idle"
          />
          {wallet ? <LevelBadge level={info.level} size={36} className="absolute bottom-1 left-1/2 -translate-x-1/2" /> : null}
        </button>

        <div className="flex max-w-full items-center gap-2 pl-10">
          <h1 className="min-w-0 truncate text-2xl leading-tight font-bold">{gameNameOf(user)}</h1>
          <GameIconButton icon={PencilEdit02Icon} label="Change game name" tone="cream" size="sm" onClick={onRename} />
        </div>
        <p className="-mt-1 text-xs font-bold text-[var(--gu-brown)]">
          {def ? def.name : "Your photo"}
          {wallet ? ` · Level ${info.level} ${info.title}` : ""}
        </p>
        {!user.gameName?.trim() && (
          <button type="button" onClick={onRename} className="text-xs font-bold text-[var(--gu-blue-deep)] underline underline-offset-2">
            Using your Split name — pick a game name
          </button>
        )}

        <div className="mt-1 grid w-full max-w-xs grid-cols-3 gap-2">
          <Stat value={fmt.format(played)} label="Played" />
          <Stat value={fmt.format(wins)} label="Wins" />
          <Stat value={played ? `${Math.round((wins / played) * 100)}%` : "–"} label="Win rate" />
        </div>
      </div>
    </section>
  )
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="gu-well flex flex-col items-center px-1 py-1.5">
      <span className="text-base leading-tight font-bold tabular-nums">{value}</span>
      <span className="text-[10px] font-bold tracking-wide text-[var(--gu-brown)] uppercase">{label}</span>
    </div>
  )
}

/** Your level, the next reward on the road, and the way to the whole level map. */
function LevelCard({ user, wallet }: { user: ProfileUser; wallet: Wallet | null | undefined }) {
  const { level } = levelInfo(wallet)
  const next = levelRewards().find((x) => x.level > level)
  const ready = claimableLevelRewards(wallet)
  return (
    <section className="flex flex-col gap-3">
      <GameSectionTitle
        action={
          <Link href={LEVELS_HREF} className="gu-chip h-8 !px-3 text-xs active:translate-y-px">
            Level map
            <HugeiconsIcon icon={ArrowRight01Icon} className="size-3.5" strokeWidth={2.6} />
          </Link>
        }
      >
        Level
      </GameSectionTitle>
      <Link href={LEVELS_HREF} className="gu-panel-flat flex flex-col gap-3 p-3.5 active:translate-y-px">
        <LevelSummary wallet={wallet} />
        {ready > 0 ? (
          <span className="gu-btn gu-yellow gu-btn-sm w-full">{ready} reward{ready === 1 ? "" : "s"} to claim</span>
        ) : next ? (
          <span className="flex items-center gap-2 rounded-2xl bg-[var(--gu-cream-2)] px-2.5 py-1.5">
            <span className="shrink-0 text-xs font-bold text-[var(--gu-brown)]">Next at Lv {next.level}</span>
            <span className="flex min-w-0 flex-1 items-center gap-1 overflow-hidden">
              {next.rewards.map((r) => (
                <RewardThumb key={r.kind === "character" ? r.def.id : r.kind === "frame" ? r.frame : "coins"} reward={r} user={user} />
              ))}
            </span>
            <HugeiconsIcon icon={ArrowRight01Icon} className="size-4 shrink-0 text-[var(--gu-ink-soft)]" strokeWidth={2.4} />
          </span>
        ) : null}
      </Link>
    </section>
  )
}

/**
 * Who you play as: your photo, or any character. Yours put on with a tap;
 * the locked ones open the character with how to get it (price, or what
 * unlocks it and how far you are).
 */
function CharacterPicker({
  user,
  wallet,
  onOpen,
}: {
  user: ProfileUser
  wallet: Wallet | null | undefined
  onOpen: (def: CharacterDef) => void
}) {
  const wear = useSetGameAvatar()
  const [pending, setPending] = React.useState<string | null>(null)
  const owned = wallet?.avatars
  // Yours first, then legends, premium, the free ones
  const list = [...CHARACTERS].sort(
    (a, b) =>
      Number(ownsCharacter(b, owned)) - Number(ownsCharacter(a, owned)) || TIER_ORDER[a.tier] - TIER_ORDER[b.tier]
  )
  const have = CHARACTERS.filter((c) => ownsCharacter(c, owned)).length

  const pick = (id: string | null) => {
    if ((user.gameAvatar || null) === id) return
    setPending(id ?? "photo")
    wear.mutate(
      { id, owned },
      {
        onSuccess: () => {
          const def = characterById(id)
          gameToast(def ? { title: `You're ${def.name} in games now`, art: { character: def } } : { title: "Your photo is back in games" })
        },
        onSettled: () => setPending(null),
      }
    )
  }

  return (
    <section className="flex flex-col gap-3">
      <GameSectionTitle
        count={have}
        action={
          <Link href={`${GAME_ROUTES.inventory}#characters`} className="gu-chip h-8 !px-3 text-xs active:translate-y-px">
            Store
            <HugeiconsIcon icon={ArrowRight01Icon} className="size-3.5" strokeWidth={2.6} />
          </Link>
        }
      >
        Character
      </GameSectionTitle>
      <div className="gu-panel-flat grid grid-cols-4 gap-x-2.5 gap-y-3.5 p-3 sm:grid-cols-6" role="radiogroup" aria-label="Character">
        <Tile on={!characterById(user.gameAvatar)} label="Photo" busy={pending === "photo"} onClick={() => pick(null)}>
          {user.photoURL ? (
            <FramedAvatar src={user.photoURL} name={user.displayName} size={52} />
          ) : (
            <span className="flex size-[52px] items-center justify-center rounded-full bg-[var(--gu-cream-2)] text-[var(--gu-ink-soft)]">
              <HugeiconsIcon icon={Image01Icon} className="size-5" />
            </span>
          )}
        </Tile>
        {list.map((c) => {
          const mine = ownsCharacter(c, owned)
          return (
            <Tile
              key={c.id}
              on={user.gameAvatar === c.id}
              label={c.name}
              busy={pending === c.id}
              locked={!mine}
              hint={mine ? undefined : <LockHint def={c} wallet={wallet} />}
              onClick={() => (mine ? pick(c.id) : onOpen(c))}
            >
              <CharacterTile def={c} size={52} />
            </Tile>
          )
        })}
      </div>
      <p className="px-1 text-center text-xs font-semibold text-white [text-shadow:0_1px_0_rgba(20,40,110,.35)]">
        Tap a locked one to see how to get it. Your photo stays for Split.
      </p>
    </section>
  )
}

/** Under a locked character: its price, or that it's earned (and ready to claim). */
function LockHint({ def, wallet }: { def: CharacterDef; wallet: Wallet | null | undefined }) {
  const achievement = earnedBy(def)
  const progress = achievement ? achievementProgress(wallet, achievement) : null
  if (progress?.done) return <span className="font-bold text-[var(--gu-orange-deep)]">Claim!</span>
  if (isForSale(def)) return <Coins amount={def.price} className="text-[10px] font-bold" iconClassName="size-3" />
  if (def.earn?.level) return <span className="font-bold text-[var(--gu-purple-deep)]">Lv {def.earn.level}</span>
  return <span className="font-bold text-[var(--gu-purple-deep)]">Earn</span>
}

/** Frames you own, tried on your game look: tap one to wear it (or none). */
function FramePicker({ user, wallet }: { user: ProfileUser; wallet: Wallet | null | undefined }) {
  const equip = useEquipFrame()
  const [pending, setPending] = React.useState<string | null>(null)
  const owned = wallet?.frames ?? []
  const mine = FRAME_IDS.filter((id) => ownsFrame(id, owned))
  const wearing = isFrameId(user.frame) ? user.frame : null

  const pick = (frame: FrameId | null) => {
    if (frame === wearing) return
    setPending(frame ?? "none")
    equip.mutate(
      { frame, owned },
      {
        onSuccess: () =>
          gameToast(frame ? { title: `${FRAMES[frame].name} on`, art: { frame } } : { title: "Frame off" }),
        onSettled: () => setPending(null),
      }
    )
  }

  return (
    <section className="flex flex-col gap-3">
      <GameSectionTitle
        count={mine.length}
        action={
          <Link href={`${GAME_ROUTES.inventory}#frames`} className="gu-chip h-8 !px-3 text-xs active:translate-y-px">
            Get more
            <HugeiconsIcon icon={ArrowRight01Icon} className="size-3.5" strokeWidth={2.6} />
          </Link>
        }
      >
        Frame
      </GameSectionTitle>
      <div className="gu-panel-flat grid grid-cols-3 gap-x-2.5 gap-y-3.5 p-3 min-[400px]:grid-cols-4 sm:grid-cols-5" role="radiogroup" aria-label="Frame">
        <Tile on={!wearing} label="None" busy={pending === "none"} onClick={() => pick(null)} padded>
          <GameAvatar character={user.gameAvatar} photo={user.photoURL} name={user.displayName} size={44} />
        </Tile>
        {mine.map((id) => (
          <Tile key={id} on={wearing === id} label={FRAMES[id].name} busy={pending === id} onClick={() => pick(id)} padded>
            <GameAvatar character={user.gameAvatar} photo={user.photoURL} name={user.displayName} frame={id} size={44} />
          </Tile>
        ))}
      </div>
    </section>
  )
}

/** A pickable tile (character or frame): ticked when on, dimmed with a lock when not yours. */
function Tile({
  on,
  label,
  busy,
  locked,
  hint,
  padded,
  onClick,
  children,
}: {
  on: boolean
  label: string
  busy?: boolean
  locked?: boolean
  hint?: React.ReactNode
  /** Room around the art for a frame's ornaments. */
  padded?: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <GameChoice
      role="radio"
      selected={on}
      onClick={onClick}
      aria-label={locked ? `${label}, locked` : label}
      className={cn("flex min-w-0 flex-col items-center gap-1 px-1 pt-2 pb-1.5", locked && "!bg-[#f1ece2]")}
    >
      <span className={cn("relative flex items-center justify-center", padded && "p-3")}>
        <span className={cn("transition-[filter,opacity]", locked && "opacity-60 saturate-[.35]")}>{children}</span>
        {locked && (
          <span className="absolute -right-1 -bottom-1 flex size-5 items-center justify-center rounded-full bg-[#7d77b0] text-white shadow-[0_0_0_2px_#fff]">
            <HugeiconsIcon icon={LockIcon} className="size-3" strokeWidth={2.4} />
          </span>
        )}
        {on && (
          <span className="absolute -top-1 -right-1 flex size-5 items-center justify-center rounded-full bg-[var(--gu-green)] text-white shadow-[0_0_0_2px_#fff]">
            <HugeiconsIcon icon={Tick02Icon} className="size-3" strokeWidth={3} />
          </span>
        )}
        {busy && (
          <span className="absolute inset-0 flex items-center justify-center rounded-full bg-white/60">
            <Spinner className="size-5" />
          </span>
        )}
      </span>
      <span className="w-full truncate text-center text-[11px] leading-tight font-bold">{label}</span>
      {hint ? <span className="-mt-0.5 flex h-3.5 items-center text-[10px] leading-none">{hint}</span> : null}
    </GameChoice>
  )
}
