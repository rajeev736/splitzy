"use client"

import { toast } from "sonner"

import {
  useConfirmPayment,
  useConfirmPersonSettlement,
  useDisputePayment,
  useDisputePersonSettlement,
} from "@/hooks/mutations"
import type { AppNotification } from "@/lib/types"

/**
 * Confirm / dispute for a PAYMENT_REPORTED notification — one implementation
 * shared by the inline list buttons and the detail dialog. Handles both kinds
 * of report: a single expense share (`expenseId`) and a person-to-person
 * settlement (`settlementId`, or older ones without an id).
 */
export function usePaymentReportActions() {
  const confirmPayment = useConfirmPayment({ successMessage: "Payment confirmed!" })
  const disputePayment = useDisputePayment()
  const confirmSettlement = useConfirmPersonSettlement({ successMessage: "Settlement confirmed!" })
  const disputeSettlement = useDisputePersonSettlement()

  const target = (notif: AppNotification) => {
    const data = notif.data
    const debtorId = data?.debtorId || data?.actorId
    if (!debtorId) return null
    if (data?.expenseId) return { kind: "expense" as const, expenseId: data.expenseId, debtorId }
    return {
      kind: "settlement" as const,
      debtorId,
      settlementId: data?.settlementId,
      // Only for older notifications without a settlement id: reported shares
      // may span groups and direct splits, so narrow only when a group is named
      scope: data?.groupId ? { type: "group" as const, groupId: data.groupId } : undefined,
    }
  }

  const confirm = (notif: AppNotification, onDone?: () => void) => {
    const t = target(notif)
    if (!t) return
    if (t.kind === "expense") {
      confirmPayment.mutate({ expenseId: t.expenseId, memberUserId: t.debtorId, notifId: notif.id }, { onSuccess: onDone })
    } else {
      confirmSettlement.mutate({ ...t, notifId: notif.id }, { onSuccess: onDone })
    }
  }

  const dispute = (notif: AppNotification, onDone?: () => void) => {
    const t = target(notif)
    if (!t) return
    const onSuccess = () => {
      toast.error("Payment marked as not received (disputed)")
      onDone?.()
    }
    if (t.kind === "expense") {
      disputePayment.mutate({ expenseId: t.expenseId, memberUserId: t.debtorId, notifId: notif.id }, { onSuccess })
    } else {
      disputeSettlement.mutate({ ...t, notifId: notif.id }, { onSuccess })
    }
  }

  /** True while an action for this notification is in flight. */
  const isBusy = (notif: AppNotification) =>
    [confirmPayment, disputePayment, confirmSettlement, disputeSettlement].some(
      (m) => m.isPending && m.variables?.notifId === notif.id
    )
  const isConfirming = (notif: AppNotification) =>
    [confirmPayment, confirmSettlement].some((m) => m.isPending && m.variables?.notifId === notif.id)

  return { confirm, dispute, isBusy, isConfirming }
}
