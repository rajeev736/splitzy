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
import { UserAvatar } from "@/components/shared/user-avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Item, ItemActions, ItemContent, ItemGroup, ItemMedia, ItemSeparator, ItemTitle } from "@/components/ui/item"
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
          <ButtonLink href="/settings" variant="ghost" size="icon" className="rounded-full" aria-label="Settings">
            <HugeiconsIcon icon={Settings01Icon} className="size-5" />
          </ButtonLink>
        }
      />

      <PageContainer className="max-w-xl pb-20">
        {/* Profile header */}
        <div className="flex flex-col items-center text-center">
          <div className="group relative mb-3 size-24 overflow-hidden rounded-full border-4 border-card shadow-lg">
            <UserAvatar src={user.photoURL} name={user.displayName} size="xl" className="size-full" />
            <button
              type="button"
              onClick={() => setIsPhotoOpen(true)}
              className="absolute inset-0 flex items-center justify-center bg-black/40 text-white opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
              title="Change profile photo"
              aria-label="Change profile photo"
            >
              <HugeiconsIcon icon={Camera01Icon} className="size-6" />
            </button>
          </div>
          <h1 className="text-xl font-extrabold">{user.displayName}</h1>
          <p className="mt-0.5 text-xs text-muted-foreground">{user.email}</p>
        </div>

        {/* JoySplit ID card */}
        <Card className="rounded-3xl border border-primary/20 bg-secondary/60 ring-0">
          <CardContent className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                  Your JoySplit ID
                </span>
                <div className="mt-0.5 font-mono text-xl font-extrabold tracking-wider">{user.splitzyId}</div>
              </div>
              <Button variant="outline" size="icon-lg" className="rounded-2xl" title="Copy ID" aria-label="Copy ID" onClick={handleCopyId}>
                <HugeiconsIcon icon={copied ? Tick02Icon : Copy01Icon} className={copied ? "text-success" : undefined} />
              </Button>
            </div>
            <Button className="w-full" onClick={handleShareId}>
              <HugeiconsIcon icon={Share08Icon} data-icon="inline-start" />
              Share ID
            </Button>
          </CardContent>
        </Card>

        {/* UPI ID */}
        <Item variant="outline" className="rounded-3xl bg-card p-4">
          <ItemMedia className="size-10 rounded-2xl bg-brand-yellow/15 text-brand-yellow">
            <HugeiconsIcon icon={AtIcon} className="size-5" />
          </ItemMedia>
          <ItemContent className="gap-0">
            <span className="text-[10px] font-bold text-muted-foreground uppercase">UPI ID</span>
            <ItemTitle className="font-bold">{user.upiId || "Not set"}</ItemTitle>
          </ItemContent>
          <ItemActions>
            <Button variant="link" size="sm" className="font-bold" onClick={openEdit}>
              Edit
            </Button>
          </ItemActions>
        </Item>

        {/* Menu */}
        <Card className="rounded-3xl py-1">
          <ItemGroup className="gap-0 px-1">
            <MenuRow icon={UserIcon} label="Edit Profile" render={<button type="button" onClick={openEdit} />} />
            <ItemSeparator className="my-0" />
            <MenuRow icon={UserGroupIcon} label="Friends" value={friends.length} render={<Link href="/friends" />} />
            <ItemSeparator className="my-0" />
            <MenuRow
              icon={Notification01Icon}
              label="Notifications"
              value={unreadCount}
              render={<Link href="/notifications" />}
            />
            <ItemSeparator className="my-0" />
            <Item className="p-4">
              <ItemMedia variant="icon">
                <HugeiconsIcon icon={Moon02Icon} className="size-5 text-muted-foreground" />
              </ItemMedia>
              <ItemContent>
                <ItemTitle className="font-semibold">Dark Mode</ItemTitle>
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
            <ItemSeparator className="my-0" />
            <MenuRow icon={HelpCircleIcon} label="Help & Settings" render={<Link href="/settings" />} />
          </ItemGroup>
        </Card>

        <Button
          variant="outline"
          size="lg"
          className="h-12 w-full rounded-2xl border-destructive/30 font-bold text-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={() => setIsLogoutOpen(true)}
        >
          <HugeiconsIcon icon={Logout01Icon} data-icon="inline-start" />
          Logout
        </Button>
      </PageContainer>

      {/* Edit profile */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
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
                <FieldLabel htmlFor="profile-name">Display Name</FieldLabel>
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
              Save Changes
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
    <Item className="p-4 text-left hover:bg-muted" render={render}>
      <ItemMedia variant="icon">
        <HugeiconsIcon icon={icon} className="size-5 text-muted-foreground" />
      </ItemMedia>
      <ItemContent>
        <ItemTitle className="font-semibold">{label}</ItemTitle>
      </ItemContent>
      <ItemActions>
        {value !== undefined && <span className="text-xs font-semibold text-muted-foreground">{value}</span>}
        <HugeiconsIcon icon={ArrowRight01Icon} className="size-4 text-muted-foreground/60" />
      </ItemActions>
    </Item>
  )
}
