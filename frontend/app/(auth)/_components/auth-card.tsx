"use client"

import * as React from "react"
import { ArrowLeft01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

/** Blank full-screen fallback while `useSearchParams` suspends. */
export function AuthFallback() {
  return <div className="min-h-svh bg-background" />
}

interface AuthLayoutProps {
  children: React.ReactNode
  /** Back button handler; omit to hide the back button. */
  onBack?: () => void
  /** Content on the left of the top bar when there is no back button (e.g. step counter). */
  topLeft?: React.ReactNode
  /** Content on the right of the top bar (e.g. "Skip"). */
  topRight?: React.ReactNode
  /** Small text rendered under the card (e.g. "Already have an account? Login"). */
  footer?: React.ReactNode
  /** Render children without the surrounding Card. */
  bare?: boolean
  className?: string
}

/** Full-screen centred shell shared by every auth route. */
export function AuthLayout({ children, onBack, topLeft, topRight, footer, bare = false, className }: AuthLayoutProps) {
  return (
    <div className="flex min-h-svh flex-col bg-background">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 p-4 sm:p-6">
        <div className="flex min-h-9 items-center justify-between">
          {onBack ? (
            <Button variant="ghost" size="icon" className="-ml-2" onClick={onBack} aria-label="Back">
              <HugeiconsIcon icon={ArrowLeft01Icon} />
            </Button>
          ) : (
            (topLeft ?? <span />)
          )}
          {topRight}
        </div>

        <div className="my-auto flex flex-col gap-4 py-2">
          {bare ? (
            children
          ) : (
            <Card>
              <CardContent className={cn("flex flex-col gap-6 py-2", className)}>{children}</CardContent>
            </Card>
          )}
        </div>

        {footer ? <div className="pt-2 pb-1 text-center text-xs text-muted-foreground">{footer}</div> : null}
      </div>
    </div>
  )
}

/** Page heading with optional highlighted (primary-coloured) second line. */
export function AuthHeading({
  title,
  highlight,
  description,
  centered = false,
  breakLine = true,
  size = "default",
  className,
}: {
  title: React.ReactNode
  highlight?: React.ReactNode
  description?: React.ReactNode
  centered?: boolean
  breakLine?: boolean
  size?: "default" | "lg"
  className?: string
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", centered && "items-center text-center", className)}>
      <h1 className={cn("font-semibold tracking-tight", size === "lg" ? "text-2xl sm:text-3xl" : "text-xl sm:text-2xl")}>
        {title}
        {highlight ? (
          <>
            {breakLine ? <br /> : " "}
            <span className="text-muted-foreground">{highlight}</span>
          </>
        ) : null}
      </h1>
      {description ? (
        <p className={cn("text-sm text-muted-foreground", size === "lg" ? "mt-1 leading-relaxed" : "max-w-xs")}>
          {description}
        </p>
      ) : null}
    </div>
  )
}

const ICON_TONES = {
  primary: "text-foreground",
  success: "text-success",
} as const

/** Quiet bordered icon tile used at the top of status screens. */
export function AuthStatusIcon({
  icon,
  tone = "primary",
  className,
}: {
  icon: IconSvgElement
  tone?: keyof typeof ICON_TONES
  className?: string
}) {
  return (
    <div className={cn("mx-auto flex size-12 items-center justify-center rounded-md border", ICON_TONES[tone], className)}>
      <HugeiconsIcon icon={icon} className="size-6" />
    </div>
  )
}
