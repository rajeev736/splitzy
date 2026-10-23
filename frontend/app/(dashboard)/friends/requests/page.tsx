"use client"

import * as React from "react"
import Link from "next/link"
import { UserAdd01Icon, UserGroupIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { toast } from "sonner"

import { AppHeader } from "@/components/layout/app-header"
import { PageContainer } from "@/components/layout/app-shell"
import { useSession } from "@/components/providers/session-provider"
import { ButtonLink } from "@/components/shared/button-link"
import { ListSkeleton, QueryError } from "@/components/shared/query-state"
import { UserAvatar } from "@/components/shared/user-avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Item, ItemActions, ItemContent, ItemDescription, ItemGroup, ItemMedia, ItemTitle } from "@/components/ui/item"
import { Spinner } from "@/components/ui/spinner"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAcceptFriendRequest, useCancelFriendRequest, useRejectFriendRequest, useSendFriendRequest } from "@/hooks/mutations"
import { useFriendRequests, useFriendSuggestions, useGroupInvites } from "@/hooks/queries"
import { useQueryTab } from "@/hooks/use-query-tab"

type Tab = "received" | "sent"

const TABS: Tab[] = ["received", "sent"]

function EmptyListCard({ children }: { children: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="py-4 text-center text-xs text-muted-foreground">{children}</CardContent>
    </Card>
  )
}

