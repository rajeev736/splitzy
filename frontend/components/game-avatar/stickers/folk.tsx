import { ClawMarks, ComicBurst, DizzyStars, Flower, Rays, SmokeCloud } from "./stamps"
import type { CharSticker } from "./types"

/** Two signature stickers for each illustrated folk character (packs/folk). */
export const FOLK_STICKERS: Record<string, CharSticker[]> = {
  buck: [
    {
      n: 1,
      name: "Lasso",
      blurb: "A spinning lasso that ropes them in and yanks",
      sound: "hit_whip",
      art: (
        <>
          <ellipse cx="34" cy="25" rx="25" ry="14" fill="none" stroke="#a16207" strokeWidth="5" />
          <ellipse cx="34" cy="25" rx="25" ry="14" fill="none" stroke="#fde68a" strokeWidth="1.6" strokeDasharray="4 4" />
          <path d="M13 33c-4 7-6 15-2 25" stroke="#a16207" strokeWidth="5" fill="none" strokeLinecap="round" />
          <path d="M13 33c-4 7-6 15-2 25" stroke="#fde68a" strokeWidth="1.6" fill="none" strokeDasharray="4 4" />
          <rect x="8" y="29" width="11" height="8" rx="2" fill="#78350f" transform="rotate(-25 13 33)" />
        </>
      ),
      flight: { path: "arc", lift: 90, spin: 1080, size: 60, trail: { shape: "dot", colours: ["#fde68a", "#a16207"] } },
      impact: {
        item: "pop",
        flash: ["#fffbeb", "#f6c443", "#a16207"],
        rings: ["#f6c443"],
        tint: "#f6c443",
        bursts: [
          { shape: "puff", colours: ["#e7d3b0", "#d6b98c", "#f5ead6"], count: 10, reach: 80, size: 22 },
          { shape: "star", colours: ["#f6c443", "#ffffff"], count: 8, reach: 60, size: 11, delay: 0.2 },
        ],
        stamp: {
          motion: "draw",
          size: 3.3,
          hold: 1,
          art: (
            <svg viewBox="0 0 100 100" className="size-full" aria-hidden>
              <ellipse data-draw pathLength={1} cx="50" cy="52" rx="44" ry="40" fill="none" stroke="#a16207" strokeWidth="7" />
              <ellipse data-draw pathLength={1} cx="50" cy="52" rx="44" ry="40" fill="none" stroke="#fde68a" strokeWidth="2" />
              <rect x="40" y="86" width="20" height="12" rx="3" fill="#78350f" />
            </svg>
          ),
        },
        word: { text: "YEEHAW!", fill: "#f6c443", stroke: "#78350f" },
        react: "yank",
      },
    },
    {
      n: 2,
      name: "Hat Tip",
      blurb: "His hat spins over and lands on their head — howdy",
      sound: "hit_boing",
      art: (
        <>
          <path d="M3 40c6 9 52 9 58 0-4 7-14 9-29 9S7 47 3 40z" fill="#92400e" />
          <ellipse cx="32" cy="40" rx="29" ry="7.5" fill="#b45309" stroke="#78350f" strokeWidth="2.5" />
          <path d="M18 38c-2-12 2-24 8-24 3 0 4 3 6 3s3-3 6-3c6 0 10 12 8 24-8 3-20 3-28 0z" fill="#d97706" stroke="#78350f" strokeWidth="2.5" strokeLinejoin="round" />
          <path d="M18.5 31c8 3 19 3 27 0l.5 5c-8 3-20 3-28 0z" fill="#78350f" />
          <circle cx="40" cy="33" r="1.8" fill="#f6c443" />
          <path d="M26 17c-3 4-4 9-4 14" stroke="#fbbf24" strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.75" />
        </>
      ),
      flight: { path: "arc", lift: 70, spin: 720, size: 58, trail: { shape: "dot", colours: ["#f6c443", "#d97706"] } },
      impact: {
        item: "land",
        flash: ["#fffbeb", "#fde68a", "#d97706"],
        rings: ["#f6c443"],
        bursts: [
          { shape: "puff", colours: ["#e7d3b0", "#f5ead6", "#d6b98c"], count: 10, reach: 70, size: 20 },
          { shape: "star", colours: ["#f6c443", "#ffffff"], count: 8, reach: 65, size: 12, motion: "rise", delay: 0.2 },
        ],
        word: { text: "HOWDY!", fill: "#fde68a", stroke: "#78350f" },
        react: "lift",
      },
    },
  ],
  mimi: [
    {
      n: 1,
      name: "Claw Swipe",
      blurb: "Cute paw, sharp claws — three neat scratches",
      sound: "hit_knife",
      art: (
        <>
          <path d="M11 15l2-9 3 9M22 8l3-8 2 8M37 8l2-8 3 8M48 15l3-9 2 9" fill="#f4f4f5" stroke="#3f3f46" strokeWidth="1.5" strokeLinejoin="round" />
          <ellipse cx="32" cy="43" rx="17" ry="15" fill="#ffffff" stroke="#3f3f46" strokeWidth="2.5" />
          <circle cx="14" cy="25" r="7" fill="#ffffff" stroke="#3f3f46" strokeWidth="2.5" />
          <circle cx="25" cy="16" r="7" fill="#ffffff" stroke="#3f3f46" strokeWidth="2.5" />
          <circle cx="39" cy="16" r="7" fill="#ffffff" stroke="#3f3f46" strokeWidth="2.5" />
          <circle cx="50" cy="25" r="7" fill="#ffffff" stroke="#3f3f46" strokeWidth="2.5" />
          <path d="M32 38c6 0 11 4 11 9 0 4-5 6-11 6s-11-2-11-6c0-5 5-9 11-9z" fill="#ff9eb5" />
          <circle cx="14" cy="26" r="3" fill="#ff9eb5" />
          <circle cx="25" cy="17" r="3" fill="#ff9eb5" />
          <circle cx="39" cy="17" r="3" fill="#ff9eb5" />
          <circle cx="50" cy="26" r="3" fill="#ff9eb5" />
        </>
      ),
      flight: { path: "straight", duration: 0.4, aim: -90, size: 56, trail: { shape: "sparkle", colours: ["#5ccfa6", "#ff9eb5"] } },
      impact: {
        item: "pop",
        flash: ["#ffffff", "#a7f3d0", "#5ccfa6"],
        rings: ["#5ccfa6", "#ff9eb5"],
        tint: "#5ccfa6",
        bursts: [
          { shape: "sparkle", colours: ["#ffffff", "#5ccfa6", "#ff9eb5"], count: 14, reach: 85, size: 12 },
          { shape: "heart", colours: ["#ff9eb5"], count: 4, reach: 50, size: 13, motion: "rise", delay: 0.3 },
        ],
        stamp: { motion: "draw", size: 2.4, hold: 0.9, art: <ClawMarks colour="#ffffff" edge="#e11d48" /> },
        word: { text: "NYAH!", fill: "#a7f3d0", stroke: "#134e4a" },
        react: "knock",
      },
    },
    {
      n: 2,
      name: "Yarn Ball",
      blurb: "A yarn ball bounces over and ties them up in knots",
      sound: "hit_boing",
      art: (
        <>
          <circle cx="32" cy="33" r="21" fill="#f472b6" stroke="#9d174d" strokeWidth="2.5" />
          <path d="M15 23c10 4 22 16 26 28M13 33c10 2 20 10 22 20M21 15c10 6 20 18 22 30M40 14c-6 8-14 22-14 38M50 22c-8 6-18 18-22 30" stroke="#fbcfe8" strokeWidth="2" fill="none" />
          <path d="M50 46c6 4 9 10 6 15" stroke="#f472b6" strokeWidth="3" fill="none" strokeLinecap="round" />
          <path d="M18 10l4 7M14 14l8 2" stroke="#cbd5e1" strokeWidth="2.5" strokeLinecap="round" />
        </>
      ),
      flight: { path: "bounce", size: 54, spin: 720, trail: { shape: "dot", colours: ["#f472b6", "#fbcfe8"] } },
      impact: {
        item: "smash",
        flash: ["#ffffff", "#fbcfe8", "#5ccfa6"],
        rings: ["#f472b6"],
        bursts: [
          { shape: "heart", colours: ["#f472b6", "#fbcfe8", "#5ccfa6"], count: 10, reach: 75, size: 13 },
          { shape: "sparkle", colours: ["#ffffff", "#fde68a"], count: 6, reach: 55, size: 10, delay: 0.2 },
        ],
        stamp: {
          motion: "draw",
          size: 2.8,
          hold: 1.1,
          art: (
            <svg viewBox="0 0 100 100" className="size-full" aria-hidden>
              <path
                data-draw
                pathLength={1}
                d="M8 50C8 20 40 6 62 14s30 34 14 52-50 22-60 0S30 18 54 24s28 30 12 42-38 8-40-12 22-28 36-14"
                fill="none"
                stroke="#f472b6"
                strokeWidth="4"
                strokeLinecap="round"
              />
              <path
                data-draw
                pathLength={1}
                d="M20 82C40 96 80 90 92 60S80 10 50 8"
                fill="none"
                stroke="#ec4899"
                strokeWidth="3"
                strokeLinecap="round"
              />
            </svg>
          ),
        },
        word: { text: "MEOW?", fill: "#fbcfe8", stroke: "#134e4a" },
        react: "wobble",
      },
    },
  ],
  pip: [
    {
      n: 1,
      name: "Treasure Map",
      blurb: "A map unrolls — X marks them",
      sound: "hit_sparkle",
      art: (
        <>
          <rect x="10" y="19" width="44" height="26" rx="3" fill="#fef3c7" stroke="#7f4e24" strokeWidth="2.5" />
          <rect x="5" y="15" width="11" height="34" rx="5.5" fill="#3b78d8" stroke="#2453a3" strokeWidth="2.5" />
          <rect x="48" y="15" width="11" height="34" rx="5.5" fill="#3b78d8" stroke="#2453a3" strokeWidth="2.5" />
          <path d="M20 37c4-6 10 2 14-4s7-3 9-1" stroke="#b5763f" strokeWidth="2" strokeDasharray="2.5 2.5" fill="none" />
          <path d="M39 24l6 6M45 24l-6 6" stroke="#dc2626" strokeWidth="2.6" strokeLinecap="round" />
          <path d="M8 19v26" stroke="#6aa8ff" strokeWidth="2" strokeLinecap="round" />
        </>
      ),
      flight: { path: "arc", lift: 100, spin: 540, size: 56, trail: { shape: "coin", colours: ["#fbbf24", "#fde68a"] } },
      impact: {
        item: "pop",
        flash: ["#ffffff", "#fef3c7", "#74c6ea"],
        rings: ["#fbbf24", "#74c6ea"],
        tint: "#fbbf24",
        bursts: [
          { shape: "coin", colours: ["#fbbf24", "#f59e0b", "#fde68a"], count: 14, reach: 90, size: 13 },
          { shape: "sparkle", colours: ["#ffffff", "#fde68a"], count: 8, reach: 70, size: 10, motion: "rise", delay: 0.25 },
        ],
        stamp: {
          motion: "unroll",
          size: 3.4,
          ratio: 0.62,
          hold: 1.1,
          art: (
            <svg viewBox="0 0 100 62" className="size-full" aria-hidden>
              <rect x="6" y="4" width="88" height="54" rx="3" fill="#fef3c7" fillOpacity="0.95" stroke="#7f4e24" strokeWidth="2.5" />
              <path d="M12 46c10-14 18 4 26-8s12-10 12-7" stroke="#b5763f" strokeWidth="2.5" strokeDasharray="4 4" fill="none" />
              <path d="M62 14c6-4 14-2 18 4M70 44c4 2 10 2 14-2" stroke="#86efac" strokeWidth="3" fill="none" strokeLinecap="round" />
              <path d="M42 22l16 16M58 22L42 38" stroke="#dc2626" strokeWidth="5" strokeLinecap="round" />
              <rect x="0" y="0" width="9" height="62" rx="4.5" fill="#3b78d8" />
              <rect x="91" y="0" width="9" height="62" rx="4.5" fill="#3b78d8" />
            </svg>
          ),
        },
        word: { text: "FOUND YOU!", fill: "#fef3c7", stroke: "#7f4e24" },
        react: "lift",
      },
    },
    {
      n: 2,
      name: "Feather Flurry",
      blurb: "A feather loops in on the wind and they spin in a flurry",
      sound: "hit_whoosh",
      art: (
        <>
          <path d="M57 7C40 7 20 19 14 45c-1 4 0 8 2 10 8-2 18-8 26-18 8-10 14-21 15-30z" fill="#dba26a" stroke="#7f4e24" strokeWidth="2.5" strokeLinejoin="round" />
          <path d="M23 41l11-2M27 33l13-2M33 25l13-2M40 17l11-2" stroke="#f07228" strokeWidth="3" strokeLinecap="round" />
          <path d="M7 58L55 9" stroke="#7f4e24" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M47 13c-6 6-12 14-17 22" stroke="#fff4e0" strokeWidth="1.6" strokeLinecap="round" opacity="0.7" />
        </>
      ),
      flight: { path: "loop", lift: 50, aim: -45, size: 58, trail: { shape: "feather", colours: ["#dba26a", "#ffa055"] } },
      impact: {
        item: "pop",
        flash: ["#ffffff", "#e0f2fe", "#74c6ea"],
        rings: ["#bae6fd", "#ffffff", "#ffa055"],
        tint: "#74c6ea",
        bursts: [
          { shape: "feather", colours: ["#dba26a", "#b5763f", "#ffa055", "#fff4e0"], count: 18, reach: 100, size: 16, motion: "swirl" },
          { shape: "dot", colours: ["#ffffff", "#bae6fd"], count: 10, reach: 80, size: 6, delay: 0.1 },
        ],
        word: { text: "WHOOSH!", fill: "#e0f2fe", stroke: "#432c52" },
        react: "spin",
      },
    },
  ],
  brick: [
    {
      n: 1,
      name: "Mega POW",
      blurb: "Doesn't talk. Just punches. Comic-book hard.",
      sound: "hit_punch",
      art: (
        <>
          <path d="M14 21c0-6 6-10 14-10h17c8 0 14 6 14 14v15c0 8-6 14-14 14H28c-8 0-14-4-14-10z" fill="#f0b98d" stroke="#1e1b4b" strokeWidth="2.5" />
          <path d="M59 26H41M59 34H41M58 42H41" stroke="#a1623a" strokeWidth="2" strokeLinecap="round" />
          <path d="M23 31c6-3 14-1 17 5-4 4-12 5-17 1z" fill="#e3a576" stroke="#1e1b4b" strokeWidth="2" strokeLinejoin="round" />
          <path d="M22 16c6-3 14-3 20-2" stroke="#fde3cc" strokeWidth="3" strokeLinecap="round" fill="none" />
          <rect x="2" y="20" width="14" height="27" rx="3" fill="#f2604c" stroke="#1e1b4b" strokeWidth="2.5" />
          <path d="M5 27h8M5 33h8M5 39h8" stroke="#ffffff" strokeWidth="1.8" opacity="0.7" />
        </>
      ),
      flight: { path: "straight", duration: 0.34, aim: 0, size: 64, trail: { shape: "square", colours: ["#ffffff", "#f2604c"] } },
      impact: {
        item: "pop",
        flash: ["#ffffff", "#fde047", "#f2604c"],
        rings: ["#fde047", "#f2604c", "#1e1b4b"],
        tint: "#f2604c",
        bursts: [
          { shape: "star", colours: ["#fde047", "#ffffff", "#f2604c"], count: 18, reach: 105, size: 15 },
          { shape: "shard", colours: ["#1e1b4b", "#ffffff"], count: 10, reach: 80, size: 9 },
        ],
        stamp: { motion: "pop", size: 3.4, hold: 0.8, dy: -0.1, art: <ComicBurst text="POW!" fill="#fde047" ink="#dc2626" size={28} /> },
        react: "knock",
      },
    },
    {
      n: 2,
      name: "Dumbbell Drop",
      blurb: "A hundred kilos, straight down — THUD",
      sound: "hit_bomb",
      art: (
        <>
          <rect x="16" y="28" width="32" height="8" rx="3" fill="#94a3b8" stroke="#1e1b4b" strokeWidth="2.5" />
          <rect x="6" y="15" width="12" height="34" rx="4" fill="#334155" stroke="#1e1b4b" strokeWidth="2.5" />
          <rect x="46" y="15" width="12" height="34" rx="4" fill="#334155" stroke="#1e1b4b" strokeWidth="2.5" />
          <rect x="1.5" y="21" width="6" height="22" rx="2" fill="#475569" stroke="#1e1b4b" strokeWidth="2" />
          <rect x="56.5" y="21" width="6" height="22" rx="2" fill="#475569" stroke="#1e1b4b" strokeWidth="2" />
          <path d="M9.5 19v12M49.5 19v12" stroke="#94a3b8" strokeWidth="2.5" strokeLinecap="round" />
          <text x="32" y="25" textAnchor="middle" fontSize="8" fontWeight="900" fill="#f2604c" fontFamily="system-ui, sans-serif">
            100
          </text>
        </>
      ),
      flight: { path: "sky", duration: 0.55, spin: 25, size: 64 },
      impact: {
        item: "smash",
        flash: ["#ffffff", "#fed7aa", "#f2604c"],
        rings: ["#f2604c", "#94a3b8", "#ffffff"],
        tint: "#f2604c",
        bursts: [
          { shape: "puff", colours: ["#e7e5e4", "#d6d3d1", "#a8a29e"], count: 14, reach: 95, size: 24 },
          { shape: "shard", colours: ["#57534e", "#a8a29e"], count: 12, reach: 85, size: 10 },
        ],
        stamp: {
          motion: "pop",
          size: 3.2,
          ratio: 0.5,
          dy: 0.9,
          hold: 1,
          art: (
            <svg viewBox="0 0 100 50" className="size-full" aria-hidden>
              <path d="M50 22L38 10l-6 10-14-4 4 12-14 4 14 6-6 10 14-4M50 22l14-12 4 12 16-6-6 12 14 4-14 6 8 8-16-2" fill="none" stroke="#44403c" strokeWidth="3.5" strokeLinejoin="round" strokeLinecap="round" />
            </svg>
          ),
        },
        word: { text: "THUD!", fill: "#fed7aa", stroke: "#1e1b4b" },
        react: "squash",
      },
    },
  ],
  skye: [
    {
      n: 1,
      name: "Loop-de-Loop",
      blurb: "A paper plane loops the loop and boops them",
      sound: "hit_whoosh",
      art: (
        <>
          <path d="M3 31L61 11 37 55l-9-17z" fill="#ffffff" stroke="#5b21b6" strokeWidth="2.5" strokeLinejoin="round" />
          <path d="M28 38L61 11 21 34z" fill="#ddd6fe" stroke="#5b21b6" strokeWidth="2" strokeLinejoin="round" />
          <path d="M28 38l-2 12 8-8" fill="#c4b5fd" stroke="#5b21b6" strokeWidth="2" strokeLinejoin="round" />
          <path d="M12 30l30-12" stroke="#ede9fe" strokeWidth="2" strokeLinecap="round" />
        </>
      ),
      flight: { path: "loop", lift: 70, aim: -19, size: 58, duration: 1.1, trail: { shape: "dot", colours: ["#ffffff", "#ddd6fe"] } },
      impact: {
        item: "pop",
        flash: ["#ffffff", "#ede9fe", "#b17cf5"],
        rings: ["#ddd6fe", "#b17cf5"],
        tint: "#b17cf5",
        bursts: [
          { shape: "sparkle", colours: ["#ffffff", "#ddd6fe", "#fde68a"], count: 16, reach: 95, size: 13 },
          { shape: "star", colours: ["#b17cf5", "#fde68a"], count: 8, reach: 65, size: 11, motion: "rise", delay: 0.2 },
        ],
        word: { text: "ZOOM!", fill: "#ede9fe", stroke: "#4c1d95" },
        react: "lift",
      },
    },
    {
      n: 2,
      name: "Air Drop",
      blurb: "A crate parachutes down and pops into confetti",
      sound: "hit_sparkle",
      art: (
        <>
          <path d="M5 26C5 12 17 3 32 3s27 9 27 23c-4-3-9-3-14 0-4-3-9-3-13 0-4-3-9-3-13 0-5-3-10-3-14 0z" fill="#b17cf5" stroke="#5b21b6" strokeWidth="2.5" strokeLinejoin="round" />
          <path d="M19 26c0-10 5-19 13-22 8 3 13 12 13 22-4-3-9-3-13 0-4-3-9-3-13 0z" fill="#ede9fe" />
          <path d="M7 27l16 14M57 27L41 41M32 27v14" stroke="#5b21b6" strokeWidth="1.6" />
          <rect x="21" y="40" width="22" height="19" rx="2" fill="#d97706" stroke="#78350f" strokeWidth="2.5" />
          <path d="M21 47h22M32 40v19" stroke="#78350f" strokeWidth="2" />
          <path d="M23 43l5-1" stroke="#fde68a" strokeWidth="2" strokeLinecap="round" />
        </>
      ),
      flight: { path: "drop", duration: 1.3, size: 64 },
      impact: {
        item: "smash",
        flash: ["#ffffff", "#fde68a", "#b17cf5"],
        rings: ["#fde68a", "#b17cf5"],
        tint: "#b17cf5",
        bursts: [
          { shape: "square", colours: ["#f472b6", "#fde047", "#60a5fa", "#4ade80", "#b17cf5"], count: 26, reach: 115, size: 9, motion: "fall" },
          { shape: "star", colours: ["#fde68a", "#ffffff"], count: 10, reach: 80, size: 12 },
        ],
        word: { text: "DELIVERED!", fill: "#fde68a", stroke: "#4c1d95" },
        react: "squash",
      },
    },
  ],
  nova: [
    {
      n: 1,
      name: "Eureka Flask",
      blurb: "A bubbling flask goes off in a cloud of pink bubbles",
      sound: "hit_bubbles",
      art: (
        <>
          <path d="M24 4h16v4h-3v14l15 26c2 5-1 10-6 10H18c-5 0-8-5-6-10l15-26V8h-3z" fill="#f0f9ff" fillOpacity="0.75" stroke="#831843" strokeWidth="2.5" strokeLinejoin="round" />
          <path d="M19 36h26l7 12c2 5-1 10-6 10H18c-5 0-8-5-6-10z" fill="#ff7eb0" />
          <circle cx="26" cy="48" r="3.5" fill="#ffd1e3" />
          <circle cx="36" cy="43" r="2.2" fill="#ffd1e3" />
          <circle cx="41" cy="52" r="2.6" fill="#ffd1e3" />
          <circle cx="34" cy="26" r="2.5" fill="#ff7eb0" />
          <circle cx="30" cy="15" r="2" fill="#ff7eb0" />
          <path d="M29 10v10" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
          <path d="M18 2l1 2.5 2.5 1-2.5 1L18 9l-1-2.5-2.5-1 2.5-1z" fill="#22d3ee" />
        </>
      ),
      flight: { path: "arc", lift: 110, spin: 360, size: 56, trail: { shape: "bubble", colours: ["#ff7eb0", "#a5f3fc"] } },
      impact: {
        item: "smash",
        flash: ["#ffffff", "#ffd1e3", "#ff7eb0"],
        rings: ["#ff7eb0", "#a5f3fc"],
        tint: "#ff7eb0",
        bursts: [
          { shape: "bubble", colours: ["#ff7eb0", "#ffd1e3", "#a5f3fc", "#ffffff"], count: 20, reach: 105, size: 16, motion: "rise" },
          { shape: "sparkle", colours: ["#22d3ee", "#ffffff"], count: 8, reach: 70, size: 11, delay: 0.15 },
        ],
        stamp: { motion: "grow", size: 3.2, hold: 0.8, art: <SmokeCloud colour="#ffd1e3" shade="#ff9cc4" /> },
        word: { text: "EUREKA!", fill: "#ffd1e3", stroke: "#831843" },
        react: "wobble",
      },
    },
    {
      n: 2,
      name: "Atom Smash",
      blurb: "A spinning atom splits on them — electrons everywhere",
      sound: "hit_zap",
      art: <Atom />,
      flight: { path: "arc", lift: 80, spin: 900, size: 58, trail: { shape: "dot", colours: ["#22d3ee", "#ff7eb0"] } },
      impact: {
        item: "pop",
        flash: ["#ffffff", "#a5f3fc", "#ff7eb0"],
        rings: ["#22d3ee", "#ff7eb0", "#ffffff"],
        tint: "#22d3ee",
        bursts: [
          { shape: "dot", colours: ["#22d3ee", "#ff7eb0", "#ffffff"], count: 22, reach: 110, size: 9, motion: "swirl" },
          { shape: "bolt", colours: ["#fde047", "#a5f3fc"], count: 8, reach: 70, size: 13, delay: 0.1 },
        ],
        stamp: {
          motion: "spin",
          size: 3.4,
          hold: 1,
          art: (
            <svg viewBox="0 0 64 64" className="size-full" opacity="0.85" aria-hidden>
              <Atom orbitsOnly />
            </svg>
          ),
        },
        word: { text: "SCIENCE!", fill: "#a5f3fc", stroke: "#831843" },
        react: "flicker",
      },
    },
  ],
  bramble: [
    {
      n: 1,
      name: "Bright Idea",
      blurb: "A lightbulb flies over and switches on — aha!",
      sound: "correct",
      art: (
        <>
          <path d="M32 3a19 19 0 0 0-11 34c3 2 5 5 5 8v3h12v-3c0-3 2-6 5-8A19 19 0 0 0 32 3z" fill="#fde047" stroke="#713f12" strokeWidth="2.5" strokeLinejoin="round" />
          <path d="M26 48h12v4H26zM27 52h10v4H27z" fill="#94a3b8" stroke="#475569" strokeWidth="2" />
          <path d="M29 59h6" stroke="#475569" strokeWidth="3" strokeLinecap="round" />
          <path d="M28 40l-2-12 6 6 6-6-2 12" stroke="#b45309" strokeWidth="2" fill="none" strokeLinejoin="round" />
          <path d="M21 13c-3 3-4 7-4 11" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" fill="none" />
        </>
      ),
      flight: { path: "arc", lift: 100, spin: 30, size: 56, trail: { shape: "sparkle", colours: ["#fde047", "#ffffff"] } },
      impact: {
        item: "stick",
        flash: ["#ffffff", "#fef08a", "#facc15"],
        rings: ["#fde047", "#ffffff", "#9ea8da"],
        tint: "#fde047",
        bursts: [
          { shape: "sparkle", colours: ["#fde047", "#ffffff", "#fef08a"], count: 18, reach: 100, size: 13 },
          { shape: "star", colours: ["#9ea8da", "#fde047"], count: 6, reach: 60, size: 11, motion: "rise", delay: 0.25 },
        ],
        stamp: { motion: "spin", size: 3.6, hold: 1, art: <Rays colour="#fde047" count={14} /> },
        word: { text: "AHA!", fill: "#fef08a", stroke: "#1e1b4b" },
        react: "lift",
      },
    },
    {
      n: 2,
      name: "Book Bonk",
      blurb: "A very thick book, with a theory — bonk",
      sound: "hit_punch",
      art: (
        <>
          <rect x="16" y="12" width="38" height="48" rx="3" fill="#fef3c7" stroke="#1e1b4b" strokeWidth="2.5" />
          <path d="M50 18v36M46 16v40" stroke="#e7d3a7" strokeWidth="1.5" />
          <rect x="9" y="5" width="39" height="49" rx="3" fill="#4338ca" stroke="#1e1b4b" strokeWidth="2.5" />
          <rect x="9" y="5" width="9" height="49" rx="3" fill="#312e81" />
          <path d="M24 17h18M24 22h13" stroke="#fcd34d" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="33" cy="36" r="7" fill="none" stroke="#fcd34d" strokeWidth="2" />
          <path d="M33 31v10M28 36h10" stroke="#fcd34d" strokeWidth="1.5" />
        </>
      ),
      flight: { path: "arc", lift: 90, spin: 540, size: 56, trail: { shape: "square", colours: ["#fef3c7", "#ffffff"] } },
      impact: {
        item: "smash",
        flash: ["#ffffff", "#e0e7ff", "#9ea8da"],
        rings: ["#9ea8da", "#fcd34d"],
        bursts: [
          { shape: "square", colours: ["#ffffff", "#fef3c7"], count: 12, reach: 90, size: 11, motion: "fall" },
          { shape: "star", colours: ["#fcd34d", "#ffffff"], count: 8, reach: 65, size: 12 },
        ],
        stamp: { motion: "spin", size: 2.8, ratio: 1, dy: -0.95, hold: 1.2, art: <DizzyStars colour="#fcd34d" /> },
        word: { text: "BONK!", fill: "#e0e7ff", stroke: "#1e1b4b" },
        react: "squash",
      },
    },
  ],
  riff: [
    {
      n: 1,
      name: "Speaker Blast",
      blurb: "A speaker lands and turns it up to eleven",
      sound: "hit_music",
      art: (
        <>
          <rect x="11" y="3" width="42" height="58" rx="6" fill="#1f2937" stroke="#0f172a" strokeWidth="2.5" />
          <circle cx="32" cy="40" r="14" fill="#374151" stroke="#36b7c8" strokeWidth="3" />
          <circle cx="32" cy="40" r="5.5" fill="#111827" stroke="#67e8f9" strokeWidth="2" />
          <circle cx="32" cy="16" r="7.5" fill="#374151" stroke="#f472b6" strokeWidth="2.5" />
          <circle cx="32" cy="16" r="2.6" fill="#111827" />
          <circle cx="17" cy="9" r="1.6" fill="#67e8f9" />
          <circle cx="47" cy="9" r="1.6" fill="#67e8f9" />
          <path d="M15 56h34" stroke="#36b7c8" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
        </>
      ),
      flight: { path: "arc", lift: 80, spin: 0, size: 58, trail: { shape: "note", colours: ["#36b7c8", "#f472b6", "#fde047"] } },
      impact: {
        item: "thump",
        flash: ["#ffffff", "#a5f3fc", "#36b7c8"],
        rings: ["#36b7c8", "#f472b6", "#fde047"],
        tint: "#36b7c8",
        bursts: [
          { shape: "note", colours: ["#36b7c8", "#f472b6", "#fde047", "#ffffff"], count: 18, reach: 105, size: 17 },
          { shape: "note", colours: ["#f472b6", "#67e8f9"], count: 8, reach: 80, size: 15, motion: "rise", delay: 0.35 },
        ],
        word: { text: "WUB WUB!", fill: "#a5f3fc", stroke: "#0f172a" },
        react: "wobble",
      },
    },
    {
      n: 2,
      name: "Mic Drop",
      blurb: "The mic drops from the sky. Show's over.",
      sound: "hit_bomb",
      art: (
        <>
          <rect x="27" y="30" width="10" height="31" rx="4" fill="#1f2937" stroke="#0f172a" strokeWidth="2.5" />
          <path d="M24 30h16l-2 6H26z" fill="#9ca3af" stroke="#0f172a" strokeWidth="2" strokeLinejoin="round" />
          <circle cx="32" cy="17" r="14" fill="#d1d5db" stroke="#0f172a" strokeWidth="2.5" />
          <path d="M20 13h24M19 19h26M21 25h22M25 7h14" stroke="#6b7280" strokeWidth="1.6" />
          <path d="M23 9c-3 2-5 5-5 8" stroke="#ffffff" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          <rect x="29" y="44" width="6" height="4" rx="1" fill="#36b7c8" />
        </>
      ),
      flight: { path: "sky", duration: 0.6, spin: 200, size: 60 },
      impact: {
        item: "smash",
        flash: ["#ffffff", "#f9a8d4", "#36b7c8"],
        rings: ["#36b7c8", "#f472b6", "#ffffff"],
        tint: "#f472b6",
        bursts: [
          { shape: "note", colours: ["#36b7c8", "#f472b6", "#fde047"], count: 16, reach: 100, size: 16 },
          { shape: "sparkle", colours: ["#ffffff", "#fde047"], count: 10, reach: 75, size: 10, motion: "fall", delay: 0.2 },
        ],
        stamp: { motion: "pop", size: 3, ratio: 0.6, dy: 1, hold: 1.1, art: <EqBars /> },
        word: { text: "MIC DROP!", fill: "#f9a8d4", stroke: "#0f172a" },
        react: "squash",
      },
    },
  ],
  pemberton: [
    {
      n: 1,
      name: "Tea Toast",
      blurb: "A fine cup of tea, raised to you — cheerio",
      sound: "hit_cheers",
      art: (
        <>
          <path d="M23 18c-3-4 3-6 0-12M33 18c-3-4 3-6 0-12" stroke="#cbd5e1" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          <ellipse cx="30" cy="53" rx="25" ry="6" fill="#ffffff" stroke="#432391" strokeWidth="2.5" />
          <path d="M47 30c9-3 12 9 2 13" stroke="#432391" strokeWidth="6" fill="none" strokeLinecap="round" />
          <path d="M47 30c9-3 12 9 2 13" stroke="#ffffff" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          <path d="M11 25h38c0 15-8 25-19 25S11 40 11 25z" fill="#ffffff" stroke="#432391" strokeWidth="2.5" strokeLinejoin="round" />
          <ellipse cx="30" cy="25" rx="19" ry="4" fill="#b45309" stroke="#432391" strokeWidth="2" />
          <path d="M14 33c7 2 25 2 32 0" stroke="#f0b93a" strokeWidth="2.5" fill="none" />
          <circle cx="30" cy="41" r="3" fill="#8d6be0" />
        </>
      ),
      flight: { path: "arc", lift: 70, spin: 10, size: 56, trail: { shape: "sparkle", colours: ["#f0b93a", "#ffffff"] } },
      impact: {
        item: "tilt",
        flash: ["#ffffff", "#ffe58a", "#8d6be0"],
        rings: ["#f0b93a", "#8d6be0"],
        tint: "#f0b93a",
        bursts: [
          { shape: "puff", colours: ["#ffffff", "#f1f5f9"], count: 8, reach: 75, size: 20, motion: "rise" },
          { shape: "sparkle", colours: ["#ffe58a", "#f0b93a", "#ffffff"], count: 14, reach: 85, size: 12 },
        ],
        word: { text: "CHEERIO!", fill: "#ffe58a", stroke: "#432391" },
        react: "wobble",
      },
    },
    {
      n: 2,
      name: "Glove Slap",
      blurb: "A gentleman's challenge: a white glove across the face",
      sound: "hit_whip",
      art: (
        <>
          <path d="M14 22c6-4 14-6 22-6v28c-8 0-16-2-22-6z" fill="#ffffff" stroke="#432391" strokeWidth="2.5" strokeLinejoin="round" />
          <rect x="31" y="13" width="23" height="8" rx="4" fill="#ffffff" stroke="#432391" strokeWidth="2.2" />
          <rect x="33" y="21" width="27" height="8" rx="4" fill="#ffffff" stroke="#432391" strokeWidth="2.2" />
          <rect x="33" y="29" width="25" height="8" rx="4" fill="#ffffff" stroke="#432391" strokeWidth="2.2" />
          <rect x="31" y="37" width="19" height="8" rx="4" fill="#ffffff" stroke="#432391" strokeWidth="2.2" />
          <path d="M20 27h9M20 32h9M20 37h9" stroke="#c9b9a2" strokeWidth="1.5" strokeLinecap="round" />
          <rect x="3" y="18" width="13" height="28" rx="3" fill="#6744c2" stroke="#432391" strokeWidth="2.5" />
          <circle cx="9.5" cy="32" r="2.4" fill="#f0b93a" />
        </>
      ),
      flight: { path: "straight", duration: 0.45, aim: 0, size: 58, trail: { shape: "sparkle", colours: ["#ffffff", "#8d6be0"] } },
      impact: {
        item: "pop",
        flash: ["#ffffff", "#ede9fe", "#6744c2"],
        rings: ["#8d6be0", "#f0b93a"],
        tint: "#6744c2",
        bursts: [
          { shape: "star", colours: ["#f0b93a", "#ffe58a", "#ffffff"], count: 14, reach: 90, size: 13 },
          { shape: "sparkle", colours: ["#8d6be0", "#ffffff"], count: 8, reach: 65, size: 10, delay: 0.15 },
        ],
        stamp: {
          motion: "pop",
          size: 1.6,
          hold: 1,
          art: (
            <svg viewBox="0 0 100 100" className="size-full" opacity="0.75" aria-hidden>
              <path d="M30 80c-8-14-10-40 0-54 4-6 12-4 12 4v18-30c0-8 12-8 12 0v30-34c0-8 12-8 12 0v34-28c0-8 12-8 12 0v42c0 20-14 32-30 32-8 0-14-4-18-14z" fill="#f87171" />
            </svg>
          ),
        },
        word: { text: "EN GARDE!", fill: "#ffe58a", stroke: "#432391" },
        react: "knock",
      },
    },
  ],
  flora: [
    {
      n: 1,
      name: "Bouquet Burst",
      blurb: "A bouquet that bursts into a storm of petals",
      sound: "hit_rose",
      art: (
        <>
          <path d="M32 60l-6-26M32 60l6-26M32 60V30" stroke="#3f8f2b" strokeWidth="2.5" />
          <path d="M24 46c-8-2-12 2-14 6 6 0 11-1 14-6zM40 46c8-2 12 2 14 6-6 0-11-1-14-6z" fill="#8fd14f" stroke="#3f8f2b" strokeWidth="1.5" />
          <path d="M17 34h30l-11 26h-8z" fill="#fde68a" stroke="#b45309" strokeWidth="2" strokeLinejoin="round" />
          <path d="M28 49l-8 4 2-8zM36 49l8 4-2-8z" fill="#ff7eb0" />
          <circle cx="32" cy="49" r="2.6" fill="#ff7eb0" />
          <Flower x={20} y={22} r={10} petal="#ff7eb0" centre="#fde047" />
          <Flower x={44} y={22} r={10} petal="#c4b5fd" centre="#fde047" />
          <Flower x={32} y={13} r={10} petal="#fde047" centre="#f97316" />
          <Flower x={26} y={31} r={8} petal="#ffffff" centre="#fde047" />
          <Flower x={38} y={31} r={8} petal="#fdba74" centre="#fde047" />
        </>
      ),
      flight: { path: "arc", lift: 100, spin: 25, size: 60, trail: { shape: "petal", colours: ["#ff7eb0", "#fde047", "#c4b5fd"] } },
      impact: {
        item: "pop",
        flash: ["#ffffff", "#fce7f3", "#8fd14f"],
        rings: ["#ff7eb0", "#8fd14f", "#fde047"],
        tint: "#ff7eb0",
        bursts: [
          { shape: "petal", colours: ["#ff7eb0", "#fde047", "#c4b5fd", "#ffffff", "#fdba74"], count: 24, reach: 115, size: 14, motion: "swirl" },
          { shape: "petal", colours: ["#ff7eb0", "#ffffff", "#c4b5fd"], count: 14, reach: 90, size: 12, motion: "fall", delay: 0.3 },
        ],
        word: { text: "BLOOM!", fill: "#fce7f3", stroke: "#3f8f2b" },
        react: "lift",
      },
    },
    {
      n: 2,
      name: "Spring Wreath",
      blurb: "A daisy spins in and a flower wreath grows round them",
      sound: "hit_sparkle",
      art: (
        <>
          <circle cx="32" cy="32" r="29" fill="#d9f99d" opacity="0.35" />
          {Array.from({ length: 12 }, (_, i) => (
            <ellipse key={i} cx="32" cy="15" rx="5" ry="12" fill="#ffffff" stroke="#a3a3a3" strokeWidth="1" transform={`rotate(${i * 30} 32 32)`} />
          ))}
          <circle cx="32" cy="32" r="9" fill="#fde047" stroke="#ca8a04" strokeWidth="1.6" />
          <circle cx="29" cy="31" r="1.4" fill="#713f12" />
          <circle cx="35" cy="31" r="1.4" fill="#713f12" />
          <path d="M29.5 35q2.5 2 5 0" stroke="#713f12" strokeWidth="1.4" fill="none" strokeLinecap="round" />
        </>
      ),
      flight: { path: "arc", lift: 90, spin: 720, size: 56, trail: { shape: "leaf", colours: ["#8fd14f", "#bef264"] } },
      impact: {
        item: "pop",
        flash: ["#ffffff", "#ecfccb", "#8fd14f"],
        rings: ["#8fd14f", "#ffffff"],
        tint: "#8fd14f",
        bursts: [
          { shape: "leaf", colours: ["#8fd14f", "#bef264", "#3f8f2b"], count: 14, reach: 95, size: 13, motion: "swirl" },
          { shape: "petal", colours: ["#ffffff", "#ff7eb0", "#fde047"], count: 12, reach: 80, size: 12, motion: "fall", delay: 0.35 },
        ],
        stamp: { motion: "draw", size: 2.9, hold: 1.2, art: <Wreath /> },
        word: { text: "SPRING!", fill: "#ecfccb", stroke: "#3f8f2b" },
        react: "lift",
      },
    },
  ],
}

