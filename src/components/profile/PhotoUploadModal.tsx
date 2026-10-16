"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import {
  Upload,
  Camera,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Trash2,
  Check,
  AlertCircle,
  Loader2,
  Image as ImageIcon,
  Video,
} from "lucide-react";

interface PhotoUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPhotoURL?: string;
  onPhotoUpdated: (newPhotoURL: string | null) => Promise<void>;
}

export function PhotoUploadModal({
  isOpen,
  onClose,
  currentPhotoURL,
  onPhotoUpdated,
}: PhotoUploadModalProps) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Live Camera Stream State
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraFallbackInputRef = useRef<HTMLInputElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const loadedImageRef = useRef<HTMLImageElement | null>(null);

  const stopCameraStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  }, []);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setImageSrc(null);
      setZoom(1);
      setPan({ x: 0, y: 0 });
      setErrorMsg(null);
      setIsSaving(false);
      loadedImageRef.current = null;
    } else {
      stopCameraStream();
    }
  }, [isOpen, stopCameraStream]);

  // Clean up stream on unmount
  useEffect(() => {
    return () => {
      stopCameraStream();
    };
  }, [stopCameraStream]);

  // Start real camera preview using getUserMedia
  const startCamera = async () => {
    setErrorMsg(null);
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      // Fallback to camera capture file input for older mobile browsers
      if (cameraFallbackInputRef.current) {
        cameraFallbackInputRef.current.click();
      } else {
        setErrorMsg("Camera capture is not supported in this browser. Please use 'Upload Image'.");
      }
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 640 } },
        audio: false,
      });
      streamRef.current = stream;
      setIsCameraActive(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err: any) {
      console.warn("Camera getUserMedia error:", err);
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setErrorMsg("Camera permission was denied. Please allow camera permissions in your browser or use 'Upload Image'.");
      } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
        setErrorMsg("No camera device was found on this device. Please use 'Upload Image'.");
      } else {
        // Fallback to capture input
        if (cameraFallbackInputRef.current) {
          cameraFallbackInputRef.current.click();
        } else {
          setErrorMsg("Could not start camera preview. Please choose 'Upload Image' instead.");
        }
      }
    }
  };

  // Attach stream to video ref when isCameraActive turns true
  useEffect(() => {
    if (isCameraActive && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => {});
    }
  }, [isCameraActive]);

  // Snap photo from live camera
  const capturePhotoFromCamera = () => {
    const video = videoRef.current;
    if (!video) return;

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 640;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Draw video frame to canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.9);

    stopCameraStream();

    const img = new Image();
    img.onload = () => {
      loadedImageRef.current = img;
      setImageSrc(dataUrl);
      setZoom(1);
      setPan({ x: 0, y: 0 });
    };
    img.src = dataUrl;
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setErrorMsg("Please select a valid image file (JPEG, PNG, WebP).");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg("Image size exceeds 5MB. Please choose a smaller photo.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        const img = new Image();
        img.onload = () => {
          loadedImageRef.current = img;
          setImageSrc(result);
          setZoom(1);
          setPan({ x: 0, y: 0 });
        };
        img.onerror = () => {
          setErrorMsg("Could not load image format. Please select another image.");
        };
        img.src = result;
      }
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  // Draw circular crop preview on canvas
  const drawPreview = useCallback(() => {
    const canvas = previewCanvasRef.current;
    const img = loadedImageRef.current;
    if (!canvas || !img) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const size = canvas.width;
    ctx.clearRect(0, 0, size, size);

    // Save context for circular clip
    ctx.save();
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();

    // Fill background
    ctx.fillStyle = "#F8FAFC";
    ctx.fillRect(0, 0, size, size);

    // Calculate scaled dimensions to cover
    const scale = Math.max(size / img.width, size / img.height) * zoom;
    const w = img.width * scale;
    const h = img.height * scale;

    const x = (size - w) / 2 + pan.x;
    const y = (size - h) / 2 + pan.y;

    ctx.drawImage(img, x, y, w, h);
    ctx.restore();

    // Outer circle border guide
    ctx.save();
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2 - 1.5, 0, Math.PI * 2);
    ctx.lineWidth = 3;
    ctx.strokeStyle = "#2563EB";
    ctx.stroke();
    ctx.restore();
  }, [zoom, pan]);

  useEffect(() => {
    if (imageSrc) {
      drawPreview();
    }
  }, [imageSrc, zoom, pan, drawPreview]);

  // Pointer dragging
  const handlePointerDown = (e: React.PointerEvent) => {
    if (!imageSrc) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handlePointerUp = () => {
    setIsDragging(false);
  };

  // Export compressed 192x192 data URL
  const exportCroppedImage = (): string | null => {
    const img = loadedImageRef.current;
    if (!img) return null;

    const exportCanvas = document.createElement("canvas");
    exportCanvas.width = 192;
    exportCanvas.height = 192;
    const ctx = exportCanvas.getContext("2d");
    if (!ctx) return null;

    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, 192, 192);

    const previewSize = previewCanvasRef.current?.width || 240;
    const scaleRatio = 192 / previewSize;

    const scale = Math.max(previewSize / img.width, previewSize / img.height) * zoom * scaleRatio;
    const w = img.width * scale;
    const h = img.height * scale;

    const x = (192 - w) / 2 + pan.x * scaleRatio;
    const y = (192 - h) / 2 + pan.y * scaleRatio;

    ctx.drawImage(img, x, y, w, h);

    try {
      return exportCanvas.toDataURL("image/webp", 0.82);
    } catch {
      return exportCanvas.toDataURL("image/jpeg", 0.82);
    }
  };

  const handleSave = async () => {
    setErrorMsg(null);
    setIsSaving(true);
    try {
      const croppedDataUrl = exportCroppedImage();
      if (!croppedDataUrl) {
        throw new Error("Failed to process image. Please try again.");
      }
      await onPhotoUpdated(croppedDataUrl);
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to save profile photo.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemovePhoto = async () => {
    setErrorMsg(null);
    setIsSaving(true);
    try {
      await onPhotoUpdated(null);
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to remove photo.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Profile Photo">
      <div className="space-y-5">
        {errorMsg && (
          <div className="p-3 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs text-red-600 dark:text-red-400 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Hidden File Inputs */}
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

        {/* Live Camera View */}
        {isCameraActive ? (
          <div className="space-y-4 py-2 text-center animate-in fade-in duration-200">
            <div className="relative w-[240px] h-[240px] rounded-full overflow-hidden mx-auto shadow-md border-4 border-blue-600 bg-black">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Center your face in the circle and tap Capture.
            </p>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={stopCameraStream}
              >
                Cancel Camera
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={capturePhotoFromCamera}
                leftIcon={<Camera className="w-4 h-4" />}
              >
                Capture Photo
              </Button>
            </div>
          </div>
        ) : !imageSrc ? (
          <div className="space-y-4 py-2">
            <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl bg-slate-50/50 dark:bg-slate-900/50 text-center">
              <div className="w-16 h-16 rounded-full bg-blue-50 dark:bg-blue-950/50 text-[#2563EB] dark:text-blue-400 flex items-center justify-center mb-3">
                <ImageIcon className="w-8 h-8" />
              </div>
              <h4 className="text-sm font-bold text-[#0F172A] dark:text-slate-100">
                Update Profile Photo
              </h4>
              <p className="text-xs text-[#64748B] dark:text-slate-400 mt-1 max-w-xs">
                Take a photo using your camera or upload an image from your device.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Button
                type="button"
                variant="primary"
                fullWidth
                onClick={startCamera}
                leftIcon={<Camera className="w-4 h-4" />}
              >
                Take Photo
              </Button>
              <Button
                type="button"
                variant="outline"
                fullWidth
                onClick={() => fileInputRef.current?.click()}
                leftIcon={<Upload className="w-4 h-4" />}
              >
                Upload Image
              </Button>
            </div>

            {currentPhotoURL && (
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <Button
                  type="button"
                  variant="text"
                  fullWidth
                  onClick={handleRemovePhoto}
                  disabled={isSaving}
                  className="text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30"
                  leftIcon={<Trash2 className="w-4 h-4" />}
                >
                  Remove Photo
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Interactive Canvas Area */}
            <div className="flex flex-col items-center justify-center py-2">
              <div
                className="relative w-[240px] h-[240px] rounded-full overflow-hidden shadow-md cursor-grab active:cursor-grabbing border-4 border-white dark:border-slate-800 select-none touch-none"
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerUp}
              >
                <canvas
                  ref={previewCanvasRef}
                  width={240}
                  height={240}
                  className="w-full h-full block"
                />
              </div>
              <span className="text-[11px] text-slate-400 mt-2">
                Drag to reposition • Use slider to zoom
              </span>
            </div>

            {/* Zoom Slider */}
            <div className="flex items-center gap-3 px-4 py-2 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
              <ZoomOut className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                type="range"
                min="1"
                max="3"
                step="0.05"
                value={zoom}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                className="flex-1 accent-[#2563EB] cursor-pointer"
                aria-label="Zoom photo"
              />
              <ZoomIn className="w-4 h-4 text-slate-400 shrink-0" />
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="md"
                onClick={() => {
                  setImageSrc(null);
                  setZoom(1);
                  setPan({ x: 0, y: 0 });
                }}
                disabled={isSaving}
                leftIcon={<RotateCcw className="w-4 h-4" />}
              >
                Cancel
              </Button>

              <Button
                type="button"
                variant="primary"
                fullWidth
                size="md"
                onClick={handleSave}
                disabled={isSaving}
                leftIcon={
                  isSaving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )
                }
              >
                {isSaving ? "Saving..." : "Save Photo"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
