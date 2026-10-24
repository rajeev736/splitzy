"use client"

import Link from "next/link"
import { ArrowRight01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { useSession } from "@/components/providers/session-provider"
import { useChallenges } from "@/hooks/queries"
import { useLiveGameDiscounts } from "@/hooks/use-game-discounts"
import { formatCountdown } from "@/hooks/use-now"
import { GAMES, stakeLabel } from "@/lib/games"
import { formatPaise } from "@/lib/money"
import type { Challenge } from "@/lib/types"
import { cn } from "@/lib/utils"
import { GameGlyph } from "./game-glyph"

/**
 * Home dashboard: games that need you — challenges to play, wins whose
 * discount is still running, and challenges you've sent. Hidden when empty.
 */
export function HomeGamesCard() {
  const { user } = useSession()
  const { data: challenges } = useChallenges()
  const uid = user?.uid ?? ""

  // Live discounts drop the moment the winner pays or the timer ends
  const liveDiscounts = useLiveGameDiscounts()
  // Offers still running (not ones already used on a payment awaiting confirmation)
  const live = [...liveDiscounts.byPerson.values()].filter((d) => !d.pending)
  const wonLive = live.filter((d) => d.role === "winner")
  const hostLive = live.filter((d) => d.role === "host")

  const rows: { c: Challenge; kind: "play" | "pay" | "sent" | "lost"; who?: string }[] = [
    ...challenges
      .filter((c) => c.status === "OPEN" && c.players.includes(uid) && c.moves?.[uid] === undefined)
      .map((c) => ({ c, kind: "play" as const })),
    ...wonLive.flatMap((d) => {
      const c = challenges.find((x) => x.id === d.challengeId)
      return c ? [{ c, kind: "pay" as const, who: d.otherId }] : []
    }),
    // Someone beat you: their discount is live until the timer ends
    ...hostLive.flatMap((d) => {
      const c = challenges.find((x) => x.id === d.challengeId)
      return c ? [{ c, kind: "lost" as const, who: d.otherId }] : []
    }),
    ...challenges.filter((c) => c.status === "OPEN" && c.hostId === uid).map((c) => ({ c, kind: "sent" as const })),
  ]
  if (rows.length === 0) return null

  return (
    <section className="flex flex-col rounded-lg border bg-card">
      <div className="flex items-center justify-between px-4 pt-3.5 pb-1">
        <h2 className="text-sm font-semibold">Games</h2>
        <Link
          href="/challenges"
          className={cn(
            "text-xs font-medium transition-colors",
            rows.length > 3 ? "text-primary hover:underline" : "text-muted-foreground hover:text-foreground"
          )}
        >
          {rows.length > 3 ? `View all ${rows.length}` : "See all"}
        </Link>
      </div>
      <ul className="flex flex-col divide-y px-1 pb-1">
        {rows.slice(0, 3).map(({ c, kind, who }) => {
          const game = GAMES[c.game]
          const liveDiscount = who ? liveDiscounts.byPerson.get(who) : undefined
          const waitingOn = c.players.filter((p) => c.moves?.[p] === undefined).map((p) => c.playerNames[p])
          return (
            <li key={`${c.id}-${kind}-${who ?? ""}`}>
              <Link
                href={`/challenges/${c.id}`}
                className="flex items-center gap-3 rounded-md px-3 py-3 transition-colors hover:bg-muted/60"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-md border text-lg" aria-hidden>
                  <GameGlyph game={c.game} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">
                    {kind === "play"
                      ? `${c.hostName} challenged you`
                      : kind === "pay"
                        ? `You won ${c.hostName}'s game!`
                        : kind === "lost"
                          ? `${c.playerNames[who ?? ""]} won your game`
                          : `Waiting for ${waitingOn.join(", ") || "the result"}`}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {kind === "pay"
                      ? `Save ${formatPaise(liveDiscount?.discountPaise ?? 0)} · ends in ${formatCountdown((liveDiscount?.expiresAt ?? 0) - liveDiscounts.now)}`
                      : kind === "lost" && liveDiscount
                        ? `They pay ${formatPaise(liveDiscount.discountPaise)} less if paid in ${formatCountdown(liveDiscount.expiresAt - liveDiscounts.now)}`
                      : `${game.name} · ${stakeLabel(c)}${c.expenseTitle ? ` · ${c.expenseTitle}` : c.groupName ? ` · ${c.groupName}` : ""}`}
                  </span>
                </span>
                <span
                  className={cn(
                    "flex shrink-0 items-center gap-0.5 text-xs font-medium",
                    kind === "play"
                      ? "text-primary"
                      : kind === "pay"
                        ? "text-success"
                        : kind === "lost"
                          ? "text-warning"
                          : "text-muted-foreground"
                  )}
                >
                  {kind === "play" ? "Play" : kind === "pay" ? "Pay now" : kind === "lost" ? "Live" : "Sent"}
                  <HugeiconsIcon icon={ArrowRight01Icon} className="size-3.5" />
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
      {rows.length > 3 && (
        <Link
          href="/challenges"
          className="flex items-center justify-center gap-1 border-t px-4 py-2.5 text-xs font-medium text-primary transition-colors hover:bg-muted/60"
        >
          {rows.length - 3} more in Games
          <HugeiconsIcon icon={ArrowRight01Icon} className="size-3.5" />
        </Link>
      )}
    </section>
  )
}
