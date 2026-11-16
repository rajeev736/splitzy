"use client"

import * as React from "react"
import { useRouter } from "next/navigation"

/**
 * Frames moved into the inventory. Old links (and "frame unlocked"
 * notifications already sent, with #milestones) land on its Frames tab.
 */
export default function FramesPage() {
  const router = useRouter()
  React.useEffect(() => {
    router.replace(`/profile/inventory${window.location.hash === "#milestones" ? "#milestones" : "#frames"}`)
  }, [router])
  return null
}
