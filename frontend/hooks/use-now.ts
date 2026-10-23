"use client"

import * as React from "react"

/** Current time (ms), re-rendering every second until `until` has passed. */
export function useNow(until: number) {
  const [now, setNow] = React.useState(() => Date.now())
  React.useEffect(() => {
    if (now >= until) return
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [until, now])
  return now
}

/** 125_000 → "2:05" */
export const formatCountdown = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`
}
