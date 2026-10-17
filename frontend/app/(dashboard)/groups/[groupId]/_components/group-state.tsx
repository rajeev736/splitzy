"use client"

import { UserGroupIcon } from "@hugeicons/core-free-icons"
import { useRouter } from "nextjs-toploader/app"

import { AppHeader } from "@/components/layout/app-header"
import { PageContainer } from "@/components/layout/app-shell"
import { EmptyState } from "@/components/shared/empty-state"
import { ListSkeleton, QueryError } from "@/components/shared/query-state"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

/** Loading / error / not-found shells shared by the group dashboard and members pages. */
export function GroupLoading({ title, hero = true }: { title?: string; hero?: boolean }) {
  return (
    <>
      <AppHeader title={title} showBack />
      <PageContainer aria-busy>
        {hero && (
          <Card>
            <CardContent className="flex flex-col items-center gap-3">
              <Skeleton className="size-20 rounded-3xl" />
              <Skeleton className="h-7 w-40" />
              <Skeleton className="h-3 w-24" />
              <Skeleton className="mt-2 h-8 w-full max-w-sm" />
            </CardContent>
          </Card>
        )}
        <ListSkeleton rows={4} />
      </PageContainer>
    </>
  )
}

export function GroupError({ title, error, onRetry }: { title?: string; error: unknown; onRetry?: () => void }) {
  return (
    <>
      <AppHeader title={title} showBack />
      <PageContainer>
        <QueryError error={error} onRetry={onRetry} />
      </PageContainer>
    </>
  )
}

export function GroupNotFound({ title }: { title?: string }) {
  const router = useRouter()
  return (
    <>
      <AppHeader title={title} showBack />
      <PageContainer>
        <EmptyState
          icon={UserGroupIcon}
          title="Group not found"
          description="This group doesn't exist or you no longer have access to it."
          action={{ label: "Back to Groups", onClick: () => router.push("/groups") }}
        />
      </PageContainer>
    </>
  )
}
