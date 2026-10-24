"use client"

import Image from "next/image"

import { Item, ItemActions, ItemContent, ItemMedia, ItemTitle } from "@/components/ui/item"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { SUPPORTED_UPI_APPS } from "@/lib/upi"

/** "Open with" picker listing the supported UPI apps with their official logos. */
export function UpiAppSheet({
  open,
  onOpenChange,
  onSelect,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (appId: string) => void
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-lg">
        <div className="mx-auto flex w-full max-w-md flex-col pb-4">
          <SheetHeader>
            <SheetTitle>Open with</SheetTitle>
            <SheetDescription>Choose your preferred UPI app to make the payment</SheetDescription>
          </SheetHeader>
          <div className="mx-4 flex flex-col divide-y overflow-hidden rounded-lg border">
            {SUPPORTED_UPI_APPS.map((app) => (
              <Item
                key={app.id}
                render={<button type="button" onClick={() => onSelect(app.id)} />}
                className="cursor-pointer rounded-none px-3 text-left hover:bg-muted/60"
              >
                <ItemMedia>
                  <Image
                    src={app.logoPath}
                    alt={`${app.name} logo`}
                    width={40}
                    height={40}
                    className="size-9 rounded-md border bg-white object-contain"
                  />
                </ItemMedia>
                <ItemContent>
                  <ItemTitle className="font-medium">{app.name}</ItemTitle>
                </ItemContent>
                <ItemActions>
                  <span className="text-xs text-muted-foreground">{app.badge}</span>
                </ItemActions>
              </Item>
            ))}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
