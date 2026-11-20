import type { HostedAction, HostedEngine, HostedMove, HostedStart, HostedStep, HostedTable } from "./hosted"
import type { LiveResult } from "./types"

/**
 * Color Clash: the shedding card game with coloured number cards, played by
 * the standard rules, for 2–6 players. The server runs it (lib/live/hosted):
 *
 *   state (public)   the table: top card and colour, how many cards everyone
 *                    holds, whose turn, direction, round wins, what just happened
 *   secret/{uid}     your own hand (card ids) — nothing else
 *   hidden           the draw pile (in order) and the discard pile — server only
 *
 * Rules choices (see also the report in the PR):
 * - 108 cards: per colour one 0, two each of 1–9, two Skip, two Reverse, two
 *   Draw Two; plus 4 Wild and 4 Wild Draw Four. 7 each.
 * - First card: a Wild Draw Four goes back in the pile and another is turned;
 *   a Wild lets the first player choose the colour (phase "choose"), then they
 *   play; Skip skips the first player; Reverse: the dealer starts and play runs
 *   the other way; Draw Two: the first player draws 2 and is skipped.
 * - No stacking: Draw Two / Wild Draw Four make the next player draw and lose
 *   their turn. With two players Reverse works as Skip.
 * - Wild Draw Four may be played any time and can be challenged (phase
 *   "challenge"): the next player either takes the 4 ("accept") or challenges.
 *   If the player of the +4 held a card of the colour in play they draw 4
 *   instead and the challenger plays their turn as normal; if not, the
 *   challenger draws 6 and loses their turn.
 * - Draw one when you can't (or don't want to) play; if it's playable you may
 *   play it right away (only that card), or pass.
 * - "One!": call it when you're down to one card (or on your turn with two).
 *   Going down to one without calling leaves you open: anyone may "catch" you
 *   (you draw 2) until the next player acts, or until you call it yourself.
 * - Scoring: numbers face value, Skip / Reverse / Draw Two 20, Wilds 50; the
 *   round winner scores everyone else's cards.
 * - Best of 3 / 5: the match ends as soon as someone has won a majority of
 *   the rounds; if all rounds are played without one (3+ players), most round
 *   wins takes it, then most points. Tied leaders share the win.
 * - Idle turns pass after 45 s (draw one and pass; a pending +4 is taken;
 *   a colour to choose is picked for you) via `{ type: "tick" }`. Players
 *   who left are skipped; the last one in wins.
 */

/* ── Cards ────────────────────────────────────────────────────────────── */

export const CC_COLOURS = ["red", "yellow", "green", "blue"] as const
export type CCColour = (typeof CC_COLOURS)[number]
export type CCKind = "num" | "skip" | "reverse" | "draw2" | "wild" | "wild4"

export interface CCCard {
  id: number
  /** null for the Wilds. */
  colour: CCColour | null
  kind: CCKind
  /** 0–9 for number cards, -1 otherwise. */
  value: number
}

export const CC_DECK_SIZE = 108
export const CC_HAND_SIZE = 7
/** An idle turn passes after this long. */
export const CC_TURN_MS = 45_000
/** The break between rounds before the next one deals itself. */
export const CC_ROUND_BREAK_MS = 6_000

const CARDS: readonly CCCard[] = (() => {
  const out: CCCard[] = []
  const add = (colour: CCColour | null, kind: CCKind, value = -1) => out.push({ id: out.length, colour, kind, value })
  for (const colour of CC_COLOURS) {
    add(colour, "num", 0)
    for (let v = 1; v <= 9; v++) {
      add(colour, "num", v)
      add(colour, "num", v)
    }
    for (const kind of ["skip", "reverse", "draw2"] as const) {
      add(colour, kind)
      add(colour, kind)
    }
  }
  for (let i = 0; i < 4; i++) add(null, "wild")
  for (let i = 0; i < 4; i++) add(null, "wild4")
  return out
})()

/** The card behind an id (0–107). */
export function cardOf(id: number): CCCard {
  const c = CARDS[id]
  if (!c) throw new Error("No such card")
  return c
}

export const isWild = (c: CCCard) => c.kind === "wild" || c.kind === "wild4"
export const isColour = (v: unknown): v is CCColour => typeof v === "string" && (CC_COLOURS as readonly string[]).includes(v)

