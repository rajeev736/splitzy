"use client"

import * as React from "react"
import { useTheme } from "next-themes"
import { ComputerIcon, Moon02Icon, SmartPhone01Icon, Sun03Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react"

import { AppHeader } from "@/components/layout/app-header"
import { PageContainer } from "@/components/layout/app-shell"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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

function SettingsCard({
  icon,
  iconClassName,
  title,
  description,
  children,
}: {
  icon: IconSvgElement
  iconClassName: string
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <Card className="rounded-3xl">
      <CardHeader className="flex items-center gap-3">
        <div className={cn("flex size-10 shrink-0 items-center justify-center rounded-2xl", iconClassName)}>
          <HugeiconsIcon icon={icon} className="size-5" />
        </div>
        <div className="flex flex-col gap-0.5">
          <CardTitle className="text-sm font-bold">{title}</CardTitle>
          <CardDescription className="text-xs">{description}</CardDescription>
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
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
        <SettingsCard
          icon={Sun03Icon}
          iconClassName="bg-secondary text-primary"
          title="Appearance"
          description="Choose your preferred theme"
        >
          <ToggleGroup
            variant="outline"
            spacing={2.5}
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
                className="group/theme h-auto flex-col gap-2 rounded-2xl p-3.5 text-xs font-bold text-muted-foreground aria-pressed:border-primary aria-pressed:bg-secondary aria-pressed:text-primary aria-pressed:ring-2 aria-pressed:ring-primary/20"
              >
                <span className="rounded-xl bg-muted p-2 group-aria-pressed/theme:bg-primary group-aria-pressed/theme:text-primary-foreground">
                  <HugeiconsIcon icon={opt.icon} />
                </span>
                {opt.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </SettingsCard>

        {/* PWA install */}
        <SettingsCard
          icon={SmartPhone01Icon}
          iconClassName="bg-secondary text-primary"
          title="Install JoySplit App"
          description="Add JoySplit to your home screen"
        >
          <div className="rounded-2xl bg-muted/60 p-3.5 text-xs leading-relaxed text-muted-foreground">
            On iPhone: Tap the <strong>Share</strong> button in Safari, then tap <strong>Add to Home Screen</strong>.
            <br />
            On Android: Tap the menu (three dots) in Chrome, then tap <strong>Install app</strong>.
          </div>
        </SettingsCard>

        {isFirebaseConfigured && <DeleteAccountCard />}

        {/* About */}
        <div className="flex flex-col gap-1 text-center text-xs text-muted-foreground">
          <p className="font-bold text-foreground">JoySplit v1.0.0</p>
          <p>Split bills. Keep friendships.</p>
        </div>
      </PageContainer>
    </>
  )
}
