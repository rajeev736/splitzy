import { doc, runTransaction, serverTimestamp, updateDoc } from "firebase/firestore"

import { canWear, earnKey } from "@/components/game-avatar/ownership"
import { characterById } from "@/components/game-avatar/registry"
import { AppError } from "@/lib/errors"
import { FRAMES } from "@/lib/fun/catalog"
import {
  achievementById,
  achievementProgress,
  countLiveGame,
  liveGameId,
  newlyReached,
  type Achievement,
  type LiveOutcome,
} from "@/lib/live/achievements"
import type { LiveGameId } from "@/lib/live/types"
import type { Wallet } from "@/lib/types"
import { coinTx } from "./fun"
import { getDb, nowIso } from "./shared"

/*
 * The game profile: the character you play as (users/{uid}.gameAvatar),
 * characters bought with coins or earned (wallets/{uid}.avatars), and the live
 * counters achievements and levels (lib/live/levels: XP from the counters)
 * are measured on. firestore.rules checks every step: prices (`avatar:<id>`),
 * rewards against the counters (`earn:<achievement or lv<n>>:<item or "coins">`)
 * and each live game counted once (`live:<id>:<outcome>`).
 */

const db = () => {
  const firestore = getDb()
  if (!firestore) throw new AppError("You're offline right now")
  return firestore
}

/** Plays as `id` in games (a free character or one you own); `null` goes back to your photo. */
export async function setGameAvatar(uid: string, id: string | null, owned: string[] | undefined): Promise<void> {
  if (id && !characterById(id)) throw new AppError("That character isn't available")
  if (!canWear(id, owned)) throw new AppError("Get this character first")
  await updateDoc(doc(db(), "users", uid), { gameAvatar: id ?? "", updatedAt: nowIso() })
}

/** Buys a character with coins. Buying one you already have does nothing. */
export async function buyCharacter(uid: string, id: string): Promise<void> {
  const def = characterById(id)
  if (!def || def.price === 0) throw new AppError("This character isn't for sale")
  const firestore = db()
  const ref = doc(firestore, "wallets", uid)
  await runTransaction(firestore, async (tx) => {
    const snap = await tx.get(ref)
    if (!snap.exists()) throw new AppError("Your coins are still loading — try again in a moment")
    const wallet = snap.data() as Wallet
    const owned = wallet.avatars ?? []
    if (owned.includes(id)) return
    if (wallet.balance < def.price) throw new AppError(`You need ${def.price - wallet.balance} more coins for ${def.name}`)
    tx.update(ref, { balance: wallet.balance - def.price, avatars: [...owned, id], lastTx: `avatar:${id}` })
    const line = coinTx(uid, "avatar", -def.price, `${def.name} — game character`, id)
    tx.set(line.ref, line.data)
  })
}

/**
 * Takes an achievement's or a level's reward: a character, a frame or a
 * level's coins (`id: "coins"`, paid once). The rules check the achievement
 * (or the level, from your XP) on your wallet's counters. Taking one you
 * already have does nothing.
 */
export async function claimReward(
  uid: string,
  achievementId: string,
  item: { kind: "character" | "frame" | "coins"; id: string }
): Promise<void> {
  const a = achievementById(achievementId)
  if (!a) throw new AppError("Unknown reward")
  const def = characterById(item.id)
  if (
    item.kind === "character"
      ? !def || earnKey(def) !== a.id
      : item.kind === "frame"
        ? a.frame !== item.id
        : !a.coins || item.id !== "coins"
  )
    throw new AppError("That isn't this reward")
  const firestore = db()
  const ref = doc(firestore, "wallets", uid)
  await runTransaction(firestore, async (tx) => {
    const snap = await tx.get(ref)
    if (!snap.exists()) throw new AppError("Your coins are still loading — try again in a moment")
    const wallet = snap.data() as Wallet
    const p = achievementProgress(wallet, a)
    if (!p.done)
      throw new AppError(a.stat === "level" ? `Not yet — reach level ${p.goal} first` : `Not yet — ${p.value} of ${p.goal}`)
    const lastTx = `earn:${a.id}:${item.id}`
    if (item.kind === "coins") {
      const paid = wallet.levelCoins ?? []
      if (paid.includes(a.id)) return
      tx.update(ref, { balance: wallet.balance + a.coins!, levelCoins: [...paid, a.id], lastTx })
      const line = coinTx(uid, "level", a.coins!, `${a.title.replace(/!$/, "")} reward`, a.id)
      tx.set(line.ref, line.data)
    } else if (item.kind === "character") {
      const owned = wallet.avatars ?? []
      if (owned.includes(item.id)) return
      tx.update(ref, { avatars: [...owned, item.id], lastTx })
      const name = def?.name ?? item.id
      const line = coinTx(uid, "avatar", 0, `${name} — ${rewardLabel(a)}`, item.id)
      tx.set(line.ref, line.data)
    } else {
      if (wallet.frames.includes(item.id)) return
      tx.update(ref, { frames: [...wallet.frames, item.id], lastTx })
      const frame = FRAMES[item.id as keyof typeof FRAMES]
      const line = coinTx(uid, "frame", 0, `${frame?.name ?? item.id} frame — ${rewardLabel(a)}`, item.id)
      tx.set(line.ref, line.data)
    }
  })
}

const rewardLabel = (a: Achievement) => a.title.replace(/!$/, "").toLowerCase()

/** What counting a live game reached: the achievements it unlocked (often none), and the wallet before and after (XP, levels). */
export interface LiveCounted {
  reached: Achievement[]
  before: Wallet
  wallet: Wallet
}

/**
 * Counts a live game you played on your wallet, once (its record
 * users/{uid}/live/{code}_{startedAt} is written in the same transaction), and
 * returns the achievements it reached. `null` when it was already counted
 * (the result reopened), there's no wallet yet, or the rules refused it.
 */
export async function countLiveResult(
  uid: string,
  game: { code: string; startedAt: number; game: LiveGameId; outcome: LiveOutcome }
): Promise<LiveCounted | null> {
  const firestore = getDb()
  if (!firestore) return null
  const id = liveGameId(game.code, game.startedAt)
  const walletRef = doc(firestore, "wallets", uid)
  const recordRef = doc(firestore, "users", uid, "live", id)
  try {
    return await runTransaction(firestore, async (tx) => {
      const [w, r] = await Promise.all([tx.get(walletRef), tx.get(recordRef)])
      if (!w.exists() || r.exists()) return null
      const before = w.data() as Wallet
      const next = countLiveGame(before, game.outcome)
      tx.set(recordRef, { game: game.game, result: game.outcome, at: nowIso() })
      tx.update(walletRef, { ...next, liveAt: serverTimestamp(), lastTx: `live:${id}:${game.outcome}` })
      const after: Wallet = { ...before, ...next }
      return { reached: newlyReached(before, after), before, wallet: after }
    })
  } catch {
    return null
  }
}
