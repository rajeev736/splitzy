"use client"

/**
 * Tiny UI sounds for the Games side, synthesised with Web Audio (no files):
 * a short classic tap for buttons and tabs, and a bright coin "ting" for each
 * coin landing in the counter. They follow the games' sound switch
 * (lib/live/sound.ts, `useSoundSettings`), which RewardsHost keeps in sync via
 * `setUiSoundOn`. The context is woken on the first press anywhere, so the
 * first tap already sounds without a delay.
 */

const SETTINGS_KEY = "joysplit_sound"

let enabled: boolean | null = null
let ctx: AudioContext | null = null
let master: GainNode | null = null

/** Kept in sync with the games' sound switch by RewardsHost. */
export function setUiSoundOn(on: boolean) {
  enabled = on
}

function soundOn(): boolean {
  if (enabled !== null) return enabled
  // Before the host has synced: read the same per-device setting the games use
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    enabled = raw ? (JSON.parse(raw) as { on?: boolean }).on !== false : true
  } catch {
    enabled = true
  }
  return enabled
}

function audio(): AudioContext | null {
  if (typeof window === "undefined") return null
  if (!ctx) {
    const AC =
      window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AC) return null
    try {
      ctx = new AC({ latencyHint: "interactive" })
    } catch {
      return null
    }
    master = ctx.createGain()
    master.gain.value = 1
    master.connect(ctx.destination)
  }
  if (ctx.state === "suspended") void ctx.resume().catch(() => undefined)
  return ctx
}

/** Phones allow sound only after a press: wake the context on the first one (before its click lands). */
export function primeUiAudio() {
  if (soundOn()) audio()
}

function blip(
  a: AudioContext,
  { f, to, t = 0, d, type = "sine", v }: { f: number; to?: number; t?: number; d: number; type?: OscillatorType; v: number }
) {
  const at = a.currentTime + t
  const o = a.createOscillator()
  const g = a.createGain()
  o.type = type
  o.frequency.setValueAtTime(f, at)
  if (to) o.frequency.exponentialRampToValueAtTime(to, at + d)
  g.gain.setValueAtTime(0.0001, at)
  g.gain.exponentialRampToValueAtTime(v, at + 0.004)
  g.gain.exponentialRampToValueAtTime(0.0001, at + d)
  o.connect(g).connect(master ?? a.destination)
  o.start(at)
  o.stop(at + d + 0.02)
}

/** A short burst of filtered noise: the "swish" of a page or a panel sliding. */
let noiseBuf: AudioBuffer | null = null
function swish(a: AudioContext, { t = 0, d, from, to, v }: { t?: number; d: number; from: number; to: number; v: number }) {
  if (!noiseBuf) {
    noiseBuf = a.createBuffer(1, Math.floor(a.sampleRate * 0.4), a.sampleRate)
    const ch = noiseBuf.getChannelData(0)
    for (let i = 0; i < ch.length; i++) ch[i] = Math.random() * 2 - 1
  }
  const at = a.currentTime + t
  const src = a.createBufferSource()
  src.buffer = noiseBuf
  const bp = a.createBiquadFilter()
  bp.type = "bandpass"
  bp.Q.value = 1.4
  bp.frequency.setValueAtTime(from, at)
  bp.frequency.exponentialRampToValueAtTime(to, at + d)
  const g = a.createGain()
  g.gain.setValueAtTime(0.0001, at)
  g.gain.exponentialRampToValueAtTime(v, at + d * 0.35)
  g.gain.exponentialRampToValueAtTime(0.0001, at + d)
  src.connect(bp).connect(g).connect(master ?? a.destination)
  src.start(at)
  src.stop(at + d + 0.02)
}

