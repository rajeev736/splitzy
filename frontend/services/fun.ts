import {
  collection,
  deleteField,
  doc,
  getDoc,
  increment,
  runTransaction,
  setDoc,
  updateDoc,
  writeBatch,
} from "firebase/firestore"

import { AppError } from "@/lib/errors"
import {
  BONDS,
  FRAMES,
  GIFTS,
  NUDGE_LABEL,
  PLAN_TEXT_MAX,
  STARTING_COINS,
  SWIFT_WINDOW_MS,
  isFreeFrame,
  type BondId,
  type FrameId,
  type GiftId,
  type LoveNudge,
  type MoodId,
  type PlanKind,
  WELCOME_FRAME,
  BADGES,
  EARLY_BIRD_LIMIT,
  MILESTONE_LABEL,
  isSingleBadge,
  type BadgeId,
} from "@/lib/fun/catalog"
import type { Challenge, CoinTx, Expense, Friendship, Moment, UserProfile, Wallet } from "@/lib/types"
import { friendshipId, getDb, nowIso, sendNotification } from "./shared"

/*
 * Coins, frames, moments between friends, bonds, moods, birthdays and badges.
 * Every coin that moves is checked by firestore.rules against the document
 * that justifies it, written in the same batch (see "Fun" in the rules).
 */

const db = () => {
  const firestore = getDb()
  if (!firestore) throw new AppError("You're offline right now")
  return firestore
}

const newId = (prefix: string) => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

/* ── Wallet ───────────────────────────────────────────────────────────── */

/** A line in your coin history, written with the change it records. */
export function coinTx(uid: string, kind: CoinTx["kind"], amount: number, label: string, ref?: string) {
  const firestore = db()
  const id = newId("tx")
  const data: CoinTx = { id, kind, amount, label: label.slice(0, 120), createdAt: nowIso(), ...(ref ? { ref } : {}) }
  return { ref: doc(collection(firestore, "wallets", uid, "txs"), id), data }
}

/** Creates an empty wallet the first time it's needed (the welcome bonus is claimed). */
export async function ensureWallet(uid: string): Promise<void> {
  const firestore = getDb()
  if (!firestore) return
  const ref = doc(firestore, "wallets", uid)
  const snap = await getDoc(ref)
  if (snap.exists()) return
  const wallet: Wallet = { uid, balance: 0, frames: [], lastTx: "start", createdAt: nowIso() }
  await setDoc(ref, wallet)
}

/** The one-time welcome bonus: 10,000 coins. */
export async function claimWelcomeCoins(uid: string): Promise<void> {
  const firestore = db()
  await ensureWallet(uid)
  const ref = doc(firestore, "wallets", uid)
  await runTransaction(firestore, async (tx) => {
    const wallet = (await tx.get(ref)).data() as Wallet | undefined
    if (!wallet || wallet.welcomed) return
    tx.update(ref, { balance: wallet.balance + STARTING_COINS, welcomed: true, lastTx: "welcome" })
    const line = coinTx(uid, "welcome", STARTING_COINS, "Welcome bonus")
    tx.set(line.ref, line.data)
  })
}

/** The one-time free frame (Rising Star), put on straight away. */
export async function claimWelcomeFrame(uid: string): Promise<void> {
  const firestore = db()
  const ref = doc(firestore, "wallets", uid)
  await runTransaction(firestore, async (tx) => {
    const wallet = (await tx.get(ref)).data() as Wallet | undefined
    if (!wallet || wallet.welcomeFrame || wallet.frames.includes(WELCOME_FRAME)) return
    tx.update(ref, { frames: [...wallet.frames, WELCOME_FRAME], welcomeFrame: true, lastTx: "welcomeframe" })
    const line = coinTx(uid, "frame", 0, `${FRAMES[WELCOME_FRAME].name} frame — free welcome gift`, WELCOME_FRAME)
    tx.set(line.ref, line.data)
  })
  await updateDoc(doc(firestore, "users", uid), { frame: WELCOME_FRAME, updatedAt: nowIso() })
}

export async function buyFrame(uid: string, frameId: FrameId): Promise<void> {
  const price = FRAMES[frameId].price
  if (price === 0) return
  const firestore = db()
  const ref = doc(firestore, "wallets", uid)
  await runTransaction(firestore, async (tx) => {
    const snap = await tx.get(ref)
    if (!snap.exists()) throw new AppError("Your coins are still loading — try again in a moment")
    const wallet = snap.data() as Wallet
    if (wallet.frames.includes(frameId)) return
    if (wallet.balance < price) throw new AppError(`You need ${price - wallet.balance} more coins for this frame`)
    tx.update(ref, { balance: wallet.balance - price, frames: [...wallet.frames, frameId], lastTx: `frame:${frameId}` })
    const line = coinTx(uid, "frame", -price, `${FRAMES[frameId].name} frame`, frameId)
    tx.set(line.ref, line.data)
  })
}

