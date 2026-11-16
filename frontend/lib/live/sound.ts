"use client"

import * as React from "react"

/**
 * Game sounds, in packs:
 *
 * - "classic": calm, decent effects synthesised with the Web Audio API (dice
 *   rattle, piece taps, a wooden chess knock, a win fanfare, arcade blips
 *   for Snakes & Ladders) — no voices.
 * - "cid": CID & Bollywood memes (Fahh, Nahi nahi Saluke, Tu to gaya bete,
 *   Kaun hai re, Alag hi level ka banda…) on top of the effects.
 * - "internet": internet memes (Emotional damage, Moye moye, Chicken scream,
 *   Depression, Meri Jung…).
 * - "desi": every meme together.
 *
 * Meme clips live in /public/sounds/desi (see its README and SOURCES). A
 * missing clip falls back to the phone saying the line in Hindi. One sound at
 * a time: a new one stops the last. On by default, classic; per device.
 */

export type SoundPack = "classic" | "cid" | "internet" | "desi"

export const SOUND_PACKS: { value: SoundPack; label: string; blurb: string }[] = [
  { value: "classic", label: "Classic", blurb: "Calm game sounds" },
  { value: "cid", label: "CID & Bollywood", blurb: "Fahh, Nahi nahi Saluke, Tu to gaya bete…" },
  { value: "internet", label: "Internet memes", blurb: "Emotional damage, Moye moye, Chicken scream…" },
  { value: "desi", label: "Desi mix", blurb: "Every meme, mixed" },
]
const isPack = (v: unknown): v is SoundPack => SOUND_PACKS.some((p) => p.value === v)

export type SoundEvent =
  // Ludo
  | "dice"
  | "step"
  | "capture" // you cut someone
  | "captured" // you got cut
  | "home"
  | "six"
  | "your_turn"
  | "power"
  // Board games
  | "move"
  | "take" // a piece taken (chess / checkers)
  | "check"
  | "place" // tic tac toe
  // Snakes & Ladders (the boards play these as each moment animates)
  | "hop" // a piece lands on the next square
  | "bite" // a snake swallows a piece
  | "climb" // a piece goes up a ladder
  | "gate_open" // the tower's gate swings open on a 1
  | "gate_shut" // the gate rattles and stays shut
  | "summit" // someone reached 100
  // Scribble
  | "correct"
  | "tick"
  // Everyone
  | "win"
  | "lose"
  // Throwables (on impact; "chakra" when it launches)
  | "hit_rose"
  | "hit_kiss"
  | "hit_cheers"
  | "hit_tomato"
  | "hit_egg"
  | "hit_water"
  | "hit_knife"
  | "hit_punch"
  | "hit_bomb"
  | "hit_chakra"
  | "hit_meteor"
  | "hit_vajra"
  | "chakra"

/* ── Settings (per device) ──────────────────────────────────────────── */

const KEY = "joysplit_sound"
type Settings = { on: boolean; pack: SoundPack }
const DEFAULTS: Settings = { on: true, pack: "classic" }
let cached: Settings | null = null
const listeners = new Set<() => void>()

function readSettings(): Settings {
  if (cached) return cached
  try {
    const raw = localStorage.getItem(KEY)
    const v = raw ? (JSON.parse(raw) as Partial<Settings>) : {}
    cached = { on: v.on ?? DEFAULTS.on, pack: isPack(v.pack) ? v.pack : "classic" }
  } catch {
    cached = DEFAULTS
  }
  return cached
}

export function setSoundSettings(next: Partial<Settings>) {
  cached = { ...readSettings(), ...next }
  try {
    localStorage.setItem(KEY, JSON.stringify(cached))
  } catch {
    /* storage unavailable */
  }
  listeners.forEach((l) => l())
  if (cached.on) unlock()
}

/** The sound settings, live. */
export function useSoundSettings(): Settings {
  return React.useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    readSettings,
    () => DEFAULTS
  )
}

/* ── Audio ──────────────────────────────────────────────────────────── */

let ctx: AudioContext | null = null
function audio(): AudioContext | null {
  if (typeof window === "undefined") return null
  if (!ctx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AC) return null
    ctx = new AC()
  }
  if (ctx.state === "suspended") void ctx.resume().catch(() => undefined)
  return ctx
}

