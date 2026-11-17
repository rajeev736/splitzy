"use client"

import * as React from "react"
import Link from "next/link"
import { ArrowRight01Icon, Image01Icon, RepeatIcon, Tick02Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { toast } from "sonner"

import { FramedAvatar } from "@/components/fun/framed-avatar"
import { CharacterTile, TierChip } from "@/components/game-avatar/character-tile"
import { GameAvatar } from "@/components/game-avatar/game-avatar"
import { LevelBadge, XpBar } from "@/components/game-avatar/level-badge"
import { LevelRoadSheet, claimableLevelRewards } from "@/components/game-avatar/level-road"
import { ownsCharacter } from "@/components/game-avatar/ownership"
import { CHARACTERS, characterById } from "@/components/game-avatar/registry"
import type { CharacterDef } from "@/components/game-avatar/types"
import { BottomSheet } from "@/components/shared/bottom-sheet"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { useSetGameAvatar } from "@/hooks/use-fun-mutations"
import { levelInfo } from "@/lib/live/levels"
import type { UserProfile, Wallet } from "@/lib/types"
import { cn } from "@/lib/utils"

type ProfileUser = Pick<UserProfile, "displayName" | "photoURL" | "frame" | "gameAvatar">

/**
 * Your game profile on the Profile page: the character you are in live games
 * (big, idling) wearing your level crest, with "Change" opening the picker;
 * under it your level, its title and XP, and the way to the levels road.
 * Your photo stays for splits, groups and friends.
 */
export function GameProfileCard({ user, wallet }: { user: ProfileUser; wallet: Wallet | null | undefined }) {
  const [open, setOpen] = React.useState(false)
  const [road, setRoad] = React.useState(false)
  const def = characterById(user.gameAvatar)
  const info = levelInfo(wallet)
  const ready = claimableLevelRewards(wallet)
  return (
    <>
      <div
        className="overflow-hidden rounded-xl border border-card-stroke bg-card shadow-xs"
        style={def ? { backgroundImage: `radial-gradient(120% 140% at 0% 30%, ${def.accent}33, transparent 60%)` } : undefined}
      >
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex w-full items-center gap-3.5 px-4 pt-3 pb-2 text-left transition-colors hover:bg-muted/40"
        >
          {/* Room for the frame's ornaments around the tile, and the crest under it */}
          <span className="relative shrink-0 p-2">
            <GameAvatar
              character={user.gameAvatar}
              photo={user.photoURL}
              name={user.displayName}
              frame={user.frame}
              size={64}
              mode="idle"
            />
            {wallet && <LevelBadge level={info.level} size={26} className="absolute bottom-0 left-1/2 -translate-x-1/2" />}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-xs text-muted-foreground">Game profile</span>
            <span className="block truncate text-base leading-tight font-semibold">{def ? def.name : "Your photo"}</span>
            <span className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
              {def ? def.tagline : "Pick a character to play as in live games"}
            </span>
          </span>
          <span className="shrink-0 text-xs font-medium text-primary">Change</span>
        </button>

        {wallet && (
          <button
            type="button"
            onClick={() => setRoad(true)}
            className="flex w-full items-center gap-3 border-t border-card-stroke/70 px-4 py-2.5 text-left transition-colors hover:bg-muted/40"
          >
            <span className="min-w-0 flex-1">
              <span className="flex items-baseline justify-between gap-2 text-xs">
                <span className="truncate font-semibold">
                  Lv {info.level} · <span className="text-amber-600 dark:text-amber-400">{info.title}</span>
                </span>
                <span className="shrink-0 text-muted-foreground tabular-nums">
                  {info.max ? "Max level" : `${fmt.format(info.into)} / ${fmt.format(info.need)} XP`}
                </span>
              </span>
              <XpBar value={info.progress} className="mt-1.5" />
            </span>
            <span className="flex shrink-0 items-center gap-0.5 text-xs font-medium text-primary">
              {ready > 0 ? (
                <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[11px] font-semibold text-white shadow-[0_0_10px_rgba(245,158,11,.5)]">
                  {ready} to claim
                </span>
              ) : (
                "Levels"
              )}
              <HugeiconsIcon icon={ArrowRight01Icon} className="size-3.5" />
            </span>
          </button>
        )}
      </div>

      <CharacterPicker open={open} onOpenChange={setOpen} user={user} wallet={wallet} />
      <LevelRoadSheet open={road} onOpenChange={setRoad} user={user} wallet={wallet} />
    </>
  )
}

const fmt = new Intl.NumberFormat("en-IN")

/**
 * Choose who you are in games, among the characters you have (free ones and
 * those bought or earned) — or your photo. Tap one to see its entrance.
 */
export function CharacterPicker({
  open,
  onOpenChange,
  user,
  wallet,
  characters = CHARACTERS,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: ProfileUser
  wallet: Wallet | null | undefined
  characters?: CharacterDef[]
}) {
  const wear = useSetGameAvatar()
  const current = characterById(user.gameAvatar)?.id ?? null
  const [picked, setPicked] = React.useState<string | null>(current)
  const [replay, setReplay] = React.useState(0)
  // Opening again starts from what you wear now
  const [wasOpen, setWasOpen] = React.useState(open)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) setPicked(current)
  }

  // Bought and earned ones first, then the free ones
  const mine = characters
    .filter((c) => ownsCharacter(c, wallet?.avatars))
    .sort((a, b) => Number(a.tier === "basic") - Number(b.tier === "basic"))
  const more = characters.length - mine.length
  const def = characters.find((c) => c.id === picked)

  const pick = (id: string | null) => {
    setPicked(id)
    setReplay((n) => n + 1)
  }
  const save = () =>
    wear.mutate(
      { id: picked, owned: wallet?.avatars },
      {
        onSuccess: () => {
          toast.success(def ? `You're ${def.name} in games now` : "Games show your photo again")
          onOpenChange(false)
        },
      }
    )

  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Your game character"
      description="Who you are in live games. Your photo stays for splits, groups and friends."
      footer={
        <Button className="w-full" disabled={picked === current || wear.isPending} onClick={save}>
          {wear.isPending ? (
            <Spinner />
          ) : picked === current ? (
            <>
              <HugeiconsIcon icon={Tick02Icon} data-icon="inline-start" />
              {def ? `Playing as ${def.name}` : "Using your photo"}
            </>
          ) : def ? (
            `Play as ${def.name}`
          ) : (
            "Use my photo"
          )}
        </Button>
      }
    >
      <div className="flex flex-col gap-4 pb-3">
        {/* The pick, big: tap to see its entrance again */}
        <div
          className="flex items-center gap-4 rounded-2xl p-3"
          style={{ background: def ? `linear-gradient(135deg, ${def.accent}2e, transparent 75%)` : undefined }}
        >
          {def ? (
            <button
              type="button"
              onClick={() => setReplay((n) => n + 1)}
              aria-label={`Play ${def.name}'s entrance`}
              className="relative shrink-0 rounded-[22%] transition-transform active:scale-95"
            >
              <CharacterTile def={def} size={112} mode="intro" shape="card" replay={replay} className="shadow-md" />
              <span className="absolute right-1.5 bottom-1.5 flex size-6 items-center justify-center rounded-full bg-black/45 text-white">
                <HugeiconsIcon icon={RepeatIcon} className="size-3.5" />
              </span>
            </button>
          ) : (
            <span className="shrink-0 p-3">
              <FramedAvatar src={user.photoURL} name={user.displayName} frame={user.frame} size={88} />
            </span>
          )}
          <div className="min-w-0">
            <p className="truncate text-lg leading-tight font-semibold">{def ? def.name : "Your photo"}</p>
            <p className="text-sm text-muted-foreground">{def ? def.tagline : "No character — games show your photo."}</p>
            {def && <TierChip def={def} className="mt-1.5" />}
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2 sm:grid-cols-5" role="radiogroup" aria-label="Characters you have">
          <Choice on={picked === null} label="Photo" onClick={() => pick(null)}>
            {user.photoURL ? (
              <FramedAvatar src={user.photoURL} name={user.displayName} size={52} />
            ) : (
              <span className="flex size-[52px] items-center justify-center rounded-full bg-muted text-muted-foreground">
                <HugeiconsIcon icon={Image01Icon} className="size-5" />
              </span>
            )}
          </Choice>
          {mine.map((c) => (
            <Choice key={c.id} on={picked === c.id} label={c.name} onClick={() => pick(c.id)}>
              <CharacterTile def={c} size={52} />
            </Choice>
          ))}
        </div>

        {more > 0 && (
          <Link
            href="/profile/inventory#characters"
            className="flex items-center justify-between gap-2 rounded-xl border border-dashed px-3.5 py-2.5 text-sm transition-colors hover:bg-muted/60"
          >
            <span>
              <span className="font-medium">{more} more characters</span>
              <span className="text-muted-foreground"> to buy or win</span>
            </span>
            <HugeiconsIcon icon={ArrowRight01Icon} className="size-4 text-muted-foreground" />
          </Link>
        )}
      </div>
    </BottomSheet>
  )
}

function Choice({ on, label, onClick, children }: { on: boolean; label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={on}
      onClick={onClick}
      className={cn(
        "flex min-w-0 flex-col items-center gap-1.5 rounded-xl border px-1 pt-2 pb-1.5 transition-[background-color,border-color,transform] active:scale-95",
        on ? "border-primary bg-primary/5" : "border-transparent hover:bg-muted/60"
      )}
    >
      {children}
      <span className={cn("w-full truncate text-center text-[11px] font-medium", on ? "text-primary" : "text-muted-foreground")}>
        {label}
      </span>
    </button>
  )
}
