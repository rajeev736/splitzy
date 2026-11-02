"use client"

import * as React from "react"

import { CARD_MAX, CARD_MIN, cardRank, HILO_CARDS } from "@/lib/games"
import { cn } from "@/lib/utils"
import { CardFace } from "./playing-card"

const VALUES = Array.from({ length: CARD_MAX - CARD_MIN + 1 }, (_, i) => CARD_MIN + i)

/**
 * Host setup for Higher or Lower: deal 6 cards in order. Tap a slot, then a
 * value. A value matching the card either side of the slot is greyed out, so
 * no two cards in a row are ever the same.
 */
export function HiloCardPicker({
  value,
  onChange,
  disabled,
}: {
  value: (number | null)[]
  onChange: (next: (number | null)[]) => void
  disabled?: boolean
}) {
  const [picked, setPicked] = React.useState<number | null>(null)
  const firstEmpty = value.findIndex((v) => v === null)
  const active = picked ?? (firstEmpty === -1 ? HILO_CARDS - 1 : firstEmpty)
  const neighbours = [value[active - 1], value[active + 1]]

  const choose = (v: number) => {
    const next = value.map((c, i) => (i === active ? v : c))
    onChange(next)
    // On to the next empty slot (if any)
    const after = next.findIndex((c, i) => c === null && i > active)
    const anyEmpty = next.findIndex((c) => c === null)
    setPicked(after !== -1 ? after : anyEmpty !== -1 ? anyEmpty : null)
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-center gap-1.5" role="radiogroup" aria-label="Cards in order">
        {value.map((card, i) => (
          <button
            key={i}
            type="button"
            role="radio"
            aria-checked={i === active}
            aria-label={`Card ${i + 1}${card ? `: ${cardRank(card)}` : ", not picked"}`}
            disabled={disabled}
            onClick={() => setPicked(i)}
            className={cn(
              "relative w-10 rounded-[6px] transition-transform active:scale-95 disabled:opacity-50 min-[400px]:w-12",
              i === active && "ring-2 ring-primary ring-offset-2 ring-offset-background"
            )}
          >
            {card !== null ? (
              <CardFace value={card} index={i} size="xs" className="w-full animate-in duration-200 zoom-in-90" />
            ) : (
              <span className="flex aspect-[5/7] w-full items-center justify-center rounded-[5px] border border-dashed border-muted-foreground/40 bg-muted/40 text-xs font-medium text-muted-foreground tabular-nums">
                {i + 1}
              </span>
            )}
          </button>
        ))}
      </div>
      <p className="text-center text-[11px] text-muted-foreground">
        {active === 0 ? "Card 1 is shown face up from the start" : `Card ${active + 1}`} — pick its value
      </p>
      <div className="grid grid-cols-7 gap-1.5">
        {VALUES.map((v) => {
          const clash = neighbours.includes(v)
          return (
            <button
              key={v}
              type="button"
              disabled={disabled || clash}
              onClick={() => choose(v)}
              aria-label={clash ? `${cardRank(v)} (same as the card next to it)` : cardRank(v)}
              className={cn(
                "flex h-9 items-center justify-center rounded-md border bg-card text-sm font-semibold tabular-nums transition-colors active:scale-95 disabled:cursor-default disabled:opacity-30",
                value[active] === v ? "border-primary bg-primary/10 text-primary ring-1 ring-primary" : "hover:bg-muted/60"
              )}
            >
              {cardRank(v)}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export const emptyHiloCards = (): (number | null)[] => Array.from({ length: HILO_CARDS }, () => null)
export const isHiloComplete = (cards: (number | null)[]): cards is number[] => cards.every((c) => c !== null)
