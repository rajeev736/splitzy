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
import { useFriendRequests, useGroupInvites, useGroups } from "@/hooks/queries"
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
  const { data: invites } = useGroupInvites()
  const { data: friendRequests } = useFriendRequests()

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

    if (!invites.some((g) => g.id === groupId)) {
      return (
        <p className="rounded-lg bg-muted p-3 text-xs text-muted-foreground">
          This invitation is no longer pending (it was declined, cancelled or the group was deleted).
        </p>
      )
    }

    // Linked friend request still pending? Then offer to accept both at once.
    const linkedRequest = friendRequests.find(
      (r) =>
        r.status === "PENDING" &&
        r.receiverId === user?.uid &&
        (r.id === data.friendRequestId || r.groupId === groupId)
    )
    const friendRequestId = linkedRequest?.id
    const linkedRequestPending = !!linkedRequest
    const isProcessing = acceptInvite.isPending || declineInvite.isPending
    const accept = (withFriendRequest: boolean) =>
      acceptInvite.mutate(
        { groupId, friendRequestId: withFriendRequest ? friendRequestId : undefined },
        { onSuccess: () => go(`/groups/${groupId}`) }
      )

    return (
      <div className="flex flex-col gap-2">
        {linkedRequestPending && (
          <Button size="lg" className={CTA} disabled={isProcessing} onClick={() => accept(true)}>
            {acceptInvite.isPending && acceptInvite.variables?.friendRequestId && <Spinner />}
            Join Group &amp; Accept Friend Request
          </Button>
        )}
        <Button
          size="lg"
          variant={linkedRequestPending ? "outline" : "default"}
          className={CTA}
          disabled={isProcessing}
          onClick={() => accept(false)}
        >
          {acceptInvite.isPending && !acceptInvite.variables?.friendRequestId && <Spinner />}
          {linkedRequestPending ? "Join Group Only" : "Accept Group Invitation"}
        </Button>
        <Button
          variant="secondary"
          className="w-full"
          disabled={isProcessing}
          onClick={() => declineInvite.mutate({ groupId }, { onSuccess: onClose })}
        >
          {declineInvite.isPending && <Spinner />}
          Decline Group Invitation
        </Button>
        {linkedRequestPending && (
          <p className="text-[11px] text-muted-foreground">
            Declining the group keeps the friend request — you can answer it in Friend Requests.
          </p>
        )}
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
