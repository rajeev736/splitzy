"use client"

import * as React from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { useRouter } from "nextjs-toploader/app"
import { GameController03Icon, Notification01Icon } from "@hugeicons/core-free-icons"

import { Coins } from "@/components/fun/coin"
import { GameAvatar } from "@/components/game-avatar/game-avatar"
import { LevelBadge, XpBar } from "@/components/game-avatar/level-badge"
import { GameButton, GameIconButton, GameNote, GameScreen, GameSectionTitle, GameTabs } from "@/components/game-ui/kit"
import { GameGlyph } from "@/components/games/game-glyph"
import { NewChallengeSheet } from "@/components/games/new-challenge-sheet"
import { ModeSwitch } from "@/components/layout/mode-switch"
import { LiveGamesPanel } from "@/components/live/live-games-panel"
import { useSession } from "@/components/providers/session-provider"
import { UserAvatar } from "@/components/shared/user-avatar"
import { Spinner } from "@/components/ui/spinner"
import { useChallenges, useFriends, useUnreadCount } from "@/hooks/queries"
import { useWallet } from "@/hooks/use-fun"
import { GAMES, isForFun, type GameId } from "@/lib/games"
import { levelInfo } from "@/lib/live/levels"
import { formatPaise } from "@/lib/money"
import type { Challenge } from "@/lib/types"
import { cn } from "@/lib/utils"

/** A soft colour per game, so the catalogue reads at a glance. */
const GAME_TONE: Record<GameId, string> = {
  rps: "#dbeafe",
  minefield: "#fee2e2",
  gold_rush: "#fef3c7",
  coin_toss: "#ffedd5",
  treasure: "#ede9fe",
  lucky_number: "#dcfce7",
  penalty: "#d1fae5",
  hilo: "#e0f2fe",
  number_hunt: "#ffedd5",
}

/** Live: rooms with friends, right now. The other two are the turn-based challenges. */
type Tab = "live" | "discount" | "fun"
type ChallengeTab = Exclude<Tab, "live">
const TAB_ORDER = ["live", "discount", "fun"] as const
const TAB_LABELS: Record<Tab, string> = { live: "Live", discount: "Discounted", fun: "For fun" }
const isTab = (v: string | null): v is Tab => v === "live" || v === "discount" || v === "fun"
const CHALLENGE_TABS: Record<ChallengeTab, { blurb: string }> = {
  discount: {
    blurb: "Games for money you owe or are owed. Win to pay less — one discount game per person at a time.",
  },
  fun: {
    blurb: "No money involved, just bragging rights. Friends can send as many as they like.",
  },
}

const HISTORY_PAGE = 5
/** Incoming challenges shown before "Show all", so history never gets pushed far down. */
const INCOMING_PAGE = 4

/** What this game needs from you right now, for the row status. */
function statusFor(c: Challenge, uid: string): { label: string; tone: string } {
  if (c.status === "CANCELLED") return { label: "Cancelled", tone: "var(--gu-ink-soft)" }
  if (c.status === "DONE") {
    if (c.hostId === uid) {
      return c.result?.winners.length
        ? { label: "They won", tone: "var(--gu-ink-soft)" }
        : { label: "You won", tone: "var(--gu-green-deep)" }
    }
    return c.result?.winners.includes(uid)
      ? { label: "You won", tone: "var(--gu-green-deep)" }
      : { label: "You lost", tone: "var(--gu-ink-soft)" }
  }
  if (c.hostId !== uid && c.moves[uid] === undefined) return { label: "Your turn", tone: "var(--gu-blue-deep)" }
  return { label: "Waiting", tone: "var(--gu-orange-deep)" }
}

const newestFirst = (a: Challenge, b: Challenge) => b.createdAt.localeCompare(a.createdAt)
const tabOf = (c: Challenge): ChallengeTab => (isForFun(c) ? "fun" : "discount")

/**
 * The Games side of the app (switched to from the top, layout/mode-switch):
 * one themed world — your player card, then Live rooms or the turn-based
 * challenges. No bottom nav here; Split is one tap away at the top.
 */
