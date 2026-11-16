import {
  get,
  increment,
  onDisconnect,
  push,
  ref,
  remove,
  serverTimestamp,
  set,
  update,
} from "firebase/database"

import { AppError } from "@/lib/errors"
import { auth, isLiveConfigured, rtdb } from "@/lib/firebase/config"
import {
  groupChatId,
  MESSAGE_MAX,
  snippet,
  SYSTEM_MAX,
  type ChatInfo,
  type ChatMessage,
  type KeyedMessage,
  type MessageKind,
  type ReplyRef,
} from "@/lib/chat"
import type { CompressedPhoto } from "@/lib/chat-photo"
import type { UserProfile } from "@/lib/types"

function chatDb() {
  if (!rtdb)
    throw new AppError(
      "Chat isn't set up on this server yet (Realtime Database URL missing)"
    )
  return rtdb
}

export const chatRef = (chatId: string, path?: string) =>
  ref(chatDb(), `chats/${chatId}${path ? `/${path}` : ""}`)
export const readMarkerRef = (uid: string, chatId?: string) =>
  ref(chatDb(), `userChats/${uid}${chatId ? `/${chatId}` : ""}`)
export const membershipRef = (chatId: string, uid: string) =>
  ref(chatDb(), `chatMembers/${chatId}/${uid}`)
export const chatFileRef = (chatId: string, msgId: string) =>
  ref(chatDb(), `chatFiles/${chatId}/${msgId}`)
export const serverOffsetRef = () => ref(chatDb(), ".info/serverTimeOffset")

const ts = () => serverTimestamp() as unknown as number

type Author = Pick<UserProfile, "uid" | "displayName">

/** A fresh, time-ordered message id (made locally, so the bubble can show "sending"). */
export const newMessageId = (chatId: string) =>
  push(chatRef(chatId, "messages")).key!

/** The chat list's preview line, written together with the message. */
function infoPatch(
  chatId: string,
  user: Author,
  id: string,
  kind: MessageKind,
  text: string
): Record<string, unknown> {
  const base = `chats/${chatId}/info/`
  return {
    [`${base}lastAt`]: ts(),
    [`${base}lastText`]: text.slice(0, 120),
    [`${base}lastBy`]: user.uid,
    [`${base}lastName`]: user.displayName.slice(0, 60),
    [`${base}lastKind`]: kind,
    [`${base}lastId`]: id,
    [`${base}seq`]: increment(1),
  }
}

/** The quote a reply carries. */
export const replyRefOf = (m: KeyedMessage): ReplyRef => ({
  id: m.id,
  uid: m.uid,
  name: m.name.slice(0, 60),
  text: snippet(m).slice(0, 160),
  kind: m.kind ?? "text",
})

/** Sends a text message (optionally a reply) and updates the chat's preview line. */
export async function sendMessage(
  chatId: string,
  user: Author,
  text: string,
  opts: { replyTo?: ReplyRef; id?: string } = {}
) {
  const clean = text.trim().slice(0, MESSAGE_MAX)
  if (!clean) return
  const id = opts.id ?? newMessageId(chatId)
  const msg: ChatMessage = {
    uid: user.uid,
    name: user.displayName.slice(0, 60),
    text: clean,
    at: ts(),
    kind: "text",
    ...(opts.replyTo ? { replyTo: opts.replyTo } : {}),
  }
  // One atomic write: the message, and the preview line that points at it
  await update(ref(chatDb()), {
    [`chats/${chatId}/messages/${id}`]: msg,
    ...infoPatch(chatId, user, id, "text", clean),
  })
}

