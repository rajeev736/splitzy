"use client"

import { Tick02Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Item, ItemActions, ItemContent, ItemDescription, ItemMedia, ItemTitle } from "@/components/ui/item"
import type { AppNotification } from "@/lib/types"
import { cn } from "@/lib/utils"
import { NotificationIcon } from "./notification-icon"

/** A notification in the list; payment reports get inline confirm / dispute buttons or status badge once resolved. */
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
        isUnread ? "bg-primary/5 hover:bg-primary/10" : "hover:bg-muted"
      )}
    >
      <ItemMedia className="mt-0.5">
        <NotificationIcon type={notif.type} />
      </ItemMedia>

      <ItemContent className="min-w-0 gap-0.5">
        <ItemTitle className="line-clamp-none text-xs font-bold sm:text-sm">{notif.title}</ItemTitle>
        <ItemDescription className="line-clamp-none text-xs leading-relaxed">{notif.message}</ItemDescription>
        <span className="mt-1 block text-[10px] text-muted-foreground">
          {new Date(notif.createdAt).toLocaleString([], {
            day: "numeric",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      </ItemContent>

      <ItemActions className="shrink-0 self-center">
        {notif.type === "PAYMENT_REPORTED" && (
          isConfirmed ? (
            <Badge className="bg-success/15 font-bold text-success border border-success/30 text-[11px] py-1 px-2.5">
              <HugeiconsIcon icon={Tick02Icon} className="mr-1 size-3.5" />
              Received
            </Badge>
          ) : isDisputed ? (
            <Badge variant="destructive" className="font-bold text-[11px] py-1 px-2.5">
              Declined
            </Badge>
          ) : (
            <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
              <Button size="sm" variant="success" disabled={isBusy} onClick={onConfirm}>
                Yes, Received
              </Button>
              <Button size="sm" variant="destructive" disabled={isBusy} onClick={onDispute}>
                No
              </Button>
            </div>
          )
        )}
        {isUnread && <span className="size-2.5 shrink-0 rounded-full bg-primary" aria-label="Unread" />}
      </ItemActions>
    </Item>
  )
}
