"use client"

import { Fragment } from "react"
import Link from "next/link"
import { ReceiptIndianRupeeIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { Amount } from "@/components/shared/amount"
import { Item, ItemActions, ItemContent, ItemDescription, ItemGroup, ItemMedia, ItemSeparator, ItemTitle } from "@/components/ui/item"
import { useUnreadTracking } from "@/hooks/use-unread-tracking"
import type { Expense } from "@/lib/types"

/** Linked list of group expenses with payer, date, and amount (view only). */
export function GroupExpenseList({
  expenses,
  emptyText,
  showIcon = false,
}: {
  expenses: Expense[]
  emptyText: string
  showIcon?: boolean
}) {
  const { isExpenseUnread, markSeen } = useUnreadTracking()

  if (expenses.length === 0) {
    return <p className="p-8 text-center text-xs text-muted-foreground">{emptyText}</p>
  }

  return (
    <ItemGroup role="none" className="gap-0">
      {expenses.map((exp, i) => {
        const unread = isExpenseUnread(exp.id)
        return (
          <Fragment key={exp.id}>
            {i > 0 && <ItemSeparator className="my-0" />}
            <Item
              size="sm"
              className="flex-nowrap px-2"
              render={<Link href={`/expenses/${exp.id}`} onClick={() => markSeen(exp.id)} />}
            >
              {showIcon && (
                <ItemMedia className="size-10 rounded-xl bg-secondary text-primary">
                  <HugeiconsIcon icon={ReceiptIndianRupeeIcon} className="size-5" />
                </ItemMedia>
              )}
              <ItemContent className="min-w-0 gap-0.5">
                <ItemTitle className="flex items-center gap-1.5 text-xs font-bold">
                  <span className="truncate">{exp.title}</span>
                  {unread && (
                    <span
                      aria-label="New expense"
                      className="size-2 shrink-0 rounded-full bg-destructive shadow-sm animate-pulse"
                    />
                  )}
                </ItemTitle>
                <ItemDescription className="line-clamp-1 text-[11px]">
                  Paid by {exp.payerName}
                </ItemDescription>
              </ItemContent>
              <ItemActions className="flex-col items-end gap-0.5">
                <Amount paise={exp.amountPaise} className="text-xs font-bold" />
                <span className="text-[10px] text-muted-foreground">{exp.date}</span>
              </ItemActions>
            </Item>
          </Fragment>
        )
      })}
    </ItemGroup>
  )
}
