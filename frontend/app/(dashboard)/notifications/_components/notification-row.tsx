"use client"

import { Tick02Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { Button } from "@/components/ui/button"
import { Item, ItemActions, ItemContent, ItemDescription, ItemMedia, ItemTitle } from "@/components/ui/item"
import type { AppNotification } from "@/lib/types"
import { cn } from "@/lib/utils"
import { NotificationIcon } from "./notification-icon"

/** A notification in the list; payment reports get inline confirm / dispute buttons (on a second line) or a status once resolved. */
export function NotificationRow({
  notif,
  expenseShareStatus,
  onOpen,
  onConfirm,
  onDispute,
  isBusy,
}: {
  notif: AppNotification
  expenseShareStatus?: string
  onOpen: () => void
  onConfirm: () => void
  onDispute: () => void
  isBusy: boolean
}) {
  const isUnread = !notif.read
  const isConfirmed = notif.actionTaken === "CONFIRMED" || expenseShareStatus === "PAID"
  const isDisputed = notif.actionTaken === "DISPUTED" || expenseShareStatus === "DISPUTED"

  return (
    <Item
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.target !== e.currentTarget) return
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          onOpen()
        }
      }}
      className={cn(
        "cursor-pointer flex-nowrap items-start rounded-none p-4",
        isUnread ? "bg-muted/40 hover:bg-muted/70" : "hover:bg-muted/50"
      )}
    >
      <ItemMedia className="mt-0.5">
        <NotificationIcon type={notif.type} />
      </ItemMedia>

      <ItemContent className="min-w-0 gap-0.5">
        <ItemTitle className="line-clamp-none text-sm font-medium">{notif.title}</ItemTitle>
        <ItemDescription className="line-clamp-none text-xs leading-relaxed">{notif.message}</ItemDescription>
        <span className="mt-1 block text-[11px] text-muted-foreground">
          {new Date(notif.createdAt).toLocaleString([], {
            day: "numeric",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
        {notif.type === "PAYMENT_REPORTED" && (
          isConfirmed ? (
            <span className="mt-1.5 flex items-center gap-1 text-xs font-medium text-success">
              <HugeiconsIcon icon={Tick02Icon} className="size-3.5" />
              Received
            </span>
          ) : isDisputed ? (
            <span className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-destructive">
              <span aria-hidden className="size-1.5 rounded-full bg-current" />
              Declined
            </span>
          ) : (
            <div className="mt-2 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
              <Button size="sm" variant="success" disabled={isBusy} onClick={onConfirm}>
                Yes, received
              </Button>
              <Button size="sm" variant="outline" className="text-destructive hover:text-destructive" disabled={isBusy} onClick={onDispute}>
                No
              </Button>
            </div>
          )
        )}
      </ItemContent>

      <ItemActions className="shrink-0 self-start pt-1.5">
        {isUnread && <span className="size-2 shrink-0 rounded-full bg-primary" aria-label="Unread" />}
      </ItemActions>
    </Item>
  )
}
