/**
 * Chat: direct messages between two friends and one chat per group, on the
 * Realtime Database (no per-message cost on the free plan).
 *
 *   chats/{chatId}/messages/{id}   ChatMessage — see below
 *   chats/{chatId}/info            { lastAt, lastText, lastBy, lastName, lastKind, lastId, seq }
 *   chats/{chatId}/receipts/{uid}  { read, delivered } — shared ticks, written by that uid only
 *   chats/{chatId}/typing/{uid}    server ms of the last keystroke, removed on send / disconnect
 *   chatFiles/{chatId}/{id}        { data } — a photo's compressed data URL, fetched on sight
 *   chatMembers/{chatId}/{uid}     true — group chats only, written by /api/chat/membership
 *   userChats/{uid}/{chatId}       { lastRead, seq } — your own private read marker
 *
 * Messages are created once by their author; afterwards the author may only
 * edit the text (15 min) or delete it for everyone (1 hour), and anyone in the
 * chat may set or clear their own reaction. Old messages ({ uid, name, text, at })
 * still render: every field added since is optional.
 *
 * A DM's id is "dm_" + both uids sorted, so the security rules can tell who's
 * in it from the id alone (Firebase uids never contain "_"). A group chat's id
 * is "g_" + the group id; membership is checked on the server against the
 * group in Firestore.
 */

export type ChatKind = "dm" | "group"
export type MessageKind = "text" | "photo" | "system"

export const MESSAGE_MAX = 1000
/** A group event line ("Aman added Priya"). */
export const SYSTEM_MAX = 200
/** How long you can still edit / unsend your own message (the rules allow a minute more). */
export const EDIT_WINDOW_MS = 15 * 60_000
export const DELETE_WINDOW_MS = 60 * 60_000
/** Typing markers older than this are stale (a closed tab that never cleaned up). */
export const TYPING_TTL_MS = 6000

export const QUICK_REACTIONS = ["❤️", "😂", "😮", "😢", "🙏", "👍"] as const
export const MORE_REACTIONS = [
  "😀", "😁", "🤣", "😊", "😍", "🥰", "😘", "😎", "🤩", "🥳",
  "😇", "🙂", "😉", "😋", "🤔", "🤨", "😐", "🙄", "😏", "😬",
  "😴", "🤯", "😱", "😭", "😡", "🤬", "🥺", "😅", "🤗", "🫡",
  "👏", "🙌", "👌", "✌️", "🤞", "💪", "🤝", "👀", "👎", "🫶",
  "🔥", "✨", "🎉", "💯", "✅", "❌", "💸", "💰", "🍕", "☕",
] as const

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

/** What a reply quotes: enough to draw it without loading the original. */
export interface ReplyRef {
  id: string
  uid: string
  name: string
  /** The start of the original's text (or caption). */
  text: string
  kind?: MessageKind
}

export interface PhotoMeta {
  w: number
  h: number
  /** A tiny blurred preview shown until the photo itself loads. */
  thumb?: string
}

export interface ChatMessage {
  uid: string
  name: string
  /** The text, a photo's caption ("" for none), or a group event line. */
  text: string
  /** Server ms */
  at: number
  /** Missing on old messages: plain text. */
  kind?: MessageKind
  replyTo?: ReplyRef
  editedAt?: number
  /** Deleted for everyone: the text is gone, the bubble says so. */
  deleted?: boolean
  photo?: PhotoMeta
  /** uid → emoji, one each. */
  reactions?: Record<string, string>
}

export interface KeyedMessage extends ChatMessage {
  id: string
}

export interface ChatInfo {
  lastAt: number
  lastText: string
  lastBy: string
  lastName: string
  lastKind?: MessageKind | "deleted"
  lastId?: string
  /** Messages ever sent, for unread counts (missing on chats from before it). */
  seq?: number
}

/** Someone's progress through a chat (server ms): received up to, read up to. */
export interface Receipt {
  read?: number
  delivered?: number
}
export type Receipts = Record<string, Receipt>

/** Your private marker in userChats. */
export interface ReadMarker {
  lastRead?: number
  seq?: number
}

export type MessageStatus = "pending" | "sent" | "delivered" | "read"

/**
 * Ticks for your own message: read (blue) once every other current member has
 * read up to it, delivered (grey double) once every one of them has received it.
 */
export function messageStatus(
  at: number,
  others: readonly string[],
  receipts: Receipts
): Exclude<MessageStatus, "pending"> {
  if (others.length === 0) return "sent"
  if (others.every((u) => (receipts[u]?.read ?? 0) >= at)) return "read"
  if (
    others.every(
      (u) =>
        Math.max(receipts[u]?.delivered ?? 0, receipts[u]?.read ?? 0) >= at
    )
  )
    return "delivered"
  return "sent"
}

