import { Clock01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

/** Shown in place of "Pay" once you've reported a payment the other person hasn't confirmed yet. */
export function AwaitingConfirmationBadge({ className }: { className?: string }) {
  return (
    <Badge
      className={cn(
        "gap-1 border border-warning/30 bg-warning/10 px-2.5 py-1 text-[11px] font-bold whitespace-nowrap text-warning",
        className
      )}
    >
      <HugeiconsIcon icon={Clock01Icon} className="size-3.5" />
      Waiting for confirmation
    </Badge>
  )
}