/**
 * The Games side's UI sounds, each a classic, light game cue:
 * - tap: a soft "pop" for any button
 * - tab: a bright double tick for switching tabs
 * - nav: a quick swish + tick, moving to another screen (bottom bar, links)
 * - back: the swish going the other way, a little lower
 * - close: a soft falling "bloop" (✕, cancel, not now)
 * - toggle: a "click-clack" for switches, checkboxes and picks
 * - leave: a short falling three-note "bwomp" (leave a room, quit)
 * - buy: a "cha-ching" when something is bought
 */
export type UiSound = "tap" | "tab" | "nav" | "back" | "close" | "toggle" | "leave" | "buy"

let lastUi = 0
export function playUiSound(kind: UiSound = "tap") {
  if (!soundOn()) return
  const now = performance.now()
  if (now - lastUi < 45) return
  lastUi = now
  const a = audio()
  if (!a) return
  try {
    switch (kind) {
      case "tab":
        blip(a, { f: 1250, to: 1100, d: 0.035, type: "triangle", v: 0.09 })
        blip(a, { f: 1650, to: 1500, t: 0.045, d: 0.035, type: "triangle", v: 0.08 })
        break
      case "nav":
        swish(a, { d: 0.16, from: 900, to: 3200, v: 0.08 })
        blip(a, { f: 880, to: 1320, t: 0.05, d: 0.06, type: "sine", v: 0.1 })
        break
      case "back":
        swish(a, { d: 0.15, from: 2800, to: 800, v: 0.075 })
        blip(a, { f: 760, to: 520, t: 0.04, d: 0.06, type: "sine", v: 0.1 })
        break
      case "close":
        blip(a, { f: 720, to: 300, d: 0.11, type: "sine", v: 0.15 })
        blip(a, { f: 1500, to: 900, d: 0.03, type: "triangle", v: 0.03 })
        break
      case "toggle":
        blip(a, { f: 1900, d: 0.018, type: "square", v: 0.03 })
        blip(a, { f: 1200, t: 0.05, d: 0.022, type: "square", v: 0.028 })
        break
      case "leave":
        blip(a, { f: 523, d: 0.09, type: "triangle", v: 0.12 })
        blip(a, { f: 415, t: 0.09, d: 0.09, type: "triangle", v: 0.11 })
        blip(a, { f: 311, to: 260, t: 0.18, d: 0.2, type: "triangle", v: 0.11 })
        break
      case "buy":
        // Register "cha" (a bright noise hit) then "ching" (a bell chord)
        swish(a, { d: 0.07, from: 4000, to: 6000, v: 0.09 })
        blip(a, { f: 2093, t: 0.08, d: 0.35, type: "sine", v: 0.08 })
        blip(a, { f: 2637, t: 0.08, d: 0.3, type: "sine", v: 0.05 })
        blip(a, { f: 3136, t: 0.1, d: 0.25, type: "sine", v: 0.04 })
        break
      default:
        // A rounded "pop": a quick pitch drop with a tiny click on top
        blip(a, { f: 700, to: 360, d: 0.055, type: "sine", v: 0.17 })
        blip(a, { f: 2100, d: 0.01, type: "triangle", v: 0.035 })
    }
  } catch {
    /* audio unavailable */
  }
}

/** The plain button tap. */
export const playTap = () => playUiSound("tap")

// A pentatonic run upwards, so a stream of coins sounds like a jingle, not a drone
const TING_NOTES = [1568, 1760, 2093, 2349, 2637, 3136]
let lastTing = 0

/** One coin landing: a bright bell-like "ting" (`i` walks it up the scale). */
export function playCoinTing(i = 0) {
  if (!soundOn()) return
  const now = performance.now()
  if (now - lastTing < 35) return
  lastTing = now
  const a = audio()
  if (!a) return
  const f = TING_NOTES[Math.min(i, TING_NOTES.length - 1)]
  try {
    blip(a, { f, d: 0.28, type: "sine", v: 0.075 })
    blip(a, { f: f * 2.76, d: 0.12, type: "sine", v: 0.025 })
    blip(a, { f: f * 1.5, d: 0.06, type: "triangle", v: 0.02 })
  } catch {
    /* audio unavailable */
  }
}
