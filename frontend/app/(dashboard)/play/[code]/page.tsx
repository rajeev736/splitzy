"use client"

import { useParams } from "next/navigation"

import { AppHeader } from "@/components/layout/app-header"
import { PageContainer } from "@/components/layout/app-shell"
import { RoomShell } from "@/components/live/room-shell"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { isLiveConfigured } from "@/lib/firebase/config"
import { useGameExit } from "@/lib/games-nav"
import { parseRoomCode } from "@/lib/live/room"

/** /play/ABC123 — a live game room. The link is the invite. */
export default function PlayRoomPage() {
  const params = useParams<{ code: string }>()
  const code = parseRoomCode(params.code)

  if (!isLiveConfigured) {
    return (
      <Notice
        title="Live games aren't switched on yet"
        text="This server has no Realtime Database URL configured (NEXT_PUBLIC_FIREBASE_DATABASE_URL). Rooms, drawing and voice need it."
      />
    )
  }
  if (!code) return <Notice title="That's not a room link" text="Room codes are 6 letters and numbers, like JOY7K9." />
  return <RoomShell code={code} />
}

function Notice({ title, text }: { title: string; text: string }) {
  const exitGame = useGameExit("/challenges?tab=live")
  return (
    <>
      <AppHeader title="Game room" showBack onBack={exitGame} />
      <PageContainer className="max-w-md">
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
            <p className="text-lg font-semibold">{title}</p>
            <p className="text-sm text-muted-foreground">{text}</p>
            <Button className="mt-2" onClick={exitGame}>
              Back to games
            </Button>
          </CardContent>
        </Card>
      </PageContainer>
    </>
  )
}
