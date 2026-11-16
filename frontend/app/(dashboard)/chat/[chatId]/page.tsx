"use client"

import * as React from "react"
import { useParams } from "next/navigation"
import { toast } from "sonner"

import {
  ChatHeaderTitle,
  ChatInfoSheet,
  memberLine,
  typingLabel,
} from "@/components/chat/chat-header"
import {
  ConversationView,
  type ConversationActions,
  type ConversationModel,
} from "@/components/chat/conversation-view"
import type { ChatPerson } from "@/components/chat/message-row"
import { AppHeader } from "@/components/layout/app-header"
import { useSession } from "@/components/providers/session-provider"
import { EmptyState } from "@/components/shared/empty-state"
import { Spinner } from "@/components/ui/spinner"
import { useFriends, useGroup } from "@/hooks/queries"
import {
  useChatInfo,
  useChatMessages,
  useGroupChatAccess,
  useHiddenMessages,
  useInitialLastRead,
  useReceipts,
  useTypingUids,
} from "@/hooks/use-chat"
import { dmPartner, parseChatId, type KeyedMessage } from "@/lib/chat"
import { isLiveConfigured } from "@/lib/firebase/config"
import type { Group } from "@/lib/types"
import {
  deleteForEveryone,
  editMessage,
  loadPhoto,
  markRead,
  newMessageId,
  sendMessage,
  sendPhoto,
  setReaction,
  setTyping,
} from "@/services/chat"

export default function ConversationPage() {
  const { chatId } = useParams<{ chatId: string }>()
  const { user } = useSession()
  const uid = user?.uid ?? ""
  const parsed = parseChatId(chatId)
  const isMine = parsed?.kind === "dm" ? parsed.uids.includes(uid) : !!parsed

  const partnerId = parsed?.kind === "dm" ? dmPartner(chatId, uid) : null
  const groupId = parsed?.kind === "group" ? parsed.groupId : undefined
  const { data: group } = useGroup(groupId)
  const groupIds = React.useMemo(() => (groupId ? [groupId] : []), [groupId])
  const access = useGroupChatAccess(groupIds)
  const allowed =
    parsed?.kind === "dm" ? isMine : !!groupId && access.allowed.has(groupId)

  const viewport = useKeyboardViewport()

  return (
    // Full height: the messages scroll, the box to type in stays at the bottom.
    // On phones it follows the visible area, so the keyboard never covers it.
    <div
      className="flex h-dvh flex-col overflow-hidden md:h-[calc(100dvh-2rem)]"
      style={
        viewport
          ? {
              position: "fixed",
              insetInline: 0,
              top: viewport.top,
              height: viewport.height,
            }
          : undefined
      }
    >
      {!isLiveConfigured ? (
        <Shell>
          <EmptyState
            title="Chat isn't set up yet"
            description="The Realtime Database URL is missing on this server."
          />
        </Shell>
      ) : !parsed || !isMine ? (
        <Shell>
          <EmptyState
            title="Chat not found"
            description="This conversation doesn't exist or isn't yours."
          />
        </Shell>
      ) : parsed.kind === "group" && !access.ready ? (
        <Shell>
          <div className="flex flex-1 items-center justify-center">
            <Spinner />
          </div>
        </Shell>
      ) : !allowed ? (
        <Shell>
          <EmptyState
            title="You're not in this group"
            description={
              access.error ?? "Only the group's members can read its chat."
            }
          />
        </Shell>
      ) : (
        <Conversation
          key={chatId}
          chatId={chatId}
          partnerId={partnerId}
          group={parsed.kind === "group" ? (group ?? null) : undefined}
          keyboardOpen={viewport?.keyboard ?? false}
        />
      )}
    </div>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AppHeader showBack title="Chat" rightAction={<span />} />
      {children}
    </>
  )
}

