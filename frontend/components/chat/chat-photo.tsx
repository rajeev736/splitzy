"use client"

import * as React from "react"
import { createPortal } from "react-dom"
import {
  Cancel01Icon,
  Download01Icon,
  Image01Icon,
  SentIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { useBackToClose } from "@/hooks/use-back-to-close"
import { MESSAGE_MAX, type PhotoMeta } from "@/lib/chat"
import { compressPhoto, type CompressedPhoto } from "@/lib/chat-photo"
import { cn } from "@/lib/utils"

/** Keeps a photo bubble's shape sensible: no ultra-tall or ultra-wide strips. */
const ratioOf = (p: PhotoMeta) => Math.min(1.9, Math.max(0.75, p.w / p.h))

/**
 * A photo in a bubble: its blurred preview at once, the real thing only once
 * the bubble scrolls into view (so a long chat doesn't download every photo).
 */
export function PhotoThumb({
  photo,
  load,
  onOpen,
  className,
  children,
}: {
  photo: PhotoMeta
  load: () => Promise<string | null>
  onOpen: (src: string) => void
  className?: string
  /** Overlaid on the photo (the time, when there's no caption). */
  children?: React.ReactNode
}) {
  const box = React.useRef<HTMLButtonElement>(null)
  const [src, setSrc] = React.useState<string | null>(null)
  const [failed, setFailed] = React.useState(false)
  const loadRef = React.useRef(load)
  React.useEffect(() => {
    loadRef.current = load
  })

  React.useEffect(() => {
    const el = box.current
    if (!el || src) return
    let cancelled = false
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return
        io.disconnect()
        void loadRef.current().then((data) => {
          if (cancelled) return
          if (data) setSrc(data)
          else setFailed(true)
        })
      },
      { rootMargin: "300px 0px" }
    )
    io.observe(el)
    return () => {
      cancelled = true
      io.disconnect()
    }
  }, [src])

  return (
    <button
      ref={box}
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        if (src) onOpen(src)
      }}
      aria-label="Open photo"
      className={cn(
        "relative block w-[260px] max-w-full overflow-hidden rounded-[10px] bg-muted",
        className
      )}
      style={{ aspectRatio: ratioOf(photo) }}
    >
      {photo.thumb && (
        // eslint-disable-next-line @next/next/no-img-element -- a tiny inline data URL
        <img
          src={photo.thumb}
          alt=""
          aria-hidden
          className="absolute inset-0 size-full scale-110 object-cover blur-lg"
        />
      )}
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element -- data URL from the database
        <img
          src={src}
          alt="Photo"
          draggable={false}
          className="absolute inset-0 size-full object-cover duration-300 animate-in fade-in-0"
        />
      ) : (
        <span className="absolute inset-0 flex items-center justify-center">
          <span className="flex size-11 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur-sm">
            {failed ? (
              <HugeiconsIcon icon={Image01Icon} className="size-5" />
            ) : (
              <Spinner className="size-5" />
            )}
          </span>
        </span>
      )}
      {children}
    </button>
  )
}

/** Full-screen photo, closed by the X, a tap on the backdrop, Escape or back. */
export function PhotoViewer({
  src,
  title,
  subtitle,
  onClose,
}: {
  src: string | null
  title: string
  subtitle?: string
  onClose: () => void
}) {
  const open = !!src
  useBackToClose(open, onClose)
  React.useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose()
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, onClose])
  if (!src) return null

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Photo"
      className="fixed inset-0 z-[60] flex flex-col bg-black/95 text-white duration-200 animate-in fade-in-0"
      onClick={onClose}
    >
      <div
        className="flex items-center gap-2 px-2 pt-[max(0.5rem,env(safe-area-inset-top))] pb-2"
        onClick={(e) => e.stopPropagation()}
      >
        <Button
          variant="ghost"
          size="icon"
          aria-label="Close"
          className="text-white hover:bg-white/10 hover:text-white"
          onClick={onClose}
        >
          <HugeiconsIcon icon={Cancel01Icon} className="size-5" />
        </Button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{title}</p>
          {subtitle && (
            <p className="truncate text-xs text-white/60">{subtitle}</p>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Save photo"
          className="text-white hover:bg-white/10 hover:text-white"
          nativeButton={false}
          render={
            <a
              href={src}
              download={`joysplit-photo.${src.startsWith("data:image/webp") ? "webp" : "jpg"}`}
            />
          }
        >
          <HugeiconsIcon icon={Download01Icon} className="size-5" />
        </Button>
      </div>
      <div className="flex min-h-0 flex-1 items-center justify-center p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        {/* eslint-disable-next-line @next/next/no-img-element -- data URL from the database */}
        <img
          src={src}
          alt="Photo"
          className="max-h-full max-w-full object-contain duration-200 animate-in zoom-in-95"
          onClick={(e) => e.stopPropagation()}
        />
      </div>
    </div>,
    document.body
  )
}