/** Puts on a frame you own (or a free one); `null` takes it off. */
export async function equipFrame(uid: string, frameId: FrameId | null, owned: string[]): Promise<void> {
  if (frameId && !isFreeFrame(frameId) && !owned.includes(frameId)) throw new AppError("Buy this frame first")
  await updateDoc(doc(db(), "users", uid), { frame: frameId ?? "", updatedAt: nowIso() })
}

/* ── Mood & birthday ──────────────────────────────────────────────────── */

export async function setMood(uid: string, mood: MoodId | null): Promise<void> {
  await updateDoc(doc(db(), "users", uid), {
    mood: mood ? { id: mood, at: nowIso() } : deleteField(),
    updatedAt: nowIso(),
  })
}

export interface PrivateProfile {
  /** "YYYY-MM-DD" */
  dob?: string
  showBirthday?: boolean
}

export async function fetchPrivateProfile(uid: string): Promise<PrivateProfile> {
  const firestore = getDb()
  if (!firestore) return {}
  const snap = await getDoc(doc(firestore, "users", uid, "private", "profile"))
  return snap.exists() ? (snap.data() as PrivateProfile) : {}
}

/**
 * Saves the date of birth privately; friends only ever see the day and month,
 * and only while `show` is on.
 */
export async function saveBirthday(uid: string, dob: string | null, show: boolean): Promise<void> {
  const firestore = db()
  if (dob && !/^\d{4}-\d{2}-\d{2}$/.test(dob)) throw new AppError("Pick a valid date")
  const [, month, day] = dob ? dob.split("-").map(Number) : []
  const batch = writeBatch(firestore)
  batch.set(doc(firestore, "users", uid, "private", "profile"), { dob: dob ?? deleteField(), showBirthday: show }, { merge: true })
  batch.update(doc(firestore, "users", uid), {
    birthday: dob && show ? { month, day } : deleteField(),
    updatedAt: nowIso(),
  })
  await batch.commit()
}

/* ── Moments: hugs, kisses, miss-yous, gifts, wishes, plans ───────────── */

export type MomentInput =
  | { type: LoveNudge }
  | { type: "wish" }
  | { type: "gift"; item: GiftId; note?: string; toName?: string }
  | { type: "plan"; kind: PlanKind; text: string }

const momentCopy = (name: string, input: MomentInput): { title: string; message: string } => {
  switch (input.type) {
    case "gift":
      return {
        title: `${name} sent you a gift`,
        message: input.note ? `${GIFTS[input.item].name} · "${input.note}"` : `${GIFTS[input.item].name} — open JoySplit to see it.`,
      }
    case "wish":
      return { title: `${name} wished you a happy birthday`, message: "Have the best day!" }
    case "plan":
      return { title: `${name} has a plan for you two`, message: input.text }
    default:
      return { title: `${name} ${NUDGE_LABEL[input.type].verb}`, message: "Open JoySplit to send one back." }
  }
}

/**
 * Sends a moment to a friend: the moment, the friendship's counter and — for
 * a gift — the coins, all in one batch the security rules check together.
 */
