"use client"

import * as React from "react"
import {
  ArrowDown01Icon,
  ArrowUp01Icon,
  CheckmarkCircle02Icon,
  Copy01Icon,
  CreditCardIcon,
  HelpCircleIcon,
  SecurityCheckIcon,
  Tick02Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { toast } from "sonner"

import { UpiAppSheet } from "@/app/(dashboard)/expenses/[expenseId]/pay/_components/upi-app-sheet"
import { PaymentDoneDialog } from "@/components/settlement/payment-done-dialog"
import { useSession } from "@/components/providers/session-provider"
import { useLiveGameDiscounts } from "@/hooks/use-game-discounts"
import { formatCountdown, useNow } from "@/hooks/use-now"
import { AwaitingConfirmationBadge } from "@/components/shared/awaiting-confirmation-badge"
import { Amount } from "@/components/shared/amount"
import { BottomSheet } from "@/components/shared/bottom-sheet"
import { UserAvatar } from "@/components/shared/user-avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Spinner } from "@/components/ui/spinner"
import {
  useReportPersonSettlement,
  useSettleWithGameWaiver,
} from "@/hooks/mutations"
import { useExpenses, useFriends, useGroups } from "@/hooks/queries"
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard"
import {
  calculatePersonNetBreakdown,
  formatPaise,
  type SettlementScope,
} from "@/lib/money"
import { buildUPILink, type UPITransactionParams } from "@/lib/upi"
import { cn } from "@/lib/utils"

export interface PersonSettlementDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  personId?: string
  payeeId?: string
  personName?: string
  payeeName?: string
  personPhoto?: string
  payeePhoto?: string
  personUpiId?: string
  payeeUpiId?: string
  scope?: SettlementScope
  /** Discount from a game you just won against this person (only while it lasts). */
  gameDiscount?: {
    challengeId: string
    /** Discount at full value; it drops to 0 once `expiresAt` passes. */
    discountPaise: number
    percent: number
    /** ms since epoch */
    expiresAt: number
  }
  onSettled?: () => void
}

