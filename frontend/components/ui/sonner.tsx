"use client"

import * as React from "react"
import { useTheme } from "next-themes"
import { Toaster as Sonner, useSonner, type ToasterProps } from "sonner"
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react"
import {
  Alert02Icon,
  Cancel01Icon,
  CheckmarkCircle02Icon,
  ExclamationMarkIcon,
  InformationCircleIcon,
  Loading03Icon,
  MultiplicationSignCircleIcon,
  Tick02Icon,
} from "@hugeicons/core-free-icons"

import { useGamesSide } from "@/components/game-ui/games-side"

/**
 * App toasts, one Toaster for the whole app in two looks:
 *
 * - Split: one calm card in the theme's colours (light or dark), with only
 *   the icon tinted by kind — no bright green / red slabs.
 * - Games: while a games screen is up (game-ui/games-side), the same toasts
 *   come as the game's cream card in the blue frame, a glossy badge for the
 *   kind and chunky buttons (styles: .gu-toaster in game-ui/game-ui.css). So
 *   every `toast()` on the Games side is in its look, with no change at the call.
 *
 * A toast keeps the look it opened with: one shown in a game and still up
 * after you leave it (or the other way round) doesn't switch mid-way. The
 * close cross sits on the right (see globals.css); swipe left, right or up
 * to dismiss.
 */

type ToastId = string | number

const SPLIT_ICONS: ToasterProps["icons"] = {
  success: <HugeiconsIcon icon={CheckmarkCircle02Icon} strokeWidth={2} className="size-[18px] text-success" />,
  info: <HugeiconsIcon icon={InformationCircleIcon} strokeWidth={2} className="size-[18px] text-primary" />,
  warning: <HugeiconsIcon icon={Alert02Icon} strokeWidth={2} className="size-[18px] text-warning" />,
  error: <HugeiconsIcon icon={MultiplicationSignCircleIcon} strokeWidth={2} className="size-[18px] text-destructive" />,
  loading: <HugeiconsIcon icon={Loading03Icon} strokeWidth={2} className="size-[18px] animate-spin text-muted-foreground" />,
}

const SPLIT_CLASSNAMES: NonNullable<ToasterProps["toastOptions"]>["classNames"] = {
  toast:
    "cn-toast gap-3! border! border-card-stroke! bg-popover! px-4! py-3! text-popover-foreground! shadow-[var(--elevation-28)]!",
  title: "text-sm! font-semibold! leading-snug!",
  description: "text-xs! leading-relaxed! text-muted-foreground!",
  icon: "mt-0.5! self-start",
  actionButton: "h-7! rounded-md! bg-primary! px-2.5! text-xs! font-semibold! text-primary-foreground!",
  cancelButton: "h-7! rounded-md! bg-muted! px-2.5! text-xs! font-medium! text-foreground!",
  closeButton: "border-border! bg-popover! text-muted-foreground! hover:bg-muted! hover:text-foreground!",
}

const SPLIT_STYLE = {
  "--normal-bg": "var(--popover)",
  "--normal-text": "var(--popover-foreground)",
  "--normal-border": "var(--border)",
  "--border-radius": "var(--radius)",
} as React.CSSProperties

/** A glossy round gem with a white glyph (an icon, or a letter in the game font), in the kind's colour. */
function GameBadge({ tone, icon, glyph, spin }: { tone: string; icon?: IconSvgElement; glyph?: string; spin?: boolean }) {
  return (
    <span className={`gu-toast-badge gu-toast-${tone}`} aria-hidden>
      {icon ? <HugeiconsIcon icon={icon} strokeWidth={3} className={spin ? "animate-spin" : undefined} /> : glyph}
    </span>
  )
}

const GAME_ICONS: ToasterProps["icons"] = {
  success: <GameBadge tone="green" icon={Tick02Icon} />,
  info: <GameBadge tone="blue" glyph="i" />,
  warning: <GameBadge tone="yellow" icon={ExclamationMarkIcon} />,
  error: <GameBadge tone="red" icon={Cancel01Icon} />,
  loading: <GameBadge tone="blue" icon={Loading03Icon} spin />,
}

const GAME_CLASSNAMES: NonNullable<ToasterProps["toastOptions"]>["classNames"] = {
  toast: "gu-toast",
  title: "gu-toast-title",
  description: "gu-toast-desc",
  icon: "gu-toast-icon",
  actionButton: "gu-toast-action",
  cancelButton: "gu-toast-cancel",
  closeButton: "gu-toast-close",
}

/**
 * Clear of the notch / status bar (the app draws under it, viewportFit
 * "cover"), so a toast never hides behind it or a game's top bar edge.
 */
const OFFSET = { top: "calc(env(safe-area-inset-top, 0px) + 24px)" }
const MOBILE_OFFSET = { top: "calc(env(safe-area-inset-top, 0px) + 16px)" }

/**
 * Which look the toasts take: the one the newest toast opened with, or —
 * with none up — whether a games screen is showing.
 */
function useGameLook(): boolean {
  const onGames = useGamesSide()
  const { toasts } = useSonner()
  // The look each toast on screen opened with
  const [looks, setLooks] = React.useState<ReadonlyMap<ToastId, boolean>>(() => new Map())
  const ids = new Set(toasts.map((t) => t.id))
  if (ids.size !== looks.size || [...ids].some((id) => !looks.has(id))) {
    setLooks(new Map([...ids].map((id) => [id, looks.get(id) ?? onGames])))
  }
  // useSonner lists the newest first
  const newest = toasts[0]
  return newest ? (looks.get(newest.id) ?? onGames) : onGames
}

const Toaster = ({ ...props }: ToasterProps) => {
  const { resolvedTheme } = useTheme()
  const game = useGameLook()

  return (
    <Sonner
      // The game's cream look is light whatever the device theme
      theme={game ? "light" : ((resolvedTheme as ToasterProps["theme"]) ?? "system")}
      className={game ? "toaster group gu-toaster" : "toaster group"}
      icons={game ? GAME_ICONS : SPLIT_ICONS}
      style={game ? undefined : SPLIT_STYLE}
      offset={OFFSET}
      mobileOffset={MOBILE_OFFSET}
      toastOptions={{ classNames: game ? GAME_CLASSNAMES : SPLIT_CLASSNAMES }}
      {...props}
    />
  )
}

export { Toaster }
