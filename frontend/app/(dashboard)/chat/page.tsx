"use client"

import * as React from "react"
import { BubbleChatIcon } from "@hugeicons/core-free-icons"

import { useChatList } from "@/components/chat/chat-inbox"
import { ChatListView } from "@/components/chat/chat-list"
import { AppHeader } from "@/components/layout/app-header"
import { PageContainer } from "@/components/layout/app-shell"
import { useSession } from "@/components/providers/session-provider"
import { EmptyState } from "@/components/shared/empty-state"
import { ListSkeleton } from "@/components/shared/query-state"
import { useFriends, useGroups } from "@/hooks/queries"
import { isLiveConfigured } from "@/lib/firebase/config"

export default function ChatListPage() {
  const { user } = useSession()
  const { chats, groupsReady } = useChatList()
  const { data: friends, isSuccess: friendsReady } = useFriends()
  const { data: groups, isSuccess: groupsLoaded } = useGroups()

  // Names for "Aman is typing…" in group rows
  const names = React.useMemo(() => {
    const out: Record<string, string> = {}
    for (const g of groups)
      for (const d of Object.values(g.memberDetails ?? {})) out[d.uid] = d.name
    for (const f of friends) out[f.uid] = f.displayName
    return out
  }, [friends, groups])

  return (
    <>
      <AppHeader title="Chats" subtitle="Your groups and friends" showBack rightAction={<span />} />
      <PageContainer className="max-w-2xl gap-2 pt-4">
        {!isLiveConfigured ? (
          <EmptyState
            title="Chat isn't set up yet"
            description="The Realtime Database URL is missing on this server."
          />
        ) : chats.length === 0 && !(groupsReady && friendsReady && groupsLoaded) ? (
          <ListSkeleton rows={6} />
        ) : chats.length === 0 ? (
          <EmptyState
            icon={BubbleChatIcon}
            title="No one to chat with yet"
            description="Add friends or join a group, and your chats show up here."
          />
        ) : (
          <ChatListView chats={chats} meUid={user?.uid ?? ""} names={names} />
        )}
      </PageContainer>
    </>
  )
}
