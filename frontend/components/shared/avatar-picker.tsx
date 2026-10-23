"use client"

import * as React from "react"
import Image from "next/image"
import { Tick02Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { ALL_AVATARS, BOY_AVATARS, GIRL_AVATARS } from "@/lib/avatars"
import { cn } from "@/lib/utils"

export interface AvatarPickerProps {
  selectedAvatar?: string | null
  onSelectAvatar: (avatarSrc: string) => void
  className?: string
  columns?: 3 | 4 | 5
}

type CategoryTab = "boys" | "girls" | "all"

export function AvatarPicker({
  selectedAvatar,
  onSelectAvatar,
  className,
  columns = 4,
}: AvatarPickerProps) {
  const [activeTab, setActiveTab] = React.useState<CategoryTab>("boys")

  const currentList = React.useMemo(() => {
    switch (activeTab) {
      case "boys":
        return BOY_AVATARS
      case "girls":
        return GIRL_AVATARS
      case "all":
      default:
        return ALL_AVATARS
    }
  }, [activeTab])

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      {/* Category Pills Header */}
      <div className="flex items-center justify-center gap-1.5 rounded-2xl bg-muted/60 p-1">
        <button
          type="button"
          onClick={() => setActiveTab("boys")}
          className={cn(
            "flex-1 rounded-xl py-1.5 text-xs font-bold transition-all select-none text-center",
            activeTab === "boys"
              ? "bg-card text-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Boys ({BOY_AVATARS.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("girls")}
          className={cn(
            "flex-1 rounded-xl py-1.5 text-xs font-bold transition-all select-none text-center",
            activeTab === "girls"
              ? "bg-card text-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Girls ({GIRL_AVATARS.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("all")}
          className={cn(
            "flex-1 rounded-xl py-1.5 text-xs font-bold transition-all select-none text-center",
            activeTab === "all"
              ? "bg-card text-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          All ({ALL_AVATARS.length})
        </button>
      </div>

      {/* Grid of Avatars */}
      <div
        className={cn(
          "grid gap-3 max-h-[300px] overflow-y-auto px-1 py-1 sm:max-h-[340px]",
          columns === 3
            ? "grid-cols-3"
            : columns === 5
              ? "grid-cols-4 sm:grid-cols-5"
              : "grid-cols-4"
        )}
      >
        {currentList.map((avatar) => {
          const isSelected = selectedAvatar === avatar.src

          return (
            <button
              key={avatar.id}
              type="button"
              onClick={() => onSelectAvatar(avatar.src)}
              className={cn(
                "group relative flex aspect-square cursor-pointer items-center justify-center rounded-2xl border-2 p-1 transition-all duration-150 outline-none",
                isSelected
                  ? "border-primary bg-primary/10 shadow-sm ring-2 ring-primary/40 scale-102"
                  : "border-border/60 bg-card hover:border-primary/50 hover:bg-muted/40 hover:scale-105 active:scale-95"
              )}
              title={avatar.label}
              aria-label={avatar.label}
              aria-pressed={isSelected}
            >
              <div className="relative size-full overflow-hidden rounded-xl">
                <Image
                  src={avatar.src}
                  alt={avatar.label}
                  fill
                  sizes="96px"
                  className="object-cover transition-transform duration-200 group-hover:scale-110"
                />
              </div>

              {/* Selection Checkmark Badge */}
              {isSelected && (
                <div className="absolute -top-1 -right-1 flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md ring-2 ring-card animate-in zoom-in-75 duration-150">
                  <HugeiconsIcon icon={Tick02Icon} className="size-3.5 stroke-[3]" />
                </div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