export function PersonSettlementDialog({
  open,
  onOpenChange,
  personId,
  payeeId,
  personName,
  payeeName,
  personPhoto,
  payeePhoto,
  personUpiId,
  payeeUpiId,
  scope,
  gameDiscount,
  onSettled,
}: PersonSettlementDialogProps) {
  const effectivePersonId = personId || payeeId || ""
  const effectivePersonName = personName || payeeName || "Member"
  const effectivePersonPhoto = personPhoto || payeePhoto
  const effectivePersonUpiId = personUpiId || payeeUpiId

  const { user } = useSession()
  const { data: expenses } = useExpenses()
  const { data: friends } = useFriends()
  const { data: groups } = useGroups()
  const upiCopy = useCopyToClipboard()
  const waive = useSettleWithGameWaiver()
  const reportSettlement = useReportPersonSettlement({
    successMessage: "Settlement reported! Waiting for recipient confirmation.",
  })

  const [showAppChooser, setShowAppChooser] = React.useState(false)
  // Back from the UPI app (or "I already paid"): confirm with the UTR before they're told
  const [confirmPaidOpen, setConfirmPaidOpen] = React.useState(false)
  const [showBreakdown, setShowBreakdown] = React.useState(false)

  // Find friend profile if available for freshest UPI ID / avatar
  const friendProfile = React.useMemo(
    () => friends.find((f) => f.uid === effectivePersonId),
    [friends, effectivePersonId]
  )

  const resolvedScope = React.useMemo(() => {
    if (scope?.type === "group" && !scope.groupName) {
      const g = groups.find((grp) => grp.id === scope.groupId)
      return { ...scope, groupName: g?.name }
    }
    return scope
  }, [scope, groups])

  // Centralized PhonePe-style person-to-person net calculation
  const breakdown = React.useMemo(() => {
    if (!user || !effectivePersonId) return null
    return calculatePersonNetBreakdown(
      user.uid,
      effectivePersonId,
      expenses,
      resolvedScope
    )
  }, [user, effectivePersonId, expenses, resolvedScope])

  const targetName =
    friendProfile?.displayName || breakdown?.userBName || effectivePersonName
  const targetPhoto =
    friendProfile?.photoURL || breakdown?.userBPhoto || effectivePersonPhoto
  const targetUpiId =
    friendProfile?.upiId || breakdown?.userBUpiId || effectivePersonUpiId || ""

  const defaultNote = React.useMemo(() => {
    const scopeLabel =
      resolvedScope?.type === "group" && resolvedScope.groupName
        ? ` - ${resolvedScope.groupName}`
        : ""
    return `JoySplit Settlement to ${targetName}${scopeLabel}`
  }, [resolvedScope, targetName])

  const [paymentNote, setPaymentNote] = React.useState(defaultNote)
  // The game discount lives only until its timer runs out
  // A game discount passed in, or any live one you won against this person
  const liveDiscounts = useLiveGameDiscounts()
  const won = liveDiscounts.byPerson.get(effectivePersonId)
  const activeGame =
    gameDiscount ?? (won?.role === "winner" && !won.pending ? won : undefined)
  const now = useNow(activeGame?.expiresAt ?? 0)
  const discountLive = !!activeGame && now < activeGame.expiresAt

  // Reset the note whenever the default changes (adjusted during render, not in an effect)
  const [syncedDefaultNote, setSyncedDefaultNote] = React.useState(defaultNote)
  if (defaultNote !== syncedDefaultNote) {
    setSyncedDefaultNote(defaultNote)
    setPaymentNote(defaultNote)
  }

  if (!breakdown || !user) return null

  const netPayablePaise = breakdown.netPayablePaise
  const discountPaise = discountLive
    ? Math.min(activeGame?.discountPaise ?? 0, netPayablePaise)
    : 0
  /** What actually leaves your account: the net minus any game discount. */
  const payPaise = netPayablePaise - discountPaise
  // A 100%-off win that covers everything: settle for free instead of "paying" ₹0
  const settlesFree =
    payPaise === 0 && discountPaise > 0 && activeGame?.percent === 100
  const hasOffset = breakdown.offsetPaise > 0
  // Net zero but mutual splits are still open: they can be cancelled out (PhonePe style)
  const canCancelOut =
    netPayablePaise === 0 &&
    breakdown.aOwesBLines.some((l) => l.status !== "PAYMENT_REPORTED")
  const awaitingConfirmation =
    breakdown.aOwesBLines.length > 0 &&
    breakdown.aOwesBLines.every((l) => l.status === "PAYMENT_REPORTED")
  const isAllSettled = netPayablePaise === 0 && !canCancelOut

  const handleReport = (utr?: string) => {
    if (awaitingConfirmation) {
      toast.info(`Already reported — waiting for ${targetName} to confirm.`)
      return
    }
    reportSettlement.mutate(
      {
        creditorId: effectivePersonId,
        creditorName: targetName,
        amountPaise: payPaise,
        scope: resolvedScope,
        note: paymentNote,
        ...(utr ? { utr } : {}),
        ...(discountPaise > 0 ? { challengeId: activeGame?.challengeId } : {}),
      },
      {
        onSuccess: () => {
          setConfirmPaidOpen(false)
          onSettled?.()
        },
      }
    )
  }

  const handleLaunchApp = (appId: string) => {
    if (!targetUpiId) {
      toast.error(
        "Recipient UPI ID is not available. Please enter it manually."
      )
      setShowAppChooser(false)
      return
    }

    const upiUri = buildUPILink({
      upiId: targetUpiId,
      payeeName: targetName,
      amountPaise: payPaise,
      note: paymentNote,
      app: appId as UPITransactionParams["app"],
    })

    setShowAppChooser(false)
    window.location.href = upiUri

    // Waiting when they come back from the UPI app; nothing is reported until they say it went through
    setConfirmPaidOpen(true)
  }

  const contextTitle =
    resolvedScope?.type === "group" && resolvedScope.groupName
      ? `Group: ${resolvedScope.groupName}`
      : resolvedScope?.type === "direct"
        ? "Direct Split"
        : breakdown.contexts.length > 1
          ? `Across ${breakdown.contexts.length} contexts`
          : "Shared Expenses"

  return (
    <>
      <BottomSheet
        open={open}
        onOpenChange={onOpenChange}
        title={`Settle with ${targetName}`}
        description={
          <span className="flex flex-wrap items-center gap-x-1.5 text-xs">
            <span className="font-medium text-foreground">{contextTitle}</span>
            {hasOffset && (
              <span className="text-muted-foreground">
                · ₹{(breakdown.offsetPaise / 100).toFixed(0)} mutual offset
                applied
              </span>
            )}
          </span>
        }
        bodyClassName="pb-6"
      >
        <div className="flex flex-col gap-4">
          {/* Main Net Amount Card */}
          <Card>
            <CardContent className="flex flex-col items-center p-5 text-center">
              <span className="text-xs text-muted-foreground">
                {settlesFree ? "Covered by your game win" : "Final net amount to pay"}
              </span>
              <div className="my-2">
                {settlesFree ? (
                  <span className="text-3xl font-semibold tracking-tight text-success">Free</span>
                ) : (
                  <Amount
                    paise={payPaise}
                    className={cn(
                      "text-3xl font-semibold tracking-tight tabular-nums",
                      isAllSettled ? "text-success" : "text-destructive"
                    )}
                  />
                )}
              </div>

              {activeGame && netPayablePaise > 0 && (
                <div className="mb-3 w-full max-w-xs border-y py-2 text-left text-xs">
                  <div className="flex justify-between py-0.5">
                    <span className="text-muted-foreground">
                      You owe {targetName}
                    </span>
                    <span className="font-medium tabular-nums">
                      {formatPaise(netPayablePaise)}
                    </span>
                  </div>
                  <div
                    className={cn(
                      "flex justify-between py-0.5",
                      discountLive
                        ? "text-success"
                        : "text-muted-foreground line-through"
                    )}
                  >
                    <span>Game win discount ({activeGame.percent}%)</span>
                    <span className="font-medium tabular-nums">
                      −
                      {formatPaise(
                        Math.min(activeGame.discountPaise, netPayablePaise)
                      )}
                    </span>
                  </div>
                  <div className="mt-1 flex justify-between border-t pt-1.5 font-semibold">
                    <span>You pay</span>
                    <span className={cn("tabular-nums", settlesFree && "text-success")}>
                      {settlesFree ? "Nothing" : formatPaise(payPaise)}
                    </span>
                  </div>
                  <p
                    className={cn(
                      "mt-2 text-center text-[11px] font-medium tabular-nums",
                      discountLive ? "text-warning" : "text-destructive"
                    )}
                  >
                    {discountLive
                      ? `Discount ends in ${formatCountdown(activeGame.expiresAt - now)}`
                      : "Time's up — the game discount has expired. Full amount applies."}
                  </p>
                </div>
              )}
              {isAllSettled ? (
                <div className="flex items-center gap-1.5 text-xs font-medium text-success">
                  <HugeiconsIcon
                    icon={CheckmarkCircle02Icon}
                    className="size-4"
                  />
                  <span>All settled up! No payment needed.</span>
                </div>
              ) : (
                <p className="max-w-xs text-xs text-muted-foreground">
                  Calculated after canceling out all reciprocal debts between
                  you and {targetName}.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Recipient Details */}
          <Card>
            <CardContent className="flex flex-col gap-3 p-4">
              <div className="flex items-center justify-between">
                <div className="flex min-w-0 items-center gap-3">
                  <UserAvatar src={targetPhoto} name={targetName} size="md" />
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">
                      {targetName}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Payee / Creditor
                    </div>
                  </div>
                </div>

                {targetUpiId && (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="rounded-md text-muted-foreground hover:text-foreground"
                    title="Copy UPI ID"
                    aria-label="Copy UPI ID"
                    onClick={() => upiCopy.copy(targetUpiId, "UPI ID copied!")}
                  >
                    <HugeiconsIcon
                      icon={upiCopy.copied ? Tick02Icon : Copy01Icon}
                      className={upiCopy.copied ? "text-success" : undefined}
                    />
                  </Button>
                )}
              </div>

              {targetUpiId ? (
                <div className="flex items-center justify-between gap-3 border-t pt-3 text-xs">
                  <span className="text-muted-foreground">UPI ID</span>
                  <span className="min-w-0 truncate font-mono font-medium">
                    {targetUpiId}
                  </span>
                </div>
              ) : (
                <div className="border-t pt-3 text-xs text-warning">
                  {targetName} has not added a UPI ID yet. You can still report
                  payment once transferred.
                </div>
              )}
            </CardContent>
          </Card>

          {/* PhonePe-Style Breakdown Accordion */}
          <Card>
            <CardContent className="flex flex-col gap-3 p-4">
              <button
                type="button"
                onClick={() => setShowBreakdown((v) => !v)}
                className="flex items-center justify-between text-left text-xs font-medium text-foreground transition-colors hover:text-muted-foreground"
              >
                <span className="flex items-center gap-1.5">
                  <HugeiconsIcon
                    icon={HelpCircleIcon}
                    className="size-4 text-muted-foreground"
                  />
                  How this amount is calculated
                </span>
                <HugeiconsIcon
                  icon={showBreakdown ? ArrowUp01Icon : ArrowDown01Icon}
                  className="size-4 text-muted-foreground"
                />
              </button>

              {showBreakdown && (
                <div className="flex animate-in flex-col gap-3 border-t pt-3 text-xs duration-200 fade-in">
                  {/* What you owe */}
                  <div>
                    <div className="flex items-center justify-between font-medium text-muted-foreground">
                      <span>Expenses you owe {targetName}</span>
                      <span className="font-semibold text-destructive tabular-nums">
                        + {formatPaise(breakdown.aOwesBTotalPaise)}
                      </span>
                    </div>
                    <div className="mt-1.5 flex flex-col gap-1 border-l pl-2.5">
                      {breakdown.aOwesBLines.map(({ expense, amountPaise }) => (
                        <div
                          key={expense.id}
                          className="flex items-center justify-between text-[11px]"
                        >
                          <span className="truncate pr-2">
                            {expense.title}{" "}
                            <span className="text-muted-foreground">
                              ({expense.groupName || "Direct"})
                            </span>
                          </span>
                          <span className="font-medium text-destructive tabular-nums">
                            {formatPaise(amountPaise)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Reciprocal offset */}
                  {hasOffset && (
                    <div>
                      <div className="flex items-center justify-between font-medium text-muted-foreground">
                        <span>Expenses {targetName} owes you (offset)</span>
                        <span className="font-semibold text-success tabular-nums">
                          - {formatPaise(breakdown.offsetPaise)}
                        </span>
                      </div>
                      <div className="mt-1.5 flex flex-col gap-1 border-l pl-2.5">
                        {breakdown.bOwesALines.map(
                          ({ expense, amountPaise }) => (
                            <div
                              key={expense.id}
                              className="flex items-center justify-between text-[11px]"
                            >
                              <span className="truncate pr-2">
                                {expense.title}{" "}
                                <span className="text-muted-foreground">
                                  ({expense.groupName || "Direct"})
                                </span>
                              </span>
                              <span className="font-medium text-success tabular-nums">
                                {formatPaise(amountPaise)}
                              </span>
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  )}

                  <Separator />

                  <div className="flex items-center justify-between text-sm font-semibold">
                    <span>Final net payable</span>
                    <span className={cn("tabular-nums", settlesFree ? "text-success" : "text-destructive")}>
                      {settlesFree ? "Free" : formatPaise(payPaise)}
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Payment Note Input */}
          {!isAllSettled && !awaitingConfirmation && !settlesFree && (
            <Field>
              <FieldLabel
                htmlFor="settlement-note"
                className="text-xs font-medium"
              >
                Payment note
              </FieldLabel>
              <Input
                id="settlement-note"
                value={paymentNote}
                onChange={(e) => setPaymentNote(e.target.value)}
                placeholder="e.g. Settlement for trip expenses"
                className="h-10 text-xs"
              />
            </Field>
          )}

          {/* Actions */}
          {awaitingConfirmation ? (
            <div className="flex flex-col items-center gap-2.5 pt-1 text-center">
              <AwaitingConfirmationBadge className="py-1.5 text-xs" />
              <p className="max-w-xs text-xs text-muted-foreground">
                You reported this payment. {targetName} will confirm once they
                receive it.
              </p>
              <Button
                variant="outline"
                size="lg"
                className="w-full"
                onClick={() => onOpenChange(false)}
              >
                Close
              </Button>
            </div>
          ) : !isAllSettled && settlesFree && activeGame ? (
            <div className="flex flex-col gap-2 pt-1">
              <Button
                size="lg"
                variant="success"
                className="h-11 w-full"
                disabled={waive.isPending}
                onClick={() =>
                  waive.mutate(
                    {
                      creditorId: effectivePersonId,
                      challengeId: activeGame.challengeId,
                      scope: resolvedScope,
                    },
                    { onSuccess: () => onSettled?.() }
                  )
                }
              >
                {waive.isPending && <Spinner />}
                Settle up for free
              </Button>
              <p className="text-center text-[11px] text-muted-foreground">
                Your game win covers the full {formatPaise(netPayablePaise)}.
                Nothing to send.
              </p>
            </div>
          ) : !isAllSettled ? (
            <div className="flex flex-col gap-2.5 pt-1">
              <Button
                size="lg"
                className="h-11 w-full"
                onClick={() => setShowAppChooser(true)}
              >
                <HugeiconsIcon icon={CreditCardIcon} data-icon="inline-start" />
                Pay {formatPaise(payPaise)} via UPI
              </Button>

              <Button
                variant="outline"
                className="w-full"
                disabled={reportSettlement.isPending}
                onClick={() => setConfirmPaidOpen(true)}
              >
                I already paid
              </Button>

              <div className="flex items-center justify-center gap-1.5 pt-1 text-[11px] text-muted-foreground">
                <HugeiconsIcon
                  icon={SecurityCheckIcon}
                  className="size-3.5 shrink-0"
                />
                <span>Direct peer-to-peer settlement · Zero commission</span>
              </div>
            </div>
          ) : canCancelOut ? (
            <Button
              size="lg"
              className="h-11 w-full"
              disabled={reportSettlement.isPending}
              onClick={() => handleReport()}
            >
              {reportSettlement.isPending && <Spinner />}
              Cancel out mutual splits ({formatPaise(
                breakdown.offsetPaise
              )}{" "}
              each way)
            </Button>
          ) : (
            <Button
              variant="outline"
              size="lg"
              className="w-full"
              onClick={() => onOpenChange(false)}
            >
              Close
            </Button>
          )}
        </div>
      </BottomSheet>

      <PaymentDoneDialog
        open={confirmPaidOpen}
        onOpenChange={setConfirmPaidOpen}
        amountPaise={payPaise}
        payeeName={targetName}
        isPending={reportSettlement.isPending}
        onConfirm={(utr) => handleReport(utr)}
      />

      <UpiAppSheet
        open={showAppChooser}
        onOpenChange={setShowAppChooser}
        onSelect={handleLaunchApp}
      />
    </>
  )
}