/** Can `card` go on `top` while `colour` is the colour in play? */
export function canPlayOn(card: CCCard, top: CCCard, colour: CCColour): boolean {
  if (isWild(card)) return true
  if (card.colour === colour) return true
  if (card.kind === "num") return top.kind === "num" && top.value === card.value
  return card.kind === top.kind
}

/** Points a card counts for the round winner. */
export function cardPoints(c: CCCard): number {
  if (c.kind === "num") return c.value
  if (isWild(c)) return 50
  return 20
}

/** Short name, e.g. "Red 7", "Blue Skip", "Wild +4". */
export function cardName(id: number): string {
  const c = cardOf(id)
  const colour = c.colour ? c.colour[0].toUpperCase() + c.colour.slice(1) : ""
  switch (c.kind) {
    case "num":
      return `${colour} ${c.value}`
    case "skip":
      return `${colour} Skip`
    case "reverse":
      return `${colour} Reverse`
    case "draw2":
      return `${colour} +2`
    case "wild":
      return "Wild"
    case "wild4":
      return "Wild +4"
  }
}

/* ── Table ────────────────────────────────────────────────────────────── */

export type CCPhase = "play" | "choose" | "challenge" | "roundOver" | "over"

/** What just happened (one step may hold several, e.g. a +2 and the draw it caused) — for animations and the log line. */
export type CCEvent =
  | { t: "deal"; round: number; card: number }
  | { t: "play"; by: string; card: number; colour?: CCColour }
  | { t: "draw"; by: string; n: number; why: "draw" | "penalty" | "catch" | "challenge" | "timeout" }
  | { t: "pass"; by: string }
  | { t: "skip"; by: string }
  | { t: "reverse"; dir: 1 | -1 }
  | { t: "choose"; by: string; colour: CCColour }
  | { t: "one"; by: string }
  | { t: "catch"; by: string; target: string }
  | { t: "challenge"; by: string; target: string; guilty: boolean }
  | { t: "timeout"; by: string }
  | { t: "reshuffle"; n: number }
  | { t: "roundWon"; by: string; points: number }

export interface ColorClashState extends HostedTable {
  phase: CCPhase
  /** Players in seat order (including any who left). */
  order: string[]
  /** 1: on to the next seat; -1: back the other way. */
  direction: 1 | -1
  dealer: string
  /** The discard pile's top card (id). */
  top: number
  /** The colour in play (a Wild's chosen colour). Meaningless in phase "choose". */
  colour: CCColour
  discardCount: number
  drawCount: number
  /** How many cards each player holds. */
  counts: Record<string, number>
  /** Who has called "One!" (and still counts on it). */
  one?: Record<string, boolean>
  /** Down to one card without calling it: anyone may catch them, until the next player acts. */
  exposed?: string
  /** The turn's player drew a playable card: they may play it (the last card in their hand) or pass. */
  drew?: boolean
  /** A Wild +4 waiting on the next player (`turn`): accept or challenge. `colour`: the colour in play before it. */
  challenge?: { by: string; colour: CCColour }
  round: number
  /** Best of (1, 3 or 5). */
  rounds: number
  wins: Record<string, number>
  points: Record<string, number>
  /** The round just won (phase "roundOver" / "over"): everyone's cards are shown. */
  summary?: { winner: string; points: number; hands: Record<string, number[]> }
  last?: CCEvent[]
  result?: LiveResult
}

/** Your private part (rooms/{code}/secret/{uid}): your hand, in the order drawn. */
export interface ColorClashHand {
  hand: number[]
}

/** The server's own: the draw pile (top = last) and the discard pile (top = last). */
export interface ColorClashHidden {
  draw: number[]
  discard: number[]
  /** The card just drawn that may still be played. */
  drawn?: number
}

type Step = HostedStep<ColorClashState, ColorClashHand, ColorClashHidden>

/** Wins needed to take a best-of outright. */
export const winsNeeded = (rounds: number) => Math.floor(rounds / 2) + 1

const roundsOf = (v: unknown) => {
  const n = Number(v)
  return n === 3 || n === 5 ? n : 1
}

/* ── Engine internals ─────────────────────────────────────────────────── */

