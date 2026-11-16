/**
 * Photos for chat, squeezed in the browser before they're sent: the free plan
 * has no Storage, so a photo lives in the Realtime Database as a data URL
 * (chatFiles/{chatId}/{id}). Longest edge 1280 px, WebP (JPEG where the
 * browser can't encode WebP), quality stepped down until it fits ~200 KB.
 * A 24 px preview rides along in the message itself for an instant blur-up.
 */

/** Longest edge of a sent photo. */
const MAX_EDGE = 1280
/** Target size of the data URL (≈ 200 KB of image); the rules allow 300k characters. */
const MAX_CHARS = 270_000
const THUMB_EDGE = 24

export interface CompressedPhoto {
  dataUrl: string
  thumb: string
  w: number
  h: number
}

async function decode(file: Blob): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === "function") {
    try {
      // Honour the camera's rotation (EXIF) so phone photos aren't sideways
      return await createImageBitmap(file, { imageOrientation: "from-image" })
    } catch {
      /* fall through to <img> (older Safari, HEIC…) */
    }
  }
  const url = URL.createObjectURL(file)
  try {
    const img = new Image()
    img.decoding = "async"
    img.src = url
    await img.decode()
    return img
  } finally {
    URL.revokeObjectURL(url)
  }
}

function draw(
  src: ImageBitmap | HTMLImageElement,
  w: number,
  h: number
): HTMLCanvasElement {
  const canvas = document.createElement("canvas")
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext("2d")
  if (!ctx) throw new Error("Couldn't read that photo")
  // Transparent PNGs get a white backdrop instead of turning black in JPEG
  ctx.fillStyle = "#ffffff"
  ctx.fillRect(0, 0, w, h)
  ctx.imageSmoothingQuality = "high"
  ctx.drawImage(src, 0, 0, w, h)
  return canvas
}

/** WebP if this browser can write it, else JPEG. */
function encode(canvas: HTMLCanvasElement, quality: number) {
  const webp = canvas.toDataURL("image/webp", quality)
  return webp.startsWith("data:image/webp")
    ? webp
    : canvas.toDataURL("image/jpeg", quality)
}

export async function compressPhoto(file: File): Promise<CompressedPhoto> {
  if (!file.type.startsWith("image/"))
    throw new Error("That file isn't a photo")
  const src = await decode(file)
  const sw = "naturalWidth" in src ? src.naturalWidth : src.width
  const sh = "naturalHeight" in src ? src.naturalHeight : src.height
  if (!sw || !sh) throw new Error("Couldn't read that photo")

  let scale = Math.min(1, MAX_EDGE / Math.max(sw, sh))
  let dataUrl = ""
  let w = 0
  let h = 0
  // Step quality down first, then size, until it fits
  for (let attempt = 0; attempt < 8; attempt++) {
    w = Math.max(1, Math.round(sw * scale))
    h = Math.max(1, Math.round(sh * scale))
    const canvas = draw(src, w, h)
    for (const q of [0.82, 0.72, 0.62, 0.5]) {
      dataUrl = encode(canvas, q)
      if (dataUrl.length <= MAX_CHARS) break
    }
    if (dataUrl.length <= MAX_CHARS) break
    scale *= 0.8
  }
  if (dataUrl.length > MAX_CHARS) throw new Error("That photo is too large")

  const t = Math.min(1, THUMB_EDGE / Math.max(w, h))
  const thumb = encode(
    draw(src, Math.max(1, Math.round(w * t)), Math.max(1, Math.round(h * t))),
    0.5
  )
  if ("close" in src) src.close()
  return { dataUrl, thumb: thumb.length <= 4000 ? thumb : "", w, h }
}
