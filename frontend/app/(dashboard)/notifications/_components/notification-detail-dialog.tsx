"use client"

import { useRouter } from "nextjs-toploader/app"
import { toast } from "sonner"

import { useSession } from "@/components/providers/session-provider"
import { Amount } from "@/components/shared/amount"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Spinner } from "@/components/ui/spinner"
import {
  useAcceptGroupInvite,
  useConfirmPayment,
  useDeclineGroupInvite,
  useDisputePayment,
} from "@/hooks/mutations"
import { useGroups } from "@/hooks/queries"
import type { AppNotification } from "@/lib/types"
import { NotificationIcon } from "./notification-icon"

const CTA = "h-11 w-full"

/** Interactive detail modal for a notification, with the type-specific call to action. */
export function NotificationDetailDialog({
  notif,
  onClose,
}: {
  notif: AppNotification | null
  onClose: () => void
}) {
  return (
    <Dialog open={notif !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        {notif && (
          <>
            <DialogHeader>
              <DialogTitle className="pr-6">{notif.title}</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col items-center gap-4 py-2 text-center">
              <NotificationIcon type={notif.type} size="lg" neutral />
              <div>
                <p className="text-sm leading-relaxed font-semibold">{notif.message}</p>
                {!!notif.data?.amountPaise && (
                  <Amount paise={notif.data.amountPaise} className="mt-2 block text-2xl font-extrabold" />
                )}
              </div>
              <div className="flex w-full flex-col gap-2 pt-2">
                <NotificationCta notif={notif} onClose={onClose} />
                <Button variant="outline" className="w-full" onClick={onClose}>
                  Close
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

function NotificationCta({ notif, onClose }: { notif: AppNotification; onClose: () => void }) {
  const router = useRouter()
  const { user } = useSession()
  const { data: groups } = useGroups()

  const acceptInvite = useAcceptGroupInvite({
    successMessage: (data) => (data as { message?: string } | undefined)?.message || "You have joined the group!",
  })
  const declineInvite = useDeclineGroupInvite({ successMessage: "Group invitation declined" })
  const confirmPayment = useConfirmPayment({ successMessage: "Payment confirmed!" })
  const disputePayment = useDisputePayment()

  const data = notif.data
  const go = (href: string) => {
    onClose()
    router.push(href)
  }
  const goToExpenseOrHistory = () => go(data?.expenseId ? `/expenses/${data.expenseId}` : "/history")

  /* Group invitation: accept / decline (or view if already a member) */
  if (notif.type === "GROUP_INVITE" && data?.groupId) {
    const groupId = data.groupId
    const grp = groups.find((g) => g.id === groupId)
    const isAlreadyMember = user && grp?.members?.includes(user.uid)

    if (isAlreadyMember) {
      return (
        <Button size="lg" className={CTA} onClick={() => go(`/groups/${groupId}`)}>
          View Group
        </Button>
      )
    }

    const friendRequestId = data.friendRequestId
    const isCombined = Boolean(friendRequestId)
    const isProcessing = acceptInvite.isPending || declineInvite.isPending

    return (
      <div className="flex flex-col gap-2">
        <Button
          size="lg"
          className={CTA}
          disabled={isProcessing}
          onClick={() =>
            acceptInvite.mutate(
              { groupId, acceptCombinedFriendship: isCombined, friendRequestId },
              { onSuccess: () => go(`/groups/${groupId}`) }
            )
          }
        >
          {acceptInvite.isPending && <Spinner />}
          {isCombined ? "Accept Group & Friend Request" : "Accept Group Invitation"}
        </Button>
        <Button
          variant="secondary"
          className="w-full"
          disabled={isProcessing}
          onClick={() => declineInvite.mutate({ groupId, friendRequestId }, { onSuccess: onClose })}
        >
          {declineInvite.isPending && <Spinner />}
          Decline
        </Button>
      </div>
    )
  }

  if (notif.type === "FRIEND_REQUEST") {
    return (
      <Button size="lg" className={CTA} onClick={() => go("/friends/requests?tab=received")}>
        View Received Request
      </Button>
    )
  }

  if (notif.type === "FRIEND_ACCEPTED") {
    return (
      <Button size="lg" className={CTA} onClick={() => go("/friends")}>
        View Friends List
      </Button>
    )
  }

  if (notif.type === "PAYMENT_REPORTED") {
    const expenseId = data?.expenseId
    const actorId = data?.actorId
    const busy = confirmPayment.isPending || disputePayment.isPending

    return (
      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-2">
          <Button
            size="lg"
            className={CTA}
            disabled={busy}
            onClick={() => {
              if (expenseId && actorId) {
                confirmPayment.mutate({ expenseId, memberUserId: actorId }, { onSuccess: onClose })
              }
            }}
          >
            {confirmPayment.isPending && <Spinner />}
            Yes, Received
          </Button>
          <Button
            size="lg"
            variant="destructive"
            className={CTA}
            disabled={busy}
            onClick={() => {
              if (expenseId && actorId) {
                disputePayment.mutate(
                  { expenseId, memberUserId: actorId },
                  {
                    onSuccess: () => {
                      toast.error("Payment marked as not received (disputed)")
                      onClose()
                    },
                  }
                )
              }
            }}
          >
            {disputePayment.isPending && <Spinner />}
            No, Not Received
          </Button>
        </div>
        <Button variant="link" size="sm" className="w-full font-bold" onClick={goToExpenseOrHistory}>
          View Full Expense Details
        </Button>
      </div>
    )
  }

  if (notif.type === "PAYMENT_CONFIRMED") {
    return (
      <Button size="lg" className={CTA} onClick={goToExpenseOrHistory}>
        View Confirmed Settlement
      </Button>
    )
  }

  if (notif.type === "NEW_EXPENSE" || data?.expenseId) {
    return (
      <Button
        size="lg"
        className={CTA}
        onClick={() =>
          go(data?.expenseId ? `/expenses/${data.expenseId}` : data?.groupId ? `/groups/${data.groupId}` : "/history")
        }
      >
        View Expense
      </Button>
    )
  }

  if (notif.type === "GROUP_MEMBER_LEFT" || notif.type === "GROUP_ACCEPTED" || data?.groupId) {
    const groupId = data?.groupId
    return (
      <Button
        size="lg"
        className={CTA}
        onClick={() => go(groupId && groups.some((g) => g.id === groupId) ? `/groups/${groupId}` : "/groups")}
      >
        View Group
      </Button>
    )
  }

  if (notif.type.includes("FRIEND")) {
    return (
      <Button size="lg" className={CTA} onClick={() => go("/friends/requests?tab=received")}>
        View Friend Requests
      </Button>
    )
  }

  return null
}
