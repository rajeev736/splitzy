"use client"

import * as React from "react"
import { toast } from "sonner"

import { Coins } from "@/components/fun/coin"
import { GiftArt } from "@/components/fun/gift-art"
import { MomentArt } from "@/components/fun/moment-art"
import { BottomSheet } from "@/components/shared/bottom-sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import { useWallet } from "@/hooks/use-fun"
import { useSendMoment } from "@/hooks/use-fun-mutations"
import {
  GIFT_IDS,
  GIFT_NOTE_MAX,
  GIFTS,
  LOVE_NUDGES,
  NUDGE_LABEL,
  PLAN_KINDS,
  PLAN_LABEL,
  PLAN_TEXT_MAX,
  type GiftId,
  type LoveNudge,
  type PlanKind,
} from "@/lib/fun/catalog"
import type { Burst } from "@/lib/fun/burst"
import type { UserProfile } from "@/lib/types"
import { cn } from "@/lib/utils"

/** Hug, kiss, miss you — between two people in a love bond. */
export function LoveActions({ friend, onSent }: { friend: UserProfile; onSent: (b: Burst) => void }) {
  const send = useSendMoment()
  const [sending, setSending] = React.useState<LoveNudge | null>(null)
  const first = friend.displayName.split(" ")[0]

  const go = (type: LoveNudge) => {
    setSending(type)
    send.mutate(
      { friendUid: friend.uid, input: { type } },
      {
        onSuccess: () =>
          onSent({ kind: type, title: type === "miss" ? `${first} knows you miss them` : `${NUDGE_LABEL[type].name} sent to ${first}` }),
        onSettled: () => setSending(null),
      }
    )
  }

  return (
    <div className="grid grid-cols-3 gap-2">
      {LOVE_NUDGES.map((type) => (
        <button
          key={type}
          type="button"
          disabled={!!sending}
          onClick={() => go(type)}
          className="group flex flex-col items-center gap-1 rounded-xl border bg-card px-2 pt-2 pb-2.5 transition-[transform,background-color] active:scale-[0.97] disabled:opacity-60 hover:bg-rose-50/60 dark:hover:bg-rose-500/5"
        >
          <MomentArt kind={type} className="size-14 transition-transform group-hover:-translate-y-0.5" />
          <span className="flex items-center gap-1 text-xs font-semibold">
            {sending === type && <Spinner className="size-3" />}
            {NUDGE_LABEL[type].name}
          </span>
        </button>
      ))}
    </div>
  )
}

/** Pick a gift, add a note, pay in coins. */
export function GiftSheet({
  open,
  onOpenChange,
  friend,
  onSent,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  friend: UserProfile
  onSent: (b: Burst) => void
}) {
  const wallet = useWallet()
  const send = useSendMoment()
  const [gift, setGift] = React.useState<GiftId>("rose")
  const [note, setNote] = React.useState("")
  const first = friend.displayName.split(" ")[0]
  const balance = wallet?.balance ?? 0
  const price = GIFTS[gift].price
  const short = wallet !== undefined && balance < price

  const submit = () =>
    send.mutate(
      { friendUid: friend.uid, input: { type: "gift", item: gift, note: note.trim() || undefined, toName: friend.displayName } },
      {
        onSuccess: () => {
          onOpenChange(false)
          setNote("")
          onSent({ kind: "gift", gift, title: `${GIFTS[gift].name} sent to ${first}`, subtitle: `−${price} coins` })
        },
      }
    )

  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title={`Send ${first} a gift`}
      header={
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Paid with coins</span>
          <span>
            You have <Coins amount={balance} className="text-foreground" iconClassName="size-3.5" />
          </span>
        </div>
      }
      footer={
        <Button className="w-full" disabled={send.isPending || short || wallet === undefined} onClick={submit}>
          {send.isPending && <Spinner />}
          {short ? `${price - balance} more coins needed` : <>Send {GIFTS[gift].name.toLowerCase()} · <Coins amount={price} iconClassName="size-3.5" /></>}
        </Button>
      }
    >
      <div className="grid grid-cols-4 gap-2 pb-3" role="radiogroup" aria-label="Gift">
        {GIFT_IDS.map((id) => (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={gift === id}
            onClick={() => setGift(id)}
            className={cn(
              "flex min-w-0 flex-col items-center gap-1 rounded-xl border px-1 pt-2 pb-2 transition-colors",
              gift === id ? "border-primary bg-primary/5" : "hover:bg-muted/60"
            )}
          >
            <GiftArt gift={id} animate={gift === id} className="size-12" />
            <span className="w-full truncate text-center text-[11px] font-medium">{GIFTS[id].name}</span>
            <Coins amount={GIFTS[id].price} className="text-[11px] text-muted-foreground" iconClassName="size-3" />
          </button>
        ))}
      </div>
      <Input
        value={note}
        maxLength={GIFT_NOTE_MAX}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Add a note (optional)"
        className="mb-3 h-10"
      />
    </BottomSheet>
  )
}

/** Ask a friend for a plan: momos, a movie, a trip… */
export function PlanSheet({
  open,
  onOpenChange,
  friend,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  friend: UserProfile
}) {
  const send = useSendMoment()
  const [kind, setKind] = React.useState<PlanKind>("momos")
  const [text, setText] = React.useState(PLAN_LABEL.momos.suggestion)
  const first = friend.displayName.split(" ")[0]

  const pickKind = (k: PlanKind) => {
    setKind(k)
    setText(PLAN_LABEL[k].suggestion)
  }

  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title={`Make a plan with ${first}`}
      description={`${first} can say yes or not now.`}
      footer={
        <Button
          className="w-full"
          disabled={send.isPending || !text.trim()}
          onClick={() =>
            send.mutate(
              { friendUid: friend.uid, input: { type: "plan", kind, text } },
              {
                onSuccess: () => {
                  onOpenChange(false)
                  toast.success(`Sent to ${first}`)
                },
              }
            )
          }
        >
          {send.isPending && <Spinner />}
          Ask {first}
        </Button>
      }
    >
      <div className="flex flex-wrap gap-2 pb-3">
        {PLAN_KINDS.map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => pickKind(k)}
            className={cn(
              "h-8 rounded-full border px-3 text-xs font-medium transition-colors",
              kind === k ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted/60"
            )}
          >
            {PLAN_LABEL[k].name}
          </button>
        ))}
      </div>
      <Textarea
        value={text}
        maxLength={PLAN_TEXT_MAX}
        onChange={(e) => setText(e.target.value)}
        placeholder="What do you want to do?"
        className="mb-1 min-h-20 resize-none"
      />
      <div className="mb-3 text-right text-[11px] text-muted-foreground tabular-nums">
        {text.length}/{PLAN_TEXT_MAX}
      </div>
    </BottomSheet>
  )
}
