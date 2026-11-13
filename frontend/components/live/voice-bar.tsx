"use client"

import {
  Cancel01Icon,
  Mic01Icon,
  MicOff01Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { UserAvatar } from "@/components/shared/user-avatar"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { useVoice } from "@/hooks/use-voice"
import type { RoomPlayer, VoiceState } from "@/lib/live/types"
import { voiceMembers, type PeerStatus } from "@/lib/live/voice"
import { cn } from "@/lib/utils"

/**
 * Voice chat controls for a room: join / leave voice, mute, and who's in it
 * with a ring on whoever is talking. Free WebRTC mesh — see hooks/use-voice.ts.
 */
export function VoiceBar({
  code,
  uid,
  players,
  voice,
  className,
}: {
  code: string
  uid: string
  players: RoomPlayer[]
  voice: Record<string, VoiceState>
  className?: string
}) {
  const v = useVoice(code, uid, players, voice)
  if (!v.supported) return null

  if (!v.joined) {
    return (
      <Button
        variant="outline"
        size="sm"
        className={cn("h-10", className)}
        onClick={() => void v.join()}
        disabled={v.joining}
        aria-label="Join voice chat"
      >
        {v.joining ? (
          <Spinner />
        ) : (
          <HugeiconsIcon icon={Mic01Icon} data-icon="inline-start" />
        )}
        {v.joining ? "Joining…" : "Join voice"}
      </Button>
    )
  }

  const members = voiceMembers(voice, players, uid)
  return (
    <div
      className={cn("flex min-w-0 items-center gap-1.5", className)}
      role="group"
      aria-label="Voice chat"
    >
      <Button
        variant={v.muted ? "destructive" : "default"}
        size="icon"
        aria-pressed={v.muted}
        aria-label={v.muted ? "Unmute microphone" : "Mute microphone"}
        title={v.muted ? "Unmute" : "Mute"}
        onClick={v.toggleMute}
      >
        <HugeiconsIcon
          icon={v.muted ? MicOff01Icon : Mic01Icon}
          className="size-5"
        />
      </Button>

      <ul
        className="no-scrollbar flex min-w-0 items-center gap-1.5 overflow-x-auto px-1 py-1"
        aria-label="In voice"
      >
        {members.map((p) => {
          const isYou = p.uid === uid
          return (
            <VoiceAvatar
              key={p.uid}
              player={p}
              isYou={isYou}
              speaking={v.speaking.has(p.uid)}
              muted={isYou ? v.muted : voice[p.uid]?.muted === true}
              status={isYou ? "connected" : (v.peers[p.uid] ?? "connecting")}
            />
          )
        })}
      </ul>

      <Button
        variant="ghost"
        size="icon"
        aria-label="Leave voice chat"
        title="Leave voice"
        onClick={() => void v.leave()}
      >
        <HugeiconsIcon icon={Cancel01Icon} className="size-5" />
      </Button>
    </div>
  )
}

function VoiceAvatar({
  player,
  isYou,
  speaking,
  muted,
  status,
}: {
  player: RoomPlayer
  isYou: boolean
  speaking: boolean
  muted: boolean
  status: PeerStatus
}) {
  const first = isYou ? "You" : player.name.split(" ")[0]
  const state = muted
    ? "muted"
    : status === "connected"
      ? speaking
        ? "talking"
        : ""
      : status === "failed"
        ? "can't connect"
        : "connecting…"
  return (
    <li
      className="relative shrink-0"
      title={state ? `${first} — ${state}` : first}
      aria-label={state ? `${first}, ${state}` : first}
    >
      {speaking && !muted && (
        // The pulse: a ring that grows and fades while they talk
        <span
          aria-hidden
          className="absolute -inset-1 animate-ping rounded-full border-2 border-success/60 [animation-duration:1.4s]"
        />
      )}
      <UserAvatar
        src={player.photo}
        name={player.name}
        size="sm"
        className={cn(
          "ring-2 ring-offset-2 ring-offset-background transition-[box-shadow,opacity] duration-200",
          speaking && !muted ? "ring-success" : "ring-transparent",
          status !== "connected" && "opacity-50"
        )}
      />
      {muted ? (
        <span className="absolute -right-1 -bottom-1 flex size-4 items-center justify-center rounded-full bg-destructive text-white ring-2 ring-background">
          <HugeiconsIcon
            icon={MicOff01Icon}
            className="size-2.5"
            strokeWidth={2.5}
          />
        </span>
      ) : status !== "connected" ? (
        <span
          className={cn(
            "absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full ring-2 ring-background",
            status === "failed" ? "bg-destructive" : "animate-pulse bg-warning"
          )}
        />
      ) : null}
    </li>
  )
}
