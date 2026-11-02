"use client"

import * as React from "react"
import { Attachment01Icon, Cancel01Icon, Pdf01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Spinner } from "@/components/ui/spinner"
import { useBillPicker, useObjectUrl } from "@/hooks/use-attachments"
import { ATTACHMENT_LIMITS, formatFileSize, isPdf, type PreparedAttachment } from "@/services/attachments"

/**
 * "Attach bill" on the add-expense form: a quiet row that opens the picker
 * (camera or files on phones), the chosen files as chips, and upload progress
 * once the expense is saved. Files upload after the expense is created.
 */
export function AttachBill({
  files,
  onFilesChange,
  progress,
  disabled,
}: {
  files: PreparedAttachment[]
  onFilesChange: (files: PreparedAttachment[]) => void
  /** 0..1 while uploading, otherwise null. */
  progress: number | null
  disabled?: boolean
}) {
  const remaining = ATTACHMENT_LIMITS.maxFiles - files.length
  const picker = useBillPicker({
    remaining,
    onPicked: (picked) => onFilesChange([...files, ...picked]),
    onError: (message) => toast.error(message),
  })
  const uploading = progress !== null

  return (
    <div className="flex flex-col gap-2">
      <input {...picker.inputProps} />

      {uploading ? (
        <div className="flex flex-col gap-1.5 rounded-lg border bg-card px-3 py-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium">Uploading bill…</span>
            <span className="text-muted-foreground tabular-nums">{Math.round(progress * 100)}%</span>
          </div>
          <Progress value={Math.round(progress * 100)} aria-label="Bill upload progress" />
        </div>
      ) : (
        remaining > 0 && (
          <button
            type="button"
            onClick={picker.open}
            disabled={disabled || picker.preparing}
            className="flex h-11 w-full items-center gap-2.5 rounded-lg border border-dashed px-3 text-left text-sm text-muted-foreground transition-colors outline-none hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50"
          >
            {picker.preparing ? <Spinner className="size-4" /> : <HugeiconsIcon icon={Attachment01Icon} className="size-4 shrink-0" />}
            <span className="font-medium">{picker.preparing ? "Preparing…" : files.length ? "Attach another" : "Attach bill"}</span>
            <span className="ml-auto truncate text-xs">Photo or PDF · optional</span>
          </button>
        )
      )}

      {files.length > 0 && (
        <ul className="flex flex-col gap-1.5">
          {files.map((file) => (
            <FileChip
              key={file.key}
              file={file}
              onRemove={uploading ? undefined : () => onFilesChange(files.filter((f) => f.key !== file.key))}
            />
          ))}
        </ul>
      )}
    </div>
  )
}

function FileChip({ file, onRemove }: { file: PreparedAttachment; onRemove?: () => void }) {
  const pdf = isPdf(file)
  const url = useObjectUrl(pdf ? null : file.blob)

  return (
    <li className="flex min-w-0 items-center gap-2.5 rounded-lg border bg-card p-1.5">
      <div className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted text-muted-foreground">
        {pdf ? (
          <HugeiconsIcon icon={Pdf01Icon} className="size-5 text-destructive" />
        ) : url ? (
          // eslint-disable-next-line @next/next/no-img-element -- local blob preview
          <img src={url} alt="" className="size-full object-cover" />
        ) : null}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium">{file.name}</p>
        <p className="text-[11px] text-muted-foreground">
          {pdf ? "PDF" : "Photo"} · {formatFileSize(file.blob.size)}
        </p>
      </div>
      {onRemove && (
        <Button type="button" variant="ghost" size="icon-xs" aria-label={`Remove ${file.name}`} onClick={onRemove}>
          <HugeiconsIcon icon={Cancel01Icon} />
        </Button>
      )}
    </li>
  )
}
