"use client"

import * as React from "react"
import gsap from "gsap"
import { toast } from "sonner"

import { Coins } from "@/components/fun/coin"
import { CharStickerFlight } from "@/components/game-avatar/stickers/flight"
import { CHAR_STICKER_GAP_MS, charStickerId, charStickerOf, paced } from "@/components/game-avatar/stickers/registry"
import { SignaturePicker } from "@/components/game-avatar/stickers/ui"
import { useSession } from "@/components/providers/session-provider"
import { BottomSheet } from "@/components/shared/bottom-sheet"
import { Spinner } from "@/components/ui/spinner"
import { serverNow, useRoomChildren, useRoomNode } from "@/hooks/use-live-room"
import { useWallet } from "@/hooks/use-fun"
import { getErrorMessage } from "@/lib/errors"
import { THROW_PREFIX, THROWABLE_IDS, THROWABLES, throwableOf, type ThrowableId } from "@/lib/live/throwables"
import type { Reaction, RoomPlayer } from "@/lib/live/types"
import { cn } from "@/lib/utils"
import { playSound, type SoundEvent } from "@/lib/live/sound"
import { payForThrow } from "@/services/fun"
import { sendReaction } from "@/services/live-rooms"
import { PlayerAvatar } from "./player-avatar"

/**
 * Ludo King style throwables. Mark each player's photo with
 * `data-throw-anchor={uid}`; tapping someone else's photo opens
 * <ThrowPicker>, and <ThrowOverlay> flies every throw in the room from the
 * thrower's photo to the target's, then plays its hit.
 */

/* ── Art ─────────────────────────────────────────────────────────────── */

export function ThrowableArt({ id, className }: { id: ThrowableId; className?: string }) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden className={cn("size-10", className)}>
      {ART[id]}
    </svg>
  )
}

