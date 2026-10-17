"use client"

import * as React from "react"
import {
  AlertCircleIcon,
  Camera01Icon,
  Delete02Icon,
  Image01Icon,
  RotateLeft01Icon,
  Tick02Icon,
  Upload01Icon,
  ZoomInAreaIcon,
  ZoomOutAreaIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Separator } from "@/components/ui/separator"
import { Spinner } from "@/components/ui/spinner"

interface PhotoUploadDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentPhotoURL?: string
  onPhotoUpdated: (newPhotoURL: string | null) => Promise<void>
}

/**
 * Zero-budget profile photo flow: live camera / file pick → circular crop with
 * pan + zoom → 192×192 WebP (JPEG fallback) data URL stored on the profile.
 */
export function PhotoUploadDialog({ open, onOpenChange, currentPhotoURL, onPhotoUpdated }: PhotoUploadDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Profile Photo</DialogTitle>
        </DialogHeader>
        {/* The body unmounts when the dialog closes, which resets its state and stops the camera. */}
        <PhotoUploadBody
          onClose={() => onOpenChange(false)}
          currentPhotoURL={currentPhotoURL}
          onPhotoUpdated={onPhotoUpdated}
        />
      </DialogContent>
    </Dialog>
  )
}

const errorMessage = (err: unknown, fallback: string) =>
  (err instanceof Error && err.message) || fallback