interface Ctx {
  s: ColorClashState
  hands: Record<string, number[]>
  hidden: ColorClashHidden
  gone: ReadonlySet<string>
  rand: () => number
  now: number
}

function shuffle<T>(xs: T[], rand: () => number): T[] {
  for (let i = xs.length - 1; i > 0; i--) {
    const j = Math.min(i, Math.floor(rand() * (i + 1)))
    ;[xs[i], xs[j]] = [xs[j], xs[i]]
  }
  return xs
}

const activeOf = (c: Ctx) => c.s.order.filter((p) => !c.gone.has(p))

/** The player `steps` turns on from `from` (in the direction of play), skipping who left. */
function nextFrom(c: Ctx, from: string, steps = 1): string {
  const { order, direction } = c.s
  const n = order.length
  let i = order.indexOf(from)
  if (i < 0) i = 0
  let at = from
  for (let k = 0; k < steps; k++) {
    for (let guard = 0; guard < n; guard++) {
      i = (((i + direction) % n) + n) % n
      if (!c.gone.has(order[i])) break
    }
    at = order[i]
  }
  return at
}

function event(c: Ctx, e: CCEvent) {
  ;(c.s.last ??= []).push(e)
}

function beginTurn(c: Ctx, who: string) {
  c.s.turn = who
  c.s.turnAt = c.now
  delete c.s.drew
  delete c.hidden.drawn
}

/** Takes up to `n` cards off the draw pile into `who`'s hand (shuffling the discards back in when it runs out). */
function drawCards(c: Ctx, who: string, n: number, why: Extract<CCEvent, { t: "draw" }>["why"]): number[] {
  const got: number[] = []
  for (let k = 0; k < n; k++) {
    if (c.hidden.draw.length === 0) {
      const rest = c.hidden.discard.slice(0, -1)
      if (rest.length === 0) break
      c.hidden.discard = c.hidden.discard.slice(-1)
      c.hidden.draw = shuffle(rest, c.rand)
      event(c, { t: "reshuffle", n: rest.length })
    }
    const id = c.hidden.draw.pop()!
    got.push(id)
  }
  ;(c.hands[who] ??= []).push(...got)
  if (got.length) event(c, { t: "draw", by: who, n: got.length, why })
  return got
}

/** Any turn's action ends the window to catch someone who forgot "One!". */
const closeCatchWindow = (c: Ctx) => delete c.s.exposed

function requireTurn(c: Ctx, uid: string, phase: CCPhase) {
  if (c.s.turn !== uid) throw new Error("Not your turn")
  if (c.s.phase !== phase) throw new Error(phase === "play" ? "Not now" : "Not now")
}

/** Deals a round: fresh deck, 7 each, the first card turned. */
function deal(c: Ctx) {
  const s = c.s
  const deck = shuffle(
    Array.from({ length: CC_DECK_SIZE }, (_, i) => i),
    c.rand
  )
  c.hands = Object.fromEntries(s.order.map((p) => [p, [] as number[]]))
  s.direction = 1
  const active = activeOf(c)
  // Dealt one at a time, starting left of the dealer
  const first = nextFrom(c, s.dealer)
  const startAt = Math.max(0, active.indexOf(first))
  for (let k = 0; k < CC_HAND_SIZE; k++)
    for (let i = 0; i < active.length; i++) c.hands[active[(startAt + i) % active.length]].push(deck.pop()!)
  // A Wild +4 can't start: back into the pile, turn another
  let top = deck.pop()!
  while (cardOf(top).kind === "wild4") {
    deck.splice(Math.floor(c.rand() * (deck.length + 1)), 0, top)
    top = deck.pop()!
  }
  c.hidden = { draw: deck, discard: [top] }
  s.top = top
  const card = cardOf(top)
  s.colour = card.colour ?? "red"
  delete s.one
  delete s.exposed
  delete s.drew
  delete s.challenge
  delete s.summary
  s.phase = "play"
  event(c, { t: "deal", round: s.round, card: top })
  switch (card.kind) {
    case "num":
      beginTurn(c, first)
      break
    case "skip":
      event(c, { t: "skip", by: first })
      beginTurn(c, nextFrom(c, s.dealer, 2))
      break
    case "reverse":
      // The dealer starts and play runs the other way (two players: the first player is skipped — the same)
      s.direction = -1
      event(c, { t: "reverse", dir: -1 })
      beginTurn(c, s.dealer)
      break
    case "draw2":
      drawCards(c, first, 2, "penalty")
      event(c, { t: "skip", by: first })
      beginTurn(c, nextFrom(c, s.dealer, 2))
      break
    case "wild":
      s.phase = "choose"
      beginTurn(c, first)
      break
  }
}

