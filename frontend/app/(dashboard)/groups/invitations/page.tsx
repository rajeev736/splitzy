"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "nextjs-toploader/app"
import { UserGroupIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { GroupInviteCard } from "../../_components/group-invite-card"
import { AppHeader } from "@/components/layout/app-header"
import { PageContainer } from "@/components/layout/app-shell"
import { UserAvatar } from "@/components/shared/user-avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Item, ItemActions, ItemContent, ItemDescription, ItemGroup, ItemMedia, ItemTitle } from "@/components/ui/item"
import { Spinner } from "@/components/ui/spinner"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useCancelGroupInvite } from "@/hooks/mutations"
import { useGroupInvites, useSentGroupInvites } from "@/hooks/queries"
import { useQueryTab } from "@/hooks/use-query-tab"

type Tab = "received" | "sent"

const TABS: Tab[] = ["received", "sent"]

function GroupInvitationsContent() {
  const router = useRouter()
  const { data: received } = useGroupInvites()
  const { data: sent } = useSentGroupInvites()
  const cancel = useCancelGroupInvite()

  const [activeTab, setActiveTab] = useQueryTab<Tab>({
    defaultValue: "received",
    validValues: TABS,
  })

  return (
    <>
      <AppHeader
        title="Group Invitations"
        showBack
        onBack={() => router.push("/groups")}
      />

      <PageContainer className="max-w-4xl gap-5">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as Tab)} className="gap-4">
          <TabsList className="h-11 w-full">
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
              <Card>
                <CardContent className="py-12">
                  <Empty>
                    <EmptyMedia variant="icon">
                      <HugeiconsIcon icon={UserGroupIcon} className="size-8 text-muted-foreground" />
                    </EmptyMedia>
                    <EmptyHeader>
                      <EmptyTitle>No pending group invitations</EmptyTitle>
                      <EmptyDescription>
                        When someone invites you to join their group, the invitation will show up here.
                      </EmptyDescription>
                    </EmptyHeader>
                  </Empty>
                </CardContent>
              </Card>
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
              <Card>
                <CardContent className="py-12">
                  <Empty>
                    <EmptyMedia variant="icon">
                      <HugeiconsIcon icon={UserGroupIcon} className="size-8 text-muted-foreground" />
                    </EmptyMedia>
                    <EmptyHeader>
                      <EmptyTitle>No outgoing group invitations</EmptyTitle>
                      <EmptyDescription>
                        Invitations you send to friends or members to join your groups will show up here.
                      </EmptyDescription>
                    </EmptyHeader>
                  </Empty>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </PageContainer>
    </>
  )
}

export default function GroupInvitationsPage() {
  return (
    <React.Suspense
      fallback={
        <div className="flex min-h-svh items-center justify-center">
          <Spinner className="size-8 text-primary" />
        </div>
      }
    >
      <GroupInvitationsContent />
    </React.Suspense>
  )
}
