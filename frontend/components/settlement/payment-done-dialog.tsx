"use client"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Spinner } from "@/components/ui/spinner"
import { formatPaise } from "@/lib/money"

/**
 * Asked when you come back from the UPI app: did the payment go through?
 * Only "Yes, I paid" tells the other person — so nobody is asked to confirm a
 * payment that was cancelled or failed. "No" offers to pay again.
 */
export function PaymentDoneDialog({
  open,
  onOpenChange,
  amountPaise,
  payeeName,
  isPending,
  onConfirm,
  onPayAgain,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  amountPaise: number
  payeeName: string
  isPending?: boolean
  onConfirm: () => void
  /** "No": back to choosing a UPI app. Without it, "No" just closes. */
  onPayAgain?: () => void
}) {
  const first = payeeName.split(" ")[0]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>
            Did you pay {formatPaise(amountPaise)} to {first}?
          </DialogTitle>
          <DialogDescription>
            Say yes only if it went through in your UPI app — {first} will be asked to confirm they received it.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="grid grid-cols-2 gap-2 sm:flex">
          <Button
            variant="outline"
            disabled={isPending}
            onClick={() => {
              onOpenChange(false)
              onPayAgain?.()
            }}
          >
            {onPayAgain ? "No, pay now" : "No"}
          </Button>
          <Button disabled={isPending} onClick={onConfirm}>
            {isPending && <Spinner />}
            Yes, I paid
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
