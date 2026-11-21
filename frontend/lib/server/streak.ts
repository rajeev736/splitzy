import { timingSafeEqual } from "node:crypto"

import type { App } from "firebase-admin/app"
import { FieldPath, getFirestore, type Firestore, type Transaction } from "firebase-admin/firestore"

import {
  STREAK_BADGES,
  cycleDay,
  dailyCoins,
  dayBefore,
  dayKey,
  milestonesCrossed,
  nextRun,
  streakBadgeId,
  type StreakMilestone,
} from "@/lib/live/streak"
import type { CoinTx, Wallet } from "@/lib/types"
import { notifyFromServer } from "./push"

/*
 * The play streak, its badges and the daily reward, on the server (admin SDK):
 * the wallet fields they use are written only here (see lib/live/streak).
 */

/** A coin history line (wallets/{uid}/txs/{id}), shaped like services/fun `coinTx`. */
function coinLine(fs: Firestore, uid: string, id: string, kind: CoinTx["kind"], amount: number, label: string, ref?: string) {
  const data: CoinTx = { id, kind, amount, label: label.slice(0, 120), createdAt: new Date().toISOString(), ...(ref ? { ref } : {}) }
  return { ref: fs.doc(`wallets/${uid}/txs/${id}`), data }
}

/* ── Play streak ──────────────────────────────────────────────────────── */

/** The wallet's play streak after a game counted on `today` (once a day it moves; the same day it stays). */
export function playStreakStep(w: Pick<Wallet, "playStreak" | "bestPlayStreak" | "playDay">, today: string) {
  const before = w.playStreak ?? 0
  const playStreak = nextRun(w.playDay, w.playStreak, today)
  return {
    fields: { playStreak, bestPlayStreak: Math.max(w.bestPlayStreak ?? 0, playStreak), playDay: today },
    // Only a streak that grew today can reach a milestone (a restart from 1 never does)
    crossed: w.playDay === today ? [] : milestonesCrossed(before, playStreak),
  }
}

/**
 * Inside a transaction, before any write: which of these milestones' badges
 * this player doesn't have yet (each badge — and its coins — once ever).
 */
export async function unearnedStreakBadges(
  tx: Transaction,
  fs: Firestore,
  uid: string,
  crossed: StreakMilestone[]
): Promise<StreakMilestone[]> {
  if (crossed.length === 0) return []
  const snaps = await Promise.all(crossed.map((d) => tx.get(fs.doc(`users/${uid}/badges/${streakBadgeId(d)}`))))
  return crossed.filter((_, i) => !snaps[i].exists)
}

/** The coins these streak badges pay. */
export const streakBonus = (earned: StreakMilestone[]) => earned.reduce((sum, d) => sum + STREAK_BADGES[d].coins, 0)

/**
 * Inside the same transaction: the badge docs (users/{uid}/badges/streak_<n>,
 * `{ type: "streak", ref: "<n>", days: n, createdAt }`) and their coin lines.
 * The caller adds `streakBonus(earned)` to the wallet's balance in its own update.
 */
export function writeStreakBadges(tx: Transaction, fs: Firestore, uid: string, earned: StreakMilestone[]) {
  const at = new Date().toISOString()
  for (const days of earned) {
    const id = streakBadgeId(days)
    tx.create(fs.doc(`users/${uid}/badges/${id}`), { type: "streak", ref: String(days), days, createdAt: at })
    const b = STREAK_BADGES[days]
    const line = coinLine(fs, uid, `tx_${id}`, "streak", b.coins, `${b.name} — ${days}-day streak`, id)
    tx.set(line.ref, line.data)
  }
}

/** Tells the player about the streak badges they just earned (in-app + push; best effort). */
export async function notifyStreakBadges(app: App, uid: string, earned: StreakMilestone[]) {
  await Promise.all(
    earned.map((days) => {
      const b = STREAK_BADGES[days]
      return notifyFromServer(app, {
        userId: uid,
        title: `🔥 ${b.name} unlocked!`,
        message: `${days} days in a row — +${b.coins.toLocaleString("en-IN")} coins. Keep the streak going!`,
        type: "BADGE",
        data: { badge: streakBadgeId(days), streak: days },
      }).catch(() => undefined)
    })
  )
}

