"use client"

import { CoinRow } from "@/components/games/coin-toss-picker"
import { GridBoard } from "@/components/games/grid-board"
import { TreasureGrid } from "@/components/games/treasure-picker"
import {
  GOLD_DIGS,
  GRID_CELLS,
  LUCKY_FRIEND_RANGE,
  MINEFIELD_BOMBS,
  RPS_LABEL,
  scoreCoin,
  scoreGrid,
  scoreRps,
  type CoinSide,
  type GridGameId,
  type RpsMove,
} from "@/lib/games"
import type { Challenge } from "@/lib/types"
import { cn } from "@/lib/utils"

/** The finished game's outcome, whichever game it was. */
export function GameResult({ challenge, viewerId }: { challenge: Challenge; viewerId: string }) {
  switch (challenge.game) {
    case "rps":
      return <RpsResult challenge={challenge} viewerId={viewerId} />
    case "coin_toss":
      return <CoinResult challenge={challenge} viewerId={viewerId} />
    case "treasure":
      return <TreasureResult challenge={challenge} viewerId={viewerId} />
    case "lucky_number":
      return <LuckyResult challenge={challenge} viewerId={viewerId} />
    case "minefield":
    case "gold_rush":
      return <GridResult challenge={challenge} viewerId={viewerId} />
  }
}

const played = (c: Challenge) => c.players.filter((p) => c.moves[p] !== undefined)
const missed = (c: Challenge) => c.players.filter((p) => c.moves[p] === undefined)
const nameOf = (c: Challenge, uid: string, viewerId: string) => `${c.playerNames[uid]}${uid === viewerId ? " (you)" : ""}`

function Missed({ challenge }: { challenge: Challenge }) {
  const list = missed(challenge)
  if (list.length === 0) return null
  return (
    <p className="text-center text-xs text-muted-foreground">
      Didn&apos;t play: {list.map((p) => challenge.playerNames[p]).join(", ")}
    </p>
  )
}

/** One line per player: name, what they did, and whether they won. */
function PlayerRow({ name, won, children }: { name: string; won: boolean; children: React.ReactNode }) {
  return (
    <li className="flex items-center justify-between gap-3 py-2.5 text-sm">
      <span className={cn("min-w-0 truncate font-medium", won && "text-success")}>{name}</span>
      <span className="flex shrink-0 items-center gap-2">
        {children}
        <span className={cn("w-12 text-right text-xs font-medium", won ? "text-success" : "text-muted-foreground")}>
          {won ? "Won" : "Lost"}
        </span>
      </span>
    </li>
  )
}

/**
 * Stone Paper Scissors. One-on-one (or a player viewing their own game): the
 * rounds side by side. Host of a group game: every player's score.
 */
function RpsResult({ challenge, viewerId }: { challenge: Challenge; viewerId: string }) {
  const hostMoves = challenge.result?.hostMoves as RpsMove[] | undefined
  if (!hostMoves) return null
  const viewerIsHost = viewerId === challenge.hostId
  const focus = viewerIsHost ? (challenge.players.length === 1 ? challenge.players[0] : null) : viewerId
  const focusMoves = focus ? (challenge.moves[focus] as RpsMove[] | undefined) : undefined

  return (
    <div className="flex flex-col gap-4">
      {focus && focusMoves && (
        <RpsRounds challenge={challenge} hostMoves={hostMoves} player={focus} viewerIsHost={viewerIsHost} />
      )}
      {challenge.players.length > 1 && (
        <div className="flex flex-col gap-1">
          <p className="text-xs font-medium text-muted-foreground">
            {challenge.hostName}&apos;s moves: {hostMoves.map((m) => RPS_LABEL[m].emoji).join(" ")}
          </p>
          <ul className="flex flex-col divide-y border-y">
            {played(challenge).map((p) => {
              const s = scoreRps(hostMoves, challenge.moves[p] as RpsMove[])
              return (
                <PlayerRow key={p} name={nameOf(challenge, p, viewerId)} won={challenge.result?.winners.includes(p) ?? false}>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {s.playerWins}–{s.hostWins}
                  </span>
                </PlayerRow>
              )
            })}
          </ul>
        </div>
      )}
      <Missed challenge={challenge} />
    </div>
  )
}

