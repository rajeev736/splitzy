"use client"

import * as React from "react"

import { isLiveConfigured } from "@/lib/firebase/config"
import { startPresence } from "@/services/presence"
import { useSession } from "./session-provider"

/** You're "online" (services/presence) while the app is open and you're signed in. */
export function PresenceSync() {
  const { user } = useSession()
  const uid = user?.uid
  React.useEffect(() => {
    if (!isLiveConfigured || !uid) return
    return startPresence(uid)
  }, [uid])
  return null
}