const ART: Record<ThrowableId, React.ReactNode> = {
  rose: (
    <>
      <path d="M33 30c-1 10 0 20 3 30" stroke="#2f8a3b" strokeWidth="3.5" fill="none" strokeLinecap="round" />
      <path d="M34 44c-8-1-13 2-15 7 7 1 12-2 15-7z" fill="#3fae4f" />
      <path d="M35 50c7-3 12-2 15 2-6 3-11 2-15-2z" fill="#3fae4f" />
      <path d="M20 18c0-8 7-13 13-11 6-3 13 2 13 10 0 9-6 16-13 16S20 27 20 18z" fill="#c2185b" />
      <path d="M24 17c2-6 8-8 12-5-5 0-8 3-9 8-1-1-2-2-3-3z" fill="#f06292" />
      <path d="M33 12c5 0 9 4 9 9-3-3-7-4-11-3 0-2 1-4 2-6z" fill="#e91e63" />
      <path d="M26 24c3 4 9 5 13 2-2 4-6 6-9 5s-4-4-4-7z" fill="#ad1457" />
    </>
  ),
  kiss: (
    <>
      <path
        d="M6 30c6-8 14-12 20-9 3 1 4 3 6 3s3-2 6-3c6-3 14 1 20 9-6 10-15 16-26 16S12 40 6 30z"
        fill="#e11d48"
      />
      <path d="M6 30c9 3 17 4 26 4s17-1 26-4c-9 4-17 6-26 6S15 34 6 30z" fill="#9f1239" />
      <path d="M17 26c4-2 8-2 11 0-4 0-8 1-11 3z" fill="#fda4af" opacity="0.9" />
      <path d="M22 40c6 2 14 2 20 0-5 3-15 3-20 0z" fill="#fb7185" />
    </>
  ),
  cheers: (
    <>
      <rect x="14" y="20" width="28" height="36" rx="5" fill="#f59e0b" />
      <rect x="14" y="20" width="9" height="36" rx="4" fill="#fbbf24" />
      <path d="M42 28h5a7 7 0 0 1 0 14h-5" fill="none" stroke="#d97706" strokeWidth="5" />
      <circle cx="20" cy="17" r="4" fill="#fff" stroke="#d6d3d1" strokeWidth="1.2" />
      <circle cx="36" cy="16" r="4.5" fill="#fff" stroke="#d6d3d1" strokeWidth="1.2" />
      <path d="M12 22c0-6 5-9 9-7 2-5 10-6 13-1 5-2 10 2 9 8z" fill="#fff" stroke="#d6d3d1" strokeWidth="1.2" />
      <path d="M22 30v18M30 30v18" stroke="#fde68a" strokeWidth="2.5" strokeLinecap="round" opacity="0.8" />
    </>
  ),
  tomato: (
    <>
      <circle cx="32" cy="36" r="22" fill="#e53935" />
      <ellipse cx="24" cy="28" rx="6" ry="4" fill="#ff8a80" opacity="0.8" />
      <path d="M32 16l-4-6 4 3 4-3-4 6 7-2-6 5 6 4-7-2-4 5 1-6-7 2 5-4-6-4z" fill="#2e7d32" />
    </>
  ),
  egg: (
    <>
      <ellipse cx="32" cy="36" rx="17" ry="22" fill="#fff7ed" />
      <ellipse cx="32" cy="36" rx="17" ry="22" fill="none" stroke="#e7d3bd" strokeWidth="2" />
      <ellipse cx="26" cy="27" rx="5" ry="7" fill="#fff" />
      <path d="M40 48c-3 4-8 6-12 5 5 0 9-3 12-5z" fill="#e7d3bd" />
    </>
  ),
  water: (
    <>
      <path d="M32 8c13 0 21 10 21 22 0 13-10 22-21 22S11 43 11 30C11 18 19 8 32 8z" fill="#29b6f6" />
      <ellipse cx="24" cy="21" rx="6" ry="8" fill="#b3e5fc" opacity="0.85" />
      <path d="M28 52l4 4 4-4z" fill="#0288d1" />
      <path d="M32 56c-2 3 2 4 0 7" stroke="#0288d1" strokeWidth="1.5" fill="none" />
    </>
  ),
  knife: (
    <>
      {/* Points up-right */}
      <path d="M58 6L28 38l-4-4L52 4c2-1 5 0 6 2z" fill="#cfd8dc" />
      <path d="M58 6L28 38l-2-2L56 5z" fill="#90a4ae" />
      <rect x="21" y="34" width="10" height="4" rx="1.5" transform="rotate(-45 26 36)" fill="#455a64" />
      <path d="M24 38L9 53c-2 2-5 2-6 0s-1-4 1-6l15-15z" fill="#6d4c41" />
      <circle cx="12" cy="49" r="1.4" fill="#d7ccc8" />
      <circle cx="17" cy="44" r="1.4" fill="#d7ccc8" />
    </>
  ),
  punch: (
    <>
      {/* A boxing glove, punching to the right */}
      <rect x="4" y="24" width="14" height="18" rx="3" fill="#fff" stroke="#d1d5db" strokeWidth="1.5" />
      <path d="M16 22c0-8 7-13 18-13h6c12 0 20 8 20 21s-8 21-20 21h-9c-9 0-15-5-15-12z" fill="#dc2626" />
      <path d="M28 12c-4 4-4 10 0 14h10c4 0 6-3 6-7s-2-7-6-7z" fill="#b91c1c" />
      <ellipse cx="44" cy="20" rx="8" ry="4" fill="#fca5a5" opacity="0.8" />
      <path d="M16 40h18" stroke="#991b1b" strokeWidth="2" strokeLinecap="round" />
    </>
  ),
  chakra: (
    <>
      <circle cx="32" cy="32" r="31" fill="#fde047" opacity="0.35" />
      <path d="M54.00 32.00L61.42 37.85L52.33 40.42ZM52.33 40.42L56.94 48.67L47.56 47.56ZM47.56 47.56L48.67 56.94L40.42 52.33ZM40.42 52.33L37.85 61.42L32.00 54.00ZM32.00 54.00L26.15 61.42L23.58 52.33ZM23.58 52.33L15.33 56.94L16.44 47.56ZM16.44 47.56L7.06 48.67L11.67 40.42ZM11.67 40.42L2.58 37.85L10.00 32.00ZM10.00 32.00L2.58 26.15L11.67 23.58ZM11.67 23.58L7.06 15.33L16.44 16.44ZM16.44 16.44L15.33 7.06L23.58 11.67ZM23.58 11.67L26.15 2.58L32.00 10.00ZM32.00 10.00L37.85 2.58L40.42 11.67ZM40.42 11.67L48.67 7.06L47.56 16.44ZM47.56 16.44L56.94 15.33L52.33 23.58ZM52.33 23.58L61.42 26.15L54.00 32.00Z" fill="#f59e0b" stroke="#b45309" strokeWidth="0.8" strokeLinejoin="round" />
      <circle cx="32" cy="32" r="22" fill="#fbbf24" stroke="#b45309" strokeWidth="1.2" />
      <circle cx="32" cy="32" r="17" fill="#fde68a" />
      <path d="M32 32L49.00 32.00M32 32L44.02 44.02M32 32L32.00 49.00M32 32L19.98 44.02M32 32L15.00 32.00M32 32L19.98 19.98M32 32L32.00 15.00M32 32L44.02 19.98" stroke="#b45309" strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="32" cy="32" r="5" fill="#b45309" />
      <circle cx="32" cy="32" r="2.2" fill="#fef3c7" />
    </>
  ),
  meteor: (
    <>
      {/* Points down-right: a fiery tail behind, the rock in front */}
      <path d="M4 4c10 6 24 16 34 26-8-2-16 0-20 4C14 24 8 14 4 4z" fill="#ff9800" opacity="0.85" />
      <path d="M10 6c8 6 18 14 26 22-6-1-11 1-14 3C18 23 14 14 10 6z" fill="#ffeb3b" opacity="0.9" />
      <circle cx="42" cy="42" r="15" fill="#6d4c41" />
      <circle cx="42" cy="42" r="15" fill="none" stroke="#ff5722" strokeWidth="2.5" />
      <circle cx="37" cy="38" r="3.5" fill="#4e342e" />
      <circle cx="47" cy="46" r="2.5" fill="#4e342e" />
      <circle cx="45" cy="36" r="1.8" fill="#4e342e" />
    </>
  ),
  vajra: (
    <>
      <path d="M38 2L14 34h14L22 62l28-36H35L44 2z" fill="#fde047" stroke="#f59e0b" strokeWidth="2" strokeLinejoin="round" />
      <path d="M37 8L21 31h11l-5 18 15-21H32l6-20z" fill="#fff9c4" />
    </>
  ),
  bomb: (
    <>
      <circle cx="28" cy="38" r="20" fill="#263238" />
      <ellipse cx="21" cy="30" rx="6" ry="4" fill="#607d8b" opacity="0.8" transform="rotate(-30 21 30)" />
      <rect x="35" y="15" width="10" height="9" rx="2" transform="rotate(35 40 19)" fill="#455a64" />
      <path d="M44 15c3-5 7-6 10-4" stroke="#8d6e63" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <g className="throw-fuse">
        <circle cx="55" cy="10" r="4" fill="#ffb300" />
        <circle cx="55" cy="10" r="2" fill="#fff59d" />
        <path d="M55 2v4M61 10h-4M60 4l-3 3M50 4l3 3" stroke="#ff6f00" strokeWidth="1.8" strokeLinecap="round" />
      </g>
    </>
  ),
}

