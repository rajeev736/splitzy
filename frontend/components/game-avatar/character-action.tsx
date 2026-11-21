"use client"

import * as React from "react"
import { LockIcon, Tick02Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { Coins } from "@/components/fun/coin"
import { announceUnlock, gameToast } from "@/components/rewards/reward-notice"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { useBuyCharacter, useClaimReward, useSetGameAvatar } from "@/hooks/use-fun-mutations"
import { achievementProgress } from "@/lib/live/achievements"
import type { Wallet } from "@/lib/types"
import { cn } from "@/lib/utils"
import { earnedBy, isForSale, ownsCharacter } from "./ownership"
import type { CharacterDef } from "./types"

const fmt = new Intl.NumberFormat("en-IN")

/**
 * The one button for a game character, wherever it shows (the profile's
 * picker, the inventory): playing as it, use it, claim it (an achievement
 * reached), buy it after a confirm, or what unlocks it. Ownership comes from
 * the live wallet, so nothing is ever sold twice; buying or claiming also
 * puts it on.
 */
export function CharacterAction({
  def,
  wallet,
  wearing,
  onWorn,
  className,
}: {
  def: CharacterDef
  wallet: Wallet | null | undefined
  /** You play as it now. */
  wearing: boolean
  /** After it's put on (picked, bought or claimed). */
  onWorn?: () => void
  className?: string
}) {
  const buy = useBuyCharacter()
  const wear = useSetGameAvatar()
  const claim = useClaimReward()
  const [confirming, setConfirming] = React.useState(false)
  const owned = wallet?.avatars
  const have = ownsCharacter(def, owned)
  const balance = wallet?.balance ?? 0
  const achievement = earnedBy(def)
  const progress = achievement ? achievementProgress(wallet, achievement) : null
  const claimable = !have && !!achievement && !!progress?.done
  const sale = isForSale(def)
  const short = !have && sale && !!wallet && balance < def.price
  const busy = buy.isPending || wear.isPending || claim.isPending
  // Put on while it was free (it stays on): you can still buy or claim it, to keep it once you switch
  const playing = wearing && (have || (!sale && !claimable))

  const use = () =>
    wear.mutate(
      { id: def.id, owned },
      {
        onSuccess: () => {
          gameToast({ title: `You're ${def.name} in games now`, art: { character: def } })
          onWorn?.()
        },
      }
    )
  const takeReward = () =>
    claim.mutate(
      { achievement: achievement!.id, kind: "character", id: def.id, equip: true, owned },
      {
        onSuccess: () => {
          announceUnlock({ title: def.name, art: { character: def }, equipped: true })
          onWorn?.()
        },
      }
    )

  // Earn-only and not reached yet: what unlocks it, with how far you are
  if (!have && !claimable && !sale && achievement && progress) {
    return (
      <div className={cn("flex w-full flex-col gap-1.5", className)}>
        <Button variant="secondary" disabled className="w-full">
          <HugeiconsIcon icon={LockIcon} data-icon="inline-start" />
          {achievement.how} to unlock
        </Button>
        <Progress value={progress.value} goal={progress.goal} />
      </div>
    )
  }

  return (
    <div className={cn("flex w-full flex-col gap-1.5", className)}>
      <Button
        variant={playing ? "secondary" : have ? "outline" : "default"}
        disabled={playing || busy || (!claimable && (short || (!have && !wallet)))}
        onClick={() => (claimable ? takeReward() : have ? use() : setConfirming(true))}
        className="w-full"
      >
        {busy ? (
          <Spinner />
        ) : playing ? (
          <>
            <HugeiconsIcon icon={Tick02Icon} data-icon="inline-start" />
            Playing as {def.name}
          </>
        ) : have ? (
          `Play as ${def.name}`
        ) : claimable ? (
          "Claim — it's free"
        ) : short ? (
          `${fmt.format(def.price - balance)} more coins needed`
        ) : (
          <>
            Buy · <Coins amount={def.price} iconClassName="size-3.5" />
          </>
        )}
      </Button>
      {wearing && !playing && sale && (
        <p className="text-center text-xs text-muted-foreground">
          You picked {def.name} while it was free — it stays while you play as it. Buy it to keep it if you switch.
        </p>
      )}
      {/* A legend that's sold and earned: the other way in */}
      {!have && !claimable && achievement && progress && (
        <p className="text-center text-xs text-muted-foreground">
          or {achievement.how.toLowerCase()} to get it free · {progress.value}/{progress.goal}
        </p>
      )}
      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title={`Buy ${def.name}?`}
        confirmLabel="Buy"
        isPending={buy.isPending || wear.isPending}
        onConfirm={() =>
          buy.mutate(def.id, {
            onSuccess: () => {
              setConfirming(false)
              announceUnlock({ title: def.name, art: { character: def }, equipped: true })
              wear.mutate({ id: def.id, owned: [...(owned ?? []), def.id] }, { onSuccess: () => onWorn?.() })
            },
          })
        }
        description={
          <>
            {fmt.format(def.price)} coins from your {fmt.format(balance)}. You&apos;ll play as {def.name} in every live game
            from now — your photo stays for splits.
          </>
        }
      />
    </div>
  )
}

/** A thin bar: how far you are towards an achievement. */
export function Progress({ value, goal, className }: { value: number; goal: number; className?: string }) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div
        className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={goal}
        aria-valuenow={value}
      >
        <div className="h-full rounded-full bg-amber-500 transition-[width]" style={{ width: `${(value / goal) * 100}%` }} />
      </div>
      <span className="text-[11px] text-muted-foreground tabular-nums">
        {value}/{goal}
      </span>
    </div>
  )
}
