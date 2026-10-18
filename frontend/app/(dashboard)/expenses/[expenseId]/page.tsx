"use client"

import * as React from "react"
import Image from "next/image"
import { useParams } from "next/navigation"
import { useRouter } from "nextjs-toploader/app"
import {
  AtIcon,
  Calendar03Icon,
  Delete02Icon,
  Copy01Icon,
  Invoice01Icon,
  Notification01Icon,
  Tick02Icon,
  UserIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react"
import { toast } from "sonner"

import { AppHeader } from "@/components/layout/app-header"
import { PageContainer } from "@/components/layout/app-shell"
import { useSession } from "@/components/providers/session-provider"
import { Amount } from "@/components/shared/amount"
import { DEFAULT_GROUP_ICON } from "@/components/shared/group-icon"
import { StatusBadge } from "@/components/shared/status-badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard"
import {
  useConfirmPayment,
  useDeleteExpense,
  useDisputePayment,
  useSendPaymentReminder,
} from "@/hooks/mutations"
import { getExpenseDebts } from "@/lib/money"
import type { Expense, ExpenseShare } from "@/lib/types"
import { cn } from "@/lib/utils"
import { ConfirmShareDialog } from "./_components/confirm-share-dialog"
import { DeleteExpenseDialog } from "./_components/delete-expense-dialog"
import { ExpenseActionsMenu } from "./_components/expense-actions-menu"
import { ExpenseGate } from "./_components/expense-gate"
import { ShareRow } from "./_components/share-row"

export default function ExpenseDetailsPage() {
  const params = useParams<{ expenseId: string }>()

  return (
    <ExpenseGate expenseId={params.expenseId} loadingTitle="Expense Details" notFoundIcon={Invoice01Icon}>
      {(expense) => <ExpenseDetails expense={expense} />}
    </ExpenseGate>
  )
}

/**
 * What this expense means for the viewer, from the same debt model as every
 * balance in the app (so it always agrees with the dashboard).
 */
function getMyPosition(expense: Expense, uid: string | undefined) {
  const debts = uid ? getExpenseDebts(expense) : []
  const owe = debts.filter((d) => d.fromUserId === uid).reduce((s, d) => s + d.amountPaise, 0)
  const getBack = debts.filter((d) => d.toUserId === uid).reduce((s, d) => s + d.amountPaise, 0)
  const isInvolved = expense.shares.some((s) => s.userId === uid) || expense.payerId === uid

  if (owe > 0) {
    const to = debts.find((d) => d.fromUserId === uid)?.toUserId === expense.payerId ? expense.payerName : expense.recipientName
    return { label: "You owe", paise: owe, className: "text-destructive", detail: `to ${to}` }
  }
  if (getBack > 0) {
    const people = new Set(debts.filter((d) => d.toUserId === uid).map((d) => d.fromUserId)).size
    return {
      label: "You get back",
      paise: getBack,
      className: "text-success",
      detail: `from ${people} ${people === 1 ? "person" : "people"}`,
    }
  }
  return {
    label: isInvolved ? "You're all settled" : "You're not part of this split",
    paise: 0,
    className: "text-muted-foreground",
    detail: "",
  }
}

function DetailRow({ icon, label, children }: { icon: IconSvgElement; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <div className="flex items-center gap-2 text-muted-foreground">
        <HugeiconsIcon icon={icon} className="size-4" />
        <span>{label}</span>
      </div>
      {children}
    </div>
  )
}

function ExpenseDetails({ expense }: { expense: Expense }) {
  const router = useRouter()
  const { user } = useSession()
  const { copied, copy } = useCopyToClipboard()

  const [selectedShare, setSelectedShare] = React.useState<ExpenseShare | null>(null)
  const [isDeleteOpen, setIsDeleteOpen] = React.useState(false)

  const reminder = useSendPaymentReminder()
  const confirmPayment = useConfirmPayment({ successMessage: "Payment confirmed and marked as Paid!" })
  const disputePayment = useDisputePayment()
  const deleteExpense = useDeleteExpense({ successMessage: "Expense deleted successfully" })

  const isRecipient = expense.recipientId === user?.uid
  const isPayer = expense.payerId === user?.uid
  const isCreator = expense.createdBy === user?.uid
  const isDeleted = !!expense.deletedAt
  const canDelete = (isPayer || isCreator) && !isDeleted

  // Invariant check: cannot delete if member payments are confirmed or awaiting confirmation
  const hasPaidMembers =
    expense.shares?.some(
      (s) => s.userId !== expense.payerId && (s.status === "PAID" || s.status === "PAYMENT_REPORTED")
    ) || false
  const allPaid = expense.shares.every((s) => s.status === "PAID")
  const position = getMyPosition(expense, user?.uid)

  const goToPay = () => router.push(`/expenses/${expense.id}/pay`)

  const handleRemindAll = async () => {
    const unpaids = expense.shares.filter((s) => s.status !== "PAID" && s.userId !== user?.uid)
    try {
      for (const u of unpaids) {
        await reminder.mutateAsync({ expenseId: expense.id, targetUserId: u.userId })
      }
    } catch {
      return // error toast is shown globally
    }
    toast.success(`Reminder sent to ${unpaids.length} members!`)
  }

  const handleConfirmReceipt = (userId: string) =>
    confirmPayment.mutate({ expenseId: expense.id, memberUserId: userId }, { onSuccess: () => setSelectedShare(null) })

  const handleDisputeReceipt = (userId: string) =>
    disputePayment.mutate(
      { expenseId: expense.id, memberUserId: userId },
      {
        onSuccess: () => {
          toast.error("Payment marked as disputed")
          setSelectedShare(null)
        },
      }
    )

  const handleConfirmDelete = () =>
    deleteExpense.mutate(expense.id, {
      onSuccess: () => {
        setIsDeleteOpen(false)
        router.back()
      },
    })

  return (
    <>
      <AppHeader
        title="Expense Details"
        showBack
        rightAction={
          !isDeleted && (
          <ExpenseActionsMenu
            canDelete={canDelete}
            onPay={goToPay}
            onRemind={handleRemindAll}
            onDelete={() => setIsDeleteOpen(true)}
          />
          )
        }
      />

      <PageContainer className="max-w-2xl">
        {isDeleted && (
          <Alert className="border-destructive/30 bg-destructive/5">
            <HugeiconsIcon icon={Delete02Icon} className="text-destructive" />
            <AlertTitle className="font-bold">This expense was deleted</AlertTitle>
            <AlertDescription className="text-xs">
              Deleted on {new Date(expense.deletedAt!).toLocaleString()}. It is kept for history only and no longer
              counts towards any balance.
            </AlertDescription>
          </Alert>
        )}

        {/* Hero banner */}
        <div className="relative h-44 overflow-hidden rounded-3xl border shadow-sm sm:h-52">
          <Image
            src={expense.groupIcon || DEFAULT_GROUP_ICON}
            alt={expense.title}
            fill
            sizes="(min-width: 672px) 672px, 100vw"
            className="object-cover"
          />
          <div className="absolute inset-0 flex flex-col justify-end bg-linear-to-t from-black/70 via-black/20 to-transparent p-5 text-white">
            <h1 className="text-2xl font-extrabold tracking-tight">{expense.title}</h1>
            <p className="mt-0.5 text-xs text-white/80">
              {expense.groupName || "Personal Split"} • {expense.date}
            </p>
          </div>
        </div>

        {/* Your position: what you owe / get back is the headline, total is secondary */}
        <Card>
          <CardHeader>
            <CardDescription className="text-xs font-semibold">{position.label}</CardDescription>
            <CardTitle>
              <Amount
                paise={position.paise}
                className={cn("text-3xl font-extrabold tracking-tight sm:text-4xl", position.className)}
              />
            </CardTitle>
            <CardDescription className="text-xs">
              {position.detail && <>{position.detail} · </>}
              Total bill <Amount paise={expense.amountPaise} className="font-semibold" />
            </CardDescription>
            <CardAction className="self-center">
              <StatusBadge status={allPaid ? "paid" : "pending"} />
            </CardAction>
          </CardHeader>
        </Card>

        {/* Participants & shares */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-bold">Participants &amp; Shares</CardTitle>
            <CardAction className="text-xs text-muted-foreground">
              {expense.shares.length} people • {expense.splitType.toLowerCase()} split
            </CardAction>
          </CardHeader>
          <CardContent className="flex flex-col">
            {expense.shares.map((share, i) => (
              <React.Fragment key={share.userId}>
                {i > 0 && <Separator />}
                <ShareRow
                  share={share}
                  isMe={share.userId === user?.uid}
                  isPayer={share.userId === expense.payerId}
                  canConfirm={!isDeleted && isRecipient && share.status === "PAYMENT_REPORTED"}
                  onVerify={() => setSelectedShare(share)}
                  onPay={isDeleted ? undefined : goToPay}
                />
              </React.Fragment>
            ))}
          </CardContent>
        </Card>

        {/* Bill metadata */}
        <Card>
          <CardContent className="flex flex-col gap-2 text-xs">
            <DetailRow icon={UserIcon} label="Paid by">
              <span className="font-bold">{expense.payerName}</span>
            </DetailRow>
            <Separator />
            {expense.recipientId && expense.recipientId !== expense.payerId && (
              <>
                <DetailRow icon={Invoice01Icon} label="Reimburse to">
                  <span className="font-bold">{expense.recipientName}</span>
                </DetailRow>
                <Separator />
              </>
            )}
            <DetailRow icon={AtIcon} label="UPI ID">
              <div className="flex min-w-0 items-center gap-1">
                <span className="truncate font-mono font-bold text-primary">{expense.recipientUpiId}</span>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  title="Copy UPI ID"
                  aria-label="Copy UPI ID"
                  onClick={() => copy(expense.recipientUpiId, "UPI ID copied to clipboard!")}
                >
                  <HugeiconsIcon icon={copied ? Tick02Icon : Copy01Icon} className={copied ? "text-success" : undefined} />
                </Button>
              </div>
            </DetailRow>
            <Separator />
            <DetailRow icon={Calendar03Icon} label="Date">
              <span className="font-semibold">{expense.date}</span>
            </DetailRow>
            {expense.notes && (
              <p className="pt-1 text-muted-foreground italic">Note: &quot;{expense.notes}&quot;</p>
            )}
          </CardContent>
        </Card>

        {/* Action bar */}
        {/* Paying happens inline on your own share row; only reminders live here */}
        <div className={cn("flex gap-3 pt-2", isDeleted && "hidden")}>
          <Button
            variant="outline"
            size="lg"
            className="w-full"
            disabled={reminder.isPending}
            onClick={handleRemindAll}
          >
            <HugeiconsIcon icon={Notification01Icon} data-icon="inline-start" />
            Remind Unpaid
          </Button>
        </div>
      </PageContainer>

      <ConfirmShareDialog
        share={selectedShare}
        expenseTitle={expense.title}
        onClose={() => setSelectedShare(null)}
        onConfirm={handleConfirmReceipt}
        onDispute={handleDisputeReceipt}
        isConfirming={confirmPayment.isPending}
        isDisputing={disputePayment.isPending}
      />

      <DeleteExpenseDialog
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        title={expense.title}
        amountPaise={expense.amountPaise}
        hasPaidMembers={hasPaidMembers}
        isPending={deleteExpense.isPending}
        onConfirm={handleConfirmDelete}
      />
    </>
  )
}
