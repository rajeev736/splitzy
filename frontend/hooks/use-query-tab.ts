"use client"

import * as React from "react"
import { usePathname, useSearchParams } from "next/navigation"
import { useRouter } from "nextjs-toploader/app"

export interface UseQueryTabOptions<T extends string> {
  param?: string
  defaultValue: T
  validValues?: readonly T[]
}

/**
 * Hook to synchronize tab state with URL query search params.
 * Allows tabs to persist on page reloads, browser navigation, and shared links.
 */
export function useQueryTab<T extends string>({
  param = "tab",
  defaultValue,
  validValues,
}: UseQueryTabOptions<T>): [T, (value: T) => void] {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const rawParam = searchParams.get(param) || (param === "tab" ? searchParams.get("mode") : null)
  const paramTab: T = React.useMemo(() => {
    if (!rawParam) return defaultValue
    if (validValues && !validValues.includes(rawParam as T)) {
      return defaultValue
    }
    return rawParam as T
  }, [rawParam, defaultValue, validValues])

  const [activeTab, setActiveTab] = React.useState<T>(paramTab)

  // Sync state if URL changes via back/forward navigation or external links
  // (adjusted during render when the URL value changes, rather than in an effect)
  const [syncedParamTab, setSyncedParamTab] = React.useState<T>(paramTab)
  if (paramTab !== syncedParamTab) {
    setSyncedParamTab(paramTab)
    setActiveTab(paramTab)
  }

  const setTab = React.useCallback(
    (nextTab: T) => {
      setActiveTab(nextTab)
      const nextParams = new URLSearchParams(searchParams.toString())
      nextParams.set(param, nextTab)
      if (param === "tab" && nextParams.has("mode")) {
        nextParams.delete("mode")
      }
      const qs = nextParams.toString()
      const newUrl = qs ? `${pathname}?${qs}` : pathname
      router.replace(newUrl, { scroll: false })
    },
    [searchParams, pathname, router, param]
  )

  return [activeTab, setTab]
}
