"use client"

import * as React from "react"
import { createPortal } from "react-dom"
import { usePathname } from "next/navigation"
import { Cancel01Icon, Tick02Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { CoinIcon, Coins } from "@/components/fun/coin"
import { tourDone, tourRunning } from "@/components/fun/tour-kit"
import { isGameTabPage } from "@/components/game-nav/game-bottom-nav"
import { GAME_ROUTES } from "@/components/game-nav/items"
import { GameButton, GameIconButton, GamePanel } from "@/components/game-ui/kit"
import { useSession } from "@/components/providers/session-provider"
import { flyCoins } from "@/components/rewards/coin-burst"
import { gameToast } from "@/components/rewards/reward-notice"
import { useBackToClose } from "@/hooks/use-back-to-close"
import { useWallet } from "@/hooks/use-fun"
import { WELCOME_FRAME } from "@/lib/fun/catalog"
import { getErrorMessage } from "@/lib/errors"
import { DAILY_REWARDS, cycleDay, nextRun } from "@/lib/live/streak"
import type { Wallet } from "@/lib/types"
import { claimDailyReward, type DailyClaim } from "@/services/live-server"
import { StreakFlame, TreasureChest } from "./streak-art"
import { streakView, useToday } from "./use-streak"

/**
 * The daily reward on the Games side: a 7-day track of coin gifts (day 7 the
 * big chest; a missed day starts it again at day 1, lib/live/streak), paid by
 * the server (POST /api/games/daily, wallet.dailyDay / dailyRun).
 *
 * It pops up by itself the first time each day the Games side is opened —
 * only on its four tab pages (never inside a room or a game), after the
 * first-visit welcome gifts and tour (components/fun/games-welcome) and once
 * nothing else is up. "First time" is per device and day (localStorage); once
 * taken, the wallet's `dailyDay` keeps it from coming back anywhere. Closing
 * it is always possible, so a server that's down never blocks the screen;
 * the streak card's chest (./streak-card) opens it again any time.
 */

/* ── Open / closed, from anywhere ─────────────────────────────────── */

let isOpen = false
const listeners = new Set<() => void>()
const setOpen = (open: boolean) => {
  if (isOpen === open) return
  isOpen = open
  listeners.forEach((l) => l())
}
const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => {
    listeners.delete(l)
  }
}

/** Shows the daily reward (the streak card's chest). */
export const openDailyReward = () => setOpen(true)

/* ── Shown today on this device ───────────────────────────────────── */

const SEEN_PREFIX = "joysplit_daily_seen_"
const seenKey = (uid: string, day: string) => `${SEEN_PREFIX}${uid}_${day}`
/** For when storage is off: at least once per app run. */
const seenHere = new Set<string>()

function seenToday(uid: string, day: string): boolean {
  const key = seenKey(uid, day)
  if (seenHere.has(key)) return true
  try {
    return localStorage.getItem(key) === "1"
  } catch {
    return false
  }
}

function markSeen(uid: string, day: string) {
  const key = seenKey(uid, day)
  seenHere.add(key)
  try {
    // Earlier days' marks are done with
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i)
      if (k && k !== key && k.startsWith(`${SEEN_PREFIX}${uid}_`)) localStorage.removeItem(k)
    }
    localStorage.setItem(key, "1")
  } catch {}
}

/** Anything else up right now — a reward popup, the tour, a dialog or sheet — means wait. */
const somethingElseUp = () =>
  tourRunning() || !!document.querySelector(".rwn-popup, .driver-popover, [role='dialog'][aria-modal='true'], [data-slot='dialog-content'], [data-slot='sheet-content'], [data-slot='drawer-content']")

/* ── The host ─────────────────────────────────────────────────────── */

/** Mounted once in the app's providers (components/providers/fun-sync), beside the Games welcome. */
export function DailyRewardHost() {
  const { user, authState } = useSession()
  const wallet = useWallet()
  const pathname = usePathname()
  const today = useToday()
  const open = React.useSyncExternalStore(subscribe, () => isOpen, () => false)
  const uid = user?.uid
  const onGames = isGameTabPage(pathname)

  // Leaving the Games tabs (into a game, or to Split) takes it away
  React.useEffect(() => {
    if (open && !onGames) setOpen(false)
  }, [open, onGames])

  const latest = React.useRef({ pathname, tours: user?.tours })
  React.useEffect(() => {
    latest.current = { pathname, tours: user?.tours }
  })

  // Due: signed in, on a Games tab, the welcome gifts already taken, today's not
  const welcomed = !!wallet?.welcomed && (!!wallet.welcomeFrame || !!wallet.frames?.includes(WELCOME_FRAME))
  const due =
    !open &&
    !!uid &&
    authState === "authenticatedProfileComplete" &&
    onGames &&
    !!today &&
    welcomed &&
    wallet?.dailyDay !== today

  React.useEffect(() => {
    if (!due || !uid || seenToday(uid, today)) return
    // Wait for a calm moment: a little after landing, with nothing else on screen
    // for two checks in a row (the welcome flow hands over between its popups)
    let calm = 0
    const id = window.setInterval(() => {
      const { pathname: p, tours } = latest.current
      const busy =
        document.visibilityState !== "visible" ||
        somethingElseUp() ||
        // The Games tour comes first on the hub
        (p === GAME_ROUTES.hub && !tourDone("games", uid, tours))
      calm = busy ? 0 : calm + 1
      if (calm < 2) return
      window.clearInterval(id)
      markSeen(uid, today)
      setOpen(true)
    }, 650)
    return () => window.clearInterval(id)
  }, [due, uid, today])

  if (!open || !uid || !today || wallet === undefined) return null
  return createPortal(<DailyRewardDialog wallet={wallet} today={today} onClose={() => setOpen(false)} />, document.body)
}