function FriendRequestsContent() {
  const { user } = useSession()
  const requestsQuery = useFriendRequests()
  const suggestions = useFriendSuggestions()
  const { data: groupInvites } = useGroupInvites()
  const acceptRequest = useAcceptFriendRequest()
  const rejectRequest = useRejectFriendRequest({ successMessage: "Friend request rejected" })
  const cancelRequest = useCancelFriendRequest()
  const sendRequest = useSendFriendRequest()

  const [activeTab, setActiveTab] = useQueryTab<Tab>({
    defaultValue: "received",
    validValues: TABS,
  })

  const myUid = user?.uid
  const receivedRequests = React.useMemo(() => {
    if (!myUid) return []
    const seen = new Set<string>()
    return requestsQuery.data
      .filter((r) => r.status === "PENDING" && r.receiverId === myUid)
      .filter((r) => {
        const key = r.senderId || r.senderSplitzyId?.toUpperCase() || r.id
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })
  }, [requestsQuery.data, myUid])

  const sentRequests = React.useMemo(() => {
    if (!myUid) return []
    const seen = new Set<string>()
    return requestsQuery.data
      .filter((r) => r.status === "PENDING" && r.senderId === myUid)
      .filter((r) => {
        const key = r.receiverId || r.receiverSplitzyId?.toUpperCase() || r.id
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })
  }, [requestsQuery.data, myUid])

  const mutualSuggestions = suggestions.data ?? []

  const handleAccept = (id: string, name: string) =>
    acceptRequest.mutate(id, { onSuccess: () => toast.success(`You and ${name} are now friends!`) })

  const handleReject = (id: string) => rejectRequest.mutate(id)

  const handleSendRequest = (splitzyId: string) =>
    sendRequest.mutate(splitzyId, { onSuccess: () => void suggestions.refetch() })

  const isRowPending = (id: string) =>
    (acceptRequest.isPending && acceptRequest.variables === id) ||
    (rejectRequest.isPending && rejectRequest.variables === id) ||
    (cancelRequest.isPending && cancelRequest.variables === id)

  const renderLists = () => {
    if (requestsQuery.isPending) return <ListSkeleton rows={2} />
    if (requestsQuery.isError) return <QueryError error={requestsQuery.error} onRetry={requestsQuery.refetch} />
    return (
      <>
        <TabsContent value="received">
          {receivedRequests.length > 0 ? (
            <ItemGroup className="gap-3">
              {receivedRequests.map((req) => (
                <Item key={req.id} variant="outline" className="flex-col items-stretch bg-card p-4 sm:flex-row sm:items-center">
                  <div className="flex flex-1 items-center gap-3">
                    <ItemMedia>
                      <UserAvatar src={req.senderPhoto} name={req.senderName} size="md" />
                    </ItemMedia>
                    <ItemContent>
                      <ItemTitle className="font-bold">{req.senderName}</ItemTitle>
                      <ItemDescription className="font-mono text-xs">{req.senderSplitzyId}</ItemDescription>
                      {req.groupId && groupInvites.some((g) => g.id === req.groupId) && (
                        <Link href={`/groups/${req.groupId}`} className="text-[11px] font-medium text-primary hover:underline">
                          Also invited you to &quot;{req.groupName || "a group"}&quot; — accept it separately
                        </Link>
                      )}
                    </ItemContent>
                  </div>
                  <ItemActions className="pt-2 sm:pt-0">
                    <Button
                      size="sm"
                      className="flex-1 sm:flex-none"
                      disabled={isRowPending(req.id)}
                      onClick={() => handleAccept(req.id, req.senderName)}
                    >
                      Accept
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="flex-1 sm:flex-none"
                      disabled={isRowPending(req.id)}
                      onClick={() => handleReject(req.id)}
                    >
                      Reject
                    </Button>
                  </ItemActions>
                </Item>
              ))}
            </ItemGroup>
          ) : (
            <EmptyListCard>No pending received requests.</EmptyListCard>
          )}
        </TabsContent>

        <TabsContent value="sent">
          {sentRequests.length > 0 ? (
            <ItemGroup className="gap-3">
              {sentRequests.map((req) => (
                <Item key={req.id} variant="outline" className="bg-card p-4">
                  <ItemMedia>
                    <UserAvatar name={req.receiverName} size="md" />
                  </ItemMedia>
                  <ItemContent className="gap-0.5">
                    <ItemTitle className="font-bold">{req.receiverName}</ItemTitle>
                    <ItemDescription className="font-mono text-xs">{req.receiverSplitzyId}</ItemDescription>
                    <span className="text-[11px] font-semibold text-warning">Pending Response</span>
                  </ItemContent>
                  <ItemActions>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={isRowPending(req.id)}
                      onClick={() => cancelRequest.mutate(req.id)}
                    >
                      Cancel
                    </Button>
                  </ItemActions>
                </Item>
              ))}
            </ItemGroup>
          ) : (
            <EmptyListCard>No outgoing requests.</EmptyListCard>
          )}
        </TabsContent>
      </>
    )
  }

  return (
    <>
      <AppHeader
        title="Friend Requests"
        showBack
        rightAction={
          <ButtonLink href="/friends/add" variant="secondary" size="icon" className="rounded-full" aria-label="Add Friend">
            <HugeiconsIcon icon={UserAdd01Icon} className="size-5" strokeWidth={2.2} />
          </ButtonLink>
        }
      />

      <PageContainer className="max-w-xl">
        {/* Received / Sent */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as Tab)} className="gap-4">
          <TabsList className="h-10! w-full">
            <TabsTrigger value="received" className="text-xs font-bold">
              Received ({receivedRequests.length})
            </TabsTrigger>
            <TabsTrigger value="sent" className="text-xs font-bold">
              Sent ({sentRequests.length})
            </TabsTrigger>
          </TabsList>
          {renderLists()}
        </Tabs>

        {/* People you may know (mutual friends) */}
        <section className="flex flex-col gap-3 pt-2">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold tracking-tight">People you may know</h2>
            {mutualSuggestions.length > 0 && (
              <span className="text-xs font-bold text-primary">{mutualSuggestions.length} suggested</span>
            )}
          </div>

          {suggestions.isPending ? (
            <div className="flex items-center justify-center gap-2 py-6 text-xs text-muted-foreground">
              <Spinner />
              Finding mutual connections...
            </div>
          ) : mutualSuggestions.length === 0 ? (
            <Empty className="border border-dashed bg-card p-6">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <HugeiconsIcon icon={UserGroupIcon} />
                </EmptyMedia>
                <EmptyTitle className="text-xs font-medium">No mutual friends to suggest yet.</EmptyTitle>
                <EmptyDescription className="text-[11px]">
                  When you and your friends share mutual connections, they will appear here.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <ItemGroup className="gap-2.5">
              {mutualSuggestions.map(({ user: su, mutualCount, mutualFriendNames }) => {
                const isAdding = sendRequest.isPending && sendRequest.variables === su.splitzyId
                return (
                  <Item key={su.uid} variant="outline" size="sm" className="bg-card">
                    <ItemMedia>
                      <UserAvatar src={su.photoURL} name={su.displayName} size="sm" />
                    </ItemMedia>
                    <ItemContent className="gap-0">
                      <ItemTitle className="text-xs font-bold">{su.displayName}</ItemTitle>
                      <span className="font-mono text-[11px] text-muted-foreground">{su.splitzyId}</span>
                      <span className="text-[10px] font-medium text-primary">
                        {mutualCount} mutual friend{mutualCount > 1 ? "s" : ""}
                        {mutualFriendNames.length > 0 && ` (${mutualFriendNames.slice(0, 2).join(", ")})`}
                      </span>
                    </ItemContent>
                    <ItemActions>
                      <Button
                        size="sm"
                        variant="secondary"
                        className="px-4"
                        disabled={isAdding}
                        onClick={() => handleSendRequest(su.splitzyId)}
                      >
                        {isAdding && <Spinner />}
                        Add
                      </Button>
                    </ItemActions>
                  </Item>
                )
              })}
            </ItemGroup>
          )}
        </section>
      </PageContainer>
    </>
  )
}

export default function FriendRequestsPage() {
  return (
    <React.Suspense
      fallback={
        <div className="flex min-h-svh items-center justify-center">
          <Spinner className="size-8 text-primary" />
        </div>
      }
    >
      <FriendRequestsContent />
    </React.Suspense>
  )
}
