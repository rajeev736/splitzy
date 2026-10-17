import { CheckmarkCircle02Icon, ReceiptIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { UserAvatar } from "@/components/shared/user-avatar"
import { Badge } from "@/components/ui/badge"
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
    <Item variant="outline" size="sm" className={cn("rounded-2xl bg-card shadow-sm", className)}>
      <ItemMedia>{media}</ItemMedia>
      <ItemContent className="gap-0">
        <ItemTitle className="text-xs font-bold">{title}</ItemTitle>
        <ItemDescription className="text-[10px]">{description}</ItemDescription>
      </ItemContent>
      {action ? <ItemActions>{action}</ItemActions> : null}
    </Item>
  )
}

function ReceiptMedia({ className }: { className?: string }) {
  return (
    <div className={cn("flex size-9 items-center justify-center rounded-full bg-primary/10 text-primary", className)}>
      <HugeiconsIcon icon={ReceiptIcon} className="size-4" />
    </div>
  )
}

export function SplitBillsVisual() {
  return (
    <div className="relative mx-auto flex h-[260px] w-full max-w-[280px] flex-col items-center justify-center">
      <div className="flex size-44 items-center justify-center rounded-full border border-primary/15 bg-primary/5 p-4 shadow-inner">
        <Card className="w-40 items-center gap-2 rounded-2xl p-4 text-center shadow-xl">
          <div className="flex size-10 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xs">
            <HugeiconsIcon icon={ReceiptIcon} className="size-5" />
          </div>
          <div className="text-xl font-extrabold">₹1,200</div>
          <div className="flex w-full flex-col items-center gap-1.5">
            <div className="h-1.5 w-3/4 rounded-full bg-muted" />
            <div className="h-1.5 w-1/2 rounded-full bg-muted" />
          </div>
        </Card>
      </div>
      {/* Orbiting friends */}
      <UserAvatar src={AVATAR.girl} name="Friend" className="absolute top-2 left-4 ring-2 ring-card shadow-md" />
      <UserAvatar src={AVATAR.boy} name="Friend" className="absolute top-4 right-4 ring-2 ring-card shadow-md" />
      <UserAvatar src={AVATAR.glasses} name="Friend" className="absolute bottom-2 left-6 ring-2 ring-card shadow-md" />
    </div>
  )
}

export function TrackVisual() {
  return (
    <ItemGroup className="mx-auto w-full max-w-[300px] gap-2.5 py-4">
      <DemoRow
        media={<UserAvatar src={AVATAR.boy} name="Rahul" size="sm" className="size-9" />}
        title="Rahul paid you"
        description="2 hours ago"
        action={<Badge className="bg-success/10 font-bold text-success">+ ₹300</Badge>}
      />
      <DemoRow
        className="scale-105 shadow-md"
        media={<ReceiptMedia />}
        title="Dinner at Cafe"
        description="3 people • You paid"
        action={<span className="text-xs font-bold">₹900</span>}
      />
      <DemoRow
        media={<UserAvatar src={AVATAR.girl} name="Neha" size="sm" className="size-9" />}
        title="Pending from Neha"
        description="1 day ago"
        action={<Badge variant="destructive" className="font-bold">₹300</Badge>}
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
      <div className="grid w-full grid-cols-2 gap-3">
        {UPI_APPS.map((app) => (
          <Item key={app.label} variant="outline" size="sm" className="flex-nowrap rounded-2xl bg-card shadow-sm">
            <ItemMedia className={cn("size-7 rounded-full text-xs font-bold", app.className)}>{app.mark}</ItemMedia>
            <ItemContent>
              <ItemTitle className="text-xs font-bold">{app.label}</ItemTitle>
            </ItemContent>
          </Item>
        ))}
      </div>
      <Badge className="h-auto rounded-xl border-success/30 bg-success/10 px-4 py-2 text-xs font-semibold text-success">
        <HugeiconsIcon icon={CheckmarkCircle02Icon} data-icon="inline-start" />
        Simple. Fast. Secure.
      </Badge>
    </div>
  )
}

export function SyncVisual() {
  return (
    <ItemGroup className="mx-auto w-full max-w-[290px] gap-2.5 py-3">
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
