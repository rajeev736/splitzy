"use client"

import * as React from "react"

import { useSession } from "@/components/providers/session-provider"
import { useChallenges, useExpenses } from "@/hooks/queries"
import { useNow } from "@/hooks/use-now"
import { DISCOUNT_WINDOW_MS } from "@/lib/games"
import { calculatePersonBalances } from "@/lib/money"

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
  const uid = user?.uid ?? ""

  const candidates = React.useMemo(() => {
    const list: LiveGameDiscount[] = []
    for (const c of challenges) {
      if (c.status !== "DONE" || !c.resolvedAt || !c.result) continue
      const expiresAt = new Date(c.resolvedAt).getTime() + DISCOUNT_WINDOW_MS
      for (const winner of c.result.winners) {
        if (c.redeemed?.[winner]) continue
        const discountPaise = Math.floor(((c.bases?.[winner] ?? 0) * c.discountPercent) / 100)
        if (discountPaise <= 0) continue
        const base = { challengeId: c.id, discountPaise, percent: c.discountPercent, expiresAt }
        if (winner === uid) list.push({ ...base, otherId: c.hostId, role: "winner" })
        else if (c.hostId === uid) list.push({ ...base, otherId: winner, role: "host" })
      }
    }
    return list
  }, [challenges, uid])

  const now = useNow(Math.max(0, ...candidates.map((d) => d.expiresAt)))

  const value = React.useMemo<GameDiscountsValue>(() => {
    const byPerson = new Map<string, LiveGameDiscount>()
    for (const d of candidates) {
      if (now >= d.expiresAt) continue
      const current = byPerson.get(d.otherId)
      if (!current || d.discountPaise > current.discountPaise) byPerson.set(d.otherId, d)
    }
    return { byPerson, now }
  }, [candidates, now])

  return <GameDiscountsContext.Provider value={value}>{children}</GameDiscountsContext.Provider>
}

/** Live game discounts (see GameDiscountProvider). */
export const useLiveGameDiscounts = () => React.useContext(GameDiscountsContext)

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
