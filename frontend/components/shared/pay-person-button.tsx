"use client"

import * as React from "react"
import { useRouter } from "nextjs-toploader/app"
import { CreditCardIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { useSession } from "@/components/providers/session-provider"
import { Amount } from "@/components/shared/amount"
import { BottomSheet } from "@/components/shared/bottom-sheet"
import { Button } from "@/components/ui/button"
import { useExpenses } from "@/hooks/queries"
import { calculateDirectBalance, getExpenseDebts } from "@/lib/money"
import type { Expense } from "@/lib/types"

/** Unpaid expenses where the signed-in user owes `personId`. */
function useDebtsTo(personId: string) {
  const { user } = useSession()
  const { data: expenses } = useExpenses()
  return React.useMemo(() => {
    if (!user) return { lines: [], netPaise: 0, hasOffset: false, offsetPaise: 0 }
    const direct = calculateDirectBalance(user.uid, personId, expenses)
    if (direct.netBalancePaise >= 0) {
      // All settled or they owe us
      return { lines: [], netPaise: 0, hasOffset: false, offsetPaise: 0 }
    }

    const lines: { expense: Expense; amountPaise: number }[] = []
    for (const expense of expenses) {
      const amountPaise = getExpenseDebts(expense)
        .filter((d) => d.fromUserId === user.uid && d.toUserId === personId)
        .reduce((sum, d) => sum + d.amountPaise, 0)
      if (amountPaise > 0) lines.push({ expense, amountPaise })
    }
    return {
      lines,
      netPaise: Math.abs(direct.netBalancePaise),
      hasOffset: direct.userBOwesUserAPaise > 0,
      offsetPaise: direct.userBOwesUserAPaise,
    }
  }, [expenses, personId, user])
}

/**
 * "Pay" for everything you owe one person. A single expense goes straight to
 * its UPI pay screen; several open a drawer to pay them one by one.
 * Renders nothing when you don't owe this person anything (or if splits cancelled out).
 */
export function PayPersonButton({
  personId,
  personName,
  size = "sm",
  className,
}: {
  personId: string
  personName: string
  size?: "sm" | "default" | "lg"
  className?: string
}) {
  const router = useRouter()
  const { lines, netPaise, hasOffset, offsetPaise } = useDebtsTo(personId)
  const [open, setOpen] = React.useState(false)

  if (lines.length === 0 || netPaise === 0) return null

  const pay = (expenseId: string) => {
    setOpen(false)
    router.push(`/expenses/${expenseId}/pay`)
  }

  return (
    <>
      <Button
        size={size}
        className={className}
        onClick={(e) => {
          e.stopPropagation()
          if (lines.length === 1) pay(lines[0].expense.id)
          else setOpen(true)
        }}
      >
        <HugeiconsIcon icon={CreditCardIcon} data-icon="inline-start" />
        Pay
      </Button>

      {lines.length > 1 && (
        <BottomSheet
          open={open}
          onOpenChange={setOpen}
          title={`Pay ${personName}`}
          description={
            <>
              Net payable <Amount paise={netPaise} className="font-bold text-destructive" />
              {hasOffset && (
                <span className="block text-[11px] text-muted-foreground">
                  (Split-to-split adjusted: ₹{(offsetPaise / 100).toFixed(0)} offset applied)
                </span>
              )}
            </>
          }
          bodyClassName="pb-6"
        >
          <div className="flex flex-col">
            {lines.map(({ expense, amountPaise }) => (
              <div key={expense.id} className="flex min-w-0 items-center gap-3 border-b py-3 last:border-b-0">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">{expense.title}</div>
                  <div className="truncate text-xs text-muted-foreground">
                    {expense.groupName || "Direct split"} · {expense.date}
                  </div>
                </div>
                <Amount paise={amountPaise} className="shrink-0 text-sm font-bold text-destructive" />
                <Button size="sm" className="shrink-0" onClick={() => pay(expense.id)}>
                  Pay
                </Button>
              </div>
            ))}
          </div>
        </BottomSheet>
      )}
    </>
  )
}
