"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import { GameAvatar } from "../game-avatar"
import { characterById } from "../registry"
import type { CharacterDef } from "../types"
import { CharStickerArt } from "./flight"
import { stickersOf } from "./registry"
import type { CharSticker } from "./types"

const SHINE_CSS =
  "@keyframes cstk-shine{0%,55%{transform:translateX(-120%) skewX(-20deg)}100%{transform:translateX(220%) skewX(-20deg)}}" +
  "@keyframes cstk-cool{from{transform:scaleX(1)}to{transform:scaleX(0)}}" +
  ".cstk-shine{animation:cstk-shine 3.2s ease-in-out infinite}" +
  "@media (prefers-reduced-motion: reduce){.cstk-shine{animation:none;opacity:0}}"

/** The sticker's art on a glowing disc in the character's colour. */
function Gem({ sticker, accent, className }: { sticker: CharSticker; accent: string; className?: string }) {
  return (
    <span
      className={cn("relative flex shrink-0 items-center justify-center rounded-full", className)}
      style={{ background: `radial-gradient(circle, #ffffff 0%, ${accent}55 45%, transparent 72%)` }}
    >
      <CharStickerArt sticker={sticker} className="size-[78%] drop-shadow-md" />
    </span>
  )
}

/** Premium card chrome: an inner border and glow in the character's colour, and a passing shine. */
const cardStyle = (accent: string): React.CSSProperties => ({
  background: `linear-gradient(140deg, ${accent}38 0%, ${accent}12 60%, transparent 100%)`,
  boxShadow: `inset 0 0 0 1.5px ${accent}, 0 6px 20px -10px ${accent}`,
})

function Shine() {
  return (
    <span aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]">
      <span className="cstk-shine absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-white/45 to-transparent" />
    </span>
  )
}

/**
 * The top of the throw picker for a player wearing a character: its
 * signature stickers, free and unlimited (just a short gap between sends).
 * Nobody else's picker ever shows them.
 */
export function SignaturePicker({
  character,
  readyAt,
  busy,
  onSend,
}: {
  /** The equipped character's id. */
  character: string
  /** Epoch ms when the next one may go (the anti-spam gap). */
  readyAt: number
  busy: number | null
  onSend: (n: number) => void
}) {
  const def = characterById(character)
  const list = stickersOf(character)
  // The gap left, shown as a bar draining on each card
  const [cooling, setCooling] = React.useState(0)
  React.useEffect(() => {
    const ms = readyAt - Date.now()
    if (ms <= 0) return
    const on = window.setTimeout(() => setCooling(ms), 0)
    const off = window.setTimeout(() => setCooling(0), ms)
    return () => {
      window.clearTimeout(on)
      window.clearTimeout(off)
    }
  }, [readyAt])

  if (!def || list.length === 0) return null
  const one = list.length === 1
  return (
    <section className="flex flex-col gap-2" aria-label={`${def.name}'s signature stickers`}>
      <style>{SHINE_CSS}</style>
      <div className="flex items-center gap-2">
        <GameAvatar character={character} name={def.name} size={28} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold">
            Your character <span className="text-muted-foreground">·</span> {def.name}
          </p>
          <p className="truncate text-[11px] text-muted-foreground">Unlimited · comes with {def.name}</p>
        </div>
        <span
          className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide text-white uppercase"
          style={{ background: `linear-gradient(135deg, ${def.accent}, #1c1530)` }}
        >
          Signature
        </span>
      </div>
      <div className={cn("grid gap-2", one ? "grid-cols-1" : "grid-cols-2")}>
        {list.map((s) => (
          <button
            key={s.n}
            type="button"
            disabled={busy !== null || cooling > 0}
            onClick={() => onSend(s.n)}
            title={s.blurb}
            className={cn(
              "relative flex items-center gap-2 rounded-2xl p-2 text-left transition-[transform,opacity] active:scale-95 disabled:opacity-60",
              one ? "flex-row" : "flex-col pt-2.5 text-center"
            )}
            style={cardStyle(def.accent)}
          >
            <Shine />
            <Gem sticker={s} accent={def.accent} className={one ? "size-14" : "size-16"} />
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="line-clamp-1 text-[13px] leading-tight font-semibold">{s.name}</span>
              <span className={cn("text-[11px] leading-snug text-muted-foreground", one ? "line-clamp-2" : "line-clamp-1")}>
                {busy === s.n ? "Sending…" : one ? s.blurb : "Free · unlimited"}
              </span>
            </span>
            {cooling > 0 && (
              <span
                key={readyAt}
                aria-hidden
                className="absolute inset-x-3 bottom-1 h-0.5 origin-left rounded-full"
                style={{ background: def.accent, animation: `cstk-cool ${cooling}ms linear forwards` }}
              />
            )}
          </button>
        ))}
      </div>
    </section>
  )
}

/** On a character's sheet in the inventory: the stickers that come with it. */
export function SignatureStickers({ def }: { def: CharacterDef }) {
  const list = stickersOf(def.id)
  if (list.length === 0) return null
  return (
    <section className="flex flex-col gap-2 px-1">
      <style>{SHINE_CSS}</style>
      <div className="flex items-baseline justify-between gap-2">
        <h4 className="text-sm font-semibold">Signature stickers</h4>
        <span className="text-[11px] text-muted-foreground">Unlimited in live games</span>
      </div>
      <div className="flex flex-col gap-2">
        {list.map((s) => (
          <div key={s.n} className="relative flex items-center gap-2.5 rounded-xl p-2" style={cardStyle(def.accent)}>
            <Shine />
            <Gem sticker={s} accent={def.accent} className="size-12" />
            <div className="min-w-0">
              <p className="truncate text-[13px] font-semibold">{s.name}</p>
              <p className="line-clamp-2 text-[11px] leading-snug text-muted-foreground">{s.blurb}</p>
            </div>
          </div>
        ))}
      </div>
      <p className="text-[11px] text-muted-foreground">
        Only players wearing {def.name} can send these — tap someone&apos;s photo in a game. Everyone sees them land.
      </p>
    </section>
  )
}
