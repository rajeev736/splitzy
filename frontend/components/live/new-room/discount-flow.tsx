"use client"

import * as React from "react"
import { StatusChip, useFriendStatuses } from "../friend-status"
import { useSearchParams } from "next/navigation"
import { useRouter } from "nextjs-toploader/app"
import { ArrowRight01Icon, MinusSignIcon, PlayIcon, PlusSignIcon, Tick02Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { toast } from "sonner"

import { GameButton, GameChoice, GameIconButton, GameNote, GamePanel, GameScreen, GameTopBar } from "@/components/game-ui/kit"
import { GameAvatar } from "@/components/game-avatar/game-avatar"
import { useSession } from "@/components/providers/session-provider"
import { Spinner } from "@/components/ui/spinner"
import { useChallenges, useExpenses, useFriends } from "@/hooks/queries"
import { useWallet } from "@/hooks/use-fun"
import { useLiveGameDiscounts } from "@/hooks/use-game-discounts"
import { getErrorMessage } from "@/lib/errors"
import { DISCOUNT_PRESETS } from "@/lib/games"
import { defaultOptions, LIVE_GAME_IDS, LIVE_GAMES } from "@/lib/live/games"
import { levelOf, liveXp } from "@/lib/live/levels"
import type { LiveGameId, RoomOptions } from "@/lib/live/types"
import { calculatePersonBalances, formatPaise } from "@/lib/money"
import { cn } from "@/lib/utils"
import { createLiveDiscountChallenge, newChallengeId } from "@/services/challenges"
import { createRoom, deleteRoom } from "@/services/live-rooms"
import { GameHero, GameOptionsPicker, LiveGameGrid, StepDots } from "./pieces"

/**
 * Games for a discount: one-on-one, and checked move by move by the server
 * before the result counts (lib/live/verify) — so Scribble (guesses) and
 * Sudoku (a solver app could fill it) aren't offered.
 */
const VERIFIED_DUELS: readonly string[] = ["ludo", "chess", "checkers", "tictactoe", "snakes", "snakes3d"]
const DUEL_GAMES = LIVE_GAME_IDS.filter(
  (id) => VERIFIED_DUELS.includes(id) && LIVE_GAMES[id].minPlayers <= 2 && LIVE_GAMES[id].maxPlayers >= 2
)

type Step = 0 | 1 | 2

/**
 * A discount game, set up full screen in three steps:
 *  1. the friend who owes you (only those who do, and aren't already in a
 *     discount game with you);
 *  2. the live game you'll play, one-on-one;
 *  3. its settings and the discount they win.
 * Create opens a private two-seat room and sends them the challenge. The
 * discount itself works as it always has: if they win, they get it off what
 * they owe if they pay within 10 minutes. Only you record the result.
 */
export function DiscountFlow() {
  const router = useRouter()
  const params = useSearchParams()
  const { user } = useSession()
  const uid = user?.uid ?? ""
  const wallet = useWallet()
  const { data: friends } = useFriends()
  const { data: expenses } = useExpenses()
  const { data: challenges } = useChallenges()
  const liveDiscounts = useLiveGameDiscounts()

  // Everyone who owes you (friends or group members), largest first
  const debtors = React.useMemo(() => {
    if (!uid) return []
    return calculatePersonBalances(uid, expenses)
      .filter((b) => b.netBalancePaise > 0)
      .sort((a, b) => b.netBalancePaise - a.netBalancePaise)
  }, [uid, expenses])
  // Already in a discount game with you (open, or a discount still running): no second one
  const busy = React.useMemo(() => {
    const set = new Set(liveDiscounts.byPerson.keys())
    for (const c of challenges) if (c.status === "OPEN" && c.hostId === uid && c.discountPercent > 0) c.players.forEach((p) => set.add(p))
    return set
  }, [challenges, liveDiscounts.byPerson, uid])

  const preset = params.get("to")
  const [friendId, setFriendId] = React.useState<string | null>(preset)
  const [step, setStep] = React.useState<Step>(preset ? 1 : 0)
  const [game, setGame] = React.useState<LiveGameId | null>(null)
  const [picks, setPicks] = React.useState<RoomOptions>({})
  const [discount, setDiscount] = React.useState(20)
  const [pending, setPending] = React.useState(false)

  const friend = debtors.find((d) => d.userId === friendId)
  const statuses = useFriendStatuses(debtors.map((d) => d.userId))
  const profile = friends.find((f) => f.uid === friendId)

  const back = () => {
    if (step === 2) setStep(1)
    else if (step === 1 && !preset) setStep(0)
    else if (window.history.length > 1) router.back()
    else router.replace("/challenges?tab=discount")
  }

  const create = async () => {
    if (!user || !friend || !game || pending) return
    setPending(true)
    const id = newChallengeId()
    let code: string | null = null
    try {
      code = await createRoom(user, game, picks, wallet ? levelOf(liveXp(wallet)) : undefined, { challengeId: id, with: friend.userId })
      await createLiveDiscountChallenge(user, {
        id,
        friend: { uid: friend.userId, name: friend.name, basePaise: friend.netBalancePaise },
        discountPercent: discount,
        liveGame: game,
        roomCode: code,
      })
      router.replace(`/play/${code}`)
    } catch (e) {
      // The room is useless without its challenge
      if (code) void deleteRoom(code).catch(() => undefined)
      toast.error(getErrorMessage(e, "Couldn't start the discount game — please try again"))
      setPending(false)
    }
  }

  const titles = ["Who owes you?", "Pick a game", "Game setup"]
  const hint =
    step === 2 && friend
      ? `If ${friend.name.split(" ")[0]} wins, they get ${discount}% off the ${formatPaise(friend.netBalancePaise)} they owe — if they pay you within 10 minutes. Only you record the result.`
      : null

  return (
    <GameScreen>
      <GameTopBar
        onBack={back}
        center={
          <div className="flex flex-col items-center gap-1">
            <p className="gu-title text-xl leading-none">{titles[step]}</p>
            <StepDots step={step} of={3} />
          </div>
        }
        right={<span className="size-10" aria-hidden />}
      />

      <div className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-5 px-4 pt-2 pb-40">
        {step === 0 ? (
          debtors.length === 0 ? (
            <GameNote className="mt-4">
              <span className="block text-base font-bold text-[var(--gu-ink)]">Nobody owes you right now</span>
              Discount games are for friends who owe you money: if they win, they pay you less.
            </GameNote>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3" role="radiogroup" aria-label="Friend who owes you">
              {debtors.map((d) => {
                const f = friends.find((x) => x.uid === d.userId)
                const isBusy = busy.has(d.userId)
                return (
                  <GameChoice
                    key={d.userId}
                    role="radio"
                    selected={friendId === d.userId}
                    disabled={isBusy}
                    onClick={() => {
                      setFriendId(d.userId)
                      setStep(1)
                    }}
                    className={cn("flex flex-col items-center gap-1.5 px-2 pt-3 pb-2.5", isBusy && "opacity-55")}
                  >
                    <span className="relative">
                      <GameAvatar character={f?.gameAvatar} photo={f?.photoURL ?? d.photoURL} name={d.name} frame={f?.frame} size={54} />
                      <StatusChip status={statuses[d.userId]} dotOnly className="absolute -bottom-0.5 -left-0.5" />
                    </span>
                    <span className="w-full truncate text-sm font-bold">{d.name.split(" ")[0]}</span>
                    <StatusChip status={statuses[d.userId]} />
                    <span className="gu-chip !bg-[#e7f9ef] text-[11px] !text-[var(--gu-green-deep)]">
                      Owes {formatPaise(d.netBalancePaise)}
                    </span>
                    {isBusy ? <span className="text-[10px] font-bold text-[var(--gu-ink-soft)]">Already in a game</span> : null}
                  </GameChoice>
                )
              })}
            </div>
          )
        ) : null}

        {step >= 1 && friend ? (
          <div className="gu-panel-flat flex items-center gap-3 p-3">
            <GameAvatar uid={friend.userId} character={profile?.gameAvatar} photo={profile?.photoURL ?? friend.photoURL} name={friend.name} frame={profile?.frame} size={44} />
            <span className="min-w-0 flex-1">
              <span className="flex min-w-0 items-center gap-2">
                <span className="truncate font-bold">{friend.name}</span>
                <StatusChip status={statuses[friend.userId]} className="shrink-0" />
              </span>
              <span className="block text-xs font-bold text-[var(--gu-green-deep)]">Owes you {formatPaise(friend.netBalancePaise)}</span>
            </span>
            {!preset ? (
              <button type="button" className="gu-chip" onClick={() => setStep(0)}>
                Change
              </button>
            ) : null}
          </div>
        ) : null}

        {step >= 1 && !friend && friendId ? (
          <GameNote>
            {debtors.length === 0 && expenses.length === 0 ? (
              <Spinner className="mx-auto size-6" />
            ) : (
              "They don't owe you anything right now, so there's no discount to play for."
            )}
          </GameNote>
        ) : null}

        {step === 1 && friend ? (
          <LiveGameGrid
            games={DUEL_GAMES}
            onPick={(id) => {
              setGame(id)
              setPicks(defaultOptions(id, id === "ludo" ? { teams: "solo" } : {}))
              setStep(2)
            }}
          />
        ) : null}

        {step === 2 && friend && game ? (
          <>
            <div className="gu-panel-flat p-4">
              <GameHero game={game} picks={picks} />
            </div>
            <GamePanel title="Discount">
              <DiscountChooser value={discount} onChange={setDiscount} />
            </GamePanel>
            {LIVE_GAMES[game].options.some((o) => o.key !== "teams") ? (
              <GamePanel title="Settings">
                <GameOptionsPicker
                  game={game}
                  picks={picks}
                  onChange={setPicks}
                  hide={["teams", "mode"]}
                />
              </GamePanel>
            ) : null}
          </>
        ) : null}
      </div>

      {step === 2 && friend && game ? (
        <div className="pb-safe fixed inset-x-0 bottom-0 z-30 bg-gradient-to-t from-[#c9b6ef] via-[#c9b6ef]/90 to-transparent px-4 pt-6">
          <div className="mx-auto flex max-w-xl flex-col gap-2 pb-3">
            {hint ? <p className="text-center text-xs font-bold text-[var(--gu-ink)]/85">{hint}</p> : null}
            <GameButton tone="green" size="lg" className="w-full" onClick={() => void create()} disabled={pending}>
              {pending ? <Spinner className="size-5" /> : <HugeiconsIcon icon={PlayIcon} className="size-5" strokeWidth={2.6} />}
              {pending ? "Starting…" : `Challenge ${friend.name.split(" ")[0]}`}
            </GameButton>
          </div>
        </div>
      ) : step === 1 && friend ? (
        <p className="pb-safe fixed inset-x-0 bottom-3 text-center text-xs font-bold text-[var(--gu-ink)]/80">
          One-on-one: just you and {friend.name.split(" ")[0]}
          <HugeiconsIcon icon={ArrowRight01Icon} className="ml-1 inline size-3.5" />
        </p>
      ) : null}
    </GameScreen>
  )
}

/** The winner's discount: big preset cards, and − / + for any whole percent from 1 to 100. */
function DiscountChooser({ value, onChange }: { value: number; onChange: (pct: number) => void }) {
  const set = (v: number) => onChange(Math.min(100, Math.max(1, Math.round(v))))
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-5 gap-2" role="radiogroup" aria-label="Discount presets">
        {[...DISCOUNT_PRESETS, 100].map((pct) => (
          <GameChoice key={pct} role="radio" selected={value === pct} onClick={() => set(pct)} className="h-12 text-base font-bold tabular-nums">
            {pct}%
          </GameChoice>
        ))}
      </div>
      <div className="flex items-center justify-center gap-4">
        <GameIconButton icon={MinusSignIcon} label="Less discount" tone="cream" size="sm" onClick={() => set(value - 5)} disabled={value <= 1} />
        <span className="min-w-24 text-center text-4xl font-bold tabular-nums">{value}%</span>
        <GameIconButton icon={PlusSignIcon} label="More discount" tone="cream" size="sm" onClick={() => set(value + 5)} disabled={value >= 100} />
      </div>
      {value === 100 ? (
        <p className="flex items-center justify-center gap-1.5 text-center text-xs font-bold text-[var(--gu-green-deep)]">
          <HugeiconsIcon icon={Tick02Icon} className="size-4" strokeWidth={2.6} />
          100% off: if they win, what they owe you is settled for free.
        </p>
      ) : null}
    </div>
  )
}
