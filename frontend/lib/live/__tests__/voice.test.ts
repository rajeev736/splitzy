/** npx tsx lib/live/__tests__/voice.test.ts */
import type { RoomPlayer, VoiceState } from "../types"
import {
  iceServersFrom,
  isInitiator,
  isPolite,
  mediaErrorMessage,
  parseCandidate,
  parseSignal,
  rmsOf,
  SPEAKING_THRESHOLD,
  STUN_SERVERS,
  voiceMembers,
  voicePeers,
} from "../voice"

function assert(condition: unknown, message: string) {
  if (!condition) throw new Error(`Assertion failed: ${message}`)
}

const player = (
  uid: string,
  seat: number,
  extra: Partial<RoomPlayer> = {}
): RoomPlayer => ({
  uid,
  name: `${uid} Kumar`,
  seat,
  joinedAt: seat,
  online: true,
  lastSeen: 0,
  ...extra,
})

console.log("Running voice tests...\n")

// ── Who offers ───────────────────────────────────────────────────────────
{
  assert(isInitiator("aaa", "bbb"), "lower uid initiates")
  assert(!isInitiator("bbb", "aaa"), "higher uid waits")
  assert(isPolite("bbb", "aaa"), "higher uid is polite")
  assert(!isPolite("aaa", "bbb"), "lower uid is impolite")
  assert(
    isInitiator("a", "b") !== isInitiator("b", "a"),
    "exactly one side initiates"
  )
  assert(
    isPolite("a", "b") !== isPolite("b", "a"),
    "exactly one side is polite"
  )
  assert(
    isInitiator("x", "y") === !isPolite("x", "y"),
    "the initiator is the impolite side"
  )
  assert(
    !isInitiator("same", "same") && !isPolite("same", "same"),
    "a uid is neither against itself"
  )
}

// ── Signals ──────────────────────────────────────────────────────────────
{
  const offer = parseSignal({ from: "u1", type: "offer", sdp: "v=0...", at: 1 })
  assert(
    offer?.type === "offer" && offer.sdp === "v=0..." && offer.from === "u1",
    "offer parses"
  )
  assert(
    parseSignal({ from: "u1", type: "offer", at: 1 }) === null,
    "offer without sdp is rejected"
  )
  assert(
    parseSignal({ from: "u1", type: "answer", sdp: "", at: 1 }) === null,
    "empty sdp is rejected"
  )
  const ice = parseSignal({ from: "u2", type: "ice", candidate: "{}", at: 5 })
  assert(
    ice?.type === "ice" && ice.candidate === "{}" && ice.at === 5,
    "ice parses"
  )
  assert(
    parseSignal({ from: "u2", type: "ice", at: 5 }) === null,
    "ice without candidate is rejected"
  )
  const bye = parseSignal({ from: "u3", type: "bye", at: 9 })
  assert(
    bye?.type === "bye" && bye.sdp === undefined && bye.candidate === undefined,
    "bye parses"
  )
  assert(
    parseSignal({ from: "u3", type: "bye" })?.at === 0,
    "missing at defaults to 0"
  )
  assert(
    parseSignal({ from: "u1", type: "hangup", at: 1 }) === null,
    "unknown type is rejected"
  )
  assert(
    parseSignal({ type: "bye", at: 1 }) === null,
    "missing from is rejected"
  )
  assert(
    parseSignal({ from: "", type: "bye", at: 1 }) === null,
    "empty from is rejected"
  )
  assert(
    parseSignal(null) === null &&
      parseSignal("bye") === null &&
      parseSignal(42) === null,
    "non-objects are rejected"
  )
}

// ── ICE candidates ───────────────────────────────────────────────────────
{
  const full = parseCandidate(
    JSON.stringify({
      candidate: "candidate:1 1 udp 2 1.2.3.4 5 typ host",
      sdpMid: "0",
      sdpMLineIndex: 0,
      usernameFragment: "abcd",
    })
  )
  assert(
    full?.candidate === "candidate:1 1 udp 2 1.2.3.4 5 typ host",
    "candidate string kept"
  )
  assert(
    full?.sdpMid === "0" &&
      full.sdpMLineIndex === 0 &&
      full.usernameFragment === "abcd",
    "fields kept"
  )
  const endOf = parseCandidate(
    JSON.stringify({ candidate: "", sdpMid: "0", sdpMLineIndex: 0 })
  )
  assert(endOf?.candidate === "", "end-of-candidates (empty string) is allowed")
  assert(
    parseCandidate(JSON.stringify({ candidate: "x" })) === null,
    "a candidate with no media line is rejected"
  )
  assert(
    parseCandidate(JSON.stringify({ sdpMid: "0" })) === null,
    "missing candidate string is rejected"
  )
  assert(parseCandidate("not json") === null, "bad json is rejected")
  assert(
    parseCandidate(undefined) === null && parseCandidate("") === null,
    "empty is rejected"
  )
  assert(
    parseCandidate("null") === null &&
      parseCandidate("[1]")?.candidate === undefined,
    "non-objects are rejected"
  )
  const extra = parseCandidate(
    JSON.stringify({ candidate: "c", sdpMid: "0", evil: true })
  )
  assert(extra !== null && !("evil" in extra), "unknown fields are dropped")
}

