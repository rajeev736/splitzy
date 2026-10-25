"use client"

import * as React from "react"
import { Dialog as SheetPrimitive } from "@base-ui/react/dialog"
import { cn } from "cn"

import { Button } from "@/components/ui/button"
import { HugeiconsIcon } from "@hugeicons/react"
import { Cancel01Icon } from "@hugeicons/core-free-icons"

import { useModalRoot } from "@/hooks/use-back-to-close"

const SheetCloseContext = React.createContext<() => void>(() => {})

/**
 * Bottom sheets close when dragged down with a finger. The drag starts only
 * when nothing inside is scrolled, so swiping first scrolls the content back up.
 */
function useSwipeDownToClose(enabled: boolean) {
  const close = React.useContext(SheetCloseContext)
  // The latest close, read at gesture end, so the listeners don't re-attach every render
  const closeRef = React.useRef(close)
  React.useEffect(() => {
    closeRef.current = close
  })
  return React.useCallback(
    (el: HTMLDivElement | null) => {
      if (!el || !enabled) return
      let drag: { startY: number; startT: number; dy: number; active: boolean } | null = null

      const onStart = (e: TouchEvent) => {
        const target = e.target as HTMLElement
        if (e.touches.length !== 1 || target.closest("input[type=range], [data-no-swipe]")) return
        for (let node: HTMLElement | null = target; node && node !== el; node = node.parentElement) {
          if (node.scrollTop > 0) return
        }
        drag = { startY: e.touches[0].clientY, startT: Date.now(), dy: 0, active: false }
      }
      const onMove = (e: TouchEvent) => {
        if (!drag) return
        const dy = e.touches[0].clientY - drag.startY
        if (!drag.active) {
          if (dy < -6) drag = null // scrolling up: leave it to the content
          if (!drag || dy < 6) return
          drag.active = true
          el.style.transition = "none"
        }
        e.preventDefault() // no page scroll / pull-to-refresh while dragging
        drag.dy = Math.max(0, dy)
        el.style.transform = `translateY(${drag.dy}px)`
      }
      const onEnd = () => {
        const d = drag
        drag = null
        if (!d?.active) return
        const speed = d.dy / Math.max(1, Date.now() - d.startT)
        el.style.transition = "transform 200ms ease-out"
        if (d.dy > Math.min(140, el.offsetHeight * 0.3) || speed > 0.6) {
          el.style.transform = "translateY(100%)"
          closeRef.current()
        } else {
          el.style.transform = ""
        }
      }

      el.addEventListener("touchstart", onStart, { passive: true })
      el.addEventListener("touchmove", onMove, { passive: false })
      el.addEventListener("touchend", onEnd)
      el.addEventListener("touchcancel", onEnd)
      return () => {
        el.removeEventListener("touchstart", onStart)
        el.removeEventListener("touchmove", onMove)
        el.removeEventListener("touchend", onEnd)
        el.removeEventListener("touchcancel", onEnd)
      }
    },
    [enabled]
  )
}

/** Phone back closes the sheet instead of leaving the page. */
function Sheet(props: SheetPrimitive.Root.Props) {
  const { rootProps, close } = useModalRoot(props)
  return (
    <SheetCloseContext.Provider value={close}>
      <SheetPrimitive.Root data-slot="sheet" {...rootProps} />
    </SheetCloseContext.Provider>
  )
}

function SheetTrigger({ ...props }: SheetPrimitive.Trigger.Props) {
  return <SheetPrimitive.Trigger data-slot="sheet-trigger" {...props} />
}

function SheetClose({ ...props }: SheetPrimitive.Close.Props) {
  return <SheetPrimitive.Close data-slot="sheet-close" {...props} />
}

function SheetPortal({ ...props }: SheetPrimitive.Portal.Props) {
  return <SheetPrimitive.Portal data-slot="sheet-portal" {...props} />
}

function SheetOverlay({ className, ...props }: SheetPrimitive.Backdrop.Props) {
  return (
    <SheetPrimitive.Backdrop
      data-slot="sheet-overlay"
      className={cn(
        "fixed inset-0 z-50 bg-black/10 transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0 supports-backdrop-filter:backdrop-blur-xs",
        className
      )}
      {...props}
    />
  )
}

function SheetContent({
  className,
  children,
  side = "right",
  showCloseButton = true,
  ...props
}: SheetPrimitive.Popup.Props & {
  side?: "top" | "right" | "bottom" | "left"
  showCloseButton?: boolean
}) {
  const swipeRef = useSwipeDownToClose(side === "bottom")
  return (
    <SheetPortal>
      <SheetOverlay />
      <SheetPrimitive.Popup
        ref={swipeRef}
        data-slot="sheet-content"
        data-side={side}
        className={cn(
          "fixed z-50 flex flex-col gap-4 bg-popover bg-clip-padding text-sm text-popover-foreground shadow-lg transition duration-200 ease-in-out data-ending-style:opacity-0 data-starting-style:opacity-0 data-[side=bottom]:inset-x-0 data-[side=bottom]:bottom-0 data-[side=bottom]:h-auto data-[side=bottom]:border-t data-[side=bottom]:data-ending-style:translate-y-[2.5rem] data-[side=bottom]:data-starting-style:translate-y-[2.5rem] data-[side=left]:inset-y-0 data-[side=left]:left-0 data-[side=left]:h-full data-[side=left]:w-3/4 data-[side=left]:border-r data-[side=left]:data-ending-style:translate-x-[-2.5rem] data-[side=left]:data-starting-style:translate-x-[-2.5rem] data-[side=right]:inset-y-0 data-[side=right]:right-0 data-[side=right]:h-full data-[side=right]:w-3/4 data-[side=right]:border-l data-[side=right]:data-ending-style:translate-x-[2.5rem] data-[side=right]:data-starting-style:translate-x-[2.5rem] data-[side=top]:inset-x-0 data-[side=top]:top-0 data-[side=top]:h-auto data-[side=top]:border-b data-[side=top]:data-ending-style:translate-y-[-2.5rem] data-[side=top]:data-starting-style:translate-y-[-2.5rem] data-[side=left]:sm:max-w-sm data-[side=right]:sm:max-w-sm",
          className
        )}
        {...props}
      >
        {children}
        {showCloseButton && (
          <SheetPrimitive.Close
            data-slot="sheet-close"
            render={
              <Button
                variant="ghost"
                className="absolute top-3 right-3"
                size="icon-sm"
              />
            }
          >
            <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} />
            <span className="sr-only">Close</span>
          </SheetPrimitive.Close>
        )}
      </SheetPrimitive.Popup>
    </SheetPortal>
  )
}

function SheetHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-header"
      className={cn("flex flex-col gap-0.5 p-4", className)}
      {...props}
    />
  )
}

function SheetFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-footer"
      className={cn("mt-auto flex flex-col gap-2 p-4", className)}
      {...props}
    />
  )
}

function SheetTitle({ className, ...props }: SheetPrimitive.Title.Props) {
  return (
    <SheetPrimitive.Title
      data-slot="sheet-title"
      className={cn(
        "font-heading text-base font-medium text-foreground",
        className
      )}
      {...props}
    />
  )
}

function SheetDescription({
  className,
  ...props
}: SheetPrimitive.Description.Props) {
  return (
    <SheetPrimitive.Description
      data-slot="sheet-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
}
