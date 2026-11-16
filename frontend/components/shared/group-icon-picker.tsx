"use client"

import * as React from "react"
import {
  AlertCircleIcon,
  ArrowLeft01Icon,
  Image01Icon,
  Tick02Icon,
  ZoomInAreaIcon,
  ZoomOutAreaIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { BottomSheet } from "@/components/shared/bottom-sheet"
import {
  GROUP_ICONS,
  GROUP_ILLUSTRATIONS,
  GroupIcon,
  isUploadedGroupIcon,
} from "@/components/shared/group-icon"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { cn } from "@/lib/utils"

/** Uploaded icons: 256×256, kept small enough to live on the group doc (rules allow 60k chars). */
const EXPORT_SIZE = 256
const TARGET_CHARS = 48_000
const MAX_CHARS = 58_000
const PREVIEW_SIZE = 240

/**
 * Group icon chooser, like the profile photo one: upload a picture from the
 * device (square crop with pan + zoom), or pick an illustration or photo.
 * `onSelect` gets an asset path or a small data URL; the sheet closes after.
 */
export function GroupIconPicker({
  open,
  onOpenChange,
  value,
  onSelect,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  value?: string
  onSelect: (icon: string) => void | Promise<void>
}) {
  const [image, setImage] = React.useState<HTMLImageElement | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const fileRef = React.useRef<HTMLInputElement>(null)

  const close = (next: boolean) => {
    onOpenChange(next)
    if (!next) {
      setImage(null)
      setError(null)
    }
  }

  const choose = async (icon: string) => {
    try {
      await onSelect(icon)
    } catch {
      return // the mutation already showed the error; keep the sheet open to try again
    }
    close(false)
  }

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null)
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image (JPEG, PNG or WebP).")
      return
    }
    if (file.size > 15 * 1024 * 1024) {
      setError("That image is over 15 MB. Please choose a smaller one.")
      return
    }
    const url = URL.createObjectURL(file)
    const img = new window.Image()
    img.onload = () => {
      URL.revokeObjectURL(url) // decoded already; the canvas draws from memory
      setImage(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      setError("Couldn't open that image. Please try another one.")
    }
    img.src = url
  }

  return (
    <BottomSheet
      open={open}
      onOpenChange={close}
      title={image ? "Crop picture" : "Group icon"}
      description={
        image
          ? "Drag to move, use the slider to zoom."
          : "Upload a picture or pick an illustration."
      }
    >
      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/heic,image/heif"
        className="hidden"
        onChange={handleFile}
      />

      {image ? (
        <Cropper
          image={image}
          onCancel={() => setImage(null)}
          onDone={(dataUrl) => choose(dataUrl)}
          onError={setError}
          error={error}
        />
      ) : (
        <div className="flex flex-col gap-5 pb-4">
          {error && (
            <Alert variant="destructive">
              <HugeiconsIcon icon={AlertCircleIcon} />
              <AlertDescription className="text-xs">{error}</AlertDescription>
            </Alert>
          )}

          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex items-center gap-3 rounded-lg border border-dashed bg-card p-3 text-left transition-colors hover:bg-muted/60"
          >
            {isUploadedGroupIcon(value) ? (
              <GroupIcon
                src={value}
                alt="Current picture"
                size="md"
                className="ring-2 ring-primary ring-offset-2 ring-offset-background"
              />
            ) : (
              <span className="flex size-12 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                <HugeiconsIcon icon={Image01Icon} className="size-6" />
              </span>
            )}
            <span className="min-w-0">
              <span className="block text-sm font-semibold">
                {isUploadedGroupIcon(value)
                  ? "Upload a different picture"
                  : "Upload from device"}
              </span>
              <span className="block text-xs text-muted-foreground">
                A photo of your gang, your flat, your trip…
              </span>
            </span>
          </button>

          <IconGrid
            title="Illustrations"
            icons={GROUP_ILLUSTRATIONS}
            value={value}
            onPick={choose}
          />
          <IconGrid
            title="Photos"
            icons={GROUP_ICONS}
            value={value}
            onPick={choose}
          />
        </div>
      )}
    </BottomSheet>
  )
}

function IconGrid({
  title,
  icons,
  value,
  onPick,
}: {
  title: string
  icons: readonly { id: string; label: string }[]
  value?: string
  onPick: (id: string) => void | Promise<void>
}) {
  const [busy, setBusy] = React.useState<string | null>(null)
  return (
    <section className="flex flex-col gap-2.5">
      <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        {title}
      </h3>
      <div className="grid grid-cols-4 gap-x-2 gap-y-3 min-[400px]:grid-cols-5 sm:grid-cols-6">
        {icons.map((icon) => {
          const selected = value === icon.id
          return (
            <button
              key={icon.id}
              type="button"
              aria-pressed={selected}
              aria-label={icon.label}
              disabled={!!busy}
              onClick={async () => {
                setBusy(icon.id)
                try {
                  await onPick(icon.id)
                } finally {
                  setBusy(null)
                }
              }}
              className="group flex min-w-0 flex-col items-center gap-1.5 rounded-lg outline-none disabled:opacity-100"
            >
              <span className="relative aspect-square w-full max-w-16">
                <GroupIcon
                  src={icon.id}
                  alt=""
                  className={cn(
                    "size-full rounded-xl transition-transform group-active:scale-95",
                    selected &&
                      "ring-2 ring-primary ring-offset-2 ring-offset-background"
                  )}
                />
                {(selected || busy === icon.id) && (
                  <span className="absolute -top-1 -right-1 flex size-5 items-center justify-center rounded-full border-2 border-background bg-primary text-primary-foreground">
                    {busy === icon.id ? (
                      <Spinner className="size-3" />
                    ) : (
                      <HugeiconsIcon
                        icon={Tick02Icon}
                        className="size-3"
                        strokeWidth={3}
                      />
                    )}
                  </span>
                )}
              </span>
              <span className="w-full truncate text-center text-[11px] font-medium text-muted-foreground group-aria-pressed:text-foreground">
                {icon.label}
              </span>
            </button>
          )
        })}
      </div>
    </section>
  )
}

