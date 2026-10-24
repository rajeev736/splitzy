"use client"

import * as React from "react"
import { useTheme } from "next-themes"
import { ComputerIcon, Moon02Icon, Notification01Icon, SmartPhone01Icon, Sun03Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react"

import { AppHeader } from "@/components/layout/app-header"
import { NotificationSettings } from "@/components/shared/enable-notifications"
import { PageContainer } from "@/components/layout/app-shell"
import { Card } from "@/components/ui/card"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { isFirebaseConfigured } from "@/lib/firebase/config"
import { cn } from "@/lib/utils"
import { DeleteAccountCard } from "./_components/delete-account-card"

type Theme = "light" | "dark" | "system"

const THEME_OPTIONS: { value: Theme; label: string; icon: IconSvgElement }[] = [
  { value: "light", label: "Light", icon: Sun03Icon },
  { value: "dark", label: "Dark", icon: Moon02Icon },
  { value: "system", label: "System", icon: ComputerIcon },
]

const noopSubscribe = () => () => {}
/** next-themes only knows the theme after mount; avoid a hydration mismatch. */
const useIsClient = () => React.useSyncExternalStore(noopSubscribe, () => true, () => false)

/** A titled group of settings: label above, one flat card of rows below. */
function SettingsSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="px-1 text-sm font-semibold">{title}</h2>
      <Card className="gap-0 divide-y py-0">{children}</Card>
    </section>
  )
}

/** One settings row: icon, label + description, and an optional control. */
function SettingsRow({
  icon,
  title,
  description,
  children,
  stacked,
}: {
  icon: IconSvgElement
  title: string
  description?: React.ReactNode
  children?: React.ReactNode
  stacked?: boolean
}) {
  return (
    <div className={cn("flex gap-3 px-4 py-3.5", stacked ? "flex-col" : "items-center")}>
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
          <HugeiconsIcon icon={icon} className="size-4" />
        </span>
        <div className="flex min-w-0 flex-col gap-0.5">
          <p className="text-sm font-medium">{title}</p>
          {description && <div className="text-xs leading-relaxed text-muted-foreground">{description}</div>}
        </div>
      </div>
      {children}
    </div>
  )
}

export default function SettingsPage() {
  const { theme, setTheme } = useTheme()
  const isClient = useIsClient()

  return (
    <>
      <AppHeader title="Settings" showBack />

      <PageContainer className="max-w-xl pb-20">
        {/* Appearance & theme */}
        <SettingsSection title="Appearance">
          <SettingsRow icon={Sun03Icon} title="Theme" description="Choose your preferred theme" stacked>
            <ToggleGroup
              variant="outline"
              spacing={2}
              className="grid w-full grid-cols-3"
              value={isClient && theme ? [theme] : []}
              onValueChange={(value: string[]) => {
                if (value[0]) setTheme(value[0])
              }}
            >
              {THEME_OPTIONS.map((opt) => (
                <ToggleGroupItem
                  key={opt.value}
                  value={opt.value}
                  aria-label={opt.label}
                  className="h-9 gap-1.5 rounded-md text-xs font-medium text-muted-foreground aria-pressed:border-foreground/40 aria-pressed:bg-muted aria-pressed:text-foreground"
                >
                  <HugeiconsIcon icon={opt.icon} className="size-4" />
                  {opt.label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </SettingsRow>
        </SettingsSection>

        {/* Notification-bar alerts */}
        <SettingsSection title="Notifications">
          <SettingsRow icon={Notification01Icon} title="Notification bar alerts" stacked>
            <div className="pl-11">
              <NotificationSettings />
            </div>
          </SettingsRow>
        </SettingsSection>

        {/* PWA install */}
        <SettingsSection title="Install JoySplit app">
          <SettingsRow
            icon={SmartPhone01Icon}
            title="On iPhone"
            description={
              <>
                Tap the <strong className="font-medium text-foreground">Share</strong> button in Safari, then tap{" "}
                <strong className="font-medium text-foreground">Add to Home Screen</strong>.
              </>
            }
          />
          <SettingsRow
            icon={SmartPhone01Icon}
            title="On Android"
            description={
              <>
                Tap the menu (three dots) in Chrome, then tap{" "}
                <strong className="font-medium text-foreground">Install app</strong>.
              </>
            }
          />
        </SettingsSection>

        {isFirebaseConfigured && <DeleteAccountCard />}

        {/* About */}
        <div className="flex flex-col gap-0.5 text-center text-xs text-muted-foreground">
          <p className="font-medium text-foreground">JoySplit v1.0.0</p>
          <p>Split bills. Keep friendships.</p>
        </div>
      </PageContainer>
    </>
  )
}
