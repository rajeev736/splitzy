import { collection, doc, getDoc, getDocs, writeBatch } from "firebase/firestore"

import { AppError } from "@/lib/errors"
import type { UserProfile } from "@/lib/types"
import { getDb, nowIso } from "./shared"

/**
 * Bill attachments (photos / PDFs) on an expense. There's no Storage on the
 * free plan, so files live in Firestore like profile photos do — as base64,
 * split across chunk docs because a doc is at most 1 MiB:
 *
 *   expenses/{expenseId}/files/{slot}            meta (see `ExpenseAttachment`)
 *   expenses/{expenseId}/files/{slot}/chunks/{n} { data: <base64 slice> }
 *
 * `slot` is "1" | "2" | "3", which is how the rules cap an expense at 3 files.
 * A file's meta and all its chunks go in one batch, so it's either fully there
 * or not at all. Mirrors the attachment rules in firestore.rules.
 */

export const ATTACHMENT_LIMITS = {
  maxFiles: 3,
  /** Largest photo we'll try to compress. */
  maxImagePickBytes: 15 * 1024 * 1024,
  /** A compressed photo must end up at most this big. */
  maxImageBytes: 1.5 * 1024 * 1024,
  /** PDFs are stored as-is. */
  maxPdfBytes: 3 * 1024 * 1024,
  maxImageEdge: 2000,
  imageQuality: 0.82,
  /** base64 chars per chunk doc — comfortably under Firestore's 1 MiB doc limit. */
  chunkChars: 900_000,
} as const

const SLOTS = ["1", "2", "3"] as const

/** For `<input type="file" accept>`: photos (camera on phones) and PDFs. */
export const ATTACHMENT_ACCEPT = "image/*,application/pdf,.pdf,.heic,.heif"

export type AttachmentType = "image/jpeg" | "image/webp" | "application/pdf"

/** A file ready to upload: validated and, for photos, compressed. */
export interface PreparedAttachment {
  /** Local id for lists/keys before it's uploaded. */
  key: string
  name: string
  type: AttachmentType
  blob: Blob
}

export interface ExpenseAttachment {
  /** The slot doc id ("1" | "2" | "3"). */
  id: string
  expenseId: string
  name: string
  type: AttachmentType
  size: number
  chunks: number
  uploadedBy: string
  uploaderName: string
  createdAt: string
}

export const isPdf = (f: { type: string }) => f.type === "application/pdf"

export function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/* ── Picking: validate + compress ─────────────────────────────────────── */

const MB = (bytes: number) => `${Math.round((bytes / (1024 * 1024)) * 10) / 10} MB`

function kindOf(file: File): "image" | "pdf" | null {
  const type = file.type.toLowerCase()
  const ext = file.name.toLowerCase().split(".").pop() ?? ""
  if (type === "application/pdf" || ext === "pdf") return "pdf"
  if (["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"].includes(type)) return "image"
  // Some browsers leave HEIC photos untyped
  if (["jpg", "jpeg", "png", "webp", "heic", "heif"].includes(ext)) return "image"
  return null
}

/** Keeps names short and safe for a download, with the right extension. */
function cleanName(name: string, ext: string) {
  const base = name.replace(/\.[^.]+$/, "").replace(/[\\/:*?"<>|\u0000-\u001f]+/g, " ").trim() || "bill"
  return `${base.slice(0, 100)}.${ext}`
}

async function decodeImage(file: File): Promise<{ source: CanvasImageSource; width: number; height: number; close: () => void }> {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file)
      return { source: bitmap, width: bitmap.width, height: bitmap.height, close: () => bitmap.close() }
    } catch {
      // Fall through: <img> decodes some formats (e.g. HEIC on Safari) that bitmaps can't
    }
  }
  const url = URL.createObjectURL(file)
  try {
    const img = new Image()
    img.decoding = "async"
    img.src = url
    await img.decode()
    return { source: img, width: img.naturalWidth, height: img.naturalHeight, close: () => {} }
  } finally {
    URL.revokeObjectURL(url)
  }
}

const canvasToBlob = (canvas: HTMLCanvasElement, quality: number) =>
  new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality))