/** Sends a compressed photo: a light message plus its payload at chatFiles. */
export async function sendPhoto(
  chatId: string,
  user: Author,
  photo: CompressedPhoto,
  caption: string,
  opts: { replyTo?: ReplyRef; id?: string } = {}
) {
  const clean = caption.trim().slice(0, MESSAGE_MAX)
  const id = opts.id ?? newMessageId(chatId)
  const msg: ChatMessage = {
    uid: user.uid,
    name: user.displayName.slice(0, 60),
    text: clean,
    at: ts(),
    kind: "photo",
    photo: {
      w: photo.w,
      h: photo.h,
      ...(photo.thumb ? { thumb: photo.thumb } : {}),
    },
    ...(opts.replyTo ? { replyTo: opts.replyTo } : {}),
  }
  photoCache.set(`${chatId}/${id}`, photo.dataUrl)
  await update(ref(chatDb()), {
    [`chats/${chatId}/messages/${id}`]: msg,
    [`chatFiles/${chatId}/${id}`]: { data: photo.dataUrl },
    ...infoPatch(chatId, user, id, "photo", clean || "Photo"),
  })
}

/** Edits your own text message; the preview line follows if it's the latest. */
export async function editMessage(
  chatId: string,
  msg: KeyedMessage,
  text: string,
  info: ChatInfo | null
) {
  const clean = text.trim().slice(0, MESSAGE_MAX)
  if (!clean || clean === msg.text) return
  const patch: Record<string, unknown> = {
    [`chats/${chatId}/messages/${msg.id}/text`]: clean,
    [`chats/${chatId}/messages/${msg.id}/editedAt`]: ts(),
  }
  await updateWithPreview(
    patch,
    info?.lastId === msg.id
      ? { [`chats/${chatId}/info/lastText`]: clean.slice(0, 120) }
      : null
  )
}

/**
 * Writes a change to a message, and to the preview line when it shows that
 * message. If the preview moved on meanwhile (someone else just sent one, so
 * it isn't yours to write), the change still goes through on its own.
 */
async function updateWithPreview(
  patch: Record<string, unknown>,
  preview: Record<string, unknown> | null
) {
  if (!preview) return update(ref(chatDb()), patch)
  try {
    await update(ref(chatDb()), { ...patch, ...preview })
  } catch {
    await update(ref(chatDb()), patch)
  }
}

/** Unsends your own message for everyone: its text, photo and quote are cleared. */
export async function deleteForEveryone(
  chatId: string,
  msg: KeyedMessage,
  info: ChatInfo | null
) {
  const base = `chats/${chatId}/messages/${msg.id}`
  const patch: Record<string, unknown> = {
    [`${base}/deleted`]: true,
    [`${base}/text`]: "",
    [`${base}/replyTo`]: null,
    [`${base}/photo`]: null,
  }
  if (msg.kind === "photo") {
    patch[`chatFiles/${chatId}/${msg.id}`] = null
    photoCache.delete(`${chatId}/${msg.id}`)
  }
  await updateWithPreview(
    patch,
    info?.lastId === msg.id
      ? {
          [`chats/${chatId}/info/lastText`]: "This message was deleted",
          [`chats/${chatId}/info/lastKind`]: "deleted",
        }
      : null
  )
}

/** Sets (or with null clears) your one reaction to a message. */
export const setReaction = (
  chatId: string,
  msgId: string,
  uid: string,
  emoji: string | null
) =>
  emoji
    ? set(chatRef(chatId, `messages/${msgId}/reactions/${uid}`), emoji)
    : remove(chatRef(chatId, `messages/${msgId}/reactions/${uid}`))

/**
 * You've read everything in the chat: your private marker (for unread counts)
 * and your shared receipt (for the sender's blue ticks).
 */
export async function markRead(uid: string, chatId: string, seq?: number) {
  await Promise.all([
    update(readMarkerRef(uid, chatId), {
      lastRead: ts(),
      ...(seq ? { seq } : {}),
    }),
    update(chatRef(chatId, `receipts/${uid}`), {
      read: ts(),
      delivered: ts(),
    }),
  ]).catch(() => undefined)
}

