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
  Tick02Icon,
  UserIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react"

import { AppHeader } from "@/components/layout/app-header"
import { PageContainer } from "@/components/layout/app-shell"
import { useSession } from "@/components/providers/session-provider"
import { GameDiscountTag } from "@/components/games/game-discount-amount"
import { Amount } from "@/components/shared/amount"
import { PayPersonButton } from "@/components/shared/pay-person-button"
import { DEFAULT_GROUP_ICON } from "@/components/shared/group-icon"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard"
import { useDeleteExpense } from "@/hooks/mutations"
import { useLiveGameDiscounts } from "@/hooks/use-game-discounts"
import type { Expense } from "@/lib/types"
import { DeleteExpenseDialog } from "./_components/delete-expense-dialog"
import { ExpenseActionsMenu } from "./_components/expense-actions-menu"
import { ExpenseGate } from "./_components/expense-gate"
import { ShareRow } from "./_components/share-row"
import { useUnreadTracking } from "@/hooks/use-unread-tracking"

export default function ExpenseDetailsPage() {
  const params = useParams<{ expenseId: string }>()

  return (
    <ExpenseGate expenseId={params.expenseId} loadingTitle="Expense Details" notFoundIcon={Invoice01Icon}>
      {(expense) => <ExpenseDetails expense={expense} />}
    </ExpenseGate>
  )
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

  const [isDeleteOpen, setIsDeleteOpen] = React.useState(false)

  const { markSeen } = useUnreadTracking()

  React.useEffect(() => {
    markSeen(expense.id)
  }, [expense.id, markSeen])

  const deleteExpense = useDeleteExpense({ successMessage: "Expense deleted successfully" })

  const isPayer = expense.payerId === user?.uid
  const isCreator = expense.createdBy === user?.uid
  const isDeleted = !!expense.deletedAt
  const canDelete = (isPayer || isCreator) && !isDeleted

  const myShare = expense.shares.find((s) => s.userId === user?.uid)

  // A game played on this bill whose discount is still live (gone once paid)
  const { byPerson, now } = useLiveGameDiscounts()
  const game = [...byPerson.values()].find((d) => d.expenseId === expense.id && !d.pending)
  const gameOtherName = game
    ? expense.shares.find((s) => s.userId === game.otherId)?.userName ||
      (game.otherId === expense.payerId ? expense.payerName : "They")
    : ""

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
          !isDeleted && canDelete ? (
            <ExpenseActionsMenu
              canDelete={canDelete}
              onDelete={() => setIsDeleteOpen(true)}
            />
          ) : undefined
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

        {/* Expense overview / details */}
        <Card className="rounded-3xl">
          <CardHeader>
            <CardDescription className="text-xs font-semibold">
              {isPayer
                ? "You paid this bill"
                : myShare
                  ? "Your Share in this bill"
                  : "Total Bill"}
            </CardDescription>
            <CardTitle>
              <Amount
                paise={
                  isPayer
                    ? expense.amountPaise
                    : myShare
                      ? myShare.amountPaise
                      : expense.amountPaise
                }
                className="text-3xl font-extrabold tracking-tight sm:text-4xl text-foreground"
              />
            </CardTitle>
            <CardDescription className="text-xs">
              {isPayer ? (
                <>Split between {expense.shares.length} participants · Paid on {expense.date}</>
              ) : myShare ? (
                <>Total bill <Amount paise={expense.amountPaise} className="font-semibold" /> · Paid by {expense.payerName}</>
              ) : (
                <>Paid by {expense.payerName} · Split between {expense.shares.length} participants</>
              )}
            </CardDescription>
          </CardHeader>
        </Card>

        {game && !isDeleted && (
          <Card className="rounded-3xl">
            <CardContent className="flex items-center gap-3">
              <div className="flex min-w-0 flex-1 flex-col items-start gap-1">
                <p className="text-sm font-bold">
                  {game.role === "winner"
                    ? `You won a game on this bill — pay ${gameOtherName} less`
                    : `${gameOtherName} won your game on this bill`}
                </p>
                <GameDiscountTag discountPaise={game.discountPaise} endsAt={game.expiresAt} now={now} />
              </div>
              {game.role === "winner" && (
                <PayPersonButton personId={game.otherId} personName={gameOtherName} label="Pay now" />
              )}
            </CardContent>
          </Card>
        )}

        {/* Participants & shares */}
        <Card className="rounded-3xl">
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
                />
              </React.Fragment>
            ))}
          </CardContent>
        </Card>

        {/* Bill metadata */}
        <Card className="rounded-3xl">
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
      </PageContainer>

      <DeleteExpenseDialog
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        title={expense.title}
        amountPaise={expense.amountPaise}
        hasPaidMembers={false}
        isPending={deleteExpense.isPending}
        onConfirm={handleConfirmDelete}
      />
    </>
  )
}
