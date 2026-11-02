"use client"

import * as React from "react"

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { BADGES, isSingleBadge, type BadgeId } from "@/lib/fun/catalog"
import type { BadgeSummary } from "@/hooks/use-fun"
import { cn } from "@/lib/utils"
import { BadgeArt } from "./badge-art"

const TIER = ["Locked", "Bronze", "Silver", "Gold"] as const

/**
 * Badges in a row of four: earned ones in their tier's metal, the rest dimmed
 * (or left out with `earnedOnly`). Tap one to see how it's earned.
 */
export function BadgeGrid({
  badges,
  earlyBird,
  earnedOnly = false,
  className,
}: {
  badges: BadgeSummary[] | undefined
  /** Their Early Bird member number. */
  earlyBird?: number
  earnedOnly?: boolean
  className?: string
}) {
  const [open, setOpen] = React.useState<BadgeSummary | null>(null)
  const shown = earnedOnly ? badges?.filter((b) => b.tier > 0) : badges

  return (
    <>
      <div className={cn("flex flex-wrap justify-center gap-x-1 gap-y-3", className)}>
        {(shown ?? []).map((b) => {
          const info = BADGES[b.id]
          const earned = b.tier > 0
          return (
            <button
              key={b.id}
              type="button"
              onClick={() => setOpen(b)}
              className="flex w-[4.75rem] min-w-0 flex-col items-center gap-1.5 rounded-xl py-1 text-center transition-colors hover:bg-muted/50"
            >
              <BadgeArt badge={b.id} tier={b.tier} className={cn("size-12 sm:size-14", !earned && "opacity-60")} />
              <div className="w-full min-w-0">
                <div className={cn("truncate text-[11px] font-semibold", !earned && "text-muted-foreground")}>{info.name}</div>
                <div className="truncate text-[10px] text-muted-foreground">
                  {!earned
                    ? "Locked"
                    : b.id === "lovebird"
                      ? "In love"
                      : b.id === "earlybird"
                        ? earlyBird
                          ? `Member #${earlyBird}`
                          : "Member"
                        : `${TIER[b.tier]} · ${b.count}`}
                </div>
              </div>
            </button>
          )
        })}
        {!badges &&
          Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="flex w-[4.75rem] flex-col items-center gap-1.5">
              <div className="size-12 animate-pulse rounded-full bg-muted sm:size-14" />
              <div className="h-2.5 w-12 animate-pulse rounded bg-muted" />
            </div>
          ))}
      </div>

      <Dialog open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent className="max-w-sm">
          {open && <BadgeDetail badge={open} earlyBird={earlyBird} />}
        </DialogContent>
      </Dialog>
    </>
  )
}

function BadgeDetail({ badge, earlyBird }: { badge: BadgeSummary; earlyBird?: number }) {
  const info = BADGES[badge.id as BadgeId]
  const single = isSingleBadge(badge.id)
  return (
    <>
      <div className="mx-auto">
        <BadgeArt badge={badge.id} tier={badge.tier || 3} className={cn("size-24", badge.tier === 0 && "opacity-60 grayscale")} />
      </div>
      <DialogHeader className="items-center text-center">
        <DialogTitle>{info.name}</DialogTitle>
        <DialogDescription>{info.detail}</DialogDescription>
      </DialogHeader>
      {!single && (
        <div className="grid grid-cols-3 gap-2">
          {info.tiers.map((need, i) => {
            const tier = (i + 1) as 1 | 2 | 3
            const reached = badge.tier >= tier
            return (
              <div
                key={tier}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-lg border px-2 py-2.5",
                  reached ? "border-primary/40 bg-primary/5" : "bg-muted/40"
                )}
              >
                <BadgeArt badge={badge.id} tier={tier} className={cn("size-9", !reached && "opacity-50")} />
                <span className="text-xs font-semibold">{TIER[tier]}</span>
                <span className="text-[11px] text-muted-foreground tabular-nums">
                  {need} {need === 1 ? "time" : "times"}
                </span>
              </div>
            )
          })}
        </div>
      )}
      <p className="text-center text-xs text-muted-foreground">
        {single
          ? badge.tier > 0
            ? badge.id === "earlybird" && earlyBird
              ? `Early Bird #${earlyBird} of 1,000`
              : "Earned"
            : "Not earned yet"
          : `${badge.count} so far`}
      </p>
    </>
  )
}
