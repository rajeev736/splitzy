/** npx tsx lib/live/__tests__/scribble.test.ts */
import { ABANDON_MS } from "../room"
import {
  advanceTurn,
  applyTurnEnd,
  beginDrawing,
  canReveal,
  CHOOSE_MS,
  CHOOSE_SKIP_ANY_MS,
  CHOOSE_SKIP_OFFLINE_MS,
  chooseEndsAt,
  DRAW_GRACE_MS,
  drawerPoints,
  everyoneGuessed,
  goneUids,
  guesserPoints,
  initialScribbleState,
  isClose,
  levenshtein,
  maskWord,
  nextDrawer,
  normalize,
  rankingOf,
  refereeAction,
  resultOf,
  revealAt,
  revealedCount,
  revealsDue,
  TURN_END_MS,
  turnPoints,
  unrevealedIndexes,
} from "../scribble"
import {
  aliasesOf,
  guessCandidates,
  PACK_IDS,
  pickChoices,
  spellingsOf,
  WORD_PACKS,
  wordsOf,
} from "../scribble-words"
import {
  floodMask,
  parseHex,
} from "../../../components/live/scribble/flood-fill"
import type { RoomPlayer } from "../types"

function assert(condition: unknown, message: string) {
  if (!condition) throw new Error(`Assertion failed: ${message}`)
}

const player = (
  uid: string,
  seat: number,
  extra: Partial<RoomPlayer> = {}
): RoomPlayer => ({
  uid,
  name: uid.toUpperCase(),
  seat,
  joinedAt: 0,
  online: true,
  lastSeen: 0,
  ...extra,
})
const fresh = (n: number, options = {}) =>
  initialScribbleState(
    Array.from({ length: n }, (_, i) => player("abcde"[i], i)),
    options,
    "SEED"
  ).game
/** The database drops `undefined`: no state we write may contain one. */
function noUndefined(v: unknown, path = "state"): void {
  if (v === undefined) throw new Error(`undefined at ${path}`)
  if (v && typeof v === "object")
    for (const [k, x] of Object.entries(v)) noUndefined(x, `${path}.${k}`)
}

console.log("Running Scribble tests...\n")

// Word packs: enough of them, drawable, well-formed
const shape = /^[a-z][a-z -]{1,14}[a-z]$/
for (const pack of PACK_IDS) {
  const words = wordsOf(pack)
  assert(words.length >= 80, `${pack} has at least 80 words (${words.length})`)
  assert(new Set(words).size === words.length, `${pack} has no duplicates`)
  for (const w of words)
    assert(
      shape.test(w),
      `${pack}: "${w}" is 3–16 lowercase letters, spaces or hyphens`
    )
  assert(
    WORD_PACKS[pack].length === words.length,
    `${pack} listed in WORD_PACKS`
  )
}
assert(
  wordsOf("mix").length ===
    new Set([
      ...wordsOf("food"),
      ...wordsOf("travel"),
      ...wordsOf("desi"),
      ...wordsOf("money"),
    ]).size,
  "mix is every pack, each word once"
)
for (let i = 0; i < 30; i++) {
  const c = pickChoices("food", 3)
  assert(
    c.length === 3 &&
      new Set(c).size === 3 &&
      c.every((w) => wordsOf("food").includes(w)),
    "3 different food words"
  )
}
const exclude = wordsOf("money").slice(0, wordsOf("money").length - 10)
for (let i = 0; i < 30; i++) {
  const c = pickChoices("money", 3, exclude)
  assert(
    c.every((w) => !exclude.includes(w)),
    "used words don't come back"
  )
}
assert(
  pickChoices("food", 3, wordsOf("food")).length === 3,
  "when everything's used, the pack is reused"
)
assert(wordsOf("mix").length >= 300, "300+ words in all")
for (const w of [
  "samosa",
  "auto rickshaw",
  "rangoli",
  "diya",
  "kite",
  "pressure cooker",
  "taj mahal",
  "tiffin box",
  "bullock cart",
])
  assert(wordsOf("mix").includes(w), `"${w}" is in the mix`)
console.log("✓ Word packs")

// Other spellings: only for pack words, never another pack word by mistake
const squashed = new Map(wordsOf("mix").map((w) => [w.replace(/[ -]/g, ""), w]))
for (const w of wordsOf("mix")) {
  for (const a of aliasesOf(w)) {
    assert(normalize(a) === a, `alias "${a}" is written normalised`)
    const other = squashed.get(a.replace(/ /g, ""))
    assert(
      !other || other === w || ["swing", "jhula"].includes(w),
      `alias "${a}" of "${w}" isn't the word "${other}"`
    )
  }
}
const means = (guess: string, word: string) =>
  guessCandidates(guess).includes(word)
