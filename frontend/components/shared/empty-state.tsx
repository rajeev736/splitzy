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
            <div className="relative size-40 overflow-hidden rounded-3xl shadow-sm">
              <Image src={imageSrc} alt={title} fill className="object-cover" />
            </div>
          </EmptyMedia>
        ) : icon ? (
          <EmptyMedia
            className={cn(
              "size-16 rounded-full",
              tone === "error" ? "bg-destructive/10 text-destructive" : "bg-secondary text-primary"
            )}
          >
            <HugeiconsIcon icon={icon} className="size-8" />
          </EmptyMedia>
        ) : null}
        <EmptyTitle className="text-lg font-bold">{title}</EmptyTitle>
        {description ? <EmptyDescription>{description}</EmptyDescription> : null}
      </EmptyHeader>
      {(action || secondaryAction) && (
        <EmptyContent>
          {action && (
            <Button className="w-full" size="lg" onClick={action.onClick}>
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button className="w-full" size="lg" variant="outline" onClick={secondaryAction.onClick}>
              {secondaryAction.label}
            </Button>
          )}
        </EmptyContent>
      )}
    </Empty>
  )
}
