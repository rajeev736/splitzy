"use client"

import { GameScreen, GameTopBar } from "@/components/game-ui/kit"
import { GameCoinChip } from "@/components/game-nav/coin-chip"
import { GameNavSpacer, useGameTabBack } from "@/components/game-nav/game-bottom-nav"
import { useSession } from "@/components/providers/session-provider"
import { useBadges, useFriendships, useWallet } from "@/hooks/use-fun"
import { Inventory } from "./_components/inventory"

/**
 * Everything you can own, buy or earn for games — frames, characters, board
 * themes, badges and the pay-per-use extras — on the Games side.
 * Deep links: #frames, #milestones, #characters, #rewards, #boards, #badges, #more.
 */
export default function GameInventoryPage() {
  const { user } = useSession()
  const wallet = useWallet()
  const back = useGameTabBack()
  const { data: friendships } = useFriendships()
  const loveBonds = friendships.filter((f) => f.status === "ACTIVE" && f.bond?.type === "love").length
  const badges = useBadges(user?.uid, loveBonds)

  if (!user) return null

  return (
    <GameScreen>
      <GameTopBar title="Inventory" subtitle="Characters, frames, boards & more" onBack={back} right={<GameCoinChip />} />
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-4 pt-1 pb-4">
        <Inventory user={user} wallet={wallet} badges={badges?.summary} earlyBird={badges?.earlyBird} />
      </div>
      <GameNavSpacer />
    </GameScreen>
  )
}
