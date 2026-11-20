"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "nextjs-toploader/app"
import { ChampionIcon, GameController03Icon, Notification01Icon, Sword01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react"

import { GameNote, GameScreen, GameTopBar } from "@/components/game-ui/kit"
import { Spinner } from "@/components/ui/spinner"
import { useMarkNotificationRead } from "@/hooks/mutations"
import { useChallenges, useNotifications } from "@/hooks/queries"
import { isGameNotification } from "@/lib/game-notifications"
import { notificationHref } from "@/lib/system-notifications"
import type { AppNotification } from "@/lib/types"
import { cn } from "@/lib/utils"
import { RoomInviteAction } from "../notifications/_components/room-invite-action"

/**
 * The Games side's notifications, in the game theme: only room invites, calls
 * into a group's game room and challenges. Everything else stays on the Split
 * side's list (/notifications), which still shows all of them.
 */
export default function GameNotificationsPage() {
  const router = useRouter()
  const { data, isPending } = useNotifications()
  const markRead = useMarkNotificationRead()
  const items = React.useMemo(() => data.filter(isGameNotification), [data])
  const unread = items.filter((n) => !n.read)

  const back = () => (window.history.length > 1 ? router.back() : router.replace("/challenges"))
  const open = (n: AppNotification) => {
    if (!n.read) markRead.mutate(n.id)
    router.push(notificationHref(n))
  }

  return (
    <GameScreen>
      <GameTopBar
        title="Notifications"
        subtitle={unread.length ? `${unread.length} new` : "Invites & challenges"}
        onBack={back}
        right={
          unread.length > 0 ? (
            <button type="button" className="gu-chip h-9 !px-3.5 active:translate-y-px" onClick={() => unread.forEach((n) => markRead.mutate(n.id))}>
              Read all
            </button>
          ) : undefined
        }
      />
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-3 px-4 pt-2 pb-16">
        {isPending ? (
          <div className="flex justify-center py-10">
            <Spinner className="size-8 text-white" />
          </div>
        ) : items.length === 0 ? (
          <GameNote className="mt-6 flex flex-col items-center gap-2 py-8">
            <HugeiconsIcon icon={Notification01Icon} className="size-10 text-[var(--gu-frame)]" strokeWidth={2} />
            <span className="text-base font-bold text-[var(--gu-ink)]">All quiet</span>
            Room invites and challenges from friends will show up here.
          </GameNote>
        ) : (
          items.map((n) => <Row key={n.id} notif={n} onOpen={() => open(n)} onAction={() => !n.read && markRead.mutate(n.id)} />)
        )}
      </div>
    </GameScreen>
  )
}

const LOOK: Record<string, { icon: IconSvgElement; bg: string }> = {
  ROOM_INVITE: { icon: GameController03Icon, bg: "linear-gradient(180deg,#6fa8ff,#3b74e6)" },
  CHALLENGE_RECEIVED: { icon: Sword01Icon, bg: "linear-gradient(180deg,#ffa35c,#e8661f)" },
  CHALLENGE_RESULT: { icon: ChampionIcon, bg: "linear-gradient(180deg,#ffd75e,#e5a50b)" },
}

function Row({ notif: n, onOpen, onAction }: { notif: AppNotification; onOpen: () => void; onAction: () => void }) {
  const look = LOOK[n.type] ?? LOOK.ROOM_INVITE
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault()
          onOpen()
        }
      }}
      className={cn("gu-panel-flat flex cursor-pointer gap-3 p-3 active:translate-y-px", !n.read && "shadow-[0_0_0_3px_var(--gu-frame),0_4px_0_3px_var(--gu-frame-deep)]")}
    >
      <span
        className="flex size-12 shrink-0 items-center justify-center rounded-2xl text-white shadow-[inset_0_-3px_0_rgba(0,0,0,.15)]"
        style={{ background: look.bg }}
        aria-hidden
      >
        <HugeiconsIcon icon={look.icon} className="size-6" strokeWidth={2.2} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-bold leading-snug">{n.title}</p>
        <p className="mt-0.5 text-[13px] leading-snug font-medium text-[var(--gu-ink-soft)]">{n.message}</p>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <span className="text-[11px] font-bold text-[var(--gu-brown)]">
            {new Date(n.createdAt).toLocaleString([], { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
          </span>
          <div onClick={(e) => e.stopPropagation()}>
            <Action notif={n} onGo={onAction} />
          </div>
        </div>
      </div>
      {!n.read ? <span className="mt-1 size-2.5 shrink-0 rounded-full bg-[var(--gu-red)]" aria-label="Unread" /> : null}
    </div>
  )
}

/** The one thing to do: join the room, play the challenge, see the result. */
function Action({ notif: n, onGo }: { notif: AppNotification; onGo: () => void }) {
  const challenges = useChallenges()
  if (n.type === "ROOM_INVITE") return <RoomInviteAction notif={n} look="game" onGo={onGo} />
  const id = n.data?.challengeId
  if (!id) return null
  const c = challenges.data.find((x) => x.id === id)
  if (n.type === "CHALLENGE_RECEIVED" && c && c.status !== "OPEN")
    return <span className="text-xs font-bold text-[var(--gu-ink-soft)]">{c.status === "DONE" ? "Played" : "Cancelled"}</span>
  return (
    <Link href={`/challenges/${id}`} onClick={onGo} className={cn("gu-btn gu-btn-sm", n.type === "CHALLENGE_RECEIVED" ? "gu-green" : "gu-yellow")}>
      {n.type === "CHALLENGE_RECEIVED" ? "Play" : "See result"}
    </Link>
  )
}
