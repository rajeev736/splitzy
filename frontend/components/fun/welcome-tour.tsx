"use client"

import * as React from "react"
import { usePathname, useRouter } from "next/navigation"
import { driver, type Driver, type DriveStep } from "driver.js"
import "driver.js/dist/driver.css"
import { toast } from "sonner"

import { CoinIcon } from "@/components/fun/coin"
import { FramedAvatar } from "@/components/fun/framed-avatar"
import { useSession } from "@/components/providers/session-provider"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Spinner } from "@/components/ui/spinner"
import { BadgeArt } from "@/components/fun/badge-art"
import { useBadges, useWallet } from "@/hooks/use-fun"
import { EARLY_BIRD_LIMIT, FRAMES, STARTING_COINS, WELCOME_FRAME } from "@/lib/fun/catalog"
import { getErrorMessage } from "@/lib/errors"
import { claimEarlyBird, claimWelcomeCoins, claimWelcomeFrame, earlyBirdCount } from "@/services/fun"

/* ── The tour ─────────────────────────────────────────────────────────── */

type TourStep = { route: string; target?: string; title: string; text: string; side?: "top" | "bottom" | "left" | "right" }

/** Every feature, in the order you'd meet them. Targets are `data-tour` marks. */
const STEPS: TourStep[] = [
  {
    route: "/home",
    title: "Welcome to JoySplit",
    text: "A quick tour of everything you can do — split bills, play games, send gifts. Skip it any time.",
  },
  { route: "/home", target: "add-expense", title: "Add an expense", text: "Paid for something? Tap here to split it.", side: "top" },
  {
    route: "/expenses/new",
    target: "amount",
    title: "How much was it?",
    text: "Type the total. A note on what it was for is optional.",
  },
  {
    route: "/expenses/new",
    target: "split-with",
    title: "Who's it split with",
    text: "Pick friends or a group — split equally or set each share yourself.",
  },
  {
    route: "/expenses/new",
    target: "attach-bill",
    title: "Attach the bill",
    text: "Add a photo or PDF. Everyone in the split can view and download it.",
    side: "top",
  },
  {
    route: "/history",
    target: "history",
    title: "See every split",
    text: "Your expenses and payments live here. Open one to see who owes what, pay, or confirm you got paid.",
  },
  {
    route: "/friends",
    target: "add-friend",
    title: "Add friends",
    text: "Send a friend request with their JoySplit ID or by scanning their QR.",
    side: "left",
  },
  {
    route: "/friends",
    target: "friend-list",
    title: "Your friend's profile",
    text: "Tap a friend to open their profile: balances, badges, birthday countdown, and everything you've sent each other.",
  },
  {
    route: "/friends",
    title: "Tags, gifts & plans",
    text: "On a friend's profile, tag them — Buddy, Bestie, Bromance, Siblings or Love (Love unlocks hugs, kisses and miss-yous). Send gifts with coins, or make a plan like “let's get momos”.",
  },
  {
    route: "/groups",
    target: "create-group",
    title: "Create a group",
    text: "Trips, flatmates, office lunch — add everyone once and split inside the group.",
    side: "left",
  },
  {
    route: "/challenges",
    target: "game-tabs",
    title: "Games",
    text: "Discounted: challenge someone who owes you — if they win, they pay less. Just for fun: play anyone, and put coins on it.",
  },
  {
    route: "/challenges",
    target: "new-challenge",
    title: "Challenge someone",
    text: "Pick a game — Stone Paper Scissors, Penalty Shootout, Higher or Lower and more — then who plays and the stakes.",
  },
  {
    route: "/profile",
    target: "mood",
    title: "Your mood",
    text: "Let friends know if you're happy, busy or sleepy. It shows on your profile.",
  },
  {
    route: "/profile",
    target: "frame",
    title: "Frames & badges",
    text: "Wear a frame around your photo, and collect badges — like Swift Payer for paying within 5 minutes.",
    side: "right",
  },
  {
    route: "/home",
    target: "coins",
    title: "Your coins",
    text: "Win them in games, spend them on frames and gifts. Tap to see your coin history.",
    side: "bottom",
  },
]

/** First element on screen for a mark (pages stay mounted while hidden, so skip invisible ones). */
function visible(mark: string): Element {
  const all = document.querySelectorAll(`[data-tour="${mark}"]`)
  for (const el of all) if (el.getClientRects().length > 0) return el
  return null as unknown as Element
}

