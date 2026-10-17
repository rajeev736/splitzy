"use client"

import { Amount } from "@/components/shared/amount"
import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"
import { cn } from "@/lib/utils"
import { MemberRow } from "./member-row"
import type { ExpenseDraft } from "./use-expense-draft"

/**
 * Inline split editor. Everyone starts with an equal share; editing a person's
 * amount re-splits the rest equally among the people you haven't edited.
 * Set someone to 0 to leave them out.
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

      <CardContent className="flex flex-col gap-1">
        {draft.activeEligibleParticipants.map((m) => {
          const locked = draft.isShareLocked(m.uid)
          return (
            <MemberRow
              key={m.uid}
              name={m.displayName}
              photoURL={m.photoURL}
              subtitle={locked ? "Edited" : "Auto"}
              className="px-0"
            >
              <InputGroup className={cn("w-32", locked && "border-primary/50")}>
                <InputGroupAddon className="font-semibold">₹</InputGroupAddon>
                <InputGroupInput
                  type="number"
                  step="any"
                  min="0"
                  inputMode="decimal"
                  aria-label={`Share for ${m.rawName}`}
                  value={draft.shareInputValue(m.uid)}
                  onChange={(e) => draft.setShareAmount(m.uid, e.target.value)}
                  onBlur={() => draft.releaseShareIfEmpty(m.uid)}
                  onFocus={(e) => e.currentTarget.select()}
                  className={cn("text-right font-semibold", !locked && "text-muted-foreground")}
                />
              </InputGroup>
            </MemberRow>
          )
        })}

        {remaining !== 0 && (
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
        )}
      </CardContent>
    </Card>
  )
}
