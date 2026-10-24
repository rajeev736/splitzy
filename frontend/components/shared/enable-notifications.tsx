"use client"

import * as React from "react"
import { Notification01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { enableSystemNotifications, systemNotificationPermission } from "@/lib/system-notifications"
import { cn } from "@/lib/utils"

const DISMISSED_KEY = "joysplit_notifications_prompt_dismissed"
const noopSubscribe = () => () => {}

/** Browser permission for notification-bar alerts ("unsupported" during SSR / old browsers). */
function useNotificationPermission() {
  const initial = React.useSyncExternalStore(noopSubscribe, systemNotificationPermission, () => "unsupported" as const)
  const [asked, setAsked] = React.useState<NotificationPermission | null>(null)
  const permission = asked ?? initial

  const enable = async () => {
    const granted = await enableSystemNotifications()
    setAsked(systemNotificationPermission() as NotificationPermission)
    if (granted) toast.success("Notifications on — you'll see JoySplit alerts in your notification bar")
    else toast.info("Notifications are blocked. You can allow them from your browser's site settings.")
  }
  return { permission, enable }
}

/**
 * Home: a one-line nudge to turn on notification-bar alerts, until they're on
 * or dismissed.
 */
export function EnableNotificationsBanner({ className }: { className?: string }) {
  const { permission, enable } = useNotificationPermission()
  const dismissedInitially = React.useSyncExternalStore(
    noopSubscribe,
    () => {
      try {
        return localStorage.getItem(DISMISSED_KEY) === "1"
      } catch {
        return false
      }
    },
    () => true
  )
  const [dismissed, setDismissed] = React.useState(false)
  if (permission !== "default" || dismissed || dismissedInitially) return null

  return (
    <div className={cn("flex items-center gap-3 rounded-2xl border bg-card px-4 py-3", className)}>
      <HugeiconsIcon icon={Notification01Icon} className="size-5 shrink-0 text-primary" />
      <p className="min-w-0 flex-1 text-xs text-muted-foreground">
        Get payment and game alerts in your notification bar.
      </p>
      <Button
        size="sm"
        variant="ghost"
        className="h-8 px-2 text-xs"
        onClick={() => {
          setDismissed(true)
          try {
            localStorage.setItem(DISMISSED_KEY, "1")
          } catch {
            /* storage unavailable */
          }
        }}
      >
        Not now
      </Button>
      <Button size="sm" className="h-8 px-3 text-xs" onClick={enable}>
        Turn on
      </Button>
    </div>
  )
}

/** Settings: current status and the button to turn alerts on. */
export function NotificationSettings() {
  const { permission, enable } = useNotificationPermission()
  return (
    <div className="flex items-center justify-between gap-3">
      <p className="text-xs text-muted-foreground">
        {permission === "granted"
          ? "On. New payments, reminders and games show in your notification bar."
          : permission === "denied"
            ? "Blocked. Allow notifications for this site in your browser settings."
            : permission === "unsupported"
              ? "This browser doesn't support notifications. Install the app to get them."
              : "Off. Turn on to get alerts in your notification bar."}
      </p>
      {permission === "default" && (
        <Button size="sm" className="shrink-0" onClick={enable}>
          Turn on
        </Button>
      )}
    </div>
  )
}