const doneKey = (uid: string) => `joysplit_tour_done_${uid}`
const readDone = (uid: string) => {
  try {
    return localStorage.getItem(doneKey(uid)) === "1"
  } catch {
    return true
  }
}
const markDone = (uid: string) => {
  try {
    localStorage.setItem(doneKey(uid), "1")
  } catch {}
}

/**
 * First time in the app: a skippable tour of every feature, then the welcome
 * rewards — 10,000 coins, then a free frame (which opens the frame shop).
 */
export function WelcomeTour() {
  const { user, authState } = useSession()
  const wallet = useWallet()
  const router = useRouter()
  const pathname = usePathname()
  const uid = user?.uid
  const [phase, setPhase] = React.useState<"idle" | "touring" | "coins" | "frame" | "early">("idle")
  const tour = React.useRef<Driver | null>(null)
  const badges = useBadges(uid)

  // Early Bird: still open (fewer than 1,000 taken) and not yours yet
  const [spotsLeft, setSpotsLeft] = React.useState<boolean | null>(null)
  const hasEarlyBird = badges?.ids.has("earlybird_joysplit")
  React.useEffect(() => {
    if (!uid || hasEarlyBird !== false) return
    let live = true
    earlyBirdCount().then((n) => live && setSpotsLeft(n !== null && n < EARLY_BIRD_LIMIT))
    return () => {
      live = false
    }
  }, [uid, hasEarlyBird])
  const needsEarly = hasEarlyBird === false && spotsLeft === true

  const finish = React.useCallback(() => {
    if (!uid) return
    markDone(uid)
    tour.current = null
    router.push("/home")
    setPhase("coins")
  }, [uid, router])

  // Who sees what: the tour once, then the rewards until claimed
  React.useEffect(() => {
    if (!uid || authState !== "authenticatedProfileComplete" || !wallet || phase !== "idle" || pathname !== "/home") return
    const needsCoins = !wallet.welcomed
    const needsFrame = !wallet.welcomeFrame && !wallet.frames.includes(WELCOME_FRAME)
    if (!needsCoins && !needsFrame && !needsEarly) return
    const t = window.setTimeout(() => {
      if (needsCoins && !readDone(uid)) setPhase("touring")
      else setPhase(needsCoins ? "coins" : needsFrame ? "frame" : "early")
    }, 900)
    return () => window.clearTimeout(t)
  }, [uid, authState, wallet, phase, pathname, needsEarly])

  // Run the tour
  React.useEffect(() => {
    if (phase !== "touring" || tour.current) return
    const go = (d: Driver, i: number) => {
      const step = STEPS[i]
      if (!step) return
      if (window.location.pathname !== step.route) router.push(step.route)
      d.moveTo(i)
    }
    const steps: DriveStep[] = STEPS.map((s) => ({
      ...(s.target ? { element: () => visible(s.target!) } : {}),
      waitForElement: s.target ? 3500 : 0,
      popover: { title: s.title, description: s.text, side: s.side ?? "bottom", align: "center" },
    }))
    const d = driver({
      steps,
      showProgress: true,
      progressText: "{{current}} of {{total}}",
      nextBtnText: "Next",
      prevBtnText: "Back",
      doneBtnText: "Finish",
      closeBtnLabel: "Skip tour",
      popoverClass: "joysplit-tour",
      overlayClickBehavior: "none",
      disableActiveInteraction: true,
      stagePadding: 6,
      stageRadius: 12,
      overlayOpacity: 0.55,
      smoothScroll: true,
      onHighlighted: () => {
        // The amount field focuses itself; keep the keyboard down during the tour
        if (document.activeElement instanceof HTMLElement) document.activeElement.blur()
      },
      onPopoverRender: (popover, { driver: drv }) => {
        // A plain "Skip" next to the progress, besides the close cross
        if (drv.isLastStep()) return
        const skip = document.createElement("button")
        skip.type = "button"
        skip.className = "joysplit-tour-skip"
        skip.textContent = "Skip"
        skip.onclick = () => drv.destroy()
        popover.footer.prepend(skip)
      },
      onNextClick: (_el, _step, { driver: drv, index = 0 }) => {
        if (index + 1 >= STEPS.length) drv.destroy()
        else go(drv, index + 1)
      },
      onPrevClick: (_el, _step, { driver: drv, index = 0 }) => go(drv, Math.max(0, index - 1)),
      onDestroyed: () => {
        if (tour.current === d) finish()
      },
    })
    tour.current = d
    d.drive(0)
    return () => {
      // Leaving the app mid-tour (logout): close it quietly
      if (tour.current === d && d.isActive()) {
        tour.current = null
        d.destroy()
      }
    }
  }, [phase, router, finish])

  return (
    <WelcomeRewards
      phase={phase === "coins" || phase === "frame" || phase === "early" ? phase : null}
      needsFrame={!!wallet && !wallet.welcomeFrame && !wallet.frames.includes(WELCOME_FRAME)}
      needsEarly={needsEarly}
      onNext={(next) => setPhase(next ?? "idle")}
      onFrameClaimed={() => router.push("/profile/frames")}
      onEarlyDone={() => setSpotsLeft(false)}
    />
  )
}

