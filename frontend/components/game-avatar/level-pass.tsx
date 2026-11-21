"use client"

import * as React from "react"
import { ArrowDown01Icon, GiftIcon, StarIcon, Tick02Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { CoinIcon } from "@/components/fun/coin"
import { FramedAvatar } from "@/components/fun/framed-avatar"
import { Spinner } from "@/components/ui/spinner"
import { MAX_LEVEL, levelInfo, levelTitle } from "@/lib/live/levels"
import { cn } from "@/lib/utils"
import { CharacterTile } from "./character-tile"
import { GameAvatar } from "./game-avatar"
import { LevelBadge } from "./level-badge"
import { useClaimLevel, type RoadUser, type RoadWallet } from "./level-road"
import { levelRewards, rewardId, rewardName, unclaimed, type Reward } from "./ownership"
import { CHARACTERS } from "./registry"
import type { CharacterDef } from "./types"
import "./level-pass.css"

/*
 * The level pass (the Levels tab): every level on one vertical track, like a
 * mobile game's season pass. Level 1 sits at the bottom and the track climbs:
 * a gold bar fills up to where your XP is, each level is a numbered stop on
 * it, and the levels that give something show their prizes beside the stop —
 * items (frames, characters) on the left, coins on the right — locked,
 * ready to claim, or ticked.
 *
 * Above the top level the track keeps going into a faint, blurred, locked
 * stop: pull past the top and the track stretches (with resistance) to show a
 * little more of it, then springs back — the road goes on, just not yet.
 *
 * Every size here is fixed, so where each stop sits is known without measuring
 * (no layout reads while scrolling); the fill, the puck and the stretch are
 * transforms only.
 */

const fmt = new Intl.NumberFormat("en-IN")

/** Row heights: a level with prizes, one without, and the title ribbon under a new title's first level. */
const ROW_PRIZE = 156
const ROW_PLAIN = 96
const RIBBON = 36
/** Node sizes (px): any stop, and yours. */
const NODE = 40
const NODE_HERE = 50
const PUCK = 34
/** How much of the next-level teaser shows above the track at rest (the rest is above the top edge). */
const PEEK = 58
/** The teaser row's height (as a prize row). */
const TEASER = ROW_PRIZE
/** Space under level 1. */
const FOOT = 24

type Row = { level: number; top: number; height: number; center: number; rewards: Reward[]; ribbon: string | null }

/** A new title starts at this level (Rookie at 1, Challenger at 5, …): a ribbon under it. */
const ribbonAt = (level: number) => (level === 1 || levelTitle(level) !== levelTitle(level - 1) ? levelTitle(level) : null)

function layout(characters: CharacterDef[]) {
  const prizes = new Map(levelRewards(characters).map((x) => [x.level, x.rewards]))
  const rows: Row[] = []
  let y = PEEK
  for (let level = MAX_LEVEL; level >= 1; level--) {
    const rewards = prizes.get(level) ?? []
    const main = rewards.length ? ROW_PRIZE : ROW_PLAIN
    const ribbon = ribbonAt(level)
    const height = main + (ribbon ? RIBBON : 0)
    rows.push({ level, top: y, height, center: y + main / 2, rewards, ribbon })
    y += height
  }
  return { rows, height: y + FOOT, byLevel: new Map(rows.map((r) => [r.level, r])) }
}

/* ── The header: your level, XP to the next, the next prize ─────────── */

/** Your level big, the XP bar to the next ("320 / 750 XP"), and what the next prize is. */
export function LevelPassHeader({
  user,
  wallet,
  characters = CHARACTERS,
  onJump,
}: {
  user: RoadUser
  wallet: RoadWallet
  characters?: CharacterDef[]
  /** Scroll the track to the lowest prize waiting to be claimed. */
  onJump?: () => void
}) {
  const info = levelInfo(wallet)
  const all = levelRewards(characters)
  const next = all.find((x) => x.level > info.level && unclaimed(x.rewards, wallet).length)
  const ready = all.filter((x) => x.level <= info.level).reduce((n, x) => n + unclaimed(x.rewards, wallet).length, 0)
  const [shown, setShown] = React.useState(0)
  React.useEffect(() => {
    const id = window.requestAnimationFrame(() => setShown(info.progress))
    return () => window.cancelAnimationFrame(id)
  }, [info.progress])

  return (
    <div className="lp-head">
      <div className="flex min-w-0 items-center gap-3">
        <LevelBadge level={info.level} size={46} />
        <div className="min-w-0 flex-1">
          <p className="lp-head-title truncate">Level {info.level}</p>
          {/* The title, and (on narrow screens, under it) a jump to what's waiting */}
          <div className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1">
            <span className="lp-head-sub truncate">{info.title}</span>
            {ready > 0 && onJump && (
              <button type="button" className="lp-jump" onClick={onJump} aria-label={`${ready} to claim: show`}>
                <HugeiconsIcon icon={GiftIcon} className="size-3.5" strokeWidth={2.4} />
                {ready}
                <HugeiconsIcon icon={ArrowDown01Icon} className="size-3.5" strokeWidth={2.8} />
              </button>
            )}
          </div>
        </div>
        {next && (
          <div className="lp-next" aria-label={`Next prize at level ${next.level}: ${next.rewards.map(rewardName).join(", ")}`}>
            <span className={cn("lp-next-art", next.rewards[0].kind === "coins" ? "lp-tone-gold" : "lp-tone-violet")}>
              <PrizeArt reward={next.rewards[0]} user={user} size="sm" />
            </span>
            <span className="lp-next-lv">Lv {next.level}</span>
          </div>
        )}
      </div>

      <div className="lp-xp mt-3">
        <span aria-hidden className="lp-xp-star">
          <HugeiconsIcon icon={StarIcon} className="size-4" strokeWidth={2.6} />
        </span>
        <div
          className="lp-xp-track"
          role="progressbar"
          aria-label="XP to the next level"
          aria-valuemin={0}
          aria-valuemax={info.max ? info.xp : info.need}
          aria-valuenow={info.max ? info.xp : info.into}
        >
          <span className="lp-xp-fill" style={{ transform: `translateX(${(Math.min(1, Math.max(0, shown)) - 1) * 100}%)` }} />
          <span className="lp-xp-text">
            {info.max ? `${fmt.format(info.xp)} XP` : `${fmt.format(info.into)} / ${fmt.format(info.need)} XP`}
          </span>
        </div>
        <span className="lp-xp-goal">
          {info.max ? (
            "MAX"
          ) : (
            <>
              <small>LV</small>
              {info.level + 1}
            </>
          )}
        </span>
      </div>
    </div>
  )
}

/* ── The track ──────────────────────────────────────────────────────── */

export type LevelPassHandle = { jumpToClaim: () => void }

/**
 * The whole pass, as its own scroller (fills the rest of the screen). Opens
 * at your level; `ref.jumpToClaim()` glides to the lowest prize waiting.
 */
export function LevelPass({
  ref,
  user,
  wallet,
  characters = CHARACTERS,
  footer,
}: {
  ref?: React.Ref<LevelPassHandle>
  user: RoadUser
  wallet: RoadWallet
  characters?: CharacterDef[]
  /** Under level 1 (room for the Games bar). */
  footer?: React.ReactNode
}) {
  const scroller = React.useRef<HTMLDivElement>(null)
  const content = React.useRef<HTMLDivElement>(null)
  const teaser = React.useRef<HTMLDivElement>(null)
  const { rows, height, byLevel } = React.useMemo(() => layout(characters), [characters])
  const info = levelInfo(wallet)
  const { take, busy } = useClaimLevel()

  useTopStretch(scroller, content, teaser)

  // Where the fill's head is: your level's stop, plus your progress towards the next one
  const here = byLevel.get(info.level)!
  const above = byLevel.get(info.level + 1)
  const gap = above ? here.center - above.center : 0
  const head = here.center - (info.max ? 0 : info.progress * gap)
  const bottom = byLevel.get(1)!.center
  // The puck rides the head, kept clear of the two stops it's between
  const lo = NODE_HERE / 2 + PUCK / 2 + 2
  const hi = gap - NODE / 2 - PUCK / 2 - 2
  const rise = here.center - head
  const puck = info.max ? null : here.center - (lo <= hi ? Math.min(hi, Math.max(lo, rise)) : gap / 2)

  // On mount the fill runs up from your stop to your progress (it's on screen: we open there)
  const [grown, setGrown] = React.useState(false)
  React.useEffect(() => {
    const id = window.requestAnimationFrame(() => window.requestAnimationFrame(() => setGrown(true)))
    return () => window.cancelAnimationFrame(id)
  }, [])
  const fillTo = grown ? head : here.center
  const puckTo = puck === null ? null : grown ? puck : here.center - lo

  // Open at your level (once the wallet's in): your stop a little below the middle
  const loaded = wallet !== undefined
  React.useLayoutEffect(() => {
    const el = scroller.current
    if (!el || !loaded) return
    el.scrollTop = Math.max(0, here.center - el.clientHeight * 0.55)
    // Only on arrival: later wallet changes (a claim, a game) leave the scroll alone
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded])

  React.useImperativeHandle(
    ref,
    () => ({
      jumpToClaim: () => {
        const el = scroller.current
        const row = [...rows].reverse().find((r) => r.level <= info.level && unclaimed(r.rewards, wallet).length)
        if (!el || !row) return
        el.scrollTo({ top: Math.max(0, row.center - el.clientHeight * 0.5), behavior: "smooth" })
      },
    }),
    [rows, info.level, wallet]
  )

  return (
    // data-no-ptr: the games' pull-to-refresh leaves this list alone (it has its own top stretch)
    <div ref={scroller} className="lp-scroller" data-no-ptr>
      {wallet === undefined ? (
        <div className="flex justify-center py-24">
          <Spinner className="size-8 text-white" />
        </div>
      ) : (
        <div ref={content} className="lp-content" style={{ height }}>
          {/* The track: dark, the gold fill rising from level 1 to your XP */}
          <div className="lp-rail" style={{ top: PEEK - TEASER, height: bottom - (PEEK - TEASER) }} aria-hidden>
            <span className="lp-fill" style={{ transform: `translateY(${fillTo - (PEEK - TEASER)}px)` }} />
          </div>

          {/* The next level, out of reach: mostly above the top edge, faint and blurred */}
          <div ref={teaser} className="lp-teaser" style={{ top: PEEK - TEASER, height: TEASER }} aria-hidden>
            <div className="lp-row">
              <div className="lp-lane lp-lane-left">
                <div className="lp-card lp-tone-violet" data-state="locked">
                  <MysteryArt />
                </div>
              </div>
              <div className="lp-node-cell">
                <span className="lp-node" data-state="locked">
                  {MAX_LEVEL + 1}
                </span>
              </div>
              <div className="lp-lane">
                <div className="lp-card lp-tone-gold" data-state="locked">
                  <MysteryArt />
                </div>
              </div>
            </div>
          </div>

          {rows.map((r) => (
            <LevelRow
              key={r.level}
              row={r}
              level={info.level}
              user={user}
              wallet={wallet}
              busy={busy}
              onClaim={(reward) => take(r.level, [reward], `${r.level}:${rewardId(reward)}`)}
            />
          ))}

          {/* You, riding the fill's head */}
          {puckTo !== null && (
            <span className="lp-puck" style={{ transform: `translate3d(-50%, ${puckTo - PUCK / 2}px, 0)` }} aria-hidden>
              <GameAvatar
                character={user.gameAvatar}
                photo={user.photoURL}
                name={user.displayName}
                size={PUCK - 6}
                peek={false}
              />
            </span>
          )}
        </div>
      )}
      {footer}
    </div>
  )
}

function LevelRow({
  row,
  level,
  user,
  wallet,
  busy,
  onClaim,
}: {
  row: Row
  level: number
  user: RoadUser
  wallet: RoadWallet
  busy: string | null
  onClaim: (reward: Reward) => void
}) {
  const reached = row.level <= level
  const current = row.level === level
  const open = new Set(unclaimed(row.rewards, wallet).map(rewardId))
  const items = row.rewards.filter((r) => r.kind !== "coins")
  const coins = row.rewards.filter((r) => r.kind === "coins")
  const main = row.rewards.length ? ROW_PRIZE : ROW_PLAIN

  const card = (r: Reward) => {
    const id = rewardId(r)
    const key = `${row.level}:${id}`
    return (
      <PrizeCard
        key={id}
        reward={r}
        user={user}
        // Claimed (even above your level, from before a curve change) beats locked
        state={!open.has(id) ? "claimed" : reached ? "ready" : "locked"}
        busy={busy === key}
        disabled={busy !== null}
        onClaim={() => onClaim(r)}
      />
    )
  }

  return (
    <div className="lp-level" style={{ top: row.top, height: row.height }}>
      <div className="lp-row" style={{ height: main }}>
        <div className="lp-lane lp-lane-left">{items.map(card)}</div>
        <div className="lp-node-cell">
          <span
            className="lp-node"
            data-state={current ? "here" : reached ? "reached" : "locked"}
            aria-label={`Level ${row.level}${current ? ", you're here" : reached ? ", reached" : ""}`}
          >
            {row.level}
          </span>
        </div>
        <div className="lp-lane">{coins.map(card)}</div>
      </div>
      {row.ribbon && (
        <div className="lp-ribbon" data-reached={reached || undefined} style={{ height: RIBBON }}>
          <span>{row.ribbon}</span>
        </div>
      )}
    </div>
  )
}

/** One prize: its art on a violet (items) or gold (coins) card — locked, ready (Claim) or ticked. */
function PrizeCard({
  reward,
  user,
  state,
  busy,
  disabled,
  onClaim,
}: {
  reward: Reward
  user: RoadUser
  state: "locked" | "ready" | "claimed"
  busy: boolean
  disabled: boolean
  onClaim: () => void
}) {
  const coins = reward.kind === "coins"
  return (
    <div
      className={cn("lp-card", coins ? "lp-tone-gold" : "lp-tone-violet")}
      data-state={state}
      aria-label={`${rewardName(reward)}${state === "locked" ? ", locked" : state === "claimed" ? ", claimed" : ", ready to claim"}`}
    >
      {state === "ready" && <span aria-hidden className="lp-glow" />}
      <span aria-hidden className="lp-shine" />
      <span className="lp-art">
        <PrizeArt reward={reward} user={user} size="md" />
      </span>
      <span className="lp-label">
        {coins ? (
          <>
            <CoinIcon className="size-3.5" />
            {fmt.format(reward.coins)}
          </>
        ) : reward.kind === "character" ? (
          reward.def.name
        ) : (
          rewardName(reward).replace(/ frame$/, "")
        )}
      </span>
      {state === "locked" && (
        <span className="lp-badge lp-badge-lock" aria-hidden>
          <Padlock />
        </span>
      )}
      {state === "claimed" && (
        <span className="lp-badge lp-badge-tick" aria-hidden>
          <HugeiconsIcon icon={Tick02Icon} className="size-4" strokeWidth={3} />
        </span>
      )}
      {state === "ready" && (
        <span className="lp-claim-wrap">
          <button type="button" className="gu-btn gu-green lp-claim" disabled={disabled} onClick={onClaim}>
            {busy ? <Spinner className="size-4" /> : "Claim"}
          </button>
        </span>
      )}
    </div>
  )
}

/** A prize's picture: the character, the frame on your photo, or a coin pile / sack by the amount. */
function PrizeArt({ reward, user, size }: { reward: Reward; user: RoadUser; size: "sm" | "md" }) {
  const sm = size === "sm"
  if (reward.kind === "character") return <CharacterTile def={reward.def} size={sm ? 40 : 62} shape="card" />
  if (reward.kind === "frame")
    return <FramedAvatar src={user.photoURL} name={user.displayName} frame={reward.frame} size={sm ? 26 : 40} />
  return reward.coins >= 600 ? <CoinSack size={sm ? 40 : 66} /> : <CoinPile size={sm ? 40 : 66} />
}

/* ── Art (original, flat SVG) ───────────────────────────────────────── */

/** A coin seen from a little above: rim, face and a shine. */
function Coin({ x, y, r = 7 }: { x: number; y: number; r?: number }) {
  return (
    <g>
      <ellipse cx={x} cy={y + 2} rx={r} ry={r * 0.42} fill="#c77a06" />
      <ellipse cx={x} cy={y} rx={r} ry={r * 0.42} fill="#ffd84d" stroke="#e39a0c" strokeWidth="1" />
      <ellipse cx={x - r * 0.25} cy={y - r * 0.1} rx={r * 0.45} ry={r * 0.16} fill="#fff3b0" opacity=".8" />
    </g>
  )
}

/** A stack of coins `n` high. */
function Stack({ x, base, n }: { x: number; base: number; n: number }) {
  return (
    <g>
      {Array.from({ length: n }, (_, i) => (
        <Coin key={i} x={x} y={base - i * 4} r={8} />
      ))}
    </g>
  )
}

/** Smaller amounts: three stacks of coins and one leaning. */
function CoinPile({ size }: { size: number }) {
  return (
    <svg viewBox="0 0 64 56" width={size} height={(size * 56) / 64} aria-hidden>
      <ellipse cx="32" cy="50" rx="25" ry="4" fill="rgba(60,20,0,.28)" />
      <Stack x={20} base={46} n={4} />
      <Stack x={42} base={47} n={3} />
      <Stack x={31} base={50} n={6} />
      <Coin x={50} y={50} r={6} />
      <path d="M48 12 l1.6 3.4 3.4 1.6 -3.4 1.6 -1.6 3.4 -1.6-3.4 -3.4-1.6 3.4-1.6 Z" fill="#fff" opacity=".9" />
    </svg>
  )
}

/** Bigger amounts: a bulging sack tied with gold rope, coins spilling out. */
function CoinSack({ size }: { size: number }) {
  const id = React.useId().replace(/:/g, "")
  return (
    <svg viewBox="0 0 64 60" width={size} height={(size * 60) / 64} aria-hidden>
      <defs>
        <linearGradient id={`${id}s`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#d99a5b" />
          <stop offset="1" stopColor="#8d5426" />
        </linearGradient>
      </defs>
      <ellipse cx="32" cy="55" rx="24" ry="4" fill="rgba(60,20,0,.3)" />
      <path d="M20 24 C6 32 6 54 22 55 H42 C58 54 58 32 44 24 Z" fill={`url(#${id}s)`} stroke="#5e3311" strokeWidth="2" />
      <path d="M17 34 C15 42 17 49 23 52" stroke="rgba(255,255,255,.35)" strokeWidth="3" strokeLinecap="round" fill="none" />
      <path d="M21 24 L18 13 L26 18 L32 9 L38 18 L46 13 L43 24 Z" fill="#c4834a" stroke="#5e3311" strokeWidth="2" strokeLinejoin="round" />
      <Coin x={27} y={14} r={6} />
      <Coin x={36} y={12} r={6} />
      <path d="M19 25 Q32 31 45 25" stroke="#ffd84d" strokeWidth="3.4" strokeLinecap="round" fill="none" />
      <path d="M19 25 Q32 31 45 25" stroke="#b86b00" strokeWidth="1" strokeLinecap="round" fill="none" opacity=".6" />
      <circle cx="32" cy="41" r="8" fill="#ffd84d" stroke="#c77a06" strokeWidth="2" />
      <path d="M32 36.5 l1.5 3 3.2.4 -2.4 2.2 .6 3.2 -2.9-1.6 -2.9 1.6 .6-3.2 -2.4-2.2 3.2-.4 Z" fill="#e39a0c" />
      <Coin x={12} y={52} r={6} />
      <Coin x={52} y={52} r={6} />
    </svg>
  )
}

/** A chunky padlock (the locked badge). */
function Padlock() {
  return (
    <svg viewBox="0 0 16 16" width={15} height={15} aria-hidden>
      <path d="M4.8 7.2 V5.4 a3.2 3.2 0 0 1 6.4 0 V7.2" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      <rect x="2.6" y="6.6" width="10.8" height="8" rx="2.4" fill="currentColor" />
      <circle cx="8" cy="10.2" r="1.3" fill="#fff" />
      <rect x="7.4" y="10.6" width="1.2" height="2.2" rx=".6" fill="#fff" />
    </svg>
  )
}

/** The prize nobody's seen yet: a chest's silhouette. */
function MysteryArt() {
  return (
    <span className="lp-art">
      <svg viewBox="0 0 64 56" width={62} height={54} aria-hidden>
        <path d="M10 26 Q10 12 24 12 H40 Q54 12 54 26 Z" fill="rgba(255,255,255,.4)" />
        <rect x="8" y="26" width="48" height="24" rx="4" fill="rgba(255,255,255,.3)" />
        <rect x="27" y="22" width="10" height="13" rx="2.5" fill="rgba(255,255,255,.55)" />
      </svg>
    </span>
  )
}

/* ── The stretch at the top ─────────────────────────────────────────── */

/** How far the content can stretch (px) and how stiffly (0.35 of the drag at first, less and less after). */
const LIMIT = 150
const GIVE = 0.35
const stretch = (d: number) => LIMIT * (1 - 1 / ((d * GIVE) / LIMIT + 1))
/** The drag that gives `o` px of stretch (to pick up a stretch already moving). */
const unstretch = (o: number) => (LIMIT / GIVE) * (1 / (1 - Math.min(o, LIMIT - 1) / LIMIT) - 1)

/**
 * A rubber band past the top of `scroller`: drag (or wheel / trackpad) down
 * while it's already at the top and `content` follows with growing resistance,
 * the faint `teaser` above coming more into view; let go and it springs back.
 *
 * Everything runs outside React — a transform and an opacity written straight
 * to the two elements, a spring on requestAnimationFrame — so it holds 60fps.
 * Touch uses touch events (a scroller's touches turn into a native pan, which
 * cancels pointer events); we only take over (preventDefault) while
 * stretching, so ordinary scrolling stays native. The scroller's
 * `overscroll-behavior: none` stops pull-to-refresh and the overscroll glow.
 */
function useTopStretch(
  scroller: React.RefObject<HTMLDivElement | null>,
  content: React.RefObject<HTMLDivElement | null>,
  teaser: React.RefObject<HTMLDivElement | null>
) {
  React.useEffect(() => {
    const el = scroller.current
    if (!el) return
    let offset = 0
    let velocity = 0
    let raf = 0

    const apply = (o: number) => {
      offset = o
      const inner = content.current
      if (inner) inner.style.transform = Math.abs(o) > 0.05 ? `translate3d(0,${o}px,0)` : ""
      const t = teaser.current
      if (t) t.style.opacity = String(0.42 + 0.4 * Math.max(0, Math.min(1, o / (LIMIT * 0.75))))
    }
    const stop = () => {
      if (raf) cancelAnimationFrame(raf)
      raf = 0
    }
    // A spring back to 0, just under critical damping: one soft settle
    const release = () => {
      stop()
      velocity = 0
      let last = performance.now()
      const step = (now: number) => {
        const dt = Math.min(0.032, (now - last) / 1000)
        last = now
        velocity += (-340 * offset - 33 * velocity) * dt
        const next = offset + velocity * dt
        if (Math.abs(next) < 0.4 && Math.abs(velocity) < 8) {
          apply(0)
          raf = 0
          return
        }
        apply(next)
        raf = requestAnimationFrame(step)
      }
      raf = requestAnimationFrame(step)
    }

    // Touch
    let lastY = 0
    let anchor: number | null = null
    const onStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return
      lastY = e.touches[0].clientY
      anchor = null
      // Caught mid-spring: carry on from where it is
      if (offset > 0.5) {
        stop()
        anchor = lastY - unstretch(offset)
      }
    }
    const onMove = (e: TouchEvent) => {
      if (e.touches.length !== 1) return
      const y = e.touches[0].clientY
      if (anchor === null && el.scrollTop <= 0 && y > lastY) anchor = lastY
      lastY = y
      if (anchor === null) return
      const drag = y - anchor
      if (drag <= 0) {
        // Back past where it started: hand the gesture to the scroller again
        anchor = null
        apply(0)
        return
      }
      if (e.cancelable) e.preventDefault()
      apply(stretch(drag))
    }
    const onEnd = () => {
      anchor = null
      if (offset !== 0 && !raf) release()
    }

    // Wheel / trackpad: pulls add up while they keep coming, and it springs back once they stop
    let pulled = 0
    let timer = 0
    let quietUntil = 0
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey) return // pinch-zoom
      const dy = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaMode === 2 ? e.deltaY * el.clientHeight : e.deltaY
      const now = performance.now()
      if (pulled === 0) {
        if (el.scrollTop > 0 || dy >= 0) return
        // The tail of a fling that already bounced: swallow it rather than bounce again
        if (now < quietUntil) {
          e.preventDefault()
          quietUntil = now + 160
          return
        }
        stop()
        pulled = offset > 0.5 ? unstretch(offset) : 0
      }
      e.preventDefault()
      pulled = Math.max(0, Math.min(600, pulled - dy))
      apply(stretch(pulled))
      window.clearTimeout(timer)
      timer = window.setTimeout(() => {
        pulled = 0
        quietUntil = performance.now() + 160
        release()
      }, pulled === 0 ? 0 : 130)
    }

    el.addEventListener("touchstart", onStart, { passive: true })
    el.addEventListener("touchmove", onMove, { passive: false })
    el.addEventListener("touchend", onEnd, { passive: true })
    el.addEventListener("touchcancel", onEnd, { passive: true })
    el.addEventListener("wheel", onWheel, { passive: false })
    return () => {
      stop()
      window.clearTimeout(timer)
      el.removeEventListener("touchstart", onStart)
      el.removeEventListener("touchmove", onMove)
      el.removeEventListener("touchend", onEnd)
      el.removeEventListener("touchcancel", onEnd)
      el.removeEventListener("wheel", onWheel)
    }
  }, [scroller, content, teaser])
}
