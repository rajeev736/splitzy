"use client"

import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react"

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"

export interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: React.ReactNode
  confirmLabel?: string
  cancelLabel?: string
  destructive?: boolean
  icon?: IconSvgElement
  /** While true the dialog can't be dismissed and the confirm button spins. */
  isPending?: boolean
  /** Greys out the confirm button (e.g. when a business rule blocks the action). */
  confirmDisabled?: boolean
  onConfirm: () => void
  children?: React.ReactNode
}

/**
 * Single confirmation pattern for every destructive/irreversible action
 * (logout, delete expense, leave group, remove friend…).
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive = false,
  icon,
  isPending = false,
  confirmDisabled = false,
  onConfirm,
  children,
}: ConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={(next) => !isPending && onOpenChange(next)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          {icon && (
            <AlertDialogMedia className={destructive ? "bg-destructive/10 text-destructive" : "bg-secondary text-primary"}>
              <HugeiconsIcon icon={icon} />
            </AlertDialogMedia>
          )}
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description && <AlertDialogDescription>{description}</AlertDialogDescription>}
        </AlertDialogHeader>
        {children}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>{cancelLabel}</AlertDialogCancel>
          <Button variant={destructive ? "destructive" : "default"} disabled={isPending || confirmDisabled} onClick={onConfirm}>
            {isPending && <Spinner />}
            {confirmLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