/** Nova's atom (64×64); just the orbits for the stamp. */
function Atom({ orbitsOnly }: { orbitsOnly?: boolean }) {
  return (
    <>
      {[0, 60, -60].map((a) => (
        <g key={a} transform={`rotate(${a} 32 32)`}>
          <ellipse cx="32" cy="32" rx="28" ry="10" fill="none" stroke="#831843" strokeWidth="2.5" />
          <ellipse cx="32" cy="32" rx="28" ry="10" fill="none" stroke="#ff7eb0" strokeWidth="1.2" />
          <circle cx="60" cy="32" r="3.6" fill="#22d3ee" stroke="#0e7490" strokeWidth="1.2" />
        </g>
      ))}
      {!orbitsOnly && (
        <>
          <circle cx="32" cy="32" r="8" fill="#ff7eb0" stroke="#831843" strokeWidth="2.5" />
          <circle cx="29.5" cy="29.5" r="2.4" fill="#ffd1e3" />
        </>
      )}
    </>
  )
}

/** Equalizer bars that bounce (CSS, see flight.tsx). */
function EqBars() {
  const colours = ["#36b7c8", "#f472b6", "#fde047", "#36b7c8", "#f472b6", "#fde047", "#36b7c8"]
  return (
    <svg viewBox="0 0 100 60" className="size-full" aria-hidden>
      {colours.map((c, i) => (
        <rect
          key={i}
          className="cstk-eq"
          x={4 + i * 13.5}
          y="4"
          width="10"
          height="54"
          rx="3"
          fill={c}
          style={{ animationDelay: `${(i % 4) * -0.11}s` }}
        />
      ))}
    </svg>
  )
}

