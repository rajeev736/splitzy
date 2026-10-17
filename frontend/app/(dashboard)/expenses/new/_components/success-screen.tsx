"use client"

import { Share08Icon, Tick02Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useRouter } from "nextjs-toploader/app"
import { toast } from "sonner"

import { Amount } from "@/components/shared/amount"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { rupeesToPaise } from "@/lib/money"
import type { ExpenseDraft } from "./use-expense-draft"

/** Shown after saving: confirmation with view / add-another / share actions. */
export function SuccessScreen({ draft }: { draft: ExpenseDraft }) {
  const router = useRouter()
  const { expenseMode, title, amountRupees, date, createdExpenseId } = draft

  const subtitle =
    expenseMode === "personal"
      ? `Personal • ${draft.personalCategory}`
      : expenseMode === "group"
        ? draft.currentGroup.name
        : "Direct Friends Split"

  const share = () => {
    if (navigator.share) {
      navigator
        .share({
          title: `JoySplit: ${title}`,
          text: `Added "${title}" (₹${amountRupees}) on JoySplit. Check your share!`,
        })
        .catch(() => {})
    } else {
      toast.success("Expense link copied!")
    }
  }

  return (
    <div className="flex animate-in flex-col gap-6 text-center duration-300 zoom-in-95">
      <div className="mx-auto flex size-20 items-center justify-center rounded-full bg-success/10 text-success shadow-md">
        <HugeiconsIcon icon={Tick02Icon} strokeWidth={3} className="size-10" />
      </div>

      <div>
        <h2 className="text-2xl font-extrabold tracking-tight">Expense Added!</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          {expenseMode === "personal"
            ? "Saved to your private personal expenses."
            : `Bill split among ${draft.selectedParticipants.length} participants.`}
        </p>
      </div>

      <Card size="sm">
        <CardContent className="flex items-center justify-between gap-3 text-left">
          <div className="min-w-0">
            <div className="text-xs font-bold">{title}</div>
            <div className="text-[11px] text-muted-foreground">
              {subtitle} • {date}
            </div>
          </div>
          <Amount paise={rupeesToPaise(amountRupees)} className="text-base font-extrabold" />
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3 pt-2">
        <div className="grid grid-cols-2 gap-3">
          <Button
            variant="outline"
            size="lg"
            className="h-11"
            onClick={() => router.push(createdExpenseId ? `/expenses/${createdExpenseId}` : "/home")}
          >
            View Expense
          </Button>
          <Button size="lg" className="h-11" onClick={draft.resetForAnother}>
            Add Another
          </Button>
        </div>

        {expenseMode !== "personal" && (
          <Button variant="secondary" size="lg" className="h-11 w-full" onClick={share}>
            <HugeiconsIcon icon={Share08Icon} data-icon="inline-start" />
            Share Details
          </Button>
        )}
      </div>
    </div>
  )
}
