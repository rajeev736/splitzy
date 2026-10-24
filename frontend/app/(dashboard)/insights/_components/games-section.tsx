"use client"

import Link from "next/link"

import { useSession } from "@/components/providers/session-provider"
import { useChallenges } from "@/hooks/queries"
import { gameStats } from "@/lib/games"
import { formatPaise } from "@/lib/money"
import { SectionCard, SectionEmpty } from "./section-card"
import { GameGlyph } from "@/components/games/game-glyph"

function Stat({ label, value, hint, tone }: { label: string; value: string; hint: string; tone?: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={`text-xl font-semibold tabular-nums ${tone ?? ""}`}>{value}</span>
      <span className="text-[11px] text-muted-foreground">{hint}</span>
    </div>
  )
}

/** How much settle-up games have saved you (all time). */
export function GamesSection() {
  const { user } = useSession()
  const { data: challenges } = useChallenges()
  const stats = gameStats(challenges, user?.uid ?? "")
  const anyGames = stats.played > 0 || stats.hosted > 0

  return (
    <SectionCard
      title="Games"
      description="All time — money saved by winning settle-up games"
      action={
        <Link href="/challenges" className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground">
          View games
        </Link>
      }
    >
      {!anyGames ? (
        <SectionEmpty>
          No games played yet. Challenge someone who owes you from Split Summary, or add a game to a group expense.
        </SectionEmpty>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-x-4 gap-y-5 lg:grid-cols-4">
            <Stat
              label="You saved"
              value={formatPaise(stats.savedPaise)}
              hint="Discounts you used after winning"
              tone="text-success"
            />
            <Stat label="Win rate" value={`${stats.winRate}%`} hint={`${stats.won} won of ${stats.played} played`} />
            <Stat label="Hosted" value={String(stats.hosted)} hint="Games you challenged others to" />
            <Stat label="Given away" value={formatPaise(stats.givenPaise)} hint="Discounts winners used on you" />
          </div>
          {stats.savings.length > 0 && (
            <ul className="-mx-4 flex flex-col divide-y border-t">
              {stats.savings.slice(0, 5).map(({ challenge, savedPaise }) => (
                <li key={challenge.id}>
                  <Link
                    href={`/challenges/${challenge.id}`}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-muted/50"
                  >
                    <span className="text-base" aria-hidden>
                      <GameGlyph game={challenge.game} />
                    </span>
                    <span className="min-w-0 flex-1 truncate">
                      Beat {challenge.hostName}
                      {challenge.expenseTitle && <span className="text-muted-foreground"> · {challenge.expenseTitle}</span>}
                    </span>
                    <span className="shrink-0 font-semibold text-success tabular-nums">+{formatPaise(savedPaise)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </SectionCard>
  )
}
