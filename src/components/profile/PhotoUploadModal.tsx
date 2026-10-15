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

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const loadedImageRef = useRef<HTMLImageElement | null>(null);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setImageSrc(null);
      setZoom(1);
      setPan({ x: 0, y: 0 });
      setErrorMsg(null);
      setIsSaving(false);
      loadedImageRef.current = null;
    }
  }, [isOpen]);

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
    // Clear input so same file can be selected again
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

    // Fill background
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

    // Prefer WebP for superior compression, fallback to JPEG
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
          ref={cameraInputRef}
          onChange={handleFileSelect}
          accept="image/*"
          capture="user"
          className="hidden"
        />

        {!imageSrc ? (
          <div className="space-y-4 py-2">
            <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl bg-slate-50/50 dark:bg-slate-900/50 text-center">
              <div className="w-16 h-16 rounded-full bg-blue-50 dark:bg-blue-950/50 text-[#2563EB] dark:text-blue-400 flex items-center justify-center mb-3">
                <ImageIcon className="w-8 h-8" />
              </div>
              <h4 className="text-sm font-bold text-[#0F172A] dark:text-slate-100">Upload Your Photo</h4>
              <p className="text-xs text-[#64748B] dark:text-slate-400 mt-1 max-w-xs">
                Choose a clear image from your device or take a selfie to customize your profile avatar.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Button
                type="button"
                variant="primary"
                fullWidth
                onClick={() => fileInputRef.current?.click()}
                leftIcon={<Upload className="w-4 h-4" />}
              >
                Upload File
              </Button>
              <Button
                type="button"
                variant="outline"
                fullWidth
                onClick={() => cameraInputRef.current?.click()}
                leftIcon={<Camera className="w-4 h-4" />}
              >
                Camera
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
                  Remove Custom Photo
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
                Change
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
                {isSaving ? "Saving..." : "Set as Profile Photo"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
