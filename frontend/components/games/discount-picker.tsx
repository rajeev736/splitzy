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
            "rounded-full border px-3.5 py-1.5 text-xs font-bold transition",
            value === pct ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:border-primary/40"
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
          className="text-right text-xs font-bold"
        />
        <InputGroupAddon align="inline-end" className="text-xs">
          %
        </InputGroupAddon>
      </InputGroup>
    </div>
  )
}
