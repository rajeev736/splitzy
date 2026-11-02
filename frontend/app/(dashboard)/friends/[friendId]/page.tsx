"use client"

import * as React from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { useRouter } from "nextjs-toploader/app"
import {
  GameController03Icon,
  GiftIcon,
  Invoice01Icon,
  MoreVerticalIcon,
  Calendar03Icon,
  UserRemove01Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { Coins } from "@/components/fun/coin"
import { BadgeGrid } from "@/components/fun/badge-grid"
import { FramedAvatar } from "@/components/fun/framed-avatar"
import { MoodFace } from "@/components/fun/mood-face"
import { NewChallengeSheet } from "@/components/games/new-challenge-sheet"
import { AppHeader } from "@/components/layout/app-header"
import { PageContainer } from "@/components/layout/app-shell"
import { useSession } from "@/components/providers/session-provider"
import { EmptyState } from "@/components/shared/empty-state"
import { ListSkeleton } from "@/components/shared/query-state"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useExpenses, useFriends } from "@/hooks/queries"
import { useNow } from "@/hooks/use-now"
import { useBadges, useFriendship, useLiveProfile, useLoveBondCount, useMoments, useWallet } from "@/hooks/use-fun"
import { isMoodId, MOODS } from "@/lib/fun/catalog"
import { formatPaise } from "@/lib/money"
import { cn } from "@/lib/utils"
import { BondPill } from "./_components/bond-section"
import { FriendMoney } from "./_components/friend-money"
import { BetweenYou, BirthdayCard, MomentFeed } from "./_components/friend-fun"
import { playBurst } from "@/lib/fun/burst"
import { GiftSheet, LoveActions, PlanSheet } from "./_components/send-moments"

const sinceShort = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { month: "short", year: "numeric" })

const moodAgo = (iso: string, now: number) => {
  const h = (now - new Date(iso).getTime()) / 3_600_000
  return h < 1 ? "now" : h < 24 ? `${Math.floor(h)}h` : `${Math.floor(h / 24)}d`
}