/** Phones only allow sound after a tap: wake the audio on the first one. */
function unlock() {
  audio()
}
if (typeof window !== "undefined") {
  const once = () => {
    unlock()
    window.removeEventListener("pointerdown", once)
    window.removeEventListener("keydown", once)
  }
  window.addEventListener("pointerdown", once)
  window.addEventListener("keydown", once)
}

type Tone = { f: number; to?: number; t?: number; d: number; type?: OscillatorType; v?: number }

function tone(a: AudioContext, { f, to, t = 0, d, type = "sine", v = 0.2 }: Tone) {
  const at = a.currentTime + t
  const o = a.createOscillator()
  const g = a.createGain()
  o.type = type
  o.frequency.setValueAtTime(f, at)
  if (to) o.frequency.exponentialRampToValueAtTime(to, at + d)
  g.gain.setValueAtTime(0.0001, at)
  g.gain.exponentialRampToValueAtTime(v, at + 0.01)
  g.gain.exponentialRampToValueAtTime(0.0001, at + d)
  o.connect(g).connect(bus ?? a.destination)
  o.start(at)
  o.stop(at + d + 0.02)
}

let noiseBuf: AudioBuffer | null = null
function noise(
  a: AudioContext,
  { t = 0, d, f = 1200, q = 1, type = "bandpass", v = 0.25, to }: { t?: number; d: number; f?: number; q?: number; type?: BiquadFilterType; v?: number; to?: number }
) {
  if (!noiseBuf) {
    noiseBuf = a.createBuffer(1, a.sampleRate, a.sampleRate)
    const data = noiseBuf.getChannelData(0)
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
  }
  const at = a.currentTime + t
  const src = a.createBufferSource()
  src.buffer = noiseBuf
  const filter = a.createBiquadFilter()
  filter.type = type
  filter.frequency.setValueAtTime(f, at)
  if (to) filter.frequency.exponentialRampToValueAtTime(to, at + d)
  filter.Q.value = q
  const g = a.createGain()
  g.gain.setValueAtTime(v, at)
  g.gain.exponentialRampToValueAtTime(0.0001, at + d)
  src.connect(filter).connect(g).connect(bus ?? a.destination)
  src.start(at, Math.random() * 0.5)
  src.stop(at + d + 0.02)
}

/** A tone sliding from `f` to `to` with a vibrato on top (`rate` Hz, ±`depth` Hz): the arcade "wah-wah". */
function wobble(a: AudioContext, { f, to, t = 0, d, rate, depth, type = "square", v = 0.05 }: Tone & { rate: number; depth: number }) {
  const at = a.currentTime + t
  const o = a.createOscillator()
  const lfo = a.createOscillator()
  const lfoGain = a.createGain()
  const g = a.createGain()
  o.type = type
  o.frequency.setValueAtTime(f, at)
  if (to) o.frequency.exponentialRampToValueAtTime(to, at + d)
  lfo.frequency.value = rate
  lfoGain.gain.value = depth
  lfo.connect(lfoGain).connect(o.frequency)
  g.gain.setValueAtTime(0.0001, at)
  g.gain.exponentialRampToValueAtTime(v, at + 0.02)
  g.gain.setValueAtTime(v, at + d * 0.7)
  g.gain.exponentialRampToValueAtTime(0.0001, at + d)
  o.connect(g).connect(bus ?? a.destination)
  o.start(at)
  lfo.start(at)
  o.stop(at + d + 0.02)
  lfo.stop(at + d + 0.02)
}

/** Hops alternate between two pitches, so a walk bounces ("toi-toi-toi") instead of droning. */
let hopCount = 0

