"use client"

import * as React from "react"
import { createPortal } from "react-dom"

import { CoinIcon } from "@/components/fun/coin"
import { FramedAvatar } from "@/components/fun/framed-avatar"
import { CharacterTile } from "@/components/game-avatar/character-tile"
import { rewardName, type Reward } from "@/components/game-avatar/ownership"
import type { CharacterDef } from "@/components/game-avatar/types"
import { GameButton, GamePanel } from "@/components/game-ui/kit"
import { useSession } from "@/components/providers/session-provider"
import type { FrameId } from "@/lib/fun/catalog"
import { useSoundSettings } from "@/lib/live/sound"
import { flyCoins, type CoinOrigin } from "./coin-burst"
import { installTapSound } from "./tap-sound"
import { TrophyIcon } from "./trophy"
import { playCoinTing, setUiSoundOn } from "./ui-sounds"

/**
 * Game-style reward notices, so a claim or an unlock on the Games side never
 * shows up as a plain Split toast:
 *
 * - `gameToast()`: a cream card in the blue frame dropping in at the top, with
 *   the item's art; goes by itself (or on a tap).
 * - `rewardPopup()`: the bigger moment — a framed panel over a dimmed screen,
 *   the art on a burst of gold rays, and an OK button. Several queue up.
 * - `announceReward()`: the right one for a level / achievement reward —
 *   coins fly into the counter (flyCoins), a frame or character pops up.
 *
 * All of it is drawn by RewardsHost (mounted once in the app's providers),
 * which also keeps the UI sounds in step with the games' sound switch and
 * installs the Games side's tap sound.
 */

/** What a notice shows: a frame on your photo, a character, coins, a trophy, or anything. */
export type RewardArt =
  | { frame: FrameId }
  | { character: CharacterDef }
  | { coins: true }
  | { trophy: true }
  | { node: React.ReactNode }

type ToastItem = {
  id: number
  title: string
  description?: string
  art?: RewardArt
  duration: number
  onClick?: () => void
  leaving?: boolean
}
type PopupItem = {
  id: number
  kicker?: string
  title: string
  line?: string
  art?: RewardArt
  okLabel?: string
  onOk?: () => void
}
type State = { toasts: ToastItem[]; popups: PopupItem[] }

/* ── Store ─────────────────────────────────────────────────────────── */

const EMPTY: State = { toasts: [], popups: [] }
let state: State = EMPTY
let seq = 0
const listeners = new Set<() => void>()
const set = (next: State) => {
  state = next
  listeners.forEach((l) => l())
}
const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => listeners.delete(l)
}

const MAX_TOASTS = 3
const LEAVE_MS = 220

/** A game-style toast at the top: a title, an optional line, and the item's art. Tapping it runs `onClick` and closes it. */
export function gameToast({
  title,
  description,
  art,
  duration = 3200,
  onClick,
}: {
  title: string
  description?: string
  art?: RewardArt
  duration?: number
  onClick?: () => void
}): number {
  const id = ++seq
  const toasts = [...state.toasts, { id, title, description, art, duration, onClick }]
  set({ ...state, toasts: toasts.slice(-MAX_TOASTS) })
  return id
}

export function dismissGameToast(id: number) {
  if (!state.toasts.some((t) => t.id === id && !t.leaving)) return
  set({ ...state, toasts: state.toasts.map((t) => (t.id === id ? { ...t, leaving: true } : t)) })
  window.setTimeout(() => set({ ...state, toasts: state.toasts.filter((t) => t.id !== id) }), LEAVE_MS)
}

/** The big moment: a framed popup with the art and an OK button. Queues behind any open one. */
export function rewardPopup(p: Omit<PopupItem, "id">): number {
  const id = ++seq
  set({ ...state, popups: [...state.popups, { ...p, id }] })
  return id
}

function closePopup(id: number) {
  const p = state.popups.find((x) => x.id === id)
  set({ ...state, popups: state.popups.filter((x) => x.id !== id) })
  p?.onOk?.()
}

/**
 * Tell the player about a reward they just took: coins fly from `from` into
 * the counter; a frame or character pops up (`quiet`: a toast instead, when
 * a reward screen is already showing it big).
 */
