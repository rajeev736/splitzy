"use client"

import * as React from "react"
import Link from "next/link"
import { ArrowRight01Icon, UserGroupIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useQuery } from "@tanstack/react-query"

import { GameAvatar } from "@/components/game-avatar/game-avatar"
import { LevelBadge } from "@/components/game-avatar/level-badge"
import { characterById } from "@/components/game-avatar/registry"
import { StatusChip, useFriendStatuses } from "@/components/live/friend-status"
import { useSession } from "@/components/providers/session-provider"
import { ButtonLink } from "@/components/shared/button-link"
import { UserAvatar } from "@/components/shared/user-avatar"
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetTitle } from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import { useExpenses, useFriends, useGroups } from "@/hooks/queries"
import { useWallet } from "@/hooks/use-fun"
import { useLiveGameDiscounts } from "@/hooks/use-game-discounts"
import { gameNameOf } from "@/lib/game-name"
import { levelInfo } from "@/lib/live/levels"
import { calculateDirectBalance, filterExpensesByScope, formatPaise } from "@/lib/money"
import { queryKeys } from "@/lib/query/keys"
import type { UserProfile } from "@/lib/types"
import { cn } from "@/lib/utils"
import { fetchUserProfile } from "@/services/shared"
import { FriendActionButton, useFriendState, type FriendState } from "./friend-action"
import { onProfilePeek, type PeekHint, type PeekRequest } from "./peek"

/** Where each look's "View profile" goes. */
export const playerHref = (uid: string) => `/games/player/${uid}`

/**
 * The one profile peek sheet (see ./peek): mounted once in the providers, it
 * opens for whoever's avatar was tapped, in the look of the side it was
 * tapped on — Split (photo, friendship, money) or Games (character, level,
 * status) — with the way to their full profile.
 */
export function ProfilePeekHost() {
  const [peek, setPeek] = React.useState<{ req: PeekRequest; open: boolean; n: number } | null>(null)
  React.useEffect(() => onProfilePeek((req) => setPeek((p) => ({ req, open: true, n: (p?.n ?? 0) + 1 }))), [])

  if (!peek) return null
  const { req } = peek
  const game = req.look === "game"
  const setOpen = (open: boolean) => setPeek((p) => (p ? { ...p, open } : p))
  const close = () => setOpen(false)

  return (
    <Sheet open={peek.open} onOpenChange={setOpen}>
      <SheetContent
        side="bottom"
        className={cn(
          "mx-auto flex max-h-[88svh] w-full max-w-xl flex-col gap-0 rounded-t-3xl pb-[env(safe-area-inset-bottom)]",
          game && "gu"
        )}
      >
        {/* Keyed per opening: a new person never shows the previous one's data */}
        {game ? (
          <GamePeek key={peek.n} uid={req.uid} hint={req.hint} onNavigate={close} />
        ) : (
          <AppPeek key={peek.n} uid={req.uid} hint={req.hint} onNavigate={close} />
        )}
      </SheetContent>
    </Sheet>
  )
}

/**
 * Someone's public profile: you and your friends from what's already loaded,
 * anyone else read once (users/{uid} is readable by any signed-in user).
 * `undefined` while loading, `null` if there's no such user.
 */
export function usePeekProfile(uid: string): UserProfile | null | undefined {
  const { user } = useSession()
  const { data: friends } = useFriends()
  const known = uid === user?.uid ? user : friends.find((f) => f.uid === uid)
  const q = useQuery({
    queryKey: queryKeys.profile(user?.uid ?? "", uid),
    queryFn: () => fetchUserProfile(uid),
    enabled: !!user && !known,
    staleTime: 5 * 60_000,
    retry: false,
  })
  if (known) return known
  if (q.isError) return null
  return q.data
}

/* ────────────────────────────────────────────────────────────────────────────
 * Split
 * ──────────────────────────────────────────────────────────────────────────── */

