import { CheckmarkCircle02Icon, ReceiptIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { UserAvatar } from "@/components/shared/user-avatar"
import { Card } from "@/components/ui/card"
import { Item, ItemActions, ItemContent, ItemDescription, ItemGroup, ItemMedia, ItemTitle } from "@/components/ui/item"
import { cn } from "@/lib/utils"

const AVATAR = {
  boy: "/assets/avatar_boy.jpg",
  girl: "/assets/avatar_girl.jpg",
  glasses: "/assets/avatar_glasses.jpg",
}

/** One mock activity row used across the walkthrough illustrations. */
function DemoRow({
  media,
  title,
  description,
  action,
  className,
}: {
  media: React.ReactNode
  title: string
  description: string
  action?: React.ReactNode
  className?: string
}) {
  return (
    <Item size="sm" className={cn("rounded-none border-0", className)}>
      <ItemMedia>{media}</ItemMedia>
      <ItemContent className="gap-0">
        <ItemTitle className="text-xs font-medium">{title}</ItemTitle>
        <ItemDescription className="text-[11px]">{description}</ItemDescription>
      </ItemContent>
      {action ? <ItemActions>{action}</ItemActions> : null}
    </Item>
  )
}

function ReceiptMedia({ className }: { className?: string }) {
  return (
    <div className={cn("flex size-9 items-center justify-center rounded-md bg-primary/10 text-primary", className)}>
      <HugeiconsIcon icon={ReceiptIcon} className="size-4" />
    </div>
  )
}

export function SplitBillsVisual() {
  return (
    <div className="relative mx-auto flex h-[260px] w-full max-w-[280px] flex-col items-center justify-center">
      <div className="flex size-44 items-center justify-center p-4">
        <Card className="w-40 items-center gap-2 p-4 text-center">
          <div className="flex size-9 items-center justify-center rounded-md bg-primary/10 text-primary">
            <HugeiconsIcon icon={ReceiptIcon} className="size-4.5" />
          </div>
          <div className="text-xl font-semibold tabular-nums">₹1,200</div>
          <div className="flex w-full flex-col items-center gap-1.5">
            <div className="h-1.5 w-3/4 rounded-sm bg-muted" />
            <div className="h-1.5 w-1/2 rounded-sm bg-muted" />
          </div>
        </Card>
      </div>
      {/* Orbiting friends */}
      <UserAvatar src={AVATAR.girl} name="Friend" className="absolute top-2 left-4 border" />
      <UserAvatar src={AVATAR.boy} name="Friend" className="absolute top-4 right-4 border" />
      <UserAvatar src={AVATAR.glasses} name="Friend" className="absolute bottom-2 left-6 border" />
    </div>
  )
}

export function TrackVisual() {
  return (
    <ItemGroup className="mx-auto w-full max-w-[300px] gap-0 divide-y overflow-hidden rounded-lg border bg-card">
      <DemoRow
        media={<UserAvatar src={AVATAR.boy} name="Rahul" size="sm" className="size-9" />}
        title="Rahul paid you"
        description="2 hours ago"
        action={<span className="text-xs font-semibold tabular-nums text-success">+₹300</span>}
      />
      <DemoRow
        media={<ReceiptMedia />}
        title="Dinner at Cafe"
        description="3 people • You paid"
        action={<span className="text-xs font-semibold tabular-nums">₹900</span>}
      />
      <DemoRow
        media={<UserAvatar src={AVATAR.girl} name="Neha" size="sm" className="size-9" />}
        title="Pending from Neha"
        description="1 day ago"
        action={<span className="text-xs font-semibold tabular-nums text-destructive">₹300</span>}
      />
    </ItemGroup>
  )
}

/** UPI app tiles keep their real brand colours. */
const UPI_APPS = [
  { label: "Google Pay", mark: "G", className: "bg-blue-600 text-white" },
  { label: "PhonePe", mark: "पे", className: "bg-purple-600 text-white" },
  { label: "Paytm", mark: "P", className: "bg-sky-500 text-white" },
  { label: "CRED UPI", mark: "C", className: "bg-black text-white" },
]

export function UpiVisual() {
  return (
    <div className="mx-auto flex w-full max-w-[280px] flex-col items-center gap-4 py-2">
      <div className="grid w-full grid-cols-2 gap-2">
        {UPI_APPS.map((app) => (
          <Item key={app.label} variant="outline" size="sm" className="flex-nowrap bg-card">
            <ItemMedia className={cn("size-7 rounded-md text-xs font-semibold", app.className)}>{app.mark}</ItemMedia>
            <ItemContent>
              <ItemTitle className="text-xs font-medium">{app.label}</ItemTitle>
            </ItemContent>
          </Item>
        ))}
      </div>
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <HugeiconsIcon icon={CheckmarkCircle02Icon} className="size-4 text-success" />
        Simple. Fast. Secure.
      </p>
    </div>
  )
}

export function SyncVisual() {
  return (
    <ItemGroup className="mx-auto w-full max-w-[300px] gap-0 divide-y overflow-hidden rounded-lg border bg-card">
      <DemoRow
        media={<UserAvatar src={AVATAR.boy} name="Aman" size="sm" />}
        title="Aman paid you ₹250"
        description="2 min ago"
        action={<HugeiconsIcon icon={CheckmarkCircle02Icon} className="size-4 text-success" />}
      />
      <DemoRow
        media={<UserAvatar src={AVATAR.girl} name="Neha" size="sm" />}
        title="Neha marked as paid"
        description="Dinner at Cafe • 10 min ago"
      />
      <DemoRow
        media={<UserAvatar src={AVATAR.glasses} name="Rahul" size="sm" />}
        title="Rahul added a new bill"
        description="Goa Trip • 1 hour ago"
      />
    </ItemGroup>
  )
}