export async function sendMoment(user: UserProfile, friendUid: string, input: MomentInput): Promise<Moment> {
  const firestore = db()
  const fid = friendshipId(user.uid, friendUid)
  const id = newId("m")
  const now = nowIso()

  const moment: Moment = {
    id,
    type: input.type,
    from: user.uid,
    to: friendUid,
    fromName: user.displayName.slice(0, 100),
    createdAt: now,
  }
  if (input.type === "gift") {
    moment.item = input.item
    moment.price = GIFTS[input.item].price
    const note = input.note?.trim().slice(0, 80)
    if (note) moment.note = note
  }
  if (input.type === "plan") {
    const text = input.text.trim().slice(0, PLAN_TEXT_MAX)
    if (!text) throw new AppError("Write what you'd like to do")
    moment.text = text
    moment.kind = input.kind
    moment.status = "PENDING"
  }

  const key = input.type === "gift" ? `g_${input.item}` : input.type
  const batch = writeBatch(firestore)
  batch.set(doc(firestore, "friendships", fid, "moments", id), moment)
  batch.update(doc(firestore, "friendships", fid), {
    [`counts.${user.uid}.${key}`]: increment(1),
    lastMoment: { id, key, by: user.uid, at: now },
    lastActivityAt: now,
  })
  if (input.type === "gift") {
    const walletRef = doc(firestore, "wallets", user.uid)
    const wallet = await getDoc(walletRef)
    const balance = wallet.exists() ? (wallet.data() as Wallet).balance : 0
    if (balance < GIFTS[input.item].price) {
      throw new AppError(`You need ${GIFTS[input.item].price - balance} more coins — win a game to earn some`)
    }
    batch.update(walletRef, { balance: increment(-GIFTS[input.item].price), lastTx: `gift:${fid}:${id}` })
    const line = coinTx(user.uid, "gift", -GIFTS[input.item].price, `${GIFTS[input.item].name} for ${input.toName ?? "a friend"}`, friendUid)
    batch.set(line.ref, line.data)
  }
  try {
    await batch.commit()
  } catch (e) {
    if ((e as { code?: string })?.code === "permission-denied" && (input.type === "hug" || input.type === "kiss" || input.type === "miss")) {
      throw new AppError("Hugs, kisses and miss-yous are for people in a love bond")
    }
    throw e
  }

  // Best effort from here: the moment is sent either way
  if (input.type === "gift") {
    await setDoc(doc(firestore, "users", user.uid, "badges", `bigheart_${fid}_${id}`), {
      type: "bigheart",
      ref: `${fid}/${id}`,
      createdAt: now,
    }).catch(() => {})
  }
  const copy = momentCopy(user.displayName.split(" ")[0], input)
  await sendNotification({
    userId: friendUid,
    type: input.type === "plan" ? "PLAN" : "MOMENT",
    title: copy.title,
    message: copy.message,
    data: {
      actorId: user.uid,
      actorName: user.displayName,
      friendshipId: fid,
      momentId: id,
      momentType: input.type,
      ...(input.type === "gift" ? { gift: input.item } : {}),
    },
    createdAt: now,
  }).catch(() => {})
  return moment
}

/** The friend who was asked answers a plan. */
export async function answerPlan(user: UserProfile, plan: Moment, answer: "YES" | "NO"): Promise<void> {
  const firestore = db()
  const fid = friendshipId(user.uid, plan.from)
  await updateDoc(doc(firestore, "friendships", fid, "moments", plan.id), { status: answer, respondedAt: nowIso() })
  await sendNotification({
    userId: plan.from,
    type: "PLAN_REPLY",
    title: answer === "YES" ? `${user.displayName.split(" ")[0]} is in!` : `${user.displayName.split(" ")[0]} can't make it`,
    message: plan.text ?? "",
    data: { actorId: user.uid, actorName: user.displayName, friendshipId: fid, momentId: plan.id },
  }).catch(() => {})
}

/* ── Bonds ────────────────────────────────────────────────────────────── */

export async function requestBond(user: UserProfile, friendUid: string, bond: BondId): Promise<void> {
  const fid = friendshipId(user.uid, friendUid)
  await updateDoc(doc(db(), "friendships", fid), { bondRequest: { type: bond, from: user.uid, at: nowIso() } })
  await sendNotification({
    userId: friendUid,
    type: "BOND_REQUEST",
    title: `${user.displayName.split(" ")[0]} wants to be your ${BONDS[bond].name.toLowerCase()}`,
    message: bond === "love" ? "Accept to send each other hugs, kisses and miss-yous." : BONDS[bond].blurb,
    data: { actorId: user.uid, actorName: user.displayName, friendshipId: fid, bond },
  }).catch(() => {})
}

export async function acceptBond(user: UserProfile, friendship: Friendship): Promise<void> {
  const request = friendship.bondRequest
  if (!request || request.from === user.uid) throw new AppError("There's no request to accept")
  await updateDoc(doc(db(), "friendships", friendship.id), {
    bond: { type: request.type, since: nowIso() },
    bondRequest: deleteField(),
  })
  await sendNotification({
    userId: request.from,
    type: "BOND_ACCEPTED",
    title: `${user.displayName.split(" ")[0]} said yes`,
    message: `You're now ${BONDS[request.type as BondId]?.pair.toLowerCase() ?? "connected"} on JoySplit.`,
    data: { actorId: user.uid, actorName: user.displayName, friendshipId: friendship.id, bond: request.type },
  }).catch(() => {})
}

