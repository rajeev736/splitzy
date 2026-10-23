"use client"

import Link from "next/link"
import { GameController03Icon } from "@hugeicons/core-free-icons"

import { AppHeader } from "@/components/layout/app-header"
import { PageContainer } from "@/components/layout/app-shell"
import { useSession } from "@/components/providers/session-provider"
import { EmptyState } from "@/components/shared/empty-state"
import { ListSkeleton, QueryError } from "@/components/shared/query-state"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { useChallenges } from "@/hooks/queries"
import { GAMES } from "@/lib/games"
import type { Challenge } from "@/lib/types"
import { cn } from "@/lib/utils"

/** What this game needs from you right now, for the row badge. */
function statusFor(c: Challenge, uid: string): { label: string; tone: string } {
  if (c.status === "CANCELLED") return { label: "Cancelled", tone: "bg-muted text-muted-foreground" }
  if (c.status === "DONE") {
    if (c.hostId === uid) return { label: "Finished", tone: "bg-muted text-muted-foreground" }
    return c.result?.winners.includes(uid)
      ? { label: "You won", tone: "bg-success/15 text-success" }
      : { label: "Finished", tone: "bg-muted text-muted-foreground" }
  }
  if (c.hostId !== uid && c.moves[uid] === undefined) return { label: "Your turn", tone: "bg-primary text-primary-foreground" }
  return { label: "Waiting", tone: "bg-warning/15 text-warning" }
}

export default function ChallengesPage() {
  const { user } = useSession()
  const challenges = useChallenges()
  const uid = user?.uid ?? ""
  const open = challenges.data.filter((c) => c.status === "OPEN")
  const past = challenges.data.filter((c) => c.status !== "OPEN")

  return (
    <>
      <AppHeader title="Games" showBack />
      <PageContainer className="max-w-2xl gap-5 pb-24">
        <p className="text-xs text-muted-foreground">
          Challenge someone who owes you from <strong>Split Summary → People</strong>, or add a game when you create a
          group expense. Winners get a discount if they pay right after the game.
        </p>
        {challenges.isPending ? (
          <ListSkeleton rows={3} />
        ) : challenges.isError ? (
          <QueryError error={challenges.error} onRetry={() => challenges.refetch()} />
        ) : challenges.data.length === 0 ? (
          <Card>
            <EmptyState icon={GameController03Icon} title="No games yet" description="Your challenges will show up here." />
          </Card>
        ) : (
          <>
            {open.length > 0 && <ChallengeList title="Active" items={open} uid={uid} />}
            {past.length > 0 && <ChallengeList title="Finished" items={past} uid={uid} />}
          </>
        )}
      </PageContainer>
    </>
  )
}

function ChallengeList({ title, items, uid }: { title: string; items: Challenge[]; uid: string }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-xs font-bold tracking-wider text-muted-foreground uppercase">{title}</h2>
      <Card className="gap-0 divide-y py-0">
        {items.map((c) => {
          const status = statusFor(c, uid)
          const game = GAMES[c.game]
          const opponents =
            c.hostId === uid ? c.players.map((p) => c.playerNames[p]).join(", ") : `${c.hostName} (host)`
          return (
            <Link key={c.id} href={`/challenges/${c.id}`} className="flex items-center gap-3 p-4 transition hover:bg-muted/50">
              <span className="text-3xl" aria-hidden>
                {game.emoji}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold">
                  {game.name}
                  {c.expenseTitle && <span className="font-medium text-muted-foreground"> · {c.expenseTitle}</span>}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {c.discountPercent}% off · {opponents}
                </p>
              </div>
              <Badge className={cn("shrink-0 font-bold", status.tone)}>{status.label}</Badge>
            </Link>
          )
        })}
      </Card>
    </section>
  )
}
