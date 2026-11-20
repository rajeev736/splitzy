"use client"

import * as React from "react"
import { usePathname, useRouter } from "next/navigation"
import { driver, type Driver, type DriveStep, type Side } from "driver.js"
import "driver.js/dist/driver.css"

import { isGameTabPage } from "@/components/game-nav/game-bottom-nav"
import { GAME_ROUTES } from "@/components/game-nav/items"
import { useSession } from "@/components/providers/session-provider"
import { flyCoins } from "@/components/rewards/coin-burst"
import { dismissRewardPopup, gameToast, rewardPopup, whenRewardPopupsClear } from "@/components/rewards/reward-notice"
import { playCoinTing } from "@/components/rewards/ui-sounds"
import { useWallet } from "@/hooks/use-fun"
import { FRAMES, STARTING_COINS, WELCOME_FRAME } from "@/lib/fun/catalog"
import { getErrorMessage } from "@/lib/errors"
import { claimWelcomeCoins, claimWelcomeFrame } from "@/services/fun"
import { addSkipButton, blurActive, markFinder, markTourDone, tourDone, tourRunning, visibleMark } from "./tour-kit"

/**
 * The Games side's first moment, the first time it's opened (any of its four
 * tab pages; the tour itself is the hub's):
 *
 *  1. the welcome gift — 10,000 coins on a game-style reward panel with a
 *     Claim button; claiming flies the coins from the button into the coin
 *     counter;
 *  2. the free welcome frame, claimed right after and shown on the game's
 *     "Unlocked!" popup;
 *  3. then a short tour of the Games hub in the game's own look.
 *
 * Each happens once: the gifts by the wallet's `welcomed` / `welcomeFrame`
 * flags (so a reload or another device never repeats them, and the rules'
 * welcomeOk still checks every claim), the tour by a per-user mark on this
 * device. Nothing here shows on the Split side: leaving Games takes an open
 * gift panel or tour away, and it comes back next time.
 */
export function GamesWelcome() {
  const { user, authState } = useSession()
  const wallet = useWallet()
  const pathname = usePathname()
  const router = useRouter()
  const uid = user?.uid
  const onGames = isGameTabPage(pathname)
  const onHub = pathname === GAME_ROUTES.hub

  const [stage, setStage] = React.useState<"idle" | "reward" | "tour">("idle")
  // Left Games (or the hub, for the tour) part-way: stand down; it comes back next time
  if ((stage === "reward" && !onGames) || (stage === "tour" && !onHub)) setStage("idle")

  /** Claimed in this session: the wallet snapshot can lag a moment behind the claim. */
  const claimed = React.useRef({ coins: false, frame: false })
  /** What the reward stage has to hand out, fixed when it starts. */
  const plan = React.useRef({ coins: false, frame: false })

  // What's still owed, a moment after landing on Games
  React.useEffect(() => {
    if (stage !== "idle" || !uid || authState !== "authenticatedProfileComplete" || wallet === undefined || !onGames) return
    const needsCoins = !wallet?.welcomed && !claimed.current.coins
    const needsFrame = !wallet?.welcomeFrame && !wallet?.frames.includes(WELCOME_FRAME) && !claimed.current.frame
    const tourDue = onHub && !tourDone("games", uid)
    if (!needsCoins && !needsFrame && !tourDue) return
    const t = window.setTimeout(() => {
      if (tourRunning()) return
      plan.current = { coins: needsCoins, frame: needsFrame }
      setStage(needsCoins || needsFrame ? "reward" : "tour")
    }, 700)
    return () => window.clearTimeout(t)
  }, [stage, uid, authState, wallet, onGames, onHub])

  // 1 + 2: the welcome gifts
  React.useEffect(() => {
    if (stage !== "reward" || !uid) return
    let live = true
    /** The popup on screen, and how to give up waiting on the coins panel — for leaving part-way. */
    const open: { popup: number | null; cancel: (() => void) | null } = { popup: null, cancel: null }
    const { coins, frame } = plan.current

    /** The coins panel; resolves true once claimed and landed, false if it was taken away. */
    const claimCoins = () =>
      new Promise<boolean>((resolve) => {
        let flight: Promise<void> = Promise.resolve()
        open.cancel = () => resolve(false)
        open.popup = rewardPopup({
          kicker: "Welcome!",
          title: `${STARTING_COINS.toLocaleString("en-IN")} coins`,
          line: "A welcome gift, on us — play with friends, unlock frames, characters and boards.",
          art: { coins: true },
          okLabel: "Claim",
          dismissible: false,
          claim: async (from) => {
            try {
              await claimWelcomeCoins(uid)
            } catch (e) {
              gameToast({ title: "Couldn't claim your coins", description: getErrorMessage(e) })
              throw e
            }
            claimed.current.coins = true
            // From the Claim button into the counter, with the tings
            flight = flyCoins({ from, amount: STARTING_COINS })
          },
          onOk: () => {
            open.popup = null
            open.cancel = null
            void flight.then(() => resolve(true))
          },
        })
      })

    const run = async () => {
      if (coins && !(await claimCoins())) return
      if (!live) return
      if (frame) {
        try {
          await claimWelcomeFrame(uid)
          claimed.current.frame = true
          if (!live) return
          // The game's "Unlocked!" moment (as announceUnlock draws it), kept so it can be taken away
          playCoinTing(4)
          open.popup = rewardPopup({
            kicker: "Unlocked!",
            title: `${FRAMES[WELCOME_FRAME].name} frame`,
            art: { frame: WELCOME_FRAME },
            line: "A free welcome frame — it's on your photo now",
            okLabel: "Awesome!",
            onOk: () => {
              open.popup = null
            },
          })
        } catch (e) {
          gameToast({ title: "Couldn't claim your frame", description: getErrorMessage(e) })
        }
      }
      await whenRewardPopupsClear()
      if (live) setStage("idle")
    }
    void run()

    return () => {
      live = false
      if (open.popup !== null) dismissRewardPopup(open.popup)
      open.cancel?.()
    }
  }, [stage, uid])

  // 3: the Games tour, once nothing else is on screen
  React.useEffect(() => {
    if (stage !== "tour" || !uid) return
    let live = true
    let d: Driver | null = null
    const finish = () => {
      markTourDone("games", uid)
      if (live) setStage("idle")
    }
    const start = async () => {
      await whenRewardPopupsClear()
      // The tour points at For fun's games: open that tab if Discounted is showing
      if (live && !visibleMark("pick-game")) {
        router.replace(`${GAME_ROUTES.hub}?tab=fun`, { scroll: false })
        for (let i = 0; i < 15 && live && !visibleMark("pick-game"); i++) await new Promise((r) => window.setTimeout(r, 100))
      }
      if (!live || tourRunning()) {
        if (live) setStage("idle")
        return
      }
      d = startGamesTour(finish)
    }
    void start()
    return () => {
      live = false
      if (d?.isActive()) d.destroy()
    }
  }, [stage, uid, router])

  return null
}

