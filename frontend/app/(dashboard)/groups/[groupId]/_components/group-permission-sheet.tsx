"use client"

import * as React from "react"

import { BottomSheet } from "@/components/shared/bottom-sheet"
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
  FieldTitle,
} from "@/components/ui/field"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Spinner } from "@/components/ui/spinner"
import { useUpdateGroupSettings } from "@/hooks/mutations"
import { groupSettings } from "@/lib/groups"
import type { Group, GroupSettings } from "@/lib/types"

export type GroupPermission = keyof GroupSettings

export const PERMISSIONS: Record<
  GroupPermission,
  { title: string; description: string; all: string; admins: string }
> = {
  editInfo: {
    title: "Edit group info",
    description: "Who can change this group's name, icon and description.",
    all: "Everyone in the group can change the name, icon and description.",
    admins: "Only admins can change the name, icon and description.",
  },
  addMembers: {
    title: "Add members",
    description: "Who can add people to this group.",
    all: "Everyone in the group can add people.",
    admins: "Only admins can add people.",
  },
}

export const permissionLabel = (value: "all" | "admins") =>
  value === "all" ? "All members" : "Only admins"

/** One group permission (admins only): "All members" or "Only admins". Saves on tap. */
export function GroupPermissionSheet({
  group,
  permission,
  onOpenChange,
}: {
  group: Group
  /** The permission being edited; null = closed. */
  permission: GroupPermission | null
  onOpenChange: (open: boolean) => void
}) {
  const update = useUpdateGroupSettings({
    successMessage: "Group settings updated",
  })
  // Keep the last one on screen while the sheet animates closed
  const [shown, setShown] = React.useState<GroupPermission>(
    permission ?? "editInfo"
  )
  if (permission && permission !== shown) setShown(permission)
  const meta = PERMISSIONS[shown]
  const current = groupSettings(group)[shown]

  const choose = (value: "all" | "admins") => {
    if (value === current) return onOpenChange(false)
    update.mutate(
      { groupId: group.id, settings: { [shown]: value } },
      { onSuccess: () => onOpenChange(false) }
    )
  }

  return (
    <BottomSheet
      open={!!permission}
      onOpenChange={onOpenChange}
      title={meta.title}
      description={meta.description}
    >
      <RadioGroup
        value={update.isPending ? update.variables?.settings[shown] : current}
        onValueChange={(v) => choose(v as "all" | "admins")}
        disabled={update.isPending}
        className="gap-2 pb-4"
      >
        {(["all", "admins"] as const).map((value) => (
          <FieldLabel
            key={value}
            htmlFor={`perm-${shown}-${value}`}
            className="rounded-lg"
          >
            <Field orientation="horizontal" className="items-center gap-3 p-3">
              <FieldContent className="min-w-0">
                <FieldTitle className="text-sm font-semibold">
                  {permissionLabel(value)}
                </FieldTitle>
                <FieldDescription className="text-xs">
                  {meta[value]}
                </FieldDescription>
              </FieldContent>
              {update.isPending &&
              update.variables?.settings[shown] === value ? (
                <Spinner className="size-4.5 shrink-0" />
              ) : (
                <RadioGroupItem id={`perm-${shown}-${value}`} value={value} />
              )}
            </Field>
          </FieldLabel>
        ))}
      </RadioGroup>
    </BottomSheet>
  )
}
