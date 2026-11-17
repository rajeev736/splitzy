import { BASIC_STICKERS } from "./basic"
import { FOLK_STICKERS } from "./folk"
import { SQUAD_STICKERS } from "./squad"
import type { CharSticker } from "./types"

/**
 * Signature stickers by character id: one for each free character, two for
 * each premium / legend one. Only a player WEARING the character can send its
 * stickers (database.rules.json checks the room's `players/$uid/avatar`);
 * everyone in the room sees them fly. Free and unlimited — just a short gap
 * between two from the same player.
 *
 * In the room they travel as a reaction with sticker `c:<characterId>:<n>`
 * and `to`.
 */
export const CHARACTER_STICKERS: Record<string, CharSticker[]> = {
  ...BASIC_STICKERS,
  ...SQUAD_STICKERS,
  ...FOLK_STICKERS,
}

export const CHAR_STICKER_PREFIX = "c:"

/** One send per this long per player; receivers also skip anything faster. */
export const CHAR_STICKER_GAP_MS = 2000

/** A character's signature stickers (none for an unknown id or no character). */
export const stickersOf = (characterId: string | null | undefined): CharSticker[] =>
  (characterId && CHARACTER_STICKERS[characterId]) || []

export const charStickerId = (characterId: string, n: number) => `${CHAR_STICKER_PREFIX}${characterId}:${n}`

/** The character sticker inside a reaction's sticker id, if it is one. */
export function charStickerOf(sticker: string): { character: string; sticker: CharSticker } | null {
  if (!sticker.startsWith(CHAR_STICKER_PREFIX)) return null
  const [character, n] = sticker.slice(CHAR_STICKER_PREFIX.length).split(":")
  const found = stickersOf(character).find((s) => String(s.n) === n)
  return found ? { character, sticker: found } : null
}

/**
 * The keys of the character stickers worth playing: one per player per
 * (almost) the gap, so a modified client can't flood everyone's screen.
 * Every device decides the same, from the server times.
 */
export function paced<T extends { key: string; value: { uid: string; sticker: string; at: number } }>(items: T[]): Set<string> {
  const last = new Map<string, number>()
  const ok = new Set<string>()
  for (const r of items) {
    if (!charStickerOf(r.value.sticker)) continue
    const prev = last.get(r.value.uid)
    if (prev !== undefined && r.value.at - prev < CHAR_STICKER_GAP_MS - 500) continue
    last.set(r.value.uid, r.value.at)
    ok.add(r.key)
  }
  return ok
}
