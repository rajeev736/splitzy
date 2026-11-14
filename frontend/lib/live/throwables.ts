/**
 * Things you throw at another player in a live game (Ludo King style): tap
 * their photo, pick one, and it flies from your photo to theirs — a bomb
 * blows up on them, a knife stabs back and forth, a tomato splats.
 *
 * Each costs coins. Prices must match `throwPrice` in firestore.rules.
 * In the room they travel as a reaction with sticker `t:<id>` and `to`.
 */

export const THROWABLE_IDS = [
  "rose",
  "kiss",
  "cheers",
  "tomato",
  "egg",
  "water",
  "punch",
  "knife",
  "bomb",
  // VIP: bigger, louder, pricier
  "vajra",
  "meteor",
  "chakra",
] as const
export type ThrowableId = (typeof THROWABLE_IDS)[number]

export const THROWABLES: Record<ThrowableId, { name: string; price: number; vip?: true }> = {
  rose: { name: "Rose", price: 10 },
  kiss: { name: "Kiss", price: 10 },
  cheers: { name: "Cheers", price: 20 },
  tomato: { name: "Tomato", price: 20 },
  egg: { name: "Egg", price: 25 },
  water: { name: "Water balloon", price: 30 },
  punch: { name: "Punch", price: 35 },
  knife: { name: "Knife", price: 40 },
  bomb: { name: "Bomb", price: 50 },
  vajra: { name: "Vajra", price: 100, vip: true },
  meteor: { name: "Meteor", price: 120, vip: true },
  chakra: { name: "Sudarshan Chakra", price: 150, vip: true },
}

export const THROW_PREFIX = "t:"

export const isThrowableId = (v: unknown): v is ThrowableId => typeof v === "string" && v in THROWABLES

/** The throwable inside a reaction's sticker id, if it is one. */
export const throwableOf = (sticker: string): ThrowableId | null => {
  if (!sticker.startsWith(THROW_PREFIX)) return null
  const id = sticker.slice(THROW_PREFIX.length)
  return isThrowableId(id) ? id : null
}