/** Square crop with pan + zoom, exported as a small WebP (JPEG where WebP can't be encoded). */
function Cropper({
  image,
  onCancel,
  onDone,
  onError,
  error,
}: {
  image: HTMLImageElement
  onCancel: () => void
  onDone: (dataUrl: string) => Promise<void>
  onError: (message: string | null) => void
  error: string | null
}) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null)
  const [zoom, setZoom] = React.useState(1)
  const [pan, setPan] = React.useState({ x: 0, y: 0 })
  const [saving, setSaving] = React.useState(false)
  const drag = React.useRef<{
    x: number
    y: number
    px: number
    py: number
  } | null>(null)

  // Size of the image drawn into a `size` square: covers it, times zoom
  const layout = React.useCallback(
    (size: number, z: number) => {
      const scale = Math.max(size / image.width, size / image.height) * z
      return { w: image.width * scale, h: image.height * scale }
    },
    [image]
  )

  // Never let the picture leave a gap at the edges
  const clamp = React.useCallback(
    (p: { x: number; y: number }, z: number) => {
      const { w, h } = layout(PREVIEW_SIZE, z)
      const mx = (w - PREVIEW_SIZE) / 2
      const my = (h - PREVIEW_SIZE) / 2
      return {
        x: Math.max(-mx, Math.min(mx, p.x)),
        y: Math.max(-my, Math.min(my, p.y)),
      }
    },
    [layout]
  )

  const draw = React.useCallback(
    (canvas: HTMLCanvasElement, size: number) => {
      const ctx = canvas.getContext("2d")
      if (!ctx) return
      const ratio = size / PREVIEW_SIZE
      const { w, h } = layout(size, zoom)
      ctx.fillStyle = "#ffffff"
      ctx.fillRect(0, 0, size, size)
      ctx.imageSmoothingQuality = "high"
      ctx.drawImage(
        image,
        (size - w) / 2 + pan.x * ratio,
        (size - h) / 2 + pan.y * ratio,
        w,
        h
      )
    },
    [image, layout, pan, zoom]
  )

  React.useEffect(() => {
    if (canvasRef.current) draw(canvasRef.current, PREVIEW_SIZE * 2)
  }, [draw])

  const exportIcon = (): string => {
    const canvas = document.createElement("canvas")
    canvas.width = EXPORT_SIZE
    canvas.height = EXPORT_SIZE
    draw(canvas, EXPORT_SIZE)
    let best = ""
    for (const type of ["image/webp", "image/jpeg"]) {
      for (const quality of [0.85, 0.75, 0.65, 0.5, 0.4]) {
        const url = canvas.toDataURL(type, quality)
        if (!url.startsWith(`data:${type}`)) break // this browser can't encode it
        if (!best || url.length < best.length) best = url
        if (url.length <= TARGET_CHARS) return url
      }
    }
    if (!best || best.length > MAX_CHARS)
      throw new Error(
        "Couldn't make this picture small enough. Try another one."
      )
    return best
  }

  const save = async () => {
    onError(null)
    setSaving(true)
    try {
      await onDone(exportIcon())
    } catch (err) {
      onError(
        (err instanceof Error && err.message) || "Couldn't save this picture."
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-4 pb-4">
      {error && (
        <Alert variant="destructive">
          <HugeiconsIcon icon={AlertCircleIcon} />
          <AlertDescription className="text-xs">{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex justify-center">
        <div
          data-no-swipe
          className="relative size-60 cursor-grab touch-none overflow-hidden rounded-3xl border bg-muted select-none active:cursor-grabbing"
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId)
            drag.current = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y }
          }}
          onPointerMove={(e) => {
            const d = drag.current
            if (!d) return
            setPan(
              clamp(
                { x: d.px + e.clientX - d.x, y: d.py + e.clientY - d.y },
                zoom
              )
            )
          }}
          onPointerUp={() => (drag.current = null)}
          onPointerCancel={() => (drag.current = null)}
        >
          <canvas
            ref={canvasRef}
            width={PREVIEW_SIZE * 2}
            height={PREVIEW_SIZE * 2}
            className="block size-full"
          />
          {/* Rule-of-thirds guide */}
          <div className="pointer-events-none absolute inset-0 grid grid-cols-3 grid-rows-3">
            {Array.from({ length: 9 }, (_, i) => (
              <span key={i} className="border-[0.5px] border-white/25" />
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 px-1">
        <HugeiconsIcon
          icon={ZoomOutAreaIcon}
          className="size-4 shrink-0 text-muted-foreground"
        />
        <input
          type="range"
          min="1"
          max="3"
          step="0.02"
          value={zoom}
          onChange={(e) => {
            const z = parseFloat(e.target.value)
            setZoom(z)
            setPan((p) => clamp(p, z))
          }}
          className="min-w-0 flex-1 cursor-pointer accent-primary"
          aria-label="Zoom"
        />
        <HugeiconsIcon
          icon={ZoomInAreaIcon}
          className="size-4 shrink-0 text-muted-foreground"
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={saving}
        >
          <HugeiconsIcon icon={ArrowLeft01Icon} data-icon="inline-start" />
          Back
        </Button>
        <Button type="button" onClick={save} disabled={saving}>
          {saving ? (
            <Spinner />
          ) : (
            <HugeiconsIcon icon={Tick02Icon} data-icon="inline-start" />
          )}
          Use picture
        </Button>
      </div>
    </div>
  )
}