/** Declines their request, or takes back your own. */
export async function clearBondRequest(friendship: Friendship): Promise<void> {
  await updateDoc(doc(db(), "friendships", friendship.id), { bondRequest: deleteField() })
}

export async function endBond(friendship: Friendship): Promise<void> {
  await updateDoc(doc(db(), "friendships", friendship.id), { bond: deleteField() })
}

/* ── Badges ───────────────────────────────────────────────────────────── */

const tried = new Set<string>()

async function award(uid: string, id: string, data: Record<string, unknown>) {
  if (tried.has(id)) return
  tried.add(id)
  const firestore = getDb()
  if (!firestore) return
  // Rules check that it was earned; an already-awarded badge is simply rejected
  await setDoc(doc(firestore, "users", uid, "badges", id), { ...data, createdAt: nowIso() }).catch(() => {})
}

/** A win: the Game Champ badge and one more win on your wallet (for milestones), together. */
async function awardWin(uid: string, challengeId: string) {
  const id = `champ_${challengeId}`
  if (tried.has(id)) return
  tried.add(id)
  const firestore = getDb()
  if (!firestore) return
  const batch = writeBatch(firestore)
  batch.set(doc(firestore, "users", uid, "badges", id), { type: "champ", ref: challengeId, createdAt: nowIso() })
  batch.update(doc(firestore, "wallets", uid), { wins: increment(1), lastTx: `win:${challengeId}` })
  await batch.commit().catch(() => {})
}

/**
 * Awards badges earned but not recorded yet: Swift Payer for a split paid
 * within 5 minutes of being added, Game Champ for every game won.
 */
export async function awardEarnedBadges(uid: string, have: Set<string>, expenses: Expense[], challenges: Challenge[]) {
  const now = Date.now()
  for (const e of expenses) {
    const id = `swift_${e.id}`
    if (have.has(id) || e.deletedAt || e.payerId === uid) continue
    const created = new Date(e.createdAt).getTime()
    if (!(now - created < SWIFT_WINDOW_MS + 60_000)) continue
    const i = e.shares.findIndex((s) => s.userId === uid)
    const share = e.shares[i]
    if (!share || (share.status !== "PAYMENT_REPORTED" && share.status !== "PAID")) continue
    const paidAt = new Date(share.reportedAt ?? share.confirmedAt ?? now).getTime()
    if (paidAt - created > SWIFT_WINDOW_MS) continue
    await award(uid, id, { type: "swift", ref: e.id, i })
  }
  for (const c of challenges) {
    const id = `champ_${c.id}`
    if (have.has(id) || c.status !== "DONE" || !c.result) continue
    const player = c.players[0]
    const won =
      c.result.winners.includes(uid) ||
      (c.kind === "friend" && c.hostId === uid && c.moves?.[player] !== undefined && !c.result.winners.includes(player) && !isFriendDraw(c))
    if (won) await awardWin(uid, c.id)
  }
}

/** A 1-on-1 Stone Paper Scissors that ended level. Mirrors friendDraw in the rules. */
export function isFriendDraw(c: Challenge): boolean {
  if (c.game !== "rps" || c.kind !== "friend" || !c.result?.hostMoves) return false
  const moves = c.moves?.[c.players[0]]
  if (!Array.isArray(moves)) return false
  const host = c.result.hostMoves
  const wins = (a: string, b: string) =>
    a !== "none" && (b === "none" || (a === "rock" && b === "scissors") || (a === "paper" && b === "rock") || (a === "scissors" && b === "paper"))
  const score = (a: readonly string[], b: readonly string[]) => a.reduce((n, m, i) => n + (wins(m, b[i]) ? 1 : 0), 0)
  return score(moves as string[], host) === score(host, moves as string[])
}

/* ── Early Bird ───────────────────────────────────────────────────────── */

/** Early Bird numbers given out so far (null when it can't be read). */
export async function earlyBirdCount(): Promise<number | null> {
  const firestore = getDb()
  if (!firestore) return null
  try {
    const snap = await getDoc(doc(firestore, "meta", "earlyBird"))
    return snap.exists() ? ((snap.data().count as number) ?? 0) : 0
  } catch {
    return null
  }
}

