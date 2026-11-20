"use client"

import * as React from "react"
import { useRouter } from "next/navigation"

/**
 * The inventory moved to the Games side (/games/inventory). Old links and
 * notifications land there, on the same tab (#frames, #milestones, #characters…).
 */
export default function InventoryRedirect() {
  const router = useRouter()
  React.useEffect(() => {
    router.replace(`/games/inventory${window.location.hash}`)
  }, [router])
  return null
}
