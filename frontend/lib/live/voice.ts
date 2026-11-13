import type { RoomPlayer, VoiceState } from "./types"

/**
 * Voice chat in a room: a WebRTC mesh — one peer connection per other player
 * with their mic on — signalled over the Realtime Database
 * (rooms/{code}/signals/{to}), so there is nothing to pay for. This module
 * holds the pure rules (who offers first, what a valid signal looks like) and
 * VoiceSession, which owns every WebRTC / WebAudio object. No React here:
 * hooks/use-voice.ts wires a session to the room.
 */

export type SignalType = "offer" | "answer" | "ice" | "bye"

export interface Signal {
  from: string
  type: SignalType
  /** offer / answer */
  sdp?: string
  /** ice: JSON of an RTCIceCandidateInit */
  candidate?: string
  /** Server ms */
  at: number
}

/** What a session hands to its transport; `from` and `at` are added on the way out. */
export type OutgoingSignal = Omit<Signal, "from" | "at">

export type PeerStatus = "connecting" | "connected" | "failed"

export interface VoiceSnapshot {
  muted: boolean
  /** Uids talking right now (yours included). */
  speaking: Set<string>
  peers: Record<string, PeerStatus>
}

/* ── Pure rules ──────────────────────────────────────────────────────── */

/** The lower uid starts: it creates the first offer. */
export const isInitiator = (me: string, them: string) => me < them

/** Perfect negotiation: when both sides offer at once, the polite one gives way. */
export const isPolite = (me: string, them: string) => me > them

const SIGNAL_TYPES: readonly SignalType[] = ["offer", "answer", "ice", "bye"]

/** A raw database entry → a signal, or null when it's malformed. */
export function parseSignal(raw: unknown): Signal | null {
  if (!raw || typeof raw !== "object") return null
  const r = raw as Record<string, unknown>
  if (typeof r.from !== "string" || !r.from) return null
  if (
    typeof r.type !== "string" ||
    !SIGNAL_TYPES.includes(r.type as SignalType)
  )
    return null
  const type = r.type as SignalType
  const sig: Signal = {
    from: r.from,
    type,
    at: typeof r.at === "number" ? r.at : 0,
  }
  if (type === "offer" || type === "answer") {
    if (typeof r.sdp !== "string" || !r.sdp) return null
    sig.sdp = r.sdp
  } else if (type === "ice") {
    if (typeof r.candidate !== "string" || !r.candidate) return null
    sig.candidate = r.candidate
  }
  return sig
}

/** The JSON of an ICE candidate → something addIceCandidate accepts, or null. */
export function parseCandidate(
  json: string | undefined
): RTCIceCandidateInit | null {
  if (!json) return null
  let v: unknown
  try {
    v = JSON.parse(json)
  } catch {
    return null
  }
  if (!v || typeof v !== "object") return null
  const c = v as Record<string, unknown>
  if (typeof c.candidate !== "string") return null
  const out: RTCIceCandidateInit = { candidate: c.candidate }
  if (typeof c.sdpMid === "string") out.sdpMid = c.sdpMid
  if (typeof c.sdpMLineIndex === "number") out.sdpMLineIndex = c.sdpMLineIndex
  if (typeof c.usernameFragment === "string")
    out.usernameFragment = c.usernameFragment
  // A candidate needs to say which media line it belongs to
  if (out.sdpMid === undefined && out.sdpMLineIndex === undefined) return null
  return out
}

/** Who I should be connected to: every other seated, online player with their mic on. Sorted, so equal lists compare equal. */
export function voicePeers(
  voice: Record<string, VoiceState> | undefined,
  players: RoomPlayer[],
  uid: string
): string[] {
  return players
    .filter(
      (p) => p.uid !== uid && !p.left && p.online && voice?.[p.uid]?.on === true
    )
    .map((p) => p.uid)
    .sort()
}

