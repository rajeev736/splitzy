"use client"

import * as React from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { GameController03Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { NewChallengeSheet } from "@/components/games/new-challenge-sheet"
import { AppHeader } from "@/components/layout/app-header"
import { PageContainer } from "@/components/layout/app-shell"
import { useSession } from "@/components/providers/session-provider"
import { EmptyState } from "@/components/shared/empty-state"
import { ListSkeleton, QueryError } from "@/components/shared/query-state"
import { UserAvatar } from "@/components/shared/user-avatar"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { useChallenges, useFriends } from "@/hooks/queries"
import { GAMES, isForFun, type GameId } from "@/lib/games"
import { formatPaise } from "@/lib/money"
import type { Challenge } from "@/lib/types"
import { useSwipeTabs } from "@/hooks/use-swipe-tabs"
import { cn } from "@/lib/utils"
import { GameGlyph } from "@/components/games/game-glyph"

/** A soft colour per game, so the catalogue reads at a glance. */
const GAME_TONE: Record<GameId, string> = {
  rps: "bg-primary/10",
  minefield: "bg-destructive/10",
  gold_rush: "bg-yellow-500/15",
  coin_toss: "bg-warning/12",
  treasure: "bg-violet-500/12",
  lucky_number: "bg-success/12",
}

type Tab = "discount" | "fun"
const TAB_ORDER = ["discount", "fun"] as const
const TABS: { value: Tab; label: string; blurb: string }[] = [
  {
    value: "discount",
    label: "Discounted",
    blurb: "Games for money you owe or are owed. Win to pay less — one discount game per person at a time.",
  },
  {
    value: "fun",
    label: "Just for fun",
    blurb: "No money involved, just bragging rights. Friends can send as many as they like.",
  },
]

const HISTORY_PAGE = 5
/** Incoming challenges shown before "Show all", so history never gets pushed far down. */
const INCOMING_PAGE = 4

/** What this game needs from you right now, for the row status. */
function statusFor(c: Challenge, uid: string): { label: string; tone: string } {
  if (c.status === "CANCELLED") return { label: "Cancelled", tone: "text-muted-foreground" }
  if (c.status === "DONE") {
    if (c.hostId === uid) {
      return c.result?.winners.length
        ? { label: "They won", tone: "text-muted-foreground" }
        : { label: "You won", tone: "text-success" }
    }
    return c.result?.winners.includes(uid)
      ? { label: "You won", tone: "text-success" }
      : { label: "You lost", tone: "text-muted-foreground" }
  }
  if (c.hostId !== uid && c.moves[uid] === undefined) return { label: "Your turn", tone: "text-primary" }
  return { label: "Waiting", tone: "text-warning" }
}

const newestFirst = (a: Challenge, b: Challenge) => b.createdAt.localeCompare(a.createdAt)
const tabOf = (c: Challenge): Tab => (isForFun(c) ? "fun" : "discount")

export default function ChallengesPage() {
  return (
    <React.Suspense
      fallback={
        <>
          <AppHeader title="Games" showBack />
          <PageContainer className="max-w-2xl">
            <ListSkeleton rows={3} />
          </PageContainer>
        </>
      }
    >
      <ChallengesContent />
    </React.Suspense>
  )
}

function ChallengesContent() {
  const { user } = useSession()
  const challenges = useChallenges()
  const searchParams = useSearchParams()
  const uid = user?.uid ?? ""
  const [sheet, setSheet] = React.useState<{ open: boolean; game: GameId }>({ open: false, game: "rps" })
  const [historyShown, setHistoryShown] = React.useState(HISTORY_PAGE)
  const [incomingShown, setIncomingShown] = React.useState(INCOMING_PAGE)

  const all = [...challenges.data].sort(newestFirst)
  const isYourTurn = (c: Challenge) => c.status === "OPEN" && c.hostId !== uid && c.moves[uid] === undefined
  const yourTurnCount = (t: Tab) => all.filter((c) => tabOf(c) === t && isYourTurn(c)).length

  // ?tab=fun|discount wins; otherwise open the tab that has games waiting for you
  const param = searchParams.get("tab")
  const [picked, setPicked] = React.useState<Tab | null>(param === "fun" || param === "discount" ? param : null)
  const tab: Tab = picked ?? (yourTurnCount("discount") === 0 && yourTurnCount("fun") > 0 ? "fun" : "discount")
  const blurb = TABS.find((t) => t.value === tab)!.blurb

  const inTab = all.filter((c) => tabOf(c) === tab)
  const yourTurn = inTab.filter(isYourTurn)
  const waiting = inTab.filter((c) => c.status === "OPEN" && !isYourTurn(c))
  const history = inTab.filter((c) => c.status !== "OPEN")
  const openSheet = (game: GameId) => setSheet({ open: true, game })
  const switchTab = (t: Tab) => {
    setPicked(t)
    setHistoryShown(HISTORY_PAGE)
    setIncomingShown(INCOMING_PAGE)
  }
  // Swipe left for Just for fun, right for Discounted
  const swipeRef = useSwipeTabs(TAB_ORDER, tab, switchTab)

  return (
    <>
      <AppHeader title="Games" showBack />
      <PageContainer ref={swipeRef} className="max-w-2xl gap-5 pb-24">
        {/* Discounted | Just for fun */}
        <div className="flex flex-col gap-2">
          <div role="tablist" aria-label="Kind of game" className="grid grid-cols-2 border-b">
            {TABS.map((t) => {
              const count = yourTurnCount(t.value)
              const active = tab === t.value
              return (
                <button
                  key={t.value}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => switchTab(t.value)}
                  className={cn(
                    "relative flex items-center justify-center gap-2 pb-2.5 text-sm font-medium transition-colors",
                    active
                      ? "text-foreground after:absolute after:inset-x-0 after:bottom-[-1px] after:h-0.5 after:bg-primary"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {t.label}
                  {count > 0 && (
                    <span
                      className={cn(
                        "flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold tabular-nums",
                        t.value === "discount" ? "bg-success text-success-foreground" : "bg-primary text-primary-foreground"
                      )}
                      aria-label={`${count} waiting for you`}
                    >
                      {count}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
          <p className="text-xs text-muted-foreground">{blurb}</p>
        </div>

        {/* One way in: the sheet picks the game, who plays and the stakes */}
        <Button size="lg" className="h-11 w-full" onClick={() => openSheet("rps")}>
          <HugeiconsIcon icon={GameController03Icon} data-icon="inline-start" />
          {tab === "discount" ? "Challenge someone who owes you" : "New challenge"}
        </Button>

        {challenges.isPending ? (
          <ListSkeleton rows={3} />
        ) : challenges.isError ? (
          <QueryError error={challenges.error} onRetry={() => challenges.refetch()} />
        ) : (
          <>
            {/* Everyone who has challenged you in this tab — each challenge, newest first */}
            <section className="flex flex-col gap-2">
              <SectionTitle title="Challenges for you" count={yourTurn.length} tone="text-primary" />
              {yourTurn.length === 0 ? (
                <p className="rounded-lg border border-dashed px-4 py-5 text-center text-xs text-muted-foreground">
                  {tab === "discount"
                    ? "No discount challenges waiting. They come from people you owe."
                    : "No fun challenges waiting. Send one to a friend!"}
                </p>
              ) : (
                <>
                  <Card className="gap-0 divide-y py-0">
                    {yourTurn.slice(0, incomingShown).map((c) => (
                      <IncomingRow key={c.id} challenge={c} uid={uid} />
                    ))}
                  </Card>
                  {yourTurn.length > incomingShown && (
                    <Button variant="ghost" size="sm" onClick={() => setIncomingShown(yourTurn.length)}>
                      Show all {yourTurn.length}
                    </Button>
                  )}
                </>
              )}
            </section>

            {waiting.length > 0 && (
              <section className="flex flex-col gap-2">
                <SectionTitle title="Waiting for others" count={waiting.length} />
                <ChallengeList items={waiting} uid={uid} />
              </section>
            )}

            <section className="flex flex-col gap-2">
              <SectionTitle title="History" count={history.length || undefined} />
              {history.length === 0 ? (
                <Card>
                  <EmptyState
                    className="py-6"
                    icon={GameController03Icon}
                    title="Nothing here yet"
                    description="Finished games will show up here."
                  />
                </Card>
              ) : (
                <>
                  <ChallengeList items={history.slice(0, historyShown)} uid={uid} />
                  {history.length > historyShown && (
                    <Button variant="ghost" size="sm" onClick={() => setHistoryShown((n) => n + 10)}>
                      Show more ({history.length - historyShown})
                    </Button>
                  )}
                </>
              )}
            </section>
          </>
        )}
      </PageContainer>

      <NewChallengeSheet
        open={sheet.open}
        onOpenChange={(open) => setSheet((s) => ({ ...s, open }))}
        initialGame={sheet.game}
        initialStake={tab}
      />
    </>
  )
}

function SectionTitle({ title, count, tone }: { title: string; count?: number; tone?: string }) {
  return (
    <h2 className="flex items-center gap-2 text-sm font-semibold">
      {title}
      {count !== undefined && count > 0 && (
        <span className={cn("text-xs font-medium tabular-nums", tone ?? "text-muted-foreground")}>{count}</span>
      )}
    </h2>
  )
}

/** Where the game was set up: the expense, the group, or nothing for one-on-one games. */
const contextOf = (c: Challenge) => (c.expenseTitle ? ` · ${c.expenseTitle}` : c.groupName ? ` · ${c.groupName}` : "")

/** A challenge someone sent you: who sent it, the game, what's at stake, and Play. */
function IncomingRow({ challenge: c, uid }: { challenge: Challenge; uid: string }) {
  const { data: friends } = useFriends()
  const game = GAMES[c.game]
  const photo = friends.find((f) => f.uid === c.hostId)?.photoURL
  const base = c.bases?.[uid] ?? 0
  const save = Math.floor((base * c.discountPercent) / 100)

  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <span className="relative shrink-0">
        <UserAvatar src={photo} name={c.hostName} size="md" />
        <span
          className={cn(
            "absolute -right-1 -bottom-1 flex size-6 items-center justify-center rounded-md border-2 border-card text-sm",
            GAME_TONE[c.game]
          )}
          aria-hidden
        >
          <GameGlyph game={c.game} />
        </span>
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{c.hostName}</p>
        <p className="truncate text-xs text-muted-foreground">
          {game.name}
          {contextOf(c)}
        </p>
        {!isForFun(c) && (
          <p className="truncate text-xs font-medium text-success">
            Win to save {formatPaise(save)} ({c.discountPercent}% off)
          </p>
        )}
      </div>
      <Button
        size="sm"
        className="h-8 shrink-0 px-3 text-xs"
        nativeButton={false}
        render={<Link href={`/challenges/${c.id}`} />}
      >
        Play
      </Button>
    </div>
  )
}

function ChallengeList({ items, uid }: { items: Challenge[]; uid: string }) {
  return (
    <Card className="gap-0 divide-y py-0">
      {items.map((c) => {
        const status = statusFor(c, uid)
        const game = GAMES[c.game]
        const opponents =
          c.hostId === uid ? c.players.map((p) => c.playerNames[p]).join(", ") : `${c.hostName} (host)`
        return (
          <Link
            key={c.id}
            href={`/challenges/${c.id}`}
            className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/50"
          >
            <span
              className={cn("flex size-9 shrink-0 items-center justify-center rounded-md text-lg", GAME_TONE[c.game])}
              aria-hidden
            >
              <GameGlyph game={c.game} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                {game.name}
                <span className="font-normal text-muted-foreground">{contextOf(c)}</span>
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {isForFun(c) ? "" : `${c.discountPercent}% off · `}
                {opponents}
              </p>
            </div>
            <span className={cn("flex shrink-0 items-center gap-1.5 text-xs font-medium", status.tone)}>
              <span aria-hidden className="size-1.5 rounded-full bg-current" />
              {status.label}
            </span>
          </Link>
        )
      })}
    </Card>
  )
}
