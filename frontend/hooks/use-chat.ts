"use client"

import * as React from "react"
import { get, limitToLast, onValue, query } from "firebase/database"

import { isLiveConfigured } from "@/lib/firebase/config"
import {
  TYPING_TTL_MS,
  type ChatInfo,
  type ChatMessage,
  type KeyedMessage,
  type ReadMarker,
  type Receipts,
} from "@/lib/chat"
import {
  chatRef,
  readMarkerRef,
  serverOffsetRef,
  syncGroupChatAccess,
} from "@/services/chat"

export type { KeyedMessage } from "@/lib/chat"

/** Messages per page: the latest ones load first, older ones on scroll-up. */
export const MESSAGE_PAGE = 50

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

/**
 * The latest messages of a chat, oldest first, kept live (new ones, edits,
 * reactions, deletes). `loadMore` widens the window by a page; the old
 * messages stay on screen while the wider one arrives.
 */
export function useChatMessages(chatId: string | null) {
  const [limit, setLimit] = React.useState(MESSAGE_PAGE)
  const [state, setState] = React.useState<{
    chatId: string
    limit: number
    items: KeyedMessage[]
    loaded: boolean
    error: string | null
  }>({ chatId: "", limit: 0, items: [], loaded: false, error: null })

  React.useEffect(() => {
    if (!chatId || !isLiveConfigured) return
    const q = query(chatRef(chatId, "messages"), limitToLast(limit))
    return onValue(
      q,
      (snap) => {
        const items: KeyedMessage[] = []
        snap.forEach((child) => {
          const v = child.val() as ChatMessage | null
          if (v && typeof v.uid === "string")
            items.push({ ...v, id: child.key!, text: v.text ?? "" })
        })
        setState({ chatId, limit, items, loaded: true, error: null })
      },
      (e) =>
        setState({ chatId, limit, items: [], loaded: true, error: e.message })
    )
  }, [chatId, limit])

  const mine = state.chatId === chatId
  const loadingMore = mine && state.loaded && state.limit < limit
  const hasMore = mine && state.items.length >= state.limit
  const loadedLimit = mine ? state.limit : 0
  const loadMore = React.useCallback(
    () => setLimit((l) => (l <= loadedLimit ? l + MESSAGE_PAGE : l)),
    [loadedLimit]
  )

  return {
    messages: mine ? state.items : EMPTY_MESSAGES,
    loaded: mine && state.loaded,
    error: mine ? state.error : null,
    hasMore,
    loadingMore,
    loadMore,
  }
}

const EMPTY_MESSAGES: KeyedMessage[] = []

/** A live value under a chat (null until it loads or when it's missing). */
function useChatValue<T>(chatId: string | null, path: string) {
  const key = chatId ? `${chatId}/${path}` : ""
  const [state, setState] = React.useState<{ key: string; value: T | null }>({
    key: "",
    value: null,
  })
  React.useEffect(() => {
    if (!chatId || !isLiveConfigured) return
    const key = `${chatId}/${path}`
    return onValue(
      chatRef(chatId, path),
      (snap) => setState({ key, value: (snap.val() as T | null) ?? null }),
      () => setState({ key, value: null })
    )
  }, [chatId, path])
  return state.key === key ? state.value : null
}

/** The chat's preview line (and message count). */
export const useChatInfo = (chatId: string | null) =>
  useChatValue<ChatInfo>(chatId, "info")

/** Everyone's read / delivered markers in a chat. */
export const useReceipts = (chatId: string | null): Receipts =>
  useChatValue<Receipts>(chatId, "receipts") ?? EMPTY_RECEIPTS
const EMPTY_RECEIPTS: Receipts = {}

/**
 * Your read marker as it was when the chat opened (before this visit marks it
 * read), for the "unread messages" divider. Undefined while it loads.
 */
