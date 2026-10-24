import { Clock01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { cn } from "@/lib/utils"

/** Shown in place of "Pay" once you've reported a payment the other person hasn't confirmed yet. */
export function AwaitingConfirmationBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 text-[11px] font-medium whitespace-nowrap text-warning",
        className
      )}
    >
      <HugeiconsIcon icon={Clock01Icon} className="size-3.5" />
      Awaiting confirmation
    </span>
  )
}
