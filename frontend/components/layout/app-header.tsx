"use client"

import Link from "next/link"
import { useRouter } from "nextjs-toploader/app"
import { ArrowLeft01Icon, Notification01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { useSession } from "@/components/providers/session-provider"
import { UserAvatar } from "@/components/shared/user-avatar"
import { Button } from "@/components/ui/button"
import { useUnreadCount } from "@/hooks/queries"

/** Time-of-day greeting for the home header. */
function greeting() {
  const h = new Date().getHours()
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening"
}

export interface AppHeaderProps {
  title?: string
  subtitle?: string
  showBack?: boolean
  onBack?: () => void
  /** Replaces the default notifications bell. */
  rightAction?: React.ReactNode
  showUserGreeting?: boolean
  /** Custom title area (e.g. avatar + name + actions); replaces title/subtitle. */
  titleContent?: React.ReactNode
}

export function AppHeader({
  title,
  subtitle,
  showBack = false,
  onBack,
  rightAction,
  showUserGreeting = false,
  titleContent,
}: AppHeaderProps) {
  const router = useRouter()
  const { user } = useSession()
  const unread = useUnreadCount()

  return (
    <header className="sticky top-0 z-30 border-b bg-background/85 px-4 py-2.5 backdrop-blur-xl backdrop-saturate-150 sm:px-6">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          {showBack && (
            <Button variant="ghost" size="icon" aria-label="Go back" onClick={() => (onBack ? onBack() : router.back())}>
              <HugeiconsIcon icon={ArrowLeft01Icon} className="size-5" strokeWidth={2.2} />
            </Button>
          )}

          {titleContent ? (
            <div className="min-w-0 flex-1">{titleContent}</div>
          ) : showUserGreeting && user ? (
            <div className="flex items-center gap-3">
              <Link href="/profile" className="shrink-0">
                <UserAvatar src={user.photoURL} name={user.displayName} size="md" />
              </Link>
              <div>
                <div className="text-xs text-muted-foreground">{greeting()}</div>
                <div className="text-base leading-tight font-semibold">{user.displayName.split(" ")[0]}</div>
              </div>
            </div>
          ) : (
            <div className="min-w-0">
              {title && <h1 className="truncate text-base font-semibold tracking-tight sm:text-lg">{title}</h1>}
              {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {rightAction ?? (
            <Button
              variant="ghost"
              size="icon"
              aria-label="Notifications"
              className="relative"
              nativeButton={false}
              render={<Link href="/notifications" />}
            >
              <HugeiconsIcon icon={Notification01Icon} className="size-5" />
              {unread > 0 && (
                <span className="absolute top-2 right-2 size-2 rounded-full bg-destructive ring-2 ring-background" />
              )}
            </Button>
          )}
        </div>
      </div>
    </header>
  )
}