assert(means("Patang", "kite"), "patang = kite")
assert(means("golgappa", "pani puri"), "golgappa = pani puri")
assert(means("Gol-Gappe!", "pani puri"), "spelling, case and punctuation")
assert(means("autorickshaw", "auto rickshaw"), "joined up")
assert(means("pressure  cooker", "pressure cooker"), "extra spaces")
assert(means("marble", "marbles"), "singular of a plural word")
assert(means("jalebis", "jalebi"), "plural of a word")
assert(means("tomatoes", "tomato"), "-es plural")
assert(means("pagdi", "turban"), "pagdi = turban")
assert(!means("bike", "scooter"), "a different thing isn't an alias")
assert(
  guessCandidates("anything at all")[0] === "anything at all",
  "the guess itself comes first"
)
assert(guessCandidates("  ").length === 0, "nothing for an empty guess")
assert(spellingsOf("kite").includes("patang"), "close nudges know the aliases")
console.log("✓ Guess spellings")

// Paint bucket
{
  const W = 20
  const H = 10
  const px = new Uint8ClampedArray(W * H * 4).fill(255)
  // A black wall down column 10
  for (let y = 0; y < H; y++) px.set([0, 0, 0, 255], (y * W + 10) * 4)
  const m = floodMask(px, W, H, 2, 2, [255, 0, 0])
  assert(m, "fills a white area")
  assert(m!.mask[5 * W + 0] && m!.mask[5 * W + 9], "the whole left side")
  assert(
    m!.mask[5 * W + 10],
    "grows one pixel into the wall (covers soft edges)"
  )
  assert(!m!.mask[5 * W + 11], "but not through it")
  assert(m!.maxX === 10 && m!.minX === 0, "bounds")
  assert(
    floodMask(px, W, H, 2, 2, [255, 255, 255]) === null,
    "same colour: nothing to do"
  )
  assert(
    floodMask(px, W, H, 25, 2, [255, 0, 0]) === null,
    "off the canvas: nothing"
  )
  assert(
    parseHex("#ff8000").join() === "255,128,0" &&
      parseHex("nope").join() === "0,0,0",
    "colours"
  )
}
console.log("✓ Paint bucket")

// Setup
let s = fresh(3)
noUndefined(s)
assert(
  s.order.join() === "a,b,c" && s.drawer === "a" && s.turnIndex === 0,
  "seat order, host draws first"
)
assert(
  s.round === 1 && s.turn === 1 && s.phase === "choosing",
  "round 1, choosing"
)
assert(
  s.rounds === 3 && s.drawTime === 80 && s.pack === "mix",
  "default options"
)
assert(
  Object.values(s.scores).every((v) => v === 0) &&
    Object.keys(s.scores).length === 3,
  "everyone on 0"
)
s = fresh(2, { rounds: 5, drawTime: 50, pack: "desi" })
assert(
  s.rounds === 5 && s.drawTime === 50 && s.pack === "desi",
  "picked options"
)
s = fresh(2, { rounds: 9, drawTime: 7, pack: "nope" })
assert(
  s.rounds === 3 && s.drawTime === 80 && s.pack === "mix",
  "unknown options fall back"
)
s = initialScribbleState(
  [player("a", 0), player("b", 1, { left: true }), player("c", 2)],
  {},
  "X"
).game
assert(
  s.order.join() === "a,c",
  "players who left before the start aren't in the order"
)
assert(
  chooseEndsAt(fresh(2), 5000) === 5000 + CHOOSE_MS,
  "first turn's choice deadline counts from the start"
)
assert(
  chooseEndsAt({ ...fresh(2), turnAt: 9000 }, 5000) === 9000 + CHOOSE_MS,
  "later turns from turnAt"
)
console.log("✓ Setup")

// Normalisation
assert(normalize("  Masala   CHAI ") === "masala chai", "case and spaces")
assert(
  normalize("auto-rickshaw") === "auto rickshaw" &&
    normalize("auto rickshaw") === "auto rickshaw",
  "hyphen = space"
)
assert(normalize("Café!") === "cafe", "accents and punctuation go")
assert(
  normalize(normalize("Pani-Puri ")) === normalize("pani puri"),
  "idempotent"
)
console.log("✓ Normalisation")

