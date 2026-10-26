"use client"

import * as React from "react"

import { useSession } from "@/components/providers/session-provider"
import { useSettleWithGameWaiver } from "@/hooks/mutations"
import { useChallenges, useExpenses } from "@/hooks/queries"
import { calculatePersonNetBreakdown } from "@/lib/money"

/**
 * Winning a 100%-off game settles the balance with the host by itself: as soon
 * as this device sees the win (on any screen), it claims the discount and
 * closes the shares, and the host gets a notification. Each game is tried once
 * per session; the result page keeps a manual "Settle up for free" as a fallback.
 */
export function GameWinAutoSettle() {
  const { user } = useSession()
  const { data: challenges } = useChallenges()
  const expenses = useExpenses()
  const waive = useSettleWithGameWaiver({ successMessage: "You won a 100% off game — your balance is settled!" })
  const tried = React.useRef(new Set<string>())
  const uid = user?.uid

  React.useEffect(() => {
    if (!uid || expenses.isPending || waive.isPending) return
    for (const c of challenges) {
      if (tried.current.has(c.id)) continue
      if (c.status !== "DONE" || c.discountPercent !== 100 || c.hostId === uid) continue
      if (!c.result?.winners.includes(uid) || c.redeemed?.[uid]) continue

      const breakdown = calculatePersonNetBreakdown(
        uid,
        c.hostId,
        expenses.data,
        c.groupId ? { type: "group", groupId: c.groupId } : undefined
      )
      const open = breakdown.aOwesBLines.filter((l) => l.status !== "PAYMENT_REPORTED")
      if (breakdown.netPayablePaise <= 0 || open.length === 0) continue
      // Only what the game covers: the amount when it was set up, from splits made before it
      const covers = c.bases?.[uid] ?? 0
      if (covers < breakdown.netPayablePaise) continue
      if (breakdown.aOwesBLines.some((l) => l.expense.createdAt > c.createdAt)) continue

      tried.current.add(c.id)
      waive.mutate({ creditorId: c.hostId, challengeId: c.id })
      return // one at a time; the next run picks up any other wins
    }
  }, [uid, challenges, expenses.isPending, expenses.data, waive])

  return null
}
