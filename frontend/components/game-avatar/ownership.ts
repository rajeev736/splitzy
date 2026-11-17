import { FRAMES, type FrameId } from "@/lib/fun/catalog"
import { ACHIEVEMENTS, achievementById, type Achievement } from "@/lib/live/achievements"
import { MAX_LEVEL, levelAchievement, levelKey } from "@/lib/live/levels"
import { CHARACTERS, isFreeCharacter } from "./registry"
import type { CharacterDef } from "./types"

/**
 * Who owns which game character, and what achievements and levels give. The
 * one ownership check every screen uses (profile, inventory, result screen),
 * read from the live wallet, so nothing is ever offered for sale twice.
 */

/** Free to pick without buying (registry `isFreeCharacter`, from the def itself). */
export const isFree = (def: CharacterDef) => def.price === 0 && !def.earn

/** Free (basic), bought or earned (`owned` = the wallet's avatars). */
export const ownsCharacter = (def: CharacterDef, owned: string[] | undefined) => isFree(def) || !!owned?.includes(def.id)

/** Whether `id` may be worn: no character (the photo), a free one, or one you own. */
export const canWear = (id: string | null, owned: string[] | undefined) =>
  !id || isFreeCharacter(id) || !!owned?.includes(id)

/** For sale with coins (premium, and legends that also have a price). */
export const isForSale = (def: CharacterDef) => def.price > 0

/** The achievement (or level, `lv<n>`) that unlocks it, as its id — `characterEarn` in the rules. */
export const earnKey = (def: CharacterDef) =>
  def.earn?.achievement ?? (def.earn?.level ? levelKey(def.earn.level) : undefined)

/** The achievement (or level) that unlocks it, if it can be earned. */
export const earnedBy = (def: CharacterDef) => achievementById(earnKey(def))

/** One thing an achievement or a level gives. */
export type Reward =
  | { kind: "character"; achievement: Achievement; def: CharacterDef }
  | { kind: "frame"; achievement: Achievement; frame: FrameId }
  | { kind: "coins"; achievement: Achievement; coins: number }

const fmt = new Intl.NumberFormat("en-IN")

export const rewardId = (r: Reward) => (r.kind === "character" ? r.def.id : r.kind === "frame" ? r.frame : "coins")
export const rewardName = (r: Reward) =>
  r.kind === "character" ? r.def.name : r.kind === "frame" ? `${FRAMES[r.frame].name} frame` : `${fmt.format(r.coins)} coins`

/** Everything an achievement gives: its frame, the characters that name it, then its coins. */
export function rewardsOf(a: Achievement, characters: CharacterDef[] = CHARACTERS): Reward[] {
  const list: Reward[] = []
  if (a.frame) list.push({ kind: "frame", achievement: a, frame: a.frame })
  for (const def of characters) if (earnKey(def) === a.id) list.push({ kind: "character", achievement: a, def })
  if (a.coins) list.push({ kind: "coins", achievement: a, coins: a.coins })
  return list
}

/** Rewards you don't have yet (coins: the level isn't in `levelCoins`). */
export function unclaimed(
  rewards: Reward[],
  wallet: { avatars?: string[]; frames?: string[]; levelCoins?: string[] } | null | undefined
): Reward[] {
  return rewards.filter((r) =>
    r.kind === "character"
      ? !wallet?.avatars?.includes(r.def.id)
      : r.kind === "frame"
        ? !wallet?.frames?.includes(r.frame)
        : !wallet?.levelCoins?.includes(r.achievement.id)
  )
}

/** Every achievement with its rewards (those with none, e.g. before the art lands, are left out). */
export function achievementRewards(characters: CharacterDef[] = CHARACTERS) {
  return ACHIEVEMENTS.map((a) => ({ achievement: a, rewards: rewardsOf(a, characters) })).filter((x) => x.rewards.length)
}

/** Every level that gives something, lowest first, with its rewards (the levels road). */
export function levelRewards(characters: CharacterDef[] = CHARACTERS) {
  return Array.from({ length: MAX_LEVEL - 1 }, (_, i) => levelAchievement(levelKey(i + 2))!)
    .map((a) => ({ level: a.goal, achievement: a, rewards: rewardsOf(a, characters) }))
    .filter((x) => x.rewards.length)
}
