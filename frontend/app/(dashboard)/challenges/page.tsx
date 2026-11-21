"use client"

import * as React from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { useRouter } from "nextjs-toploader/app"
import { Notification01Icon, PercentCircleIcon } from "@hugeicons/core-free-icons"

import { Coins } from "@/components/fun/coin"
import { visibleMark } from "@/components/fun/tour-kit"
import { GameAvatar } from "@/components/game-avatar/game-avatar"
import { LevelBadge, XpBar } from "@/components/game-avatar/level-badge"
import { GameButton, GameIconButton, GameNote, GameScreen, GameSectionTitle, GameTabs } from "@/components/game-ui/kit"
import { GameNavSpacer } from "@/components/game-nav/game-bottom-nav"
import { GAME_ROUTES } from "@/components/game-nav/items"
import { GameGlyph } from "@/components/games/game-glyph"
import { ModeBar } from "@/components/layout/mode-switch"
import { LiveGameLogo } from "@/components/live/live-game-logo"
import { LiveGamesPanel } from "@/components/live/live-games-panel"
import { useSession } from "@/components/providers/session-provider"
import { StreakCard, StreakRiskBanner } from "@/components/streak/streak-card"
import { UserAvatar } from "@/components/shared/user-avatar"
import { Spinner } from "@/components/ui/spinner"
import { useChallenges, useFriends, useNotifications } from "@/hooks/queries"
import { useWallet } from "@/hooks/use-fun"
import { gameNameOf } from "@/lib/game-name"
import { isGameNotification } from "@/lib/game-notifications"
import { GAMES, isForFun } from "@/lib/games"
import { LIVE_GAMES } from "@/lib/live/games"
import { levelInfo } from "@/lib/live/levels"
import { formatPaise } from "@/lib/money"
import type { Challenge } from "@/lib/types"

/**
 * Two tabs:
 *  - For fun: the live games (Ludo, Chess, Scribble…), rooms with friends —
 *    nothing to do with money;
 *  - Discounted: a live game one-on-one with a friend who owes you; if they
 *    win, they get a discount off what they owe (pay within 10 minutes).
 */
type Tab = "fun" | "discount"
const TAB_ORDER = ["fun", "discount"] as const
const TAB_LABELS: Record<Tab, string> = { fun: "For fun", discount: "Discounted" }
/** ?tab=… — "live" is the old name of For fun. */
const tabFromParam = (v: string | null): Tab | null =>
  v === "discount" ? "discount" : v === "fun" || v === "live" ? "fun" : null

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
  if (c.game === "live")
    return c.hostId === uid
      ? { label: "Waiting to play", tone: "var(--gu-orange-deep)" }
      : { label: "Your turn", tone: "var(--gu-blue-deep)" }
  if (c.hostId !== uid && c.moves[uid] === undefined) return { label: "Your turn", tone: "var(--gu-blue-deep)" }
  return { label: "Waiting", tone: "var(--gu-orange-deep)" }
}

const newestFirst = (a: Challenge, b: Challenge) => b.createdAt.localeCompare(a.createdAt)
/** The game's name: the live game's own for a live challenge. */
const gameName = (c: Challenge) => (c.game === "live" && c.liveGame ? LIVE_GAMES[c.liveGame].name : GAMES[c.game].name)

/**
 * The Games side of the app (switched to from the top, layout/mode-switch):
 * one themed world — your player card, then For fun or Discounted. Split is
 * one tap away at the top; the Games bottom bar (components/game-nav) leads
 * to Levels, Inventory and your game profile.
 */