/**
 * Re-encodes a photo as JPEG (max 2000px long edge, ~0.82 quality), stepping
 * down until it fits. Re-encoding also drops EXIF data such as location.
 */
async function compressImage(file: File): Promise<Blob> {
  let decoded
  try {
    decoded = await decodeImage(file)
  } catch {
    throw new AppError(`"${file.name}" couldn't be opened. Try a JPEG or PNG photo.`)
  }
  try {
    const attempts: Array<[number, number]> = [
      [ATTACHMENT_LIMITS.maxImageEdge, ATTACHMENT_LIMITS.imageQuality],
      [ATTACHMENT_LIMITS.maxImageEdge, 0.7],
      [1600, 0.7],
      [1280, 0.65],
    ]
    for (const [edge, quality] of attempts) {
      const scale = Math.min(1, edge / Math.max(decoded.width, decoded.height))
      const canvas = document.createElement("canvas")
      canvas.width = Math.max(1, Math.round(decoded.width * scale))
      canvas.height = Math.max(1, Math.round(decoded.height * scale))
      const ctx = canvas.getContext("2d")
      if (!ctx) break
      // JPEG has no transparency: put PNG cut-outs on white, not black
      ctx.fillStyle = "#FFFFFF"
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(decoded.source, 0, 0, canvas.width, canvas.height)
      const blob = await canvasToBlob(canvas, quality)
      if (blob && blob.size <= ATTACHMENT_LIMITS.maxImageBytes) return blob
    }
  } finally {
    decoded.close()
  }
  throw new AppError(`"${file.name}" is too detailed to shrink under ${MB(ATTACHMENT_LIMITS.maxImageBytes)}.`)
}

async function looksLikePdf(file: Blob) {
  const head = new Uint8Array(await file.slice(0, 5).arrayBuffer())
  return String.fromCharCode(...head) === "%PDF-"
}

/** Validates a picked file and gets it ready to upload. Throws an AppError with a user-facing reason. */
export async function prepareAttachment(file: File): Promise<PreparedAttachment> {
  const key = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  const kind = kindOf(file)

  if (kind === "pdf") {
    if (file.size > ATTACHMENT_LIMITS.maxPdfBytes) {
      throw new AppError(`"${file.name}" is ${MB(file.size)}. PDFs can be up to ${MB(ATTACHMENT_LIMITS.maxPdfBytes)}.`)
    }
    if (file.size === 0 || !(await looksLikePdf(file))) throw new AppError(`"${file.name}" isn't a valid PDF.`)
    return { key, name: cleanName(file.name, "pdf"), type: "application/pdf", blob: file }
  }

  if (kind === "image") {
    if (file.size > ATTACHMENT_LIMITS.maxImagePickBytes) {
      throw new AppError(
        `"${file.name}" is ${MB(file.size)}. Photos can be up to ${MB(ATTACHMENT_LIMITS.maxImagePickBytes)}.`
      )
    }
    const blob = await compressImage(file)
    return { key, name: cleanName(file.name, "jpg"), type: "image/jpeg", blob }
  }

  throw new AppError(`"${file.name}" can't be attached. Add a photo (JPEG, PNG, WebP, HEIC) or a PDF.`)
}

/* ── Firestore ────────────────────────────────────────────────────────── */

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = String(reader.result ?? "")
      resolve(result.slice(result.indexOf(",") + 1))
    }
    reader.onerror = () => reject(reader.error ?? new Error("Could not read the file"))
    reader.readAsDataURL(blob)
  })
}

function base64ToBlob(base64: string, type: string): Blob {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return new Blob([bytes], { type })
}

const filesCol = (expenseId: string) => collection(getDb()!, "expenses", expenseId, "files")

export async function listAttachments(expenseId: string): Promise<ExpenseAttachment[]> {
  const firestore = getDb()
  if (!firestore) return []
  const snap = await getDocs(filesCol(expenseId))
  return snap.docs
    .map((d) => ({ ...(d.data() as Omit<ExpenseAttachment, "id" | "expenseId">), id: d.id, expenseId }))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
}

/**
 * Uploads files to an expense one after another. Each file is a single batch
 * (meta + chunks), so a failure never leaves a half-written file behind; files
 * that finished before a failure stay. `onProgress` gets 0..1 across all files.
 * Firestore doesn't report bytes sent, so progress within a file is estimated.
 */