function Conversation({
  chatId,
  partnerId,
  group,
  keyboardOpen,
}: {
  chatId: string
  partnerId: string | null
  /** The group (null while it loads); undefined in a DM. */
  group: Group | null | undefined
  keyboardOpen: boolean
}) {
  const { user } = useSession()
  const uid = user?.uid ?? ""
  const isGroup = group !== undefined
  const { data: friends } = useFriends()
  const friend = partnerId ? friends.find((f) => f.uid === partnerId) : undefined

  const feed = useChatMessages(chatId)
  const info = useChatInfo(chatId)
  const receipts = useReceipts(chatId)
  const typing = useTypingUids(chatId, uid)
  const initialLastRead = useInitialLastRead(uid, chatId)
  const { hidden, hide } = useHiddenMessages(uid, chatId)
  const [pending, setPending] = React.useState<ReadonlySet<string>>(EMPTY_SET)
  const [infoOpen, setInfoOpen] = React.useState(false)

  /* ── Who's who ─────────────────────────────────────────────────── */

  const me: ChatPerson = React.useMemo(
    () => ({
      uid,
      name: user?.displayName ?? "You",
      photo: user?.photoURL ?? undefined,
      role: group?.memberDetails?.[uid]?.role,
    }),
    [uid, user?.displayName, user?.photoURL, group]
  )

  // Names for everyone who ever spoke (from their messages), then the real details
  const people = React.useMemo(() => {
    const out: Record<string, ChatPerson> = {}
    for (const m of feed.messages)
      if (!out[m.uid]) out[m.uid] = { uid: m.uid, name: m.name }
    if (group) {
      for (const d of Object.values(group.formerMemberDetails ?? {}))
        out[d.uid] = { uid: d.uid, name: d.name, photo: d.photoURL }
      for (const d of Object.values(group.memberDetails ?? {}))
        out[d.uid] = { uid: d.uid, name: d.name, photo: d.photoURL, role: d.role }
    }
    if (friend)
      out[friend.uid] = {
        uid: friend.uid,
        name: friend.displayName,
        photo: friend.photoURL,
      }
    else if (partnerId && !out[partnerId])
      out[partnerId] = { uid: partnerId, name: "Friend" }
    out[uid] = me
    return out
  }, [feed.messages, group, friend, partnerId, uid, me])

  const others = React.useMemo(
    () =>
      isGroup
        ? (group?.members ?? []).filter((m) => m !== uid)
        : partnerId
          ? [partnerId]
          : [],
    [isGroup, group, partnerId, uid]
  )

  /* ── What you do ───────────────────────────────────────────────── */

  const track = React.useCallback((id: string, p: Promise<unknown>) => {
    setPending((s) => new Set(s).add(id))
    p.catch(() =>
      toast.error("Couldn't send. Check your connection and try again.")
    ).finally(() =>
      setPending((s) => {
        const next = new Set(s)
        next.delete(id)
        return next
      })
    )
  }, [])

  // Typing: one write every few seconds while keys are pressed, cleared when you pause
  const typingState = React.useRef({ last: 0, timer: 0 })
  const stopTyping = React.useCallback(() => {
    const t = typingState.current
    window.clearTimeout(t.timer)
    if (t.last) void setTyping(chatId, uid, false)
    t.last = 0
  }, [chatId, uid])
  const onTyping = React.useCallback(
    (active: boolean) => {
      const t = typingState.current
      if (!active) return stopTyping()
      const now = Date.now()
      if (now - t.last > 3000) {
        t.last = now
        void setTyping(chatId, uid, true)
      }
      window.clearTimeout(t.timer)
      t.timer = window.setTimeout(stopTyping, 5000)
    },
    [chatId, uid, stopTyping]
  )
  React.useEffect(() => stopTyping, [stopTyping])

  // The latest preview line, read when you edit or unsend
  const infoRef = React.useRef(info)
  React.useEffect(() => {
    infoRef.current = info
  })

  // Read receipts: at most one write per couple of seconds, the last one always lands
  const seqRef = React.useRef<number | undefined>(undefined)
  React.useEffect(() => {
    seqRef.current = info?.seq
  })
  const readState = React.useRef({ last: 0, timer: 0 })
  const doMarkRead = React.useCallback(() => {
    const r = readState.current
    const run = () => {
      r.last = Date.now()
      r.timer = 0
      void markRead(uid, chatId, seqRef.current)
    }
    if (r.timer) return
    const wait = 2000 - (Date.now() - r.last)
    if (wait <= 0) run()
    else r.timer = window.setTimeout(run, wait)
  }, [uid, chatId])
  React.useEffect(
    () => () => window.clearTimeout(readState.current.timer),
    []
  )
  // The count can land after the message: catch up the marker then too
  const seq = info?.seq
  React.useEffect(() => {
    if (seq && document.visibilityState === "visible") doMarkRead()
  }, [seq, doMarkRead])

  const actions: ConversationActions = React.useMemo(
    () => ({
      loadMore: feed.loadMore,
      send: (text, replyTo) => {
        if (!user) return
        stopTyping()
        const id = newMessageId(chatId)
        track(id, sendMessage(chatId, user, text, { replyTo, id }))
      },
      sendPhoto: (photo, caption, replyTo) => {
        if (!user) return
        const id = newMessageId(chatId)
        track(id, sendPhoto(chatId, user, photo, caption, { replyTo, id }))
      },
      edit: (msg, text) => editMessage(chatId, msg, text, infoRef.current),
      deleteForEveryone: (msg) =>
        deleteForEveryone(chatId, msg, infoRef.current),
      deleteForMe: (msg: KeyedMessage) => hide(msg.id),
      react: (msg, emoji) => setReaction(chatId, msg.id, uid, emoji),
      typing: onTyping,
      markRead: doMarkRead,
      loadPhoto: (msgId) => loadPhoto(chatId, msgId),
    }),
    [feed.loadMore, user, chatId, track, stopTyping, hide, uid, onTyping, doMarkRead]
  )

  const model: ConversationModel = {
    chatId,
    kind: isGroup ? "group" : "dm",
    me,
    people,
    others,
    messages: feed.messages,
    loaded: feed.loaded,
    error: feed.error,
    hasMore: feed.hasMore,
    loadingMore: feed.loadingMore,
    receipts,
    typing,
    pending,
    hidden,
    initialLastRead,
  }

  /* ── Header ────────────────────────────────────────────────────── */

  const partner = partnerId ? people[partnerId] : undefined
  const title = isGroup
    ? (group?.name ?? "Group chat")
    : (partner?.name ?? "Chat")
  const members = React.useMemo(
    () =>
      group
        ? group.members.map(
            (m) =>
              people[m] ?? { uid: m, name: group.memberDetails?.[m]?.name ?? "Member" }
          )
        : [],
    [group, people]
  )
  const typingText = typingLabel(
    typing.map((u) => people[u]?.name ?? "Someone"),
    isGroup
  )

  return (
    <>
      <AppHeader
        showBack
        rightAction={<span />}
        titleContent={
          <ChatHeaderTitle
            group={isGroup}
            title={title}
            photo={partner?.photo}
            groupIcon={group?.icon}
            uid={partnerId ?? undefined}
            typing={typingText}
            subtitle={isGroup && group ? memberLine(members, uid) : null}
            onOpen={() => setInfoOpen(true)}
          />
        }
      />
      <ConversationView
        model={model}
        actions={actions}
        safeBottom={!keyboardOpen}
      />
      <ChatInfoSheet
        open={infoOpen}
        onOpenChange={setInfoOpen}
        group={isGroup}
        title={title}
        photo={partner?.photo}
        groupIcon={group?.icon}
        uid={partnerId ?? undefined}
        description={group?.description}
        members={members}
        meUid={uid}
        href={isGroup ? `/groups/${group?.id ?? ""}` : `/friends/${partnerId ?? ""}`}
        hrefLabel={isGroup ? "Open group" : "View profile"}
      />
    </>
  )
}

