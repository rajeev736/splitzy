"use client"

import { toast } from "sonner"

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
  upiId,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  amountPaise: number
  payeeName: string
  isPending?: boolean
  onConfirm: () => void
  /** "No": opens the UPI apps again. Without it, "No" just closes. */
  onPayAgain?: () => void
  /** Shown with a copy button, for when no UPI app opened (a computer, an iPhone without one). */
  upiId?: string
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

        {upiId && (
          <div className="flex items-center justify-between gap-3 rounded-md bg-muted/60 px-3 py-2">
            <span className="min-w-0 truncate text-xs text-muted-foreground">
              App didn&apos;t open? Pay to <span className="font-mono text-foreground">{upiId}</span>
            </span>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 shrink-0 px-2 text-xs"
              onClick={() =>
                navigator.clipboard
                  ?.writeText(upiId)
                  .then(() => toast.success("UPI ID copied"))
                  .catch(() => toast.info(upiId))
              }
            >
              Copy
            </Button>
          </div>
        )}

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
