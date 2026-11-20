"use client"

import * as React from "react"
import Link from "next/link"
import {
  ArrowRight01Icon,
  UserAccountIcon,
  UserMinus01Icon,
  UserRemove01Icon,
  UserShield01Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react"

import { useSession } from "@/components/providers/session-provider"
import { Amount } from "@/components/shared/amount"
import { BottomSheet } from "@/components/shared/bottom-sheet"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { UserAvatar } from "@/components/shared/user-avatar"
import { Spinner } from "@/components/ui/spinner"
import { useRemoveGroupMember, useSetGroupMemberRole } from "@/hooks/mutations"
import { useFriends } from "@/hooks/queries"
import { canManageMember, isGroupAdmin } from "@/lib/groups"
import { calculateMemberGroupBalance } from "@/lib/money"
import type { Expense, Group } from "@/lib/types"
import { cn } from "@/lib/utils"
import { RoleBadge } from "./member-row"

/** True when tapping this member would offer anything (profile link or admin actions). */
export function memberHasActions(
  group: Group,
  me: string | undefined,
  uid: string,
  friendUids: string[]
) {
  return (
    uid !== me && (friendUids.includes(uid) || canManageMember(group, me, uid))
  )
}

/**
 * What you can do with one member, WhatsApp style: view their profile, and as
 * an admin make them an admin / dismiss them, or remove them. The creator can't
 * be dismissed or removed by anyone.
 */
export function MemberActionsSheet({
  group,
  uid,
  expenses,
  onOpenChange,
}: {
  group: Group
  /** The member whose actions are open; null = closed. */
  uid: string | null
  expenses?: Expense[]
  onOpenChange: (open: boolean) => void
}) {
  const { user } = useSession()
  const { data: friends } = useFriends()
  const setRole = useSetGroupMemberRole()
  const remove = useRemoveGroupMember()
  const [confirmRemove, setConfirmRemove] = React.useState(false)
  // Keep showing the last member while the sheet animates closed
  const [shown, setShown] = React.useState(uid)
  if (uid && uid !== shown) setShown(uid)

  const target = shown
  const info = target ? group.memberDetails?.[target] : undefined
  const friend = target ? friends.find((f) => f.uid === target) : undefined
  const name = info?.name || friend?.displayName || "Member"
  const isAdmin = !!target && isGroupAdmin(group, target)
  const canManage = !!target && canManageMember(group, user?.uid, target)
  const balance =
    target && expenses
      ? calculateMemberGroupBalance(target, group.id, expenses)
      : null
  const close = () => onOpenChange(false)

  const changeRole = (role: "admin" | "member") => {
    if (!target) return
    setRole.mutate(
      { groupId: group.id, uid: target, role },
      {
        onSuccess: () => {
          close()
        },
      }
    )
  }

  return (
    <>
      <BottomSheet
        open={!!uid}
        onOpenChange={onOpenChange}
        title={name}
        description={info?.splitzyId || friend?.splitzyId}
      >
        {target && (
          <div className="flex flex-col gap-4 pb-4">
            <div className="flex items-center gap-3">
              <UserAvatar
                uid={target}
                src={info?.photoURL || friend?.photoURL}
                name={name}
                size="lg"
                // This sheet is their card already, with View profile
                peek={false}
              />
              <div className="flex min-w-0 flex-col items-start gap-1">
                <RoleBadge
                  isCreator={target === group.createdBy}
                  isAdmin={isAdmin}
                />
                {balance && (
                  <span className="text-xs text-muted-foreground">
                    {balance.netPaise === 0 ? (
                      "Settled up in this group"
                    ) : (
                      <>
                        Balance in this group:{" "}
                        <Amount
                          paise={balance.netPaise}
                          signed
                          className="font-semibold tabular-nums"
                        />
                      </>
                    )}
                  </span>
                )}
              </div>
            </div>

            <div className="-mx-4 flex flex-col border-y">
              {friend && (
                <ActionRow
                  icon={UserAccountIcon}
                  label={`View ${name.split(" ")[0]}'s profile`}
                  render={<Link href={`/friends/${target}`} onClick={close} />}
                />
              )}
              {canManage &&
                (isAdmin ? (
                  <ActionRow
                    icon={UserMinus01Icon}
                    label="Dismiss as admin"
                    hint="They stay in the group"
                    pending={setRole.isPending}
                    onClick={() => changeRole("member")}
                  />
                ) : (
                  <ActionRow
                    icon={UserShield01Icon}
                    label="Make group admin"
                    hint="Admins can remove people and change settings"
                    pending={setRole.isPending}
                    onClick={() => changeRole("admin")}
                  />
                ))}
              {canManage && (
                <ActionRow
                  icon={UserRemove01Icon}
                  label={`Remove ${name.split(" ")[0]}`}
                  destructive
                  onClick={() => setConfirmRemove(true)}
                />
              )}
            </div>

            {target === group.createdBy &&
              target !== user?.uid &&
              isGroupAdmin(group, user?.uid) && (
                <p className="text-xs text-muted-foreground">
                  {name} created this group, so they can&apos;t be dismissed as
                  admin or removed.
                </p>
              )}
          </div>
        )}
      </BottomSheet>

      <ConfirmDialog
        open={confirmRemove}
        onOpenChange={setConfirmRemove}
        title={`Remove ${name}?`}
        icon={UserRemove01Icon}
        destructive
        confirmLabel="Remove"
        isPending={remove.isPending}
        description={
          <>
            {name} will leave <strong>{group.name}</strong> and its chat.
            Expenses they&apos;re part of stay as they are and they can still
            see them in their history.
            {balance && balance.netPaise !== 0 && (
              <>
                {" "}
                Their balance here (
                <Amount
                  paise={balance.netPaise}
                  signed
                  className="font-semibold"
                />
                ) isn&apos;t cancelled — it can still be settled.
              </>
            )}
          </>
        }
        onConfirm={() =>
          target &&
          remove.mutate(
            { groupId: group.id, uid: target },
            {
              onSuccess: () => {
                setConfirmRemove(false)
                close()
              },
            }
          )
        }
      />
    </>
  )
}

function ActionRow({
  icon,
  label,
  hint,
  destructive,
  pending,
  onClick,
  render,
}: {
  icon: IconSvgElement
  label: string
  hint?: string
  destructive?: boolean
  pending?: boolean
  onClick?: () => void
  render?: React.ReactElement
}) {
  const content = (
    <>
      <span
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-full",
          destructive
            ? "bg-destructive/10 text-destructive"
            : "bg-primary/10 text-primary"
        )}
      >
        {pending ? (
          <Spinner className="size-4" />
        ) : (
          <HugeiconsIcon icon={icon} className="size-4.5" />
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span
          className={cn(
            "block truncate text-sm font-medium",
            destructive && "text-destructive"
          )}
        >
          {label}
        </span>
        {hint && (
          <span className="block text-xs text-muted-foreground">
            {hint}
          </span>
        )}
      </span>
      {!destructive && !onClick && (
        <HugeiconsIcon
          icon={ArrowRight01Icon}
          className="size-4 shrink-0 text-muted-foreground"
        />
      )}
    </>
  )
  const className =
    "flex min-h-14 w-full items-center gap-3 border-b px-4 py-2.5 text-left transition-colors last:border-b-0 hover:bg-muted/60 disabled:opacity-60"
  if (render)
    return React.cloneElement(
      render as React.ReactElement<{
        className?: string
        children?: React.ReactNode
      }>,
      { className, children: content }
    )
  return (
    <button
      type="button"
      className={className}
      onClick={onClick}
      disabled={pending}
    >
      {content}
    </button>
  )
}
