"use client"

import * as React from "react"
import { toast } from "sonner"

import { useSession } from "@/components/providers/session-provider"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import {
  useConfirmDisputedSettlement,
  useConfirmPersonSettlement,
  useDisputePersonSettlement,
  useRecheckDisputedSettlement,
  useReportPersonSettlement,
} from "@/hooks/mutations"
import { useExpenses, useNotifications } from "@/hooks/queries"
import { disputedPaymentBetween, formatPaise, reportedPaymentFrom } from "@/lib/money"
import { cn } from "@/lib/utils"

/**
 * Payment status between you and one person, both directions:
 *
 *   they report a payment → you: "Received it?"  Yes = settled · No = disputed
 *   disputed, you're owed  → you: "Received now" (money arrived late)
 *   disputed, you paid     → you: "Ask to recheck" (sends it back to them)
 */

/** A payment this person reported to you, waiting for your answer. */
export function usePendingPaymentFrom(personId: string) {
  const { user } = useSession()
  const { data: expenses } = useExpenses()
  const { data: notifications } = useNotifications()

  return React.useMemo(() => {
    if (!user || !personId) return null
    const report = reportedPaymentFrom(user.uid, personId, expenses)
    if (!report) return null
    const notif = notifications.find(
      (n) =>
        n.type === "PAYMENT_REPORTED" &&
        !n.actionTaken &&
        (n.data?.debtorId ?? n.data?.actorId) === personId &&
        (report.settlementId ? n.data?.settlementId === report.settlementId : !n.data?.expenseId)
    )
    return {
      settlementId: report.settlementId,
      // What they actually sent (after any game discount)
      amountPaise: notif?.data?.amountPaise ?? report.paidPaise,
      notifId: notif?.id,
    }
  }, [user, personId, expenses, notifications])
}

/** A payment one of you marked "not received", from your side of it. */
function useDisputedPaymentWith(personId: string) {
  const { user } = useSession()
  const { data: expenses } = useExpenses()
  const { data: notifications } = useNotifications()

  return React.useMemo(() => {
    if (!user) return null
    const forSettlement = (type: string, id?: string) =>
      id ? notifications.find((n) => n.type === type && n.data?.settlementId === id) : undefined

    // They paid you and you said "not received"
    const owedToYou = disputedPaymentBetween(personId, user.uid, expenses)
    if (owedToYou) {
      // The original report carries the cancel-out it was sent with (rechecks don't)
      const report = notifications.find(
        (n) =>
          n.type === "PAYMENT_REPORTED" &&
          n.data?.settlementId === owedToYou.settlementId &&
          n.data?.offsetPaise !== undefined
      )
      return {
        role: "receiver" as const,
        settlementId: owedToYou.settlementId,
        // Older disputes dropped the cancel-outs: closing them now would miscount, so they need a fresh payment
        canMarkReceived:
          !!owedToYou.settlementId && (report?.data?.offsetPaise ?? 0) === owedToYou.offsetPaise,
      }
    }

    // You paid them and they said "not received"
    const youPaid = disputedPaymentBetween(user.uid, personId, expenses)
    if (youPaid) {
      const dispute = forSettlement("PAYMENT_DISPUTED", youPaid.settlementId)
      return {
        role: "payer" as const,
        settlementId: youPaid.settlementId,
        amountPaise: dispute?.data?.amountPaise ?? youPaid.paidPaise,
        // Disputes from before this flow carry no offset record: send a fresh report instead
        isLegacy: !youPaid.settlementId || dispute?.data?.offsetPaise === undefined,
      }
    }
    return null
  }, [user, personId, expenses, notifications])
}

/**
 * "Rajeev says they paid ₹240. Received it?" with Yes / No. Yes settles it;
 * No marks it disputed and brings Remind / Challenge back.
 */
