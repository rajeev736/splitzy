"use client"

import * as React from "react"

import { DiscountFlow } from "@/components/live/new-room/discount-flow"
import { GameScreen } from "@/components/game-ui/kit"
import { Spinner } from "@/components/ui/spinner"

/** /play/discount[?to=uid] — challenge a friend who owes you to a live game for a discount. */
export default function DiscountGamePage() {
  return (
    <React.Suspense
      fallback={
        <GameScreen>
          <div className="flex flex-1 items-center justify-center">
            <Spinner className="size-9 text-white" />
          </div>
        </GameScreen>
      }
    >
      <DiscountFlow />
    </React.Suspense>
  )
}
