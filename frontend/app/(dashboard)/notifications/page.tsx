"use client"

import * as React from "react"
import { Notification01Icon } from "@hugeicons/core-free-icons"
import { toast } from "sonner"

import { AppHeader } from "@/components/layout/app-header"
import { PageContainer } from "@/components/layout/app-shell"
import { EmptyState } from "@/components/shared/empty-state"
import { ListSkeleton, QueryError } from "@/components/shared/query-state"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  useConfirmPayment,
  useDisputePayment,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
} from "@/hooks/mutations"
import { useNotifications } from "@/hooks/queries"
import type { AppNotification } from "@/lib/types"
import { NotificationDetailDialog } from "./_components/notification-detail-dialog"
import { notificationCategory } from "./_components/notification-icon"
import { NotificationRow } from "./_components/notification-row"

const FILTERS = [
  { value: "all", label: "All" },
  { value: "payments", label: "Payments" },
  { value: "friends", label: "Friends" },
  { value: "groups", label: "Groups" },
] as const

type Filter = (typeof FILTERS)[number]["value"]

export default function NotificationsPage() {
  const { data: notifications, isPending, isError, error, refetch } = useNotifications()
  const markRead = useMarkNotificationRead()
  const markAllRead = useMarkAllNotificationsRead()
  const confirmPayment = useConfirmPayment({ successMessage: "Payment confirmed!" })
  const disputePayment = useDisputePayment()

  const [filter, setFilter] = React.useState<Filter>("all")
  const [selectedNotif, setSelectedNotif] = React.useState<AppNotification | null>(null)

  const filteredNotifs = notifications.filter((n) => filter === "all" || notificationCategory(n.type) === filter)

  const handleOpenNotif = (notif: AppNotification) => {
    markRead.mutate(notif.id)
    setSelectedNotif(notif)
  }

  const handleConfirm = (notif: AppNotification) => {
    const expenseId = notif.data?.expenseId
    const actorId = notif.data?.actorId
    if (!expenseId || !actorId) return
    confirmPayment.mutate({ expenseId, memberUserId: actorId }, { onSuccess: () => markRead.mutate(notif.id) })
  }

  const handleDispute = (notif: AppNotification) => {
    const expenseId = notif.data?.expenseId
    const actorId = notif.data?.actorId
    if (!expenseId || !actorId) return
    disputePayment.mutate(
      { expenseId, memberUserId: actorId },
      {
        onSuccess: () => {
          markRead.mutate(notif.id)
          toast.error("Payment marked as not received")
        },
      }
    )
  }

  const isRowBusy = (notif: AppNotification) => {
    const matches = (v?: { expenseId: string; memberUserId: string }) =>
      v?.expenseId === notif.data?.expenseId && v?.memberUserId === notif.data?.actorId
    return (
      (confirmPayment.isPending && matches(confirmPayment.variables)) ||
      (disputePayment.isPending && matches(disputePayment.variables))
    )
  }

  return (
    <>
      <AppHeader
        title="Notifications"
        rightAction={
          <Button
            variant="link"
            size="sm"
            className="font-bold"
            onClick={() => {
              markAllRead.mutate()
              toast.success("All notifications marked as read")
            }}
          >
            Mark all read
          </Button>
        }
      />

      <PageContainer className="max-w-2xl gap-5">
        <Tabs value={filter} onValueChange={(value) => setFilter(value as Filter)}>
          <TabsList>
            {FILTERS.map((f) => (
              <TabsTrigger key={f.value} value={f.value} className="px-3 text-xs font-bold">
                {f.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {isPending ? (
          <ListSkeleton rows={4} />
        ) : isError ? (
          <QueryError error={error} onRetry={() => refetch()} />
        ) : filteredNotifs.length === 0 ? (
          <Card>
            <EmptyState icon={Notification01Icon} title="No notifications in this category." />
          </Card>
        ) : (
          <Card className="gap-0 py-0">
            {filteredNotifs.map((notif, i) => (
              <React.Fragment key={notif.id}>
                {i > 0 && <Separator />}
                <NotificationRow
                  notif={notif}
                  onOpen={() => handleOpenNotif(notif)}
                  onConfirm={() => handleConfirm(notif)}
                  onDispute={() => handleDispute(notif)}
                  isBusy={isRowBusy(notif)}
                />
              </React.Fragment>
            ))}
          </Card>
        )}
      </PageContainer>

      <NotificationDetailDialog notif={selectedNotif} onClose={() => setSelectedNotif(null)} />
    </>
  )
}
