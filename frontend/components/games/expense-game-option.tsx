"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { GAMES } from "@/lib/games"
import { DiscountPicker } from "./discount-picker"

/**
 * Optional game on a group expense you paid: everyone who owes you a share
 * guesses a lucky number; the closest gets `discount`% off their share if they
 * pay right after the game.
 */
export function ExpenseGameOption({
  enabled,
  onEnabledChange,
  discount,
  onDiscountChange,
  playerCount,
}: {
  enabled: boolean
  onEnabledChange: (enabled: boolean) => void
  discount: number
  onDiscountChange: (pct: number) => void
  playerCount: number
}) {
  const game = GAMES.lucky_number
  return (
    <Card size="sm">
      <CardContent className="flex flex-col gap-3">
        <label className="flex cursor-pointer items-center gap-3">
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold">Add a game <span className="font-normal text-muted-foreground">(optional)</span></span>
            <span className="mt-0.5 block text-xs text-muted-foreground">
              {game.emoji} {game.name}: {game.tagline.toLowerCase()}
            </span>
          </span>
          <Switch checked={enabled} onCheckedChange={onEnabledChange} disabled={playerCount === 0} />
        </label>
        {enabled && (
          <div className="flex flex-col gap-2 border-t pt-3">
            <span className="text-xs font-semibold text-muted-foreground">Winner&apos;s discount on their share</span>
            <DiscountPicker value={discount} onChange={onDiscountChange} />
            <p className="text-[11px] text-muted-foreground">
              {playerCount} {playerCount === 1 ? "person" : "people"} will play. The winner only gets the discount if they
              pay you within 10 minutes of the result.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
