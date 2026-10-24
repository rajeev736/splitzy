"use client"

import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"
import { DISCOUNT_PRESETS } from "@/lib/games"
import { cn } from "@/lib/utils"

/** Winner's discount: quick presets plus any whole percentage from 1 to 100. */
export function DiscountPicker({ value, onChange }: { value: number; onChange: (pct: number) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {DISCOUNT_PRESETS.map((pct) => (
        <button
          key={pct}
          type="button"
          onClick={() => onChange(pct)}
          className={cn(
            "h-8 rounded-md border px-3 text-xs font-medium tabular-nums transition-colors",
            value === pct ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:bg-muted"
          )}
        >
          {pct}%
        </button>
      ))}
      <InputGroup className="h-8 w-24">
        <InputGroupInput
          type="number"
          inputMode="numeric"
          min={1}
          max={100}
          aria-label="Custom discount percent"
          value={value}
          onChange={(e) => onChange(Math.min(100, Math.max(1, Math.round(Number(e.target.value) || 1))))}
          className="text-right text-xs font-medium"
        />
        <InputGroupAddon align="inline-end" className="text-xs">
          %
        </InputGroupAddon>
      </InputGroup>
    </div>
  )
}