export default function ChallengesPage() {
  return (
    <React.Suspense
      fallback={
        <GameScreen>
          <div className="flex flex-1 items-center justify-center">
            <Spinner className="size-9 text-white" />
          </div>
        </GameScreen>
      }
    >
      <ChallengesContent />
    </React.Suspense>
  )
}

function ChallengesContent() {
  const { user } = useSession()
  const challenges = useChallenges()
  const searchParams = useSearchParams()
  const uid = user?.uid ?? ""
  const [sheet, setSheet] = React.useState<{ open: boolean; game: GameId }>({ open: false, game: "rps" })

  const all = [...challenges.data].sort(newestFirst)
  const isYourTurn = (c: Challenge) => c.status === "OPEN" && c.hostId !== uid && c.moves[uid] === undefined
  const yourTurnCount = (t: Tab) => all.filter((c) => tabOf(c) === t && isYourTurn(c)).length

  // ?tab=live|discount|fun wins (also when it changes while the page is open);
  // otherwise Live, unless a challenge is waiting for you in one of the other tabs
  const param = searchParams.get("tab")
  const paramTab: Tab | null = isTab(param) ? param : null
  const [picked, setPicked] = React.useState<Tab | null>(paramTab)
  const [syncedParam, setSyncedParam] = React.useState(paramTab)
  if (paramTab !== syncedParam) {
    setSyncedParam(paramTab)
    if (paramTab) setPicked(paramTab)
  }
  const tab: Tab = picked ?? (yourTurnCount("discount") > 0 ? "discount" : yourTurnCount("fun") > 0 ? "fun" : "live")

  return (
    <GameScreen>
      <HubTopBar />
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-5 px-4 pt-1 pb-16">
        <PlayerCard />

        <div data-tour="game-tabs">
          <GameTabs
            label="Kind of game"
            value={tab}
            onChange={setPicked}
            tabs={TAB_ORDER.map((t) => ({ value: t, label: TAB_LABELS[t], badge: yourTurnCount(t) || undefined }))}
          />
        </div>

        {tab === "live" ? (
          <LiveGamesPanel />
        ) : (
          <GamesPanel
            key={tab}
            tab={tab}
            blurb={CHALLENGE_TABS[tab].blurb}
            items={all.filter((c) => tabOf(c) === tab)}
            uid={uid}
            isYourTurn={isYourTurn}
            challenges={challenges}
            onNew={() => setSheet({ open: true, game: "rps" })}
          />
        )}
      </div>

      <NewChallengeSheet
        open={sheet.open}
        onOpenChange={(open) => setSheet((s) => ({ ...s, open }))}
        initialGame={sheet.game}
        initialStake={tab === "live" ? "fun" : tab}
      />
    </GameScreen>
  )
}

/** Split | Games in the middle, your coins and the bell around it. */
function HubTopBar() {
  const router = useRouter()
  const wallet = useWallet()
  const unread = useUnreadCount()
  return (
    <header className="sticky top-0 z-30 bg-gradient-to-b from-[#3f95ee] via-[#3f95ee]/95 to-[#3f95ee]/0 px-3 pt-[calc(0.6rem+env(safe-area-inset-top,0px))] pb-3">
      <div className="mx-auto flex max-w-2xl items-center gap-2">
        <Link
          href="/profile/coins"
          aria-label={wallet ? `${wallet.balance} coins` : "Coins"}
          className="gu-chip h-9 shrink-0 !px-3 text-sm"
        >
          <Coins amount={wallet?.balance ?? 0} iconClassName="size-4" />
        </Link>
        <div className="flex flex-1 justify-center">
          <ModeSwitch look="game" />
        </div>
        <GameIconButton
          icon={Notification01Icon}
          label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}
          tone="cream"
          size="sm"
          badge={unread > 0 ? (unread > 9 ? "9+" : unread) : undefined}
          onClick={() => router.push("/notifications")}
        />
      </div>
    </header>
  )
}

