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

let lastTap = 0
/** A short, soft "tock": the classic button click. */
export function playTap() {
  if (!soundOn()) return
  const now = performance.now()
  if (now - lastTap < 45) return
  lastTap = now
  const a = audio()
  if (!a) return
  try {
    blip(a, { f: 640, to: 380, d: 0.05, type: "sine", v: 0.16 })
    blip(a, { f: 1900, d: 0.012, type: "triangle", v: 0.035 })
  } catch {
    /* audio unavailable */
  }
}

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