/** The effects themselves, shared by every pack. */
const FX: Record<SoundEvent, (a: AudioContext) => void> = {
  dice: (a) => {
    for (let i = 0; i < 6; i++) noise(a, { t: i * 0.07 + Math.random() * 0.02, d: 0.05, f: 2500 + Math.random() * 1500, q: 4, v: 0.35 })
    tone(a, { t: 0.42, f: 220, d: 0.08, type: "triangle", v: 0.15 })
  },
  step: (a) => tone(a, { f: 640, to: 520, d: 0.06, type: "triangle", v: 0.12 }),
  capture: (a) => {
    tone(a, { f: 180, to: 60, d: 0.25, v: 0.35 })
    noise(a, { d: 0.18, f: 900, q: 0.7, v: 0.3 })
  },
  captured: (a) => {
    tone(a, { f: 400, to: 120, d: 0.45, type: "sawtooth", v: 0.12 })
  },
  home: (a) => [523, 659, 784, 1047].forEach((f, i) => tone(a, { t: i * 0.08, f, d: 0.25, type: "triangle", v: 0.16 })),
  six: (a) => [784, 1047].forEach((f, i) => tone(a, { t: i * 0.09, f, d: 0.18, type: "triangle", v: 0.15 })),
  your_turn: (a) => [660, 880].forEach((f, i) => tone(a, { t: i * 0.1, f, d: 0.14, v: 0.13 })),
  power: (a) => {
    tone(a, { f: 300, to: 1500, d: 0.35, type: "square", v: 0.07 })
    ;[1047, 1319, 1568].forEach((f, i) => tone(a, { t: 0.3 + i * 0.06, f, d: 0.2, type: "triangle", v: 0.12 }))
  },
  move: (a) => {
    noise(a, { d: 0.05, f: 1800, q: 6, v: 0.4 })
    tone(a, { f: 300, d: 0.06, type: "triangle", v: 0.12 })
  },
  take: (a) => {
    noise(a, { d: 0.06, f: 1500, q: 5, v: 0.45 })
    noise(a, { t: 0.07, d: 0.08, f: 900, q: 4, v: 0.35 })
  },
  check: (a) => [880, 660].forEach((f, i) => tone(a, { t: i * 0.12, f, d: 0.16, type: "square", v: 0.06 })),
  place: (a) => tone(a, { f: 520, to: 780, d: 0.09, type: "sine", v: 0.18 }),
  // Snakes & Ladders: little arcade sounds, quieter than the dice
  hop: (a) => {
    const k = hopCount++ % 2 ? 1.19 : 1
    tone(a, { f: 330 * k, to: 700 * k, d: 0.07, type: "triangle", v: 0.08 })
    tone(a, { f: 660 * k, to: 1400 * k, d: 0.05, type: "square", v: 0.018 })
  },
  bite: (a) => {
    // "Tau…" then a wobbling slide down: "rew-rew-rew"
    tone(a, { f: 880, to: 620, d: 0.09, type: "square", v: 0.045 })
    wobble(a, { t: 0.1, f: 620, to: 120, d: 0.75, rate: 9, depth: 38, type: "square", v: 0.04 })
    wobble(a, { t: 0.1, f: 310, to: 60, d: 0.75, rate: 9, depth: 19, type: "triangle", v: 0.08 })
  },
  climb: (a) => {
    // A quick sparkly run up the scale, a whoosh under it and a twinkle at the top
    ;[523, 659, 784, 1047, 1319, 1568, 2093].forEach((f, i) => tone(a, { t: i * 0.05, f, d: 0.12, type: "triangle", v: 0.07 }))
    tone(a, { f: 300, to: 1500, d: 0.36, v: 0.035 })
    ;[2637, 3136].forEach((f, i) => tone(a, { t: 0.38 + i * 0.06, f, d: 0.22, v: 0.035 }))
  },
  gate_open: (a) => {
    // The latch clicks, the hinges creak, the door knocks the post
    noise(a, { d: 0.03, f: 2600, q: 8, v: 0.22 })
    wobble(a, { t: 0.05, f: 150, to: 230, d: 0.32, rate: 22, depth: 25, type: "sawtooth", v: 0.022 })
    tone(a, { t: 0.36, f: 150, to: 85, d: 0.09, type: "triangle", v: 0.09 })
  },
  gate_shut: (a) => {
    // Rattle-rattle against the lock, then a dull thud
    for (let i = 0; i < 4; i++) noise(a, { t: i * 0.065, d: 0.035, f: 1300 + (i % 2) * 400, q: 6, v: 0.2 })
    tone(a, { t: 0.27, f: 120, to: 70, d: 0.1, type: "triangle", v: 0.09 })
  },
  summit: (a) => {
    // A short happy jingle: up, up, up — ta-daa
    ;[784, 1047, 1319, 1568].forEach((f, i) => {
      tone(a, { t: i * 0.085, f, d: 0.12, type: "triangle", v: 0.08 })
      tone(a, { t: i * 0.085, f: f * 2, d: 0.06, type: "square", v: 0.012 })
    })
    ;[1047, 1319, 2093].forEach((f) => tone(a, { t: 0.36, f, d: 0.45, type: "triangle", v: 0.06 }))
  },
  correct: (a) => [880, 1320].forEach((f, i) => tone(a, { t: i * 0.08, f, d: 0.22, v: 0.15 })),
  tick: (a) => tone(a, { f: 1200, d: 0.03, type: "square", v: 0.05 }),
  win: (a) => [523, 659, 784, 1047, 784, 1047].forEach((f, i) => tone(a, { t: i * 0.12, f, d: 0.3, type: "triangle", v: 0.16 })),
  lose: (a) => [392, 349, 311, 262].forEach((f, i) => tone(a, { t: i * 0.18, f, d: 0.35, type: "triangle", v: 0.14 })),
  hit_rose: (a) => [1319, 1568, 2093].forEach((f, i) => tone(a, { t: i * 0.06, f, d: 0.3, v: 0.09 })),
  hit_kiss: (a) => {
    noise(a, { d: 0.05, f: 3000, q: 3, v: 0.4 })
    tone(a, { t: 0.02, f: 900, to: 1400, d: 0.08, v: 0.12 })
  },
  hit_cheers: (a) => [2637, 3136].forEach((f, i) => tone(a, { t: i * 0.05, f, d: 0.5, v: 0.08 })),
  hit_tomato: (a) => noise(a, { d: 0.35, f: 500, to: 150, q: 1, type: "lowpass", v: 0.6 }),
  hit_egg: (a) => {
    noise(a, { d: 0.04, f: 4000, q: 5, v: 0.5 })
    noise(a, { t: 0.05, d: 0.25, f: 700, to: 250, q: 1, type: "lowpass", v: 0.4 })
  },
  hit_water: (a) => noise(a, { d: 0.6, f: 2500, to: 400, q: 0.8, v: 0.45 }),
  hit_knife: (a) => {
    noise(a, { d: 0.18, f: 6000, to: 2000, q: 2, type: "highpass", v: 0.3 })
    tone(a, { t: 0.15, f: 2400, d: 0.2, type: "triangle", v: 0.1 })
  },
  hit_punch: (a) => {
    // A heavy thump with a slap on top
    tone(a, { f: 140, to: 45, d: 0.22, v: 0.7 })
    noise(a, { d: 0.08, f: 1800, q: 0.8, v: 0.6 })
    noise(a, { t: 0.02, d: 0.15, f: 400, to: 120, q: 0.6, type: "lowpass", v: 0.5 })
  },
  hit_bomb: (a) => {
    tone(a, { f: 120, to: 30, d: 0.9, v: 0.6 })
    noise(a, { d: 1, f: 600, to: 80, q: 0.5, type: "lowpass", v: 0.8 })
  },
  hit_chakra: (a) => {
    tone(a, { f: 200, to: 40, d: 1, v: 0.5 })
    noise(a, { d: 1.1, f: 1500, to: 100, q: 0.6, type: "lowpass", v: 0.7 })
    ;[1047, 1319, 1568, 2093].forEach((f, i) => tone(a, { t: 0.2 + i * 0.07, f, d: 0.5, v: 0.08 }))
  },
  hit_meteor: (a) => {
    noise(a, { d: 0.6, f: 4000, to: 300, q: 0.7, v: 0.4 })
    tone(a, { t: 0.5, f: 90, to: 25, d: 1, v: 0.6 })
    noise(a, { t: 0.5, d: 1, f: 500, to: 60, q: 0.5, type: "lowpass", v: 0.8 })
  },
  hit_vajra: (a) => {
    noise(a, { d: 0.12, f: 5000, q: 0.5, type: "highpass", v: 0.6 })
    noise(a, { t: 0.1, d: 1.2, f: 400, to: 60, q: 0.4, type: "lowpass", v: 0.7 })
  },
  chakra: (a) => {
    // A rising, spinning whoosh
    tone(a, { f: 200, to: 1200, d: 1.2, type: "sawtooth", v: 0.05 })
    noise(a, { d: 1.2, f: 800, to: 4000, q: 3, v: 0.25 })
  },
}

