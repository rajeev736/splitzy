"use client"

import * as React from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { SentIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { toast } from "sonner"

import { AppHeader } from "@/components/layout/app-header"
import { useSession } from "@/components/providers/session-provider"
import { EmptyState } from "@/components/shared/empty-state"
import { GroupIcon } from "@/components/shared/group-icon"
import { UserAvatar } from "@/components/shared/user-avatar"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import { useFriends, useGroup } from "@/hooks/queries"
import { useNow } from "@/hooks/use-now"
import {
  useChatMessages,
  useGroupChatAccess,
  type KeyedMessage,
} from "@/hooks/use-chat"
import {
  dayLabel,
  dmPartner,
  MESSAGE_MAX,
  parseChatId,
  timeLabel,
} from "@/lib/chat"
import { isLiveConfigured } from "@/lib/firebase/config"
import { cn } from "@/lib/utils"
import { markRead, sendMessage } from "@/services/chat"

export default function ConversationPage() {
  const { chatId } = useParams<{ chatId: string }>()
  const { user } = useSession()
  const uid = user?.uid ?? ""
  const parsed = parseChatId(chatId)
  const isMine = parsed?.kind === "dm" ? parsed.uids.includes(uid) : !!parsed

  const partnerId = parsed?.kind === "dm" ? dmPartner(chatId, uid) : null
  const { data: friends } = useFriends()
  const friend = partnerId
    ? friends.find((f) => f.uid === partnerId)
    : undefined

  const groupId = parsed?.kind === "group" ? parsed.groupId : undefined
  const { data: group } = useGroup(groupId)
  const groupIds = React.useMemo(() => (groupId ? [groupId] : []), [groupId])
  const access = useGroupChatAccess(groupIds)
  const allowed =
    parsed?.kind === "dm" ? isMine : !!groupId && access.allowed.has(groupId)

  const header =
    parsed?.kind === "group" ? (
      <Link
        href={`/groups/${groupId}`}
        className="flex min-w-0 items-center gap-3"
      >
        <GroupIcon
          src={group?.icon}
          alt={group?.name ?? "Group"}
          size="sm"
          className="size-9 rounded-full"
        />
        <div className="min-w-0">
          <h1 className="truncate text-base font-semibold">
            {group?.name ?? "Group chat"}
          </h1>
          {group && (
            <p className="-mt-0.5 truncate text-xs text-muted-foreground">
              {group.members.length} members
            </p>
          )}
        </div>
      </Link>
    ) : (
      <Link
        href={partnerId ? `/friends/${partnerId}` : "/friends"}
        className="flex min-w-0 items-center gap-3"
      >
        <UserAvatar
          uid={partnerId ?? undefined}
          src={friend?.photoURL}
          name={friend?.displayName ?? "Friend"}
          size="sm"
          className="size-9"
        />
        <h1 className="truncate text-base font-semibold">
          {friend?.displayName ?? "Chat"}
        </h1>
      </Link>
    )

  return (
    // Full height: the messages scroll, the box to type in stays at the bottom
    <div className="flex h-dvh flex-col md:h-[calc(100dvh-2rem)]">
      <AppHeader showBack titleContent={header} rightAction={<span />} />
      {!isLiveConfigured ? (
        <EmptyState
          title="Chat isn't set up yet"
          description="The Realtime Database URL is missing on this server."
        />
      ) : !parsed || !isMine ? (
        <EmptyState
          title="Chat not found"
          description="This conversation doesn't exist or isn't yours."
        />
      ) : parsed.kind === "group" && !access.ready ? (
        <div className="flex flex-1 items-center justify-center">
          <Spinner />
        </div>
      ) : !allowed ? (
        <EmptyState
          title="You're not in this group"
          description={
            access.error ?? "Only the group's members can read its chat."
          }
        />
      ) : (
        <Conversation chatId={chatId} showNames={parsed.kind === "group"} />
      )}
    </div>
  )
}

function Conversation({
  chatId,
  showNames,
}: {
  chatId: string
  showNames: boolean
}) {
  const { user } = useSession()
  const uid = user?.uid ?? ""
  const { messages, loaded, error } = useChatMessages(chatId)
  const now = useNow(0)
  const [text, setText] = React.useState("")
  const [sending, setSending] = React.useState(false)
  const listRef = React.useRef<HTMLDivElement>(null)
  const stickToBottom = React.useRef(true)
  const last = messages.at(-1)

  // Follow new messages unless the reader scrolled up; your own always scroll
  React.useEffect(() => {
    const el = listRef.current
    if (el && (stickToBottom.current || last?.uid === uid))
      el.scrollTop = el.scrollHeight
  }, [last?.id, last?.uid, uid])

  // Seen everything up to the latest message
  React.useEffect(() => {
    if (uid && loaded) void markRead(uid, chatId)
  }, [uid, chatId, loaded, last?.id])

  const submit = async () => {
    const clean = text.trim()
    if (!clean || !user || sending) return
    setSending(true)
    try {
      await sendMessage(chatId, user, clean)
      setText("")
    } catch {
      toast.error("Couldn't send. Check your connection and try again.")
    } finally {
      setSending(false)
    }
  }

  const today = Math.max(now, last?.at ?? 0)

  return (
    <>
      <div
        ref={listRef}
        onScroll={(e) => {
          const el = e.currentTarget
          stickToBottom.current =
            el.scrollHeight - el.scrollTop - el.clientHeight < 60
        }}
        className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain px-3 py-3"
      >
        <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-0.5">
          {error ? (
            <p className="my-auto text-center text-sm text-muted-foreground">
              Couldn&apos;t load messages: {error}
            </p>
          ) : !loaded ? (
            <div className="my-auto flex justify-center">
              <Spinner />
            </div>
          ) : messages.length === 0 ? (
            <p className="my-auto text-center text-sm text-muted-foreground">
              No messages yet. Say hi 👋
            </p>
          ) : (
            <>
              {/* Pushes a short conversation to the bottom, like a messenger */}
              <div className="flex-1" />
              {messages.map((m, i) => (
                <MessageRow
                  key={m.id}
                  msg={m}
                  prev={messages[i - 1]}
                  mine={m.uid === uid}
                  showName={showNames}
                  today={today}
                />
              ))}
            </>
          )}
        </div>
      </div>

      <form
        className="pb-safe border-t bg-background"
        onSubmit={(e) => {
          e.preventDefault()
          void submit()
        }}
      >
        <div className="mx-auto flex w-full max-w-3xl items-end gap-2 p-2">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              // Enter sends on a keyboard; Shift+Enter (and phones' return key) add a line
              if (
                e.key === "Enter" &&
                !e.shiftKey &&
                !e.nativeEvent.isComposing &&
                window.matchMedia("(pointer: fine)").matches
              ) {
                e.preventDefault()
                void submit()
              }
            }}
            placeholder="Message"
            maxLength={MESSAGE_MAX}
            rows={1}
            autoComplete="off"
            className="max-h-32 min-h-10 resize-none bg-card py-2"
          />
          <Button
            type="submit"
            size="icon"
            className="size-10 shrink-0 rounded-full"
            aria-label="Send"
            disabled={!text.trim() || sending}
          >
            <HugeiconsIcon icon={SentIcon} />
          </Button>
        </div>
      </form>
    </>
  )
}

