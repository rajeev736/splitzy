"use client"

import { Badge } from "@/components/ui/badge"
import { Item, ItemActions, ItemContent, ItemMedia, ItemTitle } from "@/components/ui/item"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { SUPPORTED_UPI_APPS } from "@/lib/upi"
import { cn } from "@/lib/utils"

/** "Open with" picker listing the supported UPI apps (keeps their brand colours). */
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
      <SheetContent side="bottom" className="rounded-t-3xl">
        <div className="mx-auto flex w-full max-w-md flex-col pb-4">
          <SheetHeader>
            <SheetTitle>Open with</SheetTitle>
            <SheetDescription>Choose your preferred UPI app to make the payment</SheetDescription>
          </SheetHeader>
          <div className="flex flex-col gap-2 px-4">
            {SUPPORTED_UPI_APPS.map((app) => (
              <Item
                key={app.id}
                variant="outline"
                render={<button type="button" onClick={() => onSelect(app.id)} />}
                className="cursor-pointer rounded-2xl bg-muted/50 text-left hover:border-primary/40 hover:bg-secondary active:scale-[0.99]"
              >
                <ItemMedia>
                  <div
                    className={cn(
                      "flex size-9 items-center justify-center rounded-xl text-xs font-bold shadow-xs",
                      app.iconBg
                    )}
                  >
                    {app.name.charAt(0)}
                  </div>
                </ItemMedia>
                <ItemContent>
                  <ItemTitle className="font-bold">{app.name}</ItemTitle>
                </ItemContent>
                <ItemActions>
                  <Badge variant="outline" className="bg-card text-[10px] font-semibold text-muted-foreground">
                    {app.badge}
                  </Badge>
                </ItemActions>
              </Item>
            ))}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
