"use client"

import { useRouter } from "nextjs-toploader/app"
import { Logout01Icon } from "@hugeicons/core-free-icons"

import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { useLogout } from "@/hooks/mutations"

export function LogoutDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const router = useRouter()
  const logout = useLogout()

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      icon={Logout01Icon}
      destructive
      title="Do you want to log out?"
      description="You will need to log back in to view your expenses and groups."
      confirmLabel="Log Out"
      isPending={logout.isPending}
      onConfirm={() =>
        logout.mutate(undefined, {
          onSuccess: () => {
            onOpenChange(false)
            router.replace("/login")
          },
        })
      }
    />
  )
}
