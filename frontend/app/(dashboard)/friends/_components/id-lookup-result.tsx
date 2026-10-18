"use client"

import { AlertCircleIcon, Tick02Icon, UserAdd01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { toast } from "sonner"

import { UserAvatar } from "@/components/shared/user-avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Item, ItemActions, ItemContent, ItemDescription, ItemMedia, ItemTitle } from "@/components/ui/item"
import { Spinner } from "@/components/ui/spinner"
import { useAcceptFriendRequest, useSendFriendRequest } from "@/hooks/mutations"
import { useUserSearch } from "@/hooks/queries"

/** JoySplit IDs look like JOY-7K9M2Q (older accounts: SPL-…). */
export const JOYSPLIT_ID_PATTERN = /^(JOY|SPL)-[A-Z0-9]{6}$/i

/**
 * Result of looking up a JoySplit ID from the friends search: anyone who isn't
 * a friend yet is shown with the right action (add / accept / already sent).
 */
export function IdLookupResult({ splitzyId }: { splitzyId: string }) {
  const search = useUserSearch(splitzyId)
  const sendRequest = useSendFriendRequest()
  const acceptRequest = useAcceptFriendRequest()
  const result = search.data

  if (search.isFetching && !result) {
    return (
      <div className="flex items-center gap-2 rounded-2xl border bg-card p-4 text-xs text-muted-foreground">
        <Spinner />
        Looking up {splitzyId}...
      </div>
    )
  }
  if (!result) return null

  if (!result.found || !result.user) {
    return (
      <div className="flex items-center gap-2 rounded-2xl border bg-card p-4 text-xs text-warning">
        <HugeiconsIcon icon={AlertCircleIcon} className="size-4 shrink-0" />
        {result.message || "No user found with that JoySplit ID."}
      </div>
    )
  }

  const u = result.user
  const isSending = sendRequest.isPending
  const isAccepting = acceptRequest.isPending

  return (
    <Item variant="outline" className="flex-nowrap bg-card p-4">
      <ItemMedia>
        <UserAvatar src={u.photoURL} name={u.displayName || "User"} size="md" />
      </ItemMedia>
      <ItemContent className="min-w-0 gap-0.5">
        <ItemTitle className="font-bold">{u.displayName}</ItemTitle>
        <ItemDescription className="font-mono text-xs">{u.splitzyId}</ItemDescription>
      </ItemContent>
      <ItemActions>
        {result.status === "CAN_ADD" ? (
          <Button size="sm" disabled={isSending} onClick={() => u.splitzyId && sendRequest.mutate(u.splitzyId)}>
            {isSending ? <Spinner /> : <HugeiconsIcon icon={UserAdd01Icon} data-icon="inline-start" />}
            Add Friend
          </Button>
        ) : result.status === "REQUEST_SENT" ? (
          <Badge className="bg-primary/10 font-bold text-primary">Request Sent</Badge>
        ) : result.status === "REQUEST_RECEIVED" && result.requestId ? (
          <Button
            size="sm"
            disabled={isAccepting}
            onClick={() =>
              acceptRequest.mutate(result.requestId!, {
                onSuccess: () => toast.success(`You and ${u.displayName} are now friends!`),
              })
            }
          >
            {isAccepting && <Spinner />}
            Accept Request
          </Button>
        ) : result.status === "FRIENDS" ? (
          <Badge className="bg-success/10 font-bold text-success">
            <HugeiconsIcon icon={Tick02Icon} data-icon="inline-start" />
            Friends
          </Badge>
        ) : (
          <Badge variant="secondary" className="font-bold">
            You
          </Badge>
        )}
      </ItemActions>
    </Item>
  )
}
