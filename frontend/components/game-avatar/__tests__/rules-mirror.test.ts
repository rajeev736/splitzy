/** npx tsx components/game-avatar/__tests__/rules-mirror.test.ts — the rules know every character's price and reward, and every level's. */
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"

import { ACHIEVEMENTS } from "../../../lib/live/achievements"
import { MAX_LEVEL, XP_PLAY, XP_WIN, levelXp } from "../../../lib/live/levels"
import { earnKey, levelRewards } from "../ownership"
import { CHARACTERS } from "../registry"

function assert(c: boolean, m: string) {
  if (!c) throw new Error(`Assertion failed: ${m}`)
}

const rules = readFileSync(fileURLToPath(new URL("../../../../firestore.rules", import.meta.url)), "utf8")

/** The `{ 'id': value, … }` map a rules function returns. */
function rulesMap(fn: string): Map<string, string> {
  const m = rules.match(new RegExp(String.raw`function ${fn}\(id\) \{\s*return \{([\s\S]*?)\}\.get\(id`))
  assert(!!m, `${fn} in firestore.rules`)
  const out = new Map<string, string>()
  for (const [, key, value] of m![1].matchAll(/'([^']+)':\s*('[^']*'|\[[^\]]*\]|\d+)/g)) {
    assert(!out.has(key), `${fn}: ${key} once`)
    out.set(key, value)
  }
  return out
}

const prices = rulesMap("characterPrice")
const earns = rulesMap("characterEarn")
const goals = rulesMap("achievementGoal")
const frames = rulesMap("achievementFrame")
const levelFrames = rulesMap("levelFrame")
const levelCoins = rulesMap("levelBonus")

const ids = new Set<string>()
for (const c of CHARACTERS) {
  assert(!ids.has(c.id), `${c.id}: one character per id`)
  ids.add(c.id)
  assert(/^[a-z0-9_-]{1,40}$/.test(c.id), `${c.id}: id the rules and the room accept`)
  assert(Number(prices.get(c.id) ?? 0) === c.price, `${c.id}: characterPrice ${prices.get(c.id) ?? 0}, registry ${c.price}`)
  const earn = earnKey(c)
  assert((earns.get(c.id) ?? "''") === (earn ? `'${earn}'` : "''"), `${c.id}: characterEarn ${earns.get(c.id)}, registry ${earn}`)
  if (c.earn?.achievement) assert(ACHIEVEMENTS.some((a) => a.id === earn), `${c.id}: earned by a known achievement (${earn})`)
  if (c.earn?.level) assert(c.earn.level >= 2 && c.earn.level <= MAX_LEVEL, `${c.id}: earned at a real level (${c.earn.level})`)
  assert(c.tier !== "basic" || (c.price === 0 && !c.earn), `${c.id}: basic ones are free`)
  assert(c.tier === "basic" || c.price > 0 || !!c.earn, `${c.id}: premium / legend ones are sold or earned`)
}
for (const id of [...prices.keys(), ...earns.keys()]) assert(ids.has(id), `${id}: in the rules but not in the registry`)

for (const a of ACHIEVEMENTS) {
  assert(goals.get(a.id) === `['${a.stat}', ${a.goal}]`, `${a.id}: achievementGoal ${goals.get(a.id)}`)
  assert((frames.get(a.id) ?? "''") === (a.frame ? `'${a.frame}'` : "''"), `${a.id}: achievementFrame ${frames.get(a.id)}`)
}
assert(goals.size === ACHIEVEMENTS.length, "no extra achievements in the rules")

// Levels: every frame and coin gift in LEVEL_REWARDS is in levelFrame / levelBonus, and nothing else
const road = levelRewards()
for (const { achievement: a } of road) {
  assert((levelFrames.get(a.id) ?? "''") === (a.frame ? `'${a.frame}'` : "''"), `${a.id}: levelFrame ${levelFrames.get(a.id)}, levels.ts ${a.frame}`)
  assert(Number(levelCoins.get(a.id) ?? 0) === (a.coins ?? 0), `${a.id}: levelBonus ${levelCoins.get(a.id)}, levels.ts ${a.coins}`)
}
assert(levelFrames.size === road.filter((x) => x.achievement.frame).length, "no extra levelFrame entries")
assert(levelCoins.size === road.filter((x) => x.achievement.coins).length, "no extra levelBonus entries")
// …and levelRewardOk counts XP and the level's threshold like lib/live/levels
assert(
  rules.includes(
    `w.get('livePlayed', 0) * ${XP_PLAY} + w.get('liveWins', 0) * ${XP_WIN} >= 40 * (n - 1) + 15 * (n - 1) * (n - 2)`
  ),
  `levelRewardOk: XP = played × ${XP_PLAY} + wins × ${XP_WIN}, threshold 40(n-1) + 15(n-1)(n-2)`
)
for (let n = 1; n <= MAX_LEVEL; n++) assert(levelXp(n) === 40 * (n - 1) + 15 * (n - 1) * (n - 2), `levelXp(${n}) matches the rules`)

console.log(
  `rules mirror ok: ${CHARACTERS.length} characters, ${ACHIEVEMENTS.length} achievements, ${road.length} reward levels`
)
