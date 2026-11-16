"use client"

import * as React from "react"
import { toast } from "sonner"
import { Camera01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { BottomSheet } from "@/components/shared/bottom-sheet"
import { GroupIcon } from "@/components/shared/group-icon"
import { GroupIconPicker } from "@/components/shared/group-icon-picker"
import { Button } from "@/components/ui/button"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import { useUpdateGroupInfo } from "@/hooks/mutations"
import { GROUP_DESCRIPTION_MAX, GROUP_NAME_MAX } from "@/lib/groups"
import type { Group } from "@/lib/types"

const FORM_ID = "edit-group-info"

/** Name, icon and description in one sheet. Only offered to people the group lets edit its info. */
export function EditGroupSheet({
  group,
  open,
  onOpenChange,
  focus = "name",
}: {
  group: Group
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Which field gets the cursor when the sheet opens. */
  focus?: "name" | "description"
}) {
  const update = useUpdateGroupInfo()

  return (
    <BottomSheet
      open={open}
      onOpenChange={(next) => !update.isPending && onOpenChange(next)}
      title="Edit group info"
      footer={
        <Button
          type="submit"
          form={FORM_ID}
          size="lg"
          className="h-11 w-full"
          disabled={update.isPending}
        >
          {update.isPending && <Spinner />}
          Save
        </Button>
      }
    >
      {/* The sheet's body unmounts when closed, so the form re-seeds from the latest group each time. */}
      <EditGroupForm
        group={group}
        focus={focus}
        update={update}
        onDone={() => onOpenChange(false)}
      />
    </BottomSheet>
  )
}

function EditGroupForm({
  group,
  focus,
  update,
  onDone,
}: {
  group: Group
  focus: "name" | "description"
  update: ReturnType<typeof useUpdateGroupInfo>
  onDone: () => void
}) {
  const [name, setName] = React.useState(group.name)
  const [description, setDescription] = React.useState(group.description || "")
  const [icon, setIcon] = React.useState(group.icon)
  const [pickerOpen, setPickerOpen] = React.useState(false)

  const handleSave = () => {
    if (!name.trim()) {
      toast.error("Group name is required")
      return
    }
    update.mutate(
      { groupId: group.id, changes: { name, description, icon } },
      {
        onSuccess: (changes) => {
          if (Object.keys(changes).length > 0)
            toast.success("Group info updated")
          onDone()
        },
      }
    )
  }

  return (
    <form
      id={FORM_ID}
      className="flex flex-col gap-5 pb-4"
      onSubmit={(e) => {
        e.preventDefault()
        handleSave()
      }}
    >
      <div className="flex flex-col items-center gap-2 pt-1">
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          className="group relative rounded-2xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          aria-label="Change group icon"
        >
          <GroupIcon
            src={icon}
            alt={name || "Group icon"}
            className="size-24 rounded-2xl"
          />
          <span className="absolute -right-1.5 -bottom-1.5 flex size-8 items-center justify-center rounded-full border-2 border-background bg-primary text-primary-foreground shadow-sm transition-transform group-active:scale-95">
            <HugeiconsIcon icon={Camera01Icon} className="size-4" />
          </span>
        </button>
        <Button
          type="button"
          variant="link"
          size="sm"
          className="h-7"
          onClick={() => setPickerOpen(true)}
        >
          Change icon
        </Button>
      </div>

      <FieldGroup className="gap-4">
        <Field>
          <div className="flex items-baseline justify-between gap-2">
            <FieldLabel htmlFor="edit-group-name">Group name</FieldLabel>
            <span className="text-[11px] text-muted-foreground tabular-nums">
              {name.length}/{GROUP_NAME_MAX}
            </span>
          </div>
          <Input
            id="edit-group-name"
            value={name}
            maxLength={GROUP_NAME_MAX}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Goa Trip, Flat 402"
            className="h-10"
            aria-required
          />
        </Field>

        <Field>
          <div className="flex items-baseline justify-between gap-2">
            <FieldLabel htmlFor="edit-group-desc">Description</FieldLabel>
            <span className="text-[11px] text-muted-foreground tabular-nums">
              {description.length}/{GROUP_DESCRIPTION_MAX}
            </span>
          </div>
          <Textarea
            id="edit-group-desc"
            value={description}
            maxLength={GROUP_DESCRIPTION_MAX}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What's this group for? e.g. Goa trip with the college gang"
            autoFocus={focus === "description"}
            className="max-h-40 min-h-20"
          />
        </Field>
      </FieldGroup>

      <GroupIconPicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        value={icon}
        onSelect={setIcon}
      />
    </form>
  )
}
