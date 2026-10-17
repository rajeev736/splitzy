"use client"

import * as React from "react"
import { ViewIcon, ViewOffIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react"

import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group"

interface AuthInputProps extends Omit<React.ComponentProps<"input">, "id"> {
  id: string
  label: React.ReactNode
  icon: IconSvgElement
  description?: React.ReactNode
  /** Trailing addon (e.g. password visibility toggle). */
  endAddon?: React.ReactNode
}

/** Labelled input with a leading icon — the standard auth form field. */
export function AuthInput({ id, label, icon, description, endAddon, ...inputProps }: AuthInputProps) {
  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <InputGroup className="h-10">
        <InputGroupAddon>
          <HugeiconsIcon icon={icon} />
        </InputGroupAddon>
        <InputGroupInput id={id} {...inputProps} />
        {endAddon ? <InputGroupAddon align="inline-end">{endAddon}</InputGroupAddon> : null}
      </InputGroup>
      {description ? <FieldDescription className="text-xs">{description}</FieldDescription> : null}
    </Field>
  )
}

/** Eye / eye-off toggle for password fields. */
export function PasswordToggle({ visible, onToggle }: { visible: boolean; onToggle: () => void }) {
  return (
    <InputGroupButton
      size="icon-xs"
      onClick={onToggle}
      aria-label={visible ? "Hide password" : "Show password"}
    >
      <HugeiconsIcon icon={visible ? ViewOffIcon : ViewIcon} />
    </InputGroupButton>
  )
}
