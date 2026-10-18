"use client"

import * as React from "react"
import Link from "next/link"

import { GroupInviteCard } from "../../_components/group-invite-card"
import { UserAvatar } from "@/components/shared/user-avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Item, ItemActions, ItemContent, ItemDescription, ItemGroup, ItemMedia, ItemTitle } from "@/components/ui/item"
import { Spinner } from "@/components/ui/spinner"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useCancelGroupInvite } from "@/hooks/mutations"
import { useGroupInvites, useSentGroupInvites } from "@/hooks/queries"

type Tab = "received" | "sent"

function EmptyListCard({ children }: { children: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="py-4 text-center text-xs text-muted-foreground">{children}</CardContent>
    </Card>
  )
}

/** Pending group invitations: ones you received (accept / decline) and ones you sent (cancel). */
export function GroupInvitations() {
  const { data: received } = useGroupInvites()
  const { data: sent } = useSentGroupInvites()
  const cancel = useCancelGroupInvite()
  const [tab, setTab] = React.useState<Tab>("received")

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-base font-bold tracking-tight">Group Invitations</h2>
      <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)} className="gap-3">
        <TabsList className="h-10! w-full">
          <TabsTrigger value="received" className="text-xs font-bold">
            Received ({received.length})
          </TabsTrigger>
          <TabsTrigger value="sent" className="text-xs font-bold">
            Sent ({sent.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="received">
          {received.length > 0 ? (
            <ItemGroup className="gap-3">
              {received.map((group) => (
                <GroupInviteCard key={group.id} group={group} className="rounded-3xl p-4" />
              ))}
            </ItemGroup>
          ) : (
            <EmptyListCard>No pending group invitations.</EmptyListCard>
          )}
        </TabsContent>

        <TabsContent value="sent">
          {sent.length > 0 ? (
            <ItemGroup className="gap-3">
              {sent.map(({ group, invite }) => {
                const busy =
                  cancel.isPending &&
                  cancel.variables?.groupId === group.id &&
                  cancel.variables?.targetUid === invite.uid
                return (
                  <Item key={`${group.id}_${invite.uid}`} variant="outline" className="flex-nowrap bg-card p-4">
                    <ItemMedia>
                      <UserAvatar src={invite.photoURL} name={invite.name} size="md" />
                    </ItemMedia>
                    <ItemContent className="min-w-0 gap-0.5">
                      <ItemTitle className="font-bold">{invite.name}</ItemTitle>
                      <ItemDescription className="truncate text-xs">
                        to{" "}
                        <Link href={`/groups/${group.id}`} className="font-semibold text-primary hover:underline">
                          {group.name}
                        </Link>
                        {invite.splitzyId && <span className="font-mono"> · {invite.splitzyId}</span>}
                      </ItemDescription>
                      <span className="text-[11px] font-semibold text-warning">Pending Response</span>
                    </ItemContent>
                    <ItemActions>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busy}
                        onClick={() => cancel.mutate({ groupId: group.id, targetUid: invite.uid })}
                      >
                        {busy && <Spinner />}
                        Cancel
                      </Button>
                    </ItemActions>
                  </Item>
                )
              })}
            </ItemGroup>
          ) : (
            <EmptyListCard>No outgoing group invitations.</EmptyListCard>
          )}
        </TabsContent>
      </Tabs>
    </section>
  )
}
