"use client"

import { Amount } from "@/components/shared/amount"
import { UserAvatar } from "@/components/shared/user-avatar"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Spinner } from "@/components/ui/spinner"
import type { ExpenseShare } from "@/lib/types"

/** Recipient verifies (or disputes) a member's reported payment. */
export function ConfirmShareDialog({
  share,
  expenseTitle,
  onClose,
  onConfirm,
  onDispute,
  isConfirming,
  isDisputing,
}: {
  share: ExpenseShare | null
  expenseTitle: string
  onClose: () => void
  onConfirm: (userId: string) => void
  onDispute: (userId: string) => void
  isConfirming: boolean
  isDisputing: boolean
}) {
  const busy = isConfirming || isDisputing

  return (
    <Dialog open={share !== null} onOpenChange={(open) => !open && !busy && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirm Payment</DialogTitle>
        </DialogHeader>
        {share && (
          <div className="flex flex-col items-center gap-4 py-2 text-center">
            <UserAvatar src={share.userPhoto} name={share.userName} size="lg" />
            <div>
              <h4 className="text-base font-semibold">{share.userName}</h4>
              <p className="text-xs text-muted-foreground">reported paid for {expenseTitle}</p>
            </div>

            <Amount paise={share.amountPaise} className="text-2xl font-semibold tabular-nums" />

            <p className="max-w-xs text-xs text-muted-foreground">
              Please check your UPI app or bank balance to verify if the payment was received.
            </p>

            <div className="grid w-full grid-cols-2 gap-3 pt-2">
              <Button variant="destructive" disabled={busy} onClick={() => onDispute(share.userId)}>
                {isDisputing && <Spinner />}
                Not Received
              </Button>
              <Button variant="success" disabled={busy} onClick={() => onConfirm(share.userId)}>
                {isConfirming && <Spinner />}
                Confirm Received
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
