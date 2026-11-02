"use client"

import { AnimatePresence, motion } from "motion/react"

import { PENALTY_DIRS, PENALTY_KICKS, PENALTY_LABEL, type PenaltyDir } from "@/lib/games"
import { cn } from "@/lib/utils"
import { BallSvg } from "./game-glyph"

/*
 * Penalty Shootout visuals. Everything is laid out in percentages of the
 * pitch, so it scales from a 296px phone card up to the widest layout.
 * Directions are as the shooter sees the goal.
 */

/** Where in the goal (x, % of the pitch) each direction aims. */
const AIM_X: Record<PenaltyDir, number> = { L: 24, C: 50, R: 76 }
/** The goal mouth: from the pitch's left / right / top edges, and its height (%). */
const GOAL = { side: 11, top: 12, height: 44 }
const SPOT = { x: 50, y: 84 }
const BALL_IN_NET_Y = 33

/** The keeper's pose for a dive: where they end up and how far they lean. */
// The keeper pivots on their feet, so a full stretch reaches about a figure's
// height past where they land: landing at 33% / 67% keeps the gloves inside the posts.
const KEEPER_DIVE: Record<PenaltyDir, { left: string; rotate: number; y: string }> = {
  L: { left: "33%", rotate: -66, y: "-10%" },
  C: { left: "50%", rotate: 0, y: "-24%" },
  R: { left: "67%", rotate: 66, y: "-10%" },
}

export type KickOutcome = "goal" | "save" | "taken"

/**
 * The pitch: goal, net, keeper and ball. Tap a side of the goal to shoot
 * (`onAim`). Once `shot` is set the ball flies; with `dive` the keeper dives
 * too — `dive` "hidden" (group games) leaves them guessing until the end.
 * `kick` identifies the kick, so each one starts from the spot.
 */
