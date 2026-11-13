import { push, ref, serverTimestamp, set, update } from "firebase/database"

import { AppError } from "@/lib/errors"
import { auth, rtdb } from "@/lib/firebase/config"
import { MESSAGE_MAX, type ChatInfo, type ChatMessage } from "@/lib/chat"
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
export const readMarkerRef = (uid: string, chatId: string) =>
  ref(chatDb(), `userChats/${uid}/${chatId}`)
export const membershipRef = (chatId: string, uid: string) =>
  ref(chatDb(), `chatMembers/${chatId}/${uid}`)

const ts = () => serverTimestamp() as unknown as number

/** Sends a message and updates the chat's preview line. */
export async function sendMessage(
  chatId: string,
  user: Pick<UserProfile, "uid" | "displayName">,
  text: string
) {
  const clean = text.trim().slice(0, MESSAGE_MAX)
  if (!clean) return
  const msg: ChatMessage = {
    uid: user.uid,
    name: user.displayName,
    text: clean,
    at: ts(),
  }
  await push(chatRef(chatId, "messages"), msg)
  const info: ChatInfo = {
    lastAt: ts(),
    lastText: clean.slice(0, 120),
    lastBy: user.uid,
    lastName: user.displayName.slice(0, 60),
  }
  // The preview is best effort: the message itself is what matters
  await set(chatRef(chatId, "info"), info).catch(() => undefined)
}

/** Marks everything in the chat as read for you. */
export const markRead = (uid: string, chatId: string) =>
  update(readMarkerRef(uid, chatId), { lastRead: ts() }).catch(() => undefined)

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
