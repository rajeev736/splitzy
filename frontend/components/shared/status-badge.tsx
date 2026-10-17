import { cva, type VariantProps } from "class-variance-authority"

import { Badge } from "@/components/ui/badge"
import type { SharePaymentStatus } from "@/lib/types"
import { cn } from "@/lib/utils"

/** JoySplit design-system status badges (section 6 of the design poster). */
const statusBadgeVariants = cva("border-transparent font-semibold", {
  variants: {
    status: {
      pending: "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300",
      payment_reported: "bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300",
      paid: "bg-green-100 text-green-700 dark:bg-green-950/60 dark:text-green-300",
      failed: "bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300",
      you_owe: "bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300",
      you_are_owed: "bg-green-100 text-green-700 dark:bg-green-950/60 dark:text-green-300",
      settled: "bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300",
      reminder: "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300",
      friend_request: "bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300",
      group_invitation: "bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300",
      new: "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300",
      all_settled: "bg-green-100 text-green-700 dark:bg-green-950/60 dark:text-green-300",
    },
  },
  defaultVariants: { status: "pending" },
})

export type BadgeStatus = NonNullable<VariantProps<typeof statusBadgeVariants>["status"]>

const LABELS: Record<BadgeStatus, string> = {
  pending: "Pending",
  payment_reported: "Payment Reported",
  paid: "Paid",
  failed: "Failed",
  you_owe: "You Owe",
  you_are_owed: "You Are Owed",
  settled: "Settled",
  reminder: "Reminder",
  friend_request: "Friend Request",
  group_invitation: "Group Invitation",
  new: "New",
  all_settled: "All Settled",
}

/** Maps a share payment status onto its badge. */
export const SHARE_STATUS_BADGE: Record<SharePaymentStatus, BadgeStatus> = {
  PENDING: "pending",
  PAYMENT_REPORTED: "payment_reported",
  PAID: "paid",
  DISPUTED: "failed",
}

export function StatusBadge({
  status = "pending",
  children,
  className,
}: {
  status?: BadgeStatus
  children?: React.ReactNode
  className?: string
}) {
  return <Badge className={cn(statusBadgeVariants({ status }), className)}>{children ?? LABELS[status]}</Badge>
}