/** Takes the next Early Bird number for you, if any are left. Returns it, or null. */
export async function claimEarlyBird(uid: string): Promise<number | null> {
  const firestore = db()
  const counter = doc(firestore, "meta", "earlyBird")
  const badge = doc(firestore, "users", uid, "badges", "earlybird_joysplit")
  return runTransaction(firestore, async (tx) => {
    const [c, b] = await Promise.all([tx.get(counter), tx.get(badge)])
    if (b.exists()) return (b.data().i as number) ?? null
    const next = (c.exists() ? ((c.data().count as number) ?? 0) : 0) + 1
    if (next > EARLY_BIRD_LIMIT) return null
    tx.set(counter, { count: next })
    tx.set(badge, { type: "earlybird", ref: "joysplit", i: next, createdAt: nowIso() })
    return next
  })
}

/* ── Badge unlocked ───────────────────────────────────────────────────── */

/**
 * Tells you about a badge you just unlocked (or moved up a tier on), in your
 * notifications. One per badge and tier: a repeat is refused by the rules.
 */
export async function notifyBadgeUnlocked(user: UserProfile, badge: BadgeId, tier: number) {
  const firestore = getDb()
  if (!firestore) return
  const info = BADGES[badge]
  const level = isSingleBadge(badge) ? "" : ` — ${["", "Bronze", "Silver", "Gold"][tier]}`
  await setDoc(doc(firestore, "notifications", `badge_${user.uid}_${badge}_${tier}`), {
    id: `badge_${user.uid}_${badge}_${tier}`,
    userId: user.uid,
    type: "BADGE",
    title: `Badge unlocked: ${info.name}${level}`,
    message: info.how,
    data: { actorId: user.uid, actorName: user.displayName, badge, tier },
    read: false,
    createdAt: nowIso(),
  }).catch(() => {})
}

/* ── Milestones ───────────────────────────────────────────────────────── */

/**
 * Records each finished game you were in (as host, or a player who played)
 * once, adding one to your "games played" — the proof the rules check.
 */
export async function recordPlayedGames(uid: string, have: Set<string>, challenges: Challenge[]) {
  const firestore = getDb()
  if (!firestore) return
  for (const c of challenges) {
    const key = `played_${c.id}`
    if (have.has(c.id) || tried.has(key) || c.status !== "DONE") continue
    if (c.hostId !== uid && c.moves?.[uid] === undefined) continue
    tried.add(key)
    const batch = writeBatch(firestore)
    batch.set(doc(firestore, "users", uid, "played", c.id), { at: nowIso() })
    batch.update(doc(firestore, "wallets", uid), { played: increment(1), lastTx: `played:${c.id}` })
    await batch.commit().catch(() => {})
  }
}

/** Where you stand on a milestone frame's goal. */
export function milestoneProgress(wallet: Wallet | null | undefined, frameId: FrameId) {
  const m = FRAMES[frameId].milestone
  if (!m) return null
  const value = wallet?.[m.stat] ?? 0
  return { ...m, value, done: value >= m.goal, owned: !!wallet?.frames.includes(frameId) }
}

/** Takes a milestone frame you've reached, and puts it on. */
export async function claimMilestoneFrame(uid: string, frameId: FrameId): Promise<void> {
  const firestore = db()
  const ref = doc(firestore, "wallets", uid)
  await runTransaction(firestore, async (tx) => {
    const wallet = (await tx.get(ref)).data() as Wallet | undefined
    const p = milestoneProgress(wallet, frameId)
    if (!wallet || !p || p.owned) return
    if (!p.done) throw new AppError(`Not yet — ${p.value} of ${p.goal}`)
    tx.update(ref, { frames: [...wallet.frames, frameId], lastTx: `milestone:${frameId}` })
    const line = coinTx(uid, "frame", 0, `${FRAMES[frameId].name} frame — milestone`, frameId)
    tx.set(line.ref, line.data)
  })
  await updateDoc(doc(firestore, "users", uid), { frame: frameId, updatedAt: nowIso() })
}

/** "You unlocked the Legend frame" — once per frame, in your notifications. */
export async function notifyFrameUnlocked(user: UserProfile, frameId: FrameId) {
  const firestore = getDb()
  const m = FRAMES[frameId].milestone
  if (!firestore || !m) return
  const id = `frame_${user.uid}_${frameId}`
  await setDoc(doc(firestore, "notifications", id), {
    id,
    userId: user.uid,
    type: "BADGE",
    title: `Frame unlocked: ${FRAMES[frameId].name}`,
    message: `${MILESTONE_LABEL[m.stat](m.goal)} — done! Claim it in Frames.`,
    data: { actorId: user.uid, actorName: user.displayName, frame: frameId },
    read: false,
    createdAt: nowIso(),
  }).catch(() => {})
}
