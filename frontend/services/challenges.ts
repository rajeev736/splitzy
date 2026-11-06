import { arrayUnion, doc, getDoc, increment, serverTimestamp, Timestamp, updateDoc, writeBatch } from "firebase/firestore"

import { AppError } from "@/lib/errors"
import {
  allPlayed,
  computeResult,
  GAMES,
  gridMaxDigs,
  hasHostRounds,
  hostRoundDocs,
  HUNT_GUESSES,
  isGridGame,
  isHuntNumber,
  isValidMove,
  MAX_GROUP_PLAYERS,
  newSecretFor,
  tileDocs,
  type GameId,
  type GameMove,
  type GameSecret,
  type HiloCall,
  type HuntHint,
  type PenaltyDir,
  type RpsMove,
  type RpsPlay,
} from "@/lib/games"
import type { Challenge, UserProfile } from "@/lib/types"
import { MAX_STAKE } from "@/lib/fun/catalog"
import { coinTx, isFriendDraw } from "./fun"
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
  /** Coins each side puts in (1-on-1 games for fun only); the winner takes both. */
  stake?: number
}

const isDenied = (e: unknown) => (e as { code?: string })?.code === "permission-denied"
const pause = (ms: number) => new Promise((r) => setTimeout(r, ms))

/**
 * Game reads that depend on a move you just made (a tile, a hint, the host's
 * round): the screen can ask a moment before the server has the move, and the
 * rules then refuse. Wait a little and ask again instead of failing.
 */
async function readWhenAllowed<T>(read: () => Promise<T>, tries = 4): Promise<T> {
  for (let i = 0; ; i++) {
    try {
      return await read()
    } catch (e) {
      if (!isDenied(e) || i >= tries - 1) throw e
      await pause(350 * (i + 1))
    }
  }
}

/**
 * A game move written to the challenge. If the rules refuse it, it may simply
 * be in already (a double tap, or a retry after a lost reply): check the
 * server, and only if it isn't there try once more after a moment (e.g. your
 * stake was still on its way). Never shows a bare "permission" error.
 */
async function writeMove(challengeId: string, data: Record<string, unknown>, isIn: (c: Challenge) => boolean) {
  const firestore = getDb()
  if (!firestore) throw new AppError("Games need an internet connection")
  const ref = doc(firestore, "challenges", challengeId)
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      await updateDoc(ref, data)
      return
    } catch (e) {
      if (!isDenied(e)) throw e
      const latest = await getDoc(ref).catch(() => null)
      const server = latest?.exists() ? toChallenge(latest.data()) : null
      if (server && isIn(server)) return
      if (server && server.status !== "OPEN") throw new AppError("This game is already over")
      if (attempt === 0) await pause(700)
    }
  }
  throw new AppError("Couldn't save that move — check your connection and tap again")
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

  const stake = Math.floor(input.stake ?? 0)
  if (stake < 0 || stake > MAX_STAKE) throw new AppError(`Stakes go up to ${MAX_STAKE} coins`)
  if (stake > 0 && (input.kind !== "friend" || !forFun)) throw new AppError("Coins can only be played on a 1-on-1 game for fun")

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
    ...(stake > 0 ? { stake, staked: [user.uid] } : {}),
    createdAt: nowIso(),
  }

  const firestore = getDb()
  if (!firestore) return challenge
  if (stake > 0) await requireCoins(user.uid, stake)

  // Challenge + secret together: rules require the secret to exist from the start
  const batch = writeBatch(firestore)
  batch.set(doc(firestore, "challenges", challenge.id), challenge)
  batch.set(doc(firestore, "challenges", challenge.id, "secret", "value"), secret)
  // Friend Stone Paper Scissors / Penalty Shootout, and Higher or Lower: one doc
  // per round (move, dive or card), so each round's result can show as it ends
  for (const [n, data] of hostRoundDocs(challenge, secret)) {
    batch.set(doc(firestore, "challenges", challenge.id, "hostRounds", String(n)), data)
  }
  // Grid games and Number Hunt: one doc per tile / number, so each can be opened (read) on its own
  for (const [n, data] of tileDocs(input.game, secret)) {
    batch.set(doc(firestore, "challenges", challenge.id, "tiles", String(n)), data)
  }
  // Your stake leaves your wallet with the game (the rules check both together)
  if (stake > 0) {
    batch.update(doc(firestore, "wallets", user.uid), { balance: increment(-stake), lastTx: `stake:${challenge.id}` })
    const line = coinTx(user.uid, "stake", -stake, `Stake on ${GAMES[input.game].name} with ${players[0].name}`, challenge.id)
    batch.set(line.ref, line.data)
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
        stake > 0
          ? `${stake} coins each — winner takes ${stake * 2}.`
          : forFun
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
    await writeMove(challenge.id, { [`progress.${user.uid}`]: arrayUnion(cell) }, (c) =>
      (c.progress?.[user.uid] ?? []).includes(cell)
    )
  }
  return readTile(challenge.id, cell)
}