/** You as a player: your character, level and XP; tap for the full game profile. */
function PlayerCard() {
  const { user } = useSession()
  const wallet = useWallet()
  if (!user) return null
  const info = levelInfo(wallet)
  return (
    <Link href="/profile#game" className="gu-panel-flat flex items-center gap-3.5 p-3 pr-4 active:translate-y-px">
      <span className="relative shrink-0 p-1">
        <GameAvatar character={user.gameAvatar} photo={user.photoURL} name={user.displayName} frame={user.frame} size={58} mode="idle" />
        {wallet ? <LevelBadge level={info.level} size={24} className="absolute -bottom-1 left-1/2 -translate-x-1/2" /> : null}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-lg leading-tight font-bold">{user.displayName.split(" ")[0]}</span>
        <span className="block truncate text-xs font-bold text-[var(--gu-brown)]">
          {wallet ? `Level ${info.level} · ${info.title}` : "Player"}
        </span>
        {wallet ? (
          <span className="mt-1.5 flex items-center gap-2">
            <XpBar value={info.progress} className="h-2.5 flex-1 bg-[var(--gu-cream-2)]" />
            <span className="shrink-0 text-[11px] font-bold text-[var(--gu-ink-soft)] tabular-nums">
              {info.max ? "MAX" : `${info.into}/${info.need} XP`}
            </span>
          </span>
        ) : null}
      </span>
    </Link>
  )
}

/** One tab's games: what's waiting for you, what's waiting on others, and history. */
function GamesPanel({
  tab,
  blurb,
  items,
  uid,
  isYourTurn,
  challenges,
  onNew,
}: {
  tab: ChallengeTab
  blurb: string
  items: Challenge[]
  uid: string
  isYourTurn: (c: Challenge) => boolean
  challenges: ReturnType<typeof useChallenges>
  onNew: () => void
}) {
  const [historyShown, setHistoryShown] = React.useState(HISTORY_PAGE)
  const [incomingShown, setIncomingShown] = React.useState(INCOMING_PAGE)
  const yourTurn = items.filter(isYourTurn)
  const waiting = items.filter((c) => c.status === "OPEN" && !isYourTurn(c))
  const history = items.filter((c) => c.status !== "OPEN")

  return (
    <div className="flex flex-col gap-6">
      <p className="px-1 text-sm font-semibold text-white [text-shadow:0_1px_0_rgba(20,40,110,.35)]">{blurb}</p>

      {/* One way in: the sheet picks the game, who plays and the stakes */}
      <GameButton tone={tab === "discount" ? "green" : "blue"} size="lg" icon={GameController03Icon} onClick={onNew} data-tour="new-challenge">
        {tab === "discount" ? "Challenge for a discount" : "New challenge"}
      </GameButton>

      {challenges.isPending ? (
        <div className="flex justify-center py-6">
          <Spinner className="size-7 text-white" />
        </div>
      ) : challenges.isError ? (
        <GameNote>
          Couldn&apos;t load your challenges.{" "}
          <button type="button" className="font-bold text-[var(--gu-blue-deep)] underline" onClick={() => challenges.refetch()}>
            Try again
          </button>
        </GameNote>
      ) : (
        <>
          <section className="flex flex-col gap-3">
            <GameSectionTitle count={yourTurn.length}>Challenges for you</GameSectionTitle>
            {yourTurn.length === 0 ? (
              <GameNote>
                {tab === "discount"
                  ? "No discount challenges waiting. They come from people you owe."
                  : "No fun challenges waiting. Send one to a friend!"}
              </GameNote>
            ) : (
              <>
                <div className="gu-panel-flat flex flex-col divide-y divide-[var(--gu-line)] px-1">
                  {yourTurn.slice(0, incomingShown).map((c) => (
                    <IncomingRow key={c.id} challenge={c} uid={uid} />
                  ))}
                </div>
                {yourTurn.length > incomingShown && (
                  <GameButton tone="cream" size="sm" onClick={() => setIncomingShown(yourTurn.length)}>
                    Show all {yourTurn.length}
                  </GameButton>
                )}
              </>
            )}
          </section>

          {waiting.length > 0 && (
            <section className="flex flex-col gap-3">
              <GameSectionTitle count={waiting.length}>Waiting for others</GameSectionTitle>
              <ChallengeList items={waiting} uid={uid} />
            </section>
          )}

          <section className="flex flex-col gap-3">
            <GameSectionTitle count={history.length || undefined}>History</GameSectionTitle>
            {history.length === 0 ? (
              <GameNote>Finished games will show up here.</GameNote>
            ) : (
              <>
                <ChallengeList items={history.slice(0, historyShown)} uid={uid} />
                {history.length > historyShown && (
                  <GameButton tone="cream" size="sm" onClick={() => setHistoryShown((n) => n + 10)}>
                    Show more ({history.length - historyShown})
                  </GameButton>
                )}
              </>
            )}
          </section>
        </>
      )}
    </div>
  )
}