function matchDecided(c: Ctx) {
  const { s } = c
  if (s.round >= s.rounds) return true
  const need = winsNeeded(s.rounds)
  return s.order.some((p) => (s.wins[p] ?? 0) >= need)
}

/** The match result: most round wins, then most points; tied leaders share it. */
export function colorClashResult(s: ColorClashState, gone: ReadonlySet<string>, reason = "rounds_over"): LiveResult {
  const active = s.order.filter((p) => !gone.has(p))
  const key = (p: string) => (s.wins[p] ?? 0) * 1_000_000 + (s.points[p] ?? 0)
  const ranking = [...s.order].sort((a, b) => Number(gone.has(a)) - Number(gone.has(b)) || key(b) - key(a))
  const scores = Object.fromEntries(s.order.map((p) => [p, s.points[p] ?? 0]))
  const stats = Object.fromEntries(s.order.map((p) => [p, { rounds: s.wins[p] ?? 0, points: s.points[p] ?? 0 }]))
  let winnerIds: string[]
  if (active.length === 0) {
    winnerIds = []
    reason = "everyone_left"
  } else if (active.length === 1) {
    winnerIds = active
    if (reason !== "rounds_over") reason = "abandoned"
  } else {
    const best = Math.max(...active.map(key))
    const top = active.filter((p) => key(p) === best)
    winnerIds = top.length === active.length ? [] : top
    if (winnerIds.length === 0) reason = "draw"
  }
  return { winnerIds, ranking, scores, reason, stats }
}

function finishMatch(c: Ctx, reason: string) {
  c.s.phase = "over"
  c.s.turn = ""
  delete c.s.challenge
  delete c.s.exposed
  delete c.s.drew
  delete c.hidden.drawn
  c.s.result = colorClashResult(c.s, c.gone, reason)
}

/** `who` went out: they score everyone's cards; the match may be over. */
function roundWon(c: Ctx, who: string) {
  const { s } = c
  let points = 0
  for (const p of s.order) if (p !== who) for (const id of c.hands[p] ?? []) points += cardPoints(cardOf(id))
  s.points[who] = (s.points[who] ?? 0) + points
  s.wins[who] = (s.wins[who] ?? 0) + 1
  s.summary = { winner: who, points, hands: Object.fromEntries(s.order.map((p) => [p, [...(c.hands[p] ?? [])]])) }
  event(c, { t: "roundWon", by: who, points })
  delete s.challenge
  delete s.exposed
  delete s.drew
  delete c.hidden.drawn
  if (matchDecided(c)) return finishMatch(c, "rounds_over")
  s.phase = "roundOver"
  s.turn = ""
  s.turnAt = c.now
}

function nextRound(c: Ctx) {
  c.s.round += 1
  // The deal moves one seat on (to the next player still in)
  const order = c.s.order
  const i = order.indexOf(c.s.dealer)
  let dealer = c.s.dealer
  for (let k = 1; k <= order.length; k++) {
    const p = order[(i + k) % order.length]
    if (!c.gone.has(p)) {
      dealer = p
      break
    }
  }
  c.s.dealer = dealer
  deal(c)
}

