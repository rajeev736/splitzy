"use client"

import * as React from "react"
import Link from "next/link"
import {
  BubbleChatIcon,
  Cancel01Icon,
  Image01Icon,
  Search01Icon,
  UnavailableIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import type { ChatSummary } from "@/components/chat/chat-inbox"
import { typingLabel } from "@/components/chat/chat-header"
import { MessageTicks } from "@/components/chat/message-ticks"
import { EmptyState } from "@/components/shared/empty-state"
import { GroupIcon } from "@/components/shared/group-icon"
import { UserAvatar } from "@/components/shared/user-avatar"
import { useNow } from "@/hooks/use-now"
import { useTypingUids } from "@/hooks/use-chat"
import { firstName, listTimeLabel, messageStatus } from "@/lib/chat"
import { cn } from "@/lib/utils"

type Filter = "all" | "unread" | "groups"

/**
 * Your chats, newest first, WhatsApp-style: search, All / Unread / Groups,
 * and rows with the last message, its ticks, the time and an unread count.
 */
export function ChatListView({
  chats,
  meUid,
  names,
  typing,
}: {
  chats: ChatSummary[]
  meUid: string
  /** uid → name, for "Aman is typing…" in groups. */
  names: Record<string, string>
  /** Fixed typing state (previews); live from the database when omitted. */
  typing?: Record<string, string[]>
}) {
  const [search, setSearch] = React.useState("")
  const [filter, setFilter] = React.useState<Filter>("all")
  const q = search.trim().toLowerCase()
  const unread = chats.filter((c) => c.unread).length
  const shown = chats.filter(
    (c) =>
      (filter === "all" ||
        (filter === "unread" ? c.unread : c.kind === "group")) &&
      (!q ||
        c.title.toLowerCase().includes(q) ||
        c.info?.lastText.toLowerCase().includes(q))
  )

  return (
    <div className="flex flex-col gap-3">
      <label className="flex h-10 items-center gap-2 rounded-full bg-card px-3.5 shadow-xs ring-1 ring-border/60 focus-within:ring-2 focus-within:ring-primary/50">
        <HugeiconsIcon icon={Search01Icon} className="size-[18px] shrink-0 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search chats"
          aria-label="Search chats"
          enterKeyHint="search"
          className="h-full min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
        {search && (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => setSearch("")}
            className="-mr-1 flex size-7 items-center justify-center rounded-full text-muted-foreground hover:bg-subtle-hover"
          >
            <HugeiconsIcon icon={Cancel01Icon} className="size-4" />
          </button>
        )}
      </label>

      <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1" role="tablist">
        {(
          [
            ["all", "All"],
            ["unread", unread ? `Unread ${unread}` : "Unread"],
            ["groups", "Groups"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={filter === key}
            onClick={() => setFilter(key)}
            className={cn(
              "h-8 shrink-0 rounded-full px-3.5 text-[13px] font-medium transition-colors",
              filter === key
                ? "bg-primary/12 text-primary ring-1 ring-primary/25"
                : "bg-card text-muted-foreground ring-1 ring-border/60 hover:bg-subtle-hover"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <EmptyState
          icon={BubbleChatIcon}
          title={q ? "No chats match" : filter === "unread" ? "All caught up" : "No group chats"}
          description={
            q
              ? `Nothing for "${search.trim()}".`
              : filter === "unread"
                ? "You've read every message."
                : "Join or create a group to chat with it."
          }
        />
      ) : (
        <ul className="-mx-2 flex flex-col">
          {shown.map((c) => (
            <li key={c.chatId}>
              {typing ? (
                <ChatRow chat={c} meUid={meUid} names={names} typing={typing[c.chatId] ?? []} />
              ) : (
                <LiveChatRow chat={c} meUid={meUid} names={names} />
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function LiveChatRow(props: {
  chat: ChatSummary
  meUid: string
  names: Record<string, string>
}) {
  const typing = useTypingUids(props.chat.chatId, props.meUid)
  return <ChatRow {...props} typing={typing} />
}

function ChatRow({
  chat,
  meUid,
  names,
  typing,
}: {
  chat: ChatSummary
  meUid: string
  names: Record<string, string>
  typing: string[]
}) {
  const now = useNow(0)
  const info = chat.info
  const group = chat.kind === "group"
  const mine = info?.lastBy === meUid
  const typingText = typingLabel(
    typing.map((u) => names[u] ?? "Someone"),
    group
  )

  let preview: React.ReactNode
  if (typingText)
    preview = <span className="font-medium text-primary">{typingText}</span>
  else if (!info)
    preview = group ? "Group chat · say hello" : "Tap to say hi 👋"
  else {
    const deleted = info.lastKind === "deleted"
    const who =
      info.lastKind === "system" || deleted
        ? ""
        : mine
          ? group
            ? "You: "
            : ""
          : group
            ? `${firstName(info.lastName)}: `
            : ""
    preview = (
      <>
        {mine && info.lastKind !== "system" && !deleted && (
          <MessageTicks
            status={messageStatus(info.lastAt, chat.others, chat.receipts)}
            className="mr-0.5 -mb-px inline-block"
          />
        )}
        {who}
        {info.lastKind === "photo" && (
          <HugeiconsIcon icon={Image01Icon} className="mr-1 inline size-4 -translate-y-px" />
        )}
        {deleted ? (
          <span className="italic">
            <HugeiconsIcon icon={UnavailableIcon} className="mr-1 inline size-3.5 -translate-y-px" />
            {mine ? "You deleted this message" : "This message was deleted"}
          </span>
        ) : (
          info.lastText
        )}
      </>
    )
  }

  return (
    <Link
      href={`/chat/${chat.chatId}`}
      className="flex items-center gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-subtle-hover active:bg-subtle-pressed"
    >
      {group ? (
        <GroupIcon
          src={chat.groupIcon}
          alt={chat.title}
          size="md"
          className="size-12 rounded-full"
        />
      ) : (
        <UserAvatar
          uid={chat.targetId}
          src={chat.photo}
          name={chat.title}
          size="md"
          className="size-12"
        />
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <span
            className={cn(
              "truncate text-[15px] leading-5",
              chat.unread ? "font-semibold" : "font-medium"
            )}
          >
            {chat.title}
          </span>
          {info && (
            <span
              className={cn(
                "shrink-0 text-[11.5px] tabular-nums",
                chat.unread ? "font-semibold text-primary" : "text-muted-foreground"
              )}
            >
              {listTimeLabel(info.lastAt, now)}
            </span>
          )}
        </div>
        <div className="mt-0.5 flex items-center gap-2">
          <p
            className={cn(
              "min-w-0 flex-1 truncate text-[13.5px] leading-5",
              chat.unread ? "text-foreground" : "text-muted-foreground"
            )}
          >
            {preview}
          </p>
          {chat.unread && (
            <span
              className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-semibold text-primary-foreground tabular-nums"
              aria-label={`${chat.unreadCount} unread`}
            >
              {chat.unreadCount > 99 ? "99+" : chat.unreadCount}
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}
