"use client"

import * as React from "react"
import { useRouter } from "nextjs-toploader/app"
import { ArrowRight01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { parseRoomCode, ROOM_CODE_LENGTH } from "@/lib/live/room"

/** A valid example — codes never use 0, O, 1 or I (see lib/live/room.ts). */
const EXAMPLE = "PLAY7K"

/** What goes in the box: a pasted link becomes its code; anything else is uppercased and trimmed to 6. */
function tidy(raw: string) {
  if (/\/play\//i.test(raw)) {
    const code = parseRoomCode(raw)
    if (code) return code
  }
  return raw
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, ROOM_CODE_LENGTH)
}

/** Enter a friend's room code (or paste their link) and go. The room itself says if it's full or gone. */
export function JoinRoomCard() {
  const router = useRouter()
  const [value, setValue] = React.useState("")
  const [error, setError] = React.useState<string | null>(null)
  const [going, setGoing] = React.useState(false)

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const code = parseRoomCode(value)
    if (!code) {
      setError(
        value.length < ROOM_CODE_LENGTH
          ? `Room codes are ${ROOM_CODE_LENGTH} characters, like ${EXAMPLE}.`
          : "That doesn't look like a room code — codes never use 0, O, 1 or I."
      )
      return
    }
    setGoing(true)
    router.push(`/play/${code}`)
  }

  return (
    <Card className="gap-0 py-0">
      <form onSubmit={submit} className="flex flex-col gap-3 p-4" noValidate>
        <div>
          <h2 className="text-sm font-semibold">Join a room</h2>
          <p className="text-xs text-muted-foreground">
            Got a code or a link from a friend? Enter it here.
          </p>
        </div>
        <div className="flex gap-2">
          <Input
            value={value}
            onChange={(e) => {
              setValue(tidy(e.target.value))
              setError(null)
            }}
            placeholder="Room code"
            aria-label="Room code"
            aria-invalid={error ? true : undefined}
            autoCapitalize="characters"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="go"
            // A drag across the field selects text; it mustn't swipe the tab
            data-no-swipe
            className="h-11 flex-1 font-mono text-base font-semibold tracking-[0.25em] uppercase placeholder:font-sans placeholder:font-normal placeholder:tracking-normal placeholder:normal-case"
          />
          <Button
            type="submit"
            className="h-11 shrink-0"
            disabled={going || value.length === 0}
          >
            {going ? <Spinner /> : null}
            Join
            {!going && (
              <HugeiconsIcon icon={ArrowRight01Icon} data-icon="inline-end" />
            )}
          </Button>
        </div>
        {error && (
          <p role="alert" className="text-xs text-destructive">
            {error}
          </p>
        )}
      </form>
    </Card>
  )
}
