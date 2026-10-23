"use client"

import * as React from "react"
import { useRouter } from "nextjs-toploader/app"
import { ArrowRight01Icon, AtIcon, Camera01Icon, Copy01Icon, Tick02Icon, UserIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { toast } from "sonner"

import { useSession } from "@/components/providers/session-provider"
import { AvatarPicker } from "@/components/shared/avatar-picker"
import { UserAvatar } from "@/components/shared/user-avatar"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Item, ItemActions, ItemContent, ItemMedia, ItemTitle } from "@/components/ui/item"
import { Spinner } from "@/components/ui/spinner"
import { useUpdateProfile } from "@/hooks/mutations"
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard"
import { BOY_AVATARS, DEFAULT_AVATAR, GIRL_AVATARS } from "@/lib/avatars"
import { cn } from "@/lib/utils"
import { AuthHeading } from "../../_components/auth-card"
import { AuthInput } from "../../_components/auth-input"

export { DEFAULT_AVATAR }

const FEATURED_AVATARS = [
  BOY_AVATARS[0].src,
  GIRL_AVATARS[0].src,
  BOY_AVATARS[1].src,
  GIRL_AVATARS[1].src,
]

/** Signup step 3: avatar, name, JoySplit ID and UPI ID → completes onboarding. */
export function ProfileStep({
  fullName,
  onFullNameChange,
  splitzyId,
  upiId,
  onUpiIdChange,
  selectedAvatar,
  onAvatarChange,
}: {
  fullName: string
  onFullNameChange: (value: string) => void
  splitzyId: string
  upiId: string
  onUpiIdChange: (value: string) => void
  selectedAvatar: string
  onAvatarChange: (value: string) => void
}) {
  const router = useRouter()
  const { user } = useSession()
  const { copied, copy } = useCopyToClipboard()
  const [isPickerOpen, setIsPickerOpen] = React.useState(false)
  const updateProfile = useUpdateProfile({ successMessage: "Profile configured successfully!", errorMessage: false })

  const handleComplete = () => {
    if (!user) {
      toast.error("Your session expired. Please log in again.")
      router.push("/login")
      return
    }
    if (!fullName.trim()) {
      toast.error("Please enter your name.")
      return
    }

    updateProfile.mutate(
      {
        displayName: fullName.trim() || user.displayName || "User",
        upiId: upiId.trim() || "",
        photoURL: selectedAvatar,
        onboardingCompleted: true,
      },
      {
        onSuccess: () => router.push("/home"),
        onError: (err) => {
          console.error("Profile update error:", err)
          toast.error(err instanceof Error && err.message ? err.message : "Could not update profile. Please try again.")
        },
      }
    )
  }

  return (
    <>
      <AuthHeading title="Set up" highlight="your profile" description="Add a few details to get started with JoySplit." />

      {/* Avatar selector */}
      <div className="flex flex-col items-center gap-3">
        <button
          type="button"
          onClick={() => setIsPickerOpen(true)}
          className="group relative cursor-pointer outline-none transition-transform hover:scale-105 active:scale-95"
          title="Change profile avatar"
        >
          <UserAvatar src={selectedAvatar} name={fullName} size="xl" className="size-24 ring-4 ring-card shadow-lg" />
          <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity">
            <HugeiconsIcon icon={Camera01Icon} className="size-6 text-white drop-shadow-md" />
          </div>
        </button>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-muted-foreground">Choose your avatar</span>
          <button
            type="button"
            onClick={() => setIsPickerOpen(true)}
            className="text-xs font-bold text-primary hover:underline"
          >
            Browse all (23)
          </button>
        </div>

        <div className="flex items-center gap-2.5">
          {FEATURED_AVATARS.map((img) => {
            const selected = selectedAvatar === img
            return (
              <button
                key={img}
                type="button"
                onClick={() => onAvatarChange(img)}
                aria-label="Avatar option"
                aria-pressed={selected}
                className={cn(
                  "rounded-full transition-all outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                  selected ? "scale-110 shadow-md ring-2 ring-primary ring-offset-2 ring-offset-card" : "opacity-70 hover:opacity-100"
                )}
              >
                <UserAvatar src={img} name="Avatar option" size="md" className="size-11" />
              </button>
            )
          })}

          <button
            type="button"
            onClick={() => setIsPickerOpen(true)}
            className="flex size-11 items-center justify-center rounded-full border-2 border-dashed border-primary/40 bg-primary/5 text-primary transition-all hover:bg-primary/10 hover:border-primary active:scale-95"
            title="Browse all 23 avatars"
            aria-label="Browse all avatars"
          >
            <span className="text-[11px] font-bold">+19</span>
          </button>
        </div>
      </div>

      <Dialog open={isPickerOpen} onOpenChange={setIsPickerOpen}>
        <DialogContent className="max-w-md rounded-3xl p-5">
          <DialogHeader>
            <DialogTitle>Choose Your Avatar</DialogTitle>
          </DialogHeader>
          <AvatarPicker
            selectedAvatar={selectedAvatar}
            onSelectAvatar={(src) => {
              onAvatarChange(src)
              setIsPickerOpen(false)
            }}
          />
        </DialogContent>
      </Dialog>

      <FieldGroup className="gap-4">
        <AuthInput
          id="profileName"
          label="Full name"
          icon={UserIcon}
          value={fullName}
          onChange={(e) => onFullNameChange(e.target.value)}
          placeholder="e.g. Rajeev Ranjan"
          required
        />

        <Field>
          <FieldLabel>JoySplit ID (unique)</FieldLabel>
          <Item variant="outline" className="bg-card">
            <ItemMedia className="size-7 rounded-lg bg-primary/10 text-xs font-bold text-primary">ID</ItemMedia>
            <ItemContent>
              <ItemTitle className="font-mono font-bold tracking-wider">{splitzyId}</ItemTitle>
            </ItemContent>
            <ItemActions>
              <Button variant="ghost" size="icon-sm" onClick={() => copy(splitzyId)} aria-label="Copy ID" title="Copy ID">
                <HugeiconsIcon icon={copied ? Tick02Icon : Copy01Icon} className={cn(copied && "text-success")} />
              </Button>
            </ItemActions>
          </Item>
          <FieldDescription className="text-xs">Friends use this unique ID to find and add you.</FieldDescription>
        </Field>

        <AuthInput
          id="upiId"
          label="UPI ID (optional)"
          icon={AtIcon}
          value={upiId}
          onChange={(e) => onUpiIdChange(e.target.value)}
          placeholder="yourname@upi"
          description="For receiving payments directly"
        />

        <Button size="lg" className="mt-2 h-11 w-full" onClick={handleComplete} disabled={updateProfile.isPending}>
          {updateProfile.isPending && <Spinner data-icon="inline-start" />}
          Continue
          <HugeiconsIcon icon={ArrowRight01Icon} data-icon="inline-end" />
        </Button>
      </FieldGroup>
    </>
  )
}
