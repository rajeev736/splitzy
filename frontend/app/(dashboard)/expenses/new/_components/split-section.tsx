"use client"

import { Amount } from "@/components/shared/amount"
import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"
import { cn } from "@/lib/utils"
import { MemberRow } from "./member-row"
import type { ExpenseDraft } from "./use-expense-draft"

/**
 * Inline split editor with participant selection checkboxes.
 * By default everyone in the group is included.
 * Unchecking a person removes them from the split (0).
 * Typing a manual amount re-splits the rest equally among the remaining unlocked participants.
 */
export function SplitSection({ draft }: { draft: ExpenseDraft }) {
  const remaining = draft.remainingPaise
  const people = draft.selectedParticipants.length

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="text-sm font-bold">Split</CardTitle>
        <CardDescription className="text-xs">
          {draft.isCustomSplit ? "Custom amounts · rest split equally" : "Equally"} · {people}{" "}
          {people === 1 ? "person" : "people"}
        </CardDescription>
        {draft.isCustomSplit && (
          <CardAction>
            <Button variant="link" size="sm" className="px-0" onClick={draft.resetSplit}>
              Split equally
            </Button>
          </CardAction>
        )}
      </CardHeader>

      <CardContent className="flex flex-col gap-2">
        {draft.activeEligibleParticipants.map((m) => {
          const included = draft.isMemberIncluded(m.uid)
          const locked = draft.isShareLocked(m.uid)
          return (
            <div key={m.uid} className="flex items-center gap-2.5">
              <Checkbox
                id={`split-chk-${m.uid}`}
                checked={included}
                onCheckedChange={() => draft.toggleMemberIncluded(m.uid)}
                aria-label={`Include ${m.rawName} in split`}
                className="size-4.5 rounded-md"
              />
              <MemberRow
                name={m.displayName}
                photoURL={m.photoURL}
                subtitle={
                  !included
                    ? "Excluded from split"
                    : locked
                      ? "Edited manually"
                      : "Auto-split"
                }
                className={cn("px-0 flex-1 min-w-0 transition-opacity", !included && "opacity-50")}
              >
                <InputGroup className={cn("w-32", locked && "border-primary/50", !included && "opacity-60")}>
                  <InputGroupAddon className="font-semibold">₹</InputGroupAddon>
                  <InputGroupInput
                    type="number"
                    step="any"
                    min="0"
                    disabled={!included}
                    inputMode="decimal"
                    aria-label={`Share for ${m.rawName}`}
                    value={draft.shareInputValue(m.uid)}
                    onChange={(e) => draft.setShareAmount(m.uid, e.target.value)}
                    onBlur={() => draft.releaseShareIfEmpty(m.uid)}
                    onFocus={(e) => e.currentTarget.select()}
                    className={cn(
                      "text-right font-semibold",
                      !locked && "text-muted-foreground",
                      !included && "text-muted-foreground/40 cursor-not-allowed"
                    )}
                  />
                </InputGroup>
              </MemberRow>
            </div>
          )
        })}

        {remaining !== 0 ? (
          <p className="pt-2 text-center text-xs font-semibold text-destructive">
            {remaining > 0 ? (
              <>
                <Amount paise={remaining} /> left to assign
              </>
            ) : (
              <>
                <Amount paise={-remaining} /> over the total
              </>
            )}
          </p>
        ) : (
          <SplitOutcome draft={draft} />
        )}
      </CardContent>
    </Card>
  )
}

/** PhonePe-style bottom line: what this expense means for you. */
function SplitOutcome({ draft }: { draft: ExpenseDraft }) {
  const me = draft.activeEligibleParticipants.find((m) => m.isCurrentUser)
  if (!me) return null
  const myShare = draft.splitShares.find((s) => s.userId === me.uid)?.amountPaise ?? 0
  const total = draft.splitShares.reduce((sum, s) => sum + s.amountPaise, 0)
  if (total <= 0) return null

  const iPaid = draft.payerId === me.uid
  const payer = draft.findMember(draft.payerId)
  const getBack = total - myShare

  return (
    <div
      className={cn(
        "mt-1 flex items-center justify-between rounded-xl px-3 py-2.5 text-xs font-semibold",
        iPaid ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
      )}
    >
      <span>{iPaid ? "You'll get back" : `You'll owe ${payer?.rawName ?? "the payer"}`}</span>
      <Amount paise={iPaid ? getBack : myShare} className="text-sm font-black" />
    </div>
  )
}