function FriendProfileContent() {
  const { friendId } = useParams<{ friendId: string }>()
  const router = useRouter()
  const { user } = useSession()
  const friends = useFriends()
  const { data: expenses } = useExpenses()
  const live = useLiveProfile(friendId)
  const cached = friends.data.find((f) => f.uid === friendId)
  const friend = live ?? cached
  const { friendship } = useFriendship(friendId)
  const wallet = useWallet(friendId)
  const loveBonds = useLoveBondCount(friendId)
  const badges = useBadges(friendId, loveBonds ?? 0)
  const moments = useMoments(friendId)
  const now = useNow(0)

  const [tab, setTab] = React.useState<"activity" | "expenses">("activity")
  const [sheet, setSheet] = React.useState<"gift" | "plan" | "game" | null>(null)

  const mutual = React.useMemo(() => {
    if (!user) return []
    return expenses.filter((e) => {
      const people = new Set([e.payerId, ...e.shares.map((s) => s.userId)])
      return people.has(user.uid) && people.has(friendId)
    })
  }, [expenses, user, friendId])

  const isFriend = friendship?.status === "ACTIVE" || !!cached
  if (friends.isPending && !friend) {
    return (
      <>
        <AppHeader title="Friend" showBack />
        <PageContainer className="max-w-2xl">
          <ListSkeleton rows={4} />
        </PageContainer>
      </>
    )
  }
  if (!friend || !isFriend || !user) {
    return (
      <>
        <AppHeader title="Friend" showBack />
        <PageContainer className="max-w-2xl">
          <EmptyState
            title="Not on your friends list"
            description="Add them as a friend to see their profile."
          />
        </PageContainer>
      </>
    )
  }

  const first = friend.displayName.split(" ")[0]
  const love = friendship?.bond?.type === "love"
  const mood = friend.mood && isMoodId(friend.mood.id) ? friend.mood : null
  const champ = badges?.summary.find((b) => b.id === "champ")?.count ?? 0
  const todayStamp = now ? new Date(now).toDateString() : ""
  const wishedToday = !!moments?.some(
    (m) => m.type === "wish" && m.from === user.uid && new Date(m.createdAt).toDateString() === todayStamp
  )

  return (
    <>
      <AppHeader
        title={friend.displayName}
        showBack
        rightAction={
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="ghost" size="icon" aria-label="More" />}>
              <HugeiconsIcon icon={MoreVerticalIcon} className="size-5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem onClick={() => router.push(`/expenses/new?friend=${friend.uid}`)}>
                <HugeiconsIcon icon={Invoice01Icon} />
                Split expense
              </DropdownMenuItem>
              <DropdownMenuItem variant="destructive" onClick={() => router.push(`/friends?remove=${friend.uid}`)}>
                <HugeiconsIcon icon={UserRemove01Icon} />
                Remove friend
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        }
      />

      <PageContainer className="max-w-2xl gap-6 pb-28">
        {/* Who they are */}
        <section className="flex flex-col items-center gap-3 text-center">
          <div className="p-7">
            <FramedAvatar src={friend.photoURL} name={friend.displayName} frame={friend.frame} size={96} />
          </div>
          <div className="-mt-4 flex flex-col items-center gap-1">
            <h1 className="text-xl font-bold tracking-tight">{friend.displayName}</h1>
            <p className="font-mono text-xs text-muted-foreground">{friend.splitzyId}</p>
          </div>
          {mood && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-muted/70 py-1 pr-3 pl-1 text-xs font-medium">
              <MoodFace mood={mood.id as keyof typeof MOODS} className="size-5" />
              {MOODS[mood.id as keyof typeof MOODS].name}
              {now > 0 && <span className="text-muted-foreground">· {moodAgo(mood.at, now)}</span>}
            </span>
          )}
          <BondPill friend={friend} friendship={friendship} />
        </section>

        {/* At a glance */}
        <div className="grid grid-cols-3 divide-x rounded-xl border bg-card py-3 text-center">
          <div className="flex min-w-0 flex-col items-center gap-0.5 px-2">
            {wallet ? <Coins amount={wallet.balance} className="text-base" /> : <span className="text-base font-semibold">—</span>}
            <span className="text-[11px] text-muted-foreground">Coins</span>
          </div>
          <div className="flex min-w-0 flex-col items-center gap-0.5 px-2">
            <span className="text-base font-semibold tabular-nums">{badges ? champ : "—"}</span>
            <span className="text-[11px] text-muted-foreground">Games won</span>
          </div>
          <div className="flex min-w-0 flex-col items-center gap-0.5 px-2">
            <span className="truncate text-base font-semibold">
              {friendship?.createdAt ? sinceShort(friendship.createdAt) : "—"}
            </span>
            <span className="text-[11px] text-muted-foreground">Friends since</span>
          </div>
        </div>

        <FriendMoney friend={friend} />

        <BirthdayCard friend={friend} wishedToday={wishedToday} onWished={() => playBurst({ kind: "wish", title: `Wish sent to ${first}` })} />

        {/* Send something */}
        <section className="flex flex-col gap-3">
          {love && <LoveActions friend={friend} onSent={playBurst} />}
          <div className="grid grid-cols-3 gap-2">
            {[
              { key: "gift" as const, label: "Send gift", icon: GiftIcon },
              { key: "plan" as const, label: "Make a plan", icon: Calendar03Icon },
              { key: "game" as const, label: "Play a game", icon: GameController03Icon },
            ].map((a) => (
              <Button
                key={a.key}
                variant="outline"
                className="h-auto flex-col gap-1.5 rounded-xl py-3 text-xs font-medium"
                onClick={() => setSheet(a.key)}
              >
                <HugeiconsIcon icon={a.icon} className="size-5 text-primary" />
                {a.label}
              </Button>
            ))}
          </div>
        </section>

        <BetweenYou friend={friend} friendship={friendship} />

        {/* Only badges they've earned; nothing at all if none yet */}
        {badges && badges.summary.some((b) => b.tier > 0) && (
          <section className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold">{first}&apos;s badges</h2>
            <BadgeGrid badges={badges.summary} earlyBird={badges.earlyBird} earnedOnly />
          </section>
        )}

        {/* Activity | Expenses */}
        <section className="flex flex-col gap-1">
          <div role="tablist" className="grid grid-cols-2 border-b">
            {(
              [
                ["activity", "Activity"],
                ["expenses", `Expenses (${mutual.length})`],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={tab === value}
                onClick={() => setTab(value)}
                className={cn(
                  "relative pb-2.5 text-sm font-medium transition-colors",
                  tab === value
                    ? "text-foreground after:absolute after:inset-x-0 after:bottom-[-1px] after:h-0.5 after:bg-primary"
                    : "text-muted-foreground"
                )}
              >
                {label}
              </button>
            ))}
          </div>
          {tab === "activity" ? (
            <MomentFeed friend={friend} moments={moments} />
          ) : mutual.length === 0 ? (
            <p className="px-4 py-6 text-center text-xs text-muted-foreground">No shared expenses with {first} yet.</p>
          ) : (
            <ul className="flex flex-col">
              {mutual.map((e) => (
                <li key={e.id} className="border-b last:border-b-0">
                  <Link
                    href={`/expenses/${e.id}`}
                    className="-mx-2 flex items-center justify-between gap-3 rounded-md px-2 py-3 transition-colors hover:bg-muted/60"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{e.title}</div>
                      <div className="truncate text-[11px] text-muted-foreground">
                        {e.groupId ? e.groupName || "Group" : "Direct"} · {e.payerId === user.uid ? "You paid" : `${e.payerName} paid`} ·{" "}
                        {e.date}
                      </div>
                    </div>
                    <span className="shrink-0 text-sm font-semibold tabular-nums">{formatPaise(e.amountPaise)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </PageContainer>

      <GiftSheet open={sheet === "gift"} onOpenChange={(o) => setSheet(o ? "gift" : null)} friend={friend} onSent={playBurst} />
      <PlanSheet open={sheet === "plan"} onOpenChange={(o) => setSheet(o ? "plan" : null)} friend={friend} />
      {sheet === "game" && (
        <NewChallengeSheet
          open
          onOpenChange={(o) => !o && setSheet(null)}
          initialPerson={{ uid: friend.uid, name: friend.displayName, photoURL: friend.photoURL }}
          initialStake="fun"
        />
      )}
    </>
  )
}

export default function FriendProfilePage() {
  return (
    <React.Suspense fallback={null}>
      <FriendProfileContent />
    </React.Suspense>
  )
}