function play(c: Ctx, uid: string, card: unknown, colour: unknown) {
  const { s } = c
  requireTurn(c, uid, "play")
  if (typeof card !== "number") throw new Error("Pick a card")
  const hand = c.hands[uid] ?? []
  const at = hand.indexOf(card)
  if (at < 0) throw new Error("You don't have that card")
  if (s.drew && c.hidden.drawn !== card) throw new Error("Play the card you drew, or pass")
  const cc = cardOf(card)
  if (!canPlayOn(cc, cardOf(s.top), s.colour)) throw new Error("That card doesn't match")
  if (isWild(cc) && !isColour(colour)) throw new Error("Choose a colour")
  closeCatchWindow(c)
  const before = s.colour
  hand.splice(at, 1)
  c.hidden.discard.push(card)
  s.top = card
  s.colour = cc.colour ?? (colour as CCColour)
  event(c, isWild(cc) ? { t: "play", by: uid, card, colour: s.colour } : { t: "play", by: uid, card })
  delete s.drew
  delete c.hidden.drawn
  if (hand.length === 1 && !s.one?.[uid]) s.exposed = uid
  const victim = nextFrom(c, uid)

  if (hand.length === 0) {
    // Going out on a draw card still makes the next player draw (it counts for the winner)
    if (cc.kind === "draw2") drawCards(c, victim, 2, "penalty")
    if (cc.kind === "wild4") drawCards(c, victim, 4, "penalty")
    return roundWon(c, uid)
  }

  switch (cc.kind) {
    case "num":
    case "wild":
      return beginTurn(c, victim)
    case "skip":
      event(c, { t: "skip", by: victim })
      return beginTurn(c, nextFrom(c, uid, 2))
    case "reverse": {
      s.direction = s.direction === 1 ? -1 : 1
      event(c, { t: "reverse", dir: s.direction })
      if (activeOf(c).length === 2) {
        // Two players: works as a Skip — your turn again
        event(c, { t: "skip", by: victim })
        return beginTurn(c, uid)
      }
      return beginTurn(c, nextFrom(c, uid))
    }
    case "draw2":
      drawCards(c, victim, 2, "penalty")
      event(c, { t: "skip", by: victim })
      return beginTurn(c, nextFrom(c, uid, 2))
    case "wild4":
      s.phase = "challenge"
      s.challenge = { by: uid, colour: before }
      return beginTurn(c, victim)
  }
}

/** The +4's target takes the four and loses the turn. */
function acceptFour(c: Ctx, why: "penalty" | "timeout" = "penalty") {
  const victim = c.s.turn
  c.s.phase = "play"
  delete c.s.challenge
  drawCards(c, victim, 4, why === "timeout" ? "timeout" : "penalty")
  event(c, { t: "skip", by: victim })
  beginTurn(c, nextFrom(c, victim))
}

function challengeFour(c: Ctx, uid: string) {
  const { s } = c
  requireTurn(c, uid, "challenge")
  const ch = s.challenge
  if (!ch) throw new Error("Nothing to challenge")
  closeCatchWindow(c)
  const guilty = (c.hands[ch.by] ?? []).some((id) => cardOf(id).colour === ch.colour)
  event(c, { t: "challenge", by: uid, target: ch.by, guilty })
  s.phase = "play"
  delete s.challenge
  if (guilty) {
    // Caught: they take the four, and you play your turn as normal
    drawCards(c, ch.by, 4, "challenge")
    beginTurn(c, uid)
  } else {
    drawCards(c, uid, 6, "challenge")
    event(c, { t: "skip", by: uid })
    beginTurn(c, nextFrom(c, uid))
  }
}

function drawOne(c: Ctx, uid: string, why: "draw" | "timeout" = "draw") {
  const { s } = c
  closeCatchWindow(c)
  const got = drawCards(c, uid, 1, why)
  const card = got[0]
  if (why === "draw" && card !== undefined && canPlayOn(cardOf(card), cardOf(s.top), s.colour)) {
    // Playable: theirs to play now (or pass); the turn's clock keeps running
    s.drew = true
    c.hidden.drawn = card
    return
  }
  if (card === undefined) event(c, { t: "pass", by: uid })
  beginTurn(c, nextFrom(c, uid))
}

/** The most common colour in a hand (a Wild chosen for an idle player). */
function favouriteColour(hand: number[], rand: () => number): CCColour {
  const n: Record<CCColour, number> = { red: 0, yellow: 0, green: 0, blue: 0 }
  for (const id of hand) {
    const col = cardOf(id).colour
    if (col) n[col]++
  }
  const best = Math.max(...Object.values(n))
  const tops = CC_COLOURS.filter((k) => n[k] === best)
  return tops[Math.min(tops.length - 1, Math.floor(rand() * tops.length))]
}

