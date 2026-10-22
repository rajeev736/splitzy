"use client"

import * as React from "react"
import {
  ArrowLeft01Icon,
  HelpCircleIcon,
  Invoice01Icon,
  MoreVerticalIcon,
  Tick02Icon,
  UserGroupIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { toast } from "sonner"

import { UpiAppSheet } from "@/app/(dashboard)/expenses/[expenseId]/pay/_components/upi-app-sheet"
import { useSession } from "@/components/providers/session-provider"
import { UserAvatar } from "@/components/shared/user-avatar"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"
import { Spinner } from "@/components/ui/spinner"
import { useReportPersonSettlement } from "@/hooks/mutations"
import { useExpenses, useFriends, useGroups } from "@/hooks/queries"
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard"
import {
  calculatePersonNetBreakdown,
  type SettlementScope,
} from "@/lib/money"
import { buildUPILink, type UPITransactionParams } from "@/lib/upi"
import { cn } from "@/lib/utils"

export interface SettleExpensesDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  personId: string
  personName?: string
  personPhoto?: string
  personUpiId?: string
  initialScope?: SettlementScope
  onSettled?: () => void
}

/**
 * "Settle Expenses" sheet matching Screenshot 3:
 * Fully theme-adaptive (Light and Dark mode) and responsive across mobile, tablet, and desktop.
 */
