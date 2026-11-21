"use client"

import * as React from "react"

import { LevelPass, LevelPassHeader, type LevelPassHandle } from "@/components/game-avatar/level-pass"
import { claimableLevelRewards } from "@/components/game-avatar/level-road"
import { GameScreen, GameTopBar } from "@/components/game-ui/kit"
import { GameCoinChip } from "@/components/game-nav/coin-chip"
import { GameNavSpacer, useGameTabBack } from "@/components/game-nav/game-bottom-nav"
import { useSession } from "@/components/providers/session-provider"
import { useWallet } from "@/hooks/use-fun"

/**
 * The level pass, on the Games side: your level, XP and next prize stay on
 * top, and under them every level on one vertical track (level 1 at the
 * bottom) that scrolls on its own — opening at where you are, with Claim on
 * the prizes you've reached.
 */
export default function LevelsPage() {
  const { user } = useSession()
  const wallet = useWallet()
  const back = useGameTabBack()
  const pass = React.useRef<LevelPassHandle>(null)
  const ready = claimableLevelRewards(wallet)

  if (!user) return null

  return (
    // One screen tall: the header stays, the track scrolls inside it (md: the shell's bottom padding taken back)
    <GameScreen className="h-svh overflow-hidden md:-mb-8">
      <GameTopBar
        title="Levels"
        subtitle={ready > 0 ? `${ready} reward${ready === 1 ? "" : "s"} to claim` : "Play live games to level up"}
        onBack={back}
        right={<GameCoinChip />}
      />
      <div className="relative z-10 shrink-0 bg-[#3f95ee] px-3 pt-1 pb-4">
        <div className="mx-auto max-w-[30rem]">
          <LevelPassHeader user={user} wallet={wallet} onJump={() => pass.current?.jumpToClaim()} />
        </div>
      </div>
      <LevelPass ref={pass} user={user} wallet={wallet} footer={<GameNavSpacer />} />
    </GameScreen>
  )
}
