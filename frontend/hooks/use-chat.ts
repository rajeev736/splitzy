"use client"

import * as React from "react"
import { limitToLast, onChildAdded, onValue, query } from "firebase/database"

import { useSession } from "@/components/providers/session-provider"
import { useFriends, useGroups } from "@/hooks/queries"
import {
  dmChatId,
  groupChatId,
  type ChatInfo,
  type ChatMessage,
} from "@/lib/chat"
import { isLiveConfigured } from "@/lib/firebase/config"
import { chatRef, readMarkerRef, syncGroupChatAccess } from "@/services/chat"

/** How many recent messages a conversation loads. */
const MESSAGE_WINDOW = 150

/* ── Group chat access ──────────────────────────────────────────────── */

// Confirmed once per session per group, shared by every screen
const confirmed = new Set<string>()
const pending = new Map<string, Promise<void>>()

function ensureAccess(groupIds: string[]): Promise<void> {
  const todo = groupIds.filter((g) => !confirmed.has(g) && !pending.has(g))
  if (todo.length > 0) {
    const p = syncGroupChatAccess(todo)
      .then((ok) => ok.forEach((g) => confirmed.add(g)))
      .finally(() => todo.forEach((g) => pending.delete(g)))
    todo.forEach((g) => pending.set(g, p))
  }
  return Promise.all(groupIds.map((g) => pending.get(g)).filter(Boolean)).then(
    () => undefined
  )
}

/**
 * Which of these groups' chats you can open (confirmed by the server).
 * `ready` turns true once the check has come back.
 */
export function useGroupChatAccess(groupIds: string[]) {
  const key = [...groupIds].sort().join(",")
  const [state, setState] = React.useState<{
    key: string
    allowed: Set<string>
    error: string | null
  } | null>(null)
  React.useEffect(() => {
    if (!isLiveConfigured || !key) return
    let cancelled = false
    const ids = key.split(",")
    ensureAccess(ids)
      .then(
        () =>
          !cancelled &&
          setState({
            key,
            allowed: new Set(ids.filter((g) => confirmed.has(g))),
            error: null,
          })
      )
      .catch(
        (e: unknown) =>
          !cancelled &&
          setState({
            key,
            allowed: new Set(),
            error:
              e instanceof Error ? e.message : "Couldn't open the group chat",
          })
      )
    return () => {
      cancelled = true
    }
  }, [key])
  const current = state?.key === key ? state : null
  return {
    allowed: current?.allowed ?? EMPTY_SET,
    ready: !key || !!current,
    error: current?.error ?? null,
  }
}

const EMPTY_SET: ReadonlySet<string> = new Set()

/* ── One conversation ───────────────────────────────────────────────── */

export interface KeyedMessage extends ChatMessage {
  id: string
}

/** The latest messages of a chat, oldest first, streamed one by one. */
export function useChatMessages(chatId: string | null) {
  const [state, setState] = React.useState<{
    chatId: string
    items: KeyedMessage[]
    loaded: boolean
    error: string | null
  }>({
    chatId: "",
    items: [],
    loaded: false,
    error: null,
  })
  React.useEffect(() => {
    if (!chatId || !isLiveConfigured) return
    const q = query(chatRef(chatId, "messages"), limitToLast(MESSAGE_WINDOW))
    const offAdded = onChildAdded(
      q,
      (snap) =>
        setState((prev) => {
          const items = prev.chatId === chatId ? prev.items : []
          if (items.some((m) => m.id === snap.key)) return prev
          const next = [
            ...items,
            { id: snap.key!, ...(snap.val() as ChatMessage) },
          ]
          return {
            chatId,
            items:
              next.length > MESSAGE_WINDOW ? next.slice(-MESSAGE_WINDOW) : next,
            loaded: true,
            error: null,
          }
        }),
      (e) => setState({ chatId, items: [], loaded: true, error: e.message })
    )
    // Tells an empty chat apart from one still loading
    const offLoaded = onValue(
      q,
      () =>
        setState((prev) =>
          prev.chatId === chatId
            ? { ...prev, loaded: true }
            : { chatId, items: [], loaded: true, error: null }
        ),
      () => undefined,
      { onlyOnce: true }
    )
    return () => {
      offAdded()
      offLoaded()
    }
  }, [chatId])
  const mine = state.chatId === chatId
  return {
    messages: mine ? state.items : EMPTY_MESSAGES,
    loaded: mine && state.loaded,
    error: mine ? state.error : null,
  }
}

const EMPTY_MESSAGES: KeyedMessage[] = []

/* ── The chat list ──────────────────────────────────────────────────── */

export interface ChatSummary {
  chatId: string
  kind: "dm" | "group"
  /** Friend uid or group id. */
  targetId: string
  title: string
  photo?: string
  groupIcon?: string
  info: ChatInfo | null
  unread: boolean
}

/**
 * Every chat you can have: one per friend and one per group, each with its
 * last message and whether it's unread. Ordered by latest message.
 */
export function useChatList() {
  const { user } = useSession()
  const uid = user?.uid ?? ""
  const { data: friends } = useFriends()
  const { data: groups } = useGroups()
  const groupIds = React.useMemo(() => groups.map((g) => g.id), [groups])
  const access = useGroupChatAccess(groupIds)

  const targets = React.useMemo(() => {
    if (!uid) return []
    return [
      ...friends.map((f) => ({
        chatId: dmChatId(uid, f.uid),
        kind: "dm" as const,
        targetId: f.uid,
        title: f.displayName,
        photo: f.photoURL,
      })),
      ...groups
        .filter((g) => access.allowed.has(g.id))
        .map((g) => ({
          chatId: groupChatId(g.id),
          kind: "group" as const,
          targetId: g.id,
          title: g.name,
          groupIcon: g.icon,
        })),
    ]
  }, [uid, friends, groups, access.allowed])

  const [infos, setInfos] = React.useState<Record<string, ChatInfo | null>>({})
  const [reads, setReads] = React.useState<Record<string, number>>({})
  const idsKey = targets.map((t) => t.chatId).join(",")

  React.useEffect(() => {
    if (!isLiveConfigured || !uid || !idsKey) return
    const offs = idsKey.split(",").flatMap((chatId) => [
      onValue(
        chatRef(chatId, "info"),
        (snap) =>
          setInfos((m) => ({
            ...m,
            [chatId]: (snap.val() as ChatInfo | null) ?? null,
          })),
        () => undefined
      ),
      onValue(
        readMarkerRef(uid, chatId),
        (snap) =>
          setReads((m) => ({
            ...m,
            [chatId]:
              (snap.val() as { lastRead?: number } | null)?.lastRead ?? 0,
          })),
        () => undefined
      ),
    ])
    return () => offs.forEach((off) => off())
  }, [uid, idsKey])

  const chats: ChatSummary[] = React.useMemo(
    () =>
      targets
        .map((t) => {
          const info = infos[t.chatId] ?? null
          const unread =
            !!info &&
            info.lastBy !== uid &&
            info.lastAt > (reads[t.chatId] ?? 0)
          return { ...t, info, unread }
        })
        .sort(
          (a, b) =>
            (b.info?.lastAt ?? 0) - (a.info?.lastAt ?? 0) ||
            a.title.localeCompare(b.title)
        ),
    [targets, infos, reads, uid]
  )
  return {
    chats,
    unreadCount: chats.filter((c) => c.unread).length,
    groupsReady: access.ready,
  }
}
