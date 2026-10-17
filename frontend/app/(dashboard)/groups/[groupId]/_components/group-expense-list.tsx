import { Fragment } from "react"
import Link from "next/link"
import { ReceiptIndianRupeeIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { Amount } from "@/components/shared/amount"
import { StatusBadge } from "@/components/shared/status-badge"
import { Item, ItemActions, ItemContent, ItemDescription, ItemGroup, ItemMedia, ItemSeparator, ItemTitle } from "@/components/ui/item"
import type { Expense } from "@/lib/types"

/** Linked list of group expenses with payer, date, amount and paid/pending badge. */
export function GroupExpenseList({
  expenses,
  emptyText,
  showIcon = false,
}: {
  expenses: Expense[]
  emptyText: string
  showIcon?: boolean
}) {
  if (expenses.length === 0) {
    return <p className="p-8 text-center text-xs text-muted-foreground">{emptyText}</p>
  }

  return (
    <ItemGroup role="none" className="gap-0">
      {expenses.map((exp, i) => (
        <Fragment key={exp.id}>
          {i > 0 && <ItemSeparator className="my-0" />}
          <Item size="sm" className="flex-nowrap px-2" render={<Link href={`/expenses/${exp.id}`} />}>
            {showIcon && (
              <ItemMedia className="size-10 rounded-xl bg-secondary text-primary">
                <HugeiconsIcon icon={ReceiptIndianRupeeIcon} className="size-5" />
              </ItemMedia>
            )}
            <ItemContent className="min-w-0 gap-0.5">
              <ItemTitle className="text-xs font-bold">{exp.title}</ItemTitle>
              <ItemDescription className="line-clamp-1 text-[11px]">
                Paid by {exp.payerName} • {exp.date}
              </ItemDescription>
            </ItemContent>
            <ItemActions className="flex-col items-end gap-1">
              <Amount paise={exp.amountPaise} className="text-xs font-bold" />
              <StatusBadge status={exp.shares.every((s) => s.status === "PAID") ? "paid" : "pending"} />
            </ItemActions>
          </Item>
        </Fragment>
      ))}
    </ItemGroup>
  )
}
