import { normalize } from "@/lib/live/scribble"

/**
 * The public fingerprint of a Scribble word: SHA-256 of "<room code>:<word>",
 * so guesses can be checked on every device without the word itself ever
 * leaving the drawer's secret. Browser-only (crypto.subtle).
 */
export async function hashWord(code: string, word: string): Promise<string> {
  const bytes = new TextEncoder().encode(`${code}:${normalize(word)}`)
  const digest = await crypto.subtle.digest("SHA-256", bytes)
  return Array.from(new Uint8Array(digest), (b) =>
    b.toString(16).padStart(2, "0")
  ).join("")
}
