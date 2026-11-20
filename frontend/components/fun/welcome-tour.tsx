"use client"

import * as React from "react"
import { usePathname, useRouter } from "next/navigation"
import { driver, type Driver, type DriveStep } from "driver.js"
import "driver.js/dist/driver.css"
import { toast } from "sonner"

import { BadgeArt } from "@/components/fun/badge-art"
import { useSession } from "@/components/providers/session-provider"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Spinner } from "@/components/ui/spinner"
import { useBadges, useWallet } from "@/hooks/use-fun"
import { EARLY_BIRD_LIMIT } from "@/lib/fun/catalog"
import { getErrorMessage } from "@/lib/errors"
import { claimEarlyBird, earlyBirdCount } from "@/services/fun"
import { addSkipButton, blurActive, markFinder, markTourDone, tourDone, tourRunning } from "./tour-kit"

/* ── The Split tour ───────────────────────────────────────────────────── */

type TourStep = { route: string; target?: string; title: string; text: string; side?: "top" | "bottom" | "left" | "right" }

/**
 * The Split side, in the order you'd meet it. Targets are `data-tour` marks,
 * only ever the copy that's showing (the add button is the sidebar's on a big
 * screen, the floating one on a phone). Games, coins and frames have their own tour on the Games side
 * (games-welcome.tsx) — this one ends at the switch that leads there.
 */
const STEPS: TourStep[] = [
  {
    route: "/home",
    title: "Welcome to JoySplit",
    text: "A quick tour of splitting with friends — adding expenses, friends and groups. Skip it any time.",
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
    text: "Tap a friend to open their profile: what you owe each other, badges, and their birthday countdown.",
  },
  {
    route: "/friends",
    title: "Tags & plans",
    text: "On a friend's profile, tag them — Buddy, Bestie, Bromance, Siblings or Love (Love unlocks hugs, kisses and miss-yous). Or make a plan like “let's get momos”.",
  },
  {
    route: "/groups",
    target: "create-group",
    title: "Create a group",
    text: "Trips, flatmates, office lunch — add everyone once and split inside the group.",
    side: "left",
  },
  {
    route: "/profile",
    target: "mood",
    title: "Your mood",
    text: "Let friends know if you're happy, busy or sleepy. It shows on your profile.",
  },
  {
    route: "/profile",
    target: "badges",
    title: "Your badges",
    text: "Earn badges for how you split — like Swift Payer for paying within 5 minutes.",
    side: "top",
  },
  {
    route: "/home",
    target: "mode-switch",
    title: "Games are here",
    text: "Switch to Games at the very top: Ludo, Chess and more, live with friends — or play a friend who owes you for a discount.",
    side: "bottom",
  },
]

/** Seen an account that hadn't had its welcome yet, on this device: the Split tour is still owed. */
const pendingKey = (uid: string) => `joysplit_tour_split_pending_${uid}`
const readPending = (uid: string) => {
  try {
    return localStorage.getItem(pendingKey(uid)) === "1"
  } catch {
    return false
  }
}
const writePending = (uid: string, on: boolean) => {
  try {
    if (on) localStorage.setItem(pendingKey(uid), "1")
    else localStorage.removeItem(pendingKey(uid))
  } catch {}
}

/**
 * First time in the app, on the Split side: a skippable tour of splitting,
 * ending at the Split | Games switch; then, while spots last, the Early Bird
 * badge. The welcome coins and frame aren't here any more — they're the
 * Games side's first moment (games-welcome.tsx).
 *
 * The tour is for new accounts: ones whose welcome gift hasn't been claimed
 * yet (or hadn't when this device first saw them, so opening Games first
 * doesn't lose it), and only until it's been seen or skipped once.
 */
