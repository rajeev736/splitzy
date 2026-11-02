"use client"

import * as React from "react"
import { Invoice01Icon, Notification01Icon, UserGroupIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { ChallengeButton } from "@/components/games/challenge-button"
import { ChallengeInviteStrip } from "@/components/games/challenge-invite"
import { GameDiscountTag } from "@/components/games/game-discount-amount"
import { useSession } from "@/components/providers/session-provider"
import { PayPersonButton } from "@/components/shared/pay-person-button"
import {
  PaymentDisputeLine,
  PaymentReceivedOr,
  usePendingPaymentFrom,
} from "@/components/shared/payment-received-prompt"
import { Button } from "@/components/ui/button"
import { useSendFriendBalanceReminder } from "@/hooks/mutations"
import { useExpenses, useGroups } from "@/hooks/queries"
import { useLiveGameDiscounts } from "@/hooks/use-game-discounts"
import { calculateDirectBalance, filterExpensesByScope, formatPaise } from "@/lib/money"
import type { UserProfile } from "@/lib/types"
import { cn } from "@/lib/utils"

/**
 * Where you stand with a friend: direct splits and each shared group, with the
 * live game discount applied the same way the pay dialog applies it, and the
 * right action for each (Pay, Remind, Challenge).
 */
export function FriendMoney({ friend }: { friend: UserProfile }) {
  const { user } = useSession()
  const { data: expenses } = useExpenses()
  const { data: groups } = useGroups()
  const sendReminder = useSendFriendBalanceReminder()
  const gameDiscounts = useLiveGameDiscounts()
  const game = gameDiscounts.byPerson.get(friend.uid)
  const pending = usePendingPaymentFrom(friend.uid)
  const first = friend.displayName.split(" ")[0]

  const raw = React.useMemo(() => {
    if (!user) return null
    const direct = calculateDirectBalance(user.uid, friend.uid, filterExpensesByScope(expenses, { type: "direct" }))
    const groupRows = groups
      .filter((g) => g.members.includes(user.uid) && g.members.includes(friend.uid))
      .map((g) => ({
        group: g,
        originalPaise: calculateDirectBalance(
          user.uid,
          friend.uid,
          expenses.filter((e) => !e.deletedAt && e.groupId === g.id)
        ).netBalancePaise,
      }))
      .filter((r) => r.originalPaise !== 0)
    return { direct, groupRows }
  }, [user, friend.uid, groups, expenses])

  // The discount lands on one balance: the game's own group if it has something to discount, else direct, else the first group
  const gameOff = React.useMemo(() => {
    if (!game || !raw) return { key: null as string | null, offPaise: 0 }
    const offOn = (net: number) => Math.max(0, Math.min(game.discountPaise, game.role === "winner" ? -net : net))
    const candidates = [
      ...(game.groupId
        ? raw.groupRows.filter((r) => r.group.id === game.groupId).map((r) => ({ key: r.group.id, net: r.originalPaise }))
        : []),
      { key: "direct", net: raw.direct.netBalancePaise },
      ...raw.groupRows.map((r) => ({ key: r.group.id, net: r.originalPaise })),
    ]
    const hit = candidates.find((c) => offOn(c.net) > 0)
    return hit ? { key: hit.key, offPaise: offOn(hit.net) } : { key: null, offPaise: 0 }
  }, [game, raw])

  if (!raw) return null

  const applyOff = (key: string, net: number) => {
    const offPaise = gameOff.key === key ? gameOff.offPaise : 0
    return { netPaise: net + (game?.role === "winner" ? offPaise : -offPaise), offPaise, originalPaise: net }
  }
  const rows = [
    ...(raw.direct.netBalancePaise !== 0
      ? [{ key: "direct", label: "Direct splits", icon: Invoice01Icon, ...applyOff("direct", raw.direct.netBalancePaise) }]
      : []),
    ...raw.groupRows.map((r) => ({ key: r.group.id, label: r.group.name, icon: UserGroupIcon, ...applyOff(r.group.id, r.originalPaise) })),
  ]
  const total = rows.reduce((s, r) => s + r.netPaise, 0)
  const owedRows = rows.filter((r) => r.netPaise < 0)

  const remind = (amountPaise: number) => sendReminder.mutate({ targetUserId: friend.uid, amountPaise })

  return (
    <section className="flex flex-col gap-3">
      {/* Headline: the overall balance */}
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs text-muted-foreground">
            {total > 0 ? `${first} owes you` : total < 0 ? `You owe ${first}` : "Balance"}
          </div>
          <div
            className={cn(
              "text-2xl font-bold tracking-tight tabular-nums",
              total > 0 ? "text-success" : total < 0 ? "text-destructive" : "text-foreground"
            )}
          >
            {total === 0 ? "All settled" : formatPaise(Math.abs(total))}
          </div>
        </div>
        {!pending && total < 0 && (
          <PayPersonButton personId={friend.uid} personName={friend.displayName} size="sm" label={`Pay ${first}`} />
        )}
        {!pending && total > 0 && (
          <div className="flex shrink-0 gap-2">
            <Button variant="outline" size="sm" className="gap-1.5" disabled={sendReminder.isPending} onClick={() => remind(total)}>
              <HugeiconsIcon icon={Notification01Icon} className="size-3.5" />
              Remind
            </Button>
          </div>
        )}
      </div>

      <PaymentReceivedOr personId={friend.uid} personName={friend.displayName}>
        {null}
      </PaymentReceivedOr>
      <PaymentDisputeLine personId={friend.uid} personName={friend.displayName} />
      <ChallengeInviteStrip personId={friend.uid} />

      {/* Per context, when there's more than one place money is open */}
      {rows.length > 1 && (
        <div className="flex flex-col divide-y rounded-lg border bg-card">
          {rows.map((r) => (
            <div key={r.key} className="flex items-center gap-3 px-3 py-2.5">
              <HugeiconsIcon icon={r.icon} className="size-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{r.label}</div>
                {r.offPaise > 0 && (
                  <div className="text-[11px] text-muted-foreground line-through">{formatPaise(Math.abs(r.originalPaise))}</div>
                )}
                <div className={cn("text-xs font-medium tabular-nums", r.netPaise > 0 ? "text-success" : "text-destructive")}>
                  {r.netPaise > 0 ? `${formatPaise(r.netPaise)} owed to you` : `${formatPaise(-r.netPaise)} you owe`}
                </div>
                {game && r.offPaise > 0 && (
                  <GameDiscountTag className="mt-1" discountPaise={r.offPaise} endsAt={game.expiresAt} now={gameDiscounts.now} />
                )}
              </div>
              {!pending &&
                (r.netPaise > 0 ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 shrink-0 px-2 text-xs"
                    disabled={sendReminder.isPending}
                    onClick={() => remind(r.netPaise)}
                  >
                    Remind
                  </Button>
                ) : owedRows.length > 1 ? (
                  <PayPersonButton
                    personId={friend.uid}
                    personName={`${friend.displayName} (${r.label})`}
                    size="sm"
                  />
                ) : null)}
            </div>
          ))}
        </div>
      )}

      {/* Owed to you overall: a settle-up game */}
      {total > 0 && !pending && (
        <div className="flex items-center justify-between gap-3 rounded-lg border bg-card px-3 py-2.5">
          <div className="min-w-0 text-xs text-muted-foreground">
            Play {first} for a discount on the {formatPaise(total)} they owe
          </div>
          <ChallengeButton
            person={{ uid: friend.uid, name: friend.displayName, photoURL: friend.photoURL }}
            owedPaise={total}
          />
        </div>
      )}
    </section>
  )
}
