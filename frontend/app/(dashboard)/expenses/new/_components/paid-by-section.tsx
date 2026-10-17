"use client"

import { AtSignIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { UserAvatar } from "@/components/shared/user-avatar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import type { ExpenseDraft } from "./use-expense-draft"

/**
 * Who paid (inline chips) + the UPI ID repayments go to. The payer is also the
 * person who gets repaid, like every mainstream split app.
 */
export function PaidBySection({ draft }: { draft: ExpenseDraft }) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="text-sm font-bold">Paid by</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <ToggleGroup
          variant="outline"
          className="w-full flex-wrap justify-start"
          value={[draft.payerId]}
          onValueChange={(v) => v[0] && draft.changePayer(v[0] as string)}
        >
          {draft.activeEligibleParticipants.map((m) => (
            <ToggleGroupItem
              key={m.uid}
              value={m.uid}
              aria-label={`Paid by ${m.rawName}`}
              className="h-10 max-w-48 gap-2 rounded-full pr-4 pl-1.5 data-pressed:border-primary data-pressed:bg-primary/10 data-pressed:text-primary"
            >
              <UserAvatar src={m.photoURL} name={m.rawName} size="xs" className="size-7" />
              <span className="truncate font-semibold">{m.isCurrentUser ? "You" : m.rawName}</span>
            </ToggleGroupItem>
          ))}
        </ToggleGroup>

        <InputGroup>
          <InputGroupAddon>
            <HugeiconsIcon icon={AtSignIcon} />
          </InputGroupAddon>
          <InputGroupInput
            aria-label="UPI ID for repayments"
            value={draft.recipientUpiId}
            onChange={(e) => draft.setRecipientUpiId(e.target.value)}
            placeholder="UPI ID for repayments (name@upi)"
          />
        </InputGroup>
      </CardContent>
    </Card>
  )
}
