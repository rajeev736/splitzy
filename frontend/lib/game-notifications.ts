import type { AppNotification } from "@/lib/types"

/**
 * Notifications that belong to the Games side: live room invites (and calls
 * into a group's game room) and challenges. The Games bell lists only these,
 * in the game theme (/game-notifications); the Split side's list keeps
 * everything.
 */
export const isGameNotification = (n: Pick<AppNotification, "type">) =>
  n.type === "ROOM_INVITE" || n.type === "CHALLENGE_RECEIVED" || n.type === "CHALLENGE_RESULT"
