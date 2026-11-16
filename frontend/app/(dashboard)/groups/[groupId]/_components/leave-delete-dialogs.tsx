"use client"

import * as React from "react"
import {
  Alert02Icon,
  Delete02Icon,
  Logout01Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { useSession } from "@/components/providers/session-provider"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Field } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { useDeleteGroup, useLeaveGroup } from "@/hooks/mutations"
import { useExpenses } from "@/hooks/queries"
import { isGroupAdmin } from "@/lib/groups"
import { canDeleteGroup, canUserLeaveGroup } from "@/lib/money"
import type { Group } from "@/lib/types"

/** Explains why leave/delete is currently blocked (unsettled balances etc.). */
function BlockedNotice({ title, reason }: { title: string; reason?: string }) {
  return (
    <Alert>
      <HugeiconsIcon icon={Alert02Icon} className="text-warning" />
      <AlertTitle className="font-semibold">{title}</AlertTitle>
      <AlertDescription className="leading-relaxed text-foreground">
        {reason}
      </AlertDescription>
    </Alert>
  )
}

export function LeaveGroupDialog({
  group,
  open,
  onOpenChange,
  onLeft,
}: {
  group: Group
  open: boolean
  onOpenChange: (open: boolean) => void
  onLeft: () => void
}) {
  const { user } = useSession()
  const { data: expenses } = useExpenses()
  const leave = useLeaveGroup({ successMessage: "You left the group" })
  const check = user
    ? canUserLeaveGroup(user.uid, group, expenses)
    : { allowed: false, reason: "" }
  const isCreator = user?.uid === group.createdBy
  const otherAdmin = group.members.some(
    (m) => m !== user?.uid && isGroupAdmin(group, m)
  )

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Leave group?"
      icon={Logout01Icon}
      destructive
      confirmLabel="Leave group"
      isPending={leave.isPending}
      confirmDisabled={!check.allowed}
      description={
        check.allowed ? (
          <>
            You&apos;ll leave <strong>{group.name}</strong> and its chat. Your
            past expenses stay in your history.
            {isCreator &&
              (otherAdmin
                ? " You created this group, so another admin takes it over."
                : " You created this group, so the next member takes it over as admin.")}
          </>
        ) : undefined
      }
      onConfirm={() => leave.mutate(group.id, { onSuccess: onLeft })}
    >
      {!check.allowed && (
        <BlockedNotice title="You can't leave yet" reason={check.reason} />
      )}
    </ConfirmDialog>
  )
}

/**
 * Deleting is for the creator only and can't be undone, so they type the
 * group's name to confirm. Everyone's history (expenses, balances) is kept.
 */
export function DeleteGroupDialog({
  group,
  open,
  onOpenChange,
  onDeleted,
}: {
  group: Group
  open: boolean
  onOpenChange: (open: boolean) => void
  onDeleted: () => void
}) {
  const { user } = useSession()
  const { data: expenses } = useExpenses()
  const remove = useDeleteGroup({ successMessage: "Group deleted" })
  const [typed, setTyped] = React.useState("")
  const check = user
    ? canDeleteGroup(user.uid, group, expenses)
    : { allowed: false, reason: "" }
  const matches = typed.trim().toLowerCase() === group.name.trim().toLowerCase()

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setTyped("")
        onOpenChange(next)
      }}
      title="Delete group?"
      icon={Delete02Icon}
      destructive
      confirmLabel="Delete for everyone"
      isPending={remove.isPending}
      confirmDisabled={!check.allowed || !matches}
      description={
        check.allowed ? (
          <>
            <strong>{group.name}</strong> will be deleted for all{" "}
            {group.members.length} members, along with its chat. Past expenses
            stay in everyone&apos;s history. This can&apos;t be undone.
          </>
        ) : undefined
      }
      onConfirm={() => remove.mutate(group.id, { onSuccess: onDeleted })}
    >
      {check.allowed ? (
        <Field className="gap-1.5">
          {/* A plain label: FieldLabel is a flex row, which would split the sentence into columns */}
          <label
            htmlFor="delete-group-confirm"
            className="text-xs leading-relaxed text-muted-foreground"
          >
            Type{" "}
            <strong className="font-semibold break-words text-foreground">
              {group.name}
            </strong>{" "}
            to confirm
          </label>
          <Input
            id="delete-group-confirm"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            className="h-10"
          />
        </Field>
      ) : (
        <BlockedNotice
          title="You can't delete this group yet"
          reason={check.reason}
        />
      )}
    </ConfirmDialog>
  )
}
