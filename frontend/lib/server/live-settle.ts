import type { App } from "firebase-admin/app"
import { getDatabase } from "firebase-admin/database"
import { FieldValue, getFirestore } from "firebase-admin/firestore"

import { countLiveGame, liveGameId, type LiveOutcome } from "@/lib/live/achievements"
import { LIVE_GAMES } from "@/lib/live/games"
import { dayKey } from "@/lib/live/streak"
import type { LiveGameId, RoomMeta, RoomPlayer } from "@/lib/live/types"
import { VERIFIERS } from "@/lib/live/verify"
import type { Challenge, Wallet } from "@/lib/types"
import { notifyFromServer } from "./push"
import { notifyStreakBadges, playStreakStep, streakBonus, unearnedStreakBadges, writeStreakBadges } from "./streak"

/** What a finished game was found to be (liveGames/{code}_{startedAt}; written once, by the server). */
export interface LiveGameRecord {
  code: string
  game: LiveGameId
  startedAt: number
  endedAt: number
  players: string[]
  winners: string[]
  /** true: replayed move by move and it checks out · false: it didn't (voided) · null: a game that can't be replayed. */
  verified: boolean | null
  /** Nothing counts: no XP for anyone, no discount. */
  voided: boolean
  reason?: string
  at: string
}

export interface Counted {
  before: Wallet
  wallet: Wallet
}

export type SettleOutcome =
  | { ok: true; record: LiveGameRecord | null; counted: Counted | null }
  | { ok: false; status: number; reason: string }

/** Plain JSON (Firestore timestamps become strings) for the response. */
const plain = <T,>(v: T): T => JSON.parse(JSON.stringify(v)) as T

/**
 * Settles a live game on the server: once it has ended, checks it (lib/live/verify
 * replays the move log) and records what it was — then counts it on every
 * player's wallet (XP, wins, streak) and, for a discount game, writes the
 * challenge's result. Every step happens once, whoever asks first (any
 * player's device asks as the result opens; the discount's host device too).
 *
 * `forfeit`: you left a game still being played — that's a loss on your record
 * now (the game itself is settled when it ends).
 */
export async function settleLive(app: App, uid: string, code: string, forfeit = false): Promise<SettleOutcome> {
  const rtdb = getDatabase(app)
  const fs = getFirestore(app)
  const room = rtdb.ref(`rooms/${code}`)
  const [metaSnap, playersSnap] = await Promise.all([room.child("meta").get(), room.child("players").get()])
  const meta = metaSnap.val() as RoomMeta | null
  if (!meta) return { ok: false, status: 404, reason: "no room" }
  const players = Object.values((playersSnap.val() ?? {}) as Record<string, RoomPlayer>)
  const me = players.find((p) => p.uid === uid)
  if (!me) return { ok: false, status: 403, reason: "not a player in this room" }
  if (!meta.startedAt) return { ok: false, status: 409, reason: "never started" }
  const id = liveGameId(code, meta.startedAt)

  if (forfeit) {
    if (meta.status !== "playing" || !me.left) return { ok: false, status: 409, reason: "not a forfeit" }
    await countFor(app, uid, id, meta.game, "lose", null)
    return { ok: true, record: null, counted: await takeYours(app, uid, id) }
  }
  if (meta.status !== "ended") return { ok: false, status: 409, reason: "not over yet" }

  // Decide once
  const gameRef = fs.doc(`liveGames/${id}`)
  const record = await fs.runTransaction(async (tx) => {
    const existing = await tx.get(gameRef)
    if (existing.exists) return existing.data() as LiveGameRecord
    const stateSnap = await room.child("state").get()
    const decided = decide(code, meta, players, stateSnap.val())
    tx.set(gameRef, decided)
    return decided
  })
  // The room may now shed its state (the referee waits for this; see cleanupRoom)
  await room.child("meta/settled").set(true).catch(() => undefined)

  // Count it for everyone who played (each once: users/{uid}/live/{id})
  if (!record.voided) {
    await Promise.all(
      record.players.map((p) => {
        const outcome: LiveOutcome = record.winners.includes(p) ? "win" : record.winners.length ? "lose" : "draw"
        return countFor(app, p, id, meta.game, outcome, record.verified).catch(() => null)
      })
    )
  }

  if (meta.challengeId) await settleChallenge(app, meta, code, record).catch((e) => console.error("settle challenge", e))
  return { ok: true, record: plain(record), counted: await takeYours(app, uid, id) }
}

/** Replays the game when it can be replayed; otherwise takes the room's word (fun only — see VERIFIERS). */
function decide(code: string, meta: RoomMeta, players: RoomPlayer[], state: unknown): LiveGameRecord {
  const base = {
    code,
    game: meta.game,
    startedAt: meta.startedAt ?? 0,
    endedAt: meta.endedAt ?? 0,
    players: players.map((p) => p.uid),
    at: new Date().toISOString(),
  }
  const verifier = VERIFIERS[meta.game]
  if (!verifier) {
    return { ...base, winners: meta.result?.winnerIds ?? [], verified: null, voided: false }
  }
  if (!state) return { ...base, winners: [], verified: false, voided: true, reason: "the game's moves were already cleared" }
  let result
  try {
    result = verifier({ code, meta, players, state })
  } catch (e) {
    result = { ok: false as const, reason: e instanceof Error ? e.message : "replay failed" }
  }
  return result.ok
    ? { ...base, winners: result.winners, verified: true, voided: false }
    : { ...base, winners: [], verified: false, voided: true, reason: result.reason.slice(0, 200) }
}