/**
 * Meme lines. Each has a clip: `/public/sounds/desi/<clip>.mp3` plays if it's
 * there; otherwise the phone says `say` in Hindi. Lines without `say` (a
 * scream, a song) play only from their clip. `packs` says which meme pack a
 * line belongs to; lines without it are in every meme pack, and "desi" (the
 * mix) has them all.
 */
type MemePack = "cid" | "internet"
type Line = { clip: string; say?: string; packs?: MemePack[] }
const CID: MemePack[] = ["cid"]
const NET: MemePack[] = ["internet"]
const DESI_LINES: Partial<Record<SoundEvent, Line[]>> = {
  capture: [
    { clip: "kaat-diya", say: "Kaat diya!" },
    { clip: "tu-toh-gaya-beta", say: "Tu toh gaya beta!", packs: CID },
    { clip: "alag-level", say: "Wo alag hi level ka banda tha!", packs: CID },
  ],
  captured: [
    { clip: "fahh", say: "Fahhhh!", packs: CID },
    { clip: "arre-baap-re", say: "Arre baap re!", packs: CID },
    { clip: "nahi-nahi", say: "Nahi... nahi... nahiii!", packs: CID },
    { clip: "bhai-kya-kar-raha-hai", say: "Bhai kya kar raha hai tu?", packs: CID },
    { clip: "kaun-hai-re", say: "Kaun hai re?", packs: CID },
    { clip: "chicken-scream", packs: NET },
    { clip: "ouch", say: "Ouchhh!", packs: NET },
    { clip: "emotional-damage", say: "Emotional damage!", packs: NET },
  ],
  six: [{ clip: "chhakka", say: "Chhakka!" }],
  home: [{ clip: "ghar-aa-gaya", say: "Ghar aa gaya!" }],
  your_turn: [{ clip: "teri-baari", say: "Chal na bhai, teri baari!" }],
  power: [{ clip: "shaktimaan", say: "Shaktimaan!" }],
  take: [
    { clip: "gaya-kaam-se", say: "Gaya kaam se!" },
    { clip: "tu-toh-gaya-beta", say: "Tu toh gaya beta!", packs: CID },
  ],
  check: [{ clip: "shah", say: "Shah!" }],
  bite: [{ clip: "arre-baap-re", say: "Arre baap re!" }],
  climb: [{ clip: "shaktimaan", say: "Shaktimaan!" }],
  summit: [{ clip: "alag-level", say: "Wo alag hi level ka banda tha!" }],
  correct: [{ clip: "sahi-jawab", say: "Sahi jawab!" }],
  win: [
    { clip: "jeet-gaya", say: "Jeet gaya bhai!" },
    { clip: "alag-level", say: "Wo alag hi level ka banda tha!", packs: CID },
  ],
  lose: [
    { clip: "arre-yaar", say: "Arre yaar!" },
    { clip: "dukh-khatam-nahi-hota", say: "Ye dukh kaahe khatam nahi hota!" },
    { clip: "arre-baap-re", say: "Arre baap re!", packs: CID },
    { clip: "nahi-nahi", say: "Nahi... nahi... nahiii!", packs: CID },
    { clip: "chicken-scream", packs: NET },
    { clip: "depression", packs: NET },
    { clip: "moye-moye", say: "Moye moye!", packs: NET },
    { clip: "meri-jung", packs: NET },
  ],
  hit_bomb: [{ clip: "dhamaaka", say: "Dhamaaka!" }],
  hit_kiss: [{ clip: "mwah", say: "Mwah!" }],
  hit_tomato: [{ clip: "chhapaak", say: "Chhapaak!" }],
  hit_egg: [{ clip: "anda", say: "Anda phoot gaya!" }],
  hit_knife: [{ clip: "dhishoom", say: "Dhishoom!" }],
  hit_punch: [{ clip: "punch" }, { clip: "dhishoom", say: "Dhishoom!" }],
  chakra: [{ clip: "angenghatram", say: "Angenghatram nayen waktram!" }],
  hit_meteor: [{ clip: "dharti-hila-di", say: "Dharti hila di!" }],
  hit_vajra: [{ clip: "bijli", say: "Bijli gir gayi!" }],
}

