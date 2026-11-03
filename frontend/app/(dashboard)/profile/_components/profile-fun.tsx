"use client"

import * as React from "react"
import { SmileIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { MoodFace } from "@/components/fun/mood-face"
import { PartyPopperIcon } from "@/components/fun/party-popper"
import { UserAvatar } from "@/components/shared/user-avatar"
import type { BirthdayCheer } from "@/hooks/use-fun"
import { useSession } from "@/components/providers/session-provider"
import { BottomSheet } from "@/components/shared/bottom-sheet"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { Switch } from "@/components/ui/switch"
import { useSaveBirthday, useSetMood } from "@/hooks/use-fun-mutations"
import { isMoodId, MOOD_IDS, MOODS, type MoodId } from "@/lib/fun/catalog"
import { cn } from "@/lib/utils"
import { fetchPrivateProfile } from "@/services/fun"

/** One button for your mood: tap it, pick how you feel (or clear it). Friends see it on your profile. */
export function MoodPicker({ mood }: { mood?: string }) {
  const setMood = useSetMood()
  const [open, setOpen] = React.useState(false)
  const [optimistic, setOptimistic] = React.useState<{ from?: string; to: MoodId | null } | null>(null)
  // Show the picked mood straight away, until the profile catches up
  const shown = optimistic && optimistic.from === mood ? optimistic.to : mood
  const current = isMoodId(shown) ? shown : null

  const choose = (next: MoodId | null) => {
    setOpen(false)
    if (next === current) return
    setOptimistic({ from: mood, to: next })
    setMood.mutate(next, { onError: () => setOptimistic(null) })
  }

  return (
    <>
      <button
        type="button"
        data-tour="mood"
        onClick={() => setOpen(true)}
        className="flex items-center gap-3 rounded-xl border bg-card px-4 py-3 text-left transition-colors hover:bg-muted/60"
      >
        {current ? (
          <MoodFace mood={current} className="size-9 shrink-0" />
        ) : (
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full border border-dashed text-muted-foreground">
            <HugeiconsIcon icon={SmileIcon} className="size-4.5" />
          </span>
        )}
        <span className="min-w-0 flex-1">
          <span className="block text-xs text-muted-foreground">Your mood</span>
          <span className="block truncate text-sm font-semibold">{current ? MOODS[current].name : "How are you feeling?"}</span>
        </span>
        <span className="shrink-0 text-xs font-medium text-primary">{current ? "Change" : "Set"}</span>
      </button>

      <BottomSheet
        open={open}
        onOpenChange={setOpen}
        title="How are you feeling?"
        description="Friends see it on your profile."
        footer={
          current ? (
            <Button variant="outline" className="w-full" onClick={() => choose(null)}>
              Clear mood
            </Button>
          ) : undefined
        }
      >
        <div className="grid grid-cols-4 gap-2 pb-3" role="radiogroup" aria-label="Mood">
          {MOOD_IDS.map((id) => {
            const on = current === id
            return (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => choose(id)}
                className={cn(
                  "flex min-w-0 flex-col items-center gap-1.5 rounded-xl border px-1 pt-2.5 pb-2 transition-[background-color,border-color,transform] active:scale-95",
                  on ? "border-primary bg-primary/5" : "hover:bg-muted/60"
                )}
              >
                <MoodFace mood={id} className="size-10" />
                <span className={cn("w-full truncate text-center text-[11px] font-medium", on ? "text-primary" : "text-muted-foreground")}>
                  {MOODS[id].name}
                </span>
              </button>
            )
          })}
        </div>
      </BottomSheet>
    </>
  )
}

/** Date of birth (kept private) and whether friends see the day. */
export function BirthdayDialog({
  open,
  onOpenChange,
  cheers,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Friends excited for your coming birthday. */
  cheers?: BirthdayCheer[]
}) {
  const { user } = useSession()
  const save = useSaveBirthday()
  const [loaded, setLoaded] = React.useState<{ dob: string; show: boolean } | null>(null)
  const [dob, setDob] = React.useState("")
  const [show, setShow] = React.useState(true)

  React.useEffect(() => {
    if (!open || !user || loaded) return
    let live = true
    fetchPrivateProfile(user.uid)
      .then((p) => {
        if (!live) return
        const value = { dob: p.dob ?? "", show: p.showBirthday ?? true }
        setLoaded(value)
        setDob(value.dob)
        setShow(value.show)
      })
      .catch(() => live && setLoaded({ dob: "", show: true }))
    return () => {
      live = false
    }
  }, [open, user, loaded])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Your birthday</DialogTitle>
          <DialogDescription>
            Friends see the day and a countdown, and get a reminder on the day. Your age stays private.
          </DialogDescription>
        </DialogHeader>
        {!loaded ? (
          <div className="flex justify-center py-6">
            <Spinner />
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <Field>
              <FieldLabel htmlFor="dob">Date of birth</FieldLabel>
              <Input id="dob" type="date" max={new Date().toISOString().slice(0, 10)} value={dob} onChange={(e) => setDob(e.target.value)} className="h-10" />
            </Field>
            {cheers && cheers.length > 0 && (
              <div className="flex flex-col gap-2 rounded-lg bg-amber-50/70 p-3 dark:bg-amber-500/10">
                <div className="flex items-center gap-1.5 text-sm font-semibold">
                  <PartyPopperIcon active className="size-4.5" />
                  {cheers.length} {cheers.length === 1 ? "friend is" : "friends are"} excited for your birthday
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {cheers.slice(0, 12).map((c) => (
                    <span key={c.from} className="inline-flex items-center gap-1.5 rounded-full bg-background py-0.5 pr-2.5 pl-0.5 text-xs">
                      <UserAvatar uid={c.from} name={c.fromName ?? "Friend"} size="xs" />
                      {(c.fromName ?? "Friend").split(" ")[0]}
                    </span>
                  ))}
                  {cheers.length > 12 && <span className="self-center text-xs text-muted-foreground">+{cheers.length - 12} more</span>}
                </div>
              </div>
            )}
            <Field orientation="horizontal" className="items-center justify-between">
              <div>
                <FieldLabel htmlFor="show-birthday">Show to friends</FieldLabel>
                <FieldDescription className="text-xs">Turn off to keep it to yourself.</FieldDescription>
              </div>
              <Switch id="show-birthday" checked={show} onCheckedChange={setShow} />
            </Field>
          </div>
        )}
        <DialogFooter className="grid grid-cols-2">
          <Button
            variant="outline"
            disabled={save.isPending || !loaded?.dob}
            onClick={() =>
              save.mutate(
                { dob: null, show: false },
                {
                  onSuccess: () => {
                    setLoaded(null)
                    onOpenChange(false)
                  },
                }
              )
            }
          >
            Remove
          </Button>
          <Button
            disabled={save.isPending || !loaded || !dob}
            onClick={() =>
              save.mutate(
                { dob, show },
                {
                  onSuccess: () => {
                    setLoaded({ dob, show })
                    onOpenChange(false)
                  },
                }
              )
            }
          >
            {save.isPending && <Spinner />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
