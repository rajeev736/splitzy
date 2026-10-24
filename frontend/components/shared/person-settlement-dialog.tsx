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
import { useSession } from "@/components/providers/session-provider"
import { useLiveGameDiscounts } from "@/hooks/use-game-discounts"
import { formatCountdown, useNow } from "@/hooks/use-now"
import { AwaitingConfirmationBadge } from "@/components/shared/awaiting-confirmation-badge"
import { Amount } from "@/components/shared/amount"
import { BottomSheet } from "@/components/shared/bottom-sheet"
import { UserAvatar } from "@/components/shared/user-avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Spinner } from "@/components/ui/spinner"
import { useReportPersonSettlement } from "@/hooks/mutations"
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
  const reportSettlement = useReportPersonSettlement({
    successMessage: "Settlement reported! Waiting for recipient confirmation.",
  })

  const [showAppChooser, setShowAppChooser] = React.useState(false)
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
    return calculatePersonNetBreakdown(user.uid, effectivePersonId, expenses, resolvedScope)
  }, [user, effectivePersonId, expenses, resolvedScope])

  const targetName = friendProfile?.displayName || breakdown?.userBName || effectivePersonName
  const targetPhoto = friendProfile?.photoURL || breakdown?.userBPhoto || effectivePersonPhoto
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
  const activeGame = gameDiscount ?? (won?.role === "winner" && !won.pending ? won : undefined)
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
  const discountPaise = discountLive ? Math.min(activeGame?.discountPaise ?? 0, netPayablePaise) : 0
  /** What actually leaves your account: the net minus any game discount. */
  const payPaise = netPayablePaise - discountPaise
  const hasOffset = breakdown.offsetPaise > 0
  // Net zero but mutual splits are still open: they can be cancelled out (PhonePe style)
  const canCancelOut =
    netPayablePaise === 0 && breakdown.aOwesBLines.some((l) => l.status !== "PAYMENT_REPORTED")
  const awaitingConfirmation =
    breakdown.aOwesBLines.length > 0 && breakdown.aOwesBLines.every((l) => l.status === "PAYMENT_REPORTED")
  const isAllSettled = netPayablePaise === 0 && !canCancelOut

  const handleReport = () => {
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
        ...(discountPaise > 0 ? { challengeId: activeGame?.challengeId } : {}),
      },
      {
        onSuccess: () => {
          onSettled?.()
        },
      }
    )
  }

  const handleLaunchApp = (appId: string) => {
    if (!targetUpiId) {
      toast.error("Recipient UPI ID is not available. Please enter it manually.")
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

    // Suggest reporting the settlement
    setTimeout(() => {
      handleReport()
    }, 1500)
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
          <span className="flex items-center gap-1.5 font-medium">
            <Badge variant="outline" className="bg-secondary/60 text-[10px] font-bold">
              {contextTitle}
            </Badge>
            {hasOffset && (
              <span className="text-[11px] text-muted-foreground">
                • ₹{(breakdown.offsetPaise / 100).toFixed(0)} mutual offset applied
              </span>
            )}
          </span>
        }
        bodyClassName="pb-6"
      >
        <div className="flex flex-col gap-4">
          {/* Main Net Amount Card */}
          <Card className="rounded-3xl border-primary/20 bg-linear-to-b from-primary/5 via-card to-card ring-0 shadow-sm">
            <CardContent className="flex flex-col items-center p-5 text-center">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Final Net Amount to Pay
              </span>
              <div className="my-2">
                <Amount
                  paise={payPaise}
                  className={cn(
                    "text-3xl font-black tracking-tight tabular-nums sm:text-4xl",
                    isAllSettled ? "text-success" : "text-destructive"
                  )}
                />
              </div>

              {activeGame && netPayablePaise > 0 && (
                <div className="mb-3 w-full max-w-xs rounded-2xl border bg-card p-3 text-left text-xs">
                  <div className="flex justify-between py-0.5">
                    <span className="text-muted-foreground">You owe {targetName}</span>
                    <span className="font-semibold tabular-nums">{formatPaise(netPayablePaise)}</span>
                  </div>
                  <div
                    className={cn(
                      "flex justify-between py-0.5",
                      discountLive ? "text-success" : "text-muted-foreground line-through"
                    )}
                  >
                    <span>🎮 Game win discount ({activeGame.percent}%)</span>
                    <span className="font-semibold tabular-nums">
                      −{formatPaise(Math.min(activeGame.discountPaise, netPayablePaise))}
                    </span>
                  </div>
                  <div className="mt-1 flex justify-between border-t pt-1.5 font-bold">
                    <span>You pay</span>
                    <span className="tabular-nums">{formatPaise(payPaise)}</span>
                  </div>
                  <p
                    className={cn(
                      "mt-2 rounded-lg px-2 py-1 text-center text-[11px] font-bold",
                      discountLive ? "bg-warning/10 text-warning" : "bg-destructive/10 text-destructive"
                    )}
                  >
                    {discountLive
                      ? `⏱ Discount ends in ${formatCountdown(activeGame.expiresAt - now)}`
                      : "⏱ Time's up — the game discount has expired. Full amount applies."}
                  </p>
                </div>
              )}
              {isAllSettled ? (
                <div className="flex items-center gap-1.5 text-xs font-bold text-success">
                  <HugeiconsIcon icon={CheckmarkCircle02Icon} className="size-4" />
                  <span>All settled up! No payment needed.</span>
                </div>
              ) : (
                <p className="max-w-xs text-xs text-muted-foreground">
                  Calculated after canceling out all reciprocal debts between you and {targetName}.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Recipient Details */}
          <Card className="rounded-3xl">
            <CardContent className="flex flex-col gap-3.5 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <UserAvatar src={targetPhoto} name={targetName} size="md" />
                  <div>
                    <div className="text-sm font-bold">{targetName}</div>
                    <div className="text-xs text-muted-foreground">Payee / Creditor</div>
                  </div>
                </div>

                {targetUpiId && (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="rounded-xl text-muted-foreground hover:text-foreground"
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
                <div className="flex items-center justify-between rounded-2xl border bg-muted/40 px-3 py-2 text-xs">
                  <span className="font-semibold text-muted-foreground">UPI ID:</span>
                  <span className="font-mono font-bold text-primary">{targetUpiId}</span>
                </div>
              ) : (
                <div className="rounded-2xl border border-warning/30 bg-warning/10 p-2.5 text-xs text-warning">
                  {targetName} has not added a UPI ID yet. You can still report payment once transferred.
                </div>
              )}
            </CardContent>
          </Card>

          {/* PhonePe-Style Breakdown Accordion */}
          <Card className="rounded-3xl">
            <CardContent className="flex flex-col gap-3 p-4">
              <button
                type="button"
                onClick={() => setShowBreakdown((v) => !v)}
                className="flex items-center justify-between text-left text-xs font-bold text-foreground transition-colors hover:text-primary"
              >
                <span className="flex items-center gap-1.5">
                  <HugeiconsIcon icon={HelpCircleIcon} className="size-4 text-primary" />
                  How this amount is calculated
                </span>
                <HugeiconsIcon
                  icon={showBreakdown ? ArrowUp01Icon : ArrowDown01Icon}
                  className="size-4 text-muted-foreground"
                />
              </button>

              {showBreakdown && (
                <div className="flex flex-col gap-3 border-t pt-3 text-xs animate-in fade-in duration-200">
                  {/* What you owe */}
                  <div>
                    <div className="flex items-center justify-between font-semibold text-muted-foreground">
                      <span>Expenses you owe {targetName}:</span>
                      <span className="font-bold text-destructive">
                        + {formatPaise(breakdown.aOwesBTotalPaise)}
                      </span>
                    </div>
                    <div className="mt-1.5 flex flex-col gap-1 pl-2 border-l-2 border-destructive/30">
                      {breakdown.aOwesBLines.map(({ expense, amountPaise }) => (
                        <div key={expense.id} className="flex items-center justify-between text-[11px]">
                          <span className="truncate pr-2">
                            {expense.title}{" "}
                            <span className="text-muted-foreground">
                              ({expense.groupName || "Direct"})
                            </span>
                          </span>
                          <span className="font-semibold tabular-nums text-destructive">
                            {formatPaise(amountPaise)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Reciprocal offset */}
                  {hasOffset && (
                    <div>
                      <div className="flex items-center justify-between font-semibold text-muted-foreground">
                        <span>Expenses {targetName} owes you (Offset):</span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">
                          - {formatPaise(breakdown.offsetPaise)}
                        </span>
                      </div>
                      <div className="mt-1.5 flex flex-col gap-1 pl-2 border-l-2 border-emerald-500/30">
                        {breakdown.bOwesALines.map(({ expense, amountPaise }) => (
                          <div key={expense.id} className="flex items-center justify-between text-[11px]">
                            <span className="truncate pr-2">
                              {expense.title}{" "}
                              <span className="text-muted-foreground">
                                ({expense.groupName || "Direct"})
                              </span>
                            </span>
                            <span className="font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                              {formatPaise(amountPaise)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <Separator />

                  <div className="flex items-center justify-between font-bold text-sm">
                    <span>Final Net Payable:</span>
                    <span className="text-destructive tabular-nums">
                      {formatPaise(payPaise)}
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Payment Note Input */}
          {!isAllSettled && !awaitingConfirmation && (
            <Field>
              <FieldLabel htmlFor="settlement-note" className="text-xs font-semibold">
                Payment Note
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
                You reported this payment. {targetName} will confirm once they receive it.
              </p>
              <Button variant="outline" size="lg" className="w-full" onClick={() => onOpenChange(false)}>
                Close
              </Button>
            </div>
          ) : !isAllSettled ? (
            <div className="flex flex-col gap-2.5 pt-1">
              <Button
                size="lg"
                className="h-11 w-full font-bold"
                onClick={() => setShowAppChooser(true)}
              >
                <HugeiconsIcon icon={CreditCardIcon} data-icon="inline-start" />
                Pay {formatPaise(payPaise)} via UPI
              </Button>

              <Button
                variant="outline"
                className="w-full font-bold"
                disabled={reportSettlement.isPending}
                onClick={handleReport}
              >
                {reportSettlement.isPending && <Spinner />}
                I already paid (Report Settlement)
              </Button>

              <div className="flex items-center justify-center gap-1.5 pt-1 text-[11px] text-muted-foreground">
                <HugeiconsIcon icon={SecurityCheckIcon} className="size-4 text-success shrink-0" />
                <span>Direct peer-to-peer settlement • Zero commission</span>
              </div>
            </div>
          ) : canCancelOut ? (
            <Button
              size="lg"
              className="h-11 w-full font-bold"
              disabled={reportSettlement.isPending}
              onClick={handleReport}
            >
              {reportSettlement.isPending && <Spinner />}
              Cancel out mutual splits ({formatPaise(breakdown.offsetPaise)} each way)
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

      <UpiAppSheet
        open={showAppChooser}
        onOpenChange={setShowAppChooser}
        onSelect={handleLaunchApp}
      />
    </>
  )
}