export function announceReward(r: Reward, opts: { from?: CoinOrigin; equip?: boolean; quiet?: boolean } = {}) {
  if (r.kind === "coins") {
    void flyCoins({ from: opts.from, amount: r.coins })
    return
  }
  const art: RewardArt = r.kind === "character" ? { character: r.def } : { frame: r.frame }
  if (opts.quiet) {
    gameToast({ title: opts.equip ? `${rewardName(r)} — equipped` : `${rewardName(r)} — yours`, art })
    return
  }
  announceUnlock({ title: rewardName(r), art, equipped: opts.equip })
}

/** "Unlocked!": a frame, character, board or badge that's now yours. */
export function announceUnlock({
  title,
  art,
  equipped,
  line,
}: {
  title: string
  art?: RewardArt
  equipped?: boolean
  line?: string
}) {
  playCoinTing(4)
  rewardPopup({
    kicker: "Unlocked!",
    title,
    art: art ?? { trophy: true },
    line: line ?? (equipped ? "It's on — show it off in your next game" : "It's yours — find it in your Inventory"),
    okLabel: "Awesome!",
  })
}

/** Whether a Games screen is showing right now (a full-page `.gu` sky). */
export function onGamesSide(): boolean {
  if (typeof document === "undefined") return false
  return !!document.querySelector(".gu.gu-sky.min-h-svh")
}

/* ── Host ──────────────────────────────────────────────────────────── */

/** Mounted once in the providers: draws the notices, syncs the UI sounds, installs the tap sound. */
export function RewardsHost() {
  const { on } = useSoundSettings()
  React.useEffect(() => setUiSoundOn(on), [on])
  React.useEffect(() => installTapSound(), [])

  const s = React.useSyncExternalStore(subscribe, () => state, () => EMPTY)
  const popup = s.popups[0]
  if (s.toasts.length === 0 && !popup) return null
  return createPortal(
    <>
      <NoticeStyles />
      {s.toasts.length > 0 && (
        <div className="gu rwn-toasts" aria-live="polite">
          {s.toasts.map((t) => (
            <Toast key={t.id} item={t} />
          ))}
        </div>
      )}
      {popup && <Popup key={popup.id} item={popup} more={s.popups.length - 1} />}
    </>,
    document.body
  )
}

function Toast({ item }: { item: ToastItem }) {
  React.useEffect(() => {
    const t = window.setTimeout(() => dismissGameToast(item.id), item.duration)
    return () => window.clearTimeout(t)
  }, [item.id, item.duration])
  return (
    <button
      type="button"
      className="rwn-toast"
      data-leaving={item.leaving || undefined}
      onClick={() => {
        item.onClick?.()
        dismissGameToast(item.id)
      }}
      data-no-tap-sound
    >
      {item.art && (
        <span className="rwn-toast-art">
          <Art art={item.art} size={40} />
        </span>
      )}
      <span className="min-w-0 flex-1 text-left">
        <span className="rwn-toast-title">{item.title}</span>
        {item.description && <span className="rwn-toast-desc">{item.description}</span>}
      </span>
    </button>
  )
}

