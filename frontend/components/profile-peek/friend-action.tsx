"use client"

import * as React from "react"
import { Tick02Icon, UserAdd01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { toast } from "sonner"

import { useSession } from "@/components/providers/session-provider"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { useAcceptFriendRequest, useSendFriendRequest } from "@/hooks/mutations"
import { useFriendRequests, useFriends } from "@/hooks/queries"
import { useFriendship } from "@/hooks/use-fun"
import { cn } from "@/lib/utils"

export type FriendState =
  | { kind: "self" }
  | { kind: "friend" }
  /** You asked them; waiting. */
  | { kind: "sent"; requestId: string }
  /** They asked you. */
  | { kind: "received"; requestId: string }
  | { kind: "none" }

/** Where you stand with someone: you, friends, a request either way, or nothing yet. */
export function useFriendState(uid: string | undefined): FriendState {
  const { user } = useSession()
  const { data: friends } = useFriends()
  const { data: requests } = useFriendRequests()
  const { friendship } = useFriendship(uid)
  return React.useMemo((): FriendState => {
    if (!uid || !user) return { kind: "none" }
    if (uid === user.uid) return { kind: "self" }
    if (friendship?.status === "ACTIVE" || friends.some((f) => f.uid === uid)) return { kind: "friend" }
    const pending = requests.filter((r) => r.status === "PENDING")
    const sent = pending.find((r) => r.senderId === user.uid && r.receiverId === uid)
    if (sent) return { kind: "sent", requestId: sent.id }
    const received = pending.find((r) => r.senderId === uid && r.receiverId === user.uid)
    if (received) return { kind: "received", requestId: received.id }
    return { kind: "none" }
  }, [uid, user, friends, requests, friendship])
}

/**
 * The friend action for someone who isn't your friend yet: Add friend, Accept
 * (they asked you) or Request sent. Nothing for you or a friend.
 */
export function FriendActionButton({
  state,
  name,
  splitzyId,
  className,
}: {
  state: FriendState
  name: string
  /** Their JoySplit ID: requests go by ID. Add friend waits for it. */
  splitzyId: string | undefined
  className?: string
}) {
  const send = useSendFriendRequest()
  const accept = useAcceptFriendRequest()
  const first = name.split(" ")[0] || "them"

  if (state.kind === "self" || state.kind === "friend") return null
  if (state.kind === "sent")
    return (
      <Button variant="outline" disabled className={cn("w-full", className)}>
        <HugeiconsIcon icon={Tick02Icon} data-icon="inline-start" />
        Request sent
      </Button>
    )
  if (state.kind === "received")
    return (
      <Button
        className={cn("w-full", className)}
        disabled={accept.isPending}
        onClick={() =>
          accept.mutate(state.requestId, { onSuccess: () => toast.success(`You and ${first} are now friends!`) })
        }
      >
        {accept.isPending ? <Spinner data-icon="inline-start" /> : <HugeiconsIcon icon={UserAdd01Icon} data-icon="inline-start" />}
        Accept friend request
      </Button>
    )
  return (
    <Button
      className={cn("w-full", className)}
      disabled={!splitzyId || send.isPending}
      onClick={() => splitzyId && send.mutate(splitzyId)}
    >
      {send.isPending ? <Spinner data-icon="inline-start" /> : <HugeiconsIcon icon={UserAdd01Icon} data-icon="inline-start" />}
      Add friend
    </Button>
  )
}
