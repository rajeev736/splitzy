"use client"

import * as React from "react"
import { toast } from "sonner"

import { GROUP_ICONS, GroupIcon } from "@/components/shared/group-icon"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { useUpdateGroup } from "@/hooks/mutations"
import type { Group } from "@/lib/types"
import { cn } from "@/lib/utils"

export function EditGroupDialog({
  group,
  open,
  onOpenChange,
}: {
  group: Group
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Group</DialogTitle>
        </DialogHeader>
        {/* Mounted only while open, so the form re-seeds from the latest group each time. */}
        <EditGroupForm group={group} onDone={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  )
}

function EditGroupForm({ group, onDone }: { group: Group; onDone: () => void }) {
  const [name, setName] = React.useState(group.name)
  const [description, setDescription] = React.useState(group.description || "")
  const [icon, setIcon] = React.useState(group.icon)
  const update = useUpdateGroup({
    successMessage: "Group updated successfully!",
    errorMessage: "Failed to update group",
  })

  const handleSave = () => {
    if (!name.trim()) {
      toast.error("Group name is required")
      return
    }
    update.mutate(
      { groupId: group.id, updates: { name: name.trim(), description: description.trim(), icon } },
      { onSuccess: onDone }
    )
  }

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault()
        handleSave()
      }}
    >
      <FieldGroup className="gap-4">
        <Field>
          <FieldLabel htmlFor="edit-group-name">
            Group Name <span className="text-destructive">*</span>
          </FieldLabel>
          <Input
            id="edit-group-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Goa Trip, Flat 402"
            aria-required
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="edit-group-desc">Description (Optional)</FieldLabel>
          <Input
            id="edit-group-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. Goa trip with college gang"
          />
        </Field>

        <Field>
          <FieldLabel>Group icon</FieldLabel>
          <div className="grid grid-cols-4 gap-2">
            {GROUP_ICONS.map((ic) => {
              const selected = icon === ic.id
              return (
                <button
                  key={ic.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setIcon(ic.id)}
                  className={cn(
                    "flex flex-col items-center gap-1.5 rounded-md border bg-card p-2 transition-colors hover:bg-muted",
                    selected && "border-primary"
                  )}
                >
                  <GroupIcon src={ic.id} alt={ic.label} size="md" />
                  <span className="text-[11px] font-medium">{ic.label}</span>
                </button>
              )
            })}
          </div>
        </Field>
      </FieldGroup>

      <DialogFooter>
        <Button type="button" variant="secondary" className="sm:flex-1" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" className="sm:flex-1" disabled={update.isPending}>
          {update.isPending && <Spinner />}
          Save Changes
        </Button>
      </DialogFooter>
    </form>
  )
}
