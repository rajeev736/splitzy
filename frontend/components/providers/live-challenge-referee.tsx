"use client"

import * as React from "react"

import { useSession } from "@/components/providers/session-provider"
import { useChallenges } from "@/hooks/queries"
import { useRoomNode } from "@/hooks/use-live-room"
import { isLiveConfigured } from "@/lib/firebase/config"
import type { RoomMeta } from "@/lib/live/types"
import type { Challenge } from "@/lib/types"
import { recordLiveResult } from "@/services/challenges"

/**
 * Discount games played live (Challenge game "live"): the host — the one being
 * paid — is the only one allowed to record who won (firestore.rules). This
 * watches the room of each such game the host has open, on any screen, and
 * records the result the moment the room says the game is over. From there
 * the discount works like any other: the friend has 10 minutes to pay.
 */
export function LiveChallengeReferee() {
  const { user } = useSession()
  const { data: challenges } = useChallenges()
  if (!user || !isLiveConfigured) return null
  const mine = challenges.filter((c) => c.game === "live" && c.status === "OPEN" && c.hostId === user.uid && c.roomCode)
  return (
    <>
      {mine.map((c) => (
        <RoomWatch key={c.id} challenge={c} />
      ))}
    </>
  )
}

function RoomWatch({ challenge }: { challenge: Challenge }) {
  const { user } = useSession()
  const { data: meta } = useRoomNode<RoomMeta>(challenge.roomCode ?? null, "meta")
  const done = React.useRef(false)
  React.useEffect(() => {
    if (!user || done.current || !meta || meta.status !== "ended" || meta.challengeId !== challenge.id) return
    done.current = true
    // RTDB drops an empty winnerIds list: no winners means nobody beat the host
    void recordLiveResult(user, challenge, meta.result?.winnerIds ?? []).catch(() => {
      done.current = false
    })
  }, [user, meta, challenge])
  return null
}
