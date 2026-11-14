"use client"

import * as React from "react"
import gsap from "gsap"
import { toast } from "sonner"

import { Coins } from "@/components/fun/coin"
import { useSession } from "@/components/providers/session-provider"
import { BottomSheet } from "@/components/shared/bottom-sheet"
import { UserAvatar } from "@/components/shared/user-avatar"
import { Spinner } from "@/components/ui/spinner"
import { serverNow, useRoomChildren } from "@/hooks/use-live-room"
import { useWallet } from "@/hooks/use-fun"
import { getErrorMessage } from "@/lib/errors"
import { THROW_PREFIX, THROWABLE_IDS, THROWABLES, throwableOf, type ThrowableId } from "@/lib/live/throwables"
import type { Reaction, RoomPlayer } from "@/lib/live/types"
import { cn } from "@/lib/utils"
import { payForThrow } from "@/services/fun"
import { sendReaction } from "@/services/live-rooms"

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
          <UserAvatar uid={shown.uid} src={shown.photo} name={shown.name} size="sm" />
          <p className="text-sm text-muted-foreground">
            Everyone in the room sees it fly from you to {first}.
          </p>
        </div>
      )}
      <div className="grid grid-cols-4 gap-2 pb-2">
        {THROWABLE_IDS.map((id) => {
          const item = THROWABLES[id]
          const short = (wallet?.balance ?? 0) < item.price
          return (
            <button
              key={id}
              type="button"
              disabled={!!busy || short}
              onClick={() => void throwIt(id)}
              className={cn(
                "relative flex flex-col items-center gap-1 rounded-xl border bg-card px-1 pt-2.5 pb-2 transition-[transform,background-color] active:scale-95 disabled:opacity-45",
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
              <span className="text-[11px] font-medium">{item.name}</span>
              <Coins amount={item.price} className="text-[11px]" iconClassName="size-3" />
            </button>
          )
        })}
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
  const flights =
    since === null
      ? []
      : items.filter(
          (r) => r.value.at >= since && !!r.value.to && !!throwableOf(r.value.sticker) && !done.includes(r.key)
        )
  const finish = React.useCallback((key: string) => setDone((d) => [...d.slice(-40), key]), [])

  if (flights.length === 0) return null
  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden" aria-live="polite">
      <style>{`.throw-fuse{animation:throw-fuse .18s steps(2) infinite;transform-origin:55px 10px}@keyframes throw-fuse{50%{transform:scale(1.35) rotate(25deg)}}`}</style>
      {flights.map((r) => (
        <Flight
          key={r.key}
          id={r.key}
          item={throwableOf(r.value.sticker)!}
          from={r.value.uid}
          to={r.value.to!}
          onDone={finish}
        />
      ))}
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
    const start = anchorOf(from)?.at ?? { x: window.innerWidth / 2, y: window.innerHeight - 60 }
    const end = target.at
    const dx = end.x - start.x
    const dy = end.y - start.y
    const dist = Math.hypot(dx, dy)
    const ux = dx / (dist || 1)
    const uy = dy / (dist || 1)
    const lift = Math.min(150, 40 + dist * 0.3)
    const flight = Math.min(1.05, Math.max(0.55, dist / 650))
    const knifeAngle = (Math.atan2(dy, dx) * 180) / Math.PI + 45
    const spin = item === "knife" ? 0 : item === "bomb" ? 540 : item === "rose" || item === "kiss" ? 20 : 360

    const place = (p: Point) => ({ x: p.x - SIZE / 2, y: p.y - SIZE / 2 })
    gsap.set(layer, { x: end.x, y: end.y })
    gsap.set(el, { ...place(start), scale: 0.5, opacity: 0, rotation: item === "knife" ? knifeAngle : 0 })

    const proxy = { t: 0 }
    const tl = gsap.timeline({ onComplete: () => onDone(id) })
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
          rotation: item === "knife" ? knifeAngle : spin * t,
          scale: 1.1 + 0.25 * Math.sin(Math.PI * t),
        })
      },
    })

    const shake = (strength: number, times: number) =>
      gsap.fromTo(
        target.el,
        { x: -strength },
        { x: strength, duration: 0.05, repeat: times, yoyo: true, ease: "none", clearProps: "x" }
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
    switch (item) {
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
      <div ref={fx} className="absolute top-0 left-0">
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
