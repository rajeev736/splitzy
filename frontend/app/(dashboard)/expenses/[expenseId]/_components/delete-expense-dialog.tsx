"use client"

import { Alert02Icon, Delete02Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { formatPaise } from "@/lib/money"

/**
 * Delete confirmation with the audit invariant: expenses with confirmed
 * payments can't be deleted, so the destructive action is shown disabled.
 */
export function DeleteExpenseDialog({
  open,
  onOpenChange,
  title,
  amountPaise,
  hasPaidMembers,
  isPending,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  amountPaise: number
  hasPaidMembers: boolean
  isPending: boolean
  onConfirm: () => void
}) {
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Delete Expense"
      description={
        hasPaidMembers ? undefined : (
          <>
            Are you sure you want to delete <strong>&quot;{title}&quot;</strong> ({formatPaise(amountPaise)})? This
            action cannot be undone.
          </>
        )
      }
      confirmLabel="Delete Expense"
      destructive
      icon={Delete02Icon}
      isPending={isPending}
      confirmDisabled={hasPaidMembers}
      onConfirm={onConfirm}
    >
      {hasPaidMembers && (
        <Alert className="border-warning/30 bg-warning/10">
          <HugeiconsIcon icon={Alert02Icon} className="text-warning" />
          <AlertTitle className="font-bold">Cannot Delete Expense</AlertTitle>
          <AlertDescription className="text-xs leading-relaxed">
            One or more members have already had their payments confirmed for this expense. To preserve financial audit
            integrity, expenses with confirmed payments cannot be deleted.
          </AlertDescription>
        </Alert>
      )}
    </ConfirmDialog>
  )
}