export function PaymentReceivedPrompt({
  personId,
  personName,
  size = "sm",
  className,
}: {
  personId: string
  personName: string
  /** "inline": one line, text left + buttons right (list strips). "lg": a dialog's action bar. */
  size?: "sm" | "inline" | "lg"
  className?: string
}) {
  const pending = usePendingPaymentFrom(personId)
  const confirm = useConfirmPersonSettlement({ successMessage: "Payment confirmed" })
  const dispute = useDisputePersonSettlement()
  if (!pending) return null

  const input = { debtorId: personId, settlementId: pending.settlementId, notifId: pending.notifId }
  const busy = confirm.isPending || dispute.isPending

  const buttonSize = size === "lg" ? "lg" : "sm"
  const buttonClass = size === "lg" ? "h-11" : size === "inline" ? "h-7 min-w-14 px-3 text-xs" : "h-8 min-w-16"

  return (
    // Sits inside clickable rows: keep taps here from opening the row
    <div
      className={cn(
        "flex flex-col gap-1.5",
        size === "inline" && "flex-row items-center justify-between gap-3",
        size === "lg" && "gap-3 text-center",
        className
      )}
      onClick={(e) => e.stopPropagation()}
    >
      <p
        className={cn(
          "text-xs text-muted-foreground",
          size === "inline" && "min-w-0 truncate",
          size === "lg" && "text-sm"
        )}
      >
        {size === "inline" ? "Paid you " : `${personName.split(" ")[0]} says they paid `}
        <span className="font-semibold text-foreground tabular-nums">{formatPaise(pending.amountPaise)}</span>
        {size === "inline" ? " · Received?" : ". Received it?"}
      </p>
      <div className={cn("flex shrink-0 gap-2", size === "lg" && "grid grid-cols-2")}>
        <Button size={buttonSize} className={buttonClass} disabled={busy} onClick={() => confirm.mutate(input)}>
          {confirm.isPending && <Spinner />}
          Yes
        </Button>
        <Button
          size={buttonSize}
          variant="outline"
          className={buttonClass}
          disabled={busy}
          onClick={() =>
            dispute.mutate(
              { ...input, amountPaise: pending.amountPaise },
              { onSuccess: () => toast.info("Marked as not received. You can still confirm it if it shows up later.") }
            )
          }
        >
          {dispute.isPending && <Spinner />}
          No
        </Button>
      </div>
    </div>
  )
}

/** The Yes / No prompt while a payment from this person is pending, otherwise `children` (Remind, Challenge…). */
export function PaymentReceivedOr({
  personId,
  personName,
  className,
  children,
}: {
  personId: string
  personName: string
  className?: string
  children: React.ReactNode
}) {
  const pending = usePendingPaymentFrom(personId)
  if (!pending) return <>{children}</>
  return <PaymentReceivedPrompt personId={personId} personName={personName} className={className} />
}

/** Hides `children` (Remind, Challenge…) while this person's payment waits for your answer. */
export function HideWhilePaymentPending({ personId, children }: { personId: string; children: React.ReactNode }) {
  return usePendingPaymentFrom(personId) ? null : <>{children}</>
}

/**
 * A thin strip under a list row for the payment between you two: the
 * "received?" question while one is pending, or the dispute line after a "No".
 * Renders nothing otherwise, so rows stay one line in the normal case.
 */
export function PaymentStatusStrip({
  personId,
  personName,
  className,
}: {
  personId: string
  personName: string
  className?: string
}) {
  const pending = usePendingPaymentFrom(personId)
  const disputed = useDisputedPaymentWith(personId)
  if (!pending && !disputed) return null
  return (
    <div className={cn("rounded-md bg-muted/50 px-3 py-2", className)}>
      {pending ? (
        <PaymentReceivedPrompt size="inline" personId={personId} personName={personName} />
      ) : (
        <PaymentDisputeLine className="flex" personId={personId} personName={personName} />
      )}
    </div>
  )
}

/**
 * One quiet line under a balance after a dispute, with the one action that
 * side can take: "Not received · Ask to recheck" or "Not received · Received now".
 */
export function PaymentDisputeLine({
  personId,
  personName,
  className,
}: {
  personId: string
  personName: string
  className?: string
}) {
  const disputed = useDisputedPaymentWith(personId)
  const markReceived = useConfirmDisputedSettlement({ successMessage: "Payment confirmed" })
  const recheck = useRecheckDisputedSettlement({ successMessage: `Asked ${personName.split(" ")[0]} to check again` })
  const resend = useReportPersonSettlement({ successMessage: `Asked ${personName.split(" ")[0]} to check again` })
  if (!disputed) return null

  const busy = markReceived.isPending || recheck.isPending || resend.isPending
  let action: { label: string; run: () => void } | null = null
  if (disputed.role === "receiver" && disputed.canMarkReceived && disputed.settlementId) {
    const settlementId = disputed.settlementId
    action = { label: "Received now", run: () => markReceived.mutate({ otherId: personId, settlementId }) }
  } else if (disputed.role === "payer") {
    action = {
      label: "Ask to recheck",
      run: () =>
        disputed.isLegacy || !disputed.settlementId
          ? resend.mutate({ creditorId: personId, creditorName: personName })
          : recheck.mutate({ otherId: personId, settlementId: disputed.settlementId, amountPaise: disputed.amountPaise }),
    }
  }

  return (
    <span
      className={cn("inline-flex items-center gap-1 text-[11px] leading-tight whitespace-nowrap", className)}
      onClick={(e) => e.stopPropagation()}
    >
      <span className="font-medium text-destructive">Not received</span>
      {action && (
        <>
          <span className="text-muted-foreground">·</span>
          <button
            type="button"
            disabled={busy}
            onClick={action.run}
            className="font-medium text-primary hover:underline disabled:opacity-50"
          >
            {busy ? "…" : action.label}
          </button>
        </>
      )}
    </span>
  )
}
