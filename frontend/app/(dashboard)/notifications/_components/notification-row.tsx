"use client"

import { Button } from "@/components/ui/button"
import { Item, ItemActions, ItemContent, ItemDescription, ItemMedia, ItemTitle } from "@/components/ui/item"
import type { AppNotification } from "@/lib/types"
import { cn } from "@/lib/utils"
import { NotificationIcon } from "./notification-icon"

/** A notification in the list; payment reports get inline confirm / dispute buttons. */
export function NotificationRow({
  notif,
  onOpen,
  onConfirm,
  onDispute,
  isBusy,
}: {
  notif: AppNotification
  onOpen: () => void
  onConfirm: () => void
  onDispute: () => void
  isBusy: boolean
}) {
  const isUnread = !notif.read

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
          {new Date(notif.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </span>
      </ItemContent>

      <ItemActions className="shrink-0 self-center">
        {notif.type === "PAYMENT_REPORTED" && (
          <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
            <Button size="sm" variant="success" disabled={isBusy} onClick={onConfirm}>
              Yes, Received
            </Button>
            <Button size="sm" variant="destructive" disabled={isBusy} onClick={onDispute}>
              No
            </Button>
          </div>
        )}
        {isUnread && <span className="size-2.5 shrink-0 rounded-full bg-primary" aria-label="Unread" />}
      </ItemActions>
    </Item>
  )
}