/** Whether a tile you've already dug (or any tile, once the game is over) hid a bomb / gold. */
export async function readTile(challengeId: string, cell: number): Promise<boolean> {
  const firestore = getDb()
  if (!firestore) throw new AppError("Games need an internet connection")
  const snap = await readWhenAllowed(() => getDoc(doc(firestore, "challenges", challengeId, "tiles", String(cell))))
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
 * Records a round game's picks so far (append-only: the rules never let a past
 * round change), before the host's side of the latest round is read.
 */
async function saveRoundPlays(user: UserProfile, challenge: Challenge, plays: string[]) {
  if (challenge.status !== "OPEN") throw new AppError("This game is already over")
  if (challenge.moves?.[user.uid] !== undefined) throw new AppError("You've already played")
  const firestore = getDb()
  if (!firestore) throw new AppError("Games need an internet connection")
  const recorded = challenge.roundPlays?.[user.uid] ?? []
  if (plays.length > recorded.length) {
    await writeMove(challenge.id, { [`roundPlays.${user.uid}`]: plays }, (c) => {
      const saved = c.roundPlays?.[user.uid] ?? []
      return saved.length >= plays.length && plays.every((p, i) => saved[i] === p)
    })
  }
}

/**
 * Plays one round: the pick is recorded first (security rules only let you see
 * the host's move for a round you've played, and never change a past round),
 * then the host's move for that round is read. Returns null when the game has
 * no per-round moves (older games) — its results show at the end.
 */
export async function playRpsRound(user: UserProfile, challenge: Challenge, plays: RpsPlay[]): Promise<RpsMove | null> {
  if (!hasRoundByRoundRps(challenge)) return null
  await saveRoundPlays(user, challenge, plays)
  return readHostRound(challenge.id, plays.length - 1)
}

/** The host's move for a round you've played (null if this game has none per round). */
export async function readHostRound(challengeId: string, round: number): Promise<RpsMove | null> {
  return (await readHostRoundField(challengeId, round, "move")) as RpsMove | null
}

/** One field of hostRounds/{round}, or null when it can't be read (not yours yet, or no such round). */
async function readHostRoundField(challengeId: string, round: number, field: "move" | "card") {
  const firestore = getDb()
  if (!firestore) return null
  try {
    const snap = await readWhenAllowed(() =>
      getDoc(doc(firestore, "challenges", challengeId, "hostRounds", String(round)))
    )
    return snap.exists() ? ((snap.data()[field] as unknown) ?? null) : null
  } catch {
    return null
  }
}

/**
 * Penalty Shootout: takes one kick. One-on-one, the shot is recorded first and
 * then the keeper's dive for it is read (rules allow it only once the shot is
 * in). In a group there are no per-kick dives (an early player could tip the
 * others off): returns null and the result shows at the end.
 */
export async function playPenaltyKick(
  user: UserProfile,
  challenge: Challenge,
  shots: PenaltyDir[]
): Promise<PenaltyDir | null> {
  if (challenge.game !== "penalty" || !hasHostRounds(challenge)) return null
  await saveRoundPlays(user, challenge, shots)
  return readKeeperDive(challenge.id, shots.length - 1)
}

/** The keeper's dive for a kick you've taken (null if this game has none per kick). */
export async function readKeeperDive(challengeId: string, kick: number): Promise<PenaltyDir | null> {
  return (await readHostRoundField(challengeId, kick, "move")) as PenaltyDir | null
}

