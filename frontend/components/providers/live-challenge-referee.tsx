"use client"

import * as React from "react"

import { useSession } from "@/components/providers/session-provider"
import { useChallenges } from "@/hooks/queries"
import { useRoomNode } from "@/hooks/use-live-room"
import { isLiveConfigured } from "@/lib/firebase/config"
import type { RoomMeta } from "@/lib/live/types"
import type { Challenge } from "@/lib/types"
import { settleOnServer } from "@/services/live-server"

/**
 * Discount games played live (Challenge game "live"): only the server records
 * who won, after replaying the game's moves (app/api/live/settle) — neither
 * side can write it. This watches the room of each such game you're in, on
 * any screen, and asks the server to settle it the moment the room says the
 * game is over (the result screen asks too; whichever comes first). From
 * there the discount works like any other: the friend has 10 minutes to pay.
 */
export function LiveChallengeReferee() {
  const { user } = useSession()
  const { data: challenges } = useChallenges()
  if (!user || !isLiveConfigured) return null
  const mine = challenges.filter((c) => c.game === "live" && c.status === "OPEN" && c.participants.includes(user.uid) && c.roomCode)
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
    void settleOnServer(challenge.roomCode ?? "").catch(() => {
      done.current = false
    })
  }, [user, meta, challenge])
  return null
}