// Hints
assert(maskWord("pani puri") === "____ ____", "letters masked, spaces kept")
assert(maskWord("auto-rickshaw") === "____-________", "hyphens kept")
assert(
  revealedCount("____ ____") === 0 && revealedCount("_a__ _u__") === 2,
  "revealed letters counted"
)
assert(
  unrevealedIndexes("_a__ _u__", "pani puri").join() === "0,2,3,5,7,8",
  "indexes still hidden"
)
assert(
  revealAt("____ ____", "pani puri", 1) === "_a__ ____",
  "reveal one letter"
)
assert(
  revealAt("_a__ ____", "pani puri", 1) === "_a__ ____" &&
    revealAt("_a__ ____", "pani puri", 4) === "_a__ ____",
  "no-op on shown / space"
)
let hint = maskWord("upi")
assert(canReveal(hint, "upi"), "can reveal when 3 hidden")
hint = revealAt(hint, "upi", 0)
assert(canReveal(hint, "upi"), "can reveal when 2 hidden")
hint = revealAt(hint, "upi", 2)
assert(
  !canReveal(hint, "upi") && hint === "u_i",
  "the last letter stays hidden"
)
assert(
  revealsDue(1000, 81000, 1000) === 0 && revealsDue(1000, 81000, 40999) === 0,
  "nothing before half time"
)
assert(
  revealsDue(1000, 81000, 41000) === 1 && revealsDue(1000, 81000, 60999) === 1,
  "one at 50%"
)
assert(
  revealsDue(1000, 81000, 61000) === 2 && revealsDue(1000, 81000, 99999) === 2,
  "two from 75%"
)
console.log("✓ Hints")

// Close guesses
assert(
  levenshtein("samosa", "samosa") === 0 && levenshtein("samosa", "samsa") === 1,
  "distance basics"
)
assert(
  levenshtein("kitten", "sitting") === 3 && levenshtein("", "abc") === 3,
  "classic cases"
)
assert(
  isClose("samsa", "samosa") &&
    isClose("samosas", "samosa") &&
    isClose("Samoza", "samosa"),
  "one letter off is close"
)
assert(
  isClose("samo", "samosa") && !isClose("sam", "samosa"),
  "a 60% prefix is close, less isn't"
)
assert(isClose("auto rick", "auto-rickshaw"), "prefix across a hyphen")
assert(
  !isClose("samosa", "samosa") && !isClose("SAMOSA ", "samosa"),
  "the word itself isn't 'close'"
)
assert(!isClose("pizza", "samosa") && !isClose("", "samosa"), "far off / empty")
console.log("✓ Close guesses")

// Scoring
assert(guesserPoints(1000, 1000, 81000) === 500, "instant guess = 500")
assert(guesserPoints(81000, 1000, 81000) === 100, "at the buzzer = 100")
assert(guesserPoints(41000, 1000, 81000) === 300, "half way = 300")
assert(
  guesserPoints(90000, 1000, 81000) === 100 &&
    guesserPoints(0, 1000, 81000) === 500,
  "clamped"
)
assert(
  drawerPoints(0, 3) === 0 &&
    drawerPoints(3, 3) === 300 &&
    drawerPoints(1, 3) === 100 &&
    drawerPoints(2, 3) === 200,
  "drawer share"
)
assert(
  drawerPoints(1, 0) === 0 && drawerPoints(5, 3) === 300,
  "no guessers / never over 300"
)
s = beginDrawing({ ...fresh(4), drawTime: 80 }, "hash", "pani puri", 1000)
assert(
  s.phase === "drawing" &&
    s.wordHash === "hash" &&
    s.hint === "____ ____" &&
    s.wordLen === 9,
  "drawing begins"
)
assert(
  s.drawStartedAt === 1000 && s.drawEndsAt === 81000,
  "clock from now, drawTime long"
)
noUndefined(s)
let pts = turnPoints(s, { b: { at: 1000 }, c: { at: 41000 } }, [])
assert(
  pts.b === 500 && pts.c === 300 && pts.a === 200 && pts.d === undefined,
  "two of three guessed: 500 + 300, drawer 200"
)
pts = turnPoints(s, { b: { at: 1000 }, c: { at: 41000 } }, ["d"])
assert(pts.a === 300, "a gone guesser doesn't dilute the drawer")
pts = turnPoints(s, { b: { at: 1000 } }, ["c", "d"])
assert(pts.a === 300 && pts.b === 500, "one of one")
pts = turnPoints(s, { a: { at: 1000 }, zz: { at: 1000 } }, [])
assert(
  Object.keys(pts).length === 0,
  "the drawer and strangers can't score as guessers"
)
assert(
  Object.keys(turnPoints(s, null, [])).length === 0,
  "nobody guessed: no points"
)
console.log("✓ Scoring")

