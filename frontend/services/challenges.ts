import { arrayUnion, doc, getDoc, serverTimestamp, Timestamp, updateDoc, writeBatch } from "firebase/firestore"

import { AppError } from "@/lib/errors"
import {
  allPlayed,
  computeResult,
  GAMES,
  GRID_CELLS,
  gridMaxDigs,
  isGridGame,
  isValidMove,
  MAX_GROUP_PLAYERS,
  newSecretFor,
  type GameId,
  type GameMove,
  type GameSecret,
  type RpsMove,
  type RpsPlay,
} from "@/lib/games"
import type { Challenge, UserProfile } from "@/lib/types"
import { getDb, nowIso, rupees, sendNotification } from "./shared"

export interface CreateChallengeInput {
  kind: Challenge["kind"]
  game: GameId
  /** 0 = just for fun. */
  discountPercent: number
  /**
   * Who plays. For a discount game, people who owe you with what they owe
   * (paise) — the discount base; anyone else is left out. For fun, anyone.
   */
  players: { uid: string; name: string; basePaise: number }[]
  /**
   * Your side of the secret: RPS moves, coin flips, treasure boxes, the lucky
   * number, or where you hid the bombs / gold. Flips, boxes and the number are
   * random if left out.
   */
  hostSecret?: GameSecret
  expense?: { id: string; title: string; groupId?: string; groupName?: string }
  /** Group games started from the Games tab rather than an expense. */
  group?: { id: string; name: string }
}

export const newChallengeId = () => `chl_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

/** Firestore → app shape (server timestamps become ISO strings). */
export function toChallenge(data: Record<string, unknown>): Challenge {
  const resolvedAt = data.resolvedAt
  return {
    ...(data as unknown as Challenge),
    resolvedAt: resolvedAt instanceof Timestamp ? resolvedAt.toDate().toISOString() : (resolvedAt as string | undefined),
  }
}

export async function createChallenge(user: UserProfile, input: CreateChallengeInput): Promise<Challenge> {
  const pct = input.discountPercent
  if (!Number.isInteger(pct) || pct < 0 || pct > 100) throw new AppError("Discount must be between 0% and 100%")
  if (!GAMES[input.game]) throw new AppError("Unknown game")
  const forFun = pct === 0
  const players = input.players
    .filter((p) => p.uid !== user.uid && (forFun || p.basePaise > 0))
    .map((p) => (forFun ? { ...p, basePaise: 0 } : p))
  if (players.length === 0) {
    throw new AppError(forFun ? "Pick someone to play with" : "Nobody owes you money here, so there's no one to challenge")
  }
  if (input.kind === "friend" && players.length !== 1) throw new AppError("Friend challenges are against one friend")
  if (input.kind === "group" && players.length > MAX_GROUP_PLAYERS) {
    throw new AppError(`Group games can have up to ${MAX_GROUP_PLAYERS} players`)
  }
  if (input.kind === "group" && !forFun && !GAMES[input.game].groupDiscount) {
    throw new AppError(`${GAMES[input.game].name} can only be played just for fun in a group`)
  }
  const group = input.expense?.groupId
    ? { groupId: input.expense.groupId, groupName: input.expense.groupName }
    : input.group
      ? { groupId: input.group.id, groupName: input.group.name }
      : {}

  const secret = newSecretFor(input.game, input.hostSecret)
  const challenge: Challenge = {
    id: newChallengeId(),
    kind: input.kind,
    game: input.game,
    hostId: user.uid,
    hostName: user.displayName,
    players: players.map((p) => p.uid),
    playerNames: Object.fromEntries(players.map((p) => [p.uid, p.name])),
    participants: [user.uid, ...players.map((p) => p.uid)],
    discountPercent: pct,
    bases: Object.fromEntries(players.map((p) => [p.uid, p.basePaise])),
    ...(input.expense ? { expenseId: input.expense.id, expenseTitle: input.expense.title } : {}),
    ...group,
    status: "OPEN",
    moves: {},
    createdAt: nowIso(),
  }

  const firestore = getDb()
  if (!firestore) return challenge

  // Challenge + secret together: rules require the secret to exist from the start
  const batch = writeBatch(firestore)
  batch.set(doc(firestore, "challenges", challenge.id), challenge)
  batch.set(doc(firestore, "challenges", challenge.id, "secret", "value"), secret)
  // Friend Stone Paper Scissors: one doc per round, so each round's result can show as it ends
  if (hasRoundByRoundRps(challenge)) {
    secret.moves!.forEach((move, n) =>
      batch.set(doc(firestore, "challenges", challenge.id, "hostRounds", String(n)), { move })
    )
  }
  // Grid games: one doc per tile, so each can be opened (read) on its own
  if (isGridGame(input.game)) {
    for (let n = 0; n < GRID_CELLS; n++) {
      batch.set(doc(firestore, "challenges", challenge.id, "tiles", String(n)), { hit: secret.cells!.includes(n) })
    }
  }
  await batch.commit()

  const game = GAMES[input.game]
  for (const p of players) {
    await sendNotification({
      userId: p.uid,
      title: `${game.emoji} You've been challenged!`,
      message: `${user.displayName} challenged you to ${game.name}${
        input.expense ? ` for "${input.expense.title}"` : group.groupName ? ` in ${group.groupName}` : ""
      }. ${
        forFun
          ? "Just for fun — play when you're ready."
          : `Win to get ${pct}% off the ₹${rupees(p.basePaise)} you owe — pay right after the game to use it.`
      }`,
      type: "CHALLENGE_RECEIVED",
      data: { challengeId: challenge.id, actorId: user.uid, actorName: user.displayName, amountPaise: p.basePaise },
    }).catch((e) => console.warn("Challenge notification failed:", e))
  }

  return challenge
}

