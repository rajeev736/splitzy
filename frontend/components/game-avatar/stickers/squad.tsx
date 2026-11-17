import { FlameRing, Rays, SmokeCloud } from "./stamps"
import type { CharSticker } from "./types"

/** Two signature stickers for each squad mascot (packs/squad). */
export const SQUAD_STICKERS: Record<string, CharSticker[]> = {
  fuzzby: [
    {
      n: 1,
      name: "Cuddle Bounce",
      blurb: "A fluffy heart bounces over for a big boop",
      sound: "hit_boing",
      art: (
        <>
          <path d="M32 57S5 41 5 22C5 12 13 6 22 6c5 0 8 3 10 6 2-3 5-6 10-6 9 0 17 6 17 16 0 19-27 35-27 35z" fill="#8b9cff" stroke="#3b2fa8" strokeWidth="2.5" />
          <path d="M17 14c-5 2-7 7-6 12" stroke="#fff" strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.85" />
          <ellipse cx="24" cy="30" rx="3.6" ry="4.2" fill="#3b2fa8" />
          <ellipse cx="40" cy="30" rx="3.6" ry="4.2" fill="#3b2fa8" />
          <circle cx="25.2" cy="28.6" r="1.4" fill="#fff" />
          <circle cx="41.2" cy="28.6" r="1.4" fill="#fff" />
          <path d="M28 37q4 4 8 0" stroke="#3b2fa8" strokeWidth="2" fill="none" strokeLinecap="round" />
          <circle cx="18.5" cy="37" r="3" fill="#f9a8d4" />
          <circle cx="45.5" cy="37" r="3" fill="#f9a8d4" />
        </>
      ),
      flight: { path: "bounce", size: 58, trail: { shape: "heart", colours: ["#f9a8d4", "#8b9cff"] } },
      impact: {
        item: "smash",
        flash: ["#ffffff", "#fbcfe8", "#8b9cff"],
        rings: ["#f9a8d4", "#8b9cff", "#ffffff"],
        tint: "#f472b6",
        bursts: [
          { shape: "heart", colours: ["#f472b6", "#f9a8d4", "#8b9cff", "#ffffff"], count: 18, reach: 95, size: 16 },
          { shape: "heart", colours: ["#f472b6", "#8b9cff"], count: 6, reach: 70, size: 20, motion: "rise", delay: 0.25 },
        ],
        stamp: {
          motion: "pop",
          size: 3.2,
          hold: 0.9,
          art: (
            <svg viewBox="0 0 100 100" className="size-full" aria-hidden>
              <path
                d="M50 90S8 66 8 36C8 20 20 10 33 10c8 0 13 5 17 10 4-5 9-10 17-10 13 0 25 10 25 26 0 30-42 54-42 54z"
                fill="none"
                stroke="#f472b6"
                strokeWidth="6"
                strokeLinejoin="round"
              />
              <path
                d="M50 90S8 66 8 36C8 20 20 10 33 10c8 0 13 5 17 10 4-5 9-10 17-10 13 0 25 10 25 26 0 30-42 54-42 54z"
                fill="#f9a8d4"
                fillOpacity="0.18"
                stroke="#ffffff"
                strokeWidth="2"
                strokeDasharray="2 6"
                strokeLinecap="round"
              />
            </svg>
          ),
        },
        word: { text: "BOOP!", fill: "#fbcfe8", stroke: "#3b2fa8" },
        react: "squash",
      },
    },
    {
      n: 2,
      name: "Starry Eyes",
      blurb: "A giant twinkle star showers them in glitter",
      sound: "hit_sparkle",
      art: (
        <>
          <circle cx="32" cy="32" r="28" fill="#c7d2fe" opacity="0.35" />
          <path d="M32 2l7 21 21 9-21 9-7 21-7-21-21-9 21-9z" fill="#fde68a" stroke="#3b2fa8" strokeWidth="2.5" strokeLinejoin="round" />
          <path d="M32 12l4 13 13 7-13 4-4 14-4-14-13-4 13-7z" fill="#fff7d6" />
          <ellipse cx="27.5" cy="31" rx="2.6" ry="3.4" fill="#3b2fa8" />
          <ellipse cx="36.5" cy="31" rx="2.6" ry="3.4" fill="#3b2fa8" />
          <circle cx="28.4" cy="30" r="1" fill="#fff" />
          <circle cx="37.4" cy="30" r="1" fill="#fff" />
          <path d="M29.5 37q2.5 2.5 5 0" stroke="#3b2fa8" strokeWidth="1.6" fill="none" strokeLinecap="round" />
          <circle cx="52" cy="10" r="2.5" fill="#fff" />
          <circle cx="11" cy="52" r="2" fill="#fff" />
        </>
      ),
      flight: { path: "loop", lift: 70, spin: 360, size: 62, trail: { shape: "sparkle", colours: ["#fde68a", "#c7d2fe", "#ffffff"] } },
      impact: {
        item: "pop",
        flash: ["#ffffff", "#fde68a", "#8b9cff"],
        rings: ["#fde68a", "#c7d2fe", "#f9a8d4"],
        tint: "#8b9cff",
        bursts: [
          { shape: "sparkle", colours: ["#fde68a", "#ffffff", "#c7d2fe", "#f9a8d4"], count: 20, reach: 105, size: 13 },
          { shape: "star", colours: ["#fde68a", "#c7d2fe", "#ffffff"], count: 14, reach: 90, size: 10, motion: "fall", delay: 0.2 },
        ],
        stamp: { motion: "spin", size: 3.4, hold: 0.9, art: <Rays colour="#fde68a" count={16} /> },
        word: { text: "SO CUTE!", fill: "#fde68a", stroke: "#3b2fa8" },
        react: "lift",
      },
    },
  ],
  zenko: [
    {
      n: 1,
      name: "Shuriken Volley",
      blurb: "Three steel stars — thunk, thunk, thunk",
      sound: "hit_knife",
      art: (
        <>
          <path d="M32 3Q37 26 61 32Q37 38 32 61Q27 38 3 32Q27 26 32 3Z" fill="#cbd5e1" stroke="#334155" strokeWidth="2.5" strokeLinejoin="round" />
          <path d="M32 11Q34 27 36 30M53 32Q37 34 34 36M32 53Q30 37 28 34M11 32Q27 30 30 28" stroke="#fff" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.85" />
          <circle cx="32" cy="32" r="7.5" fill="#64748b" stroke="#e2e8f0" strokeWidth="2.5" />
          <circle cx="32" cy="32" r="3" fill="#0f172a" />
        </>
      ),
      flight: { path: "straight", duration: 0.5, spin: 1440, size: 40, count: 3, trail: { shape: "dot", colours: ["#e2e8f0", "#f5b800"] } },
      impact: {
        item: "stick",
        flash: ["#ffffff", "#fef3c7", "#f5b800"],
        rings: ["#f5b800", "#e2e8f0"],
        tint: "#1b1747",
        bursts: [
          { shape: "sparkle", colours: ["#ffffff", "#e2e8f0", "#f5b800"], count: 14, reach: 70, size: 11 },
          { shape: "leaf", colours: ["#f5b800", "#84cc16"], count: 8, reach: 90, size: 12, motion: "swirl", delay: 0.2 },
        ],
        word: { text: "SHING!", fill: "#f5b800", stroke: "#1b1747" },
        react: "shake",
      },
    },
    {
      n: 2,
      name: "Smoke Bomb",
      blurb: "Poof — they vanish in ninja smoke and leaves",
      sound: "hit_poof",
      art: (
        <>
          <circle cx="30" cy="37" r="21" fill="#312e81" stroke="#1b1747" strokeWidth="2.5" />
          <path d="M9.5 33h41v7h-41z" fill="#f5b800" />
          <circle cx="30" cy="36.5" r="5" fill="#1b1747" stroke="#f5b800" strokeWidth="2" />
          <ellipse cx="22" cy="26" rx="5" ry="3.5" fill="#6366f1" opacity="0.7" transform="rotate(-25 22 26)" />
          <path d="M41 20c4-6 9-7 12-4" stroke="#a16207" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          <circle cx="54" cy="14" r="4.5" fill="#fde047" />
          <circle cx="54" cy="14" r="2" fill="#fff" />
          <path d="M54 5v3M61 14h-3M59 8l-2 2M49 8l2 2" stroke="#f97316" strokeWidth="1.6" strokeLinecap="round" />
        </>
      ),
      flight: { path: "arc", lift: 100, spin: 540, size: 52, trail: { shape: "puff", colours: ["#a5b4fc", "#64748b"] } },
      impact: {
        item: "smash",
        flash: ["#ffffff", "#c7d2fe", "#312e81"],
        rings: ["#a5b4fc", "#f5b800"],
        tint: "#312e81",
        bursts: [
          { shape: "puff", colours: ["#94a3b8", "#a5b4fc", "#cbd5e1", "#64748b"], count: 14, reach: 90, size: 26, motion: "swirl" },
          { shape: "leaf", colours: ["#f5b800", "#84cc16", "#fde047"], count: 12, reach: 100, size: 13, motion: "swirl", delay: 0.3 },
        ],
        stamp: { motion: "grow", size: 3.6, hold: 0.8, art: <SmokeCloud colour="#cbd5e1" shade="#a5b4fc" /> },
        word: { text: "POOF!", fill: "#e0e7ff", stroke: "#1b1747" },
        react: "flicker",
      },
    },
  ],
  fizzwick: [
    {
      n: 1,
      name: "Zap Gun",
      blurb: "Bzzt — a crackling bolt from his bubbling zap gun",
      sound: "hit_zap",
      art: (
        <>
          <path d="M14 38l-3 17h10l3-15" fill="#a16207" stroke="#0b4d31" strokeWidth="2.5" strokeLinejoin="round" />
          <path d="M5 31c0-6 4-11 11-11h18l6 4h8v13h-8l-6 4H16c-7 0-11-4-11-10z" fill="#7cc520" stroke="#0b4d31" strokeWidth="2.5" strokeLinejoin="round" />
          <rect x="47" y="26" width="7" height="9" fill="#cbd5e1" stroke="#0b4d31" strokeWidth="2" />
          <circle cx="58" cy="30.5" r="5" fill="#fef08a" stroke="#0b4d31" strokeWidth="2" />
          <circle cx="22" cy="17" r="7" fill="#d9f99d" fillOpacity="0.85" stroke="#0b4d31" strokeWidth="2" />
          <circle cx="20" cy="15" r="2" fill="#fff" />
          <path d="M12 28h22" stroke="#d9f99d" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M60 18l-3 6h4l-3 6" stroke="#fde047" strokeWidth="2" fill="none" strokeLinejoin="round" />
        </>
      ),
      flight: { path: "beam", aim: 0, beam: { glow: "#a3e635", core: "#fefce8", jagged: true } },
      impact: {
        item: "pop",
        flash: ["#ffffff", "#fef08a", "#7cc520"],
        rings: ["#d9f99d", "#fef08a", "#7cc520"],
        tint: "#a3e635",
        bursts: [
          { shape: "bolt", colours: ["#fde047", "#d9f99d", "#ffffff"], count: 16, reach: 95, size: 15 },
          { shape: "dot", colours: ["#7cc520", "#fef08a"], count: 10, reach: 60, size: 7, delay: 0.15 },
        ],
        stamp: {
          motion: "spin",
          size: 3,
          hold: 0.8,
          art: (
            <svg viewBox="0 0 100 100" className="size-full" aria-hidden>
              <path
                d="M50 6l8 14 15-8-1 17 17 1-9 14 13 10-15 6 6 16-16-3-3 17-12-11-12 11-3-17-16 3 6-16-15-6 13-10-9-14 17-1-1-17 15 8z"
                fill="none"
                stroke="#fde047"
                strokeWidth="4"
                strokeLinejoin="round"
              />
              <path
                d="M50 6l8 14 15-8-1 17 17 1-9 14 13 10-15 6 6 16-16-3-3 17-12-11-12 11-3-17-16 3 6-16-15-6 13-10-9-14 17-1-1-17 15 8z"
                fill="none"
                stroke="#ffffff"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
            </svg>
          ),
        },
        word: { text: "ZZZAP!", fill: "#fef08a", stroke: "#0b4d31" },
        react: "flicker",
      },
    },
    {
      n: 2,
      name: "Potion Fizz",
      blurb: "A bubbling potion smashes into a fizzing green cloud",
      sound: "hit_water",
      art: (
        <>
          <rect x="26" y="6" width="12" height="13" rx="2" fill="#e2e8f0" fillOpacity="0.8" stroke="#0b4d31" strokeWidth="2.5" />
          <rect x="24" y="2" width="16" height="6" rx="2" fill="#a16207" stroke="#0b4d31" strokeWidth="2" />
          <circle cx="32" cy="39" r="21" fill="#ecfeff" fillOpacity="0.65" stroke="#0b4d31" strokeWidth="2.5" />
          <path d="M12 41a20 20 0 0 0 40 0c-6-3-13 3-20 0s-14-3-20 0z" fill="#84cc16" />
          <circle cx="25" cy="48" r="3.2" fill="#d9f99d" />
          <circle cx="37" cy="52" r="2.2" fill="#d9f99d" />
          <circle cx="34" cy="31" r="2.6" fill="#bef264" />
          <circle cx="28" cy="23" r="1.8" fill="#bef264" />
          <path d="M19 32a15 15 0 0 1 6-9" stroke="#fff" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        </>
      ),
      flight: { path: "arc", lift: 110, spin: 450, size: 56, trail: { shape: "bubble", colours: ["#bef264", "#d9f99d"] } },
      impact: {
        item: "smash",
        flash: ["#ffffff", "#d9f99d", "#65a30d"],
        rings: ["#bef264", "#7cc520"],
        tint: "#84cc16",
        bursts: [
          { shape: "shard", colours: ["#ecfeff", "#ffffff"], count: 8, reach: 60, size: 9 },
          { shape: "drop", colours: ["#84cc16", "#bef264"], count: 10, reach: 75, size: 11 },
          { shape: "bubble", colours: ["#bef264", "#d9f99d", "#7cc520", "#ffffff"], count: 16, reach: 100, size: 16, motion: "rise", delay: 0.1 },
        ],
        stamp: { motion: "grow", size: 3.2, hold: 0.7, art: <SmokeCloud colour="#d9f99d" shade="#bef264" /> },
        word: { text: "FIZZ!", fill: "#d9f99d", stroke: "#0b4d31" },
        react: "wobble",
      },
    },
  ],
  cinder: [
    {
      n: 1,
      name: "Fireball",
      blurb: "A roaring fireball that explodes into a ring of flames",
      sound: "hit_fire",
      art: (
        <>
          <path d="M1 32c10-13 23-19 35-17-6 4-6 6-4 8-8 0-14 4-18 9 4 0 10 2 14 6-4 0-8 4-10 6C12 40 6 36 1 32z" fill="#fb923c" opacity="0.9" />
          <path d="M8 32c8-7 16-10 26-10-4 3-4 5-2 6-6 1-10 3-12 5 3 0 7 1 10 4-8 1-15-1-22-5z" fill="#fde047" opacity="0.85" />
          <circle cx="42" cy="32" r="18" fill="#ef4444" />
          <circle cx="44" cy="31" r="13" fill="#f97316" />
          <circle cx="46" cy="30" r="8" fill="#fbbf24" />
          <circle cx="47" cy="29" r="4" fill="#fef9c3" />
        </>
      ),
      flight: { path: "arc", lift: 70, aim: 0, duration: 0.85, size: 64, trail: { shape: "flame", colours: ["#f97316", "#fbbf24", "#ef4444"] } },
      impact: {
        item: "pop",
        flash: ["#fff7ae", "#f97316", "#b91c1c"],
        rings: ["#fbbf24", "#f97316", "#ef4444"],
        tint: "#f97316",
        bursts: [
          { shape: "flame", colours: ["#ef4444", "#f97316", "#fbbf24", "#fde047"], count: 22, reach: 110, size: 18 },
          { shape: "dot", colours: ["#fde047", "#fb923c"], count: 12, reach: 80, size: 6, motion: "rise", delay: 0.2 },
        ],
        stamp: { motion: "grow", size: 3.6, hold: 0.9, art: <FlameRing outer="#f97316" inner="#fde047" /> },
        word: { text: "KA-BOOM!", fill: "#fde047", stroke: "#7f1d1d" },
        react: "shake",
      },
    },
    {
      n: 2,
      name: "Ghost Pepper",
      blurb: "One bite and their head's on fire — SPICY!",
      sound: "hit_fire",
      art: (
        <>
          <path d="M44 12c-2-6 2-10 8-10" stroke="#15803d" strokeWidth="4" fill="none" strokeLinecap="round" />
          <path d="M36 14c6-4 14-2 16 4 2 6-2 14-10 22-8 8-20 14-33 16 4-4 8-10 10-18 4-14 11-21 17-24z" fill="#e5322d" stroke="#7f1d1d" strokeWidth="2.5" strokeLinejoin="round" />
          <path d="M35 13c4 3 9 3 14-1" stroke="#15803d" strokeWidth="5" strokeLinecap="round" fill="none" />
          <path d="M31 23c-4 8-8 16-14 22" stroke="#fca5a5" strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.75" />
          <path d="M14 58c-3-4-1-7 2-9 0 3 2 3 3 2 1 3-1 7-5 7zM8 50c-2-3 0-5 2-6 0 2 1 2 2 1 1 2-1 5-4 5z" fill="#fbbf24" />
        </>
      ),
      flight: { path: "arc", lift: 100, spin: 400, size: 56, trail: { shape: "flame", colours: ["#ef4444", "#fbbf24"] } },
      impact: {
        item: "smash",
        flash: ["#fff7ae", "#ef4444", "#7f1d1d"],
        rings: ["#ef4444", "#fbbf24"],
        tint: "#e5322d",
        bursts: [
          { shape: "flame", colours: ["#ef4444", "#f97316", "#fde047"], count: 14, reach: 85, size: 18, motion: "rise" },
          { shape: "puff", colours: ["#ffffff", "#f1f5f9"], count: 8, reach: 70, size: 20, motion: "rise", delay: 0.25 },
        ],
        stamp: {
          motion: "grow",
          size: 2.6,
          ratio: 1.3,
          dy: -0.9,
          hold: 1,
          art: (
            <svg viewBox="0 0 100 130" className="size-full" aria-hidden>
              <path d="M50 2C58 30 92 44 92 84a42 42 0 0 1-84 0c0-22 14-32 20-46 6 12 12 16 16 16-6-18 0-38 6-52z" fill="#ef4444" />
              <path d="M50 34c4 16 26 26 26 52a26 26 0 0 1-52 0c0-12 8-20 12-28 4 6 6 10 10 10-4-12 0-24 4-34z" fill="#f97316" />
              <path d="M50 66c3 8 14 14 14 26a14 14 0 0 1-28 0c0-8 6-12 8-16 2 4 3 5 5 5-1-6 0-10 1-15z" fill="#fde047" />
            </svg>
          ),
        },
        word: { text: "SPICY!", fill: "#fde047", stroke: "#7f1d1d" },
        react: "shake",
      },
    },
  ],
  bijou: [
    {
      n: 1,
      name: "Hair Flip",
      blurb: "A glossy hair flip, sparkles and a very pointed hmph",
      sound: "hit_sparkle",
      art: (
        <>
          <path d="M9 52C7 28 22 7 45 5c9 0 15 4 13 8-14-4-29 6-31 22-1 8 2 14 8 18-10 4-21 3-26-1z" fill="#ec4899" stroke="#7a0f45" strokeWidth="2.5" strokeLinejoin="round" />
          <path d="M17 45C15 30 26 16 42 11" stroke="#f9a8d4" strokeWidth="3" fill="none" strokeLinecap="round" />
          <path d="M24 47c-2-8 2-18 10-24" stroke="#be185d" strokeWidth="2" fill="none" strokeLinecap="round" />
          <path d="M50 30l2.5 7.5L60 40l-7.5 2.5L50 50l-2.5-7.5L40 40l7.5-2.5z" fill="#fde68a" stroke="#7a0f45" strokeWidth="1.2" />
          <circle cx="57" cy="23" r="2.2" fill="#fff" />
          <circle cx="42" cy="54" r="1.8" fill="#fff" />
        </>
      ),
      flight: { path: "loop", lift: 60, size: 58, trail: { shape: "sparkle", colours: ["#f9a8d4", "#fde68a", "#ffffff"] } },
      impact: {
        item: "pop",
        flash: ["#ffffff", "#fbcfe8", "#d63bb5"],
        rings: ["#f9a8d4", "#fde68a"],
        tint: "#d63bb5",
        bursts: [
          { shape: "sparkle", colours: ["#fde68a", "#ffffff", "#f9a8d4"], count: 16, reach: 95, size: 14 },
          { shape: "heart", colours: ["#ec4899", "#f9a8d4", "#7a0f45"], count: 9, reach: 80, size: 16, motion: "rise", delay: 0.2 },
        ],
        word: { text: "HMPH!", fill: "#fbcfe8", stroke: "#7a0f45" },
        react: "knock",
      },
    },
    {
      n: 2,
      name: "Diamond Diva",
      blurb: "A flawless pink diamond — and a tiara, darling",
      sound: "hit_cheers",
      art: (
        <>
          <circle cx="32" cy="32" r="28" fill="#fbcfe8" opacity="0.35" />
          <path d="M13 23l10-13h18l10 13-19 33z" fill="#f472b6" stroke="#7a0f45" strokeWidth="2.5" strokeLinejoin="round" />
          <path d="M23 10l-10 13h10zM41 10l10 13H41z" fill="#fbcfe8" />
          <path d="M23 10l9 13 9-13z" fill="#f9a8d4" />
          <path d="M13 23h38M23 10l0 13 9 33M41 10v13l-9 33M23 23l9-13 9 13" stroke="#7a0f45" strokeWidth="1.5" fill="none" strokeLinejoin="round" />
          <path d="M18 27l10 18" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" opacity="0.75" />
          <path d="M52 4l1.6 4.4L58 10l-4.4 1.6L52 16l-1.6-4.4L46 10l4.4-1.6z" fill="#fff" />
        </>
      ),
      flight: { path: "arc", lift: 90, spin: 720, size: 56, trail: { shape: "shard", colours: ["#f9a8d4", "#ffffff"] } },
      impact: {
        item: "pop",
        flash: ["#ffffff", "#fbcfe8", "#ec4899"],
        rings: ["#f472b6", "#ffffff", "#fde68a"],
        tint: "#ec4899",
        bursts: [
          { shape: "shard", colours: ["#f472b6", "#fbcfe8", "#ffffff"], count: 16, reach: 100, size: 12 },
          { shape: "dot", colours: ["#fffbeb", "#ffffff"], count: 10, reach: 70, size: 7, delay: 0.1 },
          { shape: "sparkle", colours: ["#fde68a", "#ffffff"], count: 8, reach: 60, size: 11, motion: "rise", delay: 0.3 },
        ],
        stamp: {
          motion: "drop",
          size: 1.6,
          ratio: 0.6,
          dy: -1.05,
          hold: 1,
          art: (
            <svg viewBox="0 0 100 60" className="size-full" aria-hidden>
              <path d="M8 54L4 22l18 14 12-26 16 20 16-20 12 26 18-14-4 32z" fill="#fde68a" stroke="#7a0f45" strokeWidth="3" strokeLinejoin="round" />
              <circle cx="50" cy="38" r="7" fill="#f472b6" stroke="#7a0f45" strokeWidth="2" />
              <circle cx="27" cy="42" r="4" fill="#ffffff" />
              <circle cx="73" cy="42" r="4" fill="#ffffff" />
              <circle cx="34" cy="10" r="3.5" fill="#f472b6" />
              <circle cx="66" cy="10" r="3.5" fill="#f472b6" />
            </svg>
          ),
        },
        word: { text: "BLING!", fill: "#fde68a", stroke: "#7a0f45" },
        react: "lift",
      },
    },
  ],
}