export function useInitialLastRead(uid: string, chatId: string) {
  const [state, setState] = React.useState<{ key: string; at: number } | null>(
    null
  )
  const key = `${uid}/${chatId}`
  React.useEffect(() => {
    if (!uid || !isLiveConfigured) return
    let cancelled = false
    get(readMarkerRef(uid, chatId))
      .then((snap) => (snap.val() as ReadMarker | null)?.lastRead ?? 0)
      .catch(() => 0)
      .then((at) => !cancelled && setState({ key, at }))
    return () => {
      cancelled = true
    }
  }, [uid, chatId, key])
  return state?.key === key ? state.at : undefined
}

/* ── Typing ─────────────────────────────────────────────────────────── */

// Server clock minus ours, shared by every typing listener
let serverOffset = 0
let offsetListening = false
function listenServerOffset() {
  if (offsetListening || !isLiveConfigured) return
  offsetListening = true
  onValue(serverOffsetRef(), (snap) => {
    serverOffset = (snap.val() as number | null) ?? 0
  })
}

/** Who else is typing in a chat right now (uids), live. */
export function useTypingUids(chatId: string | null, me: string) {
  const [state, setState] = React.useState<{ chatId: string; uids: string[] }>(
    { chatId: "", uids: [] }
  )
  React.useEffect(() => {
    if (!chatId || !isLiveConfigured) return
    listenServerOffset()
    let marks: Record<string, number> = {}
    let timer: number | undefined
    const evaluate = () => {
      const now = Date.now() + serverOffset
      const uids = Object.entries(marks)
        .filter(([uid, at]) => uid !== me && now - at < TYPING_TTL_MS)
        .map(([uid]) => uid)
        .sort()
      setState((prev) =>
        prev.chatId === chatId && prev.uids.join() === uids.join()
          ? prev
          : { chatId, uids }
      )
      // Re-check while anyone shows as typing, so a vanished tab times out
      window.clearTimeout(timer)
      if (uids.length > 0) timer = window.setTimeout(evaluate, 1500)
    }
    const off = onValue(
      chatRef(chatId, "typing"),
      (snap) => {
        marks = (snap.val() as Record<string, number> | null) ?? {}
        evaluate()
      },
      () => undefined
    )
    return () => {
      off()
      window.clearTimeout(timer)
    }
  }, [chatId, me])
  return state.chatId === chatId ? state.uids : EMPTY_UIDS
}
const EMPTY_UIDS: string[] = []

/* ── Delete for me ──────────────────────────────────────────────────── */

const HIDDEN_EVENT = "joysplit_chat_hidden_change"
const hiddenKey = (uid: string, chatId: string) =>
  `joysplit_chat_hidden_${uid}_${chatId}`

function readHidden(uid: string, chatId: string): string {
  try {
    return localStorage.getItem(hiddenKey(uid, chatId)) ?? ""
  } catch {
    return ""
  }
}

function subscribeHidden(onChange: () => void) {
  window.addEventListener(HIDDEN_EVENT, onChange)
  window.addEventListener("storage", onChange)
  return () => {
    window.removeEventListener(HIDDEN_EVENT, onChange)
    window.removeEventListener("storage", onChange)
  }
}

/** Messages you deleted just for yourself (kept on this device). */
export function useHiddenMessages(uid: string, chatId: string) {
  const raw = React.useSyncExternalStore(
    subscribeHidden,
    () => readHidden(uid, chatId),
    () => ""
  )
  const hidden = React.useMemo(
    () => new Set(raw ? raw.split(",") : []) as ReadonlySet<string>,
    [raw]
  )
  const hide = React.useCallback(
    (msgId: string) => {
      try {
        const ids = readHidden(uid, chatId).split(",").filter(Boolean)
        if (!ids.includes(msgId)) ids.push(msgId)
        // The newest 500 are plenty: older ones scroll out of reach anyway
        localStorage.setItem(hiddenKey(uid, chatId), ids.slice(-500).join(","))
        window.dispatchEvent(new Event(HIDDEN_EVENT))
      } catch {
        /* storage unavailable */
      }
    },
    [uid, chatId]
  )
  return { hidden, hide }
}