// ── Who to connect to ────────────────────────────────────────────────────
{
  const players = [
    player("host", 0),
    player("bob", 1),
    player("cat", 2, { online: false }),
    player("dan", 3, { left: true }),
    player("eve", 4),
  ]
  const voice: Record<string, VoiceState> = {
    host: { on: true, muted: false },
    bob: { on: true, muted: true },
    cat: { on: true, muted: false },
    dan: { on: true, muted: false },
    eve: { on: false, muted: false },
    ghost: { on: true, muted: false },
  }
  const peers = voicePeers(voice, players, "host")
  assert(
    peers.join(",") === "bob",
    `only bob (got ${peers.join(",")}): not me, not offline, not left, not off, not unseated`
  )
  assert(
    voicePeers(voice, players, "bob").join(",") === "host",
    "bob sees host"
  )
  assert(
    voicePeers(undefined, players, "host").length === 0,
    "no voice node → nobody"
  )
  assert(voicePeers({}, players, "host").length === 0, "empty voice → nobody")
  const sorted = voicePeers(
    {
      host: { on: true, muted: false },
      bob: { on: true, muted: false },
      eve: { on: true, muted: false },
    },
    players,
    "zed"
  )
  assert(
    sorted.join(",") === "bob,eve,host",
    "sorted by uid regardless of seat"
  )

  const members = voiceMembers(voice, players, "host").map((p) => p.uid)
  assert(
    members.join(",") === "host,bob",
    `members in seat order, me first (got ${members.join(",")})`
  )
  assert(
    voiceMembers(voice, players, "eve")
      .map((p) => p.uid)
      .join(",") === "host,bob,eve",
    "I'm listed even before my voice entry lands"
  )
}

// ── ICE servers ──────────────────────────────────────────────────────────
{
  assert(
    STUN_SERVERS.length === 1 &&
      (STUN_SERVERS[0].urls as string[]).every((u) => u.startsWith("stun:")),
    "default is Google STUN"
  )
  const stunOnly = iceServersFrom({ configured: false })
  assert(
    stunOnly.length === 1 && stunOnly[0] === STUN_SERVERS[0],
    "no iceServers → STUN only"
  )
  assert(
    iceServersFrom(null).length === 1 &&
      iceServersFrom("x").length === 1 &&
      iceServersFrom({ iceServers: "x" }).length === 1,
    "garbage → STUN only"
  )
  const cf = iceServersFrom({
    iceServers: [
      {
        urls: [
          "turn:turn.cloudflare.com:3478?transport=udp",
          "turns:turn.cloudflare.com:5349",
        ],
        username: "u",
        credential: "c",
      },
      { urls: "stun:stun.cloudflare.com:3478" },
      { urls: ["http://evil.example"], username: "u", credential: "c" },
      { username: "no-urls" },
      null,
    ],
  })
  assert(cf.length === 3, `STUN + 2 valid entries (got ${cf.length})`)
  assert(
    (cf[1].urls as string[]).length === 2 &&
      cf[1].username === "u" &&
      cf[1].credential === "c",
    "turn entry kept whole"
  )
  assert(
    (cf[2].urls as string[])[0] === "stun:stun.cloudflare.com:3478" &&
      cf[2].username === undefined,
    "single url string becomes an array, no undefined keys"
  )
}

// ── Errors people can act on ─────────────────────────────────────────────
{
  assert(
    /browser settings/.test(mediaErrorMessage({ name: "NotAllowedError" })),
    "permission denied"
  )
  assert(
    /No microphone/.test(mediaErrorMessage({ name: "NotFoundError" })),
    "no device"
  )
  assert(
    /in use/.test(mediaErrorMessage({ name: "NotReadableError" })),
    "device busy"
  )
  assert(
    /secure/.test(mediaErrorMessage({ name: "SecurityError" })),
    "insecure origin"
  )
  assert(
    /try again/.test(mediaErrorMessage(new Error("boom"))),
    "unknown error"
  )
  assert(/try again/.test(mediaErrorMessage(undefined)), "no error object")
}

// ── Loudness ─────────────────────────────────────────────────────────────
{
  const silence = new Uint8Array(256).fill(128)
  assert(rmsOf(silence) === 0, "flat line is silent")
  assert(rmsOf(new Uint8Array(0)) === 0, "empty sample is silent")
  const loud = new Uint8Array(256)
  for (let i = 0; i < loud.length; i++) loud[i] = i % 2 ? 200 : 56
  assert(rmsOf(loud) > SPEAKING_THRESHOLD, "a square wave is speech-loud")
  const whisper = new Uint8Array(256)
  for (let i = 0; i < whisper.length; i++) whisper[i] = i % 2 ? 129 : 127
  assert(
    rmsOf(whisper) < SPEAKING_THRESHOLD,
    "one-bit noise is below the threshold"
  )
  assert(rmsOf(new Uint8Array(4).fill(255)) <= 1, "RMS stays within 0..1")
}

console.log("All voice tests passed.")
