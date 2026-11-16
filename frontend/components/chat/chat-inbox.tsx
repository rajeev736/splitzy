"use client"

import * as React from "react"
import { onValue } from "firebase/database"

import { useSession } from "@/components/providers/session-provider"
import { useFriends, useGroups } from "@/hooks/queries"
import { useGroupChatAccess } from "@/hooks/use-chat"
import {
  dmChatId,
  groupChatId,
  type ChatInfo,
  type ReadMarker,
  type Receipts,
} from "@/lib/chat"
import { isLiveConfigured } from "@/lib/firebase/config"
import { chatRef, markDelivered, readMarkerRef } from "@/services/chat"

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
  /** Unread messages (0 when read; at least 1 when unread). */
  unreadCount: number
  /** The other current members, for your last message's ticks. */
  others: string[]
  receipts: Receipts
}

interface Inbox {
  chats: ChatSummary[]
  /** Chats with something unread. */
  unreadCount: number
  groupsReady: boolean
}

const InboxContext = React.createContext<Inbox | null>(null)

/**
 * Every chat you can have (one per friend, one per group) with its last
 * message, unread count and ticks, kept live for the whole signed-in app. Being
 * always on is also what lets your app mark incoming messages delivered (grey
 * double ticks) before you open them.
 */
export function ChatInboxProvider({ children }: { children: React.ReactNode }) {
  const inbox = useInboxState()
  return <InboxContext.Provider value={inbox}>{children}</InboxContext.Provider>
}

const EMPTY_INBOX: Inbox = { chats: [], unreadCount: 0, groupsReady: false }

export const useChatList = () => React.useContext(InboxContext) ?? EMPTY_INBOX

/** How many chats have unread messages (for the header's chat button). */
export const useChatUnreadCount = () =>
  React.useContext(InboxContext)?.unreadCount ?? 0

function useInboxState(): Inbox {
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
        others: [f.uid],
      })),
      ...groups
        .filter((g) => access.allowed.has(g.id))
        .map((g) => ({
          chatId: groupChatId(g.id),
          kind: "group" as const,
          targetId: g.id,
          title: g.name,
          groupIcon: g.icon,
          others: g.members.filter((m) => m !== uid),
        })),
    ]
  }, [uid, friends, groups, access.allowed])

  const [infos, setInfos] = React.useState<Record<string, ChatInfo | null>>({})
  const [receipts, setReceipts] = React.useState<Record<string, Receipts>>({})
  const [reads, setReads] = React.useState<Record<string, ReadMarker>>({})
  const idsKey = targets.map((t) => t.chatId).join(",")

  // Your own read markers: one listener for all chats
  React.useEffect(() => {
    if (!isLiveConfigured || !uid) return
    return onValue(
      readMarkerRef(uid),
      (snap) =>
        setReads((snap.val() as Record<string, ReadMarker> | null) ?? {}),
      () => undefined
    )
  }, [uid])

  // Each chat's preview line and receipts (both tiny)
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
        chatRef(chatId, "receipts"),
        (snap) =>
          setReceipts((m) => ({
            ...m,
            [chatId]: (snap.val() as Receipts | null) ?? {},
          })),
        () => undefined
      ),
    ])
    return () => offs.forEach((off) => off())
  }, [uid, idsKey])

  // Something new from someone else reached this device: say so (once per message)
  const announced = React.useRef(new Map<string, number>())
  React.useEffect(() => {
    if (!uid) return
    for (const [chatId, info] of Object.entries(infos)) {
      if (!info || info.lastBy === uid || !receipts[chatId]) continue
      const mine = receipts[chatId][uid]
      const have = Math.max(mine?.delivered ?? 0, mine?.read ?? 0)
      if (have >= info.lastAt) continue
      if ((announced.current.get(chatId) ?? 0) >= info.lastAt) continue
      announced.current.set(chatId, info.lastAt)
      void markDelivered(uid, chatId)
    }
  }, [uid, infos, receipts])

  const chats: ChatSummary[] = React.useMemo(
    () =>
      targets
        .map((t) => {
          const info = infos[t.chatId] ?? null
          const read = reads[t.chatId]
          const unread =
            !!info && info.lastBy !== uid && info.lastAt > (read?.lastRead ?? 0)
          const counted =
            info?.seq && read?.seq ? info.seq - read.seq : info?.seq ?? 1
          return {
            ...t,
            info,
            unread,
            unreadCount: unread ? Math.max(1, Math.min(counted, 999)) : 0,
            receipts: receipts[t.chatId] ?? EMPTY_RECEIPTS,
          }
        })
        .sort(
          (a, b) =>
            (b.info?.lastAt ?? 0) - (a.info?.lastAt ?? 0) ||
            a.title.localeCompare(b.title)
        ),
    [targets, infos, reads, receipts, uid]
  )
  return React.useMemo(
    () => ({
      chats,
      unreadCount: chats.filter((c) => c.unread).length,
      groupsReady: access.ready,
    }),
    [chats, access.ready]
  )
}

const EMPTY_RECEIPTS: Receipts = {}