/** Everyone in voice, in seat order (you first) — for the avatar row. */
export function voiceMembers(
  voice: Record<string, VoiceState> | undefined,
  players: RoomPlayer[],
  uid: string
) {
  return players.filter(
    (p) =>
      !p.left && (p.uid === uid || (p.online && voice?.[p.uid]?.on === true))
  )
}

/** Google's public STUN: enough for most home / office networks. */
export const STUN_SERVERS: RTCIceServer[] = [
  { urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] },
]

/** The /api/turn answer → ICE servers to use: STUN always, plus every well-formed TURN entry. */
export function iceServersFrom(json: unknown): RTCIceServer[] {
  const out: RTCIceServer[] = [...STUN_SERVERS]
  const list =
    json && typeof json === "object"
      ? (json as { iceServers?: unknown }).iceServers
      : null
  if (!Array.isArray(list)) return out
  for (const entry of list) {
    if (!entry || typeof entry !== "object") continue
    const e = entry as Record<string, unknown>
    const urls = (Array.isArray(e.urls) ? e.urls : [e.urls]).filter(
      (u): u is string => typeof u === "string" && /^(stuns?|turns?):/.test(u)
    )
    if (urls.length === 0) continue
    const server: RTCIceServer = { urls }
    if (typeof e.username === "string") server.username = e.username
    if (typeof e.credential === "string") server.credential = e.credential
    out.push(server)
  }
  return out
}

/** A getUserMedia failure → something a person can act on. */
export function mediaErrorMessage(err: unknown): string {
  const name =
    err && typeof err === "object" && "name" in err
      ? String((err as { name: unknown }).name)
      : ""
  switch (name) {
    case "NotAllowedError":
    case "PermissionDeniedError":
    case "PermissionDismissedError":
      return "Allow the microphone in your browser settings to join voice"
    case "NotFoundError":
    case "DevicesNotFoundError":
    case "OverconstrainedError":
      return "No microphone found on this device"
    case "NotReadableError":
    case "TrackStartError":
    case "AbortError":
      return "Your microphone is in use by another app"
    case "SecurityError":
      return "Voice needs a secure (https) connection"
    default:
      return "Couldn't start voice — please try again"
  }
}

export const isVoiceSupported = () =>
  typeof window !== "undefined" &&
  typeof navigator !== "undefined" &&
  typeof navigator.mediaDevices?.getUserMedia === "function" &&
  typeof RTCPeerConnection === "function"

/** Loudness of a time-domain sample (bytes centred on 128), 0..1. */
export function rmsOf(samples: Uint8Array): number {
  if (samples.length === 0) return 0
  let sum = 0
  for (let i = 0; i < samples.length; i++) {
    const v = (samples[i] - 128) / 128
    sum += v * v
  }
  return Math.sqrt(sum / samples.length)
}

/** Above this RMS someone is talking (room noise sits around 0.005). */
export const SPEAKING_THRESHOLD = 0.025

/* ── The session ─────────────────────────────────────────────────────── */

/** How often the speaking indicator is sampled. */
const METER_MS = 125
/** Not connected after this long → the initiator tears the connection down and offers again. */
const CONNECT_TIMEOUT_MS = 15_000
/** Signals that arrive before we know their sender is in voice wait this long. */
const EARLY_SIGNAL_TTL_MS = 15_000

export interface VoiceSessionOptions {
  uid: string
  /** Delivers a signal to a peer (the hook pushes it to rooms/{code}/signals/{to}). */
  send: (to: string, signal: OutgoingSignal) => void
  onChange: (snapshot: VoiceSnapshot) => void
  /** Settles once TURN credentials are known (or we gave up and use STUN only). */
  iceServers?: Promise<RTCIceServer[]> | RTCIceServer[]
}

