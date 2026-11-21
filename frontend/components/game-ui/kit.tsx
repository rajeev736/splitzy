"use client"

import * as React from "react"
import { ArrowLeft01Icon, Cancel01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react"

import { cn } from "@/lib/utils"
import { GamePullRefresh } from "./game-pull-refresh"
import { useMarkGamesSide } from "./games-side"

/**
 * The Games side's building blocks (styles in ./game-ui.css). Every screen
 * under Games is built from these, so the whole side reads as one game: a sky
 * backdrop, cream panels in a blue frame, chunky buttons — never a plain form.
 */

export type GameTone = "blue" | "green" | "orange" | "red" | "yellow" | "purple" | "cream"

const toneClass = (tone: GameTone) => (tone === "blue" ? "" : `gu-${tone}`)

/** A full-screen games page: the sky behind, the game font, safe-area padding. */
export function GameScreen({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) {
  // While it's up, app-wide bits (toasts, reward notices) take the game's look
  useMarkGamesSide()
  return (
    <div className={cn("gu relative isolate flex min-h-svh w-full flex-col bg-[#6aa9f2]", className)} {...props}>
      {/* The sky is pinned to the screen, not stretched over the page: it doesn't
          shift as content loads or the page changes length, and scrolling never repaints it */}
      <div aria-hidden className="gu-sky pointer-events-none fixed inset-0 -z-10" />
      {/* Pull down at the top to refresh, the game's way (not in live rooms) */}
      <GamePullRefresh />
      {children}
    </div>
  )
}

/**
 * The bar along the top of a games screen: a round back button, the title on
 * a ribbon (or anything in `center`), and actions on the right. It stays on
 * top while the page scrolls, on a full-width band of the sky's own blue (the
 * colour at the top of the screen, so it reads as sky) — nothing scrolls
 * through behind the title. `bare`: no band (a game drawn edge to edge
 * brings its own shade).
 */
export function GameTopBar({
  title,
  subtitle,
  onBack,
  backIcon = "back",
  center,
  right,
  className,
  bare = false,
}: {
  bare?: boolean
  title?: React.ReactNode
  subtitle?: React.ReactNode
  onBack?: () => void
  /** "close": a red ✕ instead of the arrow (dialog-like screens). */
  backIcon?: "back" | "close"
  center?: React.ReactNode
  right?: React.ReactNode
  className?: string
}) {
  return (
    <header
      className={cn(
        "sticky top-0 z-30 flex items-center gap-2 px-3 pt-[calc(0.6rem+env(safe-area-inset-top,0px))] pb-2",
        !bare && "bg-[#3f95ee] shadow-[0_10px_18px_-12px_rgba(20,40,110,.6)]",
        className
      )}
    >
      {onBack ? (
        <GameIconButton
          icon={backIcon === "close" ? Cancel01Icon : ArrowLeft01Icon}
          label={backIcon === "close" ? "Close" : "Go back"}
          tone={backIcon === "close" ? "red" : "cream"}
          size="sm"
          onClick={onBack}
        />
      ) : null}
      <div className="min-w-0 flex-1">
        {center ?? (
          <div className="min-w-0">
            {title ? <h1 className="gu-title truncate text-[1.45rem] leading-tight">{title}</h1> : null}
            {subtitle ? (
              <p className="truncate text-xs font-semibold text-white/90 [text-shadow:0_1px_0_rgba(20,40,110,.35)]">
                {subtitle}
              </p>
            ) : null}
          </div>
        )}
      </div>
      {right ? <div className="flex shrink-0 items-center gap-2">{right}</div> : null}
    </header>
  )
}

type ButtonProps = Omit<React.ComponentProps<"button">, "children"> & {
  tone?: GameTone
  size?: "sm" | "md" | "lg"
  icon?: IconSvgElement
  children?: React.ReactNode
}

/** A chunky 3D game button. */
export const GameButton = React.forwardRef<HTMLButtonElement, ButtonProps>(function GameButton(
  { tone = "blue", size = "md", icon, className, children, type = "button", ...props },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn("gu-btn", toneClass(tone), size === "sm" && "gu-btn-sm", size === "lg" && "gu-btn-lg", className)}
      {...props}
    >
      {icon ? <HugeiconsIcon icon={icon} className={size === "sm" ? "size-4" : "size-5"} strokeWidth={2.4} /> : null}
      {children}
    </button>
  )
})

/** A round game button with just an icon (close, home, mic, chat…). */
export const GameIconButton = React.forwardRef<
  HTMLButtonElement,
  Omit<ButtonProps, "children" | "icon"> & { icon: IconSvgElement; label: string; badge?: React.ReactNode }
