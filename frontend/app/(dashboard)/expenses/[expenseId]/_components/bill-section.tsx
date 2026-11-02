"use client"

import * as React from "react"
import {
  Add01Icon,
  Cancel01Icon,
  Delete02Icon,
  Download04Icon,
  Image01Icon,
  LinkSquare02Icon,
  Pdf01Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { toast } from "sonner"

import { useSession } from "@/components/providers/session-provider"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Spinner } from "@/components/ui/spinner"
import {
  useAttachmentBlob,
  useBillPicker,
  useDeleteAttachment,
  useExpenseAttachments,
  useObjectUrl,
  useUploadAttachments,
} from "@/hooks/use-attachments"
import { getErrorMessage } from "@/lib/errors"
import type { Expense } from "@/lib/types"
import { cn } from "@/lib/utils"
import { ATTACHMENT_LIMITS, formatFileSize, isPdf, type ExpenseAttachment } from "@/services/attachments"

/**
 * The bill photos / PDFs on an expense. Everyone who can see the expense can
 * view and download them; its creator or payer can add more (up to 3) and
 * remove their own. File bytes load only when a file is opened — or, for a
 * photo thumbnail, once it scrolls into view.
 */
export function BillSection({ expense }: { expense: Expense }) {
  const { user } = useSession()
  const files = useExpenseAttachments(expense.id)
  const upload = useUploadAttachments({ errorMessage: false })
  const [progress, setProgress] = React.useState<number | null>(null)
  const [openId, setOpenId] = React.useState<string | null>(null)

  const list = files.data ?? []
  const canAdd =
    !!user && !expense.deletedAt && (expense.createdBy === user.uid || expense.payerId === user.uid)
  const remaining = ATTACHMENT_LIMITS.maxFiles - list.length

  const picker = useBillPicker({
    remaining,
    onError: (message) => toast.error(message),
    onPicked: (picked) => {
      setProgress(0)
      upload.mutate(
        { expenseId: expense.id, files: picked, onProgress: setProgress },
        {
          onSuccess: (added) => toast.success(added.length === 1 ? "Bill added" : `${added.length} files added`),
          onError: (err) => toast.error(getErrorMessage(err, "Couldn't upload the bill. Please try again.")),
          onSettled: () => setProgress(null),
        }
      )
    },
  })

  if (files.isError) {
    return (
      <Card size="sm">
        <CardContent className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
          <span>Couldn&apos;t load the bill.</span>
          <Button variant="outline" size="xs" onClick={() => files.refetch()}>
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }
  // Nothing to show (or still loading): keep the page quiet
  if (!files.isSuccess || (list.length === 0 && !canAdd)) return null

  const busy = progress !== null || picker.preparing
  const openFile = list.find((f) => f.id === openId) ?? null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-semibold">Bill</CardTitle>
        <CardAction className="text-xs text-muted-foreground">
          {list.length === 0 ? "Photo or PDF" : `${list.length} of ${ATTACHMENT_LIMITS.maxFiles}`}
        </CardAction>
      </CardHeader>
      <CardContent>
        <input {...picker.inputProps} />
        <ul className="grid grid-cols-3 gap-2.5">
          {list.map((file) => (
            <li key={`${file.id}_${file.createdAt}`} className="min-w-0">
              <BillTile file={file} onOpen={() => setOpenId(file.id)} />
            </li>
          ))}
          {canAdd && (remaining > 0 || busy) && (
            <li className="min-w-0">
              <button
                type="button"
                onClick={picker.open}
                disabled={busy}
                className="flex aspect-square w-full flex-col items-center justify-center gap-1 rounded-lg border border-dashed text-xs text-muted-foreground transition-colors outline-none hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none"
              >
                {busy ? <Spinner className="size-5" /> : <HugeiconsIcon icon={Add01Icon} className="size-5" />}
                <span className="font-medium tabular-nums">
                  {progress !== null ? `${Math.round(progress * 100)}%` : picker.preparing ? "Preparing" : "Add bill"}
                </span>
              </button>
            </li>
          )}
        </ul>
      </CardContent>

      <BillViewer
        file={openFile}
        canDelete={!!openFile && openFile.uploadedBy === user?.uid}
        onClose={() => setOpenId(null)}
      />
    </Card>
  )
}

/** True once the element has been on screen (then stays true). */
function useSeen<T extends Element>() {
  const ref = React.useRef<T>(null)
  const [seen, setSeen] = React.useState(false)
  React.useEffect(() => {
    const el = ref.current
    if (!el || seen) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) setSeen(true)
      },
      { rootMargin: "100px" }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [seen])
  return [ref, seen] as const
}

function BillTile({ file, onOpen }: { file: ExpenseAttachment; onOpen: () => void }) {
  const pdf = isPdf(file)
  const [ref, seen] = useSeen<HTMLButtonElement>()
  const blob = useAttachmentBlob(file, !pdf && seen)
  const url = useObjectUrl(pdf ? null : blob.data)

  return (
    <div className="flex min-w-0 flex-col gap-1">
      <button
        ref={ref}
        type="button"
        onClick={onOpen}
        aria-label={`Open ${file.name}`}
        className="relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-lg border bg-muted text-muted-foreground transition-opacity outline-none hover:opacity-90 focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        {pdf ? (
          <span className="flex flex-col items-center gap-1">
            <HugeiconsIcon icon={Pdf01Icon} className="size-7 text-destructive" />
            <span className="text-[11px] font-semibold tracking-wide">PDF</span>
          </span>
        ) : url ? (
          // eslint-disable-next-line @next/next/no-img-element -- blob thumbnail
          <img src={url} alt="" className="size-full object-cover" />
        ) : blob.isError ? (
          <HugeiconsIcon icon={Image01Icon} className="size-6" />
        ) : (
          <span className="size-full animate-pulse bg-muted-foreground/10" />
        )}
      </button>
      <div className="min-w-0 px-0.5">
        <p className="truncate text-[11px] font-medium">{file.name}</p>
        <p className="truncate text-[10px] text-muted-foreground">{formatFileSize(file.size)}</p>
      </div>
    </div>
  )
}