export function WelcomeTour() {
  const { user, authState } = useSession()
  const wallet = useWallet()
  const router = useRouter()
  const pathname = usePathname()
  const uid = user?.uid
  const [phase, setPhase] = React.useState<"idle" | "touring" | "early">("idle")
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

  // A brand-new account: remember the tour is owed, even if the welcome gets claimed on Games first
  const unwelcomed = wallet === null || (!!wallet && !wallet.welcomed)
  React.useEffect(() => {
    if (uid && unwelcomed && !tourDone("split", uid, user?.tours)) writePending(uid, true)
  }, [uid, unwelcomed, user?.tours])

  const finish = React.useCallback(() => {
    if (!uid) return
    markTourDone("split", uid)
    writePending(uid, false)
    tour.current = null
    if (window.location.pathname !== "/home") router.push("/home")
    setPhase("idle")
  }, [uid, router])

  // Who sees what: the tour once, then the Early Bird badge until claimed
  React.useEffect(() => {
    if (!uid || authState !== "authenticatedProfileComplete" || wallet === undefined || phase !== "idle" || pathname !== "/home") return
    const tourDue = !tourDone("split", uid, user?.tours) && (unwelcomed || readPending(uid))
    if (!tourDue && !needsEarly) return
    const t = window.setTimeout(() => {
      if (tourRunning()) return
      setPhase(tourDue ? "touring" : "early")
    }, 900)
    return () => window.clearTimeout(t)
  }, [uid, authState, wallet, unwelcomed, phase, pathname, needsEarly, user?.tours])

  // Run the tour
  React.useEffect(() => {
    if (phase !== "touring" || tour.current) return
    // Seen from the moment it starts: closing the app part-way won't bring it back
    if (uid) markTourDone("split", uid)
    const go = (d: Driver, i: number) => {
      const step = STEPS[i]
      if (!step) return
      if (window.location.pathname + window.location.search !== step.route) router.push(step.route)
      d.moveTo(i)
    }
    const steps: DriveStep[] = STEPS.map((s) => ({
      ...(s.target ? { element: markFinder(s.target) } : {}),
      // Pages load as the tour moves through them: give a mark a moment to show up
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
      // A mark that never shows up gets its words in the middle of the screen
      // (not skipped: driver.js's own skip wouldn't open the next step's page)
      skipMissingElement: false,
      stagePadding: 6,
      stageRadius: 12,
      overlayOpacity: 0.55,
      smoothScroll: true,
      duration: 320,
      // The amount field focuses itself; keep the keyboard down during the tour
      onHighlighted: blurActive,
      onPopoverRender: (popover, { driver: drv }) => addSkipButton(popover, drv, "joysplit-tour-skip"),
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
  }, [phase, router, finish, uid])

  return (
    <EarlyBirdDialog
      open={phase === "early" && needsEarly && pathname === "/home"}
      onDone={() => {
        setSpotsLeft(false)
        setPhase("idle")
      }}
    />
  )
}

/* ── Early Bird ───────────────────────────────────────────────────────── */

function EarlyBirdDialog({ open, onDone }: { open: boolean; onDone: () => void }) {
  const { user } = useSession()
  const [busy, setBusy] = React.useState(false)
  if (!user) return null

  const claimEarly = async () => {
    setBusy(true)
    try {
      const n = await claimEarlyBird(user.uid)
      if (n) toast.success(`Early Bird #${n} — welcome aboard`)
      else toast.info("All 1,000 Early Bird spots were just taken")
      onDone()
    } catch (e) {
      toast.error(getErrorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    // One tap to claim; it isn't dismissed by tapping outside
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="max-w-sm overflow-hidden text-center" showCloseButton={false}>
        <div className="mx-auto duration-500 animate-in zoom-in-75">
          <BadgeArt badge="earlybird" tier={3} className="size-28" />
        </div>
        <DialogHeader className="items-center text-center">
          <DialogTitle className="text-xl">You&apos;re an Early Bird</DialogTitle>
          <DialogDescription>
            One of the first {EARLY_BIRD_LIMIT.toLocaleString("en-IN")} people on JoySplit. Claim your badge — it shows on
            your profile for good, with your member number.
          </DialogDescription>
        </DialogHeader>
        <Button size="lg" className="w-full" disabled={busy} onClick={claimEarly}>
          {busy && <Spinner />}
          Claim badge
        </Button>
      </DialogContent>
    </Dialog>
  )
}