export default function ChallengesPage() {
  return (
    <React.Suspense
      fallback={
        <GameScreen>
          {/* The switch is there from the first frame, so it never pops in */}
          <HubTopBar />
          <div className="flex flex-1 items-center justify-center pb-24">
            <Spinner className="size-9 text-white" />
          </div>
          <GameNavSpacer />
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

  // Discount games only: games for fun are the live rooms now
  const discounts = [...challenges.data].filter((c) => !isForFun(c)).sort(newestFirst)
  const isYourTurn = (c: Challenge) =>
    c.status === "OPEN" && c.hostId !== uid && (c.game === "live" || c.moves[uid] === undefined)
  const waitingForYou = discounts.filter(isYourTurn).length

  // ?tab=fun|discount wins (also when it changes while the page is open);
  // otherwise For fun, unless a discount game is waiting for you
  const paramTab = tabFromParam(searchParams.get("tab"))
  const [picked, setPicked] = React.useState<Tab | null>(paramTab)
  const [syncedParam, setSyncedParam] = React.useState(paramTab)
  if (paramTab !== syncedParam) {
    setSyncedParam(paramTab)
    if (paramTab) setPicked(paramTab)
  }
  const tab: Tab = picked ?? (waitingForYou > 0 ? "discount" : "fun")
  // Discounted is only built once it's first opened, then kept
  const [discountSeen, setDiscountSeen] = React.useState(tab === "discount")
  if (tab === "discount" && !discountSeen) setDiscountSeen(true)

  return (
    <GameScreen>
      <HubTopBar />
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-5 px-4 pt-1 pb-6">
        <PlayerCard />
        <StreakSection
          onPlay={() => {
            // To the games: For fun's list, scrolled into view
            setPicked("fun")
            window.setTimeout(() => visibleMark("pick-game")?.scrollIntoView({ behavior: "smooth", block: "center" }), 80)
          }}
        />

        <div data-tour="game-tabs">
          <GameTabs
            label="Kind of game"
            value={tab}
            onChange={setPicked}
            tabs={TAB_ORDER.map((t) => ({
              value: t,
              label: TAB_LABELS[t],
              badge: t === "discount" ? waitingForYou || undefined : undefined,
            }))}
          />
        </div>

        {/* Both panels stay mounted once opened: switching tabs is instant, nothing reloads */}
        <div hidden={tab !== "fun"}>
          <LiveGamesPanel invite={searchParams.get("invite")} />
        </div>
        {tab === "discount" || discountSeen ? (
          <div hidden={tab !== "discount"}>
            <DiscountPanel items={discounts} uid={uid} isYourTurn={isYourTurn} challenges={challenges} />
          </div>
        ) : null}
      </div>
      <GameNavSpacer />
    </GameScreen>
  )
}

/** Split | Games dead centre, exactly where it sits on the Split side; the games' own bell on the right. */
function HubTopBar() {
  return (
    <header className="sticky top-0 z-30 bg-[#3f95ee] shadow-[0_10px_18px_-12px_rgba(20,40,110,.6)]">
      <ModeBar look="game" right={<GameBell />} />
    </header>
  )
}

/** The Games bell (game notifications only), beside the Split | Games switch. */
function GameBell() {
  const router = useRouter()
  const { data: notifications } = useNotifications()
  const unread = notifications.filter((n) => !n.read && isGameNotification(n)).length
  return (
    <GameIconButton
      icon={Notification01Icon}
      label={unread > 0 ? `Game notifications, ${unread} unread` : "Game notifications"}
      tone="cream"
      size="sm"
      data-tour="game-bell"
      badge={unread > 0 ? (unread > 9 ? "9+" : unread) : undefined}
      onClick={() => router.push("/game-notifications")}
    />
  )
}

/** You as a player: your character, game name, level and XP; tap for the game profile. Your coins on top. */
function PlayerCard() {
  const { user } = useSession()
  const wallet = useWallet()
  if (!user) return null
  const info = levelInfo(wallet)
  return (
    <div className="gu-panel-flat relative" data-tour="player-card">
      {/* Your coins: to the coin history and shop. Claimed coins fly into it (data-coin-target) */}
      <span className="absolute top-3 right-3 z-10 flex items-center">
        <Link
          href="/games/coins"
          data-coin-target
          data-tour="coin-chip"
          aria-label={wallet ? `${wallet.balance} coins` : "Coins"}
          className="gu-chip h-8 !px-3 text-sm active:translate-y-px"
        >
          <Coins amount={wallet?.balance ?? 0} iconClassName="size-4" />
        </Link>
      </span>
      <Link href={GAME_ROUTES.profile} className="flex items-center gap-3.5 p-3 pr-4 active:translate-y-px">
        <span className="relative shrink-0 p-1">
          <GameAvatar character={user.gameAvatar} photo={user.photoURL} name={gameNameOf(user)} frame={user.frame} size={58} mode="idle" />
          {wallet ? <LevelBadge level={info.level} size={24} className="absolute -bottom-1 left-1/2 -translate-x-1/2" /> : null}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate pr-24 text-lg leading-tight font-bold">{user.gameName?.trim() || user.displayName.split(" ")[0]}</span>
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
    </div>
  )
}

/** Your play streak (and the daily reward's chest); a "save your streak" strip on top while it's at risk. */
function StreakSection({ onPlay }: { onPlay: () => void }) {
  const wallet = useWallet()
  // Its room is kept while the wallet loads, so nothing below jumps
  if (wallet === undefined) return <div className="gu-panel-flat -mt-1 h-[88px] opacity-70" aria-hidden />
  return (
    <div className="-mt-1 flex flex-col gap-3">
      <StreakRiskBanner wallet={wallet} onPlay={onPlay} />
      <StreakCard wallet={wallet} variant="hub" />
    </div>
  )
}

/** Discounted: start one, what's waiting for you, what's waiting on them, and history. */
function DiscountPanel({
  items,
  uid,
  isYourTurn,
  challenges,
}: {
  items: Challenge[]
  uid: string
  isYourTurn: (c: Challenge) => boolean
  challenges: ReturnType<typeof useChallenges>
}) {
  const router = useRouter()
  const [historyShown, setHistoryShown] = React.useState(HISTORY_PAGE)
  const [incomingShown, setIncomingShown] = React.useState(INCOMING_PAGE)
  const yourTurn = items.filter(isYourTurn)
  const waiting = items.filter((c) => c.status === "OPEN" && !isYourTurn(c))
  const history = items.filter((c) => c.status !== "OPEN")

  return (
    <div className="flex flex-col gap-6">
      <p className="px-1 text-sm font-semibold text-white [text-shadow:0_1px_0_rgba(20,40,110,.35)]">
        Play a live game one-on-one with a friend who owes you. If they win, they get a discount — if they pay you within
        10 minutes.
      </p>

      <GameButton tone="green" size="lg" icon={PercentCircleIcon} onClick={() => router.push("/play/discount")} data-tour="new-challenge">
        Challenge for a discount
      </GameButton>

      {challenges.isPending ? (
        <div className="flex justify-center py-6">
          <Spinner className="size-7 text-white" />
        </div>
      ) : challenges.isError ? (
        <GameNote>
          Couldn&apos;t load your games.{" "}
          <button type="button" className="font-bold text-[var(--gu-blue-deep)] underline" onClick={() => challenges.refetch()}>
            Try again
          </button>
        </GameNote>
      ) : (
        <>
          <section className="flex flex-col gap-3">
            <GameSectionTitle count={yourTurn.length}>Challenges for you</GameSectionTitle>
            {yourTurn.length === 0 ? (
              <GameNote>No discount games waiting. They come from friends you owe.</GameNote>
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
              <GameSectionTitle count={waiting.length}>Waiting for them</GameSectionTitle>
              <ChallengeList items={waiting} uid={uid} />
            </section>
          )}

          <section className="flex flex-col gap-3">
            <GameSectionTitle count={history.length || undefined}>History</GameSectionTitle>
            {history.length === 0 ? (
              <GameNote>Finished discount games will show up here.</GameNote>
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

/** The game's picture: the live game's logo, or the classic game's glyph. */
function GameMark({ c, size }: { c: Challenge; size: "sm" | "md" }) {
  if (c.game === "live" && c.liveGame)
    return <LiveGameLogo game={c.liveGame} className={size === "sm" ? "size-7 rounded-lg" : "size-11 rounded-xl"} />
  return (
    <span
      className={
        size === "sm"
          ? "flex size-7 items-center justify-center rounded-lg bg-[#fef3c7] text-sm"
          : "flex size-11 items-center justify-center rounded-xl bg-[#fef3c7] text-xl shadow-[inset_0_-3px_0_rgba(0,0,0,.08)]"
      }
      aria-hidden
    >
      <GameGlyph game={c.game} />
    </span>
  )
}

/** Where the game was set up: the expense, the group, or nothing for one-on-one games. */
const contextOf = (c: Challenge) => (c.expenseTitle ? ` · ${c.expenseTitle}` : c.groupName ? ` · ${c.groupName}` : "")

/** A discount game someone sent you: who, the game, what you can save, and Play. */
function IncomingRow({ challenge: c, uid }: { challenge: Challenge; uid: string }) {
  const { data: friends } = useFriends()
  const photo = friends.find((f) => f.uid === c.hostId)?.photoURL
  const base = c.bases?.[uid] ?? 0
  const save = Math.floor((base * c.discountPercent) / 100)

  return (
    <div className="flex items-center gap-3 px-2 py-3">
      <span className="relative shrink-0">
        <UserAvatar uid={c.hostId} src={photo} name={c.hostName} size="md" />
        <span className="absolute -right-1.5 -bottom-1.5 rounded-lg shadow-[0_0_0_2.5px_#fff]">
          <GameMark c={c} size="sm" />
        </span>
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-bold">{c.hostName}</p>
        <p className="truncate text-xs font-semibold text-[var(--gu-ink-soft)]">
          {gameName(c)}
          {contextOf(c)}
        </p>
        <p className="truncate text-xs font-bold text-[var(--gu-green-deep)]">
          Win to save {formatPaise(save)} ({c.discountPercent}% off)
        </p>
      </div>
      <Link
        href={c.game === "live" && c.roomCode ? `/play/${c.roomCode}` : `/challenges/${c.id}`}
        className="gu-btn gu-green gu-btn-sm shrink-0"
      >
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
        const opponents = c.hostId === uid ? c.players.map((p) => c.playerNames[p]).join(", ") : `${c.hostName} (host)`
        return (
          <Link key={c.id} href={`/challenges/${c.id}`} className="flex items-center gap-3 px-2 py-3">
            <GameMark c={c} size="md" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-bold">
                {gameName(c)}
                <span className="font-semibold text-[var(--gu-ink-soft)]">{contextOf(c)}</span>
              </p>
              <p className="truncate text-xs font-semibold text-[var(--gu-ink-soft)]">
                {c.discountPercent}% off · {opponents}
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
