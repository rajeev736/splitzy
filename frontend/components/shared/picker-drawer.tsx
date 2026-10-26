"use client"

import * as React from "react"
import { ArrowDown01Icon, Search01Icon, Tick02Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { BottomSheet } from "@/components/shared/bottom-sheet"
import { Button } from "@/components/ui/button"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"
import { cn } from "@/lib/utils"

export interface PickerItem {
  id: string
  label: string
  sublabel?: React.ReactNode
  /** Avatar / icon on the left. */
  media?: React.ReactNode
  /** Extra text the search matches (e.g. a JoySplit ID). */
  keywords?: string
}

/** Past this many items, the drawer shows a search box. */
const SEARCH_FROM = 6

/**
 * A long list to choose from, in a bottom drawer with search — scales to any
 * number of friends, groups, games or categories. Single choice closes the
 * drawer on tap; `multiple` toggles and closes with Done.
 */
export function PickerDrawer({
  open,
  onOpenChange,
  title,
  description,
  items,
  selected,
  onSelect,
  multiple = false,
  searchPlaceholder = "Search",
  emptyText = "Nothing here yet.",
  top,
  bottom,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: React.ReactNode
  items: PickerItem[]
  selected: string[]
  onSelect: (id: string) => void
  multiple?: boolean
  searchPlaceholder?: string
  emptyText?: React.ReactNode
  /** Above the list, e.g. "Create a group". */
  top?: React.ReactNode
  /** Below the list, e.g. a custom-category form. */
  bottom?: React.ReactNode
}) {
  const [search, setSearch] = React.useState("")
  const q = search.trim().toLowerCase()
  const shown = q
    ? items.filter((i) => `${i.label} ${i.keywords ?? ""}`.toLowerCase().includes(q))
    : items

  const close = (next: boolean) => {
    if (!next) setSearch("")
    onOpenChange(next)
  }

  return (
    <BottomSheet
      open={open}
      onOpenChange={close}
      title={title}
      description={description}
      header={
        items.length > SEARCH_FROM ? (
          <InputGroup className="h-10">
            <InputGroupAddon>
              <HugeiconsIcon icon={Search01Icon} className="size-4" />
            </InputGroupAddon>
            <InputGroupInput
              aria-label={searchPlaceholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={searchPlaceholder}
              className="text-sm"
            />
          </InputGroup>
        ) : undefined
      }
      footer={
        multiple ? (
          <Button size="lg" className="h-11 w-full" onClick={() => close(false)}>
            Done{selected.length > 0 ? ` · ${selected.length} selected` : ""}
          </Button>
        ) : undefined
      }
    >
      <div className="flex flex-col gap-3 pb-2">
        {top}
        {shown.length === 0 ? (
          <p className="py-6 text-center text-xs text-muted-foreground">
            {q ? <>No match for &quot;{search}&quot;.</> : emptyText}
          </p>
        ) : (
          <ul
            className="flex flex-col divide-y overflow-hidden rounded-lg border"
            role={multiple ? "group" : "radiogroup"}
          >
            {shown.map((item) => {
              const isOn = selected.includes(item.id)
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    role={multiple ? "checkbox" : "radio"}
                    aria-checked={isOn}
                    onClick={() => {
                      onSelect(item.id)
                      if (!multiple) close(false)
                    }}
                    className={cn(
                      "flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors",
                      isOn ? "bg-primary/10" : "hover:bg-muted/60"
                    )}
                  >
                    {item.media}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{item.label}</span>
                      {item.sublabel && (
                        <span className="block truncate text-xs text-muted-foreground">{item.sublabel}</span>
                      )}
                    </span>
                    <span
                      className={cn(
                        "flex size-5 shrink-0 items-center justify-center border",
                        multiple ? "rounded-[5px]" : "rounded-full",
                        isOn ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/40"
                      )}
                    >
                      {isOn && <HugeiconsIcon icon={Tick02Icon} className="size-3" strokeWidth={3} />}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
        {bottom}
      </div>
    </BottomSheet>
  )
}

/** The field that opens a PickerDrawer: what's chosen (or a placeholder) and a chevron. */
export function PickerTrigger({
  media,
  label,
  sublabel,
  placeholder,
  onClick,
  className,
}: {
  media?: React.ReactNode
  label?: React.ReactNode
  sublabel?: React.ReactNode
  placeholder: string
  onClick: () => void
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex min-h-12 w-full items-center gap-3 rounded-md border bg-card px-3 py-2 text-left transition-colors hover:bg-muted/50",
        className
      )}
    >
      {media}
      <span className="min-w-0 flex-1">
        {label ? (
          <span className="block truncate text-sm font-medium">{label}</span>
        ) : (
          <span className="block truncate text-sm text-muted-foreground">{placeholder}</span>
        )}
        {sublabel && <span className="block truncate text-xs text-muted-foreground">{sublabel}</span>}
      </span>
      <HugeiconsIcon icon={ArrowDown01Icon} className="size-4 shrink-0 text-muted-foreground" />
    </button>
  )
}