function RpsRounds({
  challenge,
  hostMoves,
  player,
  viewerIsHost,
}: {
  challenge: Challenge
  hostMoves: RpsMove[]
  player: string
  viewerIsHost: boolean
}) {
  const { rounds, playerWins, hostWins } = scoreRps(hostMoves, challenge.moves[player] as RpsMove[])
  const you = viewerIsHost ? challenge.hostName : challenge.playerNames[player]
  const them = viewerIsHost ? challenge.playerNames[player] : challenge.hostName

  return (
    <div className="flex flex-col">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center pb-2 text-xs font-medium text-muted-foreground">
        <span className="truncate">{you} (you)</span>
        <span className="px-2">vs</span>
        <span className="truncate text-right">{them}</span>
      </div>
      {rounds.map((r, i) => {
        const mine = viewerIsHost ? r.host : r.player
        const theirs = viewerIsHost ? r.player : r.host
        const iWon = viewerIsHost ? r.outcome === "host" : r.outcome === "player"
        const iLost = viewerIsHost ? r.outcome === "player" : r.outcome === "host"
        return (
          <div
            key={i}
            className="grid animate-in grid-cols-[1fr_auto_1fr] items-center border-t py-2.5 fade-in slide-in-from-bottom-2 last:border-b"
            style={{ animationDelay: `${i * 250}ms`, animationFillMode: "both" }}
          >
            <span className={cn("text-3xl", iLost && "opacity-40")} aria-label={RPS_LABEL[mine].name}>
              {RPS_LABEL[mine].emoji}
            </span>
            <span
              className={cn(
                "text-xs font-medium",
                iWon ? "text-success" : iLost ? "text-destructive" : "text-muted-foreground"
              )}
            >
              Round {i + 1}: {iWon ? "Won" : iLost ? "Lost" : "Draw"}
            </span>
            <span className={cn("text-right text-3xl", iWon && "opacity-40")} aria-label={RPS_LABEL[theirs].name}>
              {RPS_LABEL[theirs].emoji}
            </span>
          </div>
        )
      })}
      <p className="pt-3 text-center text-xs font-medium text-muted-foreground">
        Final score {viewerIsHost ? hostWins : playerWins} – {viewerIsHost ? playerWins : hostWins}
      </p>
    </div>
  )
}

/** Coin Toss: the real flips, then each player's calls with the right ones marked. */
function CoinResult({ challenge, viewerId }: { challenge: Challenge; viewerId: string }) {
  const flips = challenge.result?.flips as CoinSide[] | undefined
  if (!flips) return null
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col items-center gap-2 py-2">
        <span className="text-xs text-muted-foreground">The coin landed</span>
        <CoinRow sides={flips} />
      </div>
      <ul className="flex flex-col divide-y border-y">
        {played(challenge).map((p) => {
          const calls = challenge.moves[p] as CoinSide[]
          const { matches } = scoreCoin(flips, calls)
          return (
            <PlayerRow key={p} name={nameOf(challenge, p, viewerId)} won={challenge.result?.winners.includes(p) ?? false}>
              <span className="hidden min-[400px]:block">
                <CoinRow sides={calls} highlight={calls.map((c, i) => c === flips[i])} />
              </span>
              <span className="text-xs text-muted-foreground tabular-nums">{matches}/5</span>
            </PlayerRow>
          )
        })}
      </ul>
      <Missed challenge={challenge} />
    </div>
  )
}

