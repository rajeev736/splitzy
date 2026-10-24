import Image from "next/image"
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react"

import { Button } from "@/components/ui/button"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { cn } from "@/lib/utils"

interface Action {
  label: string
  onClick: () => void
}

export interface EmptyStateProps {
  title: string
  description?: React.ReactNode
  icon?: IconSvgElement
  imageSrc?: string
  action?: Action
  secondaryAction?: Action
  tone?: "default" | "error"
  className?: string
}

export function EmptyState({
  title,
  description,
  icon,
  imageSrc,
  action,
  secondaryAction,
  tone = "default",
  className,
}: EmptyStateProps) {
  return (
    <Empty className={cn("animate-in py-10 duration-300 fade-in", className)}>
      <EmptyHeader>
        {imageSrc ? (
          <EmptyMedia>
            <div className="relative size-40 overflow-hidden rounded-lg">
              <Image src={imageSrc} alt={title} fill className="object-cover" />
            </div>
          </EmptyMedia>
        ) : icon ? (
          <EmptyMedia
            className={cn(
              "size-11 rounded-lg",
              tone === "error" ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"
            )}
          >
            <HugeiconsIcon icon={icon} className="size-5" />
          </EmptyMedia>
        ) : null}
        <EmptyTitle className="text-base font-semibold">{title}</EmptyTitle>
        {description ? <EmptyDescription>{description}</EmptyDescription> : null}
      </EmptyHeader>
      {(action || secondaryAction) && (
        <EmptyContent>
          {action && (
            <Button className="w-full" onClick={action.onClick}>
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button className="w-full" variant="outline" onClick={secondaryAction.onClick}>
              {secondaryAction.label}
            </Button>
          )}
        </EmptyContent>
      )}
    </Empty>
  )
}
