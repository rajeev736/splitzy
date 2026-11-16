import * as THREE from "three"

/** Tiny procedural textures, drawn on canvases at start-up (nothing downloaded). */

function canvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement("canvas")
  c.width = w
  c.height = h
  return [c, c.getContext("2d")!]
}

function tex(c: HTMLCanvasElement, srgb = true): THREE.CanvasTexture {
  const t = new THREE.CanvasTexture(c)
  if (srgb) t.colorSpace = THREE.SRGBColorSpace
  return t
}

/** Number atlas cells (10 × 10): wider than tall, like the band they're painted on. */
export const ATLAS_CELL_W = 128
export const ATLAS_CELL_H = 92

/**
 * The square numbers 1–100: white, chunky, with a dark rim and a soft drop shadow. Drawn
 * stretched tall, because the camera looks down on them at a slant.
 */
export function numberAtlas(maxAniso: number): THREE.CanvasTexture {
  const cw = ATLAS_CELL_W
  const ch = ATLAS_CELL_H
  const [c, g] = canvas(cw * 10, ch * 10)
  g.textAlign = "center"
  g.textBaseline = "middle"
  g.lineJoin = "round"
  const STRETCH = 1.24
  for (let n = 1; n <= 100; n++) {
    const i = n - 1
    const cx = (i % 10) * cw + cw / 2
    const cy = Math.floor(i / 10) * ch + ch / 2
    const size = n === 100 ? 60 : 78
    g.save()
    g.translate(cx, cy)
    g.scale(n === 100 ? 1 : 1.04, STRETCH)
    g.font = `900 ${size}px "Arial Rounded MT Bold", "Trebuchet MS", ui-rounded, system-ui, sans-serif`
    const t = String(n)
    // Soft shadow
    g.fillStyle = "rgba(4,34,18,0.5)"
    g.fillText(t, 2, 5)
    // Rim
    g.strokeStyle = n === 100 ? "#7a4b00" : "#0d4424"
    g.lineWidth = 11
    g.strokeText(t, 0, 1)
    g.fillStyle = n === 100 ? "#fff6c9" : "#fffef8"
    g.fillText(t, 0, 1)
    g.restore()
  }
  const t = tex(c)
  t.anisotropy = maxAniso
  t.generateMipmaps = true
  t.minFilter = THREE.LinearMipmapLinearFilter
  return t
}

/** A soft round blob (white → transparent): shadows, glows, mist, dust. */
export function softDot(): THREE.CanvasTexture {
  const [c, g] = canvas(64, 64)
  const r = g.createRadialGradient(32, 32, 0, 32, 32, 32)
  r.addColorStop(0, "rgba(255,255,255,1)")
  r.addColorStop(0.45, "rgba(255,255,255,0.55)")
  r.addColorStop(1, "rgba(255,255,255,0)")
  g.fillStyle = r
  g.fillRect(0, 0, 64, 64)
  return tex(c)
}

/** Falling water: bright streaks on a translucent blue, tiled vertically (scrolled by offset). */
export function waterStreaks(): THREE.CanvasTexture {
  const W = 64
  const H = 256
  const [c, g] = canvas(W, H)
  const base = g.createLinearGradient(0, 0, W, 0)
  base.addColorStop(0, "rgba(120,220,235,0.55)")
  base.addColorStop(0.5, "rgba(185,245,250,0.85)")
  base.addColorStop(1, "rgba(120,220,235,0.55)")
  g.fillStyle = base
  g.fillRect(0, 0, W, H)
  let s = 7
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647)
  for (let i = 0; i < 46; i++) {
    const x = rnd() * W
    const y = rnd() * H
    const len = 30 + rnd() * 90
    const w = 1 + rnd() * 3
    g.fillStyle = `rgba(255,255,255,${0.35 + rnd() * 0.5})`
    g.fillRect(x, y, w, len)
    if (y + len > H) g.fillRect(x, y - H, w, len)
  }
  const t = tex(c)
  t.wrapS = THREE.RepeatWrapping
  t.wrapT = THREE.RepeatWrapping
  return t
}

/** A pool's surface: ripples and foam, tiled (scrolled slowly). */
export function poolRipples(): THREE.CanvasTexture {
  const S = 128
  const [c, g] = canvas(S, S)
  g.fillStyle = "#3fb5b0"
  g.fillRect(0, 0, S, S)
  let s = 11
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647)
  for (let i = 0; i < 40; i++) {
    const x = rnd() * S
    const y = rnd() * S
    const r = 4 + rnd() * 14
    g.strokeStyle = `rgba(210,255,250,${0.2 + rnd() * 0.35})`
    g.lineWidth = 1.5
    for (const dx of [-S, 0, S])
      for (const dy of [-S, 0, S]) {
        g.beginPath()
        g.ellipse(x + dx, y + dy, r, r * 0.55, 0, 0, Math.PI * 2)
        g.stroke()
      }
  }
  const t = tex(c)
  t.wrapS = THREE.RepeatWrapping
  t.wrapT = THREE.RepeatWrapping
  return t
}

/** Foam: a ring of white bubbles (for the waterfall's splash). */
export function foamRing(): THREE.CanvasTexture {
  const S = 128
  const [c, g] = canvas(S, S)
  let s = 5
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647)
  for (let i = 0; i < 160; i++) {
    const a = rnd() * Math.PI * 2
    const d = 18 + rnd() * 42
    const r = 2 + rnd() * 7 * (1 - d / 80)
    g.fillStyle = `rgba(255,255,255,${0.45 + rnd() * 0.5})`
    g.beginPath()
    g.arc(64 + Math.cos(a) * d, 64 + Math.sin(a) * d * 0.9, r, 0, Math.PI * 2)
    g.fill()
  }
  const r = g.createRadialGradient(64, 64, 6, 64, 64, 34)
  r.addColorStop(0, "rgba(255,255,255,0.9)")
  r.addColorStop(1, "rgba(255,255,255,0)")
  g.fillStyle = r
  g.fillRect(0, 0, S, S)
  return tex(c)
}

