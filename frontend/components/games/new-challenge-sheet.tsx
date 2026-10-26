"use client"

import * as React from "react"
import { useRouter } from "nextjs-toploader/app"

import { useSession } from "@/components/providers/session-provider"
import { BottomSheet } from "@/components/shared/bottom-sheet"
import { PickerDrawer, PickerTrigger } from "@/components/shared/picker-drawer"
import { GroupIcon } from "@/components/shared/group-icon"
import { UserAvatar } from "@/components/shared/user-avatar"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { useCreateChallenge } from "@/hooks/mutations"
import {
  useChallenges,
  useExpenses,
  useFriends,
  useGroups,
} from "@/hooks/queries"
import { useLiveGameDiscounts } from "@/hooks/use-game-discounts"
import {
  GAME_IDS,
  GAMES,
  GRID_CELLS,
  gridCellsToHide,
  isGridGame,
  randomFlips,
  randomLuckyNumber,
  randomTreasureBoxes,
  TREASURE_PRIZES,
  type GameSecret,
  MAX_GROUP_PLAYERS,
  type GameId,
} from "@/lib/games"
import {
  calculateDirectBalance,
  calculatePersonBalances,
  formatPaise,
} from "@/lib/money"
import { cn } from "@/lib/utils"
import {
  CoinTossPicker,
  emptyCoinCalls,
  isCoinComplete,
} from "./coin-toss-picker"
import { DiscountPicker } from "./discount-picker"
import { GRID_ITEM, GridBoard } from "./grid-board"
import { LuckyNumberPicker } from "./lucky-number-picker"
import { emptyRpsMoves, isComplete, RpsPicker } from "./rps-picker"
import { TreasureGrid } from "./treasure-picker"
import { GameGlyph } from "./game-glyph"

type Mode = "friend" | "group"
type Stake = "fun" | "discount"

/**
 * Start any game: pick the game, who plays (a friend or a whole group) and the
 * stakes — just for fun with anyone, or a discount for people who owe you.
 * One discount game per person at a time, so two discounts never stack.
 */