/* ── Daily reward ─────────────────────────────────────────────────────── */

export type DailyOutcome =
  | { ok: true; claimed: boolean; coins: number; day: number; run: number; balance: number }
  | { ok: false; status: number; reason: string }

/**
 * The daily reward, the first time the Games side opens each IST day: the
 * coins of that day of the 7-day cycle (a missed day starts it again at day 1).
 * Asking again the same day just tells where the cycle stands.
 */
export async function claimDaily(app: App, uid: string, now = Date.now()): Promise<DailyOutcome> {
  const fs = getFirestore(app)
  const ref = fs.doc(`wallets/${uid}`)
  const today = dayKey(now)
  return fs.runTransaction(async (tx): Promise<DailyOutcome> => {
    const snap = await tx.get(ref)
    if (!snap.exists) return { ok: false, status: 409, reason: "no wallet" }
    const w = snap.data() as Wallet
    const balance = w.balance ?? 0
    if (w.dailyDay === today) {
      const run = Math.max(1, w.dailyRun ?? 1)
      return { ok: true, claimed: false, coins: 0, day: cycleDay(run), run, balance }
    }
    const run = nextRun(w.dailyDay, w.dailyRun, today)
    const coins = dailyCoins(run)
    const day = cycleDay(run)
    tx.update(ref, { balance: balance + coins, dailyDay: today, dailyRun: run, lastTx: `daily:${today}` })
    // One line a day (the id is the day, so it can't be written twice)
    const line = coinLine(fs, uid, `tx_daily_${today}`, "daily", coins, `Daily reward — day ${day}`, today)
    tx.set(line.ref, line.data)
    return { ok: true, claimed: true, coins, day, run, balance: balance + coins }
  })
}

/* ── Streak reminder (cron) ───────────────────────────────────────────── */

/** `Authorization: Bearer ${CRON_SECRET}` (how Vercel calls cron jobs). */
export function isCronRequest(request: Request): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  const got = Buffer.from(request.headers.get("authorization") ?? "")
  const want = Buffer.from(`Bearer ${secret}`)
  return got.length === want.length && timingSafeEqual(got, want)
}

const PAGE = 300
const SEND_AT_ONCE = 25

/**
 * Everyone whose streak ends at midnight tonight (IST): their last game was
 * yesterday, none yet today. Each hears it once a day (the notification's id
 * is the day), in-app and on their phones. Stops early, before `budgetMs`, if
 * there are too many — run again the same day, it skips whoever already heard.
 */
export async function remindStreaks(app: App, now = Date.now(), budgetMs = 240_000) {
  const fs = getFirestore(app)
  const today = dayKey(now)
  const yesterday = dayBefore(today)
  const startedAt = Date.now()
  let scanned = 0
  let sent = 0
  let after: string | undefined
  let complete = false
  while (Date.now() - startedAt < budgetMs) {
    // Equality on one field, ordered by id: the automatic single-field index serves it
    let q = fs.collection("wallets").where("playDay", "==", yesterday).orderBy(FieldPath.documentId()).select("playStreak").limit(PAGE)
    if (after) q = q.startAfter(after)
    const snap = await q.get()
    scanned += snap.size
    const due = snap.docs
      .map((d) => ({ uid: d.id, days: Number(d.get("playStreak") ?? 0) }))
      .filter((p) => p.days >= 1)
    for (let i = 0; i < due.length; i += SEND_AT_ONCE) {
      const results = await Promise.all(due.slice(i, i + SEND_AT_ONCE).map((p) => remindOne(app, p.uid, p.days, today)))
      sent += results.filter(Boolean).length
    }
    if (snap.size < PAGE) {
      complete = true
      break
    }
    after = snap.docs[snap.size - 1].id
  }
  return { day: today, scanned, sent, complete }
}

async function remindOne(app: App, uid: string, days: number, today: string): Promise<boolean> {
  return notifyFromServer(
    app,
    {
      userId: uid,
      title: `🔥 Your ${days}-day streak ends at midnight`,
      message: `Play one game today to keep your ${days}-day streak going.`,
      type: "STREAK_REMINDER",
      data: { streak: days },
    },
    { id: `notif_streak_${today}_${uid}` }
  ).catch(() => false)
}