function PhotoUploadBody({
  onClose,
  currentPhotoURL,
  onPhotoUpdated,
}: {
  onClose: () => void
  currentPhotoURL?: string
  onPhotoUpdated: (newPhotoURL: string | null) => Promise<void>
}) {
  const [imageSrc, setImageSrc] = React.useState<string | null>(null)
  const [zoom, setZoom] = React.useState<number>(1)
  const [pan, setPan] = React.useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = React.useState<boolean>(false)
  const [dragStart, setDragStart] = React.useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const [isSaving, setIsSaving] = React.useState<boolean>(false)
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null)

  // Live camera stream state
  const [isCameraActive, setIsCameraActive] = React.useState<boolean>(false)
  const videoRef = React.useRef<HTMLVideoElement | null>(null)
  const streamRef = React.useRef<MediaStream | null>(null)

  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const cameraFallbackInputRef = React.useRef<HTMLInputElement>(null)
  const previewCanvasRef = React.useRef<HTMLCanvasElement>(null)
  const loadedImageRef = React.useRef<HTMLImageElement | null>(null)

  const stopCameraStream = React.useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    setIsCameraActive(false)
  }, [])

  // Stop the stream when the dialog closes (body unmounts)
  React.useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
        streamRef.current = null
      }
    }
  }, [])

  // Start real camera preview using getUserMedia
  const startCamera = async () => {
    setErrorMsg(null)
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      // Fallback to camera capture file input for older mobile browsers
      if (cameraFallbackInputRef.current) {
        cameraFallbackInputRef.current.click()
      } else {
        setErrorMsg("Camera capture is not supported in this browser. Please use 'Upload Image'.")
      }
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 640 } },
        audio: false,
      })
      streamRef.current = stream
      setIsCameraActive(true)
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play()
      }
    } catch (err) {
      console.warn("Camera getUserMedia error:", err)
      const name = (err as { name?: string } | null)?.name
      if (name === "NotAllowedError" || name === "PermissionDeniedError") {
        setErrorMsg("Camera permission was denied. Please allow camera permissions in your browser or use 'Upload Image'.")
      } else if (name === "NotFoundError" || name === "DevicesNotFoundError") {
        setErrorMsg("No camera device was found on this device. Please use 'Upload Image'.")
      } else {
        // Fallback to capture input
        if (cameraFallbackInputRef.current) {
          cameraFallbackInputRef.current.click()
        } else {
          setErrorMsg("Could not start camera preview. Please choose 'Upload Image' instead.")
        }
      }
    }
  }

  // Attach stream to video ref when isCameraActive turns true
  React.useEffect(() => {
    if (isCameraActive && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current
      videoRef.current.play().catch(() => {})
    }
  }, [isCameraActive])

  // Snap photo from live camera
  const capturePhotoFromCamera = () => {
    const video = videoRef.current
    if (!video) return

    const canvas = document.createElement("canvas")
    canvas.width = video.videoWidth || 640
    canvas.height = video.videoHeight || 640
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Draw video frame to canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    const dataUrl = canvas.toDataURL("image/jpeg", 0.9)

    stopCameraStream()

    const img = new window.Image()
    img.onload = () => {
      loadedImageRef.current = img
      setImageSrc(dataUrl)
      setZoom(1)
      setPan({ x: 0, y: 0 })
    }
    img.src = dataUrl
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg(null)
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith("image/")) {
      setErrorMsg("Please select a valid image file (JPEG, PNG, WebP).")
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg("Image size exceeds 5MB. Please choose a smaller photo.")
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      const result = event.target?.result as string
      if (result) {
        const img = new window.Image()
        img.onload = () => {
          loadedImageRef.current = img
          setImageSrc(result)
          setZoom(1)
          setPan({ x: 0, y: 0 })
        }
        img.onerror = () => {
          setErrorMsg("Could not load image format. Please select another image.")
        }
        img.src = result
      }
    }
    reader.readAsDataURL(file)
    e.target.value = ""
  }

  // Draw circular crop preview on canvas
  const drawPreview = React.useCallback(() => {
    const canvas = previewCanvasRef.current
    const img = loadedImageRef.current
    if (!canvas || !img) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const size = canvas.width
    ctx.clearRect(0, 0, size, size)

    // Save context for circular clip
    ctx.save()
    ctx.beginPath()
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2)
    ctx.closePath()
    ctx.clip()

    // Fill background
    ctx.fillStyle = "#F8FAFC"
    ctx.fillRect(0, 0, size, size)

    // Calculate scaled dimensions to cover
    const scale = Math.max(size / img.width, size / img.height) * zoom
    const w = img.width * scale
    const h = img.height * scale

    const x = (size - w) / 2 + pan.x
    const y = (size - h) / 2 + pan.y

    ctx.drawImage(img, x, y, w, h)
    ctx.restore()

    // Outer circle border guide
    ctx.save()
    ctx.beginPath()
    ctx.arc(size / 2, size / 2, size / 2 - 1.5, 0, Math.PI * 2)
    ctx.lineWidth = 3
    ctx.strokeStyle = "#2563EB"
    ctx.stroke()
    ctx.restore()
  }, [zoom, pan])

  React.useEffect(() => {
    if (imageSrc) {
      drawPreview()
    }
  }, [imageSrc, zoom, pan, drawPreview])

  // Pointer dragging
  const handlePointerDown = (e: React.PointerEvent) => {
    if (!imageSrc) return
    setIsDragging(true)
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y })
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    })
  }

  const handlePointerUp = () => {
    setIsDragging(false)
  }

  // Export compressed 192x192 data URL
  const exportCroppedImage = (): string | null => {
    const img = loadedImageRef.current
    if (!img) return null

    const exportCanvas = document.createElement("canvas")
    exportCanvas.width = 192
    exportCanvas.height = 192
    const ctx = exportCanvas.getContext("2d")
    if (!ctx) return null

    ctx.fillStyle = "#FFFFFF"
    ctx.fillRect(0, 0, 192, 192)

    const previewSize = previewCanvasRef.current?.width || 240
    const scaleRatio = 192 / previewSize

    const scale = Math.max(previewSize / img.width, previewSize / img.height) * zoom * scaleRatio
    const w = img.width * scale
    const h = img.height * scale

    const x = (192 - w) / 2 + pan.x * scaleRatio
    const y = (192 - h) / 2 + pan.y * scaleRatio

    ctx.drawImage(img, x, y, w, h)

    try {
      return exportCanvas.toDataURL("image/webp", 0.82)
    } catch {
      return exportCanvas.toDataURL("image/jpeg", 0.82)
    }
  }

  const handleSave = async () => {
    setErrorMsg(null)
    setIsSaving(true)
    try {
      const croppedDataUrl = exportCroppedImage()
      if (!croppedDataUrl) {
        throw new Error("Failed to process image. Please try again.")
      }
      await onPhotoUpdated(croppedDataUrl)
      onClose()
    } catch (err) {
      setErrorMsg(errorMessage(err, "Failed to save profile photo."))
    } finally {
      setIsSaving(false)
    }
  }

  const handleRemovePhoto = async () => {
    setErrorMsg(null)
    setIsSaving(true)
    try {
      await onPhotoUpdated(null)
      onClose()
    } catch (err) {
      setErrorMsg(errorMessage(err, "Failed to remove photo."))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {errorMsg && (
        <Alert variant="destructive" className="bg-destructive/10">
          <HugeiconsIcon icon={AlertCircleIcon} />
          <AlertDescription className="text-xs">{errorMsg}</AlertDescription>
        </Alert>
      )}

      {/* Hidden file inputs */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="hidden"
      />
      <input
        type="file"
        ref={cameraFallbackInputRef}
        onChange={handleFileSelect}
        accept="image/*"
        capture="user"
        className="hidden"
      />

      {isCameraActive ? (
        /* Live camera view */
        <div className="flex animate-in flex-col gap-4 py-2 text-center duration-200 fade-in">
          <div className="relative mx-auto size-60 overflow-hidden rounded-full border-4 border-primary bg-black shadow-md">
            <video ref={videoRef} autoPlay playsInline muted className="size-full object-cover" />
          </div>
          <p className="text-xs text-muted-foreground">Center your face in the circle and tap Capture.</p>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <Button type="button" variant="outline" onClick={stopCameraStream}>
              Cancel Camera
            </Button>
            <Button type="button" onClick={capturePhotoFromCamera}>
              <HugeiconsIcon icon={Camera01Icon} data-icon="inline-start" />
              Capture Photo
            </Button>
          </div>
        </div>
      ) : !imageSrc ? (
        /* Source picker */
        <div className="flex flex-col gap-4 py-2">
          <Empty className="rounded-3xl border-2 border-dashed bg-muted/40 p-8">
            <EmptyHeader>
              <EmptyMedia className="size-16 rounded-full bg-secondary text-primary">
                <HugeiconsIcon icon={Image01Icon} className="size-8" />
              </EmptyMedia>
              <EmptyTitle className="text-sm font-bold">Update Profile Photo</EmptyTitle>
              <EmptyDescription className="text-xs">
                Take a photo using your camera or upload an image from your device.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>

          <div className="grid grid-cols-2 gap-3">
            <Button type="button" className="w-full" onClick={startCamera}>
              <HugeiconsIcon icon={Camera01Icon} data-icon="inline-start" />
              Take Photo
            </Button>
            <Button type="button" variant="outline" className="w-full" onClick={() => fileInputRef.current?.click()}>
              <HugeiconsIcon icon={Upload01Icon} data-icon="inline-start" />
              Upload Image
            </Button>
          </div>

          {currentPhotoURL && (
            <>
              <Separator />
              <Button
                type="button"
                variant="ghost"
                className="w-full text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={handleRemovePhoto}
                disabled={isSaving}
              >
                <HugeiconsIcon icon={Delete02Icon} data-icon="inline-start" />
                Remove Photo
              </Button>
            </>
          )}
        </div>
      ) : (
        /* Crop editor */
        <div className="flex flex-col gap-4">
          <div className="flex flex-col items-center justify-center py-2">
            <div
              className="relative size-60 cursor-grab touch-none overflow-hidden rounded-full border-4 border-card shadow-md select-none active:cursor-grabbing"
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerUp}
            >
              <canvas ref={previewCanvasRef} width={240} height={240} className="block size-full" />
            </div>
            <span className="mt-2 text-[11px] text-muted-foreground">Drag to reposition • Use slider to zoom</span>
          </div>

          {/* Zoom slider */}
          <div className="flex items-center gap-3 rounded-2xl bg-muted/50 px-4 py-2">
            <HugeiconsIcon icon={ZoomOutAreaIcon} className="size-4 shrink-0 text-muted-foreground" />
            <input
              type="range"
              min="1"
              max="3"
              step="0.05"
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              className="flex-1 cursor-pointer accent-primary"
              aria-label="Zoom photo"
            />
            <HugeiconsIcon icon={ZoomInAreaIcon} className="size-4 shrink-0 text-muted-foreground" />
          </div>

          <div className="flex items-center gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setImageSrc(null)
                setZoom(1)
                setPan({ x: 0, y: 0 })
              }}
              disabled={isSaving}
            >
              <HugeiconsIcon icon={RotateLeft01Icon} data-icon="inline-start" />
              Cancel
            </Button>

            <Button type="button" className="flex-1" onClick={handleSave} disabled={isSaving}>
              {isSaving ? <Spinner /> : <HugeiconsIcon icon={Tick02Icon} data-icon="inline-start" />}
              {isSaving ? "Saving..." : "Save Photo"}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
