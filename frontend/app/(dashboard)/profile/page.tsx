"use client"

import * as React from "react"
import Link from "next/link"
import dynamic from "next/dynamic"
import { useTheme } from "next-themes"
import {
  ArrowRight01Icon,
  AtIcon,
  Camera01Icon,
  Copy01Icon,
  HelpCircleIcon,
  Logout01Icon,
  Moon02Icon,
  Notification01Icon,
  PencilEdit02Icon,
  QrCodeIcon,
  Settings01Icon,
  Share08Icon,
  Tick02Icon,
  UserGroupIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { toast } from "sonner"

import { AppHeader } from "@/components/layout/app-header"
import { PageContainer } from "@/components/layout/app-shell"
import { LogoutDialog } from "@/components/layout/logout-dialog"
import { useSession } from "@/components/providers/session-provider"
import { ButtonLink } from "@/components/shared/button-link"
import { JoySplitQr } from "@/components/shared/joysplit-qr"
import { MyIdDialog, useShareMyId } from "@/components/shared/my-id-dialog"
import { QrScannerDialog } from "@/components/shared/qr-scanner-dialog"
import { UserAvatar } from "@/components/shared/user-avatar"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Item, ItemActions, ItemContent, ItemMedia, ItemTitle } from "@/components/ui/item"
import { Spinner } from "@/components/ui/spinner"
import { Switch } from "@/components/ui/switch"
import { useUpdateProfile } from "@/hooks/mutations"
import { useFriends, useUnreadCount } from "@/hooks/queries"
import { cn } from "@/lib/utils"

// Camera/crop dialog (~500 lines + canvas code) loads only when first opened
const PhotoUploadDialog = dynamic(
  () => import("./_components/photo-upload-dialog").then((m) => m.PhotoUploadDialog),
  { ssr: false }
)

const noopSubscribe = () => () => {}
/** next-themes only knows the theme after mount; avoid a hydration mismatch. */
const useIsClient = () => React.useSyncExternalStore(noopSubscribe, () => true, () => false)

