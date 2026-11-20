"use client"

import * as React from "react"
import { createPortal } from "react-dom"
import { Nunito } from "next/font/google"
import { Cancel01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { CoinIcon } from "@/components/fun/coin"
import { FramedAvatar } from "@/components/fun/framed-avatar"
import { CharacterTile, TierChip } from "@/components/game-avatar/character-tile"
import { LevelBadge } from "@/components/game-avatar/level-badge"
import { RewardThumb } from "@/components/game-avatar/level-road"
import { rewardId, rewardName, rewardsOf, unclaimed, type Reward } from "@/components/game-avatar/ownership"
import { useSession } from "@/components/providers/session-provider"
import { announceReward, gameToast } from "@/components/rewards/reward-notice"
import { Spinner } from "@/components/ui/spinner"
import { useWallet } from "@/hooks/use-fun"
import { useClaimReward } from "@/hooks/use-fun-mutations"
import { getErrorMessage } from "@/lib/errors"
import type { Achievement, LiveOutcome } from "@/lib/live/achievements"
import { levelAchievement, levelInfo, levelKey, levelsGained, levelTitle } from "@/lib/live/levels"
import type { LiveGameId, RoomMeta } from "@/lib/live/types"
import type { Wallet } from "@/lib/types"
import { cn } from "@/lib/utils"
import { countLiveResult, type LiveCounted } from "@/services/game-profile"
import { get } from "firebase/database"
import { roomRef } from "@/services/live-rooms"

// Chunky rounded lettering, like the result card's
const rounded = Nunito({ subsets: ["latin"], weight: ["800", "900"], display: "swap" })

/** A result this old is never counted (a room reopened from the list later). */
const COUNT_WITHIN_MS = 10 * 60_000
/** Let the result's own entrance play first. */
const POPUP_DELAY_MS = 1800

/** One count per game and person, shared by every mount (React may mount twice in development). */
const counting = new Map<string, Promise<LiveCounted | null>>()

/** One card of the end-of-game popup: a level reached, or one reward to take. */
export type RewardStep = { kind: "levelup"; level: number; rewards: Reward[] } | { kind: "reward"; reward: Reward }

/** The XP a game brought: where the bar was and where it is now. */
export interface XpGain {
  gained: number
  from: { level: number; progress: number; into: number; need: number; max: boolean }
  to: { level: number; progress: number; into: number; need: number; max: boolean }
}

/**
 * What a counted game brings, in order: the XP, then each level reached
 * (followed by its rewards), then the achievements' rewards — only what you
 * don't have yet.
 */
export function rewardSteps(before: Wallet, after: Wallet, reached: Achievement[]): { xp: XpGain; steps: RewardStep[] } {
  const a = levelInfo(before)
  const b = levelInfo(after)
  const steps: RewardStep[] = []
  for (const level of levelsGained(before, after)) {
    const rewards = unclaimed(rewardsOf(levelAchievement(levelKey(level))!), after)
    steps.push({ kind: "levelup", level, rewards })
    for (const reward of rewards) steps.push({ kind: "reward", reward })
  }
  for (const r of reached.flatMap((x) => unclaimed(rewardsOf(x), after))) steps.push({ kind: "reward", reward: r })
  return {
    xp: {
      gained: b.xp - a.xp,
      from: { level: a.level, progress: a.progress, into: a.into, need: a.need, max: a.max },
      to: { level: b.level, progress: b.progress, into: b.into, need: b.need, max: b.max },
    },
    steps,
  }
}

/**
 * At the end of a live game you played: counts it on your wallet (once — see
 * countLiveResult), shows the XP it brought filling your level bar and, when
 * that reaches a level or an achievement, pops up what it gives over the
 * result screen, like a real game: LEVEL UP, then each reward with Claim or
 * Equip — one at a time. Never a notification; a result opened again later
 * counts nothing and shows nothing. Rewards you close stay claimable in the
 * Inventory.
 */
export function GameRewards({ code, game, outcome }: { code: string; game: LiveGameId; outcome: LiveOutcome | null }) {
  const { user } = useSession()
  const uid = user?.uid
  const [shown, setShown] = React.useState<{ xp: XpGain; steps: RewardStep[] } | null>(null)

  React.useEffect(() => {
    if (!uid || !outcome) return
    let live = true
    let timer = 0
    const key = `${uid}:${code}`
    if (!counting.has(key))
      counting.set(
        key,
        get(roomRef(code, "meta")).then((snap) => {
          const meta = snap.val() as RoomMeta | null
          if (!meta?.startedAt || !meta.endedAt || Date.now() - meta.endedAt > COUNT_WITHIN_MS) return null
          return countLiveResult(uid, { code, startedAt: meta.startedAt, game, outcome })
        })
      )
    counting
      .get(key)!
      .then((counted) => {
        if (!live || !counted) return
        const next = rewardSteps(counted.before, counted.wallet, counted.reached)
        timer = window.setTimeout(() => setShown(next), POPUP_DELAY_MS)
      })
      .catch(() => undefined)
    return () => {
      live = false
      window.clearTimeout(timer)
    }
  }, [uid, code, game, outcome])

  if (!user || !shown) return null
  return <RewardFlow xp={shown.xp} steps={shown.steps} user={user} onDone={() => setShown(null)} />
}

/** The XP first, then the popup wired to your wallet: Claim takes it, Equip takes it and puts it on. */
function RewardFlow({
  xp,
  steps,
  user,
  onDone,
}: {
  xp: XpGain
  steps: RewardStep[]
  user: { displayName: string; photoURL?: string }
  onDone: () => void
}) {
  const wallet = useWallet()
  const claim = useClaimReward()
  const [popup, setPopup] = React.useState(false)
  if (!popup) return <XpToast xp={xp} onDone={() => (steps.length ? setPopup(true) : onDone())} />
  return (
    <RewardPopup
      steps={steps}
      user={user}
      onClose={onDone}
      onClaim={(r, equip) =>
        claim.mutateAsync({
          achievement: r.achievement.id,
          kind: r.kind,
          id: rewardId(r),
          equip,
          owned: r.kind === "character" ? wallet?.avatars : wallet?.frames,
        })
      }
    />
  )
}

const fmt = new Intl.NumberFormat("en-IN")

/**
 * "+40 XP": a card dropping in at the top of the result, the bar filling to
 * where the game took you — on a level-up it fills up, the crest flips to the
 * new level and the bar starts again. Goes by itself (or on a tap).
 */
export function XpToast({ xp, onDone }: { xp: XpGain; onDone: () => void }) {
  const up = xp.to.level > xp.from.level
  // 0 in · 1 "+XP" and the fill · 2 the new level (level-up only) · 3 out
  const [stage, setStage] = React.useState(0)
  const done = React.useRef(onDone)
  React.useEffect(() => {
    done.current = onDone
  })
  React.useEffect(() => {
    const marks = up ? [350, 1400, 3300, 3650] : [350, 2500, 2500, 2850]
    const ids = marks.map((t, i) => window.setTimeout(() => (i === 3 ? done.current() : setStage(i + 1)), t))
    return () => ids.forEach(window.clearTimeout)
  }, [up])

  const level = stage >= 2 && up ? xp.to.level : xp.from.level
  const fill = stage === 0 ? xp.from.progress : up ? (stage >= 2 ? xp.to.progress : 1) : xp.to.progress
  // The numbers follow the bar: the old level until the flip
  const nums = stage === 0 || (up && stage < 2) ? xp.from : xp.to
  return createPortal(
    <div className={cn("rw-xp-wrap", rounded.className)} data-out={stage >= 3 || undefined}>
      <RewardStyles />
      <button
        type="button"
        className="rw-xp"
        onClick={() => done.current()}
        aria-label={`Plus ${xp.gained} XP${up ? `, level ${xp.to.level}` : ""}`}
      >
        <span className="rw-xp-badge" key={level} data-pop={stage >= 2 && up ? true : undefined}>
          <LevelBadge level={level} size={40} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline justify-between gap-2">
            <span className="rw-xp-lv">{stage >= 2 && up ? "Level up!" : `Level ${level}`}</span>
            {stage >= 1 && <span className="rw-xp-plus">+{fmt.format(xp.gained)} XP</span>}
          </span>
          <span className="rw-xp-bar" key={stage >= 2 && up ? "next" : "this"}>
            <BarFill value={fill} from={stage >= 2 && up ? 0 : undefined} />
          </span>
          <span className="rw-xp-num">
            {nums.max ? "Max level" : `${fmt.format(up && stage === 1 ? nums.need : nums.into)} / ${fmt.format(nums.need)} XP`}
          </span>
        </span>
      </button>
    </div>,
    document.body
  )
}

/** The bar's gold fill, animating to `value` (from `from` when it mounts). */
function BarFill({ value, from }: { value: number; from?: number }) {
  const [w, setW] = React.useState(from ?? value)
  React.useEffect(() => {
    const id = window.requestAnimationFrame(() => setW(value))
    return () => window.cancelAnimationFrame(id)
  }, [value])
  return <span className="rw-xp-fill" style={{ width: `${Math.max(0, Math.min(1, w)) * 100}%` }} />
}

/**
 * The popup, one card at a time: "LEVEL UP! Level 8" with what it unlocks,
 * then each reward ("Win streak ×3! You unlocked Zenko") on a burst of light
 * — the character playing its entrance, a frame on your photo, a pile of
 * coins — with Claim and Equip. Closing keeps the rest for the Inventory.
 */
export function RewardPopup({
  steps,
  user,
  onClaim,
  onClose,
}: {
  steps: RewardStep[]
  user: { displayName: string; photoURL?: string }
  onClaim: (reward: Reward, equip: boolean) => Promise<unknown>
  onClose: () => void
}) {
  const [i, setI] = React.useState(0)
  const [busy, setBusy] = React.useState<"claim" | "equip" | null>(null)
  const step = steps[i]

  // Escape closes, like any dialog
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose()
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])

  if (!step) return null
  const next = () => (i + 1 < steps.length ? setI(i + 1) : onClose())

  // The card already shows it big: coins fly from the button into the counter, an item gets a game toast
  const act = async (r: Reward, equip: boolean, from: HTMLElement) => {
    setBusy(equip ? "equip" : "claim")
    try {
      await onClaim(r, equip)
      announceReward(r, { from: from.getBoundingClientRect(), equip, quiet: true })
      next()
    } catch (e) {
      gameToast({ title: "Couldn't claim it", description: getErrorMessage(e, "Try again from your Inventory") })
    } finally {
      setBusy(null)
    }
  }

  const r = step.kind === "reward" ? step.reward : null
  const fromLevel = r?.achievement.stat === "level"
  return createPortal(
    <div className={cn("rw-root", rounded.className)} role="dialog" aria-modal="true" aria-labelledby="rw-title">
      <RewardStyles />
      <div className="rw-card" key={i} data-levelup={step.kind === "levelup" || undefined}>
        <button type="button" className="rw-close" onClick={onClose} aria-label="Later — it waits in your Inventory">
          <HugeiconsIcon icon={Cancel01Icon} className="size-4" />
        </button>

        {step.kind === "levelup" ? (
          <>
            <p className="rw-kicker">{levelTitle(step.level) !== levelTitle(step.level - 1) ? "New title" : "Level reached"}</p>
            <h2 id="rw-title" className="rw-title rw-title-big">
              LEVEL UP!
            </h2>
            <div className="rw-stage">
              <span className="rw-rays" />
              <span className="rw-glow" />
              {Array.from({ length: 8 }, (_, k) => (
                <span key={k} className="rw-spark" style={{ "--k": k } as React.CSSProperties} />
              ))}
              <span className="rw-item rw-crest">
                <LevelBadge level={step.level} size={112} />
              </span>
            </div>
            <p className="rw-line">
              You&apos;re <strong>Level {step.level}</strong> · {levelTitle(step.level)}
            </p>
            {step.rewards.length > 0 ? (
              <div className="rw-loot" aria-label="Unlocked at this level">
                {step.rewards.map((x) => (
                  <span key={rewardId(x)} className="rw-loot-item" title={rewardName(x)}>
                    <RewardThumb reward={x} user={user} />
                  </span>
                ))}
              </div>
            ) : (
              <p className="rw-sub">Keep playing — more rewards are on the road</p>
            )}
            <div className="rw-btns rw-btns-one">
              <button type="button" className="rw-btn rw-btn-gold" onClick={next}>
                {step.rewards.length ? `Collect ${step.rewards.length === 1 ? "reward" : `${step.rewards.length} rewards`}` : "Awesome!"}
              </button>
            </div>
          </>
        ) : (
          r && (
            <>
              <p className="rw-kicker">{fromLevel ? `Level ${r.achievement.goal} reward` : "Reward unlocked"}</p>
              <h2 id="rw-title" className="rw-title">
                {r.achievement.title}
              </h2>

              <div className="rw-stage">
                <span className="rw-rays" />
                <span
                  className="rw-glow"
                  style={r.kind === "character" ? ({ "--rw-accent": r.def.accent } as React.CSSProperties) : undefined}
                />
                {Array.from({ length: 8 }, (_, k) => (
                  <span key={k} className="rw-spark" style={{ "--k": k } as React.CSSProperties} />
                ))}
                <span className="rw-item">
                  {r.kind === "character" ? (
                    <Entrance def={r.def} />
                  ) : r.kind === "frame" ? (
                    <FramedAvatar src={user.photoURL} name={user.displayName} frame={r.frame} size={104} />
                  ) : (
                    <CoinPile />
                  )}
                </span>
              </div>

              <p className="rw-line">
                {r.kind === "coins" ? "You won " : "You unlocked "}
                <strong>{rewardName(r)}</strong>
              </p>
              {r.kind === "character" ? (
                <p className="rw-sub">
                  <TierChip def={r.def} /> <span>{r.def.tagline}</span>
                </p>
              ) : r.kind === "frame" ? (
                <p className="rw-sub">A frame for your photo and your game profile</p>
              ) : (
                <p className="rw-sub">Spend them on characters, frames and boards</p>
              )}

              <div className={cn("rw-btns", r.kind === "coins" && "rw-btns-one")}>
                {r.kind === "coins" ? (
                  <button type="button" className="rw-btn rw-btn-gold" disabled={!!busy} onClick={(e) => act(r, false, e.currentTarget)}>
                    {busy ? <Spinner className="size-5" /> : `Claim +${fmt.format(r.coins)}`}
                  </button>
                ) : (
                  <>
                    <button type="button" className="rw-btn rw-btn-glass" disabled={!!busy} onClick={(e) => act(r, false, e.currentTarget)}>
                      {busy === "claim" ? <Spinner className="size-5" /> : "Claim"}
                    </button>
                    <button type="button" className="rw-btn rw-btn-gold" disabled={!!busy} onClick={(e) => act(r, true, e.currentTarget)}>
                      {busy === "equip" ? <Spinner className="size-5" /> : "Equip"}
                    </button>
                  </>
                )}
              </div>
            </>
          )
        )}
        {steps.length > 1 && (
          <div className="rw-dots" aria-label={`${i + 1} of ${steps.length}`}>
            {steps.map((x, k) => (
              <span key={k} data-on={k === i || undefined} data-up={x.kind === "levelup" || undefined} />
            ))}
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}

/** The character playing its entrance once, then a gentle loop. */
function Entrance({ def }: { def: Extract<Reward, { kind: "character" }>["def"] }) {
  const [mode, setMode] = React.useState<"intro" | "idle">("intro")
  React.useEffect(() => {
    const t = window.setTimeout(() => setMode("idle"), 2600)
    return () => window.clearTimeout(t)
  }, [])
  return <CharacterTile def={def} size={148} mode={mode} shape="card" className="rw-tile" />
}

/** A little heap of coins: one big, two tucked behind. */
function CoinPile() {
  return (
    <span className="rw-coins" aria-hidden>
      <CoinIcon className="rw-coin rw-coin-l size-[50px]" />
      <CoinIcon className="rw-coin rw-coin-r size-[56px]" />
      <CoinIcon className="rw-coin rw-coin-big size-[92px]" />
    </span>
  )
}

function RewardStyles() {
  return <style href="joysplit-reward-popup" precedence="default">{CSS}</style>
}

const CSS = `
.rw-root{position:fixed;inset:0;z-index:80;display:flex;align-items:center;justify-content:center;padding:16px;
  background:radial-gradient(120% 90% at 50% 40%,rgba(52,22,110,.82),rgba(6,4,20,.92));backdrop-filter:blur(6px);
  animation:rw-fade .3s ease-out both}
.rw-card{position:relative;width:min(100%,360px);max-height:100%;overflow-x:hidden;overflow-y:auto;border-radius:28px;padding:22px 18px 18px;text-align:center;color:#fff;
  background:linear-gradient(180deg,#3b1d8f 0%,#24125f 55%,#170b3f 100%);
  box-shadow:0 0 0 2px rgba(255,214,102,.75),0 0 0 6px rgba(255,214,102,.14),0 24px 60px rgba(0,0,0,.55),inset 0 1px 0 rgba(255,255,255,.25);
  animation:rw-pop .55s cubic-bezier(.2,1.4,.4,1) both}
.rw-card[data-levelup]{background:linear-gradient(180deg,#5a1fa8 0%,#2f1380 50%,#160a44 100%)}
.rw-close{position:absolute;top:10px;right:10px;display:flex;width:32px;height:32px;align-items:center;justify-content:center;border-radius:999px;
  color:rgba(255,255,255,.8);background:rgba(255,255,255,.1)}
.rw-close:hover{background:rgba(255,255,255,.18)}
.rw-kicker{display:inline-block;margin:0 auto;padding:3px 12px;border-radius:999px;font-size:11px;font-weight:900;letter-spacing:.14em;text-transform:uppercase;
  color:#4a2a00;background:linear-gradient(180deg,#ffe58a,#ffbf2f);box-shadow:0 2px 0 #b9660a}
.rw-title{margin:10px 0 0;font-size:clamp(26px,8vw,34px);font-weight:900;line-height:1.05;letter-spacing:-.01em;
  background:linear-gradient(180deg,#fffbe2 0%,#ffeb7a 35%,#ffc82a 65%,#ec9a12 100%);-webkit-background-clip:text;background-clip:text;color:transparent;
  filter:drop-shadow(0 3px 0 rgba(120,40,0,.55))}
.rw-title-big{font-size:clamp(32px,11vw,44px);letter-spacing:.01em;animation:rw-slam .6s .1s cubic-bezier(.2,1.6,.4,1) both}
.rw-stage{position:relative;display:flex;align-items:center;justify-content:center;height:clamp(150px,28svh,210px);margin:8px 0 4px}
.rw-rays{position:absolute;width:300px;height:300px;border-radius:50%;
  background:repeating-conic-gradient(from 0deg,rgba(255,226,120,.28) 0deg 10deg,transparent 10deg 24deg);
  -webkit-mask:radial-gradient(circle,#000 18%,transparent 66%);mask:radial-gradient(circle,#000 18%,transparent 66%);
  animation:rw-spin 14s linear infinite}
.rw-glow{position:absolute;width:190px;height:190px;border-radius:50%;background:radial-gradient(circle,var(--rw-accent,#ffd36a) 0%,transparent 68%);opacity:.55;
  animation:rw-pulse 2.4s ease-in-out infinite}
.rw-item{position:relative;display:flex;animation:rw-rise .7s .15s cubic-bezier(.2,1.5,.4,1) both}
.rw-crest{animation:rw-crest .9s .2s cubic-bezier(.2,1.4,.4,1) both;filter:drop-shadow(0 10px 18px rgba(0,0,0,.45))}
.rw-tile{box-shadow:0 10px 28px rgba(0,0,0,.45),0 0 0 3px rgba(255,255,255,.85)}
.rw-spark{position:absolute;left:50%;top:50%;width:8px;height:8px;margin:-4px;border-radius:2px;background:#fff3b0;transform:rotate(45deg);
  box-shadow:0 0 10px #ffd36a;animation:rw-spark 2.2s calc(var(--k)*.27s) ease-out infinite;opacity:0}
.rw-line{margin:6px 0 0;font-size:17px;font-weight:800;color:rgba(255,255,255,.92)}
.rw-line strong{color:#ffe27a;font-weight:900}
.rw-sub{display:flex;align-items:center;justify-content:center;gap:6px;flex-wrap:wrap;margin:6px 0 0;font-size:13px;font-weight:700;color:rgba(214,205,255,.85)}
.rw-loot{display:flex;justify-content:center;gap:8px;margin-top:10px}
.rw-loot-item{display:flex;width:44px;height:44px;align-items:center;justify-content:center;border-radius:14px;background:rgba(255,255,255,.12);
  box-shadow:inset 0 0 0 1.5px rgba(255,226,120,.55);animation:rw-rise .5s cubic-bezier(.2,1.5,.4,1) both}
.rw-loot-item:nth-child(2){animation-delay:.1s}.rw-loot-item:nth-child(3){animation-delay:.2s}
.rw-coins{position:relative;display:block;width:120px;height:110px}
.rw-coin{position:absolute;filter:drop-shadow(0 6px 10px rgba(0,0,0,.4))}
.rw-coin-big{left:14px;top:14px;animation:rw-flip 2.8s .8s ease-in-out infinite}
.rw-coin-l{left:-6px;top:54px;transform:rotate(-18deg)}
.rw-coin-r{right:-8px;top:0;transform:rotate(16deg)}
.rw-btns{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:18px}
.rw-btns-one{grid-template-columns:1fr}
.rw-btn{display:flex;height:50px;align-items:center;justify-content:center;gap:8px;border-radius:16px;font-size:18px;font-weight:900;letter-spacing:.01em;
  transition:transform .12s,filter .12s}
.rw-btn:active:not(:disabled){transform:translateY(2px)}
.rw-btn:disabled{filter:saturate(.6) brightness(.9)}
.rw-btn-glass{color:#fff;background:rgba(255,255,255,.12);box-shadow:inset 0 0 0 2px rgba(255,255,255,.28),0 3px 0 rgba(0,0,0,.3)}
.rw-btn-gold{color:#5a2c00;background:linear-gradient(180deg,#fff0a0 0%,#ffd23f 45%,#f5a516 100%);box-shadow:0 4px 0 #b9660a,0 8px 18px rgba(255,180,40,.35),inset 0 1px 0 #fffbe2}
.rw-dots{display:flex;justify-content:center;gap:6px;margin-top:14px}
.rw-dots span{width:7px;height:7px;border-radius:99px;background:rgba(255,255,255,.3);transition:width .2s}
.rw-dots span[data-up]{background:rgba(255,226,120,.5)}
.rw-dots span[data-on]{width:18px;background:#ffd23f}

.rw-xp-wrap{position:fixed;left:0;right:0;top:calc(env(safe-area-inset-top,0px) + 10px);z-index:80;display:flex;justify-content:center;padding:0 16px;pointer-events:none;
  animation:rw-drop .45s cubic-bezier(.2,1.3,.4,1) both}
.rw-xp-wrap[data-out]{animation:rw-lift .3s ease-in both}
.rw-xp{pointer-events:auto;display:flex;width:min(100%,340px);align-items:center;gap:10px;padding:8px 14px 8px 10px;border-radius:20px;text-align:left;color:#fff;
  background:linear-gradient(180deg,rgba(66,30,150,.94),rgba(30,14,84,.94));backdrop-filter:blur(8px);
  box-shadow:0 0 0 1.5px rgba(255,214,102,.7),0 12px 30px rgba(0,0,0,.45),inset 0 1px 0 rgba(255,255,255,.2)}
.rw-xp-badge{display:flex;flex-shrink:0}
.rw-xp-badge[data-pop]{animation:rw-crest .7s cubic-bezier(.2,1.5,.4,1) both}
.rw-xp-lv{font-size:14px;font-weight:900;letter-spacing:.01em}
.rw-xp-plus{font-size:17px;font-weight:900;color:#ffe27a;text-shadow:0 2px 0 rgba(120,40,0,.6);animation:rw-plus .5s cubic-bezier(.2,1.6,.4,1) both}
.rw-xp-bar{position:relative;display:block;height:9px;margin-top:5px;overflow:hidden;border-radius:99px;background:rgba(255,255,255,.16);box-shadow:inset 0 1px 2px rgba(0,0,0,.35)}
.rw-xp-fill{position:absolute;inset:0 auto 0 0;border-radius:99px;background:linear-gradient(180deg,#fff0a0,#ffc82a 55%,#f08c0c);
  box-shadow:0 0 10px rgba(255,200,60,.8),inset 0 1px 0 rgba(255,255,255,.7);transition:width .9s cubic-bezier(.3,.8,.3,1)}
.rw-xp-num{display:block;margin-top:3px;font-size:11px;font-weight:800;color:rgba(214,205,255,.85);font-variant-numeric:tabular-nums}
@keyframes rw-fade{from{opacity:0}}
@keyframes rw-pop{from{opacity:0;transform:scale(.7) translateY(20px)}}
@keyframes rw-rise{from{opacity:0;transform:scale(.4) translateY(30px)}}
@keyframes rw-slam{0%{opacity:0;transform:scale(2.2)}60%{opacity:1;transform:scale(.92)}100%{transform:none}}
@keyframes rw-crest{0%{opacity:0;transform:scale(.2) rotate(-160deg)}70%{opacity:1;transform:scale(1.12) rotate(6deg)}100%{transform:none}}
@keyframes rw-flip{0%,60%,100%{transform:none}75%{transform:scaleX(.15)}90%{transform:scaleX(1)}}
@keyframes rw-drop{from{opacity:0;transform:translateY(-120%)}}
@keyframes rw-lift{to{opacity:0;transform:translateY(-120%)}}
@keyframes rw-plus{from{opacity:0;transform:scale(.3) translateY(6px)}}
@keyframes rw-spin{to{transform:rotate(360deg)}}
@keyframes rw-pulse{50%{transform:scale(1.12);opacity:.75}}
@keyframes rw-spark{0%{opacity:0;transform:rotate(calc(var(--k)*45deg)) translateY(-40px) rotate(45deg) scale(.4)}
  25%{opacity:1}100%{opacity:0;transform:rotate(calc(var(--k)*45deg + 20deg)) translateY(-118px) rotate(45deg) scale(1)}}
@media (prefers-reduced-motion:reduce){.rw-root,.rw-card,.rw-item,.rw-crest,.rw-title-big,.rw-loot-item,.rw-coin-big,.rw-xp-wrap,.rw-xp-badge,.rw-xp-plus{animation:none}
  .rw-xp-wrap[data-out]{animation:none;opacity:0}.rw-rays,.rw-glow,.rw-spark{animation:none}.rw-spark{display:none}.rw-xp-fill{transition:none}}
`