/** The clock: returns whether anything changed. */
function tick(c: Ctx): boolean {
  const { s } = c
  if (s.phase === "roundOver") {
    if (c.now - s.turnAt < CC_ROUND_BREAK_MS) return false
    nextRound(c)
    return true
  }
  const who = s.turn
  if (!who) return false
  const left = c.gone.has(who)
  if (!left && c.now - s.turnAt < CC_TURN_MS) return false
  closeCatchWindow(c)
  if (!left) event(c, { t: "timeout", by: who })
  if (s.phase === "challenge") {
    if (left) {
      s.phase = "play"
      delete s.challenge
      event(c, { t: "skip", by: who })
      beginTurn(c, nextFrom(c, who))
    } else acceptFour(c, "timeout")
    return true
  }
  if (s.phase === "choose") {
    const colour = favouriteColour(c.hands[who] ?? [], c.rand)
    s.colour = colour
    s.phase = "play"
    event(c, { t: "choose", by: who, colour })
  }
  if (left) {
    event(c, { t: "skip", by: who })
    beginTurn(c, nextFrom(c, who))
  } else if (s.drew) {
    event(c, { t: "pass", by: who })
    beginTurn(c, nextFrom(c, who))
  } else drawOne(c, who, "timeout")
  return true
}

/** Counts, flags and the step number, after every change. Strips `undefined` (the database refuses it). */
function commit(c: Ctx): Step {
  const { s } = c
  s.seq += 1
  for (const p of s.order) s.counts[p] = (c.hands[p] ??= []).length
  s.drawCount = c.hidden.draw.length
  s.discardCount = c.hidden.discard.length
  if (s.one) {
    for (const p of Object.keys(s.one)) {
      const n = s.counts[p] ?? 0
      const keep = n === 1 || (n === 2 && s.turn === p && s.phase === "play")
      if (!keep) delete s.one[p]
    }
    if (Object.keys(s.one).length === 0) delete s.one
  }
  if (s.exposed && (s.counts[s.exposed] !== 1 || s.one?.[s.exposed] || s.phase === "roundOver" || s.phase === "over"))
    delete s.exposed
  if (s.last && s.last.length === 0) delete s.last
  const secrets = Object.fromEntries(s.order.map((p) => [p, { hand: c.hands[p] }]))
  return JSON.parse(JSON.stringify({ state: s, secrets, hidden: c.hidden })) as Step
}

/** The database drops empty lists and maps: read everything back defensively. */
function load(input: HostedMove<ColorClashState, ColorClashHand, ColorClashHidden>): Ctx {
  const s = JSON.parse(JSON.stringify(input.state)) as ColorClashState
  s.order = s.order ?? []
  s.counts = s.counts ?? {}
  s.wins = s.wins ?? {}
  s.points = s.points ?? {}
  const list = (v: unknown): number[] => (Array.isArray(v) ? v.filter((x) => typeof x === "number") : v && typeof v === "object" ? Object.values(v).filter((x): x is number => typeof x === "number") : [])
  const hands = Object.fromEntries(s.order.map((p) => [p, list(input.secrets?.[p]?.hand)]))
  const h = (input.hidden ?? {}) as Partial<ColorClashHidden>
  const hidden: ColorClashHidden = { draw: list(h.draw), discard: list(h.discard) }
  if (typeof h.drawn === "number") hidden.drawn = h.drawn
  delete s.last
  return { s, hands, hidden, gone: new Set(input.gone ?? []), rand: input.rand, now: input.now }
}

/* ── Engine ───────────────────────────────────────────────────────────── */

function start(input: HostedStart): Step {
  const order = [...input.players]
  if (order.length < 2) throw new Error("Need at least 2 players")
  const zero = () => Object.fromEntries(order.map((p) => [p, 0]))
  const s: ColorClashState = {
    seq: 0,
    phase: "play",
    turn: "",
    turnAt: input.now,
    order,
    direction: 1,
    dealer: order[Math.min(order.length - 1, Math.floor(input.rand() * order.length))],
    top: 0,
    colour: "red",
    discardCount: 0,
    drawCount: 0,
    counts: zero(),
    round: 1,
    rounds: roundsOf(input.options.rounds),
    wins: zero(),
    points: zero(),
  }
  const c: Ctx = { s, hands: {}, hidden: { draw: [], discard: [] }, gone: new Set(), rand: input.rand, now: input.now }
  deal(c)
  return commit(c)
}