/* ── The dialog ───────────────────────────────────────────────────── */

type Phase = "ready" | "claiming" | "won" | "taken"

/** The panel itself (exported for previews; the host above decides when it shows). */
export function DailyRewardDialog({ wallet, today, onClose }: { wallet: Wallet | null; today: string; onClose: () => void }) {
  const takenToday = wallet?.dailyDay === today
  const [phase, setPhase] = React.useState<Phase>(takenToday ? "taken" : "ready")
  const [result, setResult] = React.useState<DailyClaim | null>(null)
  const claimRef = React.useRef<HTMLButtonElement>(null)
  const todayTile = React.useRef<HTMLDivElement>(null)
  const closable = phase !== "claiming"

  useBackToClose(true, onClose)
  React.useEffect(() => {
    claimRef.current?.focus({ preventScroll: true })
  }, [phase])
  React.useEffect(() => {
    if (!closable) return
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose()
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [closable, onClose])

  // Where in the 7-day cycle today is: the answer once claimed, else the wallet's run
  const run = result?.run ?? (takenToday ? Math.max(1, wallet?.dailyRun ?? 1) : nextRun(wallet?.dailyDay, wallet?.dailyRun, today))
  const day = result && result.day >= 1 && result.day <= DAILY_REWARDS.length ? result.day : cycleDay(run)
  const coins = result?.coins || DAILY_REWARDS[day - 1]
  const tomorrow = day === DAILY_REWARDS.length ? 1 : day + 1
  const done = phase === "won" || phase === "taken"
  const streak = streakView(wallet, today)

  const claim = async () => {
    if (phase !== "ready") return
    setPhase("claiming")
    try {
      const r = await claimDailyReward()
      setResult(r)
      if (!r.claimed) {
        setPhase("taken")
        gameToast({ title: "Already taken today", description: "Come back tomorrow for the next one" })
        return
      }
      setPhase("won")
      void flyCoins({ from: todayTile.current ?? claimRef.current, amount: r.coins })
    } catch (e) {
      gameToast({ title: "Couldn't claim your reward", description: getErrorMessage(e) })
      setPhase("ready")
    }
  }

  return (
    <div className="gu ds-wrap" role="dialog" aria-modal="true" aria-labelledby="ds-title">
      <span className="gu-scrim ds-scrim" aria-hidden onClick={closable ? onClose : undefined} />
      <div className="gu-pop relative my-auto w-full max-w-[360px]">
        {/* Its own ✕ (pinned to the corner, out of the flow), so the panel opens straight onto the track */}
        {closable && (
          <GameIconButton icon={Cancel01Icon} label="Close" tone="red" size="sm" onClick={onClose} className="!absolute top-8 -right-2.5 z-10" />
        )}
        <GamePanel title="Daily reward" bodyClassName="px-3.5 pb-4 !pt-7 text-center min-[360px]:px-4">
          {phase === "won" && result ? (
            <div className="relative flex flex-col items-center pt-1">
              <span className="ds-rays" aria-hidden />
              <div className="ds-won relative">
                <span id="ds-title" className="ds-plus">
                  +{result.coins.toLocaleString("en-IN")}
                </span>
                <span className="mt-1 text-sm font-bold text-[var(--gu-brown)] uppercase">Day {day} coins</span>
              </div>
            </div>
          ) : (
            <>
              <h2 id="ds-title" className="ds-head">
                {phase === "taken" ? "See you tomorrow!" : `Day ${day} gift`}
              </h2>
              <p className="ds-sub">
                {phase === "taken"
                  ? `Tomorrow: day ${tomorrow}, ${DAILY_REWARDS[tomorrow - 1]} coins. Don't miss a day!`
                  : day === DAILY_REWARDS.length
                    ? "Seven days in a row — the big chest is yours!"
                    : run > 1
                      ? `${run} days in a row. Keep coming back — day 7 is the big chest.`
                      : "Come back every day: the gifts grow, and day 7 is the big chest."}
              </p>
            </>
          )}

          <div className="ds-track" role="list" aria-label="This week's gifts">
            {DAILY_REWARDS.map((amount, i) => {
              const n = i + 1
              const state = n < day ? "done" : n === day ? (done ? "claimed" : "today") : "next"
              const big = n === DAILY_REWARDS.length
              return (
                <div
                  key={n}
                  ref={n === day ? todayTile : undefined}
                  role="listitem"
                  aria-label={`Day ${n}: ${amount} coins${state === "done" || state === "claimed" ? ", taken" : state === "today" ? ", today" : ""}`}
                  className="ds-tile"
                  data-state={state}
                  data-big={big || undefined}
                >
                  {big ? (
                    <>
                      <TreasureChest open={state === "claimed"} className="h-12 w-[54px] shrink-0" />
                      <span className="flex flex-col items-start gap-1">
                        <span className="ds-day">{state === "today" ? "Today" : `Day ${n}`}</span>
                        <span className="ds-amt inline-flex items-center gap-1 !text-[17px]">
                          <CoinIcon className="size-[18px]" />
                          {amount}
                        </span>
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="ds-day">{state === "today" ? "Today" : `Day ${n}`}</span>
                      <span className="ds-coin" data-pile={n >= 4 || undefined}>
                        <CoinIcon />
                        {n >= 4 && <CoinIcon />}
                        {n >= 6 && <CoinIcon />}
                      </span>
                      <span className="ds-amt">{amount}</span>
                    </>
                  )}
                  {(state === "done" || state === "claimed") && (
                    <span className="ds-tick" aria-hidden>
                      <HugeiconsIcon icon={Tick02Icon} className="size-3.5" strokeWidth={3.2} />
                    </span>
                  )}
                </div>
              )
            })}
          </div>

          {phase === "won" && result ? (
            <p className="mt-3.5 flex items-center justify-center gap-1.5 text-sm font-bold text-[var(--gu-ink-soft)]">
              Balance
              <span className="gu-chip h-7 !px-2.5 text-sm text-[var(--gu-ink)]">
                <CoinIcon className="size-4" />
                <CountUp from={Math.max(0, result.balance - result.coins)} to={result.balance} />
              </span>
            </p>
          ) : null}

          {done ? (
            <GameButton ref={claimRef} tone="green" size="lg" className="mt-4 w-full" onClick={onClose}>
              {phase === "won" ? "Awesome!" : "OK"}
            </GameButton>
          ) : (
            <GameButton
              ref={claimRef}
              tone="yellow"
              size="lg"
              className="mt-4 w-full"
              disabled={phase === "claiming"}
              onClick={claim}
              data-no-tap-sound
            >
              {phase === "claiming" ? (
                "Claiming…"
              ) : (
                <>
                  Claim
                  <Coins amount={coins} className="font-bold" iconClassName="size-5" />
                </>
              )}
            </GameButton>
          )}

          <StreakLine days={streak.days} atRisk={streak.atRisk} safe={streak.safe} />
        </GamePanel>
      </div>
    </div>
  )
}

/** Under the button: the play streak, so the gift leads into a game. */
function StreakLine({ days, atRisk, safe }: { days: number; atRisk: boolean; safe: boolean }) {
  return (
    <p className="mt-3.5 text-center text-xs leading-snug font-bold text-balance text-[var(--gu-brown)]">
      <StreakFlame lit={days > 0} still className="mr-1 inline-block size-4 align-[-3px]" />
      <span className="min-w-0">
        {days === 0
          ? "Play a live game every day to build a streak"
          : atRisk
            ? `Play a game today to keep your ${days}-day streak`
            : safe
              ? `${days}-day play streak — on fire!`
              : `${days}-day play streak`}
      </span>
    </p>
  )
}

const fmt = new Intl.NumberFormat("en-IN")

/** A number rolling up from `from` to `to` (as the coins land). */
function CountUp({ from, to }: { from: number; to: number }) {
  const ref = React.useRef<HTMLSpanElement>(null)
  React.useEffect(() => {
    const el = ref.current
    if (!el) return
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      el.textContent = fmt.format(to)
      return
    }
    let raf = 0
    const start = performance.now() + 550
    const step = (t: number) => {
      const k = Math.min(1, Math.max(0, (t - start) / 900))
      const eased = 1 - (1 - k) ** 3
      el.textContent = fmt.format(Math.round(from + (to - from) * eased))
      if (k < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [from, to])
  return (
    <span ref={ref} className="tabular-nums">
      {fmt.format(from)}
    </span>
  )
}