const missingClips = new Set<string>()

/* ── One sound at a time ────────────────────────────────────────────── */

/** What's playing now: its effects (through one gain) and its clip, so the next sound can stop it. */
let current: { gain: GainNode | null; clip: HTMLAudioElement | null } | null = null
/** Where the effects being played right now go (the current sound's gain). */
let bus: AudioNode | null = null
/** Tiny ticks that never cut another sound off (a piece hopping square by square, the gate's latch). */
const SOFT: SoundEvent[] = ["step", "tick", "hop", "gate_open", "gate_shut"]

/** The moments a Snakes & Ladders board plays as they animate (see the boards' `onSound`). */
export type SnakesSound = Extract<SoundEvent, "hop" | "bite" | "climb" | "gate_open" | "gate_shut" | "summit">

function stopCurrent(a: AudioContext | null) {
  const c = current
  current = null
  if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel()
  if (!c) return
  if (c.gain && a) {
    // A quick fade, not a click
    const g = c.gain
    g.gain.cancelScheduledValues(a.currentTime)
    g.gain.setValueAtTime(g.gain.value, a.currentTime)
    g.gain.linearRampToValueAtTime(0, a.currentTime + 0.06)
    window.setTimeout(() => g.disconnect(), 120)
  }
  if (c.clip) {
    const clip = c.clip
    const fade = window.setInterval(() => {
      clip.volume = Math.max(0, clip.volume - 0.25)
      if (clip.volume <= 0.01) {
        clip.pause()
        window.clearInterval(fade)
      }
    }, 20)
  }
}

