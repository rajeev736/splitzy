"use client"

import * as React from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { useSession } from "@/components/providers/session-provider"
import { AppError } from "@/lib/errors"
import { queryKeys } from "@/lib/query/keys"
import * as attachmentService from "@/services/attachments"
import type { ExpenseAttachment, PreparedAttachment } from "@/services/attachments"
import type { MutationToastOptions } from "./mutations"

/** Bill attachments on an expense (meta only — no file bytes). */
export function useExpenseAttachments(expenseId: string | undefined) {
  const { user } = useSession()
  return useQuery({
    queryKey: queryKeys.expenseFiles(user?.uid ?? "", expenseId ?? ""),
    queryFn: () => attachmentService.listAttachments(expenseId!),
    enabled: !!user && !!expenseId,
    staleTime: 60 * 1000,
    meta: { errorMessage: false },
  })
}

/**
 * One attachment's bytes as a Blob. Stays idle until `enabled` (the user opened
 * it, or its thumbnail scrolled into view); kept briefly since files are large.
 */
export function useAttachmentBlob(file: ExpenseAttachment | null | undefined, enabled = true) {
  const { user } = useSession()
  return useQuery({
    queryKey: queryKeys.expenseFile(user?.uid ?? "", file?.expenseId ?? "", file?.id ?? "", file?.createdAt ?? ""),
    queryFn: () => attachmentService.downloadAttachment(file!),
    enabled: enabled && !!user && !!file,
    staleTime: Infinity,
    gcTime: 5 * 60 * 1000,
    meta: { errorMessage: false },
  })
}

/** An object URL for a Blob, revoked when the Blob changes or the component unmounts. */
export function useObjectUrl(blob: Blob | null | undefined) {
  const [entry, setEntry] = React.useState<{ blob: Blob; url: string } | null>(null)
  React.useEffect(() => {
    if (!blob) return
    const url = URL.createObjectURL(blob)
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the URL is an external resource created here
    setEntry({ blob, url })
    return () => URL.revokeObjectURL(url)
  }, [blob])
  return entry && entry.blob === blob ? entry.url : null
}

/** Upload prepared files to an expense; `onProgress` gets 0..1 across all of them. */
export function useUploadAttachments(options: MutationToastOptions = {}) {
  const qc = useQueryClient()
  const { user } = useSession()
  return useMutation({
    mutationFn: (v: { expenseId: string; files: PreparedAttachment[]; onProgress?: (fraction: number) => void }) => {
      if (!user) throw new AppError("Please log in first")
      return attachmentService.uploadAttachments(user, v.expenseId, v.files, v.onProgress)
    },
    onSuccess: (added, { expenseId }) => {
      if (!user) return
      qc.setQueryData<ExpenseAttachment[]>(queryKeys.expenseFiles(user.uid, expenseId), (prev) => [
        ...(prev ?? []).filter((f) => !added.some((a) => a.id === f.id)),
        ...added,
      ])
    },
    // Files that finished before a failure are saved: pick them up too
    onError: (_e, { expenseId }) => {
      if (user) void qc.invalidateQueries({ queryKey: queryKeys.expenseFiles(user.uid, expenseId) })
    },
    meta: options,
  })
}

export function useDeleteAttachment(options: MutationToastOptions = {}) {
  const qc = useQueryClient()
  const { user } = useSession()
  return useMutation({
    mutationFn: (file: ExpenseAttachment) => {
      if (!user) throw new AppError("Please log in first")
      return attachmentService.deleteAttachment(user, file)
    },
    onSuccess: (_d, file) => {
      if (!user) return
      qc.setQueryData<ExpenseAttachment[]>(queryKeys.expenseFiles(user.uid, file.expenseId), (prev) =>
        (prev ?? []).filter((f) => f.id !== file.id)
      )
      qc.removeQueries({ queryKey: queryKeys.expenseFile(user.uid, file.expenseId, file.id, file.createdAt) })
    },
    meta: options,
  })
}

/**
 * The hidden file input behind "Attach bill": validates and compresses picks,
 * toasting anything rejected, then hands the good ones to `onPicked`.
 */
export function useBillPicker({
  remaining,
  onPicked,
  onError,
}: {
  remaining: number
  onPicked: (files: PreparedAttachment[]) => void
  onError: (message: string) => void
}) {
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [preparing, setPreparing] = React.useState(false)

  const onChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files ?? [])
    e.target.value = ""
    if (picked.length === 0) return
    if (picked.length > remaining) {
      onError(
        remaining > 0
          ? `You can attach ${remaining} more file${remaining === 1 ? "" : "s"} (up to ${attachmentService.ATTACHMENT_LIMITS.maxFiles}).`
          : `Up to ${attachmentService.ATTACHMENT_LIMITS.maxFiles} files per expense.`
      )
    }
    setPreparing(true)
    const ready: PreparedAttachment[] = []
    for (const file of picked.slice(0, Math.max(0, remaining))) {
      try {
        ready.push(await attachmentService.prepareAttachment(file))
      } catch (err) {
        onError(err instanceof AppError ? err.message : `"${file.name}" couldn't be attached.`)
      }
    }
    setPreparing(false)
    if (ready.length) onPicked(ready)
  }

  return {
    preparing,
    open: () => inputRef.current?.click(),
    inputProps: {
      ref: inputRef,
      type: "file" as const,
      accept: attachmentService.ATTACHMENT_ACCEPT,
      multiple: remaining > 1,
      className: "hidden",
      tabIndex: -1,
      "aria-hidden": true,
      onChange,
    },
  }
}