export async function uploadAttachments(
  user: UserProfile,
  expenseId: string,
  files: PreparedAttachment[],
  onProgress?: (fraction: number) => void
): Promise<ExpenseAttachment[]> {
  const firestore = getDb()
  if (!firestore || files.length === 0) return []

  const existing = await listAttachments(expenseId)
  if (existing.length + files.length > ATTACHMENT_LIMITS.maxFiles) {
    const left = ATTACHMENT_LIMITS.maxFiles - existing.length
    throw new AppError(
      left > 0
        ? `You can add ${left} more file${left === 1 ? "" : "s"} to this expense.`
        : `An expense can have up to ${ATTACHMENT_LIMITS.maxFiles} files.`
    )
  }
  const freeSlots: string[] = SLOTS.filter((s) => !existing.some((f) => f.id === s))

  const totalBytes = files.reduce((sum, f) => sum + f.blob.size, 0) || 1
  let doneBytes = 0
  const report = (fileFraction: number, fileBytes: number) =>
    onProgress?.(Math.min(1, (doneBytes + fileFraction * fileBytes) / totalBytes))

  const uploaded: ExpenseAttachment[] = []
  for (const [i, file] of files.entries()) {
    const bytes = file.blob.size
    report(0.02, bytes)
    const base64 = await blobToBase64(file.blob)
    const parts: string[] = []
    for (let at = 0; at < base64.length; at += ATTACHMENT_LIMITS.chunkChars) {
      parts.push(base64.slice(at, at + ATTACHMENT_LIMITS.chunkChars))
    }

    const slot = freeSlots[i]
    const meta: Omit<ExpenseAttachment, "id" | "expenseId"> = {
      name: file.name,
      type: file.type,
      size: bytes,
      chunks: parts.length,
      uploadedBy: user.uid,
      uploaderName: (user.displayName || "").slice(0, 100),
      createdAt: nowIso(),
    }
    const metaRef = doc(firestore, "expenses", expenseId, "files", slot)
    const batch = writeBatch(firestore)
    parts.forEach((data, n) => batch.set(doc(metaRef, "chunks", String(n)), { data }))
    batch.set(metaRef, meta)

    // Ease towards 95% at a cautious ~150 KB/s until the server confirms
    report(0.1, bytes)
    const startedAt = Date.now()
    const expectedMs = Math.max(1500, (base64.length / 150_000) * 1000)
    const timer = setInterval(() => {
      const t = (Date.now() - startedAt) / expectedMs
      report(0.1 + 0.85 * (1 - Math.exp(-2 * t)), bytes)
    }, 250)
    try {
      await batch.commit()
    } finally {
      clearInterval(timer)
    }

    doneBytes += bytes
    report(0, 0)
    uploaded.push({ ...meta, id: slot, expenseId })
  }
  return uploaded
}

/** Reads a file's chunks and rebuilds it. Only call when the user opens or downloads it. */
export async function downloadAttachment(file: ExpenseAttachment): Promise<Blob> {
  const firestore = getDb()
  if (!firestore) throw new AppError("Bills can't be opened offline in demo mode")
  const metaRef = doc(firestore, "expenses", file.expenseId, "files", file.id)
  const snaps = await Promise.all(
    Array.from({ length: file.chunks }, (_, n) => getDoc(doc(metaRef, "chunks", String(n))))
  )
  const parts = snaps.map((s) => s.data()?.data)
  if (parts.some((p) => typeof p !== "string")) throw new AppError("This file is incomplete. Ask them to upload it again.")
  return base64ToBlob(parts.join(""), file.type)
}

/** Removes a file you uploaded, chunks and all, in one batch. */
export async function deleteAttachment(user: UserProfile, file: ExpenseAttachment) {
  if (file.uploadedBy !== user.uid) throw new AppError("Only the person who added this file can remove it")
  const firestore = getDb()
  if (!firestore) return
  const metaRef = doc(firestore, "expenses", file.expenseId, "files", file.id)
  const batch = writeBatch(firestore)
  for (let n = 0; n < file.chunks; n++) batch.delete(doc(metaRef, "chunks", String(n)))
  batch.delete(metaRef)
  await batch.commit()
}
