"use client"

import { MinusSignIcon, PlusSignIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { Button } from "@/components/ui/button"
import { LUCKY_MAX, LUCKY_MIN } from "@/lib/games"

const clamp = (n: number) => Math.min(LUCKY_MAX, Math.max(LUCKY_MIN, Math.round(n)))

/** Pick a guess between 1 and 100: big number, ± buttons and a range slider. */
export function LuckyNumberPicker({
  value,
  onChange,
  disabled,
}: {
  value: number
  onChange: (n: number) => void
  disabled?: boolean
}) {
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex items-center gap-4">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-11 rounded-md"
          aria-label="Lower"
          disabled={disabled || value <= LUCKY_MIN}
          onClick={() => onChange(clamp(value - 1))}
        >
          <HugeiconsIcon icon={MinusSignIcon} />
        </Button>
        <input
          type="number"
          inputMode="numeric"
          min={LUCKY_MIN}
          max={LUCKY_MAX}
          aria-label="Your guess"
          disabled={disabled}
          value={value}
          onChange={(e) => onChange(clamp(Number(e.target.value) || LUCKY_MIN))}
          className="w-28 rounded-md border bg-card py-2 text-center text-4xl font-semibold tabular-nums outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-11 rounded-md"
          aria-label="Higher"
          disabled={disabled || value >= LUCKY_MAX}
          onClick={() => onChange(clamp(value + 1))}
        >
          <HugeiconsIcon icon={PlusSignIcon} />
        </Button>
      </div>
      <input
        type="range"
        min={LUCKY_MIN}
        max={LUCKY_MAX}
        aria-label="Your guess"
        disabled={disabled}
        value={value}
        onChange={(e) => onChange(clamp(Number(e.target.value)))}
        className="w-full max-w-sm accent-primary"
      />
    </div>
  )
}