/** Full-screen viewer: photos fit to screen (tap to zoom), PDFs open in a new tab. */
function BillViewer({
  file,
  canDelete,
  onClose,
}: {
  file: ExpenseAttachment | null
  canDelete: boolean
  onClose: () => void
}) {
  return (
    <Dialog open={!!file} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="top-0 left-0 flex h-dvh w-screen max-w-none translate-x-0 translate-y-0 flex-col gap-0 rounded-none bg-black p-0 text-white ring-0 sm:max-w-none"
      >
        {/* The body remounts per file, so zoom and loaded bytes never leak between files */}
        {file && <ViewerBody key={`${file.id}_${file.createdAt}`} file={file} canDelete={canDelete} onClose={onClose} />}
      </DialogContent>
    </Dialog>
  )
}

function ViewerBody({ file, canDelete, onClose }: { file: ExpenseAttachment; canDelete: boolean; onClose: () => void }) {
  const pdf = isPdf(file)
  const blob = useAttachmentBlob(file)
  const url = useObjectUrl(blob.data)
  const [zoomed, setZoomed] = React.useState(false)
  const [confirmDelete, setConfirmDelete] = React.useState(false)
  const remove = useDeleteAttachment({ successMessage: "File removed" })

  const iconLink = buttonVariants({ variant: "ghost", size: "icon-sm", className: "text-white hover:bg-white/10 hover:text-white" })

  return (
    <>
      <div className="flex shrink-0 items-center gap-1 border-b border-white/10 px-2 py-2 pt-[max(0.5rem,env(safe-area-inset-top))]">
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Close"
          className="text-white hover:bg-white/10 hover:text-white"
          onClick={onClose}
        >
          <HugeiconsIcon icon={Cancel01Icon} />
        </Button>
        <div className="min-w-0 flex-1 px-1">
          <DialogTitle className="truncate text-sm font-medium text-white">{file.name}</DialogTitle>
          <p className="truncate text-[11px] text-white/60">
            {formatFileSize(file.size)} · Added by {file.uploaderName || "someone"}
          </p>
        </div>
        {url ? (
          <a href={url} download={file.name} aria-label="Download" title="Download" className={iconLink}>
            <HugeiconsIcon icon={Download04Icon} />
          </a>
        ) : (
          <span className={cn(iconLink, "pointer-events-none opacity-50")} aria-hidden>
            <HugeiconsIcon icon={Download04Icon} />
          </span>
        )}
        {canDelete && (
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Remove file"
            title="Remove file"
            className="text-white hover:bg-white/10 hover:text-red-300"
            onClick={() => setConfirmDelete(true)}
          >
            <HugeiconsIcon icon={Delete02Icon} />
          </Button>
        )}
      </div>

      <div className={cn("relative min-h-0 flex-1", zoomed ? "overflow-auto" : "flex items-center justify-center overflow-hidden p-3")}>
        {blob.isError ? (
          <div className="flex flex-col items-center gap-3 px-6 text-center text-sm text-white/80">
            <p>{getErrorMessage(blob.error, "Couldn't open this file.")}</p>
            <Button variant="outline" size="sm" className="border-white/20 bg-transparent text-white" onClick={() => blob.refetch()}>
              Try again
            </Button>
          </div>
        ) : !url ? (
          <Spinner className="size-6 text-white/70" />
        ) : pdf ? (
          <div className="flex flex-col items-center gap-4 px-6 text-center">
            <div className="flex size-20 items-center justify-center rounded-2xl bg-white/10">
              <HugeiconsIcon icon={Pdf01Icon} className="size-10 text-red-300" />
            </div>
            <div className="max-w-full">
              <p className="truncate text-sm font-medium">{file.name}</p>
              <p className="text-xs text-white/60">PDF · {formatFileSize(file.size)}</p>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              <a href={url} target="_blank" rel="noopener noreferrer" className={buttonVariants({ size: "sm" })}>
                <HugeiconsIcon icon={LinkSquare02Icon} data-icon="inline-start" />
                Open PDF
              </a>
              <a
                href={url}
                download={file.name}
                className={buttonVariants({ size: "sm", variant: "outline", className: "border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white" })}
              >
                <HugeiconsIcon icon={Download04Icon} data-icon="inline-start" />
                Download
              </a>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setZoomed((z) => !z)}
            aria-label={zoomed ? "Fit to screen" : "Zoom in"}
            className={cn("outline-none", zoomed ? "block w-[200%] max-w-none cursor-zoom-out" : "flex size-full items-center justify-center cursor-zoom-in")}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- blob image */}
            <img
              src={url}
              alt={file.name}
              className={zoomed ? "block h-auto w-full" : "max-h-full max-w-full object-contain"}
            />
          </button>
        )}
      </div>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Remove this file?"
        description="It will be removed from the expense for everyone."
        confirmLabel="Remove"
        destructive
        icon={Delete02Icon}
        isPending={remove.isPending}
        onConfirm={() =>
          remove.mutate(file, {
            onSuccess: () => {
              setConfirmDelete(false)
              onClose()
            },
          })
        }
      />
    </>
  )
}
