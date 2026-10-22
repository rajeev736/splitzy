"use client"

import * as React from "react"
import {
  ArrowDownLeft01Icon,
  ArrowRight01Icon,
  ArrowUpRight01Icon,
  CheckmarkCircle02Icon,
  Download01Icon,
  Invoice01Icon,
  SentIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import Link from "next/link"

import { ExpenseListItem } from "../_components/expense-list-item"
import { FilterPills } from "../_components/filter-pills"
import { AppHeader } from "@/components/layout/app-header"
import { PageContainer } from "@/components/layout/app-shell"
import { useSession } from "@/components/providers/session-provider"
import { Amount } from "@/components/shared/amount"
import { EmptyState } from "@/components/shared/empty-state"
import { ListSkeleton, QueryError } from "@/components/shared/query-state"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemSeparator,
  ItemTitle,
} from "@/components/ui/item"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useExpenseHistory } from "@/hooks/queries"
import { formatPaise } from "@/lib/money"
import type { Expense, UserProfile } from "@/lib/types"
import { cn } from "@/lib/utils"

type MainView = "expenses" | "payments"
type ExpenseFilter = "all" | "group" | "personal"
type PaymentFilter = "all" | "sent" | "received"

const EXPENSE_FILTERS = [
  { value: "all", label: "All Expenses" },
  { value: "group", label: "Group" },
  { value: "personal", label: "Personal" },
] as const

const PAYMENT_FILTERS = [
  { value: "all", label: "All Payments" },
  { value: "sent", label: "sent" },
  { value: "received", label: "received" },
] as const

const isPersonal = (exp: Expense) =>
  exp.isPersonal || exp.expenseType === "personal"

