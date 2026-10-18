"use client"

import { Fragment } from "react"

import { useSession } from "@/components/providers/session-provider"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ItemGroup, ItemSeparator } from "@/components/ui/item"
import { Spinner } from "@/components/ui/spinner"
import { useCancelGroupInvite } from "@/hooks/mutations"
import { useFriends } from "@/hooks/queries"
import type { Group } from "@/lib/types"
import { cn } from "@/lib/utils"
import { MemberRow } from "./member-row"

/**
 * People invited to the group who haven't accepted yet. They move to the
 * member list automatically once they accept.
 */
export function PendingInvites({ group, className }: { group: Group; className?: string }) {
  const { user } = useSession()
  const { data: friends } = useFriends()
  const cancel = useCancelGroupInvite()
  const invited = group.invitedMembers ?? []

  if (invited.length === 0) return null

  return (
    <div className={cn("flex flex-col gap-3 border-t pt-4", className)}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
          Invited — pending ({invited.length})
        </span>
        <span className="text-[11px] text-muted-foreground">Join once they accept</span>
      </div>

      <ItemGroup className="gap-0 rounded-xl border bg-muted/40 px-3">
        {invited.map((uid, i) => {
          const info = group.invitedMemberDetails?.[uid]
          const fr = friends.find((f) => f.uid === uid)
          const busy = cancel.isPending && cancel.variables?.targetUid === uid
          return (
            <Fragment key={uid}>
              {i > 0 && <ItemSeparator className="my-0" />}
              <MemberRow
                name={info?.name || fr?.displayName || "Invited user"}
                photoURL={info?.photoURL || fr?.photoURL}
                splitzyId={
                  info?.invitedByName
                    ? `${info.splitzyId || fr?.splitzyId || ""} · invited by ${
                        info.invitedBy === user?.uid ? "you" : info.invitedByName
                      }`
                    : info?.splitzyId || fr?.splitzyId || uid
                }
                size="sm"
                actions={
                  <>
                    <Badge className="bg-warning/10 font-semibold text-warning">Invite sent</Badge>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-muted-foreground"
                      disabled={busy}
                      onClick={() => cancel.mutate({ groupId: group.id, targetUid: uid })}
                    >
                      {busy && <Spinner />}
                      Cancel
                    </Button>
                  </>
                }
              />
            </Fragment>
          )
        })}
      </ItemGroup>
    </div>
  )
}