/** Where the game was set up: the expense, the group, or nothing for one-on-one games. */
const contextOf = (c: Challenge) => (c.expenseTitle ? ` · ${c.expenseTitle}` : c.groupName ? ` · ${c.groupName}` : "")

/** A challenge someone sent you: who sent it, the game, what's at stake, and Play. */
function IncomingRow({ challenge: c, uid }: { challenge: Challenge; uid: string }) {
  const { data: friends } = useFriends()
  const game = GAMES[c.game]
  const photo = friends.find((f) => f.uid === c.hostId)?.photoURL
  const base = c.bases?.[uid] ?? 0
  const save = Math.floor((base * c.discountPercent) / 100)

  return (
    <div className="flex items-center gap-3 px-2 py-3">
      <span className="relative shrink-0">
        <UserAvatar uid={c.hostId} src={photo} name={c.hostName} size="md" />
        <span
          className="absolute -right-1.5 -bottom-1.5 flex size-7 items-center justify-center rounded-lg text-sm shadow-[0_0_0_2.5px_#fff]"
          style={{ background: GAME_TONE[c.game] }}
          aria-hidden
        >
          <GameGlyph game={c.game} />
        </span>
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-bold">{c.hostName}</p>
        <p className="truncate text-xs font-semibold text-[var(--gu-ink-soft)]">
          {game.name}
          {contextOf(c)}
        </p>
        {!isForFun(c) && (
          <p className="truncate text-xs font-bold text-[var(--gu-green-deep)]">
            Win to save {formatPaise(save)} ({c.discountPercent}% off)
          </p>
        )}
      </div>
      <Link href={`/challenges/${c.id}`} className="gu-btn gu-green gu-btn-sm shrink-0">
        Play
      </Link>
    </div>
  )
}

function ChallengeList({ items, uid }: { items: Challenge[]; uid: string }) {
  return (
    <div className="gu-panel-flat flex flex-col divide-y divide-[var(--gu-line)] px-1">
      {items.map((c) => {
        const status = statusFor(c, uid)
        const game = GAMES[c.game]
        const opponents = c.hostId === uid ? c.players.map((p) => c.playerNames[p]).join(", ") : `${c.hostName} (host)`
        return (
          <Link key={c.id} href={`/challenges/${c.id}`} className="flex items-center gap-3 px-2 py-3">
            <span
              className={cn("flex size-11 shrink-0 items-center justify-center rounded-xl text-xl shadow-[inset_0_-3px_0_rgba(0,0,0,.08)]")}
              style={{ background: GAME_TONE[c.game] }}
              aria-hidden
            >
              <GameGlyph game={c.game} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-bold">
                {game.name}
                <span className="font-semibold text-[var(--gu-ink-soft)]">{contextOf(c)}</span>
              </p>
              <p className="truncate text-xs font-semibold text-[var(--gu-ink-soft)]">
                {isForFun(c) ? "" : `${c.discountPercent}% off · `}
                {opponents}
              </p>
            </div>
            <span className="flex shrink-0 items-center gap-1.5 text-xs font-bold" style={{ color: status.tone }}>
              <span aria-hidden className="size-2 rounded-full bg-current" />
              {status.label}
            </span>
          </Link>
        )
      })}
    </div>
  )
}