function Popup({ item, more }: { item: PopupItem; more: number }) {
  const ok = React.useRef<HTMLButtonElement>(null)
  React.useEffect(() => {
    ok.current?.focus({ preventScroll: true })
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closePopup(item.id)
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [item.id])
  return (
    <div className="gu rwn-popup" role="dialog" aria-modal="true" aria-labelledby={`rwn-${item.id}`}>
      <span className="gu-scrim rwn-scrim" aria-hidden onClick={() => closePopup(item.id)} />
      <div className="gu-pop relative w-full max-w-[340px]">
        <GamePanel title={item.kicker} bodyClassName="flex flex-col items-center text-center">
          <div className="rwn-stage" aria-hidden>
            <span className="rwn-rays" />
            <span className="rwn-glow" />
            {item.art && (
              <span className="rwn-item">
                <Art art={item.art} size={108} big />
              </span>
            )}
          </div>
          <h2 id={`rwn-${item.id}`} className="rwn-title">
            {item.title}
          </h2>
          {item.line && <p className="rwn-line">{item.line}</p>}
          <GameButton ref={ok} tone="yellow" size="lg" className="mt-4 w-full" onClick={() => closePopup(item.id)}>
            {item.okLabel ?? "OK"}
          </GameButton>
          {more > 0 && <p className="rwn-more">+{more} more</p>}
        </GamePanel>
      </div>
    </div>
  )
}

function Art({ art, size, big }: { art: RewardArt; size: number; big?: boolean }) {
  const { user } = useSession()
  // A frame is drawn well outside the photo: shrink the photo so the whole frame fits
  if ("frame" in art)
    return (
      <FramedAvatar src={user?.photoURL} name={user?.displayName ?? "You"} frame={art.frame} size={Math.round(size * 0.66)} />
    )
  if ("character" in art)
    return <CharacterTile def={art.character} size={size} mode={big ? "intro" : "still"} shape={big ? "card" : "circle"} />
  if ("coins" in art) return <CoinIcon className="drop-shadow-[0_3px_4px_rgba(120,60,0,.35)]" />
  if ("trophy" in art) return <TrophyIcon className="drop-shadow-[0_3px_4px_rgba(120,60,0,.35)]" />
  return <>{art.node}</>
}

function NoticeStyles() {
  return (
    <style href="joysplit-reward-notice" precedence="default">
      {CSS}
    </style>
  )
}

const CSS = `
.rwn-toasts{position:fixed;left:0;right:0;top:calc(env(safe-area-inset-top,0px) + 10px);z-index:110;display:flex;flex-direction:column;align-items:center;gap:8px;padding:0 16px;pointer-events:none}
.rwn-toast{pointer-events:auto;display:flex;width:min(100%,360px);align-items:center;gap:12px;padding:9px 16px 9px 10px;border:0;border-radius:20px;
  background:var(--gu-cream);color:var(--gu-ink);font-family:var(--gu-font);cursor:pointer;will-change:transform,opacity;
  box-shadow:0 0 0 3px var(--gu-frame),0 5px 0 2px var(--gu-frame-deep),0 12px 24px rgba(30,40,110,.3);
  animation:rwn-drop .42s cubic-bezier(.2,1.3,.4,1) both}
.rwn-toast[data-leaving]{animation:rwn-lift .22s ease-in both}
.rwn-toast-art{display:flex;width:46px;height:46px;flex-shrink:0;align-items:center;justify-content:center;border-radius:14px;overflow:hidden;
  background:radial-gradient(circle at 50% 40%,#fff6cf,#ffe08a 70%);box-shadow:inset 0 0 0 2px #f2c14e}
.rwn-toast-art > svg{width:34px;height:34px}
.rwn-toast-title{display:block;font-size:16px;font-weight:700;line-height:1.2;letter-spacing:.01em}
.rwn-toast-desc{display:block;margin-top:1px;font-size:13px;font-weight:600;color:var(--gu-ink-soft)}

.rwn-popup{position:fixed;inset:0;z-index:105;display:flex;align-items:center;justify-content:center;padding:20px}
.rwn-scrim{position:absolute;inset:0;animation:rwn-fade .25s ease-out both}
.rwn-stage{position:relative;display:flex;width:100%;height:150px;align-items:center;justify-content:center;margin-top:-4px}
.rwn-rays{position:absolute;width:260px;height:260px;border-radius:50%;
  background:repeating-conic-gradient(from 0deg,rgba(255,196,40,.32) 0deg 10deg,transparent 10deg 24deg);
  -webkit-mask:radial-gradient(circle,#000 20%,transparent 64%);mask:radial-gradient(circle,#000 20%,transparent 64%);
  animation:rwn-spin 16s linear infinite;will-change:transform}
.rwn-glow{position:absolute;width:150px;height:150px;border-radius:50%;background:radial-gradient(circle,#ffe58a 0%,rgba(255,229,138,0) 70%)}
.rwn-item{position:relative;display:flex;animation:rwn-rise .55s .08s cubic-bezier(.2,1.5,.4,1) both}
.rwn-item > svg{width:96px;height:96px}
.rwn-title{margin:6px 0 0;font-size:26px;font-weight:700;line-height:1.1;color:var(--gu-ink);letter-spacing:.01em}
.rwn-line{margin:6px 0 0;font-size:14px;font-weight:600;color:var(--gu-ink-soft)}
.rwn-more{margin:10px 0 0;font-size:12px;font-weight:700;color:var(--gu-brown)}
@keyframes rwn-drop{from{opacity:0;transform:translateY(-120%) scale(.96)}}
@keyframes rwn-lift{to{opacity:0;transform:translateY(-120%) scale(.96)}}
@keyframes rwn-fade{from{opacity:0}}
@keyframes rwn-rise{from{opacity:0;transform:scale(.4) translateY(24px)}}
@keyframes rwn-spin{to{transform:rotate(360deg)}}
@media (prefers-reduced-motion:reduce){
  .rwn-toast,.rwn-item,.rwn-scrim{animation:none}
  .rwn-toast[data-leaving]{animation:none;opacity:0}
  .rwn-rays{animation:none}
}
`