/* ── Welcome rewards ──────────────────────────────────────────────────── */

function WelcomeRewards({
  phase,
  needsFrame,
  needsEarly,
  onNext,
  onFrameClaimed,
  onEarlyDone,
}: {
  phase: "coins" | "frame" | "early" | null
  needsFrame: boolean
  needsEarly: boolean
  onNext: (next: "frame" | "early" | null) => void
  onFrameClaimed: () => void
  onEarlyDone: () => void
}) {
  const { user } = useSession()
  const [busy, setBusy] = React.useState(false)
  if (!user) return null

  const claimCoins = async () => {
    setBusy(true)
    try {
      await claimWelcomeCoins(user.uid)
      toast.success(`+${STARTING_COINS.toLocaleString("en-IN")} coins`)
      onNext(needsFrame ? "frame" : needsEarly ? "early" : null)
    } catch (e) {
      toast.error(getErrorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  const claimFrame = async () => {
    setBusy(true)
    try {
      await claimWelcomeFrame(user.uid)
      onFrameClaimed()
      onNext(needsEarly ? "early" : null)
    } catch (e) {
      toast.error(getErrorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  const claimEarly = async () => {
    setBusy(true)
    try {
      const n = await claimEarlyBird(user.uid)
      if (n) toast.success(`Early Bird #${n} — welcome aboard`)
      else toast.info("All 1,000 Early Bird spots were just taken")
      onEarlyDone()
      onNext(null)
    } catch (e) {
      toast.error(getErrorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    // One tap to claim; it isn't dismissed by tapping outside
    <Dialog open={!!phase} onOpenChange={() => {}}>
      <DialogContent className="max-w-sm overflow-hidden text-center" showCloseButton={false}>
        {phase === "coins" ? (
          <>
            <div className="mx-auto flex size-24 items-center justify-center rounded-full bg-amber-100/80 duration-500 animate-in zoom-in-50 dark:bg-amber-500/15">
              <CoinIcon className="size-14" />
            </div>
            <DialogHeader className="items-center text-center">
              <DialogTitle className="text-xl">{STARTING_COINS.toLocaleString("en-IN")} coins, on us</DialogTitle>
              <DialogDescription>
                A welcome gift. Put them on games with friends, buy frames, or send gifts.
              </DialogDescription>
            </DialogHeader>
            <Button size="lg" className="w-full" disabled={busy} onClick={claimCoins}>
              {busy && <Spinner />}
              Claim coins
            </Button>
          </>
        ) : phase === "frame" ? (
          <>
            <div className="mx-auto p-6 duration-500 animate-in zoom-in-75">
              <FramedAvatar src={user.photoURL} name={user.displayName} frame={WELCOME_FRAME} size={88} />
            </div>
            <DialogHeader className="-mt-3 items-center text-center">
              <DialogTitle className="text-xl">A free frame for you</DialogTitle>
              <DialogDescription>
                {FRAMES[WELCOME_FRAME].name} is yours — it goes on your photo right away. Find more in Frames.
              </DialogDescription>
            </DialogHeader>
            <Button size="lg" className="w-full" disabled={busy} onClick={claimFrame}>
              {busy && <Spinner />}
              Claim frame
            </Button>
          </>
        ) : phase === "early" ? (
          <>
            <div className="mx-auto duration-500 animate-in zoom-in-75">
              <BadgeArt badge="earlybird" tier={3} className="size-28" />
            </div>
            <DialogHeader className="items-center text-center">
              <DialogTitle className="text-xl">You&apos;re an Early Bird</DialogTitle>
              <DialogDescription>
                One of the first {EARLY_BIRD_LIMIT.toLocaleString("en-IN")} people on JoySplit. Claim your badge — it
                shows on your profile for good, with your member number.
              </DialogDescription>
            </DialogHeader>
            <Button size="lg" className="w-full" disabled={busy} onClick={claimEarly}>
              {busy && <Spinner />}
              Claim badge
            </Button>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