/**
 * Grid games: dig one tile. The dig is recorded first (security rules only let
 * you read tiles you've dug, and never undo a dig), then the tile is read.
 * Returns whether it hid a bomb / gold.
 */
export async function digTile(user: UserProfile, challenge: Challenge, cell: number): Promise<boolean> {
  if (!isGridGame(challenge.game)) throw new AppError("This game has no grid")
  if (challenge.status !== "OPEN") throw new AppError("This game is already over")
  if (!challenge.players.includes(user.uid)) throw new AppError("You're not a player in this game")
  if (challenge.moves?.[user.uid] !== undefined) throw new AppError("You've already finished")
  const dug = challenge.progress?.[user.uid] ?? []
  if (!dug.includes(cell) && dug.length >= gridMaxDigs(challenge.game)) throw new AppError("No digs left")

  const firestore = getDb()
  if (!firestore) throw new AppError("Games need an internet connection")
  if (!dug.includes(cell)) {
    await updateDoc(doc(firestore, "challenges", challenge.id), { [`progress.${user.uid}`]: arrayUnion(cell) })
  }
  return readTile(challenge.id, cell)
}

/** Whether a tile you've already dug (or any tile, once the game is over) hid a bomb / gold. */
export async function readTile(challengeId: string, cell: number): Promise<boolean> {
  const firestore = getDb()
  if (!firestore) throw new AppError("Games need an internet connection")
  const snap = await getDoc(doc(firestore, "challenges", challengeId, "tiles", String(cell)))
  if (!snap.exists()) throw new AppError("This tile is missing")
  return snap.data().hit === true
}

/**
 * Friend Stone Paper Scissors is played round by round with a result after
 * each one. Group games (an early player could tip off the rest) and games
 * created before this existed reveal everything at the end instead.
 */
export const hasRoundByRoundRps = (c: Pick<Challenge, "game" | "kind">) => c.game === "rps" && c.kind === "friend"

/**
 * Plays one round: the pick is recorded first (security rules only let you see
 * the host's move for a round you've played, and never change a past round),
 * then the host's move for that round is read. Returns null when the game has
 * no per-round moves (older games) — its results show at the end.
 */
export async function playRpsRound(user: UserProfile, challenge: Challenge, plays: RpsPlay[]): Promise<RpsMove | null> {
  if (!hasRoundByRoundRps(challenge)) return null
  if (challenge.status !== "OPEN") throw new AppError("This game is already over")
  if (challenge.moves?.[user.uid] !== undefined) throw new AppError("You've already played")
  const firestore = getDb()
  if (!firestore) throw new AppError("Games need an internet connection")

  const recorded = challenge.roundPlays?.[user.uid] ?? []
  if (plays.length > recorded.length) {
    await updateDoc(doc(firestore, "challenges", challenge.id), { [`roundPlays.${user.uid}`]: plays })
  }
  return readHostRound(challenge.id, plays.length - 1)
}

