"use client"

import * as React from "react"
import { toast } from "sonner"

/**
 * Copies text and flips `copied` for `resetMs`. Shows a success toast when
 * `successMessage` is given and an error toast if the clipboard is blocked.
 */
export function useCopyToClipboard(resetMs = 2000) {
  const [copied, setCopied] = React.useState(false)
  const timer = React.useRef<ReturnType<typeof setTimeout>>(undefined)

  React.useEffect(() => () => clearTimeout(timer.current), [])

  const copy = React.useCallback(
    async (text: string, successMessage?: string) => {
      try {
        await navigator.clipboard.writeText(text)
        setCopied(true)
        if (successMessage) toast.success(successMessage)
        clearTimeout(timer.current)
        timer.current = setTimeout(() => setCopied(false), resetMs)
        return true
      } catch {
        toast.error("Couldn't copy to clipboard")
        return false
      }
    },
    [resetMs]
  )

  return { copied, copy }
}
