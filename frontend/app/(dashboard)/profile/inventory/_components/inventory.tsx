"use client"

import * as React from "react"
import Link from "next/link"
import { ArrowRight01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { Coins } from "@/components/fun/coin"
import { FramedAvatar } from "@/components/fun/framed-avatar"
import { ownsCharacter } from "@/components/game-avatar/ownership"
import { CHARACTERS } from "@/components/game-avatar/registry"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { BadgeSummary } from "@/hooks/use-fun"
import { FRAME_IDS, ownsFrame } from "@/lib/fun/catalog"
import { ALL_THEMES, ownsTheme } from "@/lib/live/themes"
import type { Wallet } from "@/lib/types"
import { BadgesTab } from "./badges-tab"
import { CharactersTab, type CharacterFilter } from "./characters-tab"
import { FramesTab, type FrameFilter, type InventoryUser } from "./frames-tab"
import { MoreTab } from "./more-tab"
import { ThemesTab, type BoardFilter } from "./themes-tab"

const TABS = [
  { id: "frames", label: "Frames" },
  { id: "characters", label: "Characters" },
  { id: "boards", label: "Boards" },
  { id: "badges", label: "Badges" },
  { id: "more", label: "More" },
] as const
type Tab = (typeof TABS)[number]["id"]

const subscribeHash = (onChange: () => void) => {
  window.addEventListener("hashchange", onChange)
  return () => window.removeEventListener("hashchange", onChange)
}
const isTab = (v: string): v is Tab => TABS.some((t) => t.id === v)

/**
 * Everything in the app you can own, buy or earn, in one place: frames,
 * game characters, board themes, badges and the pay-per-use extras. Ownership is read from
 * the live wallet, the same one the games read, so a thing bought here or
 * in a game shows as yours in both straight away.
 *
 * Deep links: #frames, #milestones (the frames you earn), #characters,
 * #rewards (the characters and frames you win), #boards, #badges, #more.
 */
export function Inventory({
  user,
  wallet,
  badges,
  earlyBird,
}: {
  user: InventoryUser
  wallet: Wallet | null | undefined
  badges: BadgeSummary[] | undefined
  earlyBird?: number
}) {
  const hash = React.useSyncExternalStore(subscribeHash, () => window.location.hash.slice(1), () => "")
  const [pickedTab, setPickedTab] = React.useState<Tab | null>(null)
  const [pickedFrames, setPickedFrames] = React.useState<FrameFilter | null>(null)
  const [boards, setBoards] = React.useState<BoardFilter>("all")
  const [pickedCharacters, setPickedCharacters] = React.useState<CharacterFilter | null>(null)
  const tab: Tab =
    pickedTab ?? (hash === "milestones" ? "frames" : hash === "rewards" ? "characters" : isTab(hash) ? hash : "frames")
  const characters: CharacterFilter = pickedCharacters ?? (hash === "rewards" ? "earn" : "all")
  const frames: FrameFilter = pickedFrames ?? (hash === "milestones" ? "earn" : "all")

  const goTo = (next: Tab) => {
    setPickedTab(next)
    // Keep the tab on refresh and back, without a navigation
    window.history.replaceState(window.history.state, "", `#${next}`)
  }

  const counts = {
    frames: FRAME_IDS.filter((id) => ownsFrame(id, wallet?.frames)).length,
    characters: CHARACTERS.filter((c) => ownsCharacter(c, wallet?.avatars)).length,
    boards: ALL_THEMES.filter((t) => ownsTheme(t, wallet?.themes)).length,
    badges: badges?.filter((b) => b.tier > 0).length,
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Your collection at a glance */}
      <section className="flex items-center gap-3 rounded-2xl border border-card-stroke bg-card px-3 py-2.5 shadow-xs">
        <span className="shrink-0 p-2.5">
          <FramedAvatar src={user.photoURL} name={user.displayName} frame={user.frame} size={44} />
        </span>
        <div className="grid min-w-0 flex-1 grid-cols-4 divide-x">
          <Stat value={counts.frames} total={FRAME_IDS.length} label="Frames" />
          <Stat value={counts.characters} total={CHARACTERS.length} label="Characters" />
          <Stat value={counts.boards} total={ALL_THEMES.length} label="Boards" />
          <Stat value={counts.badges} total={badges?.length} label="Badges" />
        </div>
      </section>

      <Tabs value={tab} onValueChange={(v) => goTo(v as Tab)} className="gap-4">
        <TabsList className="sticky top-[3.75rem] z-10 grid w-full grid-cols-5 bg-background/95">
          {TABS.map((t) => (
            <TabsTrigger key={t.id} value={t.id} className="px-0.5 max-[359px]:text-[11px]">
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="frames">
          <FramesTab user={user} wallet={wallet} filter={frames} onFilter={setPickedFrames} />
        </TabsContent>
        <TabsContent value="characters">
          <CharactersTab user={user} wallet={wallet} filter={characters} onFilter={setPickedCharacters} />
        </TabsContent>
        <TabsContent value="boards">
          <ThemesTab wallet={wallet} filter={boards} onFilter={setBoards} />
        </TabsContent>
        <TabsContent value="badges">
          <BadgesTab
            user={user}
            wallet={wallet}
            badges={badges}
            earlyBird={earlyBird}
            onShowMilestones={() => {
              setPickedFrames("earn")
              goTo("frames")
              window.scrollTo({ top: 0, behavior: "smooth" })
            }}
          />
        </TabsContent>
        <TabsContent value="more">
          <MoreTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function Stat({ value, total, label }: { value: number | undefined; total: number | undefined; label: string }) {
  return (
    <div className="flex min-w-0 flex-col items-center px-1">
      <span className="text-base leading-tight font-semibold tabular-nums">
        {value ?? "–"}
        {total !== undefined && <span className="text-xs font-normal text-muted-foreground">/{total}</span>}
      </span>
      <span className="max-w-full truncate text-[11px] text-muted-foreground">{label}</span>
    </div>
  )
}

/** Your coins, for the header: opens the coin history. */
export function CoinsLink({ balance }: { balance: number }) {
  return (
    <Link
      href="/profile/coins"
      aria-label={`${balance} coins, see history`}
      className="flex h-8 items-center gap-1 rounded-full border border-card-stroke bg-card px-2.5 text-sm shadow-xs transition-colors hover:bg-subtle-hover active:bg-subtle-pressed"
    >
      <Coins amount={balance} iconClassName="size-4" />
      <HugeiconsIcon icon={ArrowRight01Icon} className="size-3.5 text-muted-foreground" />
    </Link>
  )
}