/** Formats an ISO timestamp or a YYYY-MM-DD date for display. */
function formatWhen(value: string) {
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  const hasTime = value.includes("T")
  return d.toLocaleString([], {
    day: "numeric",
    month: "short",
    year: "numeric",
    ...(hasTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  })
}

type PaymentState = "confirmed" | "awaiting" | "disputed"

interface PaymentRecord {
  id: string
  expenseId: string
  type: "sent" | "received"
  counterpart: string
  photo?: string
  note: string
  amountPaise: number
  time: string
  state: PaymentState
}

const PAYMENT_STATE: Record<PaymentState, { label: string; className: string }> = {
  confirmed: { label: "confirmed", className: "text-success" },
  awaiting: { label: "awaiting confirmation", className: "text-info" },
  disputed: { label: "disputed", className: "text-destructive" },
}

/**
 * Payments are the shares someone has reported or confirmed paying. Each one
 * goes to the expense's creditor (recipient, else payer) — the same rule the
 * balance engine uses — so history always matches the dashboard.
 * Totals count confirmed payments only.
 */
function derivePayments(user: UserProfile | null, expenses: Expense[]) {
  const records: PaymentRecord[] = []
  let totalSentPaise = 0
  let totalReceivedPaise = 0
  if (!user) return { records, totalSentPaise, totalReceivedPaise }

  for (const exp of expenses) {
    if (exp.deletedAt || isPersonal(exp)) continue
    const creditor = exp.recipientId || exp.payerId

    for (const share of exp.shares) {
      if (share.status === "PENDING" || share.amountPaise <= 0) continue
      if (share.userId === exp.payerId) continue // the payer's own share isn't a payment
      const toUserId = share.userId === creditor ? exp.payerId : creditor
      if (toUserId === share.userId) continue

      const isSent = share.userId === user.uid
      if (!isSent && toUserId !== user.uid) continue

      const state: PaymentState =
        share.status === "PAID"
          ? "confirmed"
          : share.status === "DISPUTED"
            ? "disputed"
            : "awaiting"
      if (state === "confirmed") {
        if (isSent) totalSentPaise += share.amountPaise
        else totalReceivedPaise += share.amountPaise
      }

      records.push({
        id: `${exp.id}_${share.userId}`,
        expenseId: exp.id,
        type: isSent ? "sent" : "received",
        counterpart: isSent
          ? toUserId === exp.payerId
            ? exp.payerName
            : exp.recipientName
          : share.userName,
        photo: isSent ? undefined : share.userPhoto,
        note: exp.groupName ? `${exp.title} · ${exp.groupName}` : exp.title,
        amountPaise: share.amountPaise,
        time: share.confirmedAt || share.reportedAt || exp.createdAt || exp.date,
        state,
      })
    }
  }

  records.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
  return { records, totalSentPaise, totalReceivedPaise }
}

export default function HistoryPage() {
  const { user } = useSession()
  const { data: expenses, isPending, isError, error, refetch } =
    useExpenseHistory()

  const [mainView, setMainView] = React.useState<MainView>("expenses")
  const [expenseFilter, setExpenseFilter] = React.useState<ExpenseFilter>("all")
  const [paymentFilter, setPaymentFilter] = React.useState<PaymentFilter>("all")

  const { records, totalSentPaise, totalReceivedPaise } = React.useMemo(
    () => derivePayments(user, expenses),
    [user, expenses]
  )

  const filteredPayments = records.filter(
    (p) => paymentFilter === "all" || p.type === paymentFilter
  )

  const filteredExpenses = expenses.filter((exp) => {
    if (exp.deletedAt) return false
    if (expenseFilter === "group") return !isPersonal(exp)
    if (expenseFilter === "personal") return isPersonal(exp)
    return true
  })

  const queryState = isPending ? (
    <ListSkeleton />
  ) : isError ? (
    <QueryError error={error} onRetry={refetch} />
  ) : null

  return (
    <>
      <AppHeader
        title={mainView === "expenses" ? "Expense History" : "Payment History"}
      />

      <PageContainer className="max-w-2xl gap-5">
        <Tabs
          value={mainView}
          onValueChange={(v) => setMainView(v as MainView)}
          className="gap-5"
        >
          <TabsList className="h-11! w-full rounded-2xl">
            <TabsTrigger
              value="expenses"
              className="rounded-xl text-xs font-bold"
            >
              Expense History
            </TabsTrigger>
            <TabsTrigger
              value="payments"
              className="rounded-xl text-xs font-bold"
            >
              Payment History
            </TabsTrigger>
          </TabsList>

          {/* ================= EXPENSE HISTORY ================= */}
          <TabsContent
            value="expenses"
            className="flex animate-in flex-col gap-4 duration-200 fade-in"
          >
            <FilterPills
              aria-label="Filter expenses"
              options={EXPENSE_FILTERS}
              value={expenseFilter}
              onValueChange={setExpenseFilter}
            />

            {queryState ??
              (filteredExpenses.length > 0 ? (
                <ItemGroup className="gap-3">
                  {filteredExpenses.map((exp) => {
                    const myShare = exp.shares.find(
                      (s) => s.userId === user?.uid
                    )
                    const personal = isPersonal(exp)

                    return (
                      <ExpenseListItem
                        key={exp.id}
                        expense={exp}
                        className={cn(
                          "rounded-3xl p-4",
                          exp.deletedAt && "opacity-70"
                        )}
                        description={`${
                          personal
                            ? "Personal Expense"
                            : exp.groupName || "Direct Split"
                        } • ${formatWhen(exp.date)} • Paid by ${exp.payerName}`}
                        action={
                          <div className="flex items-center gap-2">
                            {personal ? (
                              <Badge
                                variant="outline"
                                className="border-primary/30 bg-primary/5 text-primary text-[10px] font-bold"
                              >
                                Personal
                              </Badge>
                            ) : (
                              <Badge
                                variant="secondary"
                                className="max-w-[120px] truncate text-[10px] font-bold"
                              >
                                {exp.groupName || "Group"}
                              </Badge>
                            )}
                            <HugeiconsIcon
                              icon={ArrowRight01Icon}
                              className="size-4 shrink-0 text-muted-foreground"
                            />
                          </div>
                        }
                      >
                        <div className="mt-1 flex flex-wrap items-baseline gap-x-2 text-xs">
                          <Amount
                            paise={exp.amountPaise}
                            className={cn(
                              "font-bold",
                              exp.deletedAt && "line-through"
                            )}
                          />
                          {myShare && !personal && (
                            <span className="text-muted-foreground">
                              your share {formatPaise(myShare.amountPaise)}
                            </span>
                          )}
                        </div>
                      </ExpenseListItem>
                    )
                  })}
                </ItemGroup>
              ) : (
                <Card className="rounded-3xl">
                  <EmptyState
                    icon={Invoice01Icon}
                    title="No expenses found in this filter category."
                  />
                </Card>
              ))}
          </TabsContent>

          {/* ================= PAYMENT HISTORY ================= */}
          <TabsContent
            value="payments"
            className="flex animate-in flex-col gap-4 duration-200 fade-in"
          >
            <div className="grid grid-cols-2 gap-3">
              <TotalCard
                icon={SentIcon}
                label="Total Sent"
                paise={totalSentPaise}
              />
              <TotalCard
                icon={Download01Icon}
                label="Total Received"
                paise={totalReceivedPaise}
                positive
              />
            </div>
            <p className="-mt-2 text-[11px] text-muted-foreground">
              Totals include confirmed payments only.
            </p>

            <FilterPills
              aria-label="Filter payments"
              options={PAYMENT_FILTERS}
              value={paymentFilter}
              onValueChange={setPaymentFilter}
            />

            {queryState ?? (
              <Card className="rounded-3xl py-0">
                {filteredPayments.length > 0 ? (
                  <ItemGroup className="gap-0">
                    {filteredPayments.map((p, i) => (
                      <React.Fragment key={p.id}>
                        {i > 0 && <ItemSeparator className="my-0" />}
                        <PaymentRow payment={p} />
                      </React.Fragment>
                    ))}
                  </ItemGroup>
                ) : (
                  <EmptyState
                    icon={CheckmarkCircle02Icon}
                    title="No payment records found."
                  />
                )}
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </PageContainer>
    </>
  )
}

function TotalCard({
  icon,
  label,
  paise,
  positive = false,
}: {
  icon: typeof SentIcon
  label: string
  paise: number
  positive?: boolean
}) {
  return (
    <Card size="sm" className="rounded-2xl">
      <CardContent className="flex flex-col gap-1">
        <div
          className={cn(
            "flex items-center gap-1.5 text-xs font-semibold",
            positive ? "text-success" : "text-muted-foreground"
          )}
        >
          <HugeiconsIcon
            icon={icon}
            className={cn(
              "size-3.5",
              positive ? "text-success" : "text-primary"
            )}
          />
          <span>{label}</span>
        </div>
        <Amount
          paise={paise}
          className={cn("text-xl font-bold", positive && "text-success")}
        />
      </CardContent>
    </Card>
  )
}

function PaymentRow({ payment: p }: { payment: PaymentRecord }) {
  const isSent = p.type === "sent"
  const state = PAYMENT_STATE[p.state]
  return (
    <Item
      className="flex-nowrap rounded-none p-4 hover:bg-muted/50"
      render={<Link href={`/expenses/${p.expenseId}`} />}
    >
      <ItemMedia>
        <div
          className={cn(
            "flex size-10 items-center justify-center rounded-2xl",
            isSent ? "bg-secondary text-primary" : "bg-success/10 text-success"
          )}
        >
          <HugeiconsIcon
            icon={isSent ? ArrowUpRight01Icon : ArrowDownLeft01Icon}
            className="size-5"
          />
        </div>
      </ItemMedia>
      <ItemContent className="min-w-0 gap-0.5">
        <ItemTitle className="block w-full truncate text-xs font-bold sm:text-sm">
          {isSent
            ? `Paid to ${p.counterpart}`
            : `Received from ${p.counterpart}`}
        </ItemTitle>
        <ItemDescription className="truncate text-xs">{p.note}</ItemDescription>
        <span className="text-[10px] text-muted-foreground">
          {formatWhen(p.time)}
        </span>
      </ItemContent>
      <ItemActions className="flex-col items-end gap-0">
        <div
          className={cn(
            "text-sm font-extrabold tabular-nums sm:text-base",
            !isSent && "text-success",
            p.state !== "confirmed" && "opacity-70"
          )}
        >
          {isSent
            ? `- ${formatPaise(p.amountPaise)}`
            : `+ ${formatPaise(p.amountPaise)}`}
        </div>
        <span
          className={cn(
            "text-[10px] font-bold tracking-wider uppercase",
            state.className
          )}
        >
          {state.label}
        </span>
      </ItemActions>
    </Item>
  )
}