export const isSystem = (m: Pick<ChatMessage, "kind">) => m.kind === "system"
export const isPhoto = (m: Pick<ChatMessage, "kind">) => m.kind === "photo"
export const isTextKind = (m: Pick<ChatMessage, "kind">) =>
  !m.kind || m.kind === "text"

/** One line about a message, for quotes and the chat list. */
export function snippet(m: Pick<ChatMessage, "kind" | "text" | "deleted">) {
  if (m.deleted) return "This message was deleted"
  if (m.kind === "photo") return m.text ? m.text : "Photo"
  return m.text
}

export const firstName = (name: string) => name.trim().split(/\s+/)[0] || name

/** A stable colour per person for names in group chats (light / dark). */
const NAME_COLORS = [
  "text-[#c2410c] dark:text-[#fb923c]",
  "text-[#0e7490] dark:text-[#22d3ee]",
  "text-[#7e22ce] dark:text-[#c084fc]",
  "text-[#15803d] dark:text-[#4ade80]",
  "text-[#be185d] dark:text-[#f472b6]",
  "text-[#1d4ed8] dark:text-[#60a5fa]",
  "text-[#a16207] dark:text-[#facc15]",
  "text-[#b91c1c] dark:text-[#f87171]",
  "text-[#0f766e] dark:text-[#2dd4bf]",
  "text-[#4338ca] dark:text-[#a5b4fc]",
]
/** The bar beside a quoted message, in the quoted person's colour. */
const BAR_COLORS = [
  "bg-[#c2410c] dark:bg-[#fb923c]",
  "bg-[#0e7490] dark:bg-[#22d3ee]",
  "bg-[#7e22ce] dark:bg-[#c084fc]",
  "bg-[#15803d] dark:bg-[#4ade80]",
  "bg-[#be185d] dark:bg-[#f472b6]",
  "bg-[#1d4ed8] dark:bg-[#60a5fa]",
  "bg-[#a16207] dark:bg-[#facc15]",
  "bg-[#b91c1c] dark:bg-[#f87171]",
  "bg-[#0f766e] dark:bg-[#2dd4bf]",
  "bg-[#4338ca] dark:bg-[#a5b4fc]",
]
function colorIndex(uid: string) {
  let hash = 0
  for (let i = 0; i < uid.length; i++)
    hash = (hash * 31 + uid.charCodeAt(i)) | 0
  return Math.abs(hash) % NAME_COLORS.length
}
export const nameColor = (uid: string) => NAME_COLORS[colorIndex(uid)]
export const barColor = (uid: string) => BAR_COLORS[colorIndex(uid)]

/** Splits text into plain runs and links (http(s) and www.), for safe <a>s. */
export function linkify(
  text: string
): { text: string; href?: string }[] {
  const out: { text: string; href?: string }[] = []
  const re = /\b(?:https?:\/\/|www\.)[^\s<>"]+[^\s<>".,:;!?'")\]}]/gi
  let last = 0
  for (const m of text.matchAll(re)) {
    const start = m.index ?? 0
    if (start > last) out.push({ text: text.slice(last, start) })
    const raw = m[0]
    out.push({
      text: raw,
      href: /^https?:\/\//i.test(raw) ? raw : `https://${raw}`,
    })
    last = start + raw.length
  }
  if (last < text.length) out.push({ text: text.slice(last) })
  return out
}

/** "😂" or "🔥🔥🔥": up to three emoji and nothing else, drawn big without a bubble. */
export function jumboEmoji(text: string) {
  const t = text.trim()
  if (!t || t.length > 24) return false
  if (!/^[\p{Extended_Pictographic}\p{Emoji_Component}‍️\s]+$/u.test(t))
    return false
  if (/^[\d#*\s]+$/.test(t)) return false
  const count =
    typeof Intl !== "undefined" && "Segmenter" in Intl
      ? [...new Intl.Segmenter().segment(t.replace(/\s/g, ""))].length
      : 1
  return count <= 3
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
  if (diff > 1 && diff < 7)
    return d.toLocaleDateString("en-IN", { weekday: "long" })
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

/** For the chat list: a time today, "Yesterday", a weekday, or a date. */
export function listTimeLabel(at: number, now: number) {
  const day = dayLabel(at, Math.max(now, at))
  if (day === "Today") return timeLabel(at)
  if (day === "Yesterday") return day
  const diff = (Math.max(now, at) - at) / 86_400_000
  return diff < 7
    ? new Date(at).toLocaleDateString("en-IN", { weekday: "short" })
    : new Date(at).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: diff > 300 ? "2-digit" : undefined,
      })
}

/** "Today at 4:32 pm" for message info. */
export const fullTimeLabel = (at: number, now: number) =>
  `${dayLabel(at, Math.max(now, at))} at ${timeLabel(at)}`