interface Peer {
  uid: string
  pc: RTCPeerConnection
  polite: boolean
  /** Perfect-negotiation bookkeeping */
  makingOffer: boolean
  ignoreOffer: boolean
  settingRemoteAnswer: boolean
  /** The initiator negotiates straight away; the other side only once the first offer landed. */
  mayNegotiate: boolean
  /** ICE candidates that arrived before the remote description. */
  queued: RTCIceCandidateInit[]
  audio: HTMLAudioElement | null
  source: MediaStreamAudioSourceNode | null
  analyser: AnalyserNode | null
  status: PeerStatus
  watchdog: number | null
}

/**
 * One person's side of the room's voice chat: their mic, a peer connection to
 * everyone else in voice, hidden <audio> elements playing them, and a loudness
 * meter for the speaking rings. All signalling goes through `send` /
 * `handleSignal`; the hook decides who is in voice via `syncPeers`.
 */
export class VoiceSession {
  readonly uid: string
  private readonly send: VoiceSessionOptions["send"]
  private readonly onChange: VoiceSessionOptions["onChange"]
  private readonly iceServers: Promise<RTCIceServer[]>

  private stream: MediaStream | null = null
  private ctx: AudioContext | null = null
  private localAnalyser: AnalyserNode | null = null
  private sample: Uint8Array<ArrayBuffer> | null = null
  private meter: number | null = null

  private readonly peers = new Map<string, Peer>()
  /** Uids currently in voice; signals from anyone else wait or are dropped. */
  private allowed = new Set<string>()
  private early = new Map<string, { sig: Signal; at: number }[]>()
  /** Everything that touches a peer runs in order, one step at a time. */
  private chain: Promise<void> = Promise.resolve()
  /** Audio elements that refused to autoplay (iOS) — retried on the next tap. */
  private pendingPlay = new Set<HTMLAudioElement>()
  private gestureListener: (() => void) | null = null

  private _muted = false
  private speaking = new Set<string>()
  private stopped = false

  constructor(opts: VoiceSessionOptions) {
    this.uid = opts.uid
    this.send = opts.send
    this.onChange = opts.onChange
    this.iceServers = Promise.resolve(opts.iceServers ?? STUN_SERVERS).catch(
      () => STUN_SERVERS
    )
  }

  get muted() {
    return this._muted
  }

