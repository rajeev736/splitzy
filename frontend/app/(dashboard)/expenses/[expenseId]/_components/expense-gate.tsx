"use client"

import { useRouter } from "nextjs-toploader/app"
import type { IconSvgElement } from "@hugeicons/react"

import { AppHeader } from "@/components/layout/app-header"
import { PageContainer } from "@/components/layout/app-shell"
import { EmptyState } from "@/components/shared/empty-state"
import { QueryError } from "@/components/shared/query-state"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useExpense } from "@/hooks/queries"
import type { Expense } from "@/lib/types"

/**
 * Loads an expense and renders the shared loading / error / not-found states
 * used by both the expense detail and pay pages. `children` receives the
 * loaded expense.
 */
export function ExpenseGate({
  expenseId,
  loadingTitle,
  notFoundIcon,
  children,
}: {
  expenseId: string
  loadingTitle: string
  notFoundIcon: IconSvgElement
  children: (expense: Expense) => React.ReactNode
}) {
  const router = useRouter()
  const { data: expense, isPending, isError, error, refetch } = useExpense(expenseId)

  if (isPending) {
    return (
      <>
        <AppHeader title={loadingTitle} showBack />
        <PageContainer className="max-w-2xl" aria-busy="true">
          <Skeleton className="h-44 w-full rounded-3xl sm:h-52" />
          <Card>
            <CardContent className="flex flex-col gap-3">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-8 w-1/2" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex flex-col gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-5 w-full" />
              ))}
            </CardContent>
          </Card>
        </PageContainer>
      </>
    )
  }

  if (isError) {
    return (
      <>
        <AppHeader title={loadingTitle} showBack />
        <PageContainer className="max-w-2xl">
          <QueryError error={error} onRetry={() => refetch()} />
        </PageContainer>
      </>
    )
  }

  if (!expense) {
    return (
      <>
        <AppHeader title="Expense Not Found" showBack />
        <PageContainer className="max-w-2xl">
          <EmptyState
            icon={notFoundIcon}
            title="Expense Not Found"
            description="This expense may have been deleted, or you may not have permission to view it."
            action={{ label: "Back to History", onClick: () => router.push("/history") }}
          />
        </PageContainer>
      </>
    )
  }

  return <>{children(expense)}</>
}