function sayMeme(event: SoundEvent, pack: SoundPack, soft: boolean) {
  const all = DESI_LINES[event]
  if (!all || typeof window === "undefined") return
  const pool = all.filter((l) => pack === "desi" || !l.packs || l.packs.includes(pack as MemePack))
  if (pool.length === 0) return
  const line = pool[Math.floor(Math.random() * pool.length)]
  const mine = current
  const speak = () => {
    // Something newer started meanwhile: stay quiet
    if (!soft && current !== mine) return
    // A clip-only line (a scream, a song) that's missing: say another line of the moment
    const text = line.say ?? pool.find((l) => l.say)?.say
    if (!text || !("speechSynthesis" in window)) return
    const u = new SpeechSynthesisUtterance(text)
    u.lang = "hi-IN"
    const voice = window.speechSynthesis.getVoices().find((v) => v.lang.startsWith("hi"))
    if (voice) u.voice = voice
    u.rate = 1.05
    u.pitch = event === "captured" || event === "bite" ? 0.7 : 1.25
    window.speechSynthesis.cancel()
    window.speechSynthesis.speak(u)
  }
  if (missingClips.has(line.clip)) return speak()
  const clip = new Audio(`/sounds/desi/${line.clip}.mp3`)
  clip.volume = 0.9
  clip.addEventListener("error", () => {
    missingClips.add(line.clip)
    speak()
  })
  if (!soft && mine) mine.clip = clip
  void clip.play().catch(() => undefined)
}

/**
 * Play a game sound (respects the on/off switch and the chosen pack). A new
 * sound stops the one still playing — effects, clip and spoken line — so
 * they never pile up; the tiny step ticks are the exception.
 */
export function playSound(event: SoundEvent) {
  const s = readSettings()
  if (!s.on) return
  const a = audio()
  const soft = SOFT.includes(event)
  if (!soft) {
    stopCurrent(a)
    current = { gain: null, clip: null }
  }
  if (a) {
    try {
      if (!soft) {
        const g = a.createGain()
        g.connect(a.destination)
        current!.gain = g
        bus = g
      }
      FX[event](a)
    } catch {
      /* audio unavailable */
    } finally {
      bus = null
    }
  }
  if (s.pack !== "classic") sayMeme(event, s.pack, soft)
}

/** Calls `fn` when `value` changes after the first render (not on mount). */
export function useOnChange<T>(value: T, fn: (next: T, prev: T) => void) {
  const prev = React.useRef(value)
  const cb = React.useRef(fn)
  React.useEffect(() => {
    cb.current = fn
  })
  React.useEffect(() => {
    if (Object.is(prev.current, value)) return
    const was = prev.current
    prev.current = value
    cb.current(value, was)
  }, [value])
}
