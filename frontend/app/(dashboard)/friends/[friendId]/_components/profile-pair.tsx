"use client"

import * as React from "react"
import Link from "next/link"
import { ArrowRight01Icon, GameController03Icon, ReceiptIndianRupeeIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { GameAvatar } from "@/components/game-avatar/game-avatar"
import { LevelBadge } from "@/components/game-avatar/level-badge"
import { characterById } from "@/components/game-avatar/registry"
import { PhotoZoom } from "@/components/shared/photo-zoom"
import { UserAvatar } from "@/components/shared/user-avatar"
import { gameNameOf } from "@/lib/game-name"
import { levelInfo } from "@/lib/live/levels"
import type { UserProfile, Wallet } from "@/lib/types"

/**
 * A friend's two faces, side by side and the same size: who they are for
 * splitting (their photo, plain — no frame, nothing to distract from money)
 * and who they are in games (their character, frame and level, on the Games
 * side's sky; tap it for their full game profile). Each is labelled.
 */
export function ProfilePair({
  friend,
  wallet,
}: {
  friend: Pick<UserProfile, "uid" | "displayName" | "photoURL" | "splitzyId" | "gameAvatar" | "frame" | "gameName">
  wallet: Wallet | null | undefined
}) {
  const info = levelInfo(wallet)
  const character = characterById(friend.gameAvatar)
  // Tap the Split profile: their photo grows out of the avatar
  const zoom = React.useRef<{ open: () => void }>(null)
  const photo = friend.photoURL || null
  return (
    <div className="grid w-full grid-cols-2 items-stretch gap-3">
      {/* Split: clean — tap to see the photo big */}
      <button
        type="button"
        aria-label={photo ? `${friend.displayName}'s photo` : `${friend.displayName}'s Split profile`}
        disabled={!photo}
        onClick={() => zoom.current?.open()}
        className="flex h-full min-w-0 flex-col items-center gap-2.5 rounded-2xl border border-card-stroke bg-card px-3 pt-3 pb-4 text-center shadow-xs transition-transform enabled:active:scale-[.98] disabled:cursor-default"
      >
        <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-semibold text-muted-foreground">
          <HugeiconsIcon icon={ReceiptIndianRupeeIcon} className="size-3.5" />
          Split profile
        </span>
        <span className="flex size-24 items-center justify-center">
          {/* No uid: a worn frame is never looked up here */}
          <PhotoZoom src={photo} alt={friend.displayName} handle={zoom}>
            <UserAvatar src={friend.photoURL} name={friend.displayName} size="xl" className="size-20" peek={false} />
          </PhotoZoom>
        </span>
        <span className="flex w-full min-w-0 flex-col gap-0.5">
          <span className="truncate text-base font-bold">{friend.displayName}</span>
          <span className="truncate font-mono text-[11px] text-muted-foreground">{friend.splitzyId}</span>
        </span>
      </button>

      {/* Games: character, frame, level — tap for the full game profile */}
      <Link
        href={`/games/player/${friend.uid}`}
        aria-label={`${friend.displayName}'s game profile`}
        className="gu gu-sky flex h-full min-w-0 flex-col items-center gap-2.5 rounded-2xl px-3 pt-3 pb-4 text-center text-white shadow-[0_10px_22px_rgba(30,40,110,.22)] transition-transform active:scale-[.98]"
      >
        <span className="gu-chip !py-0.5 text-[11px]">
          <HugeiconsIcon icon={GameController03Icon} className="size-3.5" strokeWidth={2.2} />
          Game profile
        </span>
        <span className="relative flex size-24 items-center justify-center">
          <GameAvatar
            character={friend.gameAvatar}
            photo={friend.photoURL}
            name={friend.displayName}
            frame={friend.frame}
            size={64}
            mode="idle"
            peek={false}
          />
          {wallet ? <LevelBadge level={info.level} size={26} className="absolute -bottom-1 left-1/2 -translate-x-1/2" /> : null}
        </span>
        <span className="flex w-full min-w-0 flex-col gap-0.5">
          <span className="gu-title truncate text-base">{gameNameOf(friend)}</span>
          <span className="flex items-center justify-center gap-0.5 truncate text-[11px] font-bold text-white/95 [text-shadow:0_1px_0_rgba(20,40,110,.35)]">
            {wallet ? `Level ${info.level} · ${character?.name ?? info.title}` : (character?.name ?? "Player")}
            <HugeiconsIcon icon={ArrowRight01Icon} className="size-3 shrink-0" strokeWidth={2.6} />
          </span>
        </span>
      </Link>
    </div>
  )
}
