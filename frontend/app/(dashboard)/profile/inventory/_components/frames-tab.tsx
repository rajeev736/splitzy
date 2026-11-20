"use client"

import * as React from "react"
import { ArrowLeft01Icon, ArrowRight01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { toast } from "sonner"

import { FilterPills } from "@/app/(dashboard)/_components/filter-pills"
import { Coins } from "@/components/fun/coin"
import { FramedAvatar } from "@/components/fun/framed-avatar"
import { BottomSheet } from "@/components/shared/bottom-sheet"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { useBuyFrame, useEquipFrame } from "@/hooks/use-fun-mutations"
import { getErrorMessage } from "@/lib/errors"
import {
  FRAME_CATEGORIES,
  FRAME_IDS,
  FRAMES,
  isFrameId,
  isFreeFrame,
  isMilestoneFrame,
  MILESTONE_LABEL,
  ownsFrame,
  type FrameId,
} from "@/lib/fun/catalog"
import type { UserProfile, Wallet } from "@/lib/types"
import { cn } from "@/lib/utils"
import { claimMilestoneFrame, milestoneProgress } from "@/services/fun"

export type FrameFilter = "all" | "owned" | "store" | "earn"

export type InventoryUser = Pick<UserProfile, "uid" | "displayName" | "photoURL" | "frame" | "gameAvatar">

const fmt = new Intl.NumberFormat("en-IN")

/** Frames: every one in the app, on your own photo. Tap one to try it on, then wear, buy or claim it. */
export function FramesTab({
  user,
  wallet,
  filter,
  onFilter,
}: {
  user: InventoryUser
  wallet: Wallet | null | undefined
  filter: FrameFilter
  onFilter: (filter: FrameFilter) => void
}) {
  const owned = wallet?.frames
  const wearing = isFrameId(user.frame) ? user.frame : null
  const [picked, setPicked] = React.useState<FrameId | null>(null)
  const [open, setOpen] = React.useState(false)

  const counts = {
    owned: FRAME_IDS.filter((id) => ownsFrame(id, owned)).length,
    store: FRAME_IDS.filter((id) => !isMilestoneFrame(id) && !ownsFrame(id, owned)).length,
    earn: FRAME_IDS.filter(isMilestoneFrame).length,
  }
  const shown = FRAME_IDS.filter((id) =>
    filter === "owned"
      ? ownsFrame(id, owned)
      : filter === "store"
        ? !isMilestoneFrame(id) && !ownsFrame(id, owned)
        : filter === "earn"
          ? isMilestoneFrame(id)
          : true
  )
  // In the store, cheapest first
  if (filter === "store") shown.sort((a, b) => FRAMES[a].price - FRAMES[b].price)
  const sections = FRAME_CATEGORIES.map((c) => ({ ...c, ids: shown.filter((id) => FRAMES[id].category === c.id) })).filter(
    (s) => s.ids.length > 0
  )
  // The order the sheet's arrows step through: what's on screen
  const order = sections.flatMap((s) => s.ids)

  const openFrame = (id: FrameId) => {
    setPicked(id)
    setOpen(true)
  }

  return (
    <div className="flex flex-col gap-4">
      <FilterPills
        aria-label="Show frames"
        value={filter}
        onValueChange={onFilter}
        options={[
          { value: "all", label: "All" },
          { value: "owned", label: `Owned · ${counts.owned}` },
          { value: "store", label: `Store · ${counts.store}` },
          { value: "earn", label: `Earn · ${counts.earn}` },
        ]}
      />

      {sections.length === 0 && (
        <p className="rounded-xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
          You own every frame in the store.
        </p>
      )}

      {sections.map((s) => (
        <section key={s.id} className="flex flex-col gap-2.5">
          <div className="flex items-baseline justify-between gap-2 px-1">
            <h3 className="text-sm font-semibold">{s.label}</h3>
            {s.id === "milestone" && <span className="text-xs text-muted-foreground">Earned by playing, never sold</span>}
            {s.id === "live" && <span className="text-xs text-muted-foreground">Animated frames that move</span>}
          </div>
          <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4">
            {s.ids.map((id) => (
              <FrameCard
                key={id}
                id={id}
                user={user}
                wallet={wallet}
                wearing={wearing === id}
                selected={open && picked === id}
                onClick={() => openFrame(id)}
              />
            ))}
          </div>
        </section>
      ))}

      {picked && (
        <FrameSheet
          id={picked}
          order={order}
          onStep={setPicked}
          open={open}
          onOpenChange={setOpen}
          user={user}
          wallet={wallet}
        />
      )}
    </div>
  )
}

function FrameCard({
  id,
  user,
  wallet,
  wearing,
  selected,
  onClick,
}: {
  id: FrameId
  user: InventoryUser
  wallet: Wallet | null | undefined
  wearing: boolean
  selected: boolean
  onClick: () => void
}) {
  const info = FRAMES[id]
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${info.name} frame`}
      className={cn(
        // Off screen, a card (and its frame's animation) isn't rendered: keeps a long, animated grid smooth to scroll
        "relative flex min-w-0 flex-col items-center gap-1 rounded-xl border border-card-stroke bg-card px-1 pt-1 pb-2.5 shadow-xs transition-[background-color,transform] [contain-intrinsic-height:auto_8.5rem] [content-visibility:auto] hover:bg-subtle-hover active:scale-[0.97]",
        (wearing || selected) && "border-primary ring-2 ring-primary/20"
      )}
    >
      <div className="p-4">
        <FramedAvatar src={user.photoURL} name={user.displayName} frame={id} size={52} />
      </div>
      <span className="-mt-2 w-full truncate text-center text-xs font-medium">{info.name}</span>
      <span className="text-[11px] text-muted-foreground">
        <FrameStatus id={id} wallet={wallet} wearing={wearing} />
      </span>
    </button>
  )
}

/** Wearing · Owned · Free · a price · progress to a milestone. */
function FrameStatus({ id, wallet, wearing }: { id: FrameId; wallet: Wallet | null | undefined; wearing: boolean }) {
  if (wearing) return <span className="font-medium text-primary">Wearing</span>
  if (isFreeFrame(id)) return <>Free</>
  if (wallet?.frames.includes(id)) return <>Owned</>
  const goal = milestoneProgress(wallet, id)
  if (goal) {
    if (goal.done) return <span className="font-semibold text-primary">Claim</span>
    return (
      <span className="flex flex-col items-center gap-1">
        <span className="tabular-nums">
          {fmt.format(Math.min(goal.value, goal.goal))}/{fmt.format(goal.goal)}
        </span>
        <span className="block h-1 w-14 overflow-hidden rounded-full bg-muted">
          <span className="block h-full rounded-full bg-primary" style={{ width: `${Math.min(100, (goal.value / goal.goal) * 100)}%` }} />
        </span>
      </span>
    )
  }
  return <Coins amount={FRAMES[id].price} className="font-medium text-foreground" iconClassName="size-3" />
}

/** Try a frame on your own photo, step through the others, and wear, buy or claim it. */
function FrameSheet({
  id,
  order,
  onStep,
  open,
  onOpenChange,
  user,
  wallet,
}: {
  id: FrameId
  order: FrameId[]
  onStep: (id: FrameId) => void
  open: boolean
  onOpenChange: (open: boolean) => void
  user: InventoryUser
  wallet: Wallet | null | undefined
}) {
  const buy = useBuyFrame()
  const equip = useEquipFrame()
  const [confirmBuy, setConfirmBuy] = React.useState(false)
  const [claiming, setClaiming] = React.useState(false)

  const info = FRAMES[id]
  const owned = wallet?.frames ?? []
  const wearing = isFrameId(user.frame) ? user.frame : null
  const has = ownsFrame(id, owned)
  const balance = wallet?.balance ?? 0
  const progress = milestoneProgress(wallet, id)
  const at = order.indexOf(id)
  const busy = buy.isPending || equip.isPending || claiming
  const category = FRAME_CATEGORIES.find((c) => c.id === info.category)?.label

  const wear = (frame: FrameId | null) =>
    equip.mutate(
      { frame, owned },
      { onSuccess: () => toast.success(frame ? `${FRAMES[frame].name} on` : "Frame removed") }
    )

  const purchase = () =>
    buy.mutate(id, {
      onSuccess: () => {
        setConfirmBuy(false)
        equip.mutate({ frame: id, owned: [...owned, id] }, { onSuccess: () => toast.success(`${info.name} is yours`) })
      },
    })

  const claim = async () => {
    setClaiming(true)
    try {
      await claimMilestoneFrame(user.uid, id)
      toast.success(`${info.name} unlocked and on`)
    } catch (e) {
      toast.error(getErrorMessage(e))
    } finally {
      setClaiming(false)
    }
  }

  const status =
    id === wearing
      ? "You're wearing this"
      : has
        ? isFreeFrame(id)
          ? "Free for everyone"
          : "Owned"
        : progress
          ? MILESTONE_LABEL[progress.stat](progress.goal)
          : "Try it on, then buy it with coins"

  const action =
    id === wearing ? (
      <Button variant="outline" className="h-11 w-full" disabled={busy} onClick={() => wear(null)}>
        Take off
      </Button>
    ) : has ? (
      <Button className="h-11 w-full" disabled={busy} onClick={() => wear(id)}>
        {equip.isPending && <Spinner />}
        Wear {info.name}
      </Button>
    ) : progress ? (
      // Milestone frames are earned, never bought
      progress.done ? (
        <Button className="h-11 w-full" disabled={busy} onClick={claim}>
          {claiming && <Spinner />}
          Claim {info.name}
        </Button>
      ) : (
        <Button className="h-11 w-full" variant="outline" disabled>
          {MILESTONE_LABEL[progress.stat](progress.goal)} to unlock
        </Button>
      )
    ) : (
      <Button className="h-11 w-full" disabled={busy || !wallet || balance < info.price} onClick={() => setConfirmBuy(true)}>
        {wallet && balance < info.price ? (
          `${fmt.format(info.price - balance)} more coins needed`
        ) : (
          <>
            Buy · <Coins amount={info.price} iconClassName="size-4" />
          </>
        )}
      </Button>
    )

  return (
    <>
      <BottomSheet
        open={open}
        onOpenChange={onOpenChange}
        title={info.name}
        description={category ? `${category} · ${status}` : status}
        footer={<div className="flex w-full flex-col">{action}</div>}
      >
        <div className="flex flex-col items-center gap-3 pb-3">
          <div className="flex w-full items-center justify-between">
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full"
              aria-label="Previous frame"
              disabled={at <= 0}
              onClick={() => onStep(order[at - 1])}
            >
              <HugeiconsIcon icon={ArrowLeft01Icon} className="size-5" />
            </Button>
            {/* Room for the frame's ornaments (wings, ears, crowns) around the photo */}
            <div key={id} className="animate-in p-10 duration-200 fade-in zoom-in-95">
              <FramedAvatar src={user.photoURL} name={user.displayName} frame={id} size={112} />
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full"
              aria-label="Next frame"
              disabled={at < 0 || at >= order.length - 1}
              onClick={() => onStep(order[at + 1])}
            >
              <HugeiconsIcon icon={ArrowRight01Icon} className="size-5" />
            </Button>
          </div>

          {progress && !has && (
            <div className="flex w-full max-w-64 flex-col gap-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Your progress</span>
                <span className="font-medium tabular-nums">
                  {fmt.format(Math.min(progress.value, progress.goal))} / {fmt.format(progress.goal)}
                </span>
              </div>
              <span className="block h-1.5 overflow-hidden rounded-full bg-muted">
                <span
                  className="block h-full rounded-full bg-primary transition-[width]"
                  style={{ width: `${Math.min(100, (progress.value / progress.goal) * 100)}%` }}
                />
              </span>
            </div>
          )}

          {wearing && wearing !== id && (
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              <FramedAvatar src={user.photoURL} name={user.displayName} frame={wearing} size={18} className="m-1.5" />
              Now wearing {FRAMES[wearing].name}
            </p>
          )}
        </div>
      </BottomSheet>

      <ConfirmDialog
        open={confirmBuy}
        onOpenChange={setConfirmBuy}
        title={`Buy ${info.name}?`}
        confirmLabel="Buy"
        isPending={buy.isPending}
        onConfirm={purchase}
        description={
          <>
            {fmt.format(info.price)} coins from your {fmt.format(balance)}. It&apos;s yours to wear any time, and goes on now.
          </>
        }
      />
    </>
  )
}
