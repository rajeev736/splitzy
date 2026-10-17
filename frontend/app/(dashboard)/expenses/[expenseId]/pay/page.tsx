"use client"

import * as React from "react"
import { useParams } from "next/navigation"
import { useRouter } from "nextjs-toploader/app"
import { AlertCircleIcon, Copy01Icon, SecurityCheckIcon, Tick02Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { AppHeader } from "@/components/layout/app-header"
import { PageContainer } from "@/components/layout/app-shell"
import { useSession } from "@/components/providers/session-provider"
import { Amount } from "@/components/shared/amount"
import { GroupIcon } from "@/components/shared/group-icon"
import { StatusBadge } from "@/components/shared/status-badge"
import { UserAvatar } from "@/components/shared/user-avatar"
import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { useReportPayment } from "@/hooks/mutations"
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard"
import type { Expense, SharePaymentStatus } from "@/lib/types"
import { buildUPILink, type UPITransactionParams } from "@/lib/upi"
import { ExpenseGate } from "../_components/expense-gate"
import { InfoCallout } from "./_components/info-callout"
import { PaymentReported } from "./_components/payment-reported"
import { UpiAppSheet } from "./_components/upi-app-sheet"

export default function PayExpensePage() {
  const params = useParams<{ expenseId: string }>()

  return (
    <ExpenseGate expenseId={params.expenseId} loadingTitle="Pay Expense" notFoundIcon={AlertCircleIcon}>
      {(expense) => <PayExpense expense={expense} />}
    </ExpenseGate>
  )
}

function PayExpense({ expense }: { expense: Expense }) {
  const router = useRouter()
  const { user } = useSession()
  const upiCopy = useCopyToClipboard()
  const amountCopy = useCopyToClipboard()
  const reportPayment = useReportPayment({ successMessage: "Payment reported! Waiting for recipient confirmation." })

  const myShare = expense.shares?.find((s) => s.userId === user?.uid) || {
    amountPaise: 0,
    status: "PENDING" as SharePaymentStatus,
  }

  const [paymentNote, setPaymentNote] = React.useState(`${expense.title} - ${expense.groupName || "JoySplit"}`)
  const [showAppChooser, setShowAppChooser] = React.useState(false)

  // Reported flag mirrors the share status, and flips on after a local report.
  const [isReported, setIsReported] = React.useState(myShare.status === "PAYMENT_REPORTED")
  const [prevStatus, setPrevStatus] = React.useState(myShare.status)
  if (prevStatus !== myShare.status) {
    setPrevStatus(myShare.status)
    setIsReported(myShare.status === "PAYMENT_REPORTED")
  }

  const amountRupeesString = (myShare.amountPaise / 100).toFixed(0)

  const handleMarkReported = () =>
    reportPayment.mutate({ expenseId: expense.id, note: paymentNote }, { onSuccess: () => setIsReported(true) })

  const handleLaunchApp = (appId: string) => {
    const upiUri = buildUPILink({
      upiId: expense.recipientUpiId,
      payeeName: expense.recipientName,
      amountPaise: myShare.amountPaise,
      note: paymentNote,
      app: appId as UPITransactionParams["app"],
    })

    setShowAppChooser(false)

    // Attempt to open native UPI application
    window.location.href = upiUri

    // Report prompt
    setTimeout(() => {
      handleMarkReported()
    }, 1500)
  }

  return (
    <>
      <AppHeader
        title={isReported ? "Payment Reported" : "Pay Your Share"}
        showBack
        onBack={() => router.push(`/expenses/${expense.id}`)}
      />

      <PageContainer className="max-w-md">
        {isReported ? (
          <PaymentReported expense={expense} amountPaise={myShare.amountPaise} />
        ) : (
          <div className="flex animate-in flex-col gap-5 duration-200 fade-in">
            {/* Mini bill card */}
            <Card size="sm">
              <CardContent className="flex items-center gap-3.5">
                <GroupIcon src={expense.groupIcon} alt={expense.title} size="md" />
                <div className="min-w-0">
                  <h3 className="truncate text-sm font-bold">{expense.title}</h3>
                  <p className="text-xs text-muted-foreground">
                    {expense.groupName || "Personal"} • {expense.date}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Share amount */}
            <Card>
              <CardHeader>
                <CardDescription className="text-xs font-semibold">Your share</CardDescription>
                <CardTitle>
                  <Amount paise={myShare.amountPaise} className="text-3xl font-extrabold" />
                </CardTitle>
                <CardAction className="self-center">
                  <StatusBadge status="pending" />
                </CardAction>
              </CardHeader>
            </Card>

            {/* Recipient details */}
            <Card>
              <CardHeader>
                <CardDescription className="text-xs font-semibold">Pay to</CardDescription>
                <CardAction>
                  <Button
                    variant="link"
                    size="sm"
                    className="h-auto p-0 font-bold"
                    onClick={() => amountCopy.copy(amountRupeesString, "Amount copied!")}
                  >
                    {amountCopy.copied ? "Copied ₹" : "Copy Amount"}
                  </Button>
                </CardAction>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <UserAvatar name={expense.recipientName} size="md" />
                  <div>
                    <div className="text-sm font-bold">{expense.recipientName}</div>
                    <div className="text-xs text-muted-foreground">Recipient</div>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 rounded-2xl border bg-muted/50 p-3.5">
                  <div className="min-w-0">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">UPI ID</span>
                    <div className="truncate font-mono text-sm font-bold">{expense.recipientUpiId}</div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    title="Copy UPI ID"
                    aria-label="Copy UPI ID"
                    onClick={() => upiCopy.copy(expense.recipientUpiId, "UPI ID copied!")}
                  >
                    <HugeiconsIcon
                      icon={upiCopy.copied ? Tick02Icon : Copy01Icon}
                      className={upiCopy.copied ? "text-success" : undefined}
                    />
                  </Button>
                </div>

                <Field>
                  <FieldLabel htmlFor="payment-note" className="text-xs font-semibold">
                    Add a note to payment (optional)
                  </FieldLabel>
                  <Input
                    id="payment-note"
                    value={paymentNote}
                    onChange={(e) => setPaymentNote(e.target.value)}
                    placeholder="e.g. Dinner at Thalassa - Goa Trip"
                  />
                </Field>
              </CardContent>
            </Card>

            <InfoCallout>
              You will be redirected to your UPI app to complete the payment. If your app doesn&apos;t open
              automatically, you can copy the UPI ID above.
            </InfoCallout>

            <Button size="lg" className="h-11 w-full" onClick={() => setShowAppChooser(true)}>
              Pay <Amount paise={myShare.amountPaise} />
            </Button>

            <Button variant="outline" className="w-full" disabled={reportPayment.isPending} onClick={handleMarkReported}>
              {reportPayment.isPending && <Spinner />}
              I already paid (Report Payment)
            </Button>

            <div className="flex items-center justify-center gap-1.5 pt-1 text-xs text-muted-foreground">
              <HugeiconsIcon icon={SecurityCheckIcon} className="size-4 text-success" />
              <span>No extra charges • Direct UPI peer-to-peer transfer</span>
            </div>
          </div>
        )}
      </PageContainer>

      <UpiAppSheet open={showAppChooser} onOpenChange={setShowAppChooser} onSelect={handleLaunchApp} />
    </>
  )
}
