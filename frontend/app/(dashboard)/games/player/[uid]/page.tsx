"use client"

import * as React from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { useRouter } from "nextjs-toploader/app"
import { GameController03Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { GameAvatar } from "@/components/game-avatar/game-avatar"
import { LevelBadge } from "@/components/game-avatar/level-badge"
import { characterById } from "@/components/game-avatar/registry"
import { GameNote, GameProgress, GameScreen, GameSectionTitle, GameTopBar } from "@/components/game-ui/kit"
import { GameCoinChip } from "@/components/game-nav/coin-chip"
import { GAME_ROUTES } from "@/components/game-nav/items"
import { StatusChip, useFriendStatuses } from "@/components/live/friend-status"
import { useFriendState } from "@/components/profile-peek/friend-action"
import { GameStat } from "@/components/profile-peek/profile-peek-host"
import { useSession } from "@/components/providers/session-provider"
import { Spinner } from "@/components/ui/spinner"
import { useLiveProfile, useWallet } from "@/hooks/use-fun"
import { gameNameOf } from "@/lib/game-name"
import { levelInfo } from "@/lib/live/levels"
import type { UserProfile, Wallet } from "@/lib/types"

const fmt = new Intl.NumberFormat("en-IN")

/**
 * Someone else's game profile, on the Games side (read-only): their
 * character big with their frame and level crest, game name, live status,
 * record and level. Opened from the profile peek's "View game profile";
 * yours is /games/profile.
 */
export default function PlayerProfilePage() {
  const { uid } = useParams<{ uid: string }>()
  const router = useRouter()
  const { user } = useSession()
  const profile = useLiveProfile(uid)
  const wallet = useWallet(uid)
  const status = useFriendStatuses(uid ? [uid] : [])[uid]
  const friend = useFriendState(uid)
  const self = !!user && uid === user.uid

  // Your own: the editable one
  React.useEffect(() => {
    if (self) router.replace(GAME_ROUTES.profile)
  }, [self, router])

  const back = () => (window.history.length > 1 ? router.back() : router.replace(GAME_ROUTES.hub))
  const name = profile ? gameNameOf(profile) : "Player"

  return (
    <GameScreen>
      <GameTopBar title={profile ? name : "Player"} subtitle="Game profile" onBack={back} right={<GameCoinChip />} />
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 pt-2 pb-8">
        {profile === undefined || self ? (
          <div className="flex justify-center py-16">
            <Spinner className="size-8 text-white" />
          </div>
        ) : profile === null ? (
          <GameNote className="mt-4">This player couldn&apos;t be found.</GameNote>
        ) : (
          <>
            <Hero profile={profile} wallet={wallet} status={status} />
            <LevelCard wallet={wallet} />
            {friend.kind === "friend" && (
              <Link href={`${GAME_ROUTES.hub}?tab=fun&invite=${uid}`} className="gu-btn gu-green w-full">
                <HugeiconsIcon icon={GameController03Icon} className="size-5" strokeWidth={2.4} />
                Invite {name.split(" ")[0]} to play
              </Link>
            )}
          </>
        )}
      </div>
    </GameScreen>
  )
}

function Hero({
  profile,
  wallet,
  status,
}: {
  profile: UserProfile
  wallet: Wallet | null | undefined
  status: Parameters<typeof StatusChip>[0]["status"]
}) {
  const def = characterById(profile.gameAvatar)
  const info = levelInfo(wallet)
  const played = wallet?.livePlayed ?? 0
  const wins = wallet?.liveWins ?? 0
  const name = gameNameOf(profile)
  return (
    <section className="gu-panel mt-1">
      <div
        className="flex flex-col items-center gap-2 rounded-[26px] px-4 pt-5 pb-4 text-center"
        style={def ? { backgroundImage: `radial-gradient(80% 70% at 50% 0%, ${def.accent}40, transparent 70%)` } : undefined}
      >
        <span className="relative p-5">
          <GameAvatar
            character={profile.gameAvatar}
            photo={profile.photoURL}
            name={name}
            frame={profile.frame}
            size={104}
            mode="idle"
          />
          {wallet ? <LevelBadge level={info.level} size={36} className="absolute bottom-1 left-1/2 -translate-x-1/2" /> : null}
        </span>
        <h1 className="max-w-full truncate text-2xl leading-tight font-bold">{name}</h1>
        <p className="-mt-1 text-xs font-bold text-[var(--gu-brown)]">
          {def ? def.name : "Photo"}
          {wallet ? ` · Level ${info.level} ${info.title}` : ""}
        </p>
        <StatusChip status={status} className="px-2 py-1 text-[11px]" />
        <div className="mt-1 grid w-full max-w-xs grid-cols-3 gap-2">
          <GameStat value={fmt.format(played)} label="Played" />
          <GameStat value={fmt.format(wins)} label="Wins" />
          <GameStat value={played ? `${Math.round((wins / played) * 100)}%` : "–"} label="Win rate" />
        </div>
      </div>
    </section>
  )
}

/** Their level: the crest, its title, and how far into it they are. */
function LevelCard({ wallet }: { wallet: Wallet | null | undefined }) {
  if (wallet === undefined) return null
  const info = levelInfo(wallet)
  return (
    <section className="flex flex-col gap-3">
      <GameSectionTitle>Level</GameSectionTitle>
      <div className="gu-panel-flat flex items-center gap-3.5 p-3.5">
        <LevelBadge level={info.level} size={54} />
        <div className="min-w-0 flex-1">
          <p className="flex items-baseline justify-between gap-2">
            <span className="truncate text-lg leading-tight font-bold">
              Level {info.level} <span className="text-[var(--gu-orange-deep)]">· {info.title}</span>
            </span>
            <span className="shrink-0 text-xs font-bold text-[var(--gu-ink-soft)] tabular-nums">{fmt.format(info.xp)} XP</span>
          </p>
          <GameProgress value={info.progress} className="mt-2" />
        </div>
      </div>
    </section>
  )
}