function act(input: HostedMove<ColorClashState, ColorClashHand, ColorClashHidden>): Step {
  const action: HostedAction = input.action
  const uid = input.uid
  const c = load(input)
  const { s } = c
  if (s.phase === "over") {
    if (action.type === "tick") return input
    throw new Error("The game is over")
  }
  // Everyone else left: the last one in wins
  if (activeOf(c).length <= 1) {
    finishMatch(c, "abandoned")
    return commit(c)
  }
  if (action.type === "tick") return tick(c) ? commit(c) : input
  if (c.gone.has(uid)) throw new Error("You left this game")
  if (!s.order.includes(uid)) throw new Error("You're not playing")

  switch (action.type) {
    case "play":
      play(c, uid, action.card, action.colour)
      break
    case "draw":
      requireTurn(c, uid, "play")
      if (s.drew) throw new Error("Play the card you drew, or pass")
      drawOne(c, uid)
      break
    case "pass":
      requireTurn(c, uid, "play")
      if (!s.drew) throw new Error("Draw a card first")
      closeCatchWindow(c)
      event(c, { t: "pass", by: uid })
      beginTurn(c, nextFrom(c, uid))
      break
    case "choose": {
      requireTurn(c, uid, "choose")
      if (!isColour(action.colour)) throw new Error("Choose a colour")
      closeCatchWindow(c)
      s.colour = action.colour
      s.phase = "play"
      s.turnAt = c.now
      event(c, { t: "choose", by: uid, colour: action.colour })
      break
    }
    case "accept":
      requireTurn(c, uid, "challenge")
      closeCatchWindow(c)
      acceptFour(c)
      break
    case "challenge":
      challengeFour(c, uid)
      break
    case "one": {
      if (s.phase === "roundOver") throw new Error("Not now")
      const n = c.hands[uid]?.length ?? 0
      if (s.one?.[uid]) throw new Error("Already called")
      const ok = n === 1 || (n === 2 && s.turn === uid && s.phase === "play")
      if (!ok) throw new Error("Only with one card left (or two on your turn)")
      ;(s.one ??= {})[uid] = true
      if (s.exposed === uid) delete s.exposed
      event(c, { t: "one", by: uid })
      break
    }
    case "catch": {
      const target = s.exposed
      if (!target || (c.hands[target]?.length ?? 0) !== 1 || s.one?.[target]) throw new Error("Too late")
      if (typeof action.target === "string" && action.target !== target) throw new Error("Too late")
      if (target === uid) throw new Error("Call \"One!\" instead")
      delete s.exposed
      event(c, { t: "catch", by: uid, target })
      drawCards(c, target, 2, "catch")
      break
    }
    case "next":
      if (s.phase !== "roundOver") throw new Error("Not now")
      nextRound(c)
      break
    default:
      throw new Error("Unknown move")
  }
  return commit(c)
}

export const colorClashEngine: HostedEngine<ColorClashState, ColorClashHand, ColorClashHidden> = { start, act }

/* ── For the screen ───────────────────────────────────────────────────── */

/** Which of `hand` may be played now (by the turn's player, in phase "play"). */
export function playableCards(s: Pick<ColorClashState, "top" | "colour" | "drew">, hand: number[]): Set<number> {
  const top = cardOf(s.top)
  if (s.drew) {
    const last = hand[hand.length - 1]
    return new Set(last !== undefined && canPlayOn(cardOf(last), top, s.colour) ? [last] : [])
  }
  return new Set(hand.filter((id) => canPlayOn(cardOf(id), top, s.colour)))
}

/** A hand sorted for showing: by colour, then number / symbol; Wilds last. */
export function sortHand(hand: number[]): number[] {
  const rank = (id: number) => {
    const c = cardOf(id)
    const col = c.colour ? CC_COLOURS.indexOf(c.colour) : 4
    const kind = ["num", "skip", "reverse", "draw2", "wild", "wild4"].indexOf(c.kind)
    return col * 1000 + kind * 20 + Math.max(0, c.value)
  }
  return [...hand].sort((a, b) => rank(a) - rank(b) || a - b)
}