// Turn end
let t = applyTurnEnd(s, { b: { at: 1000 }, c: { at: 41000 } }, [], 50000)
assert(
  t && t.phase === "turnEnd" && t.turnEndsAt === 50000 + TURN_END_MS,
  "turn ends"
)
assert(
  t!.scores.a === 200 &&
    t!.scores.b === 500 &&
    t!.scores.c === 300 &&
    t!.scores.d === 0,
  "scores banked"
)
assert(
  t!.turnPoints?.b === 500 && t!.turnPoints?.a === 200,
  "turn points kept for the summary"
)
assert(
  applyTurnEnd(t!, { b: { at: 1000 } }, [], 51000) === null,
  "applying twice does nothing"
)
t = applyTurnEnd(s, null, [], 50000)
assert(
  t && t.turnPoints == null && t.scores.a === 0,
  "nobody guessed: no turn points, nothing added"
)
noUndefined(t)
assert(
  everyoneGuessed(s, { b: { at: 1 }, c: { at: 1 }, d: { at: 1 } }, []),
  "all three guessed"
)
assert(
  !everyoneGuessed(s, { b: { at: 1 }, c: { at: 1 } }, []),
  "one still to guess"
)
assert(
  everyoneGuessed(s, { b: { at: 1 }, c: { at: 1 } }, ["d"]),
  "a gone player isn't waited for"
)
console.log("✓ Turn end")

// Rotation across rounds, skipping players who left
assert(
  nextDrawer(["a", "b", "c"], 0, [])!.index === 1 &&
    !nextDrawer(["a", "b", "c"], 0, [])!.wrapped,
  "next seat"
)
assert(
  nextDrawer(["a", "b", "c"], 2, [])!.index === 0 &&
    nextDrawer(["a", "b", "c"], 2, [])!.wrapped,
  "wraps to the first"
)
assert(nextDrawer(["a", "b", "c"], 0, ["b"])!.index === 2, "skips who left")
assert(
  nextDrawer(["a", "b", "c"], 1, ["c"])!.index === 0 &&
    nextDrawer(["a", "b", "c"], 1, ["c"])!.wrapped,
  "skipping the last one wraps"
)
assert(nextDrawer(["a", "b"], 0, ["a", "b"]) === null, "nobody left to draw")
s = {
  ...fresh(3),
  rounds: 2,
  phase: "turnEnd",
  hint: "__",
  wordHash: "h",
  turnPoints: { a: 1 },
}
let n = advanceTurn(s, [], 7000)
assert(
  n.phase === "choosing" &&
    n.drawer === "b" &&
    n.turnIndex === 1 &&
    n.round === 1 &&
    n.turn === 2 &&
    n.turnAt === 7000,
  "b draws next"
)
assert(
  n.hint == null &&
    n.wordHash == null &&
    n.turnPoints == null &&
    n.revealed == null,
  "turn fields cleared"
)
noUndefined(n)
n = advanceTurn(n, [], 8000)
assert(n.drawer === "c" && n.round === 1, "c draws, still round 1")
n = advanceTurn(n, [], 9000)
assert(
  n.drawer === "a" && n.round === 2 && n.turn === 4,
  "round 2 starts with a"
)
n = advanceTurn(n, ["b"], 10000)
assert(n.drawer === "c" && n.round === 2, "b left: skipped as drawer")
n = advanceTurn(n, ["b"], 11000)
assert(
  n.phase === "over" && n.endReason === "rounds_over",
  "after the last round the game is over"
)
n = advanceTurn({ ...fresh(3), round: 1 }, ["b", "c"], 12000)
assert(
  n.phase === "over" && n.endReason === "abandoned",
  "alone: over, abandoned"
)
n = advanceTurn({ ...fresh(4), turnIndex: 1, drawer: "b" }, ["c", "d"], 13000)
assert(
  n.phase === "choosing" && n.drawer === "a" && n.round === 2,
  "two left of four: wraps to a, round 2"
)
console.log("✓ Rotation")

// Results and ties
s = { ...fresh(4), scores: { a: 300, b: 700, c: 700, d: 0 } }
assert(
  rankingOf(s).join() === "b,c,a,d",
  "ranking by score, ties in seat order"
)
let r = resultOf(s, [])
assert(
  r.winnerIds.join() === "b,c" &&
    r.reason === "rounds_over" &&
    r.ranking?.join() === "b,c,a,d",
  "tied winners both win"
)
assert(
  r.scores?.d === 0 && Object.keys(r.scores ?? {}).length === 4,
  "every score reported"
)
r = resultOf({ ...s, endReason: "abandoned" }, ["b", "c"])
assert(
  r.winnerIds.join() === "a,d" &&
    r.ranking?.join() === "a,d,b,c" &&
    r.reason === "abandoned",
  "abandoned: whoever stayed wins"
)
r = resultOf({ ...fresh(2), scores: { a: 0, b: 0 } }, [])
assert(r.winnerIds.join() === "a,b", "all on zero: shared")
console.log("✓ Results")

