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
      {/* Category tabs */}
      <div className="flex items-center justify-center gap-1 rounded-md bg-muted p-0.5">
        <button
          type="button"
          onClick={() => setActiveTab("boys")}
          className={cn(
            "flex-1 rounded-[5px] py-1.5 text-center text-xs font-medium transition-colors select-none",
            activeTab === "boys"
              ? "bg-card text-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Boys ({BOY_AVATARS.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("girls")}
          className={cn(
            "flex-1 rounded-[5px] py-1.5 text-center text-xs font-medium transition-colors select-none",
            activeTab === "girls"
              ? "bg-card text-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Girls ({GIRL_AVATARS.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("all")}
          className={cn(
            "flex-1 rounded-[5px] py-1.5 text-center text-xs font-medium transition-colors select-none",
            activeTab === "all"
              ? "bg-card text-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          All ({ALL_AVATARS.length})
        </button>
      </div>

      {/* Grid of Avatars */}
      <div
        className={cn(
          "grid max-h-[300px] gap-2 overflow-y-auto p-0.5 sm:max-h-[340px]",
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
                "group relative flex aspect-square cursor-pointer items-center justify-center rounded-md border p-1 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                isSelected
                  ? "border-primary ring-1 ring-primary"
                  : "border-border bg-card hover:border-foreground/30"
              )}
              title={avatar.label}
              aria-label={avatar.label}
              aria-pressed={isSelected}
            >
              <div className="relative size-full overflow-hidden rounded-sm">
                <Image
                  src={avatar.src}
                  alt={avatar.label}
                  fill
                  sizes="96px"
                  className="object-cover"
                />
              </div>

              {/* Selection check */}
              {isSelected && (
                <div className="absolute -top-1 -right-1 flex size-4.5 items-center justify-center rounded-full bg-primary text-primary-foreground ring-2 ring-card">
                  <HugeiconsIcon icon={Tick02Icon} className="size-3 stroke-[3]" />
                </div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
