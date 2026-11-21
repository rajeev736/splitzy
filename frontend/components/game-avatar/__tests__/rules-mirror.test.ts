/** npx tsx components/game-avatar/__tests__/rules-mirror.test.ts — the rules know every character's price and reward, and every level's. */
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"

import { FRAME_IDS, FRAMES } from "../../../lib/fun/catalog"
import { ACHIEVEMENTS } from "../../../lib/live/achievements"
import { LEVEL_REWARDS, MAX_LEVEL, XP_PLAY, XP_WIN, levelXp } from "../../../lib/live/levels"
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
const framePrices = rulesMap("framePrice")

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
  // A level's character is only ever won there: no price here, none in characterPrice (so characterBuyOk refuses it)
  if (c.earn?.level) assert(c.price === 0 && !prices.has(c.id), `${c.id}: a level prize, never sold`)
  assert(c.tier !== "basic" || !c.earn, `${c.id}: basic ones aren't rewards`)
  assert(c.tier === "basic" || c.price > 0 || !!c.earn, `${c.id}: premium / legend ones are sold or earned`)
}
for (const id of [...prices.keys(), ...earns.keys()]) assert(ids.has(id), `${id}: in the rules but not in the registry`)
// A free one to start with, and the basic ones cost less than any premium or legend
const basic = CHARACTERS.filter((c) => c.tier === "basic")
const fancy = CHARACTERS.filter((c) => c.tier !== "basic" && c.price > 0)
assert(basic.some((c) => c.price === 0), "at least one free character")
assert(
  Math.max(...basic.map((c) => c.price)) < Math.min(...fancy.map((c) => c.price)),
  "basic characters are cheaper than premium / legend ones"
)

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
assert(rules.includes(`let m = int(a.replace('lv', '')) - 1;`), "levelRewardOk: m = level - 1")
assert(
  rules.includes(`w.get('livePlayed', 0) * ${XP_PLAY} + w.get('liveWins', 0) * ${XP_WIN} >= m * (35 + m * (3 + 2 * m))`),
  `levelRewardOk: XP = played × ${XP_PLAY} + wins × ${XP_WIN}, threshold m(35 + m(3 + 2m))`
)
for (let n = 1; n <= MAX_LEVEL; n++) {
  const m = n - 1
  assert(levelXp(n) === m * (35 + m * (3 + 2 * m)), `levelXp(${n}) matches the rules`)
}

// Frames: framePrice is the catalog's price for every sold frame, and nothing else — a level's frame
// (or a milestone) isn't in it, so frameBuyOk refuses it and only levelRewardOk hands it out
for (const id of FRAME_IDS) {
  const f = FRAMES[id]
  assert(Number(framePrices.get(id) ?? 0) === f.price, `${id}: framePrice ${framePrices.get(id) ?? 0}, catalog ${f.price}`)
}
for (const id of framePrices.keys()) assert((FRAME_IDS as readonly string[]).includes(id), `${id}: in framePrice but not in the catalog`)
for (const r of LEVEL_REWARDS) if (r.frame) assert(!framePrices.has(r.frame), `${r.frame}: a level prize, never sold`)

console.log(
  `rules mirror ok: ${CHARACTERS.length} characters, ${ACHIEVEMENTS.length} achievements, ${road.length} reward levels`
)
