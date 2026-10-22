"use client"

import * as React from "react"
import { CreditCardIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { useSession } from "@/components/providers/session-provider"
import { Button } from "@/components/ui/button"
import { useExpenses } from "@/hooks/queries"
import { calculatePersonNetBreakdown, type SettlementScope } from "@/lib/money"
import { SettleExpensesDialog } from "@/components/settlement/settle-expenses-dialog"

/**
 * PhonePe-style person-to-person net settlement button.
 * Opens the unified settlement dialog to settle the final net balance with this person.
 * Automatically renders nothing when net balance is zero (splits balanced out).
 */
export function PayPersonButton({
  personId,
  personName,
  personPhoto,
  personUpiId,
  scope,
  size = "sm",
  variant = "default",
  className,
  label = "Pay",
}: {
  personId: string
  personName: string
  personPhoto?: string
  personUpiId?: string
  scope?: SettlementScope
  size?: "sm" | "default" | "lg"
  variant?: "default" | "outline" | "secondary" | "link"
  className?: string
  label?: string
}) {
  const { user } = useSession()
  const { data: expenses } = useExpenses()
  const [open, setOpen] = React.useState(false)

  const breakdown = React.useMemo(() => {
    if (!user) return null
    return calculatePersonNetBreakdown(user.uid, personId, expenses, scope)
  }, [user, personId, expenses, scope])

  if (!breakdown || breakdown.netPayablePaise <= 0) return null

  return (
    <>
      <Button
        size={size}
        variant={variant}
        className={className}
        onClick={(e) => {
          e.stopPropagation()
          setOpen(true)
        }}
      >
        <HugeiconsIcon icon={CreditCardIcon} data-icon="inline-start" />
        {label}
      </Button>

      <SettleExpensesDialog
        open={open}
        onOpenChange={setOpen}
        personId={personId}
        personName={personName}
        personPhoto={personPhoto}
        personUpiId={personUpiId}
        initialScope={scope}
      />
    </>
  )
}
