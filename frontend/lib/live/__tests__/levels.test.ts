/** npx tsx lib/live/__tests__/levels.test.ts */
import { FRAME_IDS, FRAMES, isFreeFrame } from "../../fun/catalog"
import { CHARACTERS } from "../../../components/game-avatar/registry"
import { ACHIEVEMENTS, achievementById, achievementProgress, countLiveGame } from "../achievements"
import {
  LEVEL_REWARDS,
  MAX_LEVEL,
  levelAchievement,
  levelInfo,
  levelOf,
  levelsGained,
  levelTitle,
  levelXp,
  liveXp,
  xpFor,
} from "../levels"

function assert(condition: unknown, message: string) {
  if (!condition) throw new Error(`Assertion failed: ${message}`)
}

function w(livePlayed: number, liveWins: number) {
  return { livePlayed, liveWins }
}

// The curve: level 1 is free, quick at first, then every step longer than the last (and growing faster)
{
  // Total XP by level (the rules compute m * (35 + m * (3 + 2 * m)), m = level - 1)
  const TABLE = [
    0, 40, 98, 186, 316, 500, 750, 1078, 1496, 2016, 2650, 3410, 4308, 5356, 6566,
    7950, 9520, 11288, 13266, 15466, 17900, 20580, 23518, 26726, 30216, 34000, 38090, 42498, 47236, 52316,
  ]
  assert(TABLE.length === MAX_LEVEL, "a row per level")
  TABLE.forEach((xp, i) => assert(levelXp(i + 1) === xp, `level ${i + 1} needs ${xp}, not ${levelXp(i + 1)}`))
  assert(levelXp(2) === xpFor(true), "one win reaches level 2")
  // Each step longer than the last, and by more each time (later levels slow down)
  let prevStep = levelXp(2)
  let prevGrowth = 0
  for (let n = 2; n < MAX_LEVEL; n++) {
    const step = levelXp(n + 1) - levelXp(n)
    assert(step - prevStep > prevGrowth, `step ${n}→${n + 1} (${step}) grows faster than the one before`)
    prevGrowth = step - prevStep
    prevStep = step
  }
}

// XP from the counters
{
  assert(liveXp(null) === 0 && liveXp({}) === 0, "no games, no XP")
  assert(liveXp(w(3, 1)) === 60, "3 played, 1 won: 30 + 30")
  assert(xpFor(true) === 40 && xpFor(false) === 10, "a win 40, else 10")
  // Each counted game adds exactly xpFor(outcome)
  let wallet = { livePlayed: 0, liveWins: 0, streak: 0, bestStreak: 0 }
  for (const outcome of ["win", "lose", "draw", "win", "win"] as const) {
    const next = countLiveGame(wallet, outcome)
    assert(liveXp(next) - liveXp(wallet) === xpFor(outcome === "win"), `${outcome} XP`)
    wallet = next
  }
}

// Levels from XP
{
  assert(levelOf(0) === 1 && levelOf(39) === 1 && levelOf(40) === 2, "the first threshold")
  for (let n = 2; n <= MAX_LEVEL; n++) {
    assert(levelOf(levelXp(n)) === n, `exactly ${levelXp(n)} XP is level ${n}`)
    assert(levelOf(levelXp(n) - 1) === n - 1, `just under is level ${n - 1}`)
  }
  assert(levelOf(1e9) === MAX_LEVEL, "capped at the top")

  const mid = levelInfo(w(30, 10)) // 600 XP: level 6 (500), level 7 at 750
  assert(mid.level === 6 && mid.into === 100 && mid.need === 250 && !mid.max, "level 6, 100 of 250 in")
  assert(mid.title === "Challenger", "level 6 is a Challenger")
  const top = levelInfo(w(4000, 1000))
  assert(top.level === MAX_LEVEL && top.max && top.need === 0 && top.progress === 1, "max level")
  assert(levelTitle(1) === "Rookie" && levelTitle(10) === "Pro" && levelTitle(30) === "Legend", "titles")

  assert(levelsGained(w(0, 0), w(1, 1)).join() === "2", "a first win: level 2")
  assert(levelsGained(w(1, 0), w(2, 0)).length === 0, "20 XP: still level 1")
  assert(levelsGained(w(4, 1), w(5, 2)).join() === "3", "70 → 110 XP: level 3")
  assert(levelsGained(w(4, 2), w(5, 3)).length === 0, "100 → 140 XP: still level 3")
  assert(levelsGained(w(0, 0), w(11, 0)).join() === "2,3", "two levels at once, in order")
}

// Levels as achievements
{
  assert(!levelAchievement("lv1") && !levelAchievement("lv31") && !levelAchievement("lvx") && !levelAchievement("wins_25"), "only lv2..lv30")
  const lv5 = achievementById("lv5")!
  assert(lv5 && lv5.stat === "level" && lv5.goal === 5 && lv5.frame === "star_3" && lv5.coins === 250, "lv5")
  assert(achievementById("first_win") === ACHIEVEMENTS[0], "achievements still found")
  assert(!achievementProgress(w(10, 3), lv5).done, "190 XP is level 4")
  assert(achievementProgress(w(10, 8), lv5).done, "340 XP is level 5")
  assert(achievementProgress(w(10, 3), lv5).value === 4, "progress counts levels")

  const seen = new Set<number>()
  let prevCoins = 0
  for (const r of LEVEL_REWARDS) {
    assert(r.level >= 2 && r.level <= MAX_LEVEL && !seen.has(r.level), `lv${r.level}: one entry, in range`)
    seen.add(r.level)
    assert(r.frame || r.coins, `lv${r.level}: gives something`)
    if (r.frame) assert(r.frame in FRAMES && !FRAMES[r.frame].milestone, `lv${r.level}: a real, non-milestone frame`)
    if (r.frame) assert(!ACHIEVEMENTS.some((a) => a.frame === r.frame), `lv${r.level}: not an achievement's frame`)
    if (r.coins) {
      assert(Number.isInteger(r.coins) && r.coins > prevCoins, `lv${r.level}: coins grow with the level`)
      prevCoins = r.coins
    }
  }
  const frames = LEVEL_REWARDS.flatMap((r) => (r.frame ? [r.frame] : []))
  assert(new Set(frames).size === frames.length, "each frame at one level")

  // Level prizes are never sold: the catalog marks each frame with its level (price 0, not free)…
  for (const r of LEVEL_REWARDS) {
    if (!r.frame) continue
    const f = FRAMES[r.frame]
    assert(f.level === r.level && f.price === 0 && !isFreeFrame(r.frame), `${r.frame}: level ${r.level} only, never sold`)
  }
  for (const id of FRAME_IDS) {
    if (FRAMES[id].level) assert(LEVEL_REWARDS.some((r) => r.frame === id && r.level === FRAMES[id].level), `${id}: given by its level`)
  }
  // …and so is every character a level gives
  for (const c of CHARACTERS) if (c.earn?.level) assert(c.price === 0, `${c.id}: level ${c.earn.level} only, never sold`)
}

console.log("All level tests passed.")
