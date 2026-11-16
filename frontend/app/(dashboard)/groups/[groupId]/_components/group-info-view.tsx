"use client"

import * as React from "react"
import Link from "next/link"
import {
  ArrowRight01Icon,
  BubbleChatIcon,
  Camera01Icon,
  Delete02Icon,
  InvoiceIcon,
  Logout01Icon,
  PencilEdit02Icon,
  UserAdd01Icon,
  UserMultipleIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react"
import { toast } from "sonner"

import { AppHeader } from "@/components/layout/app-header"
import { PageContainer } from "@/components/layout/app-shell"
import { useSession } from "@/components/providers/session-provider"
import { GroupIcon } from "@/components/shared/group-icon"
import { GroupIconPicker } from "@/components/shared/group-icon-picker"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { useUpdateGroupInfo } from "@/hooks/mutations"
import { groupChatId } from "@/lib/chat"
import {
  canAddGroupMembers,
  canEditGroupInfo,
  groupSettings,
  isGroupAdmin,
} from "@/lib/groups"
import type { Expense, Group } from "@/lib/types"
import { cn } from "@/lib/utils"
import { EditGroupSheet } from "./edit-group-sheet"
import { GroupMembersCard } from "./group-members-card"
import {
  GroupPermissionSheet,
  permissionLabel,
  PERMISSIONS,
  type GroupPermission,
} from "./group-permission-sheet"
import { InviteDialog } from "./invite-dialog"
import { DeleteGroupDialog, LeaveGroupDialog } from "./leave-delete-dialogs"

type Open =
  "edit" | "edit-description" | "icon" | "add" | "leave" | "delete" | null

const formatDate = (iso?: string) => {
  const d = iso ? new Date(iso) : null
  return d && !Number.isNaN(d.getTime())
    ? d.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : null
}

export function GroupInfoView({
  group,
  expenses,
  onGone,
}: {
  group: Group
  expenses?: Expense[]
  /** After leaving / deleting. */
  onGone: () => void
}) {
  const { user } = useSession()
  const [open, setOpen] = React.useState<Open>(null)
  const [permission, setPermission] = React.useState<GroupPermission | null>(
    null
  )
  const updateInfo = useUpdateGroupInfo()
  const close = (next: boolean) => !next && setOpen(null)

  const me = user?.uid
  const isMember = !!me && group.members.includes(me)
  const canEdit = canEditGroupInfo(group, me)
  const canAdd = canAddGroupMembers(group, me)
  const isAdmin = isGroupAdmin(group, me)
  const isCreator = me === group.createdBy
  const settings = groupSettings(group)
  const created = formatDate(group.createdAt)

  const changeIcon = async (icon: string) => {
    await updateInfo.mutateAsync({ groupId: group.id, changes: { icon } })
    toast.success("Group icon updated")
  }

  return (
    <>
      <AppHeader
        title="Group info"
        showBack
        rightAction={
          canEdit ? (
            <Button
              variant="ghost"
              size="icon"
              aria-label="Edit group info"
              title="Edit group info"
              onClick={() => setOpen("edit")}
            >
              <HugeiconsIcon icon={PencilEdit02Icon} className="size-5" />
            </Button>
          ) : undefined
        }
      />

      <PageContainer className="max-w-xl gap-5 pb-24 md:pb-8">
        {/* Icon, name, member count */}
        <section className="flex flex-col items-center gap-3 pt-1 text-center">
          {canEdit ? (
            <button
              type="button"
              onClick={() => setOpen("icon")}
              aria-label="Change group icon"
              className="group relative rounded-[1.75rem] outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <GroupIcon
                src={group.icon}
                alt={group.name}
                className="size-28 rounded-[1.75rem] shadow-sm"
              />
              <span className="absolute -right-1 -bottom-1 flex size-9 items-center justify-center rounded-full border-[3px] border-background bg-primary text-primary-foreground transition-transform group-active:scale-95">
                <HugeiconsIcon icon={Camera01Icon} className="size-4" />
              </span>
            </button>
          ) : (
            <GroupIcon
              src={group.icon}
              alt={group.name}
              className="size-28 rounded-[1.75rem] shadow-sm"
            />
          )}
          <div className="flex w-full min-w-0 flex-col items-center gap-0.5">
            <h1 className="max-w-full text-xl leading-tight font-semibold break-words">
              {group.name}
            </h1>
            <p className="text-sm text-muted-foreground">
              Group · {group.members.length}{" "}
              {group.members.length === 1 ? "member" : "members"}
            </p>
          </div>
        </section>

        {/* Quick actions */}
        {isMember && (
          <div
            className={cn("grid gap-2", canAdd ? "grid-cols-3" : "grid-cols-2")}
          >
            {canAdd && (
              <QuickAction
                icon={UserAdd01Icon}
                label="Add"
                onClick={() => setOpen("add")}
              />
            )}
            <QuickAction
              icon={BubbleChatIcon}
              label="Chat"
              render={<Link href={`/chat/${groupChatId(group.id)}`} />}
            />
            <QuickAction
              icon={InvoiceIcon}
              label="Expense"
              render={<Link href={`/expenses/new?groupId=${group.id}`} />}
            />
          </div>
        )}

        {/* Description + created */}
        <Card className="gap-1.5 px-4 py-3.5">
          {group.description ? (
            <p className="text-sm leading-relaxed break-words whitespace-pre-line">
              {group.description}
            </p>
          ) : canEdit ? (
            <button
              type="button"
              onClick={() => setOpen("edit-description")}
              className="-mx-1 w-fit rounded px-1 text-left text-sm font-medium text-primary"
            >
              Add group description
            </button>
          ) : (
            <p className="text-sm text-muted-foreground">No description</p>
          )}
          {(group.creatorName || created) && (
            <p className="text-xs text-muted-foreground">
              Created{group.creatorName ? ` by ${group.creatorName}` : ""}
              {created ? `, ${created}` : ""}
            </p>
          )}
        </Card>

        <GroupMembersCard
          group={group}
          expenses={expenses}
          onAdd={() => setOpen("add")}
        />

        {/* Permissions */}
        {isMember && (
          <section className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between gap-2 px-1">
              <h2 className="text-sm font-semibold">Group settings</h2>
              {!isAdmin && (
                <span className="text-[11px] text-muted-foreground">
                  Only admins can change these
                </span>
              )}
            </div>
            <Card className="gap-0 divide-y py-0">
              {(Object.keys(PERMISSIONS) as GroupPermission[]).map((key) => (
                <SettingRow
                  key={key}
                  icon={
                    key === "editInfo" ? PencilEdit02Icon : UserMultipleIcon
                  }
                  label={PERMISSIONS[key].title}
                  value={permissionLabel(settings[key])}
                  onClick={isAdmin ? () => setPermission(key) : undefined}
                />
              ))}
            </Card>
          </section>
        )}

        {/* Leave / delete */}
        {isMember && (
          <Card className="gap-0 divide-y py-0">
            <DangerRow
              icon={Logout01Icon}
              label="Leave group"
              onClick={() => setOpen("leave")}
            />
            {isCreator && (
              <DangerRow
                icon={Delete02Icon}
                label="Delete group"
                onClick={() => setOpen("delete")}
              />
            )}
          </Card>
        )}
      </PageContainer>

      {canEdit && (
        <>
          <EditGroupSheet
            group={group}
            open={open === "edit" || open === "edit-description"}
            focus={open === "edit-description" ? "description" : "name"}
            onOpenChange={close}
          />
          <GroupIconPicker
            open={open === "icon"}
            onOpenChange={close}
            value={group.icon}
            onSelect={changeIcon}
          />
        </>
      )}
      <GroupPermissionSheet
        group={group}
        permission={permission}
        onOpenChange={(o) => !o && setPermission(null)}
      />
      <InviteDialog group={group} open={open === "add"} onOpenChange={close} />
      <LeaveGroupDialog
        group={group}
        open={open === "leave"}
        onOpenChange={close}
        onLeft={onGone}
      />
      {isCreator && (
        <DeleteGroupDialog
          group={group}
          open={open === "delete"}
          onOpenChange={close}
          onDeleted={onGone}
        />
      )}
    </>
  )
}

function QuickAction({
  icon,
  label,
  onClick,
  render,
}: {
  icon: IconSvgElement
  label: string
  onClick?: () => void
  render?: React.ReactElement
}) {
  return (
    <Button
      variant="outline"
      className="h-auto flex-col gap-1.5 rounded-lg py-3 text-xs font-semibold text-primary"
      onClick={onClick}
      nativeButton={!render}
      render={render}
    >
      <HugeiconsIcon icon={icon} className="size-5" />
      {label}
    </Button>
  )
}

function SettingRow({
  icon,
  label,
  value,
  onClick,
}: {
  icon: IconSvgElement
  label: string
  value: string
  onClick?: () => void
}) {
  const body = (
    <>
      <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
        <HugeiconsIcon icon={icon} className="size-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{label}</span>
        <span className="block truncate text-xs text-muted-foreground">
          {value}
        </span>
      </span>
      {onClick && (
        <HugeiconsIcon
          icon={ArrowRight01Icon}
          className="size-4 shrink-0 text-muted-foreground"
        />
      )}
    </>
  )
  const className = "flex w-full items-center gap-3 px-4 py-2.5 text-left"
  return onClick ? (
    <button
      type="button"
      onClick={onClick}
      className={cn(className, "transition-colors hover:bg-muted/60")}
    >
      {body}
    </button>
  ) : (
    <div className={className}>{body}</div>
  )
}

function DangerRow({
  icon,
  label,
  onClick,
}: {
  icon: IconSvgElement
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-medium text-destructive transition-colors hover:bg-destructive/5"
    >
      <HugeiconsIcon icon={icon} className="size-5 shrink-0" />
      {label}
    </button>
  )
}
