"use client"

import { AppHeader } from "@/components/layout/app-header"
import { PageContainer } from "@/components/layout/app-shell"
import { useSession } from "@/components/providers/session-provider"
import { useBadges, useFriendships, useWallet } from "@/hooks/use-fun"
import { CoinsLink, Inventory } from "./_components/inventory"

export default function InventoryPage() {
  const { user } = useSession()
  const wallet = useWallet()
  const { data: friendships } = useFriendships()
  const loveBonds = friendships.filter((f) => f.status === "ACTIVE" && f.bond?.type === "love").length
  const badges = useBadges(user?.uid, loveBonds)

  if (!user) return null

  return (
    <>
      <AppHeader title="Inventory" showBack rightAction={wallet ? <CoinsLink balance={wallet.balance} /> : undefined} />
      <PageContainer className="max-w-2xl gap-4 pt-4 pb-24">
        <Inventory user={user} wallet={wallet} badges={badges?.summary} earlyBird={badges?.earlyBird} />
      </PageContainer>
    </>
  )
}
