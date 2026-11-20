"use client"

import * as React from "react"

import { GameButton, GameDialog } from "@/components/game-ui/kit"
import { Spinner } from "@/components/ui/spinner"
import { useUpdateProfile } from "@/hooks/mutations"
import { GAME_NAME_MAX, gameNameError } from "@/lib/game-name"
import type { UserProfile } from "@/lib/types"

/**
 * Your name in games, separate from your Split name: trimmed, 2–20
 * characters. "Use my Split name" clears it, so games show `displayName` again.
 */
export function GameNameDialog({
  open,
  onClose,
  user,
}: {
  open: boolean
  onClose: () => void
  user: Pick<UserProfile, "displayName" | "gameName">
}) {
  const save = useUpdateProfile({ successMessage: "Game name saved", errorMessage: "Couldn't save your game name" })
  const [value, setValue] = React.useState(user.gameName ?? "")
  const [touched, setTouched] = React.useState(false)

  // Fresh each time it opens
  const [wasOpen, setWasOpen] = React.useState(open)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) {
      setValue(user.gameName?.trim() || user.displayName.slice(0, GAME_NAME_MAX))
      setTouched(false)
    }
  }

  const name = value.trim()
  const error = gameNameError(value)
  const unchanged = name === (user.gameName?.trim() ?? "")

  const submit = (next: string) =>
    save.mutate({ gameName: next }, { onSuccess: () => onClose() })

  return (
    <GameDialog open={open} onClose={onClose} title="Game name">
      <form
        className="flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault()
          setTouched(true)
          if (!error && !unchanged) submit(name)
        }}
      >
        <p className="text-center text-sm font-medium text-[var(--gu-ink-soft)]">
          What other players see in rooms and lobbies. Your Split name stays{" "}
          <span className="font-bold text-[var(--gu-ink)]">{user.displayName}</span>.
        </p>
        <label className="sr-only" htmlFor="game-name">
          Game name
        </label>
        <input
          id="game-name"
          className="gu-input text-center"
          value={value}
          maxLength={GAME_NAME_MAX}
          autoComplete="off"
          autoFocus
          onChange={(e) => setValue(e.target.value)}
          onBlur={() => setTouched(true)}
          aria-invalid={touched && !!error}
          aria-describedby="game-name-hint"
        />
        <p
          id="game-name-hint"
          className={
            touched && error
              ? "-mt-1 text-center text-xs font-bold text-[var(--gu-red-deep)]"
              : "-mt-1 text-center text-xs font-bold text-[var(--gu-brown)]"
          }
        >
          {touched && error ? error : `${name.length}/${GAME_NAME_MAX}`}
        </p>
        <GameButton type="submit" tone="green" disabled={save.isPending || !!error || unchanged}>
          {save.isPending ? <Spinner /> : "Save"}
        </GameButton>
        {user.gameName?.trim() ? (
          <GameButton tone="cream" size="sm" disabled={save.isPending} onClick={() => submit("")}>
            Use my Split name
          </GameButton>
        ) : null}
      </form>
    </GameDialog>
  )
}