/** A swirling portal: violet spiral arms around a dark eye. */
export function portalSwirl(): THREE.CanvasTexture {
  const S = 128
  const [c, g] = canvas(S, S)
  const bg = g.createRadialGradient(64, 64, 0, 64, 64, 64)
  bg.addColorStop(0, "rgba(20,0,40,1)")
  bg.addColorStop(0.35, "rgba(76,20,140,1)")
  bg.addColorStop(0.8, "rgba(190,90,255,0.9)")
  bg.addColorStop(1, "rgba(240,170,255,0)")
  g.fillStyle = bg
  g.beginPath()
  g.arc(64, 64, 64, 0, Math.PI * 2)
  g.fill()
  g.lineCap = "round"
  for (let arm = 0; arm < 4; arm++) {
    g.beginPath()
    for (let i = 0; i <= 40; i++) {
      const t = i / 40
      const a = arm * (Math.PI / 2) + t * Math.PI * 1.6
      const r = 8 + t * 50
      const x = 64 + Math.cos(a) * r
      const y = 64 + Math.sin(a) * r
      if (i === 0) g.moveTo(x, y)
      else g.lineTo(x, y)
    }
    g.strokeStyle = arm % 2 ? "rgba(255,190,255,0.85)" : "rgba(150,230,255,0.7)"
    g.lineWidth = 5
    g.stroke()
  }
  return tex(c)
}

/** The sky: warm sunlit haze high up, cool jungle teal low down. */
export function skyGradient(): THREE.CanvasTexture {
  const [c, g] = canvas(4, 256)
  const r = g.createLinearGradient(0, 0, 0, 256)
  r.addColorStop(0, "#fff4cf")
  r.addColorStop(0.3, "#cdeedd")
  r.addColorStop(0.62, "#86c9bb")
  r.addColorStop(1, "#3d8a86")
  g.fillStyle = r
  g.fillRect(0, 0, 4, 256)
  return tex(c)
}

/** The colour the fog fades to: a cool, misty teal (the far jungle and the depths below). */
export const FOG_COLOUR = "#8fcabd"

/** A shaft of sunlight: bright along its middle, fading out to its sides and its lower end. */
export function lightShaft(): THREE.CanvasTexture {
  const W = 32
  const H = 128
  const [c, g] = canvas(W, H)
  const img = g.createImageData(W, H)
  for (let y = 0; y < H; y++) {
    const v = y / (H - 1)
    const along = Math.pow(Math.sin(Math.PI * Math.min(1, v * 1.25)), 0.8) * (1 - v * 0.55)
    for (let x = 0; x < W; x++) {
      const u = (x + 0.5) / W - 0.5
      const a = Math.exp(-u * u * 18) * along
      const k = (y * W + x) * 4
      img.data[k] = img.data[k + 1] = img.data[k + 2] = 255
      img.data[k + 3] = Math.round(a * 255)
    }
  }
  g.putImageData(img, 0, 0)
  return tex(c)
}

/**
 * Jungle silhouettes for the far backdrop: three horizontal bands (rows of the atlas), each a
 * skyline of round canopies, palms and tall trunks, white on transparent (tinted per layer).
 */
export function canopyBands(): THREE.CanvasTexture {
  const W = 512
  const H = 384
  const [c, g] = canvas(W, H)
  let s = 29
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647)
  g.fillStyle = "#ffffff"
  g.strokeStyle = "#ffffff"
  for (let band = 0; band < 3; band++) {
    const top = band * 128
    g.save()
    g.beginPath()
    g.rect(0, top, W, 128)
    g.clip()
    // Solid lower part
    g.fillRect(0, top + 84, W, 44)
    // Round canopies of varying heights (wrapped so the band tiles sideways)
    for (let i = 0; i < 26; i++) {
      const x = rnd() * W
      const r = 14 + rnd() * 26
      const y = top + 70 + rnd() * 26 - (band === 0 ? 8 : 0)
      for (const dx of [-W, 0, W]) {
        g.beginPath()
        g.arc(x + dx, y, r, 0, Math.PI * 2)
        g.fill()
      }
    }
    // A few tall trees and palms poking up
    for (let i = 0; i < 6; i++) {
      const x = rnd() * W
      const h = 40 + rnd() * 34
      const y0 = top + 86
      for (const dx of [-W, 0, W]) {
        g.lineWidth = 3
        g.beginPath()
        g.moveTo(x + dx, y0)
        g.quadraticCurveTo(x + dx + 6, y0 - h * 0.5, x + dx + 2, y0 - h)
        g.stroke()
        if (i % 2 === 0) {
          // Palm fronds
          for (let f = 0; f < 6; f++) {
            const a = -Math.PI / 2 + (f - 2.5) * 0.55
            g.lineWidth = 4
            g.beginPath()
            g.moveTo(x + dx + 2, y0 - h)
            g.quadraticCurveTo(x + dx + 2 + Math.cos(a) * 14, y0 - h + Math.sin(a) * 10, x + dx + 2 + Math.cos(a) * 24, y0 - h + 8)
            g.stroke()
          }
        } else {
          g.beginPath()
          g.arc(x + dx + 2, y0 - h, 16 + rnd() * 8, 0, Math.PI * 2)
          g.fill()
        }
      }
    }
    g.restore()
  }
  const t = tex(c)
  t.wrapS = THREE.RepeatWrapping
  return t
}
