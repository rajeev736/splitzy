"use client"

import Link from "next/link"
import { BubbleChatIcon } from "@hugeicons/core-free-icons"

import { AppHeader } from "@/components/layout/app-header"
import { PageContainer } from "@/components/layout/app-shell"
import { useSession } from "@/components/providers/session-provider"
import { EmptyState } from "@/components/shared/empty-state"
import { GroupIcon } from "@/components/shared/group-icon"
import { ListSkeleton } from "@/components/shared/query-state"
import { UserAvatar } from "@/components/shared/user-avatar"
import { useNow } from "@/hooks/use-now"
import { useChatList, type ChatSummary } from "@/hooks/use-chat"
import { dayLabel, timeLabel } from "@/lib/chat"
import { isLiveConfigured } from "@/lib/firebase/config"
import { cn } from "@/lib/utils"

export default function ChatListPage() {
  const { chats, groupsReady } = useChatList()

  return (
    <>
      <AppHeader title="Messages" subtitle="Your groups and friends" showBack />
      <PageContainer className="max-w-2xl gap-2">
        {!isLiveConfigured ? (
          <EmptyState
            title="Chat isn't set up yet"
            description="The Realtime Database URL is missing on this server."
          />
        ) : chats.length === 0 && !groupsReady ? (
          <ListSkeleton rows={5} />
        ) : chats.length === 0 ? (
          <EmptyState
            icon={BubbleChatIcon}
            title="No one to chat with yet"
            description="Add friends or join a group, and your chats show up here."
          />
        ) : (
          <ul className="flex flex-col">
            {chats.map((c) => (
              <li key={c.chatId}>
                <ChatRow chat={c} />
              </li>
            ))}
          </ul>
        )}
      </PageContainer>
    </>
  )
}

function ChatRow({ chat }: { chat: ChatSummary }) {
  const { user } = useSession()
  const now = useNow(0)
  const info = chat.info
  const when = info
    ? dayLabel(info.lastAt, Math.max(now, info.lastAt)) === "Today"
      ? timeLabel(info.lastAt)
      : dayLabel(info.lastAt, Math.max(now, info.lastAt))
    : ""
  const preview = info
    ? info.lastBy === user?.uid
      ? `You: ${info.lastText}`
      : chat.kind === "group"
        ? `${info.lastName.split(" ")[0]}: ${info.lastText}`
        : info.lastText
    : chat.kind === "group"
      ? "Group chat"
      : "Say hi 👋"

  return (
    <Link
      href={`/chat/${chat.chatId}`}
      className="flex items-center gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-subtle-hover active:bg-subtle-pressed"
    >
      {chat.kind === "group" ? (
        <GroupIcon
          src={chat.groupIcon}
          alt={chat.title}
          size="sm"
          className="size-11 rounded-full"
        />
      ) : (
        <UserAvatar
          uid={chat.targetId}
          src={chat.photo}
          name={chat.title}
          size="md"
          className="size-11"
        />
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <span
            className={cn(
              "truncate text-sm",
              chat.unread ? "font-semibold" : "font-medium"
            )}
          >
            {chat.title}
          </span>
          {when && (
            <span
              className={cn(
                "shrink-0 text-[11px]",
                chat.unread
                  ? "font-semibold text-primary"
                  : "text-muted-foreground"
              )}
            >
              {when}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <p
            className={cn(
              "min-w-0 flex-1 truncate text-xs",
              chat.unread ? "text-foreground" : "text-muted-foreground"
            )}
          >
            {preview}
          </p>
          {chat.unread && (
            <span
              className="size-2.5 shrink-0 rounded-full bg-primary"
              aria-label="Unread"
            />
          )}
        </div>
      </div>
    </Link>
  )
}
