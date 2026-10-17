"use client"

import * as React from "react"
import { useTheme } from "next-themes"
import {
  ComputerIcon,
  Database01Icon,
  Moon02Icon,
  RefreshIcon,
  Shield01Icon,
  SmartPhone01Icon,
  Sun03Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react"
import { toast } from "sonner"

import { AppHeader } from "@/components/layout/app-header"
import { PageContainer } from "@/components/layout/app-shell"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Item, ItemActions, ItemContent, ItemDescription, ItemGroup, ItemMedia, ItemSeparator, ItemTitle } from "@/components/ui/item"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { isFirebaseConfigured } from "@/lib/firebase/config"
import { cn } from "@/lib/utils"

type Theme = "light" | "dark" | "system"

const THEME_OPTIONS: { value: Theme; label: string; icon: IconSvgElement }[] = [
  { value: "light", label: "Light", icon: Sun03Icon },
  { value: "dark", label: "Dark", icon: Moon02Icon },
  { value: "system", label: "System", icon: ComputerIcon },
]

const LOCAL_CACHE_KEYS = [
  "joysplit_user_profile",
  "joysplit_friends_list",
  "joysplit_groups_list",
  "joysplit_expenses_list",
  "joysplit_notifications_list",
  "joysplit_friend_requests",
]

const PRECISION_ROWS: { label: string; value: string; className?: string }[] = [
  { label: "Base Currency", value: "INR (₹)" },
  { label: "Database Storage Unit", value: "Integer Paise (1 INR = 100 Paise)" },
  { label: "Remainder Distribution", value: "Strictly Deterministic", className: "text-success" },
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

  const handleClearCache = () => {
    LOCAL_CACHE_KEYS.forEach((key) => localStorage.removeItem(key))
    toast.warning("Local cache cleared. Syncing with live Firestore...")
    setTimeout(() => {
      window.location.reload()
    }, 800)
  }

  return (
    <>
      <AppHeader title="Settings" showBack />

      <PageContainer className="max-w-xl pb-20">
        {/* Appearance & theme */}
        <SettingsCard
          icon={Sun03Icon}
          iconClassName="bg-secondary text-primary"
          title="Appearance & Theme"
          description="Choose your preferred visual theme"
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
          description="Add JoySplit to your home screen as a PWA"
        >
          <div className="rounded-2xl bg-muted/60 p-3.5 text-xs leading-relaxed text-muted-foreground">
            On iOS: Tap the <strong>Share</strong> button in Safari, then tap <strong>Add to Home Screen</strong>.
            <br />
            On Android: Tap the menu (three dots) in Chrome, then tap <strong>Install App</strong>.
          </div>
        </SettingsCard>

        {/* Financial precision */}
        <SettingsCard
          icon={Shield01Icon}
          iconClassName="bg-success/10 text-success"
          title="Financial Precision"
          description="Deterministic Integer Paise Math"
        >
          <ItemGroup className="gap-0">
            {PRECISION_ROWS.map((row, i) => (
              <React.Fragment key={row.label}>
                {i > 0 && <ItemSeparator className="my-0" />}
                <Item size="xs" className="px-0 text-xs">
                  <ItemContent>
                    <ItemDescription className="text-xs">{row.label}</ItemDescription>
                  </ItemContent>
                  <ItemActions>
                    <strong className={cn("text-right", row.className)}>{row.value}</strong>
                  </ItemActions>
                </Item>
              </React.Fragment>
            ))}
          </ItemGroup>
        </SettingsCard>

        {/* Backend status */}
        <SettingsCard
          icon={Database01Icon}
          iconClassName="bg-info/10 text-info"
          title="Backend & Security"
          description="Firebase Authentication + Cloud Firestore"
        >
          <Item variant="muted" size="sm" className="rounded-2xl text-xs">
            <ItemContent>
              <ItemDescription className="text-xs">Firebase Configuration</ItemDescription>
            </ItemContent>
            <ItemActions>
              <Badge
                className={cn("font-bold", isFirebaseConfigured ? "bg-success/15 text-success" : "bg-info/15 text-info")}
              >
                {isFirebaseConfigured ? "Live Firebase Active" : "Interactive Demo Mode"}
              </Badge>
            </ItemActions>
          </Item>
        </SettingsCard>

        {/* Cache maintenance */}
        <Card className="rounded-3xl">
          <CardContent className="flex flex-col gap-3">
            <h3 className="text-xs font-bold tracking-wider text-muted-foreground uppercase">Client Cache</h3>
            <Item
              className="rounded-2xl text-left hover:bg-muted"
              render={<button type="button" onClick={handleClearCache} />}
            >
              <ItemMedia variant="icon">
                <HugeiconsIcon icon={RefreshIcon} className="text-muted-foreground" />
              </ItemMedia>
              <ItemContent className="gap-0">
                <ItemTitle className="text-xs font-bold">Clear Local Cache</ItemTitle>
                <ItemDescription className="text-[11px]">Purges browser cache and re-syncs from Firestore</ItemDescription>
              </ItemContent>
              <ItemActions>
                <span className="text-xs font-bold text-primary">Sync</span>
              </ItemActions>
            </Item>
          </CardContent>
        </Card>

        {/* About */}
        <div className="flex flex-col gap-1 text-center text-xs text-muted-foreground">
          <p className="font-bold text-foreground">JoySplit v1.0.0 (Zero-Budget Production MVP)</p>
          <p>Split bills. Keep friendships. Direct UPI settlement.</p>
        </div>
      </PageContainer>
    </>
  )
}