const COUNTERS = ["livePlayed", "liveWins", "streak", "bestStreak", "playStreak"] as const
type LiveCounters = Partial<Record<(typeof COUNTERS)[number], number>>
const countersOf = (w: Partial<Wallet>): LiveCounters =>
  Object.fromEntries(COUNTERS.map((k) => [k, (w as Record<string, number | undefined>)[k] ?? 0]))

/**
 * One player's wallet: the game's counters, once. The record keeps the
 * counters before and after, so that player's own device can show what the
 * game brought them (takeYours) even when someone else's device settled it.
 *
 * Also the daily play streak (lib/server/streak): the first game of an IST day
 * moves it; reaching 7, 30, 50, 100 or 365 days earns that streak badge and its
 * coins, once ever, in the same transaction — and then a notification.
 */
async function countFor(
  app: App,
  uid: string,
  id: string,
  game: LiveGameId,
  outcome: LiveOutcome,
  verified: boolean | null
): Promise<void> {
  const fs = getFirestore(app)
  const walletRef = fs.doc(`wallets/${uid}`)
  const recordRef = fs.doc(`users/${uid}/live/${id}`)
  const earned = await fs.runTransaction(async (tx) => {
    const [w, r] = await Promise.all([tx.get(walletRef), tx.get(recordRef)])
    if (!w.exists || r.exists) return []
    const before = w.data() as Wallet
    const play = playStreakStep(before, dayKey(Date.now()))
    const badges = await unearnedStreakBadges(tx, fs, uid, play.crossed)
    const next = { ...countLiveGame(before, outcome), ...play.fields }
    const bonus = streakBonus(badges)
    tx.set(recordRef, {
      game,
      result: outcome,
      at: new Date().toISOString(),
      verified,
      before: countersOf(before),
      after: countersOf(next),
      seen: false,
    })
    tx.update(walletRef, {
      ...next,
      ...(bonus ? { balance: (before.balance ?? 0) + bonus } : {}),
      liveAt: FieldValue.serverTimestamp(),
      lastTx: `live:${id}:${outcome}`,
    })
    writeStreakBadges(tx, fs, uid, badges)
    return badges
  })
  if (earned.length) await notifyStreakBadges(app, uid, earned)
}

/**
 * What this game brought you, for your result screen — once (a result opened
 * again later shows nothing): your wallet now, with the game's counters before
 * and after it.
 */
async function takeYours(app: App, uid: string, id: string): Promise<Counted | null> {
  const fs = getFirestore(app)
  const recordRef = fs.doc(`users/${uid}/live/${id}`)
  const walletRef = fs.doc(`wallets/${uid}`)
  return fs.runTransaction(async (tx) => {
    const [r, w] = await Promise.all([tx.get(recordRef), tx.get(walletRef)])
    if (!r.exists || !w.exists || r.get("seen") !== false) return null
    tx.update(recordRef, { seen: true })
    const now = w.data() as Wallet
    const before = { ...now, ...(r.get("before") as LiveCounters) } as Wallet
    const after = { ...now, ...(r.get("after") as LiveCounters) } as Wallet
    return plain({ before, wallet: after })
  })
}

/**
 * A discount game's result, from the checked game: the friend who owes won,
 * or nobody did (a voided game gives no discount). Then both sides hear it.
 */
async function settleChallenge(app: App, meta: RoomMeta, code: string, record: LiveGameRecord) {
  const fs = getFirestore(app)
  const ref = fs.doc(`challenges/${meta.challengeId}`)
  const done = await fs.runTransaction(async (tx) => {
    const snap = await tx.get(ref)
    if (!snap.exists) return null
    const c = snap.data() as Challenge
    if (c.game !== "live" || c.status !== "OPEN" || c.roomCode !== code) return null
    const winners = c.players.filter((p) => record.winners.includes(p))
    tx.update(ref, {
      status: "DONE",
      result: { winners },
      resolvedAt: FieldValue.serverTimestamp(),
      liveVerified: record.verified === true,
    })
    return { c, winners }
  })
  if (!done) return
  const { c, winners } = done
  const gameName = c.liveGame ? LIVE_GAMES[c.liveGame].name : "Live game"
  const friend = c.players[0]
  const friendName = c.playerNames?.[friend] ?? "Your friend"
  const won = winners.includes(friend)
  const pct = c.discountPercent
  const voidedNote = record.voided ? " The game's moves didn't check out, so it doesn't count." : ""
  await Promise.all([
    notifyFromServer(app, {
      userId: c.hostId,
      title: `${gameName} result`,
      message: won
        ? `${friendName} won your challenge${pct === 100 ? " — what they owe you will be settled for free." : ` and get ${pct}% off if they pay now.`}`
        : `Nobody beat you — no discount this time.${voidedNote}`,
      type: "CHALLENGE_RESULT",
      data: { challengeId: c.id, actorId: friend, actorName: friendName },
    }),
    notifyFromServer(app, {
      userId: friend,
      title: `${gameName} result`,
      message: won
        ? pct === 100
          ? `You won 100% off! What you owe ${c.hostName} is settled automatically — nothing to pay.`
          : `You won! Pay ${c.hostName} in the next 10 minutes to get ${pct}% off.`
        : `${c.hostName}'s game is over. Better luck next time!${voidedNote}`,
      type: "CHALLENGE_RESULT",
      data: { challengeId: c.id, actorId: c.hostId, actorName: c.hostName },
    }),
  ]).catch(() => undefined)
}