/** What's left on the target after a messy hit. */
function Splat({ colour, light }: { colour: string; light: string }) {
  return (
    <svg viewBox="0 0 64 64" className="size-full" aria-hidden>
      <path
        d="M32 10c4 0 5 7 9 6s8-6 10-2-3 8 0 11 10 1 9 6-8 3-8 7 6 9 2 12-8-3-12-1-3 9-8 9-4-8-8-9-9 5-12 1 2-8-1-11-10-2-10-7 8-4 8-8-6-7-3-10 8 2 11-1 1-9 5-9z"
        fill={colour}
      />
      <circle cx="28" cy="30" r="7" fill={light} opacity="0.7" />
      <circle cx="10" cy="14" r="2.5" fill={colour} />
      <circle cx="56" cy="50" r="2" fill={colour} />
      <circle cx="54" cy="12" r="1.8" fill={colour} />
    </svg>
  )
}

/* ── Picker ──────────────────────────────────────────────────────────── */

/** One throw per person per this long, so the screen stays readable. */
const THROW_GAP_MS = 1500

/** Opened by tapping another player's photo: pick something (it costs coins) and it flies at them. */
export function ThrowPicker({
  code,
  target,
  onOpenChange,
}: {
  code: string
  /** Who it's thrown at; null = closed. */
  target: RoomPlayer | null
  onOpenChange: (open: boolean) => void
}) {
  const { user } = useSession()
  const wallet = useWallet()
  const [busy, setBusy] = React.useState<ThrowableId | null>(null)
  const last = React.useRef(0)
  // The character you wear in this room brings its signature stickers: free, a short gap between sends
  const mine = useRoomNode<string>(user ? code : null, `players/${user?.uid}/avatar`).data
  const [sending, setSending] = React.useState<number | null>(null)
  const [readyAt, setReadyAt] = React.useState(0)
  // Keep showing who it was for while the sheet slides away
  const [shown, setShown] = React.useState(target)
  if (target && target !== shown) setShown(target)

  const throwIt = async (item: ThrowableId) => {
    if (!user || !target || busy) return
    if (!passesGap(last)) return
    setBusy(item)
    try {
      await payForThrow(user.uid, item, target.name)
      await sendReaction(code, user, `${THROW_PREFIX}${item}`, target.uid)
      onOpenChange(false)
    } catch (e) {
      toast.error(getErrorMessage(e, "Couldn't throw that"))
    } finally {
      setBusy(null)
    }
  }

  const sendSignature = async (n: number) => {
    if (!user || !target || !mine || sending !== null || busy) return
    const now = Date.now()
    if (now < readyAt) return
    setReadyAt(now + CHAR_STICKER_GAP_MS)
    setSending(n)
    try {
      await sendReaction(code, user, charStickerId(mine, n), target.uid)
      onOpenChange(false)
    } catch (e) {
      setReadyAt(0)
      toast.error(getErrorMessage(e, "Couldn't send that"))
    } finally {
      setSending(null)
    }
  }

  const first = shown?.name.split(" ")[0] ?? ""
  return (
    <BottomSheet
      open={!!target}
      onOpenChange={onOpenChange}
      title={`Throw at ${first}`}
      description={
        <span className="inline-flex items-center gap-1.5">
          Your coins: <Coins amount={wallet?.balance ?? 0} iconClassName="size-3.5" />
        </span>
      }
    >
      {shown && (
        <div className="mb-3 flex items-center gap-2.5">
          {/* Part of the game (a throw): no profile peek */}
          <PlayerAvatar player={shown} size={32} peek={false} />
          <p className="text-sm text-muted-foreground">
            Everyone in the room sees it fly from you to {first}.
          </p>
        </div>
      )}
      <div className="flex flex-col gap-3 pb-2">
        {mine && <SignaturePicker character={mine} readyAt={readyAt} busy={sending} onSend={(n) => void sendSignature(n)} />}
        <div className="grid grid-cols-4 gap-2">
          {THROWABLE_IDS.filter((id) => !THROWABLES[id].vip).map((id) => {
            const item = THROWABLES[id]
            const short = (wallet?.balance ?? 0) < item.price
            return (
              <button
                key={id}
                type="button"
                disabled={!!busy || short}
                onClick={() => void throwIt(id)}
                className={cn(
                  "relative flex flex-col items-center gap-1 rounded-xl border px-1 pt-2.5 pb-2 transition-[transform,background-color] active:scale-95 disabled:opacity-45",
                  "bg-card",
                  busy === id && "border-primary"
                )}
              >
                {busy === id ? (
                  <span className="flex size-11 items-center justify-center">
                    <Spinner className="size-5" />
                  </span>
                ) : (
                  <ThrowableArt id={id} className="size-11" />
                )}
                <span className="line-clamp-1 text-[11px] font-medium">{item.name}</span>
                <Coins amount={item.price} className="text-[11px]" iconClassName="size-3" />
              </button>
            )
          })}
        </div>
        <p className="flex items-center gap-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400">
          VIP <span className="font-normal text-muted-foreground">— big, loud, and seen by everyone</span>
        </p>
        <div className="grid grid-cols-4 gap-2">
          {THROWABLE_IDS.filter((id) => THROWABLES[id].vip).map((id) => {
            const item = THROWABLES[id]
            const short = (wallet?.balance ?? 0) < item.price
            return (
              <button
                key={id}
                type="button"
                disabled={!!busy || short}
                onClick={() => void throwIt(id)}
                className={cn(
                  "relative flex flex-col items-center gap-1 rounded-xl border px-1 pt-2.5 pb-2 transition-[transform,background-color] active:scale-95 disabled:opacity-45",
                  "border-amber-400/60 bg-gradient-to-b from-amber-100 to-amber-50 dark:from-amber-500/20 dark:to-amber-500/5",
                  busy === id && "border-primary"
                )}
              >
                {busy === id ? (
                  <span className="flex size-11 items-center justify-center">
                    <Spinner className="size-5" />
                  </span>
                ) : (
                  <ThrowableArt id={id} className="size-11" />
                )}
                <span className="line-clamp-1 text-[11px] font-medium">{item.name}</span>
                <Coins amount={item.price} className="text-[11px]" iconClassName="size-3" />
              </button>
            )
          })}
        </div>
      </div>
    </BottomSheet>
  )
}

