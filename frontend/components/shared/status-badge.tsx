import { cva, type VariantProps } from "class-variance-authority"

import type { SharePaymentStatus } from "@/lib/types"
import { cn } from "@/lib/utils"

/** Status as a coloured dot + label: reads at a glance without a filled pill. */
const statusBadgeVariants = cva("", {
  variants: {
    status: {
      pending: "text-amber-600 dark:text-amber-400",
      payment_reported: "text-sky-600 dark:text-sky-400",
      paid: "text-emerald-600 dark:text-emerald-400",
      failed: "text-red-600 dark:text-red-400",
      you_owe: "text-red-600 dark:text-red-400",
      you_are_owed: "text-emerald-600 dark:text-emerald-400",
      settled: "text-sky-600 dark:text-sky-400",
      reminder: "text-amber-600 dark:text-amber-400",
      friend_request: "text-violet-600 dark:text-violet-400",
      group_invitation: "text-violet-600 dark:text-violet-400",
      new: "text-blue-600 dark:text-blue-400",
      all_settled: "text-emerald-600 dark:text-emerald-400",
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
  return (
    <span
      data-slot="status"
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 text-[11px] font-medium whitespace-nowrap",
        statusBadgeVariants({ status }),
        className
      )}
    >
      <span aria-hidden className="size-1.5 rounded-full bg-current" />
      {children ?? LABELS[status]}
    </span>
  )
}
