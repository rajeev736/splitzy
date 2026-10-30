"use client"

import * as React from "react"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { formatPaise } from "@/lib/money"

/** A UPI transaction reference (UTR / UPI Ref No.) is 12 digits. */
export const isValidUtr = (utr: string) => /^\d{12}$/.test(utr)

/**
 * Asked when you come back from the UPI app: did the payment actually go
 * through? Only "Yes, I paid" tells the other person — so nobody is asked to
 * confirm a payment that was cancelled or failed. The UTR lets them match it
 * against their bank SMS.
 */
export function PaymentDoneDialog({
  open,
  onOpenChange,
  amountPaise,
  payeeName,
  isPending,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  amountPaise: number
  payeeName: string
  isPending?: boolean
  onConfirm: (utr: string) => void
}) {
  const [utr, setUtr] = React.useState("")
  const clean = utr.replace(/\s/g, "")
  const valid = isValidUtr(clean)
  const first = payeeName.split(" ")[0]

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setUtr("")
        onOpenChange(next)
      }}
    >
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>
            Did you pay {formatPaise(amountPaise)} to {first}?
          </DialogTitle>
          <DialogDescription>
            Only confirm if the payment went through in your UPI app. {first} will be asked to check it.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="payment-utr" className="text-sm font-medium">
            UTR / UPI Ref No.
          </label>
          <Input
            id="payment-utr"
            inputMode="numeric"
            autoComplete="off"
            maxLength={14}
            placeholder="12-digit number"
            value={utr}
            onChange={(e) => setUtr(e.target.value.replace(/[^\d\s]/g, ""))}
            aria-invalid={clean.length > 0 && !valid}
            className="font-mono tracking-wider"
          />
          <p className="text-xs text-muted-foreground">
            {clean.length > 0 && !valid
              ? "A UTR has 12 digits."
              : `Find it in the payment's details in your UPI app. ${first} can match it with their bank SMS.`}
          </p>
        </div>

        <DialogFooter className="grid grid-cols-2 gap-2 sm:flex">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Not yet
          </Button>
          <Button disabled={!valid || isPending} onClick={() => onConfirm(clean)}>
            {isPending && <Spinner />}
            Yes, I paid
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