export function PenaltyPitch({
  kick,
  shot,
  dive,
  outcome,
  onAim,
  disabled,
}: {
  kick: number
  shot: PenaltyDir | null
  dive: PenaltyDir | "hidden" | null
  outcome: KickOutcome | null
  onAim?: (dir: PenaltyDir) => void
  disabled?: boolean
}) {
  // The ball and keeper move together, once the keeper's side is known
  const flying = shot !== null && dive !== null
  const saved = flying && dive === shot
  const aimable = !disabled && shot === null && !!onAim
  const targetX = shot ? AIM_X[shot] : SPOT.x
  // A save knocks the ball back out; a goal ends in the net
  const ballLeft = saved
    ? [`${SPOT.x}%`, `${targetX}%`, `${targetX + (shot === "L" ? -9 : shot === "R" ? 9 : 14)}%`]
    : [`${SPOT.x}%`, `${targetX}%`]
  const ballTop = saved ? [`${SPOT.y}%`, `${BALL_IN_NET_Y + 6}%`, "62%"] : [`${SPOT.y}%`, `${BALL_IN_NET_Y}%`]

  return (
    <div
      className="relative mx-auto aspect-[4/3] w-full max-w-sm overflow-hidden rounded-lg border border-emerald-800/30 select-none"
      style={{
        backgroundColor: "#15803d",
        backgroundImage:
          "linear-gradient(to bottom, rgb(0 0 0 / 0.18), transparent 45%), repeating-linear-gradient(90deg, rgb(255 255 255 / 0.06) 0 12.5%, transparent 12.5% 25%)",
      }}
    >
      {/* Pitch markings: goal line, six-yard box, penalty spot */}
      <div className="absolute inset-x-[3%] h-[2px] bg-white/70" style={{ top: `${GOAL.top + GOAL.height}%` }} />
      <div
        className="absolute inset-x-[24%] h-[14%] border-2 border-t-0 border-white/55"
        style={{ top: `${GOAL.top + GOAL.height}%` }}
      />
      <div
        className="absolute size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/85"
        style={{ left: `${SPOT.x}%`, top: `${SPOT.y + 4}%` }}
      />

      {/* The goal: posts, crossbar, net — the net bulges when it's a goal */}
      <motion.div
        key={`net-${kick}`}
        className="absolute rounded-t-[3px] border-[5px] border-b-0 border-white shadow-[0_2px_6px_rgb(0_0_0/0.25)]"
        style={{
          left: `${GOAL.side}%`,
          right: `${GOAL.side}%`,
          top: `${GOAL.top}%`,
          height: `${GOAL.height}%`,
          backgroundColor: "rgb(255 255 255 / 0.08)",
          backgroundImage:
            "repeating-linear-gradient(0deg, rgb(255 255 255 / 0.32) 0 1px, transparent 1px 9px), repeating-linear-gradient(90deg, rgb(255 255 255 / 0.32) 0 1px, transparent 1px 9px)",
        }}
        animate={outcome === "goal" ? { scale: [1, 1.035, 1] } : { scale: 1 }}
        transition={{ duration: 0.45 }}
      >
        {/* Aim: tap a third of the goal */}
        <div className="absolute inset-0 grid grid-cols-3">
          {PENALTY_DIRS.map((d) => (
            <button
              key={d}
              type="button"
              disabled={!aimable}
              onClick={() => onAim?.(d)}
              aria-label={`Shoot ${PENALTY_LABEL[d].toLowerCase()}`}
              className={cn(
                "group/aim relative flex items-center justify-center outline-none disabled:cursor-default",
                aimable && "cursor-pointer focus-visible:bg-white/15"
              )}
            >
              {aimable && (
                <span className="flex size-9 items-center justify-center rounded-full border-2 border-dashed border-white/70 transition-all group-hover/aim:scale-110 group-hover/aim:border-white group-hover/aim:bg-white/15 group-active/aim:scale-95">
                  <span className="size-1.5 rounded-full bg-white/90" />
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Keeper */}
        <motion.div
          key={`keeper-${kick}`}
          className="pointer-events-none absolute bottom-0 w-[23%]"
          style={{ originX: 0.5, originY: 1, x: "-50%" }}
          initial={{ left: "50%", rotate: 0, y: "0%" }}
          animate={
            flying && dive !== "hidden"
              ? { left: KEEPER_DIVE[dive].left, rotate: KEEPER_DIVE[dive].rotate, y: KEEPER_DIVE[dive].y }
              : shot === null
                ? { left: ["50%", "47%", "53%", "50%"], rotate: 0, y: "0%" }
                : { left: "50%", rotate: 0, y: "0%" }
          }
          transition={
            flying && dive !== "hidden"
              ? { duration: 0.5, ease: [0.3, 0.9, 0.4, 1] }
              : shot === null
                ? { duration: 2.4, repeat: Infinity, ease: "easeInOut" }
                : { duration: 0.2 }
          }
        >
          <Keeper />
        </motion.div>
      </motion.div>

      {/* Ball */}
      <motion.div
        key={`ball-${kick}`}
        className="pointer-events-none absolute w-[9%]"
        style={{ x: "-50%", y: "-50%" }}
        initial={{ left: `${SPOT.x}%`, top: `${SPOT.y}%`, scale: 1, rotate: 0 }}
        animate={
          flying
            ? { left: ballLeft, top: ballTop, scale: saved ? [1, 0.66, 0.8] : [1, 0.62], rotate: saved ? [0, 400, 560] : [0, 540] }
            : shot !== null
              ? // Run-up while the keeper's side loads
                { left: `${SPOT.x}%`, top: `${SPOT.y}%`, scale: [1, 0.94, 1], rotate: 0 }
              : { left: `${SPOT.x}%`, top: `${SPOT.y}%`, scale: 1, rotate: 0 }
        }
        transition={
          flying
            ? { duration: saved ? 0.9 : 0.55, ease: "easeOut", times: saved ? [0, 0.55, 1] : [0, 1] }
            : shot !== null
              ? { duration: 0.5, repeat: Infinity }
              : { duration: 0.2 }
        }
      >
        <BallSvg className="size-full drop-shadow-[0_2px_2px_rgb(0_0_0/0.35)]" />
      </motion.div>

      {/* Verdict */}
      <AnimatePresence>
        {outcome && (
          <motion.div
            key={`verdict-${kick}`}
            className="pointer-events-none absolute inset-x-0 bottom-[5%] flex justify-center"
            initial={{ opacity: 0, scale: 0.6, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 420, damping: 22 }}
          >
            <span
              className={cn(
                "rounded-full px-4 py-1 text-base font-black tracking-wide text-white uppercase shadow-lg",
                outcome === "goal" ? "bg-success" : outcome === "save" ? "bg-destructive" : "bg-slate-900/75"
              )}
            >
              {outcome === "goal" ? "Goal!" : outcome === "save" ? "Saved!" : "Shot taken"}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/** The goalkeeper: yellow kit, gloves up. */
function Keeper() {
  return (
    <svg viewBox="0 0 40 46" className="w-full drop-shadow-[0_2px_2px_rgb(0_0_0/0.3)]" aria-hidden>
      {/* arms */}
      <path d="M13 17 6 7M27 17l7-10" stroke="#f59e0b" strokeWidth="4.5" strokeLinecap="round" />
      <circle cx="5.5" cy="6" r="3.6" fill="#f8fafc" stroke="#94a3b8" strokeWidth="0.8" />
      <circle cx="34.5" cy="6" r="3.6" fill="#f8fafc" stroke="#94a3b8" strokeWidth="0.8" />
      {/* legs */}
      <path d="M16 31v12M24 31v12" stroke="#1e293b" strokeWidth="4.5" strokeLinecap="round" />
      <path d="M16 39v4M24 39v4" stroke="#f8fafc" strokeWidth="4.5" strokeLinecap="round" />
      {/* body */}
      <rect x="11.5" y="14" width="17" height="18" rx="4" fill="#fbbf24" />
      <path d="M11.5 22h17" stroke="#d97706" strokeWidth="2" />
      <text x="20" y="28.5" textAnchor="middle" fontSize="6.5" fontWeight="800" fill="#92400e" fontFamily="ui-sans-serif, system-ui">
        1
      </text>
      {/* head */}
      <circle cx="20" cy="8.5" r="5.5" fill="#e0ac69" />
      <path d="M14.6 7.5a5.5 5.5 0 0 1 10.8 0c-1.8-1.2-3.6-1.6-5.4-1.6s-3.6.4-5.4 1.6z" fill="#3f2a1d" />
    </svg>
  )
}

/** The 5 kicks as balls: goal, saved, taken (result at the end), or still to come. */
export function KickTally({ outcomes, current }: { outcomes: (KickOutcome | null)[]; current?: number }) {
  return (
    <div className="flex items-center justify-center gap-2" aria-label="Kicks">
      {Array.from({ length: PENALTY_KICKS }, (_, i) => {
        const o = outcomes[i] ?? null
        return (
          <span
            key={i}
            className={cn(
              "relative flex size-7 items-center justify-center rounded-full border-2 transition-all duration-300",
              o === "goal"
                ? "border-success bg-success/15"
                : o === "save"
                  ? "border-destructive bg-destructive/10"
                  : o === "taken"
                    ? "border-primary bg-primary/10"
                    : i === current
                      ? "scale-110 border-primary"
                      : "border-dashed border-muted-foreground/40"
            )}
            aria-label={`Kick ${i + 1}: ${o === "goal" ? "goal" : o === "save" ? "saved" : o === "taken" ? "taken" : "to come"}`}
          >
            {o ? (
              <BallSvg className={cn("text-lg", o === "save" && "opacity-45")} />
            ) : (
              <span className="text-[10px] font-semibold text-muted-foreground tabular-nums">{i + 1}</span>
            )}
            {o === "save" && <span className="absolute h-[2px] w-[130%] rotate-45 rounded-full bg-destructive" aria-hidden />}
          </span>
        )
      })}
    </div>
  )
}

/**
 * One kick at a glance: a little goal with the ball where it went and the
 * keeper where they dived (no keeper: their dive isn't known).
 */
export function KickSummary({ shot, dive, label }: { shot: PenaltyDir; dive: PenaltyDir | null; label?: string }) {
  const goal = dive !== null && dive !== shot
  const col = (d: PenaltyDir) => 4 + PENALTY_DIRS.indexOf(d) * 9.33 + 4.67
  return (
    <div className="flex flex-col items-center gap-1">
      <svg viewBox="0 0 36 24" className="w-12" aria-hidden>
        <rect x="0" y="0" width="36" height="24" rx="3" className="fill-emerald-600/15" />
        <path d="M4 22V4h28v18" fill="none" className="stroke-muted-foreground/60" strokeWidth="1.6" strokeLinejoin="round" />
        {dive && <rect x={col(dive) - 3} y="11" width="6" height="11" rx="2" fill="#fbbf24" />}
        <circle
          cx={col(shot) + (dive === shot ? 2.5 : 0)}
          cy={goal ? 9 : dive === shot ? 12 : 13}
          r="2.6"
          className={goal ? "fill-success" : dive === shot ? "fill-destructive" : "fill-primary"}
        />
      </svg>
      {label !== undefined && (
        <span
          className={cn(
            "text-[10px] font-semibold uppercase",
            dive === null ? "text-muted-foreground" : goal ? "text-success" : "text-destructive"
          )}
        >
          {label}
        </span>
      )}
    </div>
  )
}

/** A tiny goal with one third filled: a direction at a glance. */
function MiniGoal({ dir, active }: { dir: PenaltyDir; active: boolean }) {
  const i = PENALTY_DIRS.indexOf(dir)
  return (
    <svg viewBox="0 0 30 16" className="hidden h-3.5 w-6.5 shrink-0 min-[400px]:block" aria-hidden>
      <rect x={1 + i * 9.33} y="2" width="9.33" height="13" className={active ? "fill-primary/70" : "fill-muted-foreground/25"} />
      <path d="M1.5 15V1.5h27V15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  )
}

/** Host setup: where the keeper dives for each of the 5 kicks. `value` has one slot per kick. */
export function PenaltyDivePicker({
  value,
  onChange,
  disabled,
}: {
  value: (PenaltyDir | null)[]
  onChange: (next: (PenaltyDir | null)[]) => void
  disabled?: boolean
}) {
  return (
    <div className="flex flex-col gap-2.5">
      {Array.from({ length: PENALTY_KICKS }, (_, kick) => (
        <div key={kick} className="flex items-center gap-3">
          <span className="w-12 shrink-0 text-xs font-medium text-muted-foreground">Kick {kick + 1}</span>
          <div className="grid flex-1 grid-cols-3 gap-2" role="radiogroup" aria-label={`Kick ${kick + 1}`}>
            {PENALTY_DIRS.map((dir) => {
              const selected = value[kick] === dir
              return (
                <button
                  key={dir}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  disabled={disabled}
                  onClick={() => onChange(value.map((v, i) => (i === kick ? dir : v)))}
                  className={cn(
                    "flex h-10 items-center justify-center gap-1.5 rounded-md border bg-card text-xs font-medium transition-colors active:scale-95 disabled:opacity-50",
                    selected ? "border-primary bg-primary/10 text-primary ring-1 ring-primary" : "hover:bg-muted/60"
                  )}
                >
                  <MiniGoal dir={dir} active={selected} />
                  {PENALTY_LABEL[dir]}
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

export const emptyDives = (): (PenaltyDir | null)[] => Array.from({ length: PENALTY_KICKS }, () => null)
export const isDivesComplete = (dives: (PenaltyDir | null)[]): dives is PenaltyDir[] => dives.every((d) => d !== null)
