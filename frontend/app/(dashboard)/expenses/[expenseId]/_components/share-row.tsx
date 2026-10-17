"use client"

import { CheckmarkCircle02Icon, Clock01Icon, CreditCardIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { Amount } from "@/components/shared/amount"
import { SHARE_STATUS_BADGE, StatusBadge } from "@/components/shared/status-badge"
import { UserAvatar } from "@/components/shared/user-avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Item, ItemActions, ItemContent, ItemDescription, ItemMedia, ItemTitle } from "@/components/ui/item"
import type { ExpenseShare } from "@/lib/types"

/** One participant's share + payment status in the expense detail list. */
export function ShareRow({
  share,
  isMe,
  isPayer,
  canConfirm,
  onVerify,
  onPay,
}: {
  share: ExpenseShare
  isMe: boolean
  isPayer: boolean
  /** Recipient can verify a reported payment. */
  canConfirm: boolean
  onVerify: () => void
  /** Shown on the viewer's own unpaid share instead of the "Pending" badge. */
  onPay?: () => void
}) {
  const canPay = Boolean(onPay) && isMe && (share.status === "PENDING" || share.status === "DISPUTED")

  return (
    <Item className="px-0">
      <ItemMedia>
        <UserAvatar src={share.userPhoto} name={share.userName} size="md" />
      </ItemMedia>
      <ItemContent className="min-w-0">
        <ItemTitle className="text-xs font-bold">
          <span className="truncate">{share.userName}</span>
          {isMe && <span className="text-[10px] font-semibold text-primary">(You)</span>}
          {isPayer && (
            <Badge variant="secondary" className="h-4 px-1.5 text-[9px] font-bold">
              Payer
            </Badge>
          )}
        </ItemTitle>
        <ItemDescription className="text-[11px]">
          Share: <Amount paise={share.amountPaise} />
        </ItemDescription>
      </ItemContent>
      <ItemActions>
        {canPay ? (
          <Button size="sm" onClick={onPay}>
            <HugeiconsIcon icon={CreditCardIcon} data-icon="inline-start" />
            {share.status === "DISPUTED" ? "Pay again" : "Pay"} <Amount paise={share.amountPaise} />
          </Button>
        ) : share.status === "PAYMENT_REPORTED" && canConfirm ? (
          <Button
            size="sm"
            variant="outline"
            className="border-warning/40 bg-warning/10 text-warning hover:bg-warning/20"
            onClick={onVerify}
          >
            <HugeiconsIcon icon={Clock01Icon} data-icon="inline-start" />
            Verify Payment
          </Button>
        ) : (
          <StatusBadge status={SHARE_STATUS_BADGE[share.status]}>
            {share.status === "PAID" && <HugeiconsIcon icon={CheckmarkCircle02Icon} data-icon="inline-start" />}
            {share.status === "PAYMENT_REPORTED" && <HugeiconsIcon icon={Clock01Icon} data-icon="inline-start" />}
            {share.status === "PAID"
              ? "Paid"
              : share.status === "PAYMENT_REPORTED"
                ? "Payment Reported"
                : share.status === "DISPUTED"
                  ? "Disputed"
                  : "Pending"}
          </StatusBadge>
        )}
      </ItemActions>
    </Item>
  )
}
