import { CreditCardIcon, UserAdd01Icon, UserGroupIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import type { NotificationType } from "@/lib/types"
import { cn } from "@/lib/utils"

/** Category of a notification, matching the filter tabs. */
export function notificationCategory(type: NotificationType) {
  if (type.includes("PAYMENT")) return "payments" as const
  if (type.includes("FRIEND")) return "friends" as const
  return "groups" as const
}

const VISUALS = {
  payments: { icon: CreditCardIcon, tone: "bg-success/10 text-success" },
  friends: { icon: UserAdd01Icon, tone: "bg-info/10 text-info" },
  groups: { icon: UserGroupIcon, tone: "bg-secondary text-primary" },
} as const

/** Round category icon for a notification (payment / friend / group). */
export function NotificationIcon({
  type,
  size = "md",
  neutral = false,
  className,
}: {
  type: NotificationType
  size?: "md" | "lg"
  /** Use the neutral brand tone instead of the per-category tone. */
  neutral?: boolean
  className?: string
}) {
  const visual = VISUALS[notificationCategory(type)]
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full",
        size === "lg" ? "size-16 shadow-xs" : "size-10",
        neutral ? "bg-secondary text-primary" : visual.tone,
        className
      )}
    >
      <HugeiconsIcon icon={visual.icon} className={size === "lg" ? "size-8" : "size-5"} />
    </div>
  )
}