function passesGap(last: React.RefObject<number>) {
  const t = Date.now()
  if (t - last.current < THROW_GAP_MS) return false
  last.current = t
  return true
}

/* ── Flights ─────────────────────────────────────────────────────────── */

type Point = { x: number; y: number }

/** Centre of a player's photo on screen, or null when it isn't showing. */
function anchorOf(uid: string): { el: HTMLElement; at: Point } | null {
  const el = document.querySelector<HTMLElement>(`[data-throw-anchor="${CSS.escape(uid)}"]`)
  if (!el) return null
  const r = el.getBoundingClientRect()
  return { el, at: { x: r.left + r.width / 2, y: r.top + r.height / 2 } }
}

/** Every throw in the room, flown across the screen. Mount once where the players' photos are. */
export function ThrowOverlay({ code }: { code: string }) {
  const items = useRoomChildren<Reaction>(code, "reactions", 24)
  // Only throws made after this screen opened fly; older ones are history
  const [since, setSince] = React.useState<number | null>(null)
  const [done, setDone] = React.useState<string[]>([])
  React.useEffect(() => {
    const id = window.setTimeout(() => setSince(serverNow() - 1500), 0)
    return () => window.clearTimeout(id)
  }, [])
  // Character stickers: at most one per player per gap, the same on every device
  const signatures = paced(items)
  const flights =
    since === null
      ? []
      : items.filter(
          (r) =>
            r.value.at >= since &&
            !!r.value.to &&
            (!!throwableOf(r.value.sticker) || signatures.has(r.key)) &&
            !done.includes(r.key)
        )
  const finish = React.useCallback((key: string) => setDone((d) => [...d.slice(-40), key]), [])

  if (flights.length === 0) return null
  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden" aria-live="polite">
      <style>{`.throw-fuse{animation:throw-fuse .18s steps(2) infinite;transform-origin:55px 10px}@keyframes throw-fuse{50%{transform:scale(1.35) rotate(25deg)}}`}</style>
      {flights.map((r) => {
        const signature = charStickerOf(r.value.sticker)
        return signature ? (
          <CharStickerFlight
            key={r.key}
            id={r.key}
            character={signature.character}
            sticker={signature.sticker}
            from={r.value.uid}
            to={r.value.to!}
            onDone={finish}
          />
        ) : (
          <Flight
            key={r.key}
            id={r.key}
            item={throwableOf(r.value.sticker)!}
            from={r.value.uid}
            to={r.value.to!}
            onDone={finish}
          />
        )
      })}
    </div>
  )
}

