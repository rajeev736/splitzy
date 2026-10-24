import { InformationCircleIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { Alert, AlertDescription } from "@/components/ui/alert"

/** Neutral informational callout used on the pay flow. */
export function InfoCallout({ children }: { children: React.ReactNode }) {
  return (
    <Alert>
      <HugeiconsIcon icon={InformationCircleIcon} className="text-info" />
      <AlertDescription className="text-xs leading-relaxed">{children}</AlertDescription>
    </Alert>
  )
}
