"use client"

import * as React from "react"
import jsQR from "jsqr"
import { Camera01Icon, Image01Icon, QrCodeIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { IdLookupResult } from "@/app/(dashboard)/friends/_components/id-lookup-result"
import { useSession } from "@/components/providers/session-provider"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { extractJoySplitId } from "@/lib/joysplit-id"

/** Frames are decoded at this width: plenty for a QR, light on the phone. */
const SCAN_WIDTH = 480
/** Time between decode attempts (ms). */
const SCAN_EVERY = 120

/** Reads a QR code from image pixels; returns its text or null. */
function decode(source: CanvasImageSource, width: number, height: number, canvas: HTMLCanvasElement) {
  const w = Math.min(SCAN_WIDTH, width)
  const h = Math.round((height * w) / width)
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext("2d", { willReadFrequently: true })
  if (!ctx || !w || !h) return null
  ctx.drawImage(source, 0, 0, w, h)
  return jsQR(ctx.getImageData(0, 0, w, h).data, w, h, { inversionAttempts: "attemptBoth" })?.data ?? null
}

/**
 * Scan a friend's JoySplit QR with the camera (or from a photo). As soon as an
 * ID is read the camera stops and their profile shows, with Add friend.
 */
export function QrScannerDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { user } = useSession()
  const videoRef = React.useRef<HTMLVideoElement>(null)
  const fileRef = React.useRef<HTMLInputElement>(null)
  const [scannedId, setScannedId] = React.useState<string | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [hint, setHint] = React.useState<string | null>(null)
  const [starting, setStarting] = React.useState(true)

  const close = (next: boolean) => {
    if (!next) {
      setScannedId(null)
      setError(null)
      setHint(null)
      setStarting(true)
    }
    onOpenChange(next)
  }

  /** A decoded QR: a JoySplit ID opens the profile; anything else gets a hint. */
  const handleText = React.useCallback(
    (text: string) => {
      const id = extractJoySplitId(text)
      if (!id) {
        setHint("That QR code isn't a JoySplit ID.")
        return false
      }
      if (id === user?.splitzyId?.toUpperCase()) {
        setHint("That's your own QR code — scan a friend's.")
        return false
      }
      setScannedId(id)
      return true
    },
    [user?.splitzyId]
  )

  // Camera: runs while the dialog is open and nothing has been scanned yet
  React.useEffect(() => {
    if (!open || scannedId) return
    let stream: MediaStream | null = null
    let frame = 0
    let stopped = false
    let last = 0
    const canvas = document.createElement("canvas")

    const tick = (time: number) => {
      if (stopped) return
      const video = videoRef.current
      if (video && video.readyState >= 2 && time - last > SCAN_EVERY) {
        last = time
        const text = decode(video, video.videoWidth, video.videoHeight, canvas)
        if (text && handleText(text)) return
      }
      frame = requestAnimationFrame(tick)
    }

    const start = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError("This browser can't open the camera here. Scan a photo of the QR instead.")
        setStarting(false)
        return
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        })
        if (stopped || !videoRef.current) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        videoRef.current.srcObject = stream
        await videoRef.current.play().catch(() => undefined)
        setStarting(false)
        setError(null)
        frame = requestAnimationFrame(tick)
      } catch (e) {
        if (stopped) return
        const name = (e as DOMException)?.name
        setError(
          name === "NotAllowedError"
            ? "Camera permission was denied. Allow camera access for this site, or scan a photo instead."
            : name === "NotFoundError"
              ? "No camera found. Scan a photo of the QR instead."
              : "Couldn't open the camera. Scan a photo of the QR instead."
        )
        setStarting(false)
      }
    }
    void start()

    return () => {
      stopped = true
      cancelAnimationFrame(frame)
      stream?.getTracks().forEach((t) => t.stop())
    }
  }, [open, scannedId, handleText])

  /** Fallback: read the QR from a photo or screenshot. */
  const scanFile = async (file: File) => {
    setHint(null)
    try {
      const bitmap = await createImageBitmap(file)
      const text = decode(bitmap, bitmap.width, bitmap.height, document.createElement("canvas"))
      bitmap.close()
      if (!text) setHint("No QR code found in that photo.")
      else handleText(text)
    } catch {
      setHint("Couldn't read that image.")
    }
  }

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{scannedId ? "Found them" : "Scan a JoySplit QR"}</DialogTitle>
          <DialogDescription>
            {scannedId
              ? "Send a friend request to start splitting."
              : "Point your camera at a friend's QR code from their JoySplit ID."}
          </DialogDescription>
        </DialogHeader>

        {scannedId ? (
          <div className="flex flex-col gap-3">
            <IdLookupResult splitzyId={scannedId} />
            <Button variant="outline" onClick={() => setScannedId(null)}>
              <HugeiconsIcon icon={QrCodeIcon} data-icon="inline-start" />
              Scan another
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="relative aspect-square w-full overflow-hidden rounded-lg border bg-black">
              <video ref={videoRef} className="size-full object-cover" playsInline muted aria-label="Camera" />
              {error ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-muted p-6 text-center">
                  <HugeiconsIcon icon={Camera01Icon} className="size-8 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">{error}</p>
                </div>
              ) : (
                <>
                  {/* Aim box */}
                  <div className="pointer-events-none absolute inset-[18%] rounded-lg border-2 border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
                  {starting && (
                    <p className="absolute inset-x-0 bottom-3 text-center text-xs text-white/80">Starting camera…</p>
                  )}
                </>
              )}
            </div>
            {hint && <p className="text-center text-xs text-warning">{hint}</p>}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) void scanFile(file)
                e.target.value = ""
              }}
            />
            <Button variant="outline" onClick={() => fileRef.current?.click()}>
              <HugeiconsIcon icon={Image01Icon} data-icon="inline-start" />
              Scan from a photo
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