/** Your app has received the chat's latest messages (grey double ticks). */
export const markDelivered = (uid: string, chatId: string) =>
  update(chatRef(chatId, `receipts/${uid}`), { delivered: ts() }).catch(
    () => undefined
  )

/* ── Typing ─────────────────────────────────────────────────────────── */

// Chats whose typing marker is set to vanish if this tab drops offline
const typingCleanup = new Set<string>()

/** "typing…": a timestamp while you type, gone when you stop, send or disconnect. */
export function setTyping(chatId: string, uid: string, typing: boolean) {
  const node = chatRef(chatId, `typing/${uid}`)
  if (!typing) return remove(node).catch(() => undefined)
  if (!typingCleanup.has(chatId)) {
    typingCleanup.add(chatId)
    void onDisconnect(node)
      .remove()
      .catch(() => typingCleanup.delete(chatId))
  }
  return set(node, ts()).catch(() => undefined)
}

/* ── Photos ─────────────────────────────────────────────────────────── */

// Recently seen photos, so scrolling back doesn't download them again
const photoCache = new Map<string, string>()
const PHOTO_CACHE_MAX = 40
const inflight = new Map<string, Promise<string | null>>()

/** A photo's data URL, fetched once when its bubble comes into view. */
export function loadPhoto(chatId: string, msgId: string) {
  const key = `${chatId}/${msgId}`
  const hit = photoCache.get(key)
  if (hit) return Promise.resolve(hit)
  const running = inflight.get(key)
  if (running) return running
  const p = get(chatFileRef(chatId, msgId))
    .then((snap) => {
      const data = (snap.val() as { data?: string } | null)?.data ?? null
      if (data) {
        photoCache.set(key, data)
        if (photoCache.size > PHOTO_CACHE_MAX)
          photoCache.delete(photoCache.keys().next().value!)
      }
      return data
    })
    .catch(() => null)
    .finally(() => inflight.delete(key))
  inflight.set(key, p)
  return p
}

/**
 * Asks the server to confirm which of these groups you're in, so their chats
 * open for you (see app/api/chat/membership). Returns the confirmed ids.
 */
export async function syncGroupChatAccess(
  groupIds: string[]
): Promise<string[]> {
  if (groupIds.length === 0) return []
  const idToken = await auth?.currentUser?.getIdToken()
  if (!idToken) return []
  const res = await fetch("/api/chat/membership", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({ groupIds }),
  })
  if (!res.ok)
    throw new AppError(
      res.status === 503
        ? "Group chat isn't set up on this server yet"
        : "Couldn't open the group chat"
    )
  const body = (await res.json()) as { member?: string[] }
  return body.member ?? []
}

/**
 * A line from the app in a group's chat ("Aman added Priya", "Neha changed
 * the group icon"), shown centred like a notice. Posted by the person who made
 * the change, so call it while they're still in the group (e.g. before
 * "Aman left"). Best effort: the group change itself is what matters, so it
 * never throws.
 */
export async function postGroupEvent(
  groupId: string,
  actor: Pick<UserProfile, "uid" | "displayName">,
  text: string
): Promise<void> {
  const clean = text.trim().replace(/\s+/g, " ").slice(0, SYSTEM_MAX)
  if (!clean || !isLiveConfigured || !rtdb) return
  const chatId = groupChatId(groupId)
  try {
    const id = newMessageId(chatId)
    const write = () =>
      update(ref(chatDb()), {
        [`chats/${chatId}/messages/${id}`]: {
          uid: actor.uid,
          name: actor.displayName.slice(0, 60),
          text: clean,
          at: ts(),
          kind: "system",
        } satisfies ChatMessage,
        ...infoPatch(chatId, actor, id, "system", clean),
      })
    try {
      await write()
    } catch {
      // A new group (or a new member) isn't mirrored to the chat yet: confirm, then retry once
      if ((await syncGroupChatAccess([groupId])).includes(groupId))
        await write()
    }
  } catch {
    /* best effort */
  }
}
