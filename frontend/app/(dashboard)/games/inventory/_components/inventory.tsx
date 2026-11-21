"use client"

import * as React from "react"

import { GameAvatar } from "@/components/game-avatar/game-avatar"
import { ownsCharacter } from "@/components/game-avatar/ownership"
import { CHARACTERS } from "@/components/game-avatar/registry"
import { GamePanel, GameTabs } from "@/components/game-ui/kit"
import { hasStreakBadge } from "@/components/streak/use-streak"
import type { BadgeSummary } from "@/hooks/use-fun"
import { FRAME_IDS, ownsFrame } from "@/lib/fun/catalog"
import { STREAK_MILESTONES } from "@/lib/live/streak"
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
  badgeIds,
  earlyBird,
}: {
  user: InventoryUser
  wallet: Wallet | null | undefined
  badges: BadgeSummary[] | undefined
  /** Every badge doc id (the streak badges are read from these). */
  badgeIds?: ReadonlySet<string>
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
    // The streak badges count with the rest
    badges: badges && badges.filter((b) => b.tier > 0).length + STREAK_MILESTONES.filter((d) => hasStreakBadge(d, wallet, badgeIds)).length,
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Your collection at a glance */}
      <section className="gu-panel-flat flex items-center gap-3 px-3 py-2.5">
        <span className="shrink-0 p-2.5">
          <GameAvatar character={user.gameAvatar} photo={user.photoURL} name={user.displayName} frame={user.frame} size={44} mode="idle" />
        </span>
        <div className="grid min-w-0 flex-1 grid-cols-4 divide-x divide-[var(--gu-line)]">
          <Stat value={counts.frames} total={FRAME_IDS.length} label="Frames" />
          <Stat value={counts.characters} total={CHARACTERS.length} label="Characters" />
          <Stat value={counts.boards} total={ALL_THEMES.length} label="Boards" />
          <Stat value={counts.badges} total={badges && badges.length + STREAK_MILESTONES.length} label="Badges" />
        </div>
      </section>

      <GameTabs
        label="Inventory"
        value={tab}
        onChange={goTo}
        className="[&>button]:!px-0 [&>button]:!text-[13px] max-[400px]:[&>button]:!text-[11px]"
        tabs={TABS.map((t) => ({ value: t.id, label: t.label }))}
      />

      {/* The open tab in a framed window; cards inside are white on its cream */}
      <GamePanel
        title={TABS.find((t) => t.id === tab)?.label}
        className="[--card-stroke:var(--gu-line)] [--card:#fff]"
        bodyClassName="px-3 pb-4"
      >
        {tab === "frames" ? (
          <FramesTab user={user} wallet={wallet} filter={frames} onFilter={setPickedFrames} />
        ) : tab === "characters" ? (
          <CharactersTab user={user} wallet={wallet} filter={characters} onFilter={setPickedCharacters} />
        ) : tab === "boards" ? (
          <ThemesTab wallet={wallet} filter={boards} onFilter={setBoards} />
        ) : tab === "badges" ? (
          <BadgesTab
            user={user}
            wallet={wallet}
            badges={badges}
            badgeIds={badgeIds}
            earlyBird={earlyBird}
            onShowMilestones={() => {
              setPickedFrames("earn")
              goTo("frames")
              window.scrollTo({ top: 0, behavior: "smooth" })
            }}
          />
        ) : (
          <MoreTab wallet={wallet} />
        )}
      </GamePanel>
    </div>
  )
}

function Stat({ value, total, label }: { value: number | undefined; total: number | undefined; label: string }) {
  return (
    <div className="flex min-w-0 flex-col items-center px-1">
      <span className="text-base leading-tight font-bold tabular-nums">
        {value ?? "–"}
        {total !== undefined && <span className="text-xs font-semibold text-[var(--gu-ink-soft)]">/{total}</span>}
      </span>
      <span className="max-w-full truncate text-[10px] font-bold tracking-wide text-[var(--gu-brown)] uppercase">{label}</span>
    </div>
  )
}