const RELATION: Record<FriendState["kind"], { label: string; className: string }> = {
  self: { label: "You", className: "bg-primary/10 text-primary" },
  friend: { label: "Friend", className: "bg-success/10 text-success" },
  sent: { label: "Request sent", className: "bg-muted text-muted-foreground" },
  received: { label: "Wants to be friends", className: "bg-primary/10 text-primary" },
  none: { label: "Not a friend", className: "bg-muted text-muted-foreground" },
}

function AppPeek({ uid, hint, onNavigate }: { uid: string; hint?: PeekHint; onNavigate: () => void }) {
  const profile = usePeekProfile(uid)
  const state = useFriendState(uid)
  const { data: groups } = useGroups()
  const name = profile?.displayName || hint?.name || "Someone"
  const photo = profile ? profile.photoURL : hint?.photo
  const together = groups.filter((g) => g.members.includes(uid)).length
  const relation = RELATION[state.kind]
  const self = state.kind === "self"

  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col items-center gap-3 overflow-y-auto px-4 pt-5 pb-3 text-center">
        {/* Plain photo: frames are a Games-side look */}
        <UserAvatar src={photo} name={name} size="xl" className="size-20 text-2xl shadow-sm ring-4 ring-card" peek={false} />
        <div className="flex w-full min-w-0 flex-col items-center gap-1">
          <SheetTitle className="w-full truncate text-lg leading-tight font-semibold">{name}</SheetTitle>
          <SheetDescription className="font-mono text-xs">
            {profile ? profile.splitzyId : profile === null ? "Profile not found" : <span className="inline-block h-3.5 w-24 animate-pulse rounded-md bg-muted align-middle" />}
          </SheetDescription>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-1.5">
          <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-semibold", relation.className)}>{relation.label}</span>
          {!self && together > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
              <HugeiconsIcon icon={UserGroupIcon} className="size-3.5" />
              {together} group{together === 1 ? "" : "s"} together
            </span>
          )}
        </div>
        {state.kind === "friend" && <PeekBalance uid={uid} name={name} />}
      </div>
      <SheetFooter className="border-t">
        {profile && <FriendActionButton state={state} name={name} splitzyId={profile.splitzyId} />}
        {profile !== null && (
          <ButtonLink
            href={self ? "/profile" : `/friends/${uid}`}
            variant={state.kind === "friend" || self ? "default" : "outline"}
            className="w-full"
            onClick={onNavigate}
          >
            View profile
            <HugeiconsIcon icon={ArrowRight01Icon} data-icon="inline-end" />
          </ButtonLink>
        )}
      </SheetFooter>
    </>
  )
}

/**
 * Where you stand with a friend overall — their direct splits and every group
 * you share, with a live game discount applied the way their profile does
 * (app/(dashboard)/friends/[friendId]/_components/friend-money).
 */
function PeekBalance({ uid, name }: { uid: string; name: string }) {
  const { user } = useSession()
  const { data: expenses } = useExpenses()
  const { data: groups } = useGroups()
  const game = useLiveGameDiscounts().byPerson.get(uid)
  const first = name.split(" ")[0]

  const total = React.useMemo(() => {
    if (!user) return 0
    const direct = calculateDirectBalance(user.uid, uid, filterExpensesByScope(expenses, { type: "direct" })).netBalancePaise
    const shared = groups
      .filter((g) => g.members.includes(uid))
      .map((g) => ({
        key: g.id,
        net: calculateDirectBalance(user.uid, uid, expenses.filter((e) => e.groupId === g.id)).netBalancePaise,
      }))
    const raw = direct + shared.reduce((s, r) => s + r.net, 0)
    if (!game) return raw
    // The discount lands on one balance: the game's group, else direct, else the first group
    const offOn = (net: number) => Math.max(0, Math.min(game.discountPaise, game.role === "winner" ? -net : net))
    const candidates = [
      ...shared.filter((r) => r.key === game.groupId),
      { key: "direct", net: direct },
      ...shared,
    ]
    const hit = candidates.find((c) => offOn(c.net) > 0)
    const off = hit ? offOn(hit.net) : 0
    return raw + (game.role === "winner" ? off : -off)
  }, [user, uid, expenses, groups, game])

  return (
    <div className="mt-1 flex w-full items-center justify-between gap-3 rounded-xl border border-card-stroke bg-card px-4 py-3 text-left shadow-xs">
      <span className="text-sm text-muted-foreground">
        {total > 0 ? `${first} owes you` : total < 0 ? `You owe ${first}` : "Balance"}
      </span>
      <span
        className={cn(
          "text-lg font-bold tracking-tight tabular-nums",
          total > 0 ? "text-success" : total < 0 ? "text-destructive" : "text-foreground"
        )}
      >
        {total === 0 ? "All settled" : formatPaise(Math.abs(total))}
      </span>
    </div>
  )
}