export function SettleExpensesDialog({
  open,
  onOpenChange,
  personId,
  personName: propPersonName,
  personPhoto: propPersonPhoto,
  personUpiId: propPersonUpiId,
  initialScope,
  onSettled,
}: SettleExpensesDialogProps) {
  const { user } = useSession()
  const { data: expenses = [] } = useExpenses()
  const { data: friends = [] } = useFriends()
  const { data: groups = [] } = useGroups()
  const { copy } = useCopyToClipboard()

  const reportSettlement = useReportPersonSettlement({
    successMessage: "Settlement reported! Notified recipient for confirmation.",
  })

  const [showAppChooser, setShowAppChooser] = React.useState(false)
  const [showHelpDialog, setShowHelpDialog] = React.useState(false)

  // Find friend profile if available
  const friendProfile = React.useMemo(
    () => friends.find((f) => f.uid === personId),
    [friends, personId]
  )

  // Map of group names for fast lookup
  const groupNameMap = React.useMemo(() => {
    const map = new Map<string, string>()
    for (const g of groups) {
      map.set(g.id, g.name)
    }
    return map
  }, [groups])

  // Full breakdown across all mutual expenses with this person
  const fullBreakdown = React.useMemo(() => {
    if (!user || !personId) return null
    return calculatePersonNetBreakdown(user.uid, personId, expenses)
  }, [user, personId, expenses])

  // Person information
  const targetName =
    friendProfile?.displayName || fullBreakdown?.userBName || propPersonName || "Member"
  const targetPhoto =
    friendProfile?.photoURL || fullBreakdown?.userBPhoto || propPersonPhoto
  const targetUpiId =
    friendProfile?.upiId || fullBreakdown?.userBUpiId || propPersonUpiId || ""

  // Extract all distinct contexts with unsettled balances
  const allContexts = React.useMemo(() => {
    if (!fullBreakdown) return []
    return fullBreakdown.contexts.map((ctx) => {
      const isGroup = Boolean(ctx.groupId)
      const resolvedLabel =
        ctx.groupId && groupNameMap.has(ctx.groupId)
          ? groupNameMap.get(ctx.groupId)!
          : ctx.label
      return {
        ...ctx,
        isGroup,
        resolvedLabel,
      }
    })
  }, [fullBreakdown, groupNameMap])

  // Context selection state (default: all contexts where balance exists)
  const [selectedKeys, setSelectedKeys] = React.useState<string[]>([])

  // Initialize or reset selected contexts when dialog opens
  React.useEffect(() => {
    if (!open) return

    if (initialScope?.type === "group" && initialScope.groupId) {
      setSelectedKeys([initialScope.groupId])
    } else if (initialScope?.type === "direct") {
      setSelectedKeys(["direct"])
    } else if (allContexts.length > 0) {
      setSelectedKeys(allContexts.map((c) => c.key))
    }
  }, [open, initialScope, allContexts])

  const toggleContext = (key: string) => {
    setSelectedKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    )
  }

  // Selected breakdown calculation
  const selectedBreakdown = React.useMemo(() => {
    if (!user || !personId || selectedKeys.length === 0) return null
    return calculatePersonNetBreakdown(user.uid, personId, expenses, {
      type: "contexts",
      contextKeys: selectedKeys,
    })
  }, [user, personId, expenses, selectedKeys])

  const netPayablePaise = selectedBreakdown?.netPayablePaise ?? 0
  const netReceivablePaise = selectedBreakdown?.netReceivablePaise ?? 0
  const isUserOwing = netPayablePaise > 0

  const handleReport = (noteText?: string) => {
    if (!user || selectedKeys.length === 0) return
    const amountToSettle = netPayablePaise > 0 ? netPayablePaise : netReceivablePaise
    if (amountToSettle <= 0) {
      toast.info("No balance to settle for the selected items.")
      return
    }

    const note =
      noteText ||
      `JoySplit Settlement to ${targetName} (${selectedKeys.length} selected split${selectedKeys.length > 1 ? "s" : ""})`

    reportSettlement.mutate(
      {
        creditorId: personId,
        creditorName: targetName,
        amountPaise: amountToSettle,
        scope: {
          type: "contexts",
          contextKeys: selectedKeys,
        },
        note,
      },
      {
        onSuccess: () => {
          onSettled?.()
          onOpenChange(false)
        },
      }
    )
  }

  const handlePayViaUPI = () => {
    if (netPayablePaise <= 0) {
      toast.info("No payable balance selected.")
      return
    }

    if (!targetUpiId) {
      toast.warning("Recipient UPI ID is not available. You can mark it as settled directly.")
      handleReport()
      return
    }

    setShowAppChooser(true)
  }

  const handleLaunchApp = (appId: string) => {
    if (!targetUpiId) return

    const note = `JoySplit Settlement to ${targetName}`
    const upiUri = buildUPILink({
      upiId: targetUpiId,
      payeeName: targetName,
      amountPaise: netPayablePaise,
      note,
      app: appId as UPITransactionParams["app"],
    })

    setShowAppChooser(false)
    window.location.href = upiUri

    setTimeout(() => {
      handleReport(note)
    }, 1200)
  }

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="bottom"
          className="mx-auto flex h-[92vh] max-h-[92vh] w-full max-w-xl flex-col gap-0 rounded-t-[28px] border-border bg-background p-0 text-foreground shadow-2xl sm:h-[86vh] sm:max-h-[86vh] sm:rounded-3xl sm:border"
        >
          {/* Top Navigation Bar */}
          <div className="flex items-center justify-between border-b border-border/60 bg-background/95 px-4 py-3.5 backdrop-blur-md sm:px-6">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="flex size-9 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground active:scale-95"
              aria-label="Back"
            >
              <HugeiconsIcon icon={ArrowLeft01Icon} className="size-5" />
            </button>
            <SheetTitle className="text-base font-bold tracking-tight text-foreground">
              Settle Expenses
            </SheetTitle>
            <button
              type="button"
              onClick={() => setShowHelpDialog(true)}
              className="flex size-9 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground active:scale-95"
              aria-label="Help"
            >
              <HugeiconsIcon icon={HelpCircleIcon} className="size-5" />
            </button>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6">
            {/* Person Profile Card with PhonePe Badge */}
            <Card className="flex items-center gap-3.5 rounded-2xl border-border bg-card p-4 text-card-foreground shadow-xs">
              <div className="relative">
                <UserAvatar
                  src={targetPhoto}
                  name={targetName}
                  size="lg"
                  className="size-12 ring-2 ring-border/60"
                />
                <div
                  className="absolute -bottom-1 -right-1 flex size-5 items-center justify-center rounded-full bg-[#5f259f] text-[9px] font-black text-white shadow-md ring-2 ring-card"
                  title="PhonePe / UPI Verified"
                >
                  Pe
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-base font-bold text-foreground">{targetName}</div>
                <div className="truncate text-xs text-muted-foreground">
                  {targetUpiId ? `Banking name: ${targetName.toUpperCase()}` : "Splitzy Member"}
                </div>
                {targetUpiId && (
                  <div className="truncate font-mono text-[11px] text-muted-foreground">
                    UPI: {targetUpiId}
                  </div>
                )}
              </div>
            </Card>

            {/* Select groups to settle header */}
            <div className="mt-5 mb-2.5 px-0.5">
              <h2 className="text-sm font-semibold text-foreground">Select groups to settle</h2>
            </div>

            {/* List of Contexts (Groups + Direct Splits) */}
            <div className="flex flex-col gap-2.5">
              {allContexts.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
                  No pending group or direct splits with {targetName}. All balances are settled up!
                </div>
              ) : (
                allContexts.map((ctx) => {
                  const isChecked = selectedKeys.includes(ctx.key)
                  const ctxOwes = ctx.aOwesBPaise
                  const ctxGets = ctx.bOwesAPaise
                  const ctxNet = ctx.netPaise
                  const youOweInCtx = ctxNet < 0

                  return (
                    <div
                      key={ctx.key}
                      onClick={() => toggleContext(ctx.key)}
                      className={cn(
                        "flex cursor-pointer items-center justify-between gap-3 rounded-2xl border p-3.5 transition-all select-none",
                        isChecked
                          ? "border-primary/50 bg-primary/5 shadow-xs"
                          : "border-border/60 bg-card/60 opacity-60 hover:opacity-100 hover:bg-card"
                      )}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Custom styled checkbox indicator */}
                        <div
                          className={cn(
                            "flex size-5 shrink-0 items-center justify-center rounded-md border transition-colors",
                            isChecked
                              ? "border-emerald-600 bg-emerald-600 text-white dark:border-emerald-500 dark:bg-emerald-500"
                              : "border-muted-foreground/40 bg-transparent"
                          )}
                        >
                          {isChecked && <HugeiconsIcon icon={Tick02Icon} className="size-3.5 stroke-[3]" />}
                        </div>

                        {/* Group or Direct icon */}
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
                          <HugeiconsIcon
                            icon={ctx.isGroup ? UserGroupIcon : Invoice01Icon}
                            className="size-5 text-muted-foreground"
                          />
                        </div>

                        {/* Name and breakdown snippet */}
                        <div className="min-w-0">
                          <div className="truncate text-sm font-bold text-foreground">
                            {ctx.resolvedLabel}
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            {ctx.isGroup ? "Group Split" : "Direct Split"}
                            {ctxOwes > 0 && ctxGets > 0 && (
                              <span className="ml-1 text-[10px] font-medium text-primary">
                                (offset applied)
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right amount and options */}
                      <div className="flex items-center gap-2 text-right">
                        <div>
                          <div
                            className={cn(
                              "text-[11px] font-semibold",
                              youOweInCtx
                                ? "text-destructive"
                                : "text-emerald-600 dark:text-emerald-400"
                            )}
                          >
                            {youOweInCtx ? "You need to pay" : "You will receive"}
                          </div>
                          <div
                            className={cn(
                              "text-sm font-black tabular-nums",
                              youOweInCtx
                                ? "text-destructive"
                                : "text-emerald-600 dark:text-emerald-400"
                            )}
                          >
                            ₹{(Math.abs(ctxNet) / 100).toFixed(0)}
                          </div>
                        </div>

                        {/* Dropdown for item details */}
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            onClick={(e) => e.stopPropagation()}
                            className="flex size-7 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
                          >
                            <HugeiconsIcon icon={MoreVerticalIcon} className="size-4" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation()
                                copy(
                                  `${ctx.resolvedLabel}: ${youOweInCtx ? "Owe" : "Receive"} ₹${(Math.abs(ctxNet) / 100).toFixed(0)}`,
                                  "Split detail copied"
                                )
                              }}
                            >
                              Copy Details
                            </DropdownMenuItem>
                            {ctx.isGroup && ctx.groupId && (
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation()
                                  window.open(`/groups/${ctx.groupId}`, "_blank")
                                }}
                              >
                                View Group
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            {/* Total Selected Summary Row */}
            <Card className="mt-5 rounded-2xl border-border bg-muted/40 p-4 text-card-foreground shadow-xs">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-bold text-foreground">Total Selected Summary</div>
                  <div className="text-xs text-muted-foreground">
                    {selectedKeys.length} of {allContexts.length} split
                    {allContexts.length === 1 ? "" : "s"} selected
                  </div>
                </div>

                <div className="flex items-center gap-2 text-right">
                  <div>
                    <div
                      className={cn(
                        "text-xs font-semibold",
                        isUserOwing
                          ? "text-destructive"
                          : netReceivablePaise > 0
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-muted-foreground"
                      )}
                    >
                      {isUserOwing
                        ? "You need to pay"
                        : netReceivablePaise > 0
                          ? "You will receive"
                          : "All settled"}
                    </div>
                    <div
                      className={cn(
                        "text-lg font-black tabular-nums",
                        isUserOwing
                          ? "text-destructive"
                          : netReceivablePaise > 0
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-muted-foreground"
                      )}
                    >
                      ₹
                      {(
                        (isUserOwing ? netPayablePaise : netReceivablePaise) / 100
                      ).toFixed(0)}
                    </div>
                  </div>

                  {/* Indicator badge */}
                  {isUserOwing && (
                    <div className="flex size-7 items-center justify-center rounded-full bg-destructive/15 text-destructive font-bold">
                      <span className="text-sm leading-none">↗</span>
                    </div>
                  )}
                  {netReceivablePaise > 0 && (
                    <div className="flex size-7 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold">
                      <span className="text-sm leading-none">↙</span>
                    </div>
                  )}
                </div>
              </div>

              {selectedBreakdown && selectedBreakdown.offsetPaise > 0 && (
                <div className="mt-2.5 border-t border-border/40 pt-2 text-[11px] text-muted-foreground">
                  💡 ₹{(selectedBreakdown.offsetPaise / 100).toFixed(0)} mutual offset applied
                  automatically across reciprocal splits.
                </div>
              )}
            </Card>
          </div>

          {/* Sticky Bottom Action Bar */}
          <div className="border-t border-border/60 bg-background/95 p-4 backdrop-blur-md sm:px-6">
            {isUserOwing ? (
              <Button
                type="button"
                disabled={reportSettlement.isPending || selectedKeys.length === 0}
                onClick={handlePayViaUPI}
                className="h-13 w-full rounded-2xl bg-primary text-base font-extrabold tracking-wider text-primary-foreground shadow-lg transition hover:bg-primary/90 active:scale-[0.99] disabled:opacity-50"
              >
                {reportSettlement.isPending ? (
                  <span className="flex items-center gap-2">
                    <Spinner className="size-4" /> Processing...
                  </span>
                ) : (
                  `PAY ₹${(netPayablePaise / 100).toFixed(0)}`
                )}
              </Button>
            ) : netReceivablePaise > 0 ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  toast.success(`Reminder sent to ${targetName} for ₹${(netReceivablePaise / 100).toFixed(0)}`)
                }}
                className="h-13 w-full rounded-2xl border-emerald-600/40 text-base font-bold text-emerald-600 hover:bg-emerald-500/10 dark:border-emerald-500/40 dark:text-emerald-400"
              >
                REMIND {targetName.toUpperCase()} (₹{(netReceivablePaise / 100).toFixed(0)})
              </Button>
            ) : (
              <Button
                type="button"
                disabled
                className="h-13 w-full rounded-2xl bg-secondary text-base font-bold text-muted-foreground"
              >
                ALL SETTLED UP
              </Button>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* UPI App Chooser Sheet */}
      <UpiAppSheet
        open={showAppChooser}
        onOpenChange={setShowAppChooser}
        onSelect={handleLaunchApp}
      />

      {/* Help Dialog */}
      <Dialog open={showHelpDialog} onOpenChange={setShowHelpDialog}>
        <DialogContent className="max-w-md rounded-2xl border-border bg-card text-card-foreground">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-foreground">How Settle Expenses Works</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              JoySplit / PhonePe Person-to-Person Net Settlement Model
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 py-2 text-xs text-foreground/90">
            <div className="flex items-start gap-2.5">
              <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/20 text-[11px] font-bold text-primary">
                1
              </span>
              <div>
                <span className="font-semibold text-foreground">Person-Centric Netting: </span>
                Expenses from all shared groups and direct splits are unified. Mutual debts
                automatically cancel each other out so you only settle the remaining difference.
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/20 text-[11px] font-bold text-primary">
                2
              </span>
              <div>
                <span className="font-semibold text-foreground">Flexible Selection: </span>
                Check or uncheck groups to settle specific splits now or clear everything at once.
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/20 text-[11px] font-bold text-primary">
                3
              </span>
              <div>
                <span className="font-semibold text-foreground">Live Synchronization: </span>
                Paying either from the group or directly from the people view instantly clears the
                underlying expense shares in real-time.
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
