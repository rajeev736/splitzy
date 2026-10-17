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

import { ExpenseListItem } from "../_components/expense-list-item"
import { FilterPills } from "../_components/filter-pills"
import { AppHeader } from "@/components/layout/app-header"
import { PageContainer } from "@/components/layout/app-shell"
import { useSession } from "@/components/providers/session-provider"
import { Amount } from "@/components/shared/amount"
import { EmptyState } from "@/components/shared/empty-state"
import { ListSkeleton, QueryError } from "@/components/shared/query-state"
import { StatusBadge } from "@/components/shared/status-badge"
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
import { useExpenses } from "@/hooks/queries"
import { formatPaise } from "@/lib/money"
import type { Expense, UserProfile } from "@/lib/types"
import { cn } from "@/lib/utils"

type MainView = "expenses" | "payments"
type ExpenseFilter = "all" | "pending" | "payment_reported" | "paid" | "failed"
type PaymentFilter = "all" | "sent" | "received"

const EXPENSE_FILTERS = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "payment_reported", label: "Payment Reported" },
  { value: "paid", label: "Paid" },
] as const

const PAYMENT_FILTERS = [
  { value: "all", label: "All Payments" },
  { value: "sent", label: "sent" },
  { value: "received", label: "received" },
] as const

interface PaymentRecord {
  id: string
  type: "sent" | "received"
  counterpart: string
  photo?: string
  note: string
  amountPaise: number
  time: string
  status: string
}

/** Derive genuine payment records from authentic expenses. */
function derivePayments(user: UserProfile | null, expenses: Expense[]) {
  const records: PaymentRecord[] = []
  let totalSentPaise = 0
  let totalReceivedPaise = 0

  if (user) {
    expenses.forEach((exp) => {
      if (exp.payerId === user.uid) {
        // As payer, look for shares marked PAID or PAYMENT_REPORTED
        exp.shares.forEach((share) => {
          if (
            share.userId !== user.uid &&
            (share.status === "PAID" || share.status === "PAYMENT_REPORTED")
          ) {
            totalReceivedPaise += share.amountPaise
            records.push({
              id: `${exp.id}_${share.userId}`,
              type: "received",
              counterpart: share.userName,
              photo: share.userPhoto,
              note: exp.title,
              amountPaise: share.amountPaise,
              time: share.confirmedAt || share.reportedAt || exp.date,
              status: share.status === "PAID" ? "received" : "reported",
            })
          }
        })
      } else {
        // As participant, check own share
        const myShare = exp.shares.find((s) => s.userId === user.uid)
        if (
          myShare &&
          (myShare.status === "PAID" || myShare.status === "PAYMENT_REPORTED")
        ) {
          totalSentPaise += myShare.amountPaise
          records.push({
            id: `${exp.id}_${user.uid}`,
            type: "sent",
            counterpart: exp.payerName,
            note: exp.title,
            amountPaise: myShare.amountPaise,
            time: myShare.confirmedAt || myShare.reportedAt || exp.date,
            status: myShare.status === "PAID" ? "completed" : "reported",
          })
        }
      }
    })
  }

  return { records, totalSentPaise, totalReceivedPaise }
}

export default function HistoryPage() {
  const { user } = useSession()
  const { data: expenses, isPending, isError, error, refetch } = useExpenses()

  const [mainView, setMainView] = React.useState<MainView>("expenses")
  const [expenseFilter, setExpenseFilter] = React.useState<ExpenseFilter>("all")
  const [paymentFilter, setPaymentFilter] = React.useState<PaymentFilter>("all")

  const { records, totalSentPaise, totalReceivedPaise } = React.useMemo(
    () => derivePayments(user, expenses),
    [user, expenses]
  )

  const filteredPayments = records.filter((p) => {
    if (paymentFilter === "sent") return p.type === "sent"
    if (paymentFilter === "received") return p.type === "received"
    return true
  })

  const filteredExpenses = expenses.filter((exp) => {
    if (expenseFilter === "all") return true
    if (expenseFilter === "paid")
      return exp.shares.every((s) => s.status === "PAID")
    if (expenseFilter === "pending")
      return exp.shares.some((s) => s.status === "PENDING")
    if (expenseFilter === "payment_reported")
      return exp.shares.some((s) => s.status === "PAYMENT_REPORTED")
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
                  {filteredExpenses.map((exp) => (
                    <ExpenseListItem
                      key={exp.id}
                      expense={exp}
                      className="rounded-3xl p-4"
                      description={`${exp.groupName || "Direct Split"} • ${exp.date}`}
                      action={
                        <div className="flex flex-col items-end gap-1.5">
                          <StatusBadge
                            status={
                              exp.shares.every((s) => s.status === "PAID")
                                ? "paid"
                                : "pending"
                            }
                          />
                          <HugeiconsIcon
                            icon={ArrowRight01Icon}
                            className="size-4 text-muted-foreground"
                          />
                        </div>
                      }
                    >
                      <Amount
                        paise={exp.amountPaise}
                        className="mt-1 text-xs font-bold"
                      />
                    </ExpenseListItem>
                  ))}
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
  return (
    <Item className="flex-nowrap rounded-none p-4 hover:bg-muted/50">
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
        <span className="text-[10px] text-muted-foreground">{p.time}</span>
      </ItemContent>
      <ItemActions className="flex-col items-end gap-0">
        <div
          className={cn(
            "text-sm font-extrabold tabular-nums sm:text-base",
            !isSent && "text-success"
          )}
        >
          {isSent
            ? `- ${formatPaise(p.amountPaise)}`
            : `+ ${formatPaise(p.amountPaise)}`}
        </div>
        <span className="text-[10px] font-bold tracking-wider text-success uppercase">
          {p.status}
        </span>
      </ItemActions>
    </Item>
  )
}
