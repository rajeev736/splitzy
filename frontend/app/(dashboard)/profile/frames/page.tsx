"use client"

import * as React from "react"
import { toast } from "sonner"

import { Coins } from "@/components/fun/coin"
import { FramedAvatar } from "@/components/fun/framed-avatar"
import { AppHeader } from "@/components/layout/app-header"
import { PageContainer } from "@/components/layout/app-shell"
import { useSession } from "@/components/providers/session-provider"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { useWallet } from "@/hooks/use-fun"
import { useBuyFrame, useEquipFrame } from "@/hooks/use-fun-mutations"
import {
  FRAME_CATEGORIES,
  FRAME_IDS,
  FRAMES,
  isFrameId,
  isFreeFrame,
  MILESTONE_LABEL,
  type FrameCategory,
  type FrameId,
} from "@/lib/fun/catalog"
import { cn } from "@/lib/utils"
import { getErrorMessage } from "@/lib/errors"
import { claimMilestoneFrame, milestoneProgress } from "@/services/fun"

const noopSubscribe = () => () => {}

export default function FramesPage() {
  const { user } = useSession()
  const wallet = useWallet()
  const buy = useBuyFrame()
  const equip = useEquipFrame()
  const [pickedCategory, setCategory] = React.useState<FrameCategory | null>(null)
  // From a "frame unlocked" notification (#milestones): open the Milestones tab
  const fromMilestone = React.useSyncExternalStore(
    noopSubscribe,
    () => window.location.hash === "#milestones",
    () => false
  )
  const category: FrameCategory = pickedCategory ?? (fromMilestone ? "milestone" : "classic")
  const [picked, setPicked] = React.useState<FrameId | null>(null)
  const [confirmBuy, setConfirmBuy] = React.useState(false)
  const [claiming, setClaiming] = React.useState(false)

  if (!user) return null
  const wearing = isFrameId(user.frame) ? user.frame : null
  const preview = picked ?? wearing
  const owned = wallet?.frames ?? []
  const has = (id: FrameId) => isFreeFrame(id) || owned.includes(id)
  const balance = wallet?.balance ?? 0
  const list = FRAME_IDS.filter((id) => FRAMES[id].category === category)

  const wear = (id: FrameId | null) =>
    equip.mutate(
      { frame: id, owned },
      { onSuccess: () => toast.success(id ? `${FRAMES[id].name} on` : "Frame removed") }
    )

  const purchase = (id: FrameId) =>
    buy.mutate(id, {
      onSuccess: () => {
        setConfirmBuy(false)
        equip.mutate({ frame: id, owned: [...owned, id] }, { onSuccess: () => toast.success(`${FRAMES[id].name} is yours`) })
      },
    })

  const claim = async (id: FrameId) => {
    setClaiming(true)
    try {
      await claimMilestoneFrame(user.uid, id)
      toast.success(`${FRAMES[id].name} unlocked and on`)
    } catch (e) {
      toast.error(getErrorMessage(e))
    } finally {
      setClaiming(false)
    }
  }

  const busy = buy.isPending || equip.isPending || claiming
  const progress = preview ? milestoneProgress(wallet, preview) : null
  const action = (() => {
    if (!preview) return null
    if (preview === wearing) {
      return (
        <Button variant="outline" className="h-11 w-full" disabled={busy} onClick={() => wear(null)}>
          Take off
        </Button>
      )
    }
    if (has(preview)) {
      return (
        <Button className="h-11 w-full" disabled={busy} onClick={() => wear(preview)}>
          {equip.isPending && <Spinner />}
          Wear {FRAMES[preview].name}
        </Button>
      )
    }
    if (progress) {
      // Milestone frames are earned, never bought
      return progress.done ? (
        <Button className="h-11 w-full" disabled={busy} onClick={() => claim(preview)}>
          {claiming && <Spinner />}
          Claim {FRAMES[preview].name}
        </Button>
      ) : (
        <Button className="h-11 w-full" variant="outline" disabled>
          {MILESTONE_LABEL[progress.stat](progress.goal)} to unlock
        </Button>
      )
    }
    const price = FRAMES[preview].price
    return (
      <Button className="h-11 w-full" disabled={busy || !wallet || balance < price} onClick={() => setConfirmBuy(true)}>
        {balance < price && wallet ? (
          `${price - balance} more coins needed`
        ) : (
          <>
            Buy for <Coins amount={price} iconClassName="size-4" />
          </>
        )}
      </Button>
    )
  })()

  return (
    <>
      <AppHeader
        title="Profile frames"
        showBack
        rightAction={wallet ? <Coins amount={balance} className="pr-1 text-sm" /> : undefined}
      />
      <PageContainer className="max-w-xl gap-5 pb-28">
        {/* Preview */}
        <section className="flex flex-col items-center gap-2 pt-2">
          <div className="p-8">
            <FramedAvatar src={user.photoURL} name={user.displayName} frame={preview ?? undefined} size={104} />
          </div>
          <div className="-mt-4 text-center">
            <div className="text-base font-semibold">{preview ? FRAMES[preview].name : "No frame"}</div>
            <div className="text-xs text-muted-foreground">
              {!preview
                ? "Pick one below"
                : preview === wearing
                  ? "You're wearing this"
                  : has(preview)
                    ? isFreeFrame(preview)
                      ? "Free"
                      : "Owned"
                    : progress
                      ? `${MILESTONE_LABEL[progress.stat](progress.goal)} · ${Math.min(progress.value, progress.goal).toLocaleString("en-IN")} / ${progress.goal.toLocaleString("en-IN")}`
                      : "Win games to earn coins"}
            </div>
          </div>
        </section>

        {/* Categories */}
        <div role="tablist" className="grid grid-cols-5 rounded-lg bg-muted p-1">
          {FRAME_CATEGORIES.map((c) => (
            <button
              key={c.id}
              type="button"
              role="tab"
              aria-selected={category === c.id}
              onClick={() => setCategory(c.id)}
              className={cn(
                "h-8 truncate rounded-md px-1 text-[11px] font-medium transition-colors sm:text-xs",
                category === c.id ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
              )}
            >
              {c.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-2.5">
          {list.map((id) => {
            const info = FRAMES[id]
            const selected = preview === id
            const goal = milestoneProgress(wallet, id)
            return (
              <button
                key={id}
                type="button"
                onClick={() => setPicked(id)}
                className={cn(
                  "relative flex min-w-0 flex-col items-center gap-1 rounded-xl border bg-card px-1 pt-1 pb-2.5 transition-colors",
                  selected ? "border-primary ring-2 ring-primary/20" : "hover:bg-muted/50"
                )}
              >
                <div className="p-4">
                  <FramedAvatar src={user.photoURL} name={user.displayName} frame={id} size={52} />
                </div>
                <span className="-mt-2 w-full truncate text-center text-xs font-medium">{info.name}</span>
                <span className="text-[11px] text-muted-foreground">
                  {wearing === id ? (
                    <span className="font-medium text-primary">Wearing</span>
                  ) : isFreeFrame(id) ? (
                    "Free"
                  ) : owned.includes(id) ? (
                    "Owned"
                  ) : goal ? (
                    goal.done ? (
                      <span className="font-semibold text-primary">Claim</span>
                    ) : (
                      <span className="flex flex-col items-center gap-1">
                        <span className="tabular-nums">
                          {Math.min(goal.value, goal.goal).toLocaleString("en-IN")}/{goal.goal.toLocaleString("en-IN")}
                        </span>
                        <span className="block h-1 w-14 overflow-hidden rounded-full bg-muted">
                          <span
                            className="block h-full rounded-full bg-primary"
                            style={{ width: `${Math.min(100, (goal.value / goal.goal) * 100)}%` }}
                          />
                        </span>
                      </span>
                    )
                  ) : (
                    <Coins amount={info.price} className="font-medium" iconClassName="size-3" />
                  )}
                </span>
              </button>
            )
          })}
        </div>
      </PageContainer>

      {/* Action, pinned to the bottom (inner pages have no bottom nav) */}
      {action && (
        <div className="pb-safe fixed inset-x-0 bottom-0 z-20 border-t bg-background/90 px-4 pt-3 pb-3 backdrop-blur">
          <div className="mx-auto max-w-xl">{action}</div>
        </div>
      )}

      <ConfirmDialog
        open={confirmBuy}
        onOpenChange={setConfirmBuy}
        title={preview ? `Buy ${FRAMES[preview].name}?` : "Buy frame?"}
        confirmLabel="Buy"
        isPending={buy.isPending}
        onConfirm={() => preview && purchase(preview)}
        description={
          preview ? (
            <>
              {FRAMES[preview].price} coins from your {balance}. It&apos;s yours to wear any time.
            </>
          ) : undefined
        }
      />
    </>
  )
}