function MessageRow({
  msg,
  prev,
  mine,
  showName,
  today,
}: {
  msg: KeyedMessage
  prev?: KeyedMessage
  mine: boolean
  showName: boolean
  today: number
}) {
  const day = dayLabel(msg.at, today)
  const newDay = !prev || dayLabel(prev.at, today) !== day
  // A new run of messages: someone else spoke last, a new day, or a 5 minute gap
  const newRun =
    newDay || prev?.uid !== msg.uid || msg.at - (prev?.at ?? 0) > 5 * 60_000

  return (
    <>
      {newDay && (
        <div className="my-2 flex justify-center">
          <span className="rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
            {day}
          </span>
        </div>
      )}
      <div
        className={cn(
          "flex flex-col",
          mine ? "items-end" : "items-start",
          newRun && "mt-2"
        )}
      >
        {showName && !mine && newRun && (
          <span className="mb-0.5 px-3 text-[11px] font-medium text-muted-foreground">
            {msg.name.split(" ")[0]}
          </span>
        )}
        <div
          className={cn(
            "max-w-[80%] rounded-2xl px-3 py-1.5 text-sm leading-snug break-words whitespace-pre-wrap",
            mine
              ? "rounded-br-md bg-primary text-primary-foreground"
              : "rounded-bl-md bg-muted text-foreground"
          )}
        >
          {msg.text}
          <span
            className={cn(
              "ml-2 inline-block translate-y-0.5 text-[10px]",
              mine ? "text-primary-foreground/70" : "text-muted-foreground"
            )}
          >
            {timeLabel(msg.at)}
          </span>
        </div>
      </div>
    </>
  )
}
