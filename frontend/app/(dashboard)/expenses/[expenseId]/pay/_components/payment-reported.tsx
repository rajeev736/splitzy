"use client"

import { Tick02Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { Amount } from "@/components/shared/amount"
import { ButtonLink } from "@/components/shared/button-link"
import { GroupIcon } from "@/components/shared/group-icon"
import { StatusBadge } from "@/components/shared/status-badge"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import type { Expense } from "@/lib/types"
import { InfoCallout } from "./info-callout"

/** Success screen shown once the member has reported their payment. */
export function PaymentReported({ expense, amountPaise }: { expense: Expense; amountPaise: number }) {
  return (
    <div className="flex animate-in flex-col gap-6 text-center duration-200 zoom-in-95">
      <div className="mx-auto flex size-14 items-center justify-center rounded-full border text-success">
        <HugeiconsIcon icon={Tick02Icon} className="size-7" strokeWidth={2.5} />
      </div>

      <div>
        <h2 className="text-xl font-semibold">Payment reported</h2>
        <p className="mt-1 text-xs text-muted-foreground">You have returned from your UPI app.</p>
      </div>

      <Card className="text-left">
        <CardContent className="flex flex-col gap-3.5 text-xs">
          <div className="flex items-center gap-3">
            <GroupIcon src={expense.groupIcon} alt={expense.title} size="sm" />
            <div className="min-w-0 truncate text-sm font-medium">{expense.title}</div>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Amount</span>
            <Amount paise={amountPaise} className="text-base font-semibold tabular-nums" />
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">To</span>
            <span className="min-w-0 text-right font-medium break-all">
              {expense.recipientName} ({expense.recipientUpiId})
            </span>
          </div>
          <div className="flex items-center justify-between pt-1">
            <span className="text-muted-foreground">Status</span>
            <StatusBadge status="payment_reported" />
          </div>
        </CardContent>
      </Card>

      <div className="text-left">
        <InfoCallout>
          The payment has been reported. It will be marked as <strong>Paid</strong> once {expense.recipientName}{" "}
          confirms receipt.
        </InfoCallout>
      </div>

      <div className="flex flex-col gap-2.5 pt-2">
        <ButtonLink href="/home" size="lg" className="h-11 w-full">
          Done
        </ButtonLink>
        <ButtonLink href={`/expenses/${expense.id}`} variant="outline" className="w-full">
          View Expense
        </ButtonLink>
      </div>
    </div>
  )
}
