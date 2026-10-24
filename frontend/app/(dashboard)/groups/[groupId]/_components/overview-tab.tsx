"use client"

import * as React from "react"
import { ArrowRight01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { GameDiscountTag } from "@/components/games/game-discount-amount"
import { Amount } from "@/components/shared/amount"
import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useExpenses } from "@/hooks/queries"
import { useScopedGameDiscount } from "@/hooks/use-game-discounts"
import { calculateMemberGroupBalance } from "@/lib/money"
import type { Expense, Group } from "@/lib/types"
import { cn } from "@/lib/utils"
import { BalanceBreakdownSheet } from "./balance-breakdown-sheet"
import { GroupExpenseList } from "./group-expense-list"

function StatCard({
  label,
  paise,
  signed = false,
  hint,
  badge,
  onClick,
  className,
}: {
  label: string
  paise: number
  /** Green "+" when positive, red when negative — same convention as every balance. */
  signed?: boolean
  hint?: string
  badge?: React.ReactNode
  /** Makes the whole card a button (shows a chevron). */
  onClick?: () => void
  className?: string
}) {
  const body = (
    <CardContent className="flex items-center gap-3">
      <div className="flex min-w-0 flex-1 flex-col items-start gap-1">
        <span className="text-xs text-muted-foreground">{label}</span>
        <Amount paise={paise} signed={signed} className="text-lg font-semibold tabular-nums" />
        {badge}
        {hint && <span className="text-[11px] text-muted-foreground">{hint}</span>}
      </div>
      {onClick && <HugeiconsIcon icon={ArrowRight01Icon} className="size-4 shrink-0 text-muted-foreground" />}
    </CardContent>
  )

  if (!onClick) {
    return (
      <Card size="sm" className={className}>
        {body}
      </Card>
    )
  }
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn("group/stat rounded-lg text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50", className)}
    >
      <Card size="sm" className="h-full transition-colors group-hover/stat:bg-muted/40">
        {body}
      </Card>
    </button>
  )
}

export function OverviewTab({
  group,
  expenses,
  userId,
  onViewAll,
}: {
  group: Group
  expenses: Expense[]
  userId: string | undefined
  onViewAll: () => void
}) {
  const [breakdownOpen, setBreakdownOpen] = React.useState(false)

  const totalExpensePaise = expenses.reduce((acc, e) => acc + e.amountPaise, 0)
  const myTotalGroupSharePaise = expenses.reduce(
    (acc, e) => acc + (e.shares?.find((s) => s.userId === userId)?.amountPaise ?? 0),
    0
  )
  // Balances net against your other splits with the same people, so they need
  // every expense you're in — not just this group's
  const { data: myExpenses } = useExpenses()
  const balanceExpenses = React.useMemo(() => {
    const byId = new Map(myExpenses.map((e) => [e.id, e]))
    expenses.forEach((e) => byId.set(e.id, e))
    return Array.from(byId.values())
  }, [myExpenses, expenses])
  const balance = userId ? calculateMemberGroupBalance(userId, group.id, balanceExpenses) : null
  // A live game on this group's expenses lowers what you pay / get back
  const game = useScopedGameDiscount({ groupId: group.id })
  const netPaise = (balance?.netPaise ?? 0) + game.netAdjustPaise
  const offsetPaise = balance?.offsetPaise ?? 0

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard
          label="Your balance"
          paise={netPaise}
          signed
          hint={
            netPaise > 0
              ? "You get back · tap for details"
              : netPaise < 0
                ? "You need to pay · tap to pay"
                : offsetPaise > 0
                  ? `Nothing to pay · ₹${(offsetPaise / 100).toFixed(0)} cancelled out with other splits`
                  : "All settled"
          }
          badge={<GameDiscountTag discountPaise={game.discountPaise} endsAt={game.endsAt} now={game.now} />}
          onClick={userId ? () => setBreakdownOpen(true) : undefined}
          className="col-span-2 sm:col-span-1"
        />
        <StatCard label="Total expenses" paise={totalExpensePaise} />
        <StatCard label="Your share" paise={myTotalGroupSharePaise} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Recent expenses</CardTitle>
          <CardAction>
            <Button variant="link" size="sm" className="h-auto p-0 text-xs font-medium" onClick={onViewAll}>
              View all ({expenses.length})
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent>
          <GroupExpenseList
            expenses={expenses.slice(0, 4)}
            emptyText="No expenses recorded in this group yet."
            showIcon
          />
        </CardContent>
      </Card>

      {userId && (
        <BalanceBreakdownSheet
          open={breakdownOpen}
          onOpenChange={setBreakdownOpen}
          userId={userId}
          group={group}
          expenses={balanceExpenses}
          netPaise={netPaise}
        />
      )}
    </div>
  )
}
