"use client"

import * as React from "react"
import { ArrowRight01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { Amount } from "@/components/shared/amount"
import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
  onClick,
  className,
}: {
  label: string
  paise: number
  /** Green "+" when positive, red when negative — same convention as every balance. */
  signed?: boolean
  hint?: string
  /** Makes the whole card a button (shows a chevron). */
  onClick?: () => void
  className?: string
}) {
  const body = (
    <CardContent className="flex items-center gap-3">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="text-[11px] font-semibold text-muted-foreground">{label}</span>
        <Amount paise={paise} signed={signed} className="text-lg font-extrabold" />
        {hint && <span className="text-[11px] text-muted-foreground">{hint}</span>}
      </div>
      {onClick && <HugeiconsIcon icon={ArrowRight01Icon} className="size-5 shrink-0 text-muted-foreground" />}
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
      className={cn("group/stat rounded-xl text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50", className)}
    >
      <Card size="sm" className="h-full transition-colors group-hover/stat:bg-muted/40 group-hover/stat:ring-primary/40">
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
  const netPaise = userId ? calculateMemberGroupBalance(userId, group.id, expenses).netPaise : 0

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard
          label="Your Balance"
          paise={netPaise}
          signed
          hint={
            netPaise > 0
              ? "You get back · tap for details"
              : netPaise < 0
                ? "You need to pay · tap to pay"
                : "All settled"
          }
          onClick={userId ? () => setBreakdownOpen(true) : undefined}
          className="col-span-2 sm:col-span-1"
        />
        <StatCard label="Total Expenses" paise={totalExpensePaise} />
        <StatCard label="Your Share" paise={myTotalGroupSharePaise} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-bold">Recent Group Expenses</CardTitle>
          <CardAction>
            <Button variant="link" size="sm" className="h-auto p-0 text-xs font-bold" onClick={onViewAll}>
              View All ({expenses.length})
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
          expenses={expenses}
          netPaise={netPaise}
        />
      )}
    </div>
  )
}
