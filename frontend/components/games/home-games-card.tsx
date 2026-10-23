"use client"

import Link from "next/link"
import { ArrowRight01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { useSession } from "@/components/providers/session-provider"
import { Badge } from "@/components/ui/badge"
import { useChallenges } from "@/hooks/queries"
import { useLiveGameDiscounts } from "@/hooks/use-game-discounts"
import { formatCountdown, useNow } from "@/hooks/use-now"
import { activeDiscountPaise, discountExpiresAt, GAMES } from "@/lib/games"
import { formatPaise } from "@/lib/money"
import type { Challenge } from "@/lib/types"
import { cn } from "@/lib/utils"

/**
 * Home dashboard: games that need you — challenges to play, wins whose
 * discount is still running, and challenges you've sent. Hidden when empty.
 */
export function HomeGamesCard() {
  const { user } = useSession()
  const { data: challenges } = useChallenges()
  const uid = user?.uid ?? ""

  const wonLive = challenges.filter(
    (c) => c.status === "DONE" && c.result?.winners.includes(uid) && !c.redeemed?.[uid]
  )
  const now = useNow(Math.max(0, ...wonLive.map(discountExpiresAt)))

  const liveDiscounts = useLiveGameDiscounts()
  const hostLive = [...liveDiscounts.byPerson.values()].filter((d) => d.role === "host")

  const rows: { c: Challenge; kind: "play" | "pay" | "sent" | "lost"; who?: string }[] = [
    ...challenges
      .filter((c) => c.status === "OPEN" && c.players.includes(uid) && c.moves?.[uid] === undefined)
      .map((c) => ({ c, kind: "play" as const })),
    ...wonLive.filter((c) => activeDiscountPaise(c, uid, now) > 0).map((c) => ({ c, kind: "pay" as const })),
    // Someone beat you: their discount is live until the timer ends
    ...hostLive.flatMap((d) => {
      const c = challenges.find((x) => x.id === d.challengeId)
      return c ? [{ c, kind: "lost" as const, who: d.otherId }] : []
    }),
    ...challenges.filter((c) => c.status === "OPEN" && c.hostId === uid).map((c) => ({ c, kind: "sent" as const })),
  ]
  if (rows.length === 0) return null

  return (
    <section className="flex flex-col gap-2 rounded-3xl border border-warning/40 bg-warning/5 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold">🎮 Games</h2>
        <Link href="/challenges" className="flex items-center gap-1 text-xs font-bold text-primary hover:underline">
          See all <HugeiconsIcon icon={ArrowRight01Icon} className="size-3.5" />
        </Link>
      </div>
      <ul className="flex flex-col gap-1.5">
        {rows.slice(0, 3).map(({ c, kind, who }) => {
          const game = GAMES[c.game]
          const discount = activeDiscountPaise(c, uid, now)
          const lostDiscount = who ? liveDiscounts.byPerson.get(who) : undefined
          const waitingOn = c.players.filter((p) => c.moves?.[p] === undefined).map((p) => c.playerNames[p])
          return (
            <li key={`${c.id}-${kind}-${who ?? ""}`}>
              <Link
                href={`/challenges/${c.id}`}
                className="flex items-center gap-3 rounded-2xl bg-card p-3 shadow-xs transition hover:ring-1 hover:ring-primary/30"
              >
                <span className="text-2xl" aria-hidden>
                  {game.emoji}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold">
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
                      ? `Save ${formatPaise(discount)} · ends in ${formatCountdown(discountExpiresAt(c) - now)}`
                      : kind === "lost" && lostDiscount
                        ? `They pay ${formatPaise(lostDiscount.discountPaise)} less if paid in ${formatCountdown(lostDiscount.expiresAt - liveDiscounts.now)}`
                      : `${game.name} · ${c.discountPercent}% off${c.expenseTitle ? ` · ${c.expenseTitle}` : ""}`}
                  </span>
                </span>
                <Badge
                  className={cn(
                    "shrink-0 font-bold",
                    kind === "play"
                      ? "bg-primary text-primary-foreground"
                      : kind === "pay"
                        ? "bg-success text-success-foreground"
                        : kind === "lost"
                          ? "bg-warning/15 text-warning"
                          : "bg-muted text-muted-foreground"
                  )}
                >
                  {kind === "play" ? "Play" : kind === "pay" ? "Pay now" : kind === "lost" ? "Discount live" : "Sent"}
                </Badge>
              </Link>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
