"use client"

import { VolumeHighIcon, VolumeOffIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { playSound, setSoundSettings, SOUND_PACKS, useSoundSettings, type SoundPack } from "@/lib/live/sound"
import { cn } from "@/lib/utils"

const PACKS = SOUND_PACKS.map((p) => ({ value: p.value, label: p.label }))

/** Sound on/off and the sound pack, as one row (Games page). */
export function SoundSettings({ className }: { className?: string }) {
  const { on, pack } = useSoundSettings()
  return (
    <div className={cn("flex items-center gap-3 rounded-xl border border-card-stroke bg-card px-3 py-2 shadow-xs", className)}>
      <HugeiconsIcon icon={on ? VolumeHighIcon : VolumeOffIcon} className="size-5 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">Game sounds</p>
        <p className="truncate text-xs text-muted-foreground">
          {on ? (SOUND_PACKS.find((p) => p.value === pack)?.blurb ?? "") : "Off"}
        </p>
      </div>
      <Select
        items={PACKS}
        value={pack}
        onValueChange={(v) => {
          setSoundSettings({ pack: v as SoundPack, on: true })
          // A taste of the pack
          playSound(v === "classic" ? "dice" : "captured")
        }}
        disabled={!on}
      >
        <SelectTrigger size="sm" className="w-40" aria-label="Sound pack">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {PACKS.map((p) => (
            <SelectItem key={p.value} value={p.value}>
              {p.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Switch checked={on} onCheckedChange={(v) => setSoundSettings({ on: v })} aria-label="Game sounds" />
    </div>
  )
}

/** A quick mute button for the game room's dock. */
export function SoundToggle() {
  const { on } = useSoundSettings()
  return (
    <Button
      variant="outline"
      size="icon-sm"
      aria-label={on ? "Mute game sounds" : "Turn game sounds on"}
      aria-pressed={!on}
      onClick={() => setSoundSettings({ on: !on })}
    >
      <HugeiconsIcon icon={on ? VolumeHighIcon : VolumeOffIcon} />
    </Button>
  )
}