/** The host's move for a round you've played (null if this game has none per round). */
export async function readHostRound(challengeId: string, round: number): Promise<RpsMove | null> {
  const firestore = getDb()
  if (!firestore) return null
  try {
    const snap = await getDoc(doc(firestore, "challenges", challengeId, "hostRounds", String(round)))
    return snap.exists() ? (snap.data().move as RpsMove) : null
  } catch {
    return null
  }
}

/** A player locks in their move. Friend games resolve right away; group games once everyone has played. */
export async function submitMove(user: UserProfile, challenge: Challenge, move: GameMove) {
  if (challenge.status !== "OPEN") throw new AppError("This game is already over")
  if (!challenge.players.includes(user.uid)) throw new AppError("You're not a player in this game")
  if (challenge.moves?.[user.uid] !== undefined) throw new AppError("You've already played")
  if (!isValidMove(challenge.game, move)) throw new AppError("That move isn't valid")

  const firestore = getDb()
  const updated: Challenge = { ...challenge, moves: { ...challenge.moves, [user.uid]: move } }
  if (!firestore) return updated

  await updateDoc(doc(firestore, "challenges", challenge.id), { [`moves.${user.uid}`]: move })
  if (allPlayed(updated)) return resolveChallenge(user, updated)
  return updated
}

/**
 * Reveals the secret and records the result. Anyone in the game can do it once
 * everyone has played (security rules verify the winners); the host can also
 * end a group game early, leaving out people who haven't played.
 */
export async function resolveChallenge(user: UserProfile, challenge: Challenge): Promise<Challenge> {
  if (challenge.status !== "OPEN") return challenge
  const isHost = challenge.hostId === user.uid
  if (!allPlayed(challenge) && !isHost) throw new AppError("Waiting for everyone to play")
  if (Object.keys(challenge.moves || {}).length === 0) throw new AppError("Nobody has played yet")

  const firestore = getDb()
  if (!firestore) throw new AppError("Games need an internet connection")
  const secretSnap = await getDoc(doc(firestore, "challenges", challenge.id, "secret", "value"))
  if (!secretSnap.exists()) throw new AppError("This game's secret is missing")
  const result = computeResult(challenge, secretSnap.data() as GameSecret)

  await updateDoc(doc(firestore, "challenges", challenge.id), {
    status: "DONE",
    result,
    resolvedAt: serverTimestamp(),
  })
  const resolved: Challenge = { ...challenge, status: "DONE", result, resolvedAt: nowIso() }

  // Tell everyone else how it ended
  const game = GAMES[challenge.game]
  const forFun = challenge.discountPercent === 0
  for (const uid of challenge.participants.filter((p) => p !== user.uid)) {
    const won = result.winners.includes(uid)
    const isHostTarget = uid === challenge.hostId
    await sendNotification({
      userId: uid,
      title: `${game.emoji} ${game.name} result`,
      message: isHostTarget
        ? result.winners.length > 0
          ? `${result.winners.map((w) => challenge.playerNames[w]).join(", ")} won your challenge${
              forFun
                ? "."
                : challenge.discountPercent === 100
                  ? " — what they owe you will be settled for free."
                  : ` and get ${challenge.discountPercent}% off if they pay now.`
            }`
          : forFun
            ? "Nobody beat you — you win this one!"
            : "Nobody beat you — no discount this time."
        : won
          ? forFun
            ? `You beat ${challenge.hostName}!`
            : challenge.discountPercent === 100
              ? `You won 100% off! What you owe ${challenge.hostName} is settled automatically — nothing to pay.`
              : `You won! Pay ${challenge.hostName} in the next 10 minutes to get ${challenge.discountPercent}% off.`
          : `${challenge.hostName}'s game is over. Better luck next time!`,
      type: "CHALLENGE_RESULT",
      data: { challengeId: challenge.id, actorId: user.uid, actorName: user.displayName },
    }).catch((e) => console.warn("Result notification failed:", e))
  }

  return resolved
}

/** Host withdraws an unfinished game. */
export async function cancelChallenge(user: UserProfile, challenge: Challenge) {
  if (challenge.hostId !== user.uid) throw new AppError("Only the host can cancel this game")
  if (challenge.status !== "OPEN") throw new AppError("This game is already over")
  const firestore = getDb()
  if (firestore) await updateDoc(doc(firestore, "challenges", challenge.id), { status: "CANCELLED" })
}
