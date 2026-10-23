import { doc, getDoc, serverTimestamp, Timestamp, updateDoc, writeBatch } from "firebase/firestore"

import { AppError } from "@/lib/errors"
import {
  allPlayed,
  GAMES,
  isLuckyGuess,
  isRpsMoves,
  MAX_GROUP_PLAYERS,
  newSecretFor,
  scoreLuckyNumber,
  scoreRps,
  type GameId,
  type RpsMove,
} from "@/lib/games"
import type { Challenge, UserProfile } from "@/lib/types"
import { getDb, nowIso, rupees, sendNotification } from "./shared"

export interface CreateChallengeInput {
  kind: Challenge["kind"]
  game: GameId
  discountPercent: number
  /** People who owe you, with what they owe (paise) — the discount base. */
  players: { uid: string; name: string; basePaise: number }[]
  /** Your 3 RPS moves (friend challenges). */
  hostRpsMoves?: RpsMove[]
  expense?: { id: string; title: string; groupId?: string; groupName?: string }
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
  if (!Number.isInteger(pct) || pct < 1 || pct > 100) throw new AppError("Discount must be between 1% and 100%")
  const players = input.players.filter((p) => p.uid !== user.uid && p.basePaise > 0)
  if (players.length === 0) throw new AppError("Nobody owes you money here, so there's no one to challenge")
  if (input.kind === "friend" && (players.length !== 1 || input.game !== "rps")) {
    throw new AppError("Friend challenges are Stone Paper Scissors against one friend")
  }
  if (input.kind === "group" && (input.game !== "lucky_number" || players.length > MAX_GROUP_PLAYERS)) {
    throw new AppError(`Group games are Lucky Number with up to ${MAX_GROUP_PLAYERS} players`)
  }

  const secret = newSecretFor(input.game, input.hostRpsMoves)
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
    ...(input.expense
      ? {
          expenseId: input.expense.id,
          expenseTitle: input.expense.title,
          ...(input.expense.groupId ? { groupId: input.expense.groupId, groupName: input.expense.groupName } : {}),
        }
      : {}),
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
  await batch.commit()

  const game = GAMES[input.game]
  for (const p of players) {
    await sendNotification({
      userId: p.uid,
      title: `${game.emoji} You've been challenged!`,
      message: `${user.displayName} challenged you to ${game.name}${
        input.expense ? ` for "${input.expense.title}"` : ""
      }. Win to get ${pct}% off the ₹${rupees(p.basePaise)} you owe — pay right after the game to use it.`,
      type: "CHALLENGE_RECEIVED",
      data: { challengeId: challenge.id, actorId: user.uid, actorName: user.displayName, amountPaise: p.basePaise },
    }).catch((e) => console.warn("Challenge notification failed:", e))
  }

  return challenge
}

/** A player locks in their move. Friend games resolve right away; group games once everyone has played. */
export async function submitMove(user: UserProfile, challenge: Challenge, move: RpsMove[] | number) {
  if (challenge.status !== "OPEN") throw new AppError("This game is already over")
  if (!challenge.players.includes(user.uid)) throw new AppError("You're not a player in this game")
  if (challenge.moves?.[user.uid] !== undefined) throw new AppError("You've already played")
  if (challenge.game === "rps" ? !isRpsMoves(move) : !isLuckyGuess(move)) throw new AppError("That move isn't valid")

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
  const secret = secretSnap.data() as { moves?: RpsMove[]; number?: number }

  let result: NonNullable<Challenge["result"]>
  if (challenge.game === "rps") {
    const player = challenge.players[0]
    const score = scoreRps(secret.moves as RpsMove[], challenge.moves[player] as RpsMove[])
    result = { winners: score.playerWon ? [player] : [], hostMoves: secret.moves }
  } else {
    const guesses = Object.fromEntries(
      Object.entries(challenge.moves).filter(([uid]) => challenge.players.includes(uid))
    ) as Record<string, number>
    const score = scoreLuckyNumber(secret.number as number, guesses)
    result = { winners: score.winners, number: secret.number, winningDistance: score.winningDistance }
  }

  await updateDoc(doc(firestore, "challenges", challenge.id), {
    status: "DONE",
    result,
    resolvedAt: serverTimestamp(),
  })
  const resolved: Challenge = { ...challenge, status: "DONE", result, resolvedAt: nowIso() }

  // Tell everyone else how it ended
  const game = GAMES[challenge.game]
  for (const uid of challenge.participants.filter((p) => p !== user.uid)) {
    const won = result.winners.includes(uid)
    const isHostTarget = uid === challenge.hostId
    await sendNotification({
      userId: uid,
      title: `${game.emoji} ${game.name} result`,
      message: isHostTarget
        ? result.winners.length > 0
          ? `${result.winners.map((w) => challenge.playerNames[w]).join(", ")} won your challenge and get ${challenge.discountPercent}% off if they pay now.`
          : "Nobody beat you — no discount this time."
        : won
          ? `You won! Pay ${challenge.hostName} in the next 10 minutes to get ${challenge.discountPercent}% off.`
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