/** Treasure Hunt: the grid with the treasure and who opened which box. */
function TreasureResult({ challenge, viewerId }: { challenge: Challenge; viewerId: string }) {
  const boxes = challenge.result?.boxes
  if (!boxes) return null
  const picks: Record<number, string[]> = {}
  for (const p of played(challenge)) {
    const box = challenge.moves[p] as number
    ;(picks[box] ??= []).push(p === viewerId ? "You" : challenge.playerNames[p].split(" ")[0])
  }
  return (
    <div className="flex flex-col gap-3">
      <TreasureGrid treasure={boxes} picks={picks} />
      {challenge.players.length > 1 && (
        <ul className="flex flex-col divide-y border-y">
          {played(challenge).map((p) => (
            <PlayerRow key={p} name={nameOf(challenge, p, viewerId)} won={challenge.result?.winners.includes(p) ?? false}>
              <span className="text-xs text-muted-foreground">Box {(challenge.moves[p] as number) + 1}</span>
            </PlayerRow>
          ))}
        </ul>
      )}
      <Missed challenge={challenge} />
    </div>
  )
}

/** Lucky Number: the secret and every guess, closest first. */
function LuckyResult({ challenge, viewerId }: { challenge: Challenge; viewerId: string }) {
  const secret = challenge.result?.number
  if (secret === undefined) return null
  const guesses = played(challenge)
    .map((uid) => ({ uid, guess: challenge.moves[uid] as number, distance: Math.abs((challenge.moves[uid] as number) - secret) }))
    .sort((a, b) => a.distance - b.distance)

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col items-center gap-1 py-2">
        <span className="text-xs text-muted-foreground">Secret number</span>
        <span className="text-4xl font-semibold tabular-nums">{secret}</span>
        {challenge.kind === "friend" && (
          <span className="text-xs text-muted-foreground">Within {LUCKY_FRIEND_RANGE} wins</span>
        )}
      </div>
      <ul className="flex flex-col divide-y border-y">
        {guesses.map(({ uid, guess, distance }) => (
          <PlayerRow key={uid} name={nameOf(challenge, uid, viewerId)} won={challenge.result?.winners.includes(uid) ?? false}>
            <span className="text-xs text-muted-foreground">off by {distance}</span>
            <span className="w-8 text-right font-semibold tabular-nums">{guess}</span>
          </PlayerRow>
        ))}
      </ul>
      <Missed challenge={challenge} />
    </div>
  )
}

/**
 * Minefield / Gold Rush: the board with everything revealed and the digs of
 * the viewer (or the only player), then each player's tally in group games.
 */
function GridResult({ challenge, viewerId }: { challenge: Challenge; viewerId: string }) {
  const cells = challenge.result?.cells
  if (!cells) return null
  const game = challenge.game as GridGameId
  const focus = challenge.players.includes(viewerId)
    ? viewerId
    : challenge.players.length === 1
      ? challenge.players[0]
      : null
  const focusDigs = focus ? ((challenge.moves[focus] as number[] | undefined) ?? []) : []
  const tally = (p: string) => {
    const digs = challenge.moves[p] as number[]
    const s = scoreGrid(game, cells, digs)
    return game === "minefield"
      ? `${s.safeOpened}/${GRID_CELLS - MINEFIELD_BOMBS} safe · ${s.hits} 💥`
      : `${s.hits} gold in ${digs.length}/${GOLD_DIGS} digs`
  }

  return (
    <div className="flex flex-col gap-3">
      {focus && focus !== viewerId && (
        <p className="text-center text-xs text-muted-foreground">{challenge.playerNames[focus]}&apos;s digs</p>
      )}
      <GridBoard
        game={game}
        mode="reveal"
        cells={cells}
        opened={Object.fromEntries(focusDigs.map((c) => [c, cells.includes(c)]))}
      />
      {focus && (
        <p className="text-center text-xs text-muted-foreground tabular-nums">{tally(focus)}</p>
      )}
      {challenge.players.length > 1 && (
        <ul className="flex flex-col divide-y border-y">
          {played(challenge).map((p) => (
            <PlayerRow key={p} name={nameOf(challenge, p, viewerId)} won={challenge.result?.winners.includes(p) ?? false}>
              <span className="text-xs text-muted-foreground tabular-nums">{tally(p)}</span>
            </PlayerRow>
          ))}
        </ul>
      )}
      <Missed challenge={challenge} />
    </div>
  )
}