>(function GameIconButton({ icon, label, badge, tone = "blue", size = "md", className, type = "button", ...props }, ref) {
  return (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      title={label}
      className={cn("gu-btn gu-btn-icon", toneClass(tone), size === "sm" && "gu-btn-sm", className)}
      {...props}
    >
      <HugeiconsIcon icon={icon} className={size === "sm" ? "size-[18px]" : "size-6"} strokeWidth={2.4} />
      {badge ? (
        <span className="absolute -top-1.5 -right-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--gu-red)] px-1 text-[11px] leading-none font-bold text-white shadow-[0_0_0_2px_#fff]">
          {badge}
        </span>
      ) : null}
    </button>
  )
})

/** A cream panel in the thick blue frame; `title` sits on a ribbon over the top edge. */
export function GamePanel({
  title,
  onClose,
  className,
  bodyClassName,
  children,
}: {
  title?: React.ReactNode
  onClose?: () => void
  className?: string
  bodyClassName?: string
  children: React.ReactNode
}) {
  return (
    <section className={cn("gu-panel", title ? "mt-7" : "", className)}>
      {title ? (
        <div className="absolute inset-x-0 -top-7 flex justify-center">
          <h2 className="gu-ribbon">{title}</h2>
        </div>
      ) : null}
      {onClose ? (
        <GameIconButton
          icon={Cancel01Icon}
          label="Close"
          tone="red"
          size="sm"
          onClick={onClose}
          className="!absolute -top-3 -right-3 z-10"
        />
      ) : null}
      <div className={cn("p-4", title && "pt-8", bodyClassName)}>{children}</div>
    </section>
  )
}

/** A section heading on the sky: white chunky type, optional count and action. */
export function GameSectionTitle({
  children,
  count,
  action,
  className,
}: {
  children: React.ReactNode
  count?: number
  action?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("flex items-center justify-between gap-2 px-1", className)}>
      <h2 className="gu-title flex items-center gap-2 text-lg">
        {children}
        {count ? <span className="gu-chip !py-0 text-[13px] leading-6">{count}</span> : null}
      </h2>
      {action}
    </div>
  )
}

/** Segmented tabs on the sky. */
export function GameTabs<T extends string>({
  tabs,
  value,
  onChange,
  className,
  label,
}: {
  tabs: { value: T; label: React.ReactNode; badge?: number }[]
  value: T
  onChange: (value: T) => void
  className?: string
  label: string
}) {
  return (
    <div role="tablist" aria-label={label} className={cn("gu-tabs", className)}>
      {tabs.map((t) => (
        <button
          key={t.value}
          type="button"
          role="tab"
          aria-selected={value === t.value}
          onClick={() => onChange(t.value)}
          className="gu-tab"
        >
          {t.label}
          {t.badge ? (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--gu-red)] px-1 text-[11px] leading-none text-white [text-shadow:none]">
              {t.badge}
            </span>
          ) : null}
        </button>
      ))}
    </div>
  )
}

/** A big selectable card (an option, a friend, a game). */
export function GameChoice({
  selected,
  className,
  children,
  role = "button",
  ...props
}: React.ComponentProps<"button"> & { selected: boolean }) {
  return (
    <button
      type="button"
      role={role}
      aria-pressed={role === "button" ? selected : undefined}
      aria-checked={role === "radio" || role === "checkbox" ? selected : undefined}
      className={cn("gu-choice", className)}
      {...props}
    >
      {children}
    </button>
  )
}

/** On / off, the pause dialog's toggle. */
export function GameSwitch({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
}) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} className="gu-switch" onClick={() => onChange(!checked)}>
      <span className={checked ? "justify-start pl-2.5" : "justify-end pr-2.5"}>{checked ? "ON" : "OFF"}</span>
    </button>
  )
}

/** A glossy progress bar (0–1). */
export function GameProgress({ value, className }: { value: number; className?: string }) {
  const pct = Math.round(Math.min(1, Math.max(0, value)) * 100)
  return (
    <div className={cn("gu-track", className)} role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
      <div className="gu-fill" style={{ width: `${Math.max(6, pct)}%` }} />
    </div>
  )
}

/**
 * A game-style modal: the dimmed scrim and a framed panel popping in the
 * middle. Closes on the scrim, Esc and the red ✕.
 */
export function GameDialog({
  open,
  onClose,
  title,
  children,
  className,
}: {
  open: boolean
  onClose: () => void
  title?: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  React.useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose()
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="gu fixed inset-0 z-[90] flex items-center justify-center p-5" role="dialog" aria-modal="true">
      <button type="button" aria-label="Close" className="gu-scrim absolute inset-0 cursor-default" onClick={onClose} />
      <div className={cn("gu-pop relative w-full max-w-sm", className)}>
        <GamePanel title={title} onClose={onClose}>
          {children}
        </GamePanel>
      </div>
    </div>
  )
}

/** A friendly empty / info box on cream. */
export function GameNote({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("gu-panel-flat px-4 py-4 text-center text-sm font-medium text-[var(--gu-ink-soft)]", className)}>
      {children}
    </div>
  )
}
