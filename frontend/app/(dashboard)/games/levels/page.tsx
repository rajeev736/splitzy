"use client"

import { LevelMap, LevelSummary, claimableLevelRewards } from "@/components/game-avatar/level-road"
import { GameScreen, GameTopBar } from "@/components/game-ui/kit"
import { GameCoinChip } from "@/components/game-nav/coin-chip"
import { GameNavSpacer, useGameTabBack } from "@/components/game-nav/game-bottom-nav"
import { useSession } from "@/components/providers/session-provider"
import { Spinner } from "@/components/ui/spinner"
import { useWallet } from "@/hooks/use-fun"

/**
 * The level map, on the Games side: your level and XP on top, then
 * every level on a winding road — rewards beside the levels that give
 * something, Claim on the ones you've reached. Opens at where you are.
 */
export default function LevelsPage() {
  const { user } = useSession()
  const wallet = useWallet()
  const back = useGameTabBack()
  const ready = claimableLevelRewards(wallet)

  if (!user) return null

  return (
    <GameScreen>
      <GameTopBar
        title="Levels"
        subtitle={ready > 0 ? `${ready} reward${ready === 1 ? "" : "s"} to claim` : "Play live games to level up"}
        onBack={back}
        right={<GameCoinChip />}
      />
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-4 pt-1 pb-4">
        <LevelSummary wallet={wallet} className="gu-panel-flat px-3.5 py-3" />
        {wallet === undefined ? (
          <div className="flex justify-center py-16">
            <Spinner className="size-8 text-white" />
          </div>
        ) : (
          <div className="pt-12 pb-6">
            <LevelMap user={user} wallet={wallet} />
          </div>
        )}
      </div>
      <GameNavSpacer />
    </GameScreen>
  )
}
