"use client"

import { Badge } from "@/components/ui/badge"
import { RPS_LABEL, scoreRps, type RpsMove } from "@/lib/games"
import type { Challenge } from "@/lib/types"
import { cn } from "@/lib/utils"

/** Round-by-round Stone Paper Scissors result from the player's side. */
export function RpsResult({ challenge, viewerId }: { challenge: Challenge; viewerId: string }) {
  const player = challenge.players[0]
  const hostMoves = challenge.result?.hostMoves as RpsMove[] | undefined
  const playerMoves = challenge.moves[player] as RpsMove[] | undefined
  if (!hostMoves || !playerMoves) return null
  const { rounds, playerWins, hostWins } = scoreRps(hostMoves, playerMoves)
  const viewerIsHost = viewerId === challenge.hostId
  const you = viewerIsHost ? challenge.hostName : challenge.playerNames[player]
  const them = viewerIsHost ? challenge.playerNames[player] : challenge.hostName

  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center px-1 text-xs font-bold text-muted-foreground">
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
            className="grid animate-in grid-cols-[1fr_auto_1fr] items-center rounded-2xl border bg-card p-3 fade-in slide-in-from-bottom-2"
            style={{ animationDelay: `${i * 250}ms`, animationFillMode: "both" }}
          >
            <span className={cn("text-3xl", iLost && "opacity-40")} aria-label={RPS_LABEL[mine].name}>
              {RPS_LABEL[mine].emoji}
            </span>
            <Badge
              className={cn(
                "text-[11px] font-bold",
                iWon ? "bg-success/15 text-success" : iLost ? "bg-destructive/15 text-destructive" : "bg-muted text-muted-foreground"
              )}
            >
              Round {i + 1}: {iWon ? "Won" : iLost ? "Lost" : "Draw"}
            </Badge>
            <span className={cn("text-right text-3xl", iWon && "opacity-40")} aria-label={RPS_LABEL[theirs].name}>
              {RPS_LABEL[theirs].emoji}
            </span>
          </div>
        )
      })}
      <p className="pt-1 text-center text-xs font-semibold text-muted-foreground">
        Final score {viewerIsHost ? hostWins : playerWins} – {viewerIsHost ? playerWins : hostWins}
      </p>
    </div>
  )
}

/** Lucky Number: the secret and every guess, closest first. */
export function LuckyResult({ challenge, viewerId }: { challenge: Challenge; viewerId: string }) {
  const secret = challenge.result?.number
  if (secret === undefined) return null
  const guesses = Object.entries(challenge.moves)
    .filter(([uid]) => challenge.players.includes(uid))
    .map(([uid, g]) => ({ uid, guess: g as number, distance: Math.abs((g as number) - secret) }))
    .sort((a, b) => a.distance - b.distance)
  const missed = challenge.players.filter((p) => challenge.moves[p] === undefined)

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col items-center gap-1 rounded-3xl bg-primary/5 py-4">
        <span className="text-xs font-semibold text-muted-foreground uppercase">Secret number</span>
        <span className="text-5xl font-black tabular-nums text-primary">{secret}</span>
      </div>
      <ul className="flex flex-col gap-1.5">
        {guesses.map(({ uid, guess, distance }) => {
          const won = challenge.result?.winners.includes(uid)
          return (
            <li
              key={uid}
              className={cn(
                "flex items-center justify-between rounded-2xl border px-3 py-2 text-sm",
                won && "border-success/40 bg-success/5"
              )}
            >
              <span className="truncate font-semibold">
                {challenge.playerNames[uid]}
                {uid === viewerId && " (you)"}
              </span>
              <span className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">off by {distance}</span>
                <span className="w-10 text-right font-black tabular-nums">{guess}</span>
                {won && <Badge className="bg-success/15 text-[11px] font-bold text-success">Winner</Badge>}
              </span>
            </li>
          )
        })}
      </ul>
      {missed.length > 0 && (
        <p className="text-center text-xs text-muted-foreground">
          Didn&apos;t play: {missed.map((p) => challenge.playerNames[p]).join(", ")}
        </p>
      )}
    </div>
  )
}