/**
 * Higher or Lower: makes one call. The call is recorded first, then the card
 * it was about is turned over (rules allow reading card n+1 only after call n).
 */
export async function playHiloCall(user: UserProfile, challenge: Challenge, calls: HiloCall[]): Promise<number> {
  if (challenge.game !== "hilo") throw new AppError("This game has no cards")
  await saveRoundPlays(user, challenge, calls)
  const card = await readHiloCard(challenge.id, calls.length)
  if (card === null) throw new AppError("Couldn't turn the card over — try again")
  return card
}

/** Card n of a Higher or Lower game: card 0 from the start, card n+1 once you've made call n. */
export async function readHiloCard(challengeId: string, n: number): Promise<number | null> {
  return (await readHostRoundField(challengeId, n, "card")) as number | null
}

/**
 * Number Hunt: guesses one number. The guess is recorded first (rules only let
 * you read the hint for a number you've guessed, and never undo a guess), then
 * its hint is read.
 */
export async function huntGuess(user: UserProfile, challenge: Challenge, guess: number): Promise<HuntHint> {
  if (challenge.game !== "number_hunt") throw new AppError("This game has no numbers to guess")
  if (challenge.status !== "OPEN") throw new AppError("This game is already over")
  if (!challenge.players.includes(user.uid)) throw new AppError("You're not a player in this game")
  if (challenge.moves?.[user.uid] !== undefined) throw new AppError("You've already finished")
  if (!isHuntNumber(guess)) throw new AppError("Guess a number from 1 to 60")
  const guessed = challenge.progress?.[user.uid] ?? []
  if (!guessed.includes(guess) && guessed.length >= HUNT_GUESSES) throw new AppError("No guesses left")

  const firestore = getDb()
  if (!firestore) throw new AppError("Games need an internet connection")
  if (!guessed.includes(guess)) {
    await writeMove(challenge.id, { [`progress.${user.uid}`]: arrayUnion(guess) }, (c) =>
      (c.progress?.[user.uid] ?? []).includes(guess)
    )
  }
  return readHuntHint(challenge.id, guess)
}

