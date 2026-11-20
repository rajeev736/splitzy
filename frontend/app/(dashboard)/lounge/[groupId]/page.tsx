"use client"

import { useParams } from "next/navigation"

import { LoungeShell } from "@/components/live/lounge"

/** /lounge/{groupId} — the group's always-open game room (components/live/lounge). */
export default function LoungePage() {
  const { groupId } = useParams<{ groupId: string }>()
  return <LoungeShell groupId={groupId} />
}
