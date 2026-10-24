import { CreditCardIcon, GameController03Icon, UserAdd01Icon, UserGroupIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import type { NotificationType } from "@/lib/types"
import { cn } from "@/lib/utils"

/** Category of a notification, matching the filter tabs. */
export function notificationCategory(type: NotificationType) {
  if (type.includes("PAYMENT") || type.includes("EXPENSE") || type.includes("CHALLENGE")) return "payments" as const
  if (type.includes("FRIEND")) return "friends" as const
  return "groups" as const
}

const VISUALS = {
  payments: { icon: CreditCardIcon, tone: "text-success" },
  friends: { icon: UserAdd01Icon, tone: "text-info" },
  groups: { icon: UserGroupIcon, tone: "text-muted-foreground" },
} as const

/** Tinted category icon tile for a notification (payment / friend / group). */
export function NotificationIcon({
  type,
  size = "md",
  neutral = false,
  className,
}: {
  type: NotificationType
  size?: "md" | "lg"
  /** Use the neutral tone instead of the per-category tone. */
  neutral?: boolean
  className?: string
}) {
  const visual = type.includes("CHALLENGE")
    ? { icon: GameController03Icon, tone: "text-warning" }
    : VISUALS[notificationCategory(type)]
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-md",
        size === "lg" ? "size-14" : "size-9",
        neutral ? "bg-muted text-muted-foreground" : cn(visual.tone, "bg-current/10"),
        className
      )}
    >
      <HugeiconsIcon icon={visual.icon} className={size === "lg" ? "size-7" : "size-4.5"} />
    </div>
  )
}