// Presence
const now = 1_000_000
const here = (uid: string, seat: number) =>
  player(uid, seat, { online: true, lastSeen: now })
const away = (uid: string, seat: number, ms: number) =>
  player(uid, seat, { online: false, lastSeen: now - ms })
assert(
  goneUids(
    [
      here("a", 0),
      away("b", 1, 1000),
      away("c", 2, ABANDON_MS),
      player("d", 3, { left: true }),
    ],
    now
  ).join() === "c,d",
  "gone = left or offline a minute"
)
console.log("✓ Presence")

// The referee
const startedAt = now - 5000
const ps = [here("a", 0), here("b", 1), here("c", 2)]
s = { ...fresh(3), turnAt: now - 1000 }
assert(
  refereeAction(s, ps, null, now, startedAt) === null,
  "choosing: nothing to do yet"
)
assert(
  refereeAction(
    s,
    ps,
    null,
    now - 1000 + CHOOSE_MS + CHOOSE_SKIP_ANY_MS,
    startedAt
  ) === "advance",
  "drawer never picked: skip"
)
assert(
  refereeAction(
    s,
    ps,
    null,
    now - 1000 + CHOOSE_MS + CHOOSE_SKIP_OFFLINE_MS,
    startedAt
  ) === null,
  "an online drawer gets the full grace"
)
assert(
  refereeAction(
    s,
    [away("a", 0, 1000), here("b", 1), here("c", 2)],
    null,
    now - 1000 + CHOOSE_MS + CHOOSE_SKIP_OFFLINE_MS,
    startedAt
  ) === "advance",
  "offline drawer: skipped sooner"
)
assert(
  refereeAction(
    s,
    [player("a", 0, { left: true }), here("b", 1), here("c", 2)],
    null,
    now,
    startedAt
  ) === "advance",
  "drawer left: skip now"
)
assert(
  refereeAction(
    { ...s, turnAt: 0 },
    ps,
    null,
    startedAt + CHOOSE_MS + CHOOSE_SKIP_ANY_MS,
    startedAt
  ) === "advance",
  "first turn counts from the start"
)
s = beginDrawing({ ...fresh(3), turn: 2 }, "h", "samosa", now)
assert(
  refereeAction(s, ps, { b: { at: now + 1 } }, now + 5000, startedAt) === null,
  "drawing: one still guessing"
)
assert(
  refereeAction(
    s,
    ps,
    { b: { at: now + 1 }, c: { at: now + 2 } },
    now + 5000,
    startedAt
  ) === "turnEnd",
  "everyone guessed"
)
assert(
  refereeAction(
    s,
    ps,
    { b: { at: now + 1 } },
    s.drawEndsAt! + DRAW_GRACE_MS,
    startedAt
  ) === "turnEnd",
  "time's up (after the grace)"
)
assert(
  refereeAction(s, ps, null, s.drawEndsAt!, startedAt) === null,
  "not before the grace"
)
assert(
  refereeAction(
    s,
    [player("a", 0, { left: true }), here("b", 1), here("c", 2)],
    null,
    now + 1,
    startedAt
  ) === "turnEnd",
  "drawer left: turn ends"
)
assert(
  refereeAction(
    s,
    [here("a", 0), away("b", 1, ABANDON_MS), here("c", 2)],
    { c: { at: now } },
    now + 1,
    startedAt
  ) === "turnEnd",
  "a guesser gone a minute isn't waited for"
)
assert(
  refereeAction(
    s,
    [
      here("a", 0),
      player("b", 1, { left: true }),
      player("c", 2, { left: true }),
    ],
    null,
    now,
    startedAt
  ) === "advance",
  "alone: wrap up"
)
const te = applyTurnEnd(s, { b: { at: now } }, [], now + 10)!
assert(
  refereeAction(te, ps, null, now + 10, startedAt) === null &&
    refereeAction(te, ps, null, te.turnEndsAt!, startedAt) === "advance",
  "next turn after the summary"
)
assert(
  refereeAction({ ...te, phase: "over" }, ps, null, now, startedAt) === "end",
  "over: end the room"
)
console.log("✓ Referee")

console.log("\n🎉 ALL SCRIBBLE TESTS PASSED!")
