"use client"

import * as React from "react"

import { useSession } from "@/components/providers/session-provider"
import { useChallenges, useExpenses } from "@/hooks/queries"
import { useNow } from "@/hooks/use-now"
import { DISCOUNT_WINDOW_MS } from "@/lib/games"
import { calculatePersonBalances, calculatePersonNetBreakdown, type SettlementScope } from "@/lib/money"
import type { Expense } from "@/lib/types"

/** A game discount running right now between you and one person. */
export interface LiveGameDiscount {
  challengeId: string
  /** The other person: the host you pay, or the winner who pays you. */
  otherId: string
  /** "winner": you pay less. "host": you receive less. */
  role: "winner" | "host"
  discountPaise: number
  percent: number
  /** ms since epoch */
  expiresAt: number
  /** Group games: where the game was played and the expense it was attached to. */
  groupId?: string
  expenseId?: string
  /**
   * Already used on a payment that's waiting for confirmation: balances keep
   * showing the discounted amount until it's confirmed, with no timer
   * (`expiresAt` is Infinity). Never applied to a new payment.
   */
  pending?: boolean
}

interface GameDiscountsValue {
  /** Live discounts keyed by the other person. */
  byPerson: Map<string, LiveGameDiscount>
  /** The shared clock every screen uses for countdowns. */
  now: number
}

const GameDiscountsContext = React.createContext<GameDiscountsValue>({ byPerson: new Map(), now: 0 })

/**
 * One app-wide source of live game discounts with one ticking clock, so every
 * balance, pay button and countdown agrees to the second and every screen
 * drops the discount at the same moment the timer ends.
 */
export function GameDiscountProvider({ children }: { children: React.ReactNode }) {
  const { user } = useSession()
  const { data: challenges } = useChallenges()
  const { data: expenses } = useExpenses()
  const uid = user?.uid ?? ""

  const candidates = React.useMemo(() => {
    const list: LiveGameDiscount[] = []
    for (const c of challenges) {
      if (c.status !== "DONE" || !c.resolvedAt || !c.result) continue
      const expiresAt = new Date(c.resolvedAt).getTime() + DISCOUNT_WINDOW_MS
      for (const winner of c.result.winners) {
        if (winner !== uid && c.hostId !== uid) continue
        const people = winner === uid ? { otherId: c.hostId, role: "winner" as const } : { otherId: winner, role: "host" as const }
        const redeemed = c.redeemed?.[winner] ?? 0
        if (redeemed > 0) {
          // Paid with the discount, not confirmed yet: both sides still see the discounted balance
          if (hasReportedDebt(winner, c.hostId, expenses)) {
            list.push({
              challengeId: c.id,
              discountPaise: redeemed,
              percent: c.discountPercent,
              expiresAt: Infinity,
              pending: true,
              ...(c.groupId ? { groupId: c.groupId } : {}),
              ...(c.expenseId ? { expenseId: c.expenseId } : {}),
              ...people,
            })
          }
          continue
        }
        const discountPaise = Math.floor(((c.bases?.[winner] ?? 0) * c.discountPercent) / 100)
        if (discountPaise <= 0) continue
        // Paid (reported or confirmed) → the game is over: no discount, no timer
        if (!hasOpenDebt(winner, c.hostId, expenses)) continue
        const base = {
          challengeId: c.id,
          discountPaise,
          percent: c.discountPercent,
          expiresAt,
          ...(c.groupId ? { groupId: c.groupId } : {}),
          ...(c.expenseId ? { expenseId: c.expenseId } : {}),
        }
        list.push({ ...base, ...people })
      }
    }
    return list
  }, [challenges, expenses, uid])

  // Only running timers need a ticking clock
  const now = useNow(Math.max(0, ...candidates.filter((d) => !d.pending).map((d) => d.expiresAt)))

  const value = React.useMemo<GameDiscountsValue>(() => {
    const byPerson = new Map<string, LiveGameDiscount>()
    for (const d of candidates) {
      if (now >= d.expiresAt) continue
      const current = byPerson.get(d.otherId)
      // A live offer beats one already used; otherwise the bigger discount wins
      const better = !current
        ? true
        : current.pending !== d.pending
          ? !!current.pending
          : d.discountPaise > current.discountPaise
      if (better) byPerson.set(d.otherId, d)
    }
    return { byPerson, now }
  }, [candidates, now])

  return <GameDiscountsContext.Provider value={value}>{children}</GameDiscountsContext.Provider>
}

