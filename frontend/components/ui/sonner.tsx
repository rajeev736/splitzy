"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Alert02Icon,
  CheckmarkCircle02Icon,
  InformationCircleIcon,
  Loading03Icon,
  MultiplicationSignCircleIcon,
} from "@hugeicons/core-free-icons"

/**
 * App toasts: one calm card in the theme's colours (light or dark), with only
 * the icon tinted by kind — no bright green / red slabs.
 */
const Toaster = ({ ...props }: ToasterProps) => {
  const { resolvedTheme } = useTheme()

  return (
    <Sonner
      theme={(resolvedTheme as ToasterProps["theme"]) ?? "system"}
      className="toaster group"
      icons={{
        success: <HugeiconsIcon icon={CheckmarkCircle02Icon} strokeWidth={2} className="size-[18px] text-success" />,
        info: <HugeiconsIcon icon={InformationCircleIcon} strokeWidth={2} className="size-[18px] text-primary" />,
        warning: <HugeiconsIcon icon={Alert02Icon} strokeWidth={2} className="size-[18px] text-warning" />,
        error: <HugeiconsIcon icon={MultiplicationSignCircleIcon} strokeWidth={2} className="size-[18px] text-destructive" />,
        loading: <HugeiconsIcon icon={Loading03Icon} strokeWidth={2} className="size-[18px] animate-spin text-muted-foreground" />,
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "calc(var(--radius) * 1.4)",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast:
            "cn-toast gap-3! border! border-border! bg-popover! px-4! py-3! text-popover-foreground! shadow-[0_8px_30px_-8px_rgb(0_0_0/0.18)]! dark:shadow-[0_8px_30px_-8px_rgb(0_0_0/0.6)]!",
          title: "text-sm! font-medium! leading-snug!",
          description: "text-xs! leading-relaxed! text-muted-foreground!",
          icon: "mt-0.5! self-start",
          actionButton: "h-7! rounded-md! bg-primary! px-2.5! text-xs! font-medium! text-primary-foreground!",
          cancelButton: "h-7! rounded-md! bg-muted! px-2.5! text-xs! font-medium! text-foreground!",
          closeButton:
            "border-border! bg-popover! text-muted-foreground! hover:bg-muted! hover:text-foreground!",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