/* ────────────────────────────────────────────────────────────────────────────
 * Games
 * ──────────────────────────────────────────────────────────────────────────── */

const fmt = new Intl.NumberFormat("en-IN")

function GamePeek({ uid, hint, onNavigate }: { uid: string; hint?: PeekHint; onNavigate: () => void }) {
  const { user } = useSession()
  const profile = usePeekProfile(uid)
  const wallet = useWallet(uid)
  const status = useFriendStatuses([uid])[uid]
  const self = uid === user?.uid
  const name = profile ? gameNameOf(profile) : hint?.name || "Player"
  const character = profile ? profile.gameAvatar : hint?.avatar
  const frame = profile ? profile.frame : hint?.frame
  const photo = profile ? profile.photoURL : hint?.photo
  const def = characterById(character)
  const info = levelInfo(wallet)
  const played = wallet?.livePlayed ?? 0
  const wins = wallet?.liveWins ?? 0

  return (
    <>
      <div
        className="flex min-h-0 flex-1 flex-col items-center gap-2 overflow-y-auto px-4 pt-4 pb-3 text-center"
        style={def ? { backgroundImage: `radial-gradient(70% 55% at 50% 0%, ${def.accent}40, transparent 70%)` } : undefined}
      >
        <span className="relative p-4">
          <GameAvatar character={character} photo={photo} name={name} frame={frame} size={88} mode="idle" />
          {wallet ? <LevelBadge level={info.level} size={32} className="absolute bottom-0.5 left-1/2 -translate-x-1/2" /> : null}
        </span>
        <div className="flex w-full min-w-0 flex-col items-center gap-0.5">
          <SheetTitle className="w-full truncate text-xl leading-tight font-bold text-[var(--gu-ink)]">{name}</SheetTitle>
          <SheetDescription className="text-xs font-bold text-[var(--gu-brown)]">
            {def ? def.name : "Photo"}
            {wallet ? ` · Level ${info.level} ${info.title}` : ""}
          </SheetDescription>
        </div>
        {self ? (
          <span className="gu-chip h-6 !px-2.5 text-[11px]">You</span>
        ) : (
          <StatusChip status={status} className="px-2 py-1 text-[11px]" />
        )}
        {wallet ? (
          <div className="mt-1 grid w-full max-w-xs grid-cols-3 gap-2">
            <GameStat value={fmt.format(played)} label="Played" />
            <GameStat value={fmt.format(wins)} label="Wins" />
            <GameStat value={played ? `${Math.round((wins / played) * 100)}%` : "–"} label="Win rate" />
          </div>
        ) : wallet === undefined ? (
          <Skeleton className="mt-1 h-12 w-full max-w-xs rounded-2xl" />
        ) : null}
      </div>
      {profile !== null && (
        <SheetFooter className="border-t border-[var(--gu-line)]">
          <Link href={self ? "/games/profile" : playerHref(uid)} onClick={onNavigate} className="gu-btn w-full">
            {self ? "View your game profile" : "View game profile"}
          </Link>
        </SheetFooter>
      )}
    </>
  )
}

export function GameStat({ value, label }: { value: string; label: string }) {
  return (
    <div className="gu-well flex flex-col items-center px-1 py-1.5">
      <span className="text-base leading-tight font-bold tabular-nums">{value}</span>
      <span className="text-[10px] font-bold tracking-wide text-[var(--gu-brown)] uppercase">{label}</span>
    </div>
  )
}
