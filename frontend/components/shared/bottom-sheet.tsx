"use client"

import * as React from "react"

import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { cn } from "@/lib/utils"

/** Consistent bottom sheet for every picker on the add-expense screen. */
export function BottomSheet({
  open,
  onOpenChange,
  title,
  description,
  header,
  footer,
  children,
  bodyClassName,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: React.ReactNode
  /** Rendered under the title, outside the scroll area (tabs, totals…). */
  header?: React.ReactNode
  footer?: React.ReactNode
  children: React.ReactNode
  bodyClassName?: string
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="mx-auto flex max-h-[85svh] w-full max-w-xl flex-col gap-0 rounded-t-lg">
        <SheetHeader className="gap-1 pb-3">
          <SheetTitle className="text-base font-semibold">{title}</SheetTitle>
          {description && <SheetDescription className="text-xs">{description}</SheetDescription>}
          {header && <div className="pt-2">{header}</div>}
        </SheetHeader>
        {/* Vertical scroll only — rows truncate rather than overflow sideways */}
        <div className={cn("min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-4 pb-2", bodyClassName)}>
          {children}
        </div>
        {footer && <SheetFooter className="border-t">{footer}</SheetFooter>}
      </SheetContent>
    </Sheet>
  )
}
