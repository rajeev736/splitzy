"use client"

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { cn } from "@/lib/utils"

export interface FilterPillOption<T extends string> {
  value: T
  label: string
}

/**
 * Single-select segmented filter (e.g. "All / Active / Settled"). Always keeps
 * one option selected — clicking the active pill does not clear it.
 */
export function FilterPills<T extends string>({
  options,
  value,
  onValueChange,
  className,
  "aria-label": ariaLabel,
}: {
  options: readonly FilterPillOption<T>[]
  value: T
  onValueChange: (value: T) => void
  className?: string
  "aria-label"?: string
}) {
  return (
    <ToggleGroup
      aria-label={ariaLabel}
      variant="outline"
      value={[value]}
      onValueChange={(next) => {
        if (next.length > 0) onValueChange(next[0] as T)
      }}
      className={cn(
        "w-full scrollbar-none justify-start overflow-x-auto pb-1",
        className
      )}
    >
      {options.map((o) => (
        <ToggleGroupItem
          key={o.value}
          value={o.value}
          className="h-9 rounded-md bg-card px-4 text-xs font-medium capitalize aria-pressed:border-primary aria-pressed:bg-primary aria-pressed:text-primary-foreground aria-pressed:hover:bg-primary/90 aria-pressed:hover:text-primary-foreground"
        >
          {o.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}
