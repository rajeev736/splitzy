import { InformationCircleIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { Alert, AlertDescription } from "@/components/ui/alert"

/** Blue informational callout used on the pay flow. */
export function InfoCallout({ children }: { children: React.ReactNode }) {
  return (
    <Alert className="rounded-2xl border-info/30 bg-info/10 p-4 text-info">
      <HugeiconsIcon icon={InformationCircleIcon} className="size-5!" />
      <AlertDescription className="text-xs leading-relaxed text-info">{children}</AlertDescription>
    </Alert>
  )
}