const SIZE = 46

/** One throw: flies in an arc from `from`'s photo to `to`'s, then plays its hit. */
function Flight({
  id,
  item,
  from,
  to,
  onDone,
}: {
  id: string
  item: ThrowableId
  from: string
  to: string
  onDone: (key: string) => void
}) {
  const shot = React.useRef<HTMLDivElement>(null)
  const fx = React.useRef<HTMLDivElement>(null)
  const screenFlash = React.useRef<HTMLDivElement>(null)
  const [splat, setSplat] = React.useState<null | { colour: string; light: string }>(null)

  React.useLayoutEffect(() => {
    const el = shot.current
    const layer = fx.current
    if (!el || !layer) return
    const target = anchorOf(to)
    if (!target) {
      onDone(id)
      return
    }
    const end = target.at
    // Meteors fall from the sky at an angle, the vajra strikes straight down; the rest fly from the thrower
    const fromSide = end.x > window.innerWidth / 2 ? -1 : 1
    const start =
      item === "meteor"
        ? { x: end.x + fromSide * 240, y: -70 }
        : item === "vajra"
          ? { x: end.x, y: -60 }
          : (anchorOf(from)?.at ?? { x: window.innerWidth / 2, y: window.innerHeight - 60 })
    const dx = end.x - start.x
    const dy = end.y - start.y
    const dist = Math.hypot(dx, dy)
    const ux = dx / (dist || 1)
    const uy = dy / (dist || 1)
    const sky = item === "meteor" || item === "vajra"
    const lift = sky ? 0 : item === "chakra" ? 50 : item === "punch" ? 15 : Math.min(150, 40 + dist * 0.3)
    const flight =
      item === "vajra"
        ? 0.22
        : item === "punch"
          ? 0.38
          : item === "meteor"
            ? 0.85
            : item === "chakra"
              ? 1.5
              : Math.min(1.05, Math.max(0.55, dist / 650))
    const knifeAngle = (Math.atan2(dy, dx) * 180) / Math.PI + 45
    // The meteor art points down-right; turn it along its fall
    const meteorAngle = (Math.atan2(dy, dx) * 180) / Math.PI - 45
    // The glove faces right; turn it toward the target
    const punchAngle = (Math.atan2(dy, dx) * 180) / Math.PI
    const spin =
      item === "knife" || item === "punch" || sky
        ? 0
        : item === "chakra"
          ? 1800
          : item === "bomb"
            ? 540
            : item === "rose" || item === "kiss"
              ? 20
              : 360
    if (item === "chakra") playSound("chakra")

    const place = (p: Point) => ({ x: p.x - SIZE / 2, y: p.y - SIZE / 2 })
    gsap.set(layer, { x: end.x, y: end.y })
    gsap.set(el, {
      ...place(start),
      scale: 0.5,
      opacity: 0,
      rotation: item === "knife" ? knifeAngle : item === "meteor" ? meteorAngle : item === "punch" ? punchAngle : 0,
    })

    const proxy = { t: 0 }
    // immediateRender off: the hit effects (fromTo) must not show their start until the hit itself
    const tl = gsap.timeline({ onComplete: () => onDone(id), defaults: { immediateRender: false } })
    tl.to(el, { opacity: 1, scale: 1.1, duration: 0.14, ease: "back.out(2)" })
    tl.to(proxy, {
      t: 1,
      duration: flight,
      ease: "power1.inOut",
      onUpdate: () => {
        const t = proxy.t
        gsap.set(el, {
          x: start.x + dx * t - SIZE / 2,
          y: start.y + dy * t - lift * 4 * t * (1 - t) - SIZE / 2,
          rotation: item === "knife" ? knifeAngle : item === "meteor" ? meteorAngle : item === "punch" ? punchAngle : spin * t,
          // The chakra grows as it spins in; sky strikes come in big
          scale:
            item === "chakra"
              ? 0.5 + 1.9 * t
              : sky
                ? 1.6 + 0.4 * t
                : 1.1 + 0.25 * Math.sin(Math.PI * t),
        })
      },
    })

    const shake = (strength: number, times: number) =>
      gsap.fromTo(
        target.el,
        { x: -strength },
        { x: strength, duration: 0.05, repeat: times, yoyo: true, ease: "none", onComplete: () => void gsap.set(target.el, { clearProps: "x" }) }
      )
    const particles = (count: number, colours: string[], reach: number, size = 8) => {
      const made: HTMLElement[] = []
      for (let i = 0; i < count; i++) {
        const p = document.createElement("span")
        const c = colours[i % colours.length]
        Object.assign(p.style, {
          position: "absolute",
          left: `${-size / 2}px`,
          top: `${-size / 2}px`,
          width: `${size}px`,
          height: `${size}px`,
          borderRadius: "50%",
          background: c,
          // Hidden until the hit
          opacity: "0",
        })
        layer.appendChild(p)
        made.push(p)
        const a = (i / count) * Math.PI * 2 + Math.random() * 0.4
        const r = reach * (0.6 + Math.random() * 0.5)
        tl.fromTo(
          p,
          { x: 0, y: 0, scale: 1, opacity: 1 },
          { x: Math.cos(a) * r, y: Math.sin(a) * r + reach * 0.25, scale: 0.2, opacity: 0, duration: 0.7, ease: "power2.out" },
          "hit"
        )
      }
      tl.add(() => made.forEach((p) => p.remove()))
    }

    tl.addLabel("hit")
    tl.add(() => playSound(`hit_${item}` as SoundEvent), "hit")
    switch (item) {
      case "chakra":
      case "meteor":
      case "vajra": {
        // VIP: a blinding flash, two shockwaves, a burst of sparks, and the photo rattles
        const flash = layer.querySelector<HTMLElement>("[data-fx=flash]")!
        const rings = layer.querySelectorAll<HTMLElement>("[data-fx=ring]")
        const screen = screenFlash.current
        const bolt = layer.querySelector<HTMLElement>("[data-fx=bolt]")
        if (bolt) {
          // The bolt reaches down from the top of the screen to the photo
          gsap.set(bolt, { height: end.y + 20, y: -end.y - 20 })
          tl.fromTo(bolt, { scaleY: 0, opacity: 1 }, { scaleY: 1, duration: 0.12, ease: "power4.in", transformOrigin: "50% 0%" }, "hit-=0.12")
          tl.to(bolt, { opacity: 0, duration: 0.5, ease: "power2.in" }, "hit+=0.25")
        }
        tl.to(el, { scale: item === "chakra" ? 3 : 2.4, duration: 0.14, ease: "power2.in" }, "hit")
        tl.to(el, { opacity: 0, duration: 0.2 }, "hit+=0.12")
        if (screen) tl.fromTo(screen, { opacity: item === "chakra" ? 0.5 : 0.75 }, { opacity: 0, duration: 0.5, ease: "power2.out" }, "hit+=0.1")
        tl.fromTo(flash, { scale: 0.3, opacity: 1 }, { scale: 3.4, opacity: 0, duration: 0.7, ease: "power2.out" }, "hit+=0.1")
        rings.forEach((r, i) =>
          tl.fromTo(r, { scale: 0.3, opacity: 0.95 }, { scale: 4.2 + i, opacity: 0, duration: 0.8 + i * 0.2, ease: "power2.out" }, `hit+=${0.1 + i * 0.12}`)
        )
        tl.add(() => void shake(10, 13), "hit+=0.1")
        particles(
          22,
          item === "chakra"
            ? ["#fde047", "#f59e0b", "#fff7ae", "#fb923c"]
            : item === "meteor"
              ? ["#ff6f00", "#ffb300", "#ff1744", "#5d4037"]
              : ["#e0f2fe", "#7dd3fc", "#fde047", "#ffffff"],
          110,
          10
        )
        tl.to({}, { duration: 0.4 })
        break
      }
      case "bomb": {
        // Flash, shockwave, debris, and the target shakes
        const flash = layer.querySelector<HTMLElement>("[data-fx=flash]")!
        const ring = layer.querySelector<HTMLElement>("[data-fx=ring]")!
        tl.to(el, { scale: 1.6, duration: 0.12, ease: "power2.in" }, "hit")
        tl.set(el, { opacity: 0 })
        tl.fromTo(flash, { scale: 0.2, opacity: 1 }, { scale: 2.6, opacity: 0, duration: 0.55, ease: "power2.out" }, "hit+=0.1")
        tl.fromTo(ring, { scale: 0.3, opacity: 0.9 }, { scale: 3.2, opacity: 0, duration: 0.7, ease: "power2.out" }, "hit+=0.1")
        tl.add(() => void shake(7, 9), "hit+=0.1")
        particles(14, ["#ff6f00", "#ffb300", "#ff1744", "#424242"], 70, 9)
        tl.to({}, { duration: 0.35 })
        break
      }
      case "punch": {
        // Wind up, punch through, POW — and the photo gets knocked back
        const pow = layer.querySelector<HTMLElement>("[data-fx=pow]")!
        tl.to(el, { x: `-=${ux * 14}`, y: `-=${uy * 14}`, duration: 0.07, ease: "power1.out" }, "hit")
        tl.to(el, { x: `+=${ux * 26}`, y: `+=${uy * 26}`, scale: 1.5, duration: 0.07, ease: "power3.in" })
        tl.fromTo(pow, { scale: 0.2, opacity: 1, rotation: -20 }, { scale: 1.3, rotation: 0, duration: 0.18, ease: "back.out(3)" }, "<")
        tl.add(() => {
          gsap.fromTo(target.el, { x: ux * 12, y: uy * 12 }, { x: 0, y: 0, duration: 0.5, ease: "elastic.out(1, 0.35)", clearProps: "x,y" })
        }, "<")
        tl.to(pow, { opacity: 0, scale: 1.6, duration: 0.3, ease: "power1.in" }, "+=0.35")
        tl.to(el, { opacity: 0, scale: 0.8, duration: 0.25 }, "<")
        break
      }
      case "knife": {
        // Stabs back and forth a few times, then drops away
        tl.to(el, { x: `-=${ux * 16}`, y: `-=${uy * 16}`, duration: 0.09, ease: "power1.out", repeat: 7, yoyo: true }, "hit")
        tl.add(() => void shake(3, 7), "hit")
        tl.to(el, { y: "+=40", rotation: knifeAngle + 90, opacity: 0, duration: 0.45, ease: "power2.in" })
        break
      }
      case "tomato":
      case "egg":
      case "water": {
        const look =
          item === "tomato"
            ? { colour: "#e53935", light: "#ff8a80" }
            : item === "egg"
              ? { colour: "#ffd54f", light: "#fff8e1" }
              : { colour: "#29b6f6", light: "#e1f5fe" }
        tl.to(el, { scaleX: 1.5, scaleY: 0.6, duration: 0.08, ease: "power2.in" }, "hit")
        tl.set(el, { opacity: 0 })
        tl.add(() => setSplat(look), "hit+=0.08")
        particles(item === "water" ? 12 : 8, [look.colour, look.light], item === "water" ? 60 : 40, item === "water" ? 7 : 9)
        tl.add(() => void shake(3, 5), "hit")
        const blot = layer.querySelector<HTMLElement>("[data-fx=splat]")!
        tl.fromTo(blot, { scale: 0.3, opacity: 0 }, { scale: 1, opacity: 0.95, duration: 0.18, ease: "back.out(2)" }, "hit+=0.08")
        tl.to(blot, { opacity: 0, y: 14, duration: 0.6, ease: "power1.in" }, "+=1.1")
        break
      }
      case "cheers": {
        // A clink: tilt, foam flies
        tl.to(el, { rotation: -35, duration: 0.15, ease: "power2.out" }, "hit")
        tl.to(el, { rotation: 15, duration: 0.15, yoyo: true, repeat: 1 })
        particles(10, ["#fff", "#fde68a"], 45, 7)
        tl.to(el, { opacity: 0, scale: 0.6, duration: 0.3 }, "+=0.2")
        break
      }
      default: {
        // Rose and kiss: a soft landing with little hearts
        tl.to(el, { scale: 1.4, duration: 0.15, ease: "back.out(3)" }, "hit")
        const hearts = layer.querySelectorAll<HTMLElement>("[data-fx=heart]")
        hearts.forEach((h, i) => {
          tl.fromTo(
            h,
            { x: (i - 1) * 16, y: 0, scale: 0.4, opacity: 0 },
            { y: -55 - i * 8, scale: 1, opacity: 1, duration: 0.6, ease: "power1.out" },
            `hit+=${i * 0.08}`
          )
          tl.to(h, { opacity: 0, duration: 0.3 }, `hit+=${0.45 + i * 0.08}`)
        })
        tl.to(el, { opacity: 0, y: "-=20", duration: 0.45, ease: "power1.in" }, "hit+=0.6")
      }
    }
    return () => {
      tl.kill()
    }
    // Plays once, for this throw
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <>
      <div ref={shot} className="absolute top-0 left-0 drop-shadow-lg" style={{ width: SIZE, height: SIZE }}>
        <ThrowableArt id={item} className="size-full" />
      </div>
      {(item === "chakra" || item === "meteor" || item === "vajra") && (
        <div
          ref={screenFlash}
          className="fixed inset-0 opacity-0"
          style={{ background: item === "vajra" ? "#f0f9ff" : item === "chakra" ? "#fef9c3" : "#ffedd5" }}
        />
      )}
      <div ref={fx} className="absolute top-0 left-0">
        {(item === "chakra" || item === "meteor" || item === "vajra") && (
          <>
            {item === "vajra" && (
              <svg data-fx="bolt" viewBox="0 0 40 400" preserveAspectRatio="none" className="absolute top-0 -left-5 w-10 opacity-0">
                <path d="M22 0L10 140L26 150L8 280L30 290L18 400" fill="none" stroke="#7dd3fc" strokeWidth="10" strokeLinejoin="round" opacity="0.5" />
                <path d="M22 0L10 140L26 150L8 280L30 290L18 400" fill="none" stroke="#fff" strokeWidth="4" strokeLinejoin="round" />
              </svg>
            )}
            <span
              data-fx="flash"
              className="absolute -top-14 -left-14 size-28 rounded-full opacity-0"
              style={{
                background:
                  item === "chakra"
                    ? "radial-gradient(circle, #ffffff 0%, #fde047 30%, #f59e0b 55%, transparent 72%)"
                    : item === "meteor"
                      ? "radial-gradient(circle, #fff9c4 0%, #ffb300 30%, #ff3d00 55%, transparent 72%)"
                      : "radial-gradient(circle, #ffffff 0%, #bae6fd 35%, #38bdf8 55%, transparent 72%)",
              }}
            />
            <span data-fx="ring" className={cn("absolute -top-10 -left-10 size-20 rounded-full border-4 opacity-0", item === "vajra" ? "border-sky-200" : "border-amber-300")} />
            <span data-fx="ring" className={cn("absolute -top-10 -left-10 size-20 rounded-full border-2 opacity-0", item === "vajra" ? "border-white" : "border-orange-400")} />
          </>
        )}
        {item === "punch" && (
          <svg data-fx="pow" viewBox="0 0 100 100" className="absolute -top-12 -left-12 size-24 opacity-0" aria-hidden>
            <path d="M50 2l9 22 22-12-8 24 25 2-21 14 17 19-25-5 2 25-17-19-12 22-6-24-22 12 9-23L2 52l22-11L8 22l25 5z" fill="#fde047" stroke="#dc2626" strokeWidth="4" strokeLinejoin="round" />
            <text x="50" y="59" textAnchor="middle" fontSize="24" fontWeight="900" fill="#dc2626" fontFamily="system-ui, sans-serif">POW!</text>
          </svg>
        )}
        {item === "bomb" && (
          <>
            <span
              data-fx="flash"
              className="absolute -top-10 -left-10 size-20 rounded-full opacity-0"
              style={{ background: "radial-gradient(circle, #fff9c4 0%, #ffb300 35%, #ff3d00 60%, transparent 72%)" }}
            />
            <span data-fx="ring" className="absolute -top-8 -left-8 size-16 rounded-full border-4 border-orange-300 opacity-0" />
          </>
        )}
        {(item === "tomato" || item === "egg" || item === "water") && (
          <span data-fx="splat" className="absolute -top-9 -left-9 size-18 opacity-0">
            {splat && <Splat colour={splat.colour} light={splat.light} />}
          </span>
        )}
        {(item === "rose" || item === "kiss") &&
          [0, 1, 2].map((i) => (
            <svg key={i} data-fx="heart" viewBox="0 0 24 24" className="absolute -top-2.5 -left-2.5 size-5 opacity-0" aria-hidden>
              <path
                d="M12 21s-7.5-4.4-8.9-9.2C2.3 8.8 4.1 5.8 7.2 5.8c2 0 3.4 1.1 4.8 2.9 1.4-1.8 2.8-2.9 4.8-2.9 3.1 0 4.9 3 4.1 6-1.4 4.8-8.9 9.2-8.9 9.2z"
                fill={i === 1 ? "#f43f5e" : "#fb7185"}
              />
            </svg>
          ))}
      </div>
    </>
  )
}


