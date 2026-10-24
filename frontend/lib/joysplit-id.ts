import { SITE } from "@/lib/site"

/** A JoySplit ID somewhere in a piece of text (JOY-7K9M2Q; older accounts SPL-…). */
const ID_IN_TEXT = /\b(?:JOY|SPL)-[A-Z0-9]{6}\b/i

/** The JoySplit ID in scanned / pasted text — a bare ID or an add-friend link — or null. */
export function extractJoySplitId(text: string | null | undefined): string | null {
  const match = text?.match(ID_IN_TEXT)
  return match ? match[0].toUpperCase() : null
}

/**
 * What a JoySplit QR code holds: a link to add you as a friend. Scanned in the
 * app it opens your profile; scanned with any phone camera it opens the app there.
 */
export const addFriendLink = (splitzyId: string) => `${SITE.url}/friends/add?id=${encodeURIComponent(splitzyId)}`