export function NewChallengeSheet({
  open,
  onOpenChange,
  initialGame = "rps",
  initialPerson,
  initialStake = "fun",
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialGame?: GameId
  /** Preselected opponent — may be a group member who isn't on your friends list. */
  initialPerson?: {
    uid: string
    name: string
    photoURL?: string
    owedPaise?: number
  }
  initialStake?: Stake
}) {
  const router = useRouter()
  const { user } = useSession()
  const uid = user?.uid ?? ""
  const { data: friendProfiles } = useFriends()
  const { data: groups } = useGroups()
  const { data: expenses } = useExpenses()
  const { data: challenges } = useChallenges()
  const liveDiscounts = useLiveGameDiscounts()
  const createChallenge = useCreateChallenge()

  const [game, setGame] = React.useState<GameId>(initialGame)
  const [mode, setMode] = React.useState<Mode>("friend")
  const [friendId, setFriendId] = React.useState<string | null>(
    initialPerson?.uid ?? null
  )
  const [groupId, setGroupId] = React.useState<string | null>(null)
  const [stake, setStake] = React.useState<Stake>(initialStake)
  const [discount, setDiscount] = React.useState(20)
  const [moves, setMoves] = React.useState(emptyRpsMoves)
  const [cells, setCells] = React.useState<number[]>([])
  const [flips, setFlips] = React.useState(emptyCoinCalls)
  const [boxes, setBoxes] = React.useState<number[]>([])
  const [secretNumber, setSecretNumber] = React.useState(50)
  const [drawer, setDrawer] = React.useState<
    "game" | "friend" | "group" | null
  >(null)

  // Opening again (e.g. from another game card) starts from that card's choices
  const [lastOpen, setLastOpen] = React.useState(false)
  if (open !== lastOpen) {
    setLastOpen(open)
    if (open) {
      setGame(initialGame)
      setMode("friend")
      setFriendId(initialPerson?.uid ?? null)
      setStake(initialStake)
      setMoves(emptyRpsMoves())
      setCells([])
      setFlips(emptyCoinCalls())
      setBoxes([])
      setSecretNumber(50)
      setDrawer(null)
    }
  }

  // Your friends, plus the preselected person if they aren't one
  const friends = React.useMemo(() => {
    const list = friendProfiles.map((f) => ({
      uid: f.uid,
      displayName: f.displayName,
      photoURL: f.photoURL,
      splitzyId: f.splitzyId,
    }))
    if (initialPerson && !list.some((f) => f.uid === initialPerson.uid)) {
      list.unshift({
        uid: initialPerson.uid,
        displayName: initialPerson.name,
        photoURL: initialPerson.photoURL,
        splitzyId: "",
      })
    }
    return list
  }, [friendProfiles, initialPerson])

  // What each person owes you overall (positive = they owe you)
  const owedBy = React.useMemo(() => {
    const map = new Map<string, number>(
      uid
        ? calculatePersonBalances(uid, expenses).map((b) => [
            b.userId,
            b.netBalancePaise,
          ])
        : []
    )
    // The screen that opened us already knows what this person owes: use the same number
    if (initialPerson?.owedPaise !== undefined)
      map.set(initialPerson.uid, initialPerson.owedPaise)
    return map
  }, [uid, expenses, initialPerson])
  // Already in a discount game with you (open, or a discount still running): no second one
  const discountBusy = React.useMemo(() => {
    const busy = new Set(liveDiscounts.byPerson.keys())
    for (const c of challenges) {
      if (c.status === "OPEN" && c.hostId === uid && c.discountPercent > 0)
        c.players.forEach((p) => busy.add(p))
    }
    return busy
  }, [challenges, liveDiscounts.byPerson, uid])

  const friend = friends.find((f) => f.uid === friendId)
  const group = groups.find((g) => g.id === groupId)
  const friendOwes = friend ? Math.max(0, owedBy.get(friend.uid) ?? 0) : 0

  // Group players: everyone else for fun; for a discount, those who owe you in this group
  const groupMembers = React.useMemo(() => {
    if (!group) return []
    const groupExpenses = expenses.filter(
      (e) => !e.deletedAt && e.groupId === group.id
    )
    return group.members
      .filter((m) => m !== uid)
      .map((m) => ({
        uid: m,
        name:
          group.memberDetails?.[m]?.name ||
          friendProfiles.find((f) => f.uid === m)?.displayName ||
          "Member",
        owesPaise: Math.max(
          0,
          calculateDirectBalance(uid, m, groupExpenses).netBalancePaise
        ),
      }))
  }, [group, expenses, friendProfiles, uid])
  const groupDiscountPlayers = groupMembers.filter(
    (m) => m.owesPaise > 0 && !discountBusy.has(m.uid)
  )

  const discountReason =
    mode === "friend"
      ? !friend
        ? "Pick a friend first"
        : friendOwes <= 0
          ? `${friend.displayName.split(" ")[0]} doesn't owe you anything`
          : discountBusy.has(friend.uid)
            ? `You already have a discount game with ${friend.displayName.split(" ")[0]}`
            : null
      : !GAMES[game].groupDiscount
        ? `${GAMES[game].name} is just for fun in groups`
        : !group
          ? "Pick a group first"
          : groupDiscountPlayers.length === 0
            ? "Nobody in this group owes you (or they're already in a discount game)"
            : null
  const effectiveStake: Stake = discountReason ? "fun" : stake

  const players =
    mode === "friend"
      ? friend
        ? [
            {
              uid: friend.uid,
              name: friend.displayName,
              basePaise: effectiveStake === "discount" ? friendOwes : 0,
            },
          ]
        : []
      : effectiveStake === "discount"
        ? groupDiscountPlayers.map((m) => ({
            uid: m.uid,
            name: m.name,
            basePaise: m.owesPaise,
          }))
        : groupMembers.map((m) => ({ uid: m.uid, name: m.name, basePaise: 0 }))
  const tooMany = mode === "group" && players.length > MAX_GROUP_PLAYERS
  // The host's secret for this game, or what's still missing from it
  const toHide = isGridGame(game) ? gridCellsToHide(game) : 0
  const secret: { value: GameSecret | null; missing: string } = (() => {
    switch (game) {
      case "rps":
        return isComplete(moves)
          ? { value: { moves }, missing: "" }
          : { value: null, missing: "Pick your 3 moves" }
      case "coin_toss":
        return isCoinComplete(flips)
          ? { value: { flips }, missing: "" }
          : {
              value: null,
              missing: `Pick ${flips.filter((f) => f === null).length} more flips`,
            }
      case "treasure":
        return boxes.length === TREASURE_PRIZES
          ? { value: { boxes }, missing: "" }
          : {
              value: null,
              missing: `Hide treasure in ${TREASURE_PRIZES - boxes.length} more boxes`,
            }
      case "lucky_number":
        return { value: { number: secretNumber }, missing: "" }
      case "minefield":
      case "gold_rush":
        return cells.length === toHide
          ? { value: { cells }, missing: "" }
          : {
              value: null,
              missing: `Hide ${toHide - cells.length} more ${GRID_ITEM[game].plural}`,
            }
    }
  })()
  const ready = players.length > 0 && !tooMany && secret.value !== null
  const toggleIn =
    (setter: React.Dispatch<React.SetStateAction<number[]>>, max: number) =>
    (n: number) =>
      setter((cur) =>
        cur.includes(n)
          ? cur.filter((c) => c !== n)
          : cur.length < max
            ? [...cur, n]
            : cur
      )
  const toggleCell = toggleIn(setCells, toHide)
  const toggleBox = toggleIn(setBoxes, TREASURE_PRIZES)

  const send = () => {
    if (!ready) return
    createChallenge.mutate(
      {
        kind: mode,
        game,
        discountPercent: effectiveStake === "discount" ? discount : 0,
        players,
        ...(secret.value ? { hostSecret: secret.value } : {}),
        ...(mode === "group" && group
          ? { group: { id: group.id, name: group.name } }
          : {}),
      },
      {
        onSuccess: (challenge) => {
          onOpenChange(false)
          router.push(`/challenges/${challenge.id}`)
        },
      }
    )
  }

  const sortedFriends = [...friends].sort(
    (a, b) =>
      (owedBy.get(b.uid) ?? 0) - (owedBy.get(a.uid) ?? 0) ||
      a.displayName.localeCompare(b.displayName)
  )
  const playableGroups = groups.filter((g) => g.members.length > 1)

  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title="New challenge"
      description="Play for fun with anyone, or offer a discount to someone who owes you."
      footer={
        <Button
          size="lg"
          className="h-11 w-full"
          disabled={!ready || createChallenge.isPending}
          onClick={send}
        >
          {createChallenge.isPending && <Spinner />}
          {players.length === 0
            ? mode === "friend"
              ? "Pick a friend"
              : "Pick a group"
            : secret.missing
              ? secret.missing
              : `Send to ${players.length === 1 ? players[0].name.split(" ")[0] : `${players.length} players`}`}
        </Button>
      }
    >
      <div className="flex flex-col gap-6 pb-2">
        {/* 1. Game: one field, the full list in a drawer (room for many more games) */}
        <section className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold">Game</h3>
          <PickerTrigger
            placeholder="Choose a game"
            media={
              <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-xl">
                <GameGlyph game={game} />
              </span>
            }
            label={GAMES[game].name}
            sublabel={`${GAMES[game].howToWin[mode]}.`}
            onClick={() => setDrawer("game")}
          />
          <PickerDrawer
            open={drawer === "game"}
            onOpenChange={(o) => setDrawer(o ? "game" : null)}
            title="Choose a game"
            searchPlaceholder="Search games"
            items={GAME_IDS.map((id) => ({
              id,
              label: GAMES[id].name,
              sublabel: GAMES[id].tagline,
              media: (
                <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-xl">
                  <GameGlyph game={id} />
                </span>
              ),
            }))}
            selected={[game]}
            onSelect={(id) => setGame(id as GameId)}
          />
        </section>

        {/* 2. Who plays: a friend or a group, each picked from a drawer with search */}
        <section className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold">Play with</h3>
            <Segmented
              value={mode}
              onChange={setMode}
              options={[
                { value: "friend", label: "A friend" },
                { value: "group", label: "A group" },
              ]}
            />
          </div>

          {mode === "friend" ? (
            friends.length === 0 ? (
              <p className="py-2 text-xs text-muted-foreground">
                Add friends to challenge them.
              </p>
            ) : (
              <>
                <PickerTrigger
                  placeholder="Choose a friend"
                  media={
                    friend ? (
                      <UserAvatar
                        src={friend.photoURL}
                        name={friend.displayName}
                        size="sm"
                      />
                    ) : undefined
                  }
                  label={friend?.displayName}
                  sublabel={
                    friend
                      ? friendOwes > 0
                        ? `Owes you ${formatPaise(friendOwes)}`
                        : friend.splitzyId
                      : undefined
                  }
                  onClick={() => setDrawer("friend")}
                />
                <PickerDrawer
                  open={drawer === "friend"}
                  onOpenChange={(o) => setDrawer(o ? "friend" : null)}
                  title="Challenge a friend"
                  searchPlaceholder="Search name or JoySplit ID"
                  items={sortedFriends.map((f) => {
                    const owes = owedBy.get(f.uid) ?? 0
                    return {
                      id: f.uid,
                      label: f.displayName,
                      keywords: f.splitzyId,
                      sublabel:
                        owes > 0 ? (
                          <span className="text-success">
                            Owes you {formatPaise(owes)}
                          </span>
                        ) : (
                          f.splitzyId
                        ),
                      media: (
                        <UserAvatar
                          src={f.photoURL}
                          name={f.displayName}
                          size="sm"
                        />
                      ),
                    }
                  })}
                  selected={friendId ? [friendId] : []}
                  onSelect={setFriendId}
                />
              </>
            )
          ) : playableGroups.length === 0 ? (
            <p className="py-2 text-xs text-muted-foreground">
              You need a group with at least one other member.
            </p>
          ) : (
            <>
              <PickerTrigger
                placeholder="Choose a group"
                media={
                  group ? (
                    <GroupIcon
                      src={group.icon}
                      alt={group.name}
                      size="sm"
                      className="size-8"
                    />
                  ) : undefined
                }
                label={group?.name}
                sublabel={
                  group
                    ? `${group.members.length - 1} ${group.members.length === 2 ? "player" : "players"}`
                    : undefined
                }
                onClick={() => setDrawer("group")}
              />
              <PickerDrawer
                open={drawer === "group"}
                onOpenChange={(o) => setDrawer(o ? "group" : null)}
                title="Challenge a group"
                searchPlaceholder="Search groups"
                items={playableGroups.map((g) => ({
                  id: g.id,
                  label: g.name,
                  sublabel: `${g.members.length - 1} ${g.members.length === 2 ? "player" : "players"}`,
                  media: (
                    <GroupIcon
                      src={g.icon}
                      alt={g.name}
                      size="sm"
                      className="size-8"
                    />
                  ),
                }))}
                selected={groupId ? [groupId] : []}
                onSelect={setGroupId}
              />
            </>
          )}
          {tooMany && (
            <p className="text-xs text-destructive">
              Group games can have up to {MAX_GROUP_PLAYERS} players.
            </p>
          )}
        </section>

        {/* 3. Stakes */}
        <section className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold">Play for</h3>
            <Segmented
              value={effectiveStake}
              onChange={setStake}
              options={[
                { value: "fun", label: "Just for fun" },
                {
                  value: "discount",
                  label: "A discount",
                  disabled: !!discountReason,
                },
              ]}
            />
          </div>
          {effectiveStake === "discount" ? (
            <div className="flex flex-col gap-2">
              <DiscountPicker value={discount} onChange={setDiscount} />
              <p className="text-xs text-muted-foreground">
                {mode === "friend" && friend
                  ? `If ${friend.displayName.split(" ")[0]} wins, they pay ${formatPaise(
                      friendOwes - Math.floor((friendOwes * discount) / 100)
                    )} instead of ${formatPaise(friendOwes)} — only if they pay right after the game.`
                  : `${players.length} ${players.length === 1 ? "person owes" : "people owe"} you in this group. Winners get ${discount}% off what they owe if they pay right after the game.`}
              </p>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              No money involved — just bragging rights.
              {discountReason && (mode === "friend" ? friend : group)
                ? ` (Discount: ${discountReason.toLowerCase()}.)`
                : ""}
            </p>
          )}
        </section>

        {/* 4. Host's secret: what the others play against */}
        <section className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold">
              {
                {
                  rps: "Your secret moves",
                  coin_toss: "Your secret coin flips",
                  treasure: `Hide the treasure in ${TREASURE_PRIZES} boxes`,
                  lucky_number: "Your secret number",
                  minefield: `Hide ${toHide} bombs`,
                  gold_rush: `Bury ${toHide} gold coins`,
                }[game]
              }
            </h3>
            {game !== "rps" && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs text-primary"
                disabled={createChallenge.isPending}
                onClick={() => {
                  if (game === "coin_toss") setFlips(randomFlips())
                  else if (game === "treasure") setBoxes(randomTreasureBoxes())
                  else if (game === "lucky_number")
                    setSecretNumber(randomLuckyNumber())
                  else if (isGridGame(game)) setCells(randomCells(toHide))
                }}
              >
                Pick for me
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {
              {
                rps: "Best of 3: the others try to beat these.",
                coin_toss: "The others call each flip — 3 right wins.",
                treasure: "The others open one box each — a treasure box wins.",
                lucky_number:
                  mode === "friend"
                    ? "Your friend wins with a guess within 10 of it."
                    : "The closest guess wins.",
                minefield: "Tap the tiles to hide them under.",
                gold_rush: "Tap the tiles to bury them under.",
              }[game]
            }{" "}
            Locked in now and hidden until the others play.
          </p>
          {game === "rps" ? (
            <RpsPicker
              value={moves}
              onChange={setMoves}
              disabled={createChallenge.isPending}
            />
          ) : game === "coin_toss" ? (
            <CoinTossPicker
              value={flips}
              onChange={setFlips}
              disabled={createChallenge.isPending}
            />
          ) : game === "treasure" ? (
            <TreasureGrid
              selected={boxes}
              onToggle={toggleBox}
              disabled={createChallenge.isPending}
            />
          ) : game === "lucky_number" ? (
            <LuckyNumberPicker
              value={secretNumber}
              onChange={setSecretNumber}
              disabled={createChallenge.isPending}
            />
          ) : (
            <GridBoard
              game={game}
              mode="setup"
              selected={cells}
              onToggle={toggleCell}
              disabled={createChallenge.isPending}
            />
          )}
          {(game === "treasure" || isGridGame(game)) && (
            <p className="text-center text-xs text-muted-foreground tabular-nums">
              {game === "treasure" ? boxes.length : cells.length}/
              {game === "treasure" ? TREASURE_PRIZES : toHide} placed
            </p>
          )}
        </section>
      </div>
    </BottomSheet>
  )
}

function Segmented<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: string; disabled?: boolean }[]
}) {
  return (
    <div
      role="tablist"
      className="grid shrink-0 grid-flow-col rounded-md border bg-muted/60 p-0.5"
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="tab"
          aria-selected={value === o.value}
          disabled={o.disabled}
          onClick={() => onChange(o.value)}
          className={cn(
            "rounded-[5px] px-2.5 py-1 text-xs font-medium whitespace-nowrap transition-colors disabled:opacity-40",
            value === o.value
              ? "bg-background text-foreground ring-1 ring-border"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

/** n different random cells of the 4×4 grid. */
function randomCells(n: number) {
  const picked = new Set<number>()
  while (picked.size < n) picked.add(Math.floor(Math.random() * GRID_CELLS))
  return [...picked]
}
