"use client"

import * as React from "react"
import { Copy01Icon, QrCodeIcon, Share08Icon, Tick02Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { JoySplitQr } from "@/components/shared/joysplit-qr"
import { QrScannerDialog } from "@/components/shared/qr-scanner-dialog"
import { UserAvatar } from "@/components/shared/user-avatar"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard"
import { addFriendLink } from "@/lib/joysplit-id"
import type { UserProfile } from "@/lib/types"
import { cn } from "@/lib/utils"

/** Share the add-me link (falls back to copying the ID). */
export function useShareMyId(user: Pick<UserProfile, "splitzyId">) {
  const { copied, copy } = useCopyToClipboard()
  const share = () => {
    if (typeof navigator.share === "function") {
      navigator
        .share({
          title: "Add me on JoySplit",
          text: `Hey! Add me on JoySplit — my JoySplit ID is ${user.splitzyId}`,
          url: addFriendLink(user.splitzyId),
        })
        .catch(() => {})
    } else {
      copy(user.splitzyId)
    }
  }
  return { share, copy: () => copy(user.splitzyId), copied }
}

/**
 * Your JoySplit ID with its QR code for friends to scan, and a camera button
 * to scan theirs (which opens their profile with Add friend).
 */
export function MyIdDialog({
  user,
  open,
  onOpenChange,
}: {
  user: UserProfile
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { share, copy, copied } = useShareMyId(user)
  const [scanning, setScanning] = React.useState(false)

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>My JoySplit ID</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col items-center gap-4 text-center">
            <div className="flex items-center gap-3 self-stretch text-left">
              <UserAvatar src={user.photoURL} name={user.displayName} size="md" />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{user.displayName}</p>
                <p className="truncate text-xs text-muted-foreground">{user.email}</p>
              </div>
            </div>

            <JoySplitQr splitzyId={user.splitzyId} className="max-w-56" />

            <button
              type="button"
              onClick={copy}
              className="flex items-center gap-2 rounded-md px-2 py-1 font-mono text-lg font-semibold tracking-wider transition-colors hover:bg-muted"
              aria-label="Copy ID"
            >
              {user.splitzyId}
              <HugeiconsIcon
                icon={copied ? Tick02Icon : Copy01Icon}
                className={cn("size-4", copied ? "text-success" : "text-muted-foreground")}
              />
            </button>
            <p className="-mt-2 max-w-xs text-xs text-muted-foreground">
              Friends can scan this code or type your ID to add you.
            </p>

            <div className="grid w-full grid-cols-2 gap-2">
              <Button variant="outline" className="h-11" onClick={() => setScanning(true)}>
                <HugeiconsIcon icon={QrCodeIcon} data-icon="inline-start" />
                Scan a QR
              </Button>
              <Button className="h-11" onClick={share}>
                <HugeiconsIcon icon={Share08Icon} data-icon="inline-start" />
                Share
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <QrScannerDialog
        open={scanning}
        onOpenChange={(next) => {
          setScanning(next)
          // Scanning replaces this dialog; closing the scanner leaves both closed
          if (next) onOpenChange(false)
        }}
      />
    </>
  )
}