export default function ProfilePage() {
  const { user } = useSession()
  const { data: friends } = useFriends()
  const unreadCount = useUnreadCount()
  const { resolvedTheme, setTheme } = useTheme()
  const isClient = useIsClient()

  const saveProfile = useUpdateProfile({ successMessage: "Profile updated!", errorMessage: "Failed to update profile" })
  const savePhoto = useUpdateProfile({ errorMessage: "Failed to update photo" })

  const [isEditOpen, setIsEditOpen] = React.useState(false)
  const [isPhotoOpen, setIsPhotoOpen] = React.useState(false)
  const [isScanning, setIsScanning] = React.useState(false)
  const [isQrOpen, setIsQrOpen] = React.useState(false)
  // Load the dialog chunk on first open, then keep it mounted so close animations play
  const [photoDialogLoaded, setPhotoDialogLoaded] = React.useState(false)
  if (isPhotoOpen && !photoDialogLoaded) setPhotoDialogLoaded(true)
  const [isLogoutOpen, setIsLogoutOpen] = React.useState(false)
  const [nameInput, setNameInput] = React.useState(user?.displayName || "")
  const [upiInput, setUpiInput] = React.useState(user?.upiId || "")

  if (!user) return null

  const openEdit = () => {
    setNameInput(user.displayName)
    setUpiInput(user.upiId || "")
    setIsEditOpen(true)
  }

  const handleSaveProfile = () =>
    saveProfile.mutate(
      { displayName: nameInput.trim(), upiId: upiInput.trim() || undefined },
      { onSuccess: () => setIsEditOpen(false) }
    )

  // Failures are toasted by the mutation and swallowed here, like the original.
  const handlePhotoUpdated = async (newPhotoURL: string | null) => {
    try {
      await savePhoto.mutateAsync({ photoURL: newPhotoURL ? newPhotoURL : "" })
      toast.success(newPhotoURL ? "Profile photo updated!" : "Profile photo removed.")
    } catch {
      /* error toast shown by the mutation cache */
    }
  }

  const isDark = isClient && resolvedTheme === "dark"

  return (
    <>
      <AppHeader
        title="Profile"
        showBack
        rightAction={
          <ButtonLink href="/settings" variant="ghost" size="icon" aria-label="Settings">
            <HugeiconsIcon icon={Settings01Icon} className="size-5" />
          </ButtonLink>
        }
      />

      {/* Fills the screen between the header and the bottom nav, with Log out at the bottom */}
      <PageContainer className="max-w-xl min-h-[calc(100svh-8.875rem-env(safe-area-inset-bottom,0px))] gap-4 py-4 md:min-h-0 md:py-6">
        {/* You: photo, name, email, UPI — one edit button for all of it */}
        <section className="flex items-center gap-3.5 px-1">
          <UserAvatar src={user.photoURL} name={user.displayName} size="lg" className="size-16 border" />
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg leading-tight font-semibold">{user.displayName}</h1>
            <p className="truncate text-xs text-muted-foreground">{user.email}</p>
            <p className="mt-1 flex min-w-0 items-center gap-1 text-xs">
              <HugeiconsIcon icon={AtIcon} className="size-3.5 shrink-0 text-muted-foreground" />
              {user.upiId ? (
                <span className="truncate font-medium">{user.upiId}</span>
              ) : (
                <button type="button" onClick={openEdit} className="font-medium text-primary">
                  Add UPI ID
                </button>
              )}
            </p>
          </div>
          <Button
            variant="outline"
            size="icon"
            className="shrink-0 rounded-full text-muted-foreground"
            aria-label="Edit profile"
            title="Edit profile"
            onClick={openEdit}
          >
            <HugeiconsIcon icon={PencilEdit02Icon} className="size-4" />
          </Button>
        </section>

        {/* Your JoySplit ID and QR: tap the code to show it big */}
        <IdCard
          user={user}
          onShowQr={() => setIsQrOpen(true)}
          onScan={() => setIsScanning(true)}
        />

        {/* App */}
        <section className="flex flex-col gap-2">
          <h2 className="px-1 text-sm font-semibold">App</h2>
          <Card className="gap-0 divide-y py-0">
            <MenuRow icon={UserGroupIcon} label="Friends" value={friends.length} render={<Link href="/friends" />} />
            <MenuRow
              icon={Notification01Icon}
              label="Notifications"
              value={unreadCount}
              render={<Link href="/notifications" />}
            />
            <Item className="rounded-none border-0 px-4 py-2.5">
              <ItemMedia variant="icon" className="size-8 rounded-md bg-primary/10 text-primary">
                <HugeiconsIcon icon={Moon02Icon} className="size-4" />
              </ItemMedia>
              <ItemContent>
                <ItemTitle className="font-medium">Dark mode</ItemTitle>
              </ItemContent>
              <ItemActions>
                <Switch
                  checked={isDark}
                  disabled={!isClient}
                  onCheckedChange={() => setTheme(isDark ? "light" : "dark")}
                  aria-label="Toggle dark mode"
                />
              </ItemActions>
            </Item>
            <MenuRow icon={HelpCircleIcon} label="Help & settings" render={<Link href="/settings" />} />
          </Card>
        </section>

        <Button
          variant="outline"
          className="mt-auto h-10 w-full text-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={() => setIsLogoutOpen(true)}
        >
          <HugeiconsIcon icon={Logout01Icon} data-icon="inline-start" />
          Log out
        </Button>
      </PageContainer>

      {/* Edit profile: photo, name and UPI ID in one place */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit profile</DialogTitle>
          </DialogHeader>
          <div className="flex items-center gap-3.5">
            <UserAvatar src={user.photoURL} name={user.displayName} size="lg" className="size-14 border" />
            <Button variant="outline" size="sm" onClick={() => setIsPhotoOpen(true)}>
              <HugeiconsIcon icon={Camera01Icon} data-icon="inline-start" />
              Change photo
            </Button>
          </div>
          <form
            id="edit-profile-form"
            onSubmit={(e) => {
              e.preventDefault()
              handleSaveProfile()
            }}
          >
            <FieldGroup className="gap-4">
              <Field>
                <FieldLabel htmlFor="profile-name">Display name</FieldLabel>
                <Input id="profile-name" value={nameInput} onChange={(e) => setNameInput(e.target.value)} />
              </Field>
              <Field>
                <FieldLabel htmlFor="profile-upi">UPI ID</FieldLabel>
                <Input
                  id="profile-upi"
                  value={upiInput}
                  onChange={(e) => setUpiInput(e.target.value)}
                  placeholder="name@upi"
                />
                <FieldDescription className="text-xs">For receiving payments directly via UPI</FieldDescription>
              </Field>
            </FieldGroup>
          </form>
          <DialogFooter className="grid grid-cols-2">
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="edit-profile-form" disabled={saveProfile.isPending}>
              {saveProfile.isPending && <Spinner />}
              Save changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {photoDialogLoaded && (
        <PhotoUploadDialog
          open={isPhotoOpen}
          onOpenChange={setIsPhotoOpen}
          currentPhotoURL={user.photoURL}
          onPhotoUpdated={handlePhotoUpdated}
        />
      )}

      <MyIdDialog user={user} open={isQrOpen} onOpenChange={setIsQrOpen} />
      <QrScannerDialog open={isScanning} onOpenChange={setIsScanning} />
      <LogoutDialog open={isLogoutOpen} onOpenChange={setIsLogoutOpen} />
    </>
  )
}

/** QR (tap for a bigger one) + JoySplit ID with copy, share (with the QR picture) and scan. */
function IdCard({
  user,
  onShowQr,
  onScan,
}: {
  user: { splitzyId: string; displayName: string }
  onShowQr: () => void
  onScan: () => void
}) {
  const { share, copy, copied } = useShareMyId(user)
  return (
    <Card className="gap-0 py-0">
      <div className="flex items-center gap-4 p-4">
        <button
          type="button"
          onClick={onShowQr}
          className="shrink-0 rounded-lg transition-transform active:scale-95"
          aria-label="Show QR code"
        >
          <JoySplitQr splitzyId={user.splitzyId} className="w-24 p-1.5" />
        </button>
        <div className="flex min-w-0 flex-1 flex-col gap-2.5">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">Your JoySplit ID</p>
            <button
              type="button"
              onClick={copy}
              className="-ml-1 flex max-w-full items-center gap-1.5 rounded-md px-1 py-0.5 transition-colors hover:bg-muted"
              aria-label="Copy JoySplit ID"
            >
              <span className="truncate font-mono text-base font-semibold tracking-wide">{user.splitzyId}</span>
              <HugeiconsIcon
                icon={copied ? Tick02Icon : Copy01Icon}
                className={cn("size-4 shrink-0", copied ? "text-success" : "text-muted-foreground")}
              />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button size="sm" onClick={share}>
              <HugeiconsIcon icon={Share08Icon} data-icon="inline-start" />
              Share
            </Button>
            <Button size="sm" variant="outline" onClick={onScan}>
              <HugeiconsIcon icon={QrCodeIcon} data-icon="inline-start" />
              Scan
            </Button>
          </div>
        </div>
      </div>
    </Card>
  )
}

function MenuRow({
  icon,
  label,
  value,
  render,
}: {
  icon: React.ComponentProps<typeof HugeiconsIcon>["icon"]
  label: string
  value?: number
  render: React.ComponentProps<typeof Item>["render"]
}) {
  return (
    <Item className="rounded-none border-0 px-4 py-2.5 text-left hover:bg-muted/60" render={render}>
      <ItemMedia variant="icon" className="size-8 rounded-md bg-primary/10 text-primary">
        <HugeiconsIcon icon={icon} className="size-4" />
      </ItemMedia>
      <ItemContent>
        <ItemTitle className="font-medium">{label}</ItemTitle>
      </ItemContent>
      <ItemActions>
        {value !== undefined && <span className="text-xs tabular-nums text-muted-foreground">{value}</span>}
        <HugeiconsIcon icon={ArrowRight01Icon} className="size-4 text-muted-foreground" />
      </ItemActions>
    </Item>
  )
}
