"use client"

import { VolumeHighIcon, VolumeOffIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { playSound, setSoundSettings, SOUND_PACKS, useSoundSettings, type SoundPack } from "@/lib/live/sound"

/**
 * Game sounds, from the room's dock while you play: the speaker opens a menu
 * to turn sounds on or off and pick the pack (Classic, CID & Bollywood,
 * Internet memes, Desi mix). Picking a pack plays a taste of it.
 */
export function SoundMenu() {
  const { on, pack } = useSoundSettings()
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="outline" size="icon-sm" aria-label={on ? "Game sounds" : "Game sounds (off)"} />
        }
      >
        <HugeiconsIcon icon={on ? VolumeHighIcon : VolumeOffIcon} />
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="start" className="w-60">
        <DropdownMenuCheckboxItem checked={on} onCheckedChange={(v) => setSoundSettings({ on: !!v })}>
          Sounds on
        </DropdownMenuCheckboxItem>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuLabel>Sound pack</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={pack}
            onValueChange={(v) => {
              setSoundSettings({ pack: v as SoundPack, on: true })
              // A taste of the pack
              playSound(v === "classic" ? "dice" : "captured")
            }}
          >
            {SOUND_PACKS.map((p) => (
              <DropdownMenuRadioItem key={p.value} value={p.value} closeOnClick={false}>
                <span className="flex min-w-0 flex-col">
                  <span className="font-medium">{p.label}</span>
                  <span className="truncate text-xs text-muted-foreground">{p.blurb}</span>
                </span>
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