const EMPTY_SET: ReadonlySet<string> = new Set()

/* ── Phones: fit the visible area above the keyboard ────────────────── */

// "height|top|keyboard" of the visual viewport, or "" where it isn't needed
function readViewport() {
  const vv = window.visualViewport
  if (!vv || !window.matchMedia("(max-width: 767px)").matches) return ""
  const keyboard = vv.height < window.innerHeight * 0.8 ? 1 : 0
  return `${Math.round(vv.height)}|${Math.round(vv.offsetTop)}|${keyboard}`
}

function subscribeViewport(onChange: () => void) {
  const vv = window.visualViewport
  vv?.addEventListener("resize", onChange)
  vv?.addEventListener("scroll", onChange)
  window.addEventListener("resize", onChange)
  return () => {
    vv?.removeEventListener("resize", onChange)
    vv?.removeEventListener("scroll", onChange)
    window.removeEventListener("resize", onChange)
  }
}

/**
 * On phones the on-screen keyboard shrinks only the *visual* viewport, so a
 * full-height chat would hide its text box behind it. This tracks the visible
 * area so the chat can pin itself to exactly that. Null on desktop and SSR.
 */
function useKeyboardViewport() {
  const raw = React.useSyncExternalStore(subscribeViewport, readViewport, () => "")
  return React.useMemo(() => {
    if (!raw) return null
    const [height, top, keyboard] = raw.split("|").map(Number)
    return { height, top, keyboard: keyboard === 1 }
  }, [raw])
}
