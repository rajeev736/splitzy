"use client"

import * as React from "react"
import { Delete02Icon, Notification01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { toast } from "sonner"

import { AppHeader } from "@/components/layout/app-header"
import { PageContainer } from "@/components/layout/app-shell"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { EmptyState } from "@/components/shared/empty-state"
import { ListSkeleton, QueryError } from "@/components/shared/query-state"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  useClearAllNotifications,
  useConfirmPayment,
  useDisputePayment,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
} from "@/hooks/mutations"
import { useExpenses, useNotifications } from "@/hooks/queries"
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
  const { data: expenses } = useExpenses()
  const markRead = useMarkNotificationRead()
  const markAllRead = useMarkAllNotificationsRead()
  const clearAll = useClearAllNotifications()
  const confirmPayment = useConfirmPayment({ successMessage: "Payment confirmed!" })
  const disputePayment = useDisputePayment()

  const [filter, setFilter] = React.useState<Filter>("all")
  const [selectedNotif, setSelectedNotif] = React.useState<AppNotification | null>(null)
  const [showClearConfirm, setShowClearConfirm] = React.useState(false)

  const filteredNotifs = notifications.filter((n) => filter === "all" || notificationCategory(n.type) === filter)

  const handleOpenNotif = (notif: AppNotification) => {
    markRead.mutate(notif.id)
    setSelectedNotif(notif)
  }

  const handleConfirm = (notif: AppNotification) => {
    const expenseId = notif.data?.expenseId
    const actorId = notif.data?.actorId
    if (!expenseId || !actorId) return
    confirmPayment.mutate({ expenseId, memberUserId: actorId, notifId: notif.id })
  }

  const handleDispute = (notif: AppNotification) => {
    const expenseId = notif.data?.expenseId
    const actorId = notif.data?.actorId
    if (!expenseId || !actorId) return
    disputePayment.mutate(
      { expenseId, memberUserId: actorId, notifId: notif.id },
      {
        onSuccess: () => {
          toast.error("Payment marked as not received")
        },
      }
    )
  }

  const getShareStatus = (notif: AppNotification) => {
    if (notif.type !== "PAYMENT_REPORTED") return undefined
    const expense = expenses.find((e) => e.id === notif.data?.expenseId)
    const share = expense?.shares?.find((s) => s.userId === notif.data?.actorId)
    return share?.status
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
          <div className="flex items-center gap-2">
            {notifications.some((n) => !n.read) && (
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
            )}
            {notifications.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs font-bold text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={() => setShowClearConfirm(true)}
              >
                <HugeiconsIcon icon={Delete02Icon} className="mr-1 size-3.5" />
                Clear
              </Button>
            )}
          </div>
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
                  expenseShareStatus={getShareStatus(notif)}
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

      <ConfirmDialog
        open={showClearConfirm}
        onOpenChange={setShowClearConfirm}
        title="Clear all notifications?"
        description="Are you sure you want to clear all notifications? This will remove all notifications from your notification center."
        confirmLabel={clearAll.isPending ? "Clearing..." : "Clear All"}
        destructive
        isPending={clearAll.isPending}
        onConfirm={() => {
          clearAll.mutate(undefined, {
            onSuccess: () => setShowClearConfirm(false),
          })
        }}
      />
    </>
  )
}