/** The hint for a number you've already guessed (or any number, once the game is over). */
export async function readHuntHint(challengeId: string, guess: number): Promise<HuntHint> {
  const firestore = getDb()
  if (!firestore) throw new AppError("Games need an internet connection")
  const snap = await readWhenAllowed(() => getDoc(doc(firestore, "challenges", challengeId, "tiles", String(guess))))
  if (!snap.exists()) throw new AppError("This number is missing")
  return snap.data().hint as HuntHint
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

  await writeMove(challenge.id, { [`moves.${user.uid}`]: move }, (c) => c.moves?.[user.uid] !== undefined)
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
  // Readable once the server has everyone's move (which may be a moment behind this screen)
  const secretSnap = await readWhenAllowed(() => getDoc(doc(firestore, "challenges", challenge.id, "secret", "value")))
  if (!secretSnap.exists()) throw new AppError("This game's secret is missing")
  const result = computeResult(challenge, secretSnap.data() as GameSecret)

  const ref = doc(firestore, "challenges", challenge.id)
  const update = { status: "DONE", result, resolvedAt: serverTimestamp() }
  // Group games (but Lucky Number's "closest wins"): each player's win is
  // checked by its own verdict doc written with the result, so the rules can
  // verify a big group within their limits.
  const withVerdicts = challenge.kind === "group" && challenge.game !== "lucky_number"
  const saveResult = async (verdicts: boolean) => {
    if (!verdicts) return updateDoc(ref, update)
    const batch = writeBatch(firestore)
    batch.update(ref, update)
    for (const p of challenge.players.filter((p) => challenge.moves?.[p] !== undefined)) {
      batch.set(doc(firestore, "challenges", challenge.id, "verdicts", p), { won: result.winners.includes(p) })
    }
    await batch.commit()
  }
  try {
    try {
      await saveResult(withVerdicts)
    } catch (e) {
      // Rules from before verdicts existed: the result on its own (fine for small groups)
      if (!withVerdicts || (e as { code?: string })?.code !== "permission-denied") throw e
      await saveResult(false)
    }
  } catch (e) {
    // Two devices (or the player's submit and the open game screen) can reveal the
    // result at the same moment; the rules accept only the first. If it's already
    // over, that's the result — no error, and the winner of the race sends the notifications.
    if ((e as { code?: string })?.code === "permission-denied") {
      const latest = await getDoc(ref).catch(() => null)
      if (latest?.exists() && latest.data().status !== "OPEN") return toChallenge(latest.data())
    }
    throw e
  }
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

async function requireCoins(uid: string, amount: number) {
  const firestore = getDb()
  if (!firestore) return
  const snap = await getDoc(doc(firestore, "wallets", uid))
  const balance = snap.exists() ? (snap.data().balance as number) : 0
  if (balance < amount) throw new AppError(`You need ${amount - balance} more coins for this stake`)
}

/** The player puts in their coins before playing a staked game. */
export async function joinStake(user: UserProfile, challenge: Challenge) {
  const stake = challenge.stake ?? 0
  if (stake <= 0 || challenge.staked?.includes(user.uid)) return
  if (challenge.status !== "OPEN") throw new AppError("This game is already over")
  const firestore = getDb()
  if (!firestore) return
  await requireCoins(user.uid, stake)
  const batch = writeBatch(firestore)
  batch.update(doc(firestore, "challenges", challenge.id), { staked: arrayUnion(user.uid) })
  batch.update(doc(firestore, "wallets", user.uid), { balance: increment(-stake), lastTx: `stake:${challenge.id}` })
  const line = coinTx(user.uid, "stake", -stake, `Stake on ${GAMES[challenge.game].name} with ${challenge.hostName}`, challenge.id)
  batch.set(line.ref, line.data)
  await batch.commit()
}

/**
 * Coins a staker gets back from a finished or cancelled game: both stakes to
 * the winner, each their own on a draw or a cancel. Mirrors payoutFor in the rules.
 */
export function stakePayout(c: Challenge, uid: string): number {
  const stake = c.stake ?? 0
  if (stake <= 0 || !c.staked?.includes(uid) || c.paidOut?.includes(uid)) return 0
  if (c.status === "CANCELLED") return stake
  if (c.status !== "DONE" || !c.result) return 0
  if (isFriendDraw(c)) return stake
  const player = c.players[0]
  return c.result.winners.includes(player) === (uid === player) ? stake * 2 : 0
}

/** Collects what you won (or your refund) into your wallet, once. */
export async function collectStake(user: UserProfile, challenge: Challenge): Promise<number> {
  const amount = stakePayout(challenge, user.uid)
  const firestore = getDb()
  if (!firestore || amount <= 0) return 0
  const batch = writeBatch(firestore)
  batch.update(doc(firestore, "challenges", challenge.id), { paidOut: arrayUnion(user.uid) })
  const stake = challenge.stake ?? 0
  const won = challenge.status === "DONE" && amount === stake * 2
  batch.update(doc(firestore, "wallets", user.uid), {
    balance: increment(amount),
    lastTx: `payout:${challenge.id}`,
    // Net coins won from the other player, for the coin milestones
    ...(won ? { coinsWon: increment(stake) } : {}),
  })
  const other = challenge.hostId === user.uid ? challenge.playerNames[challenge.players[0]] : challenge.hostName
  const line = coinTx(
    user.uid,
    won ? "win" : "refund",
    amount,
    won ? `Won ${GAMES[challenge.game].name} against ${other}` : `Stake back from ${GAMES[challenge.game].name}`,
    challenge.id
  )
  batch.set(line.ref, line.data)
  await batch.commit()
  return amount
}

/** Host withdraws an unfinished game. */
export async function cancelChallenge(user: UserProfile, challenge: Challenge) {
  if (challenge.hostId !== user.uid) throw new AppError("Only the host can cancel this game")
  if (challenge.status !== "OPEN") throw new AppError("This game is already over")
  const firestore = getDb()
  if (firestore) await updateDoc(doc(firestore, "challenges", challenge.id), { status: "CANCELLED" })
}
