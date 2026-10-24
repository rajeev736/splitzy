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
  QrCodeIcon,
  Settings01Icon,
  Share08Icon,
  Tick02Icon,
  UserGroupIcon,
  UserIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { toast } from "sonner"

import { AppHeader } from "@/components/layout/app-header"
import { PageContainer } from "@/components/layout/app-shell"
import { LogoutDialog } from "@/components/layout/logout-dialog"
import { useSession } from "@/components/providers/session-provider"
import { ButtonLink } from "@/components/shared/button-link"
import { JoySplitQr } from "@/components/shared/joysplit-qr"
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
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard"

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
  const { copied, copy } = useCopyToClipboard()

  const saveProfile = useUpdateProfile({ successMessage: "Profile updated!", errorMessage: "Failed to update profile" })
  const savePhoto = useUpdateProfile({ errorMessage: "Failed to update photo" })

  const [isEditOpen, setIsEditOpen] = React.useState(false)
  const [isPhotoOpen, setIsPhotoOpen] = React.useState(false)
  const [isScanning, setIsScanning] = React.useState(false)
  // Load the dialog chunk on first open, then keep it mounted so close animations play
  const [photoDialogLoaded, setPhotoDialogLoaded] = React.useState(false)
  if (isPhotoOpen && !photoDialogLoaded) setPhotoDialogLoaded(true)
  const [isLogoutOpen, setIsLogoutOpen] = React.useState(false)
  const [nameInput, setNameInput] = React.useState(user?.displayName || "")
  const [upiInput, setUpiInput] = React.useState(user?.upiId || "")

  if (!user) return null

  const handleCopyId = () => void copy(user.splitzyId, "JoySplit ID copied to clipboard!")

  const handleShareId = () => {
    if (navigator.share) {
      navigator.share({ title: "My JoySplit ID", text: `Hey! Add me on JoySplit: ${user.splitzyId}` }).catch(() => {})
    } else {
      handleCopyId()
    }
  }

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

      <PageContainer className="max-w-xl pb-20">
        {/* Profile header */}
        <div className="flex items-center gap-4">
          <div className="group relative size-16 shrink-0 overflow-hidden rounded-full border">
            <UserAvatar src={user.photoURL} name={user.displayName} size="xl" className="size-full" />
            <button
              type="button"
              onClick={() => setIsPhotoOpen(true)}
              className="absolute inset-0 flex items-center justify-center bg-black/40 text-white opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
              title="Change profile photo"
              aria-label="Change profile photo"
            >
              <HugeiconsIcon icon={Camera01Icon} className="size-5" />
            </button>
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-semibold">{user.displayName}</h1>
            <p className="truncate text-xs text-muted-foreground">{user.email}</p>
            <button
              type="button"
              onClick={() => setIsPhotoOpen(true)}
              className="mt-1 text-xs font-medium text-primary underline-offset-4 hover:underline"
            >
              Change photo
            </button>
          </div>
        </div>

        {/* Your QR for friends to scan, and the camera to scan theirs */}
        <Card className="gap-0 py-0">
          <div className="flex items-center gap-4 p-4">
            <JoySplitQr splitzyId={user.splitzyId} className="w-28 shrink-0 p-2" />
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <div>
                <p className="text-sm font-semibold">Your QR code</p>
                <p className="text-xs text-muted-foreground">Friends scan it to add you. Scan theirs to add them.</p>
              </div>
              <Button size="sm" variant="outline" className="self-start" onClick={() => setIsScanning(true)}>
                <HugeiconsIcon icon={QrCodeIcon} data-icon="inline-start" />
                Scan a QR
              </Button>
            </div>
          </div>
        </Card>
        <QrScannerDialog open={isScanning} onOpenChange={setIsScanning} />

        {/* Account */}
        <section className="flex flex-col gap-2">
          <h2 className="px-1 text-sm font-semibold">Account</h2>
          <Card className="gap-0 divide-y py-0">
            {/* JoySplit ID */}
            <div className="flex items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <div className="text-xs text-muted-foreground">JoySplit ID</div>
                <div className="truncate font-mono text-sm font-medium tracking-wide">{user.splitzyId}</div>
              </div>
              <Button variant="ghost" size="icon-sm" title="Copy ID" aria-label="Copy ID" onClick={handleCopyId}>
                <HugeiconsIcon icon={copied ? Tick02Icon : Copy01Icon} className={copied ? "text-success" : undefined} />
              </Button>
              <Button variant="outline" size="sm" onClick={handleShareId}>
                <HugeiconsIcon icon={Share08Icon} data-icon="inline-start" />
                Share
              </Button>
            </div>

            {/* UPI ID */}
            <div className="flex items-center gap-3 px-4 py-3">
              <HugeiconsIcon icon={AtIcon} className="size-4.5 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <div className="text-xs text-muted-foreground">UPI ID</div>
                <div className="truncate text-sm font-medium">{user.upiId || "Not set"}</div>
              </div>
              <Button variant="ghost" size="sm" onClick={openEdit}>
                Edit
              </Button>
            </div>

            <MenuRow icon={UserIcon} label="Edit profile" render={<button type="button" onClick={openEdit} />} />
          </Card>
        </section>

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
            <Item className="rounded-none border-0 px-4 py-3">
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
          className="h-10 w-full text-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={() => setIsLogoutOpen(true)}
        >
          <HugeiconsIcon icon={Logout01Icon} data-icon="inline-start" />
          Log out
        </Button>
      </PageContainer>

      {/* Edit profile */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit profile</DialogTitle>
          </DialogHeader>
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
                <Input id="profile-upi" value={upiInput} onChange={(e) => setUpiInput(e.target.value)} />
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

      <LogoutDialog open={isLogoutOpen} onOpenChange={setIsLogoutOpen} />
    </>
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
    <Item className="rounded-none border-0 px-4 py-3 text-left hover:bg-muted/60" render={render}>
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
