/**
 * Chat: direct messages between two friends and one chat per group, on the
 * Realtime Database (no per-message cost on the free plan).
 *
 *   chats/{chatId}/messages/{id}   { uid, name, text, at }       append-only
 *   chats/{chatId}/info            { lastAt, lastText, lastBy, lastName }
 *   chatMembers/{chatId}/{uid}     true — group chats only, written by /api/chat/membership
 *   userChats/{uid}/{chatId}       { lastRead } — your own read marker
 *
 * A DM's id is "dm_" + both uids sorted, so the security rules can tell who's
 * in it from the id alone (Firebase uids never contain "_"). A group chat's id
 * is "g_" + the group id; membership is checked on the server against the
 * group in Firestore.
 */

export type ChatKind = "dm" | "group"

export const MESSAGE_MAX = 1000

export const dmChatId = (a: string, b: string) =>
  `dm_${[a, b].sort().join("_")}`
export const groupChatId = (groupId: string) => `g_${groupId}`

export function parseChatId(
  id: string
):
  | { kind: "dm"; uids: [string, string] }
  | { kind: "group"; groupId: string }
  | null {
  const dm = id.match(/^dm_([A-Za-z0-9]+)_([A-Za-z0-9]+)$/)
  if (dm) return { kind: "dm", uids: [dm[1], dm[2]] }
  const g = id.match(/^g_([A-Za-z0-9_-]+)$/)
  if (g) return { kind: "group", groupId: g[1] }
  return null
}

/** The other person in a DM. */
export const dmPartner = (chatId: string, me: string) => {
  const parsed = parseChatId(chatId)
  return parsed?.kind === "dm"
    ? parsed.uids[0] === me
      ? parsed.uids[1]
      : parsed.uids[0]
    : null
}

export interface ChatMessage {
  uid: string
  name: string
  text: string
  /** Server ms */
  at: number
}

export interface ChatInfo {
  lastAt: number
  lastText: string
  lastBy: string
  lastName: string
}

/** "Today" / "Yesterday" / "12 Nov" for the day separators. */
export function dayLabel(at: number, now: number) {
  const d = new Date(at)
  const today = new Date(now)
  const startOf = (x: Date) =>
    new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime()
  const diff = Math.round((startOf(today) - startOf(d)) / 86_400_000)
  if (diff === 0) return "Today"
  if (diff === 1) return "Yesterday"
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: diff > 300 ? "numeric" : undefined,
  })
}

export const timeLabel = (at: number) =>
  new Date(at).toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
  })
