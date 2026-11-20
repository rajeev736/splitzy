"use client"

import { auth } from "@/lib/firebase/config"
import { AppError } from "@/lib/errors"
import type { Wallet } from "@/lib/types"

/**
 * The server's part of live games (app/api/live): the dice, and checking a
 * finished game before it counts. Calls carry your Firebase ID token.
 */
async function call<T>(path: string, body: object, opts: { keepalive?: boolean } = {}): Promise<T> {
  const idToken = await auth?.currentUser?.getIdToken()
  if (!idToken) throw new AppError("Sign in again to keep playing")
  const res = await fetch(path, {
    method: "POST",
    keepalive: opts.keepalive,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
    body: JSON.stringify(body),
  })
  const data = (await res.json().catch(() => null)) as (T & { reason?: string }) | null
  if (!res.ok || !data) throw new AppError(data?.reason ?? "The game server didn't answer — try again")
  return data
}

/** Rolls your dice on the server (Ludo, Snakes & Ladders); the board updates through the room as usual. */
export const rollOnServer = (code: string, seq: number) => call<{ ok: true; value: number; seq: number }>("/api/live/roll", { code, seq })

export interface SettleResponse {
  ok: true
  record: { winners: string[]; verified: boolean | null; voided: boolean; reason?: string } | null
  /** Your wallet before and after this game was counted (null: already counted, or nothing to count). */
  counted: { before: Wallet; wallet: Wallet } | null
}

/** Asks the server to check and count a finished game (or your forfeit of one being played). */
export const settleOnServer = (code: string, forfeit = false) =>
  call<SettleResponse>("/api/live/settle", { code, forfeit }, { keepalive: forfeit })
