"use client"

import * as React from "react"

import { useSession } from "@/components/providers/session-provider"
import { serverNow, useRoomChildren } from "@/hooks/use-live-room"
import type { Reaction } from "@/lib/live/types"
import { cn } from "@/lib/utils"
import { sendReaction } from "@/services/live-rooms"

/** Stickers anyone can throw onto the game, free. */
export const STICKERS: { id: string; glyph: string; label: string }[] = [
  { id: "fire", glyph: "🔥", label: "Fire" },
  { id: "laugh", glyph: "😂", label: "Haha" },
  { id: "clap", glyph: "👏", label: "Clap" },
  { id: "wow", glyph: "😮", label: "Wow" },
  { id: "party", glyph: "🎉", label: "Party" },
  { id: "cry", glyph: "😭", label: "Noooo" },
  { id: "skull", glyph: "💀", label: "Dead" },
  { id: "heart", glyph: "❤️", label: "Love" },
  { id: "think", glyph: "🤔", label: "Hmm" },
  { id: "angry", glyph: "😡", label: "Angry" },
  { id: "cool", glyph: "😎", label: "Cool" },
  { id: "gg", glyph: "GG", label: "Good game" },
]
const BY_ID = Object.fromEntries(STICKERS.map((s) => [s.id, s]))
/** One sticker per this many ms per person, so the screen stays readable. */
const THROTTLE_MS = 700
/** How long a thrown sticker floats. */
const LIFETIME_MS = 2800

/** Horizontal row of sticker buttons. */
export function StickerBar({
  code,
  className,
}: {
  code: string
  className?: string
}) {
  const { user } = useSession()
  const last = React.useRef(0)
  const throw_ = (id: string) => {
    if (!user || !passesThrottle(last)) return
    void sendReaction(code, user, id).catch(() => undefined)
  }
  return (
    <div
      className={cn(
        "no-scrollbar flex gap-1.5 overflow-x-auto py-1",
        className
      )}
      role="toolbar"
      aria-label="Stickers"
    >
      {STICKERS.map((s) => (
        <button
          key={s.id}
          type="button"
          title={s.label}
          aria-label={s.label}
          onClick={() => throw_(s.id)}
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-lg border bg-card transition-transform hover:bg-muted active:scale-90",
            s.glyph.length > 2 ? "text-xs font-bold text-primary" : "text-xl"
          )}
        >
          {s.glyph}
        </button>
      ))}
    </div>
  )
}

/**
 * Stickers floating up over the game, with who threw them. Mount once per
 * room screen; it covers the viewport and never catches taps.
 */
export function ReactionsOverlay({ code }: { code: string }) {
  const items = useRoomChildren<Reaction>(code, "reactions", 24)
  // Only stickers thrown after this screen opened float; older ones are history
  const [since, setSince] = React.useState<number | null>(null)
  const [now, setNow] = React.useState(0)
  React.useEffect(() => {
    const id = window.setTimeout(() => setSince(serverNow() - 1500), 0)
    return () => window.clearTimeout(id)
  }, [])
  // A fine clock only while something is on screen, so expired stickers disappear
  React.useEffect(() => {
    if (items.length === 0) return
    const id = window.setInterval(() => setNow(serverNow()), 250)
    return () => window.clearInterval(id)
  }, [items.length])
  const fresh =
    since === null
      ? []
      : items.filter(
          (r) => r.value.at >= since && now - r.value.at < LIFETIME_MS
        )

  if (fresh.length === 0) return null
  return (
    <div
      className="pointer-events-none fixed inset-0 z-50 overflow-hidden"
      aria-live="polite"
    >
      <style>{`@keyframes js-sticker-float{0%{transform:translate3d(0,0,0) scale(.6);opacity:0}12%{opacity:1;transform:translate3d(0,-10vh,0) scale(1.15)}100%{transform:translate3d(var(--drift),-62vh,0) scale(1);opacity:0}}`}</style>
      {fresh.map((r, i) => {
        const s = BY_ID[r.value.sticker]
        if (!s) return null
        // Spread across the lower half of the screen, a little different for each
        const seed = hash(r.key)
        const left = 12 + (seed % 70)
        const drift = ((seed >> 4) % 60) - 30
        return (
          <div
            key={r.key}
            className="absolute bottom-24 flex flex-col items-center"
            style={
              {
                left: `${left}%`,
                "--drift": `${drift}px`,
                animation: `js-sticker-float ${LIFETIME_MS}ms cubic-bezier(.2,.7,.3,1) forwards`,
                animationDelay: `${(i % 3) * 60}ms`,
              } as React.CSSProperties
            }
          >
            <span
              className={cn(
                "drop-shadow-md",
                s.glyph.length > 2
                  ? "text-2xl font-black text-primary"
                  : "text-5xl"
              )}
            >
              {s.glyph}
            </span>
            <span className="mt-0.5 rounded-full bg-background/85 px-2 py-0.5 text-[11px] font-medium shadow-sm">
              {r.value.name.split(" ")[0]}
            </span>
          </div>
        )
      })}
    </div>
  )
}

/** At most one sticker per THROTTLE_MS (kept out of the component for the React Compiler). */
function passesThrottle(last: React.RefObject<number>) {
  const t = Date.now()
  if (t - last.current < THROTTLE_MS) return false
  last.current = t
  return true
}

function hash(s: string) {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return h
}