/* ── The Games tour ───────────────────────────────────────────────────── */

type GameStep = { target: string; title: string; text: string; side?: Side; align?: "start" | "center" | "end" }

const GAME_STEPS: GameStep[] = [
  {
    target: "player-card",
    title: "This is you",
    text: "Your player card: your character, level and XP. Tap it to open your game profile.",
  },
  {
    target: "game-tabs",
    title: "For fun or Discounted",
    text: "For fun: live games with friends. Discounted: play a friend who owes you — if they win, they pay you less.",
  },
  {
    target: "pick-game",
    title: "Pick a game",
    text: "Ludo, Chess, Scribble and more. Pick one, invite friends and play live.",
    side: "top",
  },
  {
    target: "group-rooms",
    title: "Group game rooms",
    text: "Every group has an always-open game room. Drop in and play with whoever's there.",
    side: "top",
  },
  {
    target: "game-nav",
    title: "Levels, Inventory, Profile",
    text: "Level up as you play and claim rewards, spend coins on frames, characters and boards, and dress up your game profile.",
    side: "top",
  },
  {
    target: "coin-chip",
    title: "Your coins",
    text: "Win them in games, spend them in the Inventory. Tap here for your coin history.",
    side: "bottom",
    align: "end",
  },
  {
    target: "game-bell",
    title: "Game notifications",
    text: "Invites, your turn, rewards to claim — they all land here.",
    side: "bottom",
    align: "end",
  },
]

/** Without a group there's no room to point at yet: say where one comes from instead. */
const NO_GROUP_STEP = {
  title: "Group game rooms",
  text: "Every group you make on Split gets an always-open game room here. Drop in and play with whoever's there.",
}

function startGamesTour(onDone: () => void): Driver {
  const still = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false
  // Only what's on screen now (it's one page, already drawn), so the count is right
  const steps: DriveStep[] = GAME_STEPS.flatMap((s): DriveStep[] => {
    if (visibleMark(s.target))
      return [{ element: markFinder(s.target), popover: { title: s.title, description: s.text, side: s.side ?? "bottom", align: s.align ?? "center" } }]
    if (s.target === "group-rooms") return [{ popover: NO_GROUP_STEP }]
    return []
  })
  let ended = false
  const d = driver({
    steps,
    showProgress: true,
    progressText: "{{current}} / {{total}}",
    nextBtnText: "Next",
    prevBtnText: "Back",
    doneBtnText: "Let's play!",
    closeBtnLabel: "Skip tour",
    popoverClass: "gt-tour",
    overlayClickBehavior: "none",
    overlayColor: "#16205c",
    overlayOpacity: 0.55,
    disableActiveInteraction: true,
    // Something that's gone by the time its step comes up is passed over
    skipMissingElement: true,
    stagePadding: 6,
    stageRadius: 20,
    popoverOffset: 12,
    animate: !still,
    duration: 320,
    smoothScroll: !still,
    onHighlighted: blurActive,
    onPopoverRender: (popover, { driver: drv }) => addSkipButton(popover, drv, "gt-tour-skip"),
    onDestroyed: () => {
      if (ended) return
      ended = true
      onDone()
    },
  })
  d.drive(0)
  return d
}