/** The winner reported a payment to the host that isn't confirmed yet. */
function hasReportedDebt(winnerId: string, hostId: string, expenses: Expense[]) {
  return calculatePersonNetBreakdown(winnerId, hostId, expenses).aOwesBLines.some((l) => l.status === "PAYMENT_REPORTED")
}

/** The winner still owes the host something they haven't paid or reported yet. */
function hasOpenDebt(winnerId: string, hostId: string, expenses: Expense[]) {
  const breakdown = calculatePersonNetBreakdown(winnerId, hostId, expenses)
  return breakdown.netPayablePaise > 0 && breakdown.aOwesBLines.some((l) => l.status !== "PAYMENT_REPORTED")
}

/** Live game discounts (see GameDiscountProvider). */
export const useLiveGameDiscounts = () => React.useContext(GameDiscountsContext)

/**
 * Discounts that belong to a scoped balance (one group, or direct splits),
 * each capped by what's actually owed between the two of you in that scope.
 * `netAdjustPaise` is signed against your net: + when you owe less (won),
 * − when you're owed less (hosted). Group games count in their group only;
 * friend games count in direct splits.
 */
export function scopedGameDiscount(
  uid: string,
  byPerson: Map<string, LiveGameDiscount>,
  expenses: Expense[],
  scope: { groupId: string } | "direct"
) {
  let netAdjustPaise = 0
  let discountPaise = 0
  let endsAt = 0
  const perPerson = new Map<string, LiveGameDiscount>()
  const groupId = scope === "direct" ? undefined : scope.groupId
  const pairScope: SettlementScope = groupId ? { type: "group", groupId } : { type: "direct" }
  for (const d of byPerson.values()) {
    if (groupId ? d.groupId !== groupId : !!d.groupId) continue
    const pair = calculatePersonNetBreakdown(uid, d.otherId, expenses, pairScope)
    const owed = d.role === "winner" ? pair.netPayablePaise : pair.netReceivablePaise
    const off = Math.min(d.discountPaise, owed)
    if (off <= 0) continue
    perPerson.set(d.otherId, d)
    discountPaise += off
    netAdjustPaise += d.role === "winner" ? off : -off
    endsAt = endsAt ? Math.min(endsAt, d.expiresAt) : d.expiresAt
  }
  return { netAdjustPaise, discountPaise, endsAt, perPerson }
}

/** `scopedGameDiscount` for one group (pass its id) or for direct splits. */
export function useScopedGameDiscount(scope: { groupId: string } | "direct") {
  const { user } = useSession()
  const { data: expenses } = useExpenses()
  const { byPerson, now } = useLiveGameDiscounts()
  const key = scope === "direct" ? "direct" : scope.groupId

  return React.useMemo(
    () => ({
      ...(user
        ? scopedGameDiscount(user.uid, byPerson, expenses, key === "direct" ? "direct" : { groupId: key })
        : { netAdjustPaise: 0, discountPaise: 0, endsAt: 0, perPerson: new Map<string, LiveGameDiscount>() }),
      now,
    }),
    [user, byPerson, expenses, key, now]
  )
}

/**
 * Your overall balances with live game discounts applied: for the 10 minutes
 * after a game, a winner owes less and their host is owed less. Also returns
 * the total discount in play and when the first one ends (for a countdown).
 */
export function useDiscountedBalances() {
  const { user } = useSession()
  const { data: expenses } = useExpenses()
  const { byPerson, now } = useLiveGameDiscounts()

  return React.useMemo(() => {
    let owedToYou = 0
    let youOwe = 0
    let gameDiscountPaise = 0
    let gameDiscountEndsAt = 0
    if (user) {
      for (const p of calculatePersonBalances(user.uid, expenses)) {
        let amount = Math.abs(p.netBalancePaise)
        const d = byPerson.get(p.userId)
        if (d && ((d.role === "winner" && p.netBalancePaise < 0) || (d.role === "host" && p.netBalancePaise > 0))) {
          const off = Math.min(d.discountPaise, amount)
          amount -= off
          gameDiscountPaise += off
          gameDiscountEndsAt = gameDiscountEndsAt ? Math.min(gameDiscountEndsAt, d.expiresAt) : d.expiresAt
        }
        if (p.netBalancePaise > 0) owedToYou += amount
        else youOwe += amount
      }
    }
    return {
      netBalancePaise: owedToYou - youOwe,
      totalOwedToYouPaise: owedToYou,
      totalYouOwePaise: youOwe,
      gameDiscountPaise,
      gameDiscountEndsAt,
      now,
    }
  }, [user, expenses, byPerson, now])
}