  /**
   * Opens the mic. Call it straight from a tap: the AudioContext and
   * getUserMedia request start before the first `await`, which iOS requires.
   */
  async start(): Promise<void> {
    if (this.stopped) throw new Error("Voice session already stopped")
    const Ctx =
      typeof AudioContext === "function"
        ? AudioContext
        : (window as unknown as { webkitAudioContext?: typeof AudioContext })
            .webkitAudioContext
    const ctx = Ctx ? new Ctx() : null
    this.ctx = ctx
    void ctx?.resume().catch(() => undefined)
    const request = navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    })
    this.installGestureRetry()

    const stream = await request
    if (this.stopped) {
      stream.getTracks().forEach((t) => t.stop())
      return
    }
    this.stream = stream
    if (ctx) {
      try {
        this.localAnalyser = this.makeAnalyser(ctx, stream)
        this.sample = new Uint8Array(this.localAnalyser.fftSize)
      } catch {
        this.localAnalyser = null
      }
    }
    this.meter = window.setInterval(this.tick, METER_MS)
    this.emit()
  }

  /** Tells every peer goodbye, releases the mic and every connection. Safe to call twice. */
  stop(): void {
    if (this.stopped) return
    this.stopped = true
    if (this.meter !== null) window.clearInterval(this.meter)
    this.meter = null
    for (const uid of Array.from(this.peers.keys())) {
      try {
        this.send(uid, { type: "bye" })
      } catch {
        // Nothing to do: they'll notice we're gone from voice/
      }
      this.dropPeer(uid)
    }
    this.early.clear()
    this.stream?.getTracks().forEach((t) => t.stop())
    this.stream = null
    this.localAnalyser = null
    void this.ctx?.close().catch(() => undefined)
    this.ctx = null
    if (this.gestureListener) {
      document.removeEventListener("pointerdown", this.gestureListener, true)
      document.removeEventListener("keydown", this.gestureListener, true)
      this.gestureListener = null
    }
    this.pendingPlay.clear()
    this.speaking = new Set()
  }

  setMuted(muted: boolean): void {
    this._muted = muted
    this.stream?.getAudioTracks().forEach((t) => (t.enabled = !muted))
    if (muted) this.speaking.delete(this.uid)
    this.emit()
  }

  /** The current set of other players in voice: connects to new ones, drops the rest. */
  syncPeers(uids: string[]): void {
    const want = new Set(uids.filter((u) => u !== this.uid))
    this.allowed = want
    this.enqueue(async () => {
      for (const uid of Array.from(this.peers.keys()))
        if (!want.has(uid)) this.dropPeer(uid)
      for (const uid of want) {
        if (this.peers.has(uid)) continue
        await this.createPeer(uid)
        // Their offer may have beaten the voice/ update to us
        const waiting = this.early.get(uid) ?? []
        this.early.delete(uid)
        for (const { sig } of waiting) await this.process(sig)
      }
    })
  }

  addPeer(uid: string): void {
    if (uid === this.uid) return
    this.allowed.add(uid)
    this.enqueue(async () => {
      if (!this.peers.has(uid)) await this.createPeer(uid)
    })
  }

  removePeer(uid: string): void {
    this.allowed.delete(uid)
    this.enqueue(async () => this.dropPeer(uid))
  }

  /** An entry from my signals inbox. Out-of-order and duplicate messages are tolerated. */
  handleSignal(sig: Signal): void {
    if (sig.from === this.uid) return
    this.enqueue(() => this.process(sig))
  }

  /* ── Internals ─────────────────────────────────────────────────────── */

  private enqueue(step: () => Promise<void> | void) {
    this.chain = this.chain
      .then(() => (this.stopped ? undefined : step()))
      .catch((e) => console.warn("Voice:", e))
  }

  private emit() {
    if (this.stopped) return
    const peers: Record<string, PeerStatus> = {}
    for (const p of this.peers.values()) peers[p.uid] = p.status
    this.onChange({
      muted: this._muted,
      speaking: new Set(this.speaking),
      peers,
    })
  }

  private async process(sig: Signal): Promise<void> {
    if (this.stopped) return
    if (!this.allowed.has(sig.from)) {
      if (sig.type === "bye") return
      const now = performance.now()
      const list = (this.early.get(sig.from) ?? []).filter(
        (e) => now - e.at < EARLY_SIGNAL_TTL_MS
      )
      list.push({ sig, at: now })
      this.early.set(sig.from, list)
      return
    }
    let peer = this.peers.get(sig.from)
    if (sig.type === "bye") {
      // They'll offer again if they're still around (a reload, a rebuild)
      if (peer) this.dropPeer(sig.from)
      return
    }
    if (!peer) {
      // Only an offer can open a connection; a stray answer / candidate has nothing to apply to
      if (sig.type !== "offer") return
      peer = await this.createPeer(sig.from)
      if (!peer) return
    }
    const { pc } = peer

    if (sig.type === "ice") {
      const candidate = parseCandidate(sig.candidate)
      if (!candidate) return
      if (!pc.remoteDescription) {
        peer.queued.push(candidate)
        return
      }
      try {
        await pc.addIceCandidate(candidate)
      } catch (e) {
        if (!peer.ignoreOffer) console.warn("Voice: candidate rejected", e)
      }
      return
    }

    // Offer / answer — the "perfect negotiation" pattern
    const description: RTCSessionDescriptionInit = {
      type: sig.type,
      sdp: sig.sdp,
    }
    const readyForOffer =
      !peer.makingOffer &&
      (pc.signalingState === "stable" || peer.settingRemoteAnswer)
    const collision = sig.type === "offer" && !readyForOffer
    peer.ignoreOffer = !peer.polite && collision
    if (peer.ignoreOffer) return
    if (sig.type === "answer" && pc.signalingState !== "have-local-offer")
      return
    if (collision && pc.signalingState === "have-local-offer") {
      // Polite side: step back from our own offer (browsers without implicit rollback)
      await pc.setLocalDescription({ type: "rollback" }).catch(() => undefined)
    }
    peer.settingRemoteAnswer = sig.type === "answer"
    try {
      await pc.setRemoteDescription(description)
    } finally {
      peer.settingRemoteAnswer = false
    }
    peer.mayNegotiate = true
    const queued = peer.queued.splice(0)
    for (const c of queued) await pc.addIceCandidate(c).catch(() => undefined)
    if (sig.type === "offer") {
      await pc.setLocalDescription()
      if (pc.localDescription)
        this.send(peer.uid, { type: "answer", sdp: pc.localDescription.sdp })
    }
  }

  private async createPeer(uid: string): Promise<Peer | undefined> {
    const iceServers = await this.iceServers
    if (
      this.stopped ||
      !this.stream ||
      this.peers.has(uid) ||
      !this.allowed.has(uid)
    )
      return this.peers.get(uid)
    const pc = new RTCPeerConnection({ iceServers })
    const peer: Peer = {
      uid,
      pc,
      polite: isPolite(this.uid, uid),
      makingOffer: false,
      ignoreOffer: false,
      settingRemoteAnswer: false,
      mayNegotiate: isInitiator(this.uid, uid),
      queued: [],
      audio: null,
      source: null,
      analyser: null,
      status: "connecting",
      watchdog: null,
    }
    this.peers.set(uid, peer)
    const live = () => this.peers.get(uid) === peer && !this.stopped

    pc.onnegotiationneeded = () =>
      this.enqueue(async () => {
        if (!live() || !peer.mayNegotiate) return
        try {
          peer.makingOffer = true
          await pc.setLocalDescription()
          if (pc.localDescription)
            this.send(uid, { type: "offer", sdp: pc.localDescription.sdp })
        } finally {
          peer.makingOffer = false
        }
      })
    pc.onicecandidate = ({ candidate }) => {
      if (!live() || !candidate) return
      this.send(uid, {
        type: "ice",
        candidate: JSON.stringify(candidate.toJSON()),
      })
    }
    pc.oniceconnectionstatechange = () => {
      if (!live()) return
      if (
        pc.iceConnectionState === "failed" &&
        typeof pc.restartIce === "function"
      )
        pc.restartIce()
    }
    pc.onconnectionstatechange = () => {
      if (!live()) return
      switch (pc.connectionState) {
        case "connected":
          this.setStatus(peer, "connected")
          this.clearWatchdog(peer)
          break
        case "failed":
          this.setStatus(peer, "failed")
          this.armWatchdog(peer)
          break
        case "disconnected":
          this.setStatus(peer, "connecting")
          this.armWatchdog(peer)
          break
        case "closed":
          this.setStatus(peer, "failed")
          break
      }
    }
    pc.ontrack = ({ track, streams }) => {
      if (!live() || track.kind !== "audio") return
      const stream = streams[0] ?? new MediaStream([track])
      this.attachAudio(peer, stream)
    }

    for (const track of this.stream.getTracks()) pc.addTrack(track, this.stream)
    this.armWatchdog(peer)
    this.emit()
    return peer
  }

  private dropPeer(uid: string) {
    const peer = this.peers.get(uid)
    if (!peer) return
    this.peers.delete(uid)
    this.clearWatchdog(peer)
    const { pc } = peer
    pc.onnegotiationneeded = null
    pc.onicecandidate = null
    pc.oniceconnectionstatechange = null
    pc.onconnectionstatechange = null
    pc.ontrack = null
    try {
      pc.close()
    } catch {
      // Already closed
    }
    this.detachAudio(peer)
    this.speaking.delete(uid)
    this.emit()
  }

  /** The initiator's answer to a connection that never came up: start over with a fresh offer. */
  private async rebuildPeer(uid: string, old: Peer) {
    if (this.stopped || this.peers.get(uid) !== old || !this.allowed.has(uid))
      return
    if (old.polite) {
      // Not ours to restart; wait for the initiator's new offer
      this.armWatchdog(old)
      return
    }
    this.send(uid, { type: "bye" })
    this.dropPeer(uid)
    await this.createPeer(uid)
  }

  private armWatchdog(peer: Peer) {
    this.clearWatchdog(peer)
    peer.watchdog = window.setTimeout(() => {
      peer.watchdog = null
      if (peer.status !== "connected")
        this.enqueue(() => this.rebuildPeer(peer.uid, peer))
    }, CONNECT_TIMEOUT_MS)
  }

  private clearWatchdog(peer: Peer) {
    if (peer.watchdog !== null) window.clearTimeout(peer.watchdog)
    peer.watchdog = null
  }

  private setStatus(peer: Peer, status: PeerStatus) {
    if (peer.status === status) return
    peer.status = status
    this.emit()
  }

  private attachAudio(peer: Peer, stream: MediaStream) {
    if (peer.audio?.srcObject === stream) return
    this.detachAudio(peer)
    const audio = document.createElement("audio")
    audio.autoplay = true
    audio.setAttribute("playsinline", "")
    audio.volume = 1
    audio.srcObject = stream
    audio.dataset.voicePeer = peer.uid
    document.body.appendChild(audio)
    peer.audio = audio
    this.tryPlay(audio)
    if (this.ctx) {
      try {
        peer.source = this.ctx.createMediaStreamSource(stream)
        peer.analyser = this.ctx.createAnalyser()
        peer.analyser.fftSize = 256
        peer.source.connect(peer.analyser)
      } catch {
        peer.analyser = null
      }
    }
  }

  private detachAudio(peer: Peer) {
    if (peer.audio) {
      this.pendingPlay.delete(peer.audio)
      peer.audio.pause()
      peer.audio.srcObject = null
      peer.audio.remove()
      peer.audio = null
    }
    try {
      peer.source?.disconnect()
    } catch {
      // Context already closed
    }
    peer.source = null
    peer.analyser = null
  }

  private tryPlay(audio: HTMLAudioElement) {
    audio.play().then(
      () => this.pendingPlay.delete(audio),
      () => this.pendingPlay.add(audio)
    )
  }

  /** iOS only lets audio start from a tap: retry blocked players (and a suspended context) on the next one. */
  private installGestureRetry() {
    if (this.gestureListener) return
    this.gestureListener = () => {
      if (this.ctx?.state === "suspended")
        void this.ctx.resume().catch(() => undefined)
      for (const audio of Array.from(this.pendingPlay)) this.tryPlay(audio)
    }
    document.addEventListener("pointerdown", this.gestureListener, true)
    document.addEventListener("keydown", this.gestureListener, true)
  }

  private makeAnalyser(ctx: AudioContext, stream: MediaStream) {
    const analyser = ctx.createAnalyser()
    analyser.fftSize = 256
    ctx.createMediaStreamSource(stream).connect(analyser)
    return analyser
  }

  private levelOf(analyser: AnalyserNode) {
    if (!this.sample || this.sample.length !== analyser.fftSize)
      this.sample = new Uint8Array(analyser.fftSize)
    analyser.getByteTimeDomainData(this.sample)
    return rmsOf(this.sample)
  }

  private tick = () => {
    if (this.stopped) return
    const next = new Set<string>()
    if (
      !this._muted &&
      this.localAnalyser &&
      this.levelOf(this.localAnalyser) > SPEAKING_THRESHOLD
    )
      next.add(this.uid)
    for (const p of this.peers.values()) {
      if (p.analyser && this.levelOf(p.analyser) > SPEAKING_THRESHOLD)
        next.add(p.uid)
    }
    if (
      next.size === this.speaking.size &&
      Array.from(next).every((u) => this.speaking.has(u))
    )
      return
    this.speaking = next
    this.emit()
  }
}