/**
 * The step between picking a photo and sending it: it's compressed here, shown
 * full size, and can get a caption.
 */
export function PhotoDraft({
  file,
  onCancel,
  onSend,
  replyBar,
}: {
  file: File | null
  onCancel: () => void
  onSend: (photo: CompressedPhoto, caption: string) => void
  /** "Replying to …" when the photo answers a message. */
  replyBar?: React.ReactNode
}) {
  const [state, setState] = React.useState<{
    file: File
    photo: CompressedPhoto | null
  } | null>(null)
  const [caption, setCaption] = React.useState("")
  useBackToClose(!!file, onCancel)
  // The latest onCancel, so a re-render doesn't restart the compression
  const cancelRef = React.useRef(onCancel)
  React.useEffect(() => {
    cancelRef.current = onCancel
  })

  React.useEffect(() => {
    if (!file) return
    let cancelled = false
    compressPhoto(file)
      .then((photo) => !cancelled && setState({ file, photo }))
      .catch((e: unknown) => {
        if (cancelled) return
        toast.error(e instanceof Error ? e.message : "Couldn't read that photo")
        cancelRef.current()
      })
    return () => {
      cancelled = true
    }
  }, [file])

  if (!file) return null
  const photo = state?.file === file ? state.photo : null
  const send = () => {
    if (!photo) return
    onSend(photo, caption)
    setCaption("")
  }

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Send a photo"
      className="fixed inset-0 z-[60] flex flex-col bg-black text-white duration-200 animate-in fade-in-0"
    >
      <div className="flex items-center gap-2 px-2 pt-[max(0.5rem,env(safe-area-inset-top))] pb-2">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Cancel"
          className="text-white hover:bg-white/10 hover:text-white"
          onClick={onCancel}
        >
          <HugeiconsIcon icon={Cancel01Icon} className="size-5" />
        </Button>
        <p className="text-sm font-semibold">Send photo</p>
      </div>
      <div className="flex min-h-0 flex-1 items-center justify-center p-3">
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element -- local data URL
          <img
            src={photo.dataUrl}
            alt="Photo to send"
            className="max-h-full max-w-full rounded-lg object-contain"
          />
        ) : (
          <Spinner className="size-6 text-white/80" />
        )}
      </div>
      <div className="mx-auto w-full max-w-3xl px-3 pt-1 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        {replyBar}
        <form
          className="flex items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            send()
          }}
        >
          <input
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Add a caption"
            maxLength={MESSAGE_MAX}
            autoComplete="off"
            enterKeyHint="send"
            className="h-11 min-w-0 flex-1 rounded-full bg-white/12 px-4 text-[15px] text-white outline-none placeholder:text-white/50 focus:bg-white/16"
          />
          <Button
            type="submit"
            size="icon"
            aria-label="Send photo"
            disabled={!photo}
            className="size-11 shrink-0 rounded-full"
          >
            <HugeiconsIcon icon={SentIcon} className="size-5" />
          </Button>
        </form>
        {photo && (
          <p className="mt-1.5 text-center text-[11px] text-white/45">
            {photo.w} × {photo.h} · {Math.round((photo.dataUrl.length * 0.75) / 1024)} KB
          </p>
        )}
      </div>
    </div>,
    document.body
  )
}