/** A vine circle with flowers popping open along it. */
function Wreath() {
  const flowers = [0, 45, 90, 135, 180, 225, 270, 315]
  return (
    <svg viewBox="0 0 100 100" className="size-full" aria-hidden>
      <circle data-draw pathLength={1} cx="50" cy="50" r="42" fill="none" stroke="#3f8f2b" strokeWidth="5" transform="rotate(-90 50 50)" />
      {flowers.map((a, i) => {
        const x = 50 + Math.cos((a * Math.PI) / 180) * 42
        const y = 50 + Math.sin((a * Math.PI) / 180) * 42
        return (
          <g key={a} className="cstk-bloom" style={{ animationDelay: `${0.25 + i * 0.06}s`, transformOrigin: `${x.toFixed(1)}px ${y.toFixed(1)}px` }}>
            <path d={`M${x.toFixed(1)} ${y.toFixed(1)}c-6-4-10-2-12 2 5 1 9 1 12-2z`} fill="#8fd14f" transform={`rotate(${a + 60} ${x.toFixed(1)} ${y.toFixed(1)})`} />
            <Flower x={x} y={y} r={8} petal={["#ff7eb0", "#ffffff", "#fde047", "#c4b5fd"][i % 4]} centre="#f97316" />
          </g>
        )
      })}
    </svg>
  )
}
