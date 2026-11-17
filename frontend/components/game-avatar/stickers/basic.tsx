import { ComicBurst, Flower } from "./stamps"
import type { CharSticker } from "./types"

/** One signature sticker for each free character (packs/basic). */
export const BASIC_STICKERS: Record<string, CharSticker[]> = {
  foxy: [
    {
      n: 1,
      name: "Foxfire",
      blurb: "A kitsune flame that bursts into teal spirit fire",
      sound: "hit_sparkle",
      art: (
        <>
          <circle cx="32" cy="40" r="22" fill="#5eead4" opacity="0.3" />
          <path d="M32 4c3 10 17 15 17 31a17 17 0 0 1-34 0c0-8 5-12 7-17 2 5 4 7 6 7-2-7 1-15 4-21z" fill="#14b8a6" />
          <path d="M32 20c2 6 10 10 10 18a10 10 0 0 1-20 0c0-4 3-7 4-9 1 2 2 3 3 3-1-4 1-9 3-12z" fill="#99f6e4" />
          <circle cx="32" cy="42" r="4.5" fill="#fff" />
          <path d="M14 18l2 4 4 2-4 2-2 4-2-4-4-2 4-2zM52 12l1.5 3 3 1.5-3 1.5-1.5 3-1.5-3-3-1.5 3-1.5z" fill="#ccfbf1" />
        </>
      ),
      flight: { path: "arc", lift: 80, spin: 0, trail: { shape: "flame", colours: ["#2dd4bf", "#99f6e4", "#14b8a6"] } },
      impact: {
        item: "pop",
        flash: ["#ffffff", "#5eead4", "#0d9488"],
        rings: ["#5eead4", "#ccfbf1"],
        tint: "#2dd4bf",
        bursts: [
          { shape: "flame", colours: ["#2dd4bf", "#5eead4", "#99f6e4", "#0d9488"], count: 16, reach: 90, size: 16, motion: "swirl" },
          { shape: "sparkle", colours: ["#ffffff", "#ccfbf1"], count: 8, reach: 60, size: 10, motion: "rise", delay: 0.15 },
        ],
        word: { text: "KON KON!", fill: "#ccfbf1", stroke: "#115e59" },
        react: "flicker",
      },
    },
  ],
  bao: [
    {
      n: 1,
      name: "Bao Bun",
      blurb: "A steamy dumpling, delivered with a squish",
      sound: "hit_boing",
      art: (
        <>
          <path d="M22 14c-2-4 2-6 0-10M32 12c-2-4 2-6 0-10M42 14c-2-4 2-6 0-10" stroke="#cbd5e1" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          <path d="M7 44c0-16 11-26 25-26s25 10 25 26c0 6-7 11-25 11S7 50 7 44z" fill="#fffaf0" stroke="#d6c7ad" strokeWidth="2.5" />
          <path d="M32 20c-2 6-2 10 0 14M32 34c-6-2-10-6-12-10M32 34c6-2 10-6 12-10M32 34c-8 0-13 2-16 4M32 34c8 0 13 2 16 4" stroke="#e2d3bc" strokeWidth="2" fill="none" strokeLinecap="round" />
          <circle cx="32" cy="34" r="3" fill="#ecd9b6" />
          <ellipse cx="19" cy="30" rx="5" ry="3" fill="#fff" />
          <circle cx="24" cy="44" r="1.8" fill="#3f3f46" />
          <circle cx="40" cy="44" r="1.8" fill="#3f3f46" />
          <path d="M29 47q3 2.5 6 0" stroke="#3f3f46" strokeWidth="1.6" fill="none" strokeLinecap="round" />
          <circle cx="19" cy="47" r="2.8" fill="#fda4af" opacity="0.75" />
          <circle cx="45" cy="47" r="2.8" fill="#fda4af" opacity="0.75" />
        </>
      ),
      flight: { path: "arc", lift: 110, spin: 30, trail: { shape: "puff", colours: ["#f8fafc", "#e2e8f0"] } },
      impact: {
        item: "smash",
        flash: ["#ffffff", "#ecfccb", "#a3e635"],
        rings: ["#d9f99d"],
        bursts: [
          { shape: "puff", colours: ["#ffffff", "#f1f5f9", "#e2e8f0"], count: 10, reach: 70, size: 22, motion: "rise" },
          { shape: "dot", colours: ["#fffaf0", "#ecd9b6"], count: 10, reach: 55, size: 8 },
        ],
        word: { text: "NOM!", fill: "#d9f99d", stroke: "#365314" },
        react: "squash",
      },
    },
  ],
  hoppy: [
    {
      n: 1,
      name: "Royal Ribbit",
      blurb: "A crown hops over and crowns them — ribbit",
      sound: "hit_boing",
      art: (
        <>
          <path d="M8 46L4 18l16 12 12-20 12 20 16-12-4 28z" fill="#fcd34d" stroke="#b45309" strokeWidth="2.5" strokeLinejoin="round" />
          <rect x="8" y="45" width="48" height="10" rx="3" fill="#f59e0b" stroke="#b45309" strokeWidth="2.5" />
          <circle cx="32" cy="37" r="5" fill="#ff7ab6" stroke="#be185d" strokeWidth="1.5" />
          <circle cx="18" cy="40" r="3" fill="#4ade80" stroke="#166534" strokeWidth="1" />
          <circle cx="46" cy="40" r="3" fill="#4ade80" stroke="#166534" strokeWidth="1" />
          <circle cx="4" cy="18" r="3.2" fill="#fde68a" stroke="#b45309" strokeWidth="1.2" />
          <circle cx="32" cy="10" r="3.2" fill="#fde68a" stroke="#b45309" strokeWidth="1.2" />
          <circle cx="60" cy="18" r="3.2" fill="#fde68a" stroke="#b45309" strokeWidth="1.2" />
          <path d="M14 24l4 16" stroke="#fff7d6" strokeWidth="2.2" strokeLinecap="round" opacity="0.8" />
        </>
      ),
      flight: { path: "bounce", size: 52, trail: { shape: "sparkle", colours: ["#fde68a", "#ff7ab6"] } },
      impact: {
        item: "land",
        flash: ["#ffffff", "#fde68a", "#ff7ab6"],
        rings: ["#ff7ab6", "#fde68a"],
        bursts: [
          { shape: "sparkle", colours: ["#fde68a", "#fbbf24", "#ffffff"], count: 14, reach: 80, size: 14 },
          { shape: "heart", colours: ["#ff7ab6", "#f9a8d4"], count: 5, reach: 60, size: 14, motion: "rise", delay: 0.2 },
        ],
        word: { text: "RIBBIT!", fill: "#86efac", stroke: "#14532d" },
        react: "lift",
      },
    },
  ],
  waddles: [
    {
      n: 1,
      name: "Ice Cold",
      blurb: "A snowball that freezes them in a ring of frost",
      sound: "hit_ice",
      art: (
        <>
          <circle cx="32" cy="34" r="23" fill="#f8fafc" stroke="#93c5fd" strokeWidth="2.5" />
          <path d="M13 40c6 9 24 13 37 2" stroke="#dbeafe" strokeWidth="4.5" fill="none" strokeLinecap="round" />
          <circle cx="24" cy="25" r="6.5" fill="#fff" />
          <circle cx="41" cy="23" r="2.5" fill="#bfdbfe" />
          <circle cx="37" cy="45" r="3" fill="#bfdbfe" />
          <circle cx="21" cy="41" r="2" fill="#bfdbfe" />
          <path d="M50 8v10M45 13h10M46.5 9.5l7 7M53.5 9.5l-7 7" stroke="#7dd3fc" strokeWidth="1.8" strokeLinecap="round" />
        </>
      ),
      flight: { path: "arc", lift: 90, spin: 540, trail: { shape: "snow", colours: ["#e0f2fe", "#7dd3fc"] } },
      impact: {
        item: "smash",
        flash: ["#ffffff", "#e0f2fe", "#38bdf8"],
        rings: ["#bae6fd", "#ffffff"],
        tint: "#7dd3fc",
        bursts: [
          { shape: "snow", colours: ["#ffffff", "#bae6fd", "#7dd3fc"], count: 16, reach: 85, size: 14, motion: "swirl" },
          { shape: "shard", colours: ["#e0f2fe", "#ffffff"], count: 10, reach: 55, size: 10 },
        ],
        stamp: {
          motion: "grow",
          size: 3,
          hold: 0.9,
          art: (
            <svg viewBox="0 0 100 100" className="size-full" aria-hidden>
              <circle cx="50" cy="50" r="40" fill="#e0f2fe" fillOpacity="0.25" stroke="#bae6fd" strokeWidth="6" />
              <circle cx="50" cy="50" r="40" fill="none" stroke="#ffffff" strokeWidth="2" strokeDasharray="3 7" />
              {Array.from({ length: 8 }, (_, i) => (
                <path key={i} d="M50 2l5 12-5 6-5-6z" fill={i % 2 ? "#ffffff" : "#bae6fd"} stroke="#7dd3fc" strokeWidth="1" transform={`rotate(${i * 45} 50 50)`} />
              ))}
            </svg>
          ),
        },
        word: { text: "BRRR!", fill: "#e0f2fe", stroke: "#1e40af" },
        react: "shake",
      },
    },
  ],
  sheru: [
    {
      n: 1,
      name: "Tiger Claw",
      blurb: "A roar and a swipe that leaves three stripes",
      sound: "hit_roar",
      art: (
        <>
          <path d="M11 16l2-9 3 9M22 9l3-8 2 8M37 9l2-8 3 8M48 16l3-9 2 9" fill="#fff" stroke="#7c2d12" strokeWidth="1.6" strokeLinejoin="round" />
          <ellipse cx="32" cy="43" rx="16" ry="14" fill="#ff9f1c" stroke="#7c2d12" strokeWidth="2.5" />
          <ellipse cx="14" cy="25" rx="6.5" ry="8" fill="#ff9f1c" stroke="#7c2d12" strokeWidth="2.5" />
          <ellipse cx="25" cy="17" rx="6.5" ry="8" fill="#ff9f1c" stroke="#7c2d12" strokeWidth="2.5" />
          <ellipse cx="39" cy="17" rx="6.5" ry="8" fill="#ff9f1c" stroke="#7c2d12" strokeWidth="2.5" />
          <ellipse cx="50" cy="25" rx="6.5" ry="8" fill="#ff9f1c" stroke="#7c2d12" strokeWidth="2.5" />
          <ellipse cx="32" cy="46" rx="9" ry="7" fill="#fde7c8" />
          <path d="M18 36l6 3M46 36l-6 3M20 52l5-2M44 52l-5-2" stroke="#3b1d0e" strokeWidth="2.5" strokeLinecap="round" />
        </>
      ),
      flight: { path: "straight", duration: 0.42, aim: -90, size: 56, trail: { shape: "dot", colours: ["#ff9f1c", "#fde7c8"] } },
      impact: {
        item: "pop",
        flash: ["#fff7ed", "#fb923c", "#9775fa"],
        rings: ["#ff9f1c", "#9775fa"],
        tint: "#fb923c",
        bursts: [{ shape: "shard", colours: ["#ff9f1c", "#ffffff", "#3b1d0e"], count: 14, reach: 80, size: 12 }],
        stamp: { motion: "draw", size: 2.4, hold: 0.9, art: <ClawStripes /> },
        word: { text: "ROAR!", fill: "#ff9f1c", stroke: "#3b1d0e" },
        react: "knock",
      },
    },
  ],
  hootie: [
    {
      n: 1,
      name: "Wise Specs",
      blurb: "Owl specs land on their nose — now think three moves ahead",
      sound: "hit_sparkle",
      art: (
        <>
          <path d="M3 26h8M53 26h8" stroke="#a16207" strokeWidth="3" strokeLinecap="round" />
          <circle cx="20" cy="31" r="12" fill="#e0f2fe" fillOpacity="0.6" stroke="#ca8a04" strokeWidth="4" />
          <circle cx="44" cy="31" r="12" fill="#e0f2fe" fillOpacity="0.6" stroke="#ca8a04" strokeWidth="4" />
          <path d="M28 29q4-5 8 0" stroke="#ca8a04" strokeWidth="3.5" fill="none" />
          <path d="M13 27l6-6M37 27l6-6" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
          <path d="M52 6l1.5 3.5L57 11l-3.5 1.5L52 16l-1.5-3.5L47 11l3.5-1.5z" fill="#fde047" />
        </>
      ),
      flight: { path: "loop", lift: 60, size: 56, trail: { shape: "sparkle", colours: ["#4dc9f6", "#fde047"] } },
      impact: {
        item: "stick",
        flash: ["#ffffff", "#bae6fd", "#4dc9f6"],
        rings: ["#4dc9f6", "#fde047"],
        tint: "#1e3a8a",
        bursts: [
          { shape: "star", colours: ["#fde047", "#ffffff", "#bae6fd"], count: 12, reach: 75, size: 12, motion: "rise" },
          { shape: "sparkle", colours: ["#fde047"], count: 6, reach: 50, size: 10, delay: 0.2 },
        ],
        word: { text: "HOO-HOO!", fill: "#bae6fd", stroke: "#1e3a8a" },
        react: "wobble",
      },
    },
  ],
  bolt: [
    {
      n: 1,
      name: "Laser Beep",
      blurb: "Target locked — a red laser, straight across",
      sound: "hit_laser",
      art: (
        <>
          <rect x="6" y="22" width="36" height="17" rx="5" fill="#cbd5e1" stroke="#334155" strokeWidth="2.5" />
          <rect x="40" y="25" width="16" height="11" rx="2" fill="#94a3b8" stroke="#334155" strokeWidth="2.5" />
          <path d="M14 37l-4 18h12l4-16" fill="#ff6b6b" stroke="#334155" strokeWidth="2.5" strokeLinejoin="round" />
          <circle cx="18" cy="30" r="3" fill="#ff6b6b" />
          <circle cx="27" cy="30" r="3" fill="#fde047" />
          <rect x="33" y="27" width="5" height="6" rx="1" fill="#22d3ee" />
          <circle cx="58" cy="30.5" r="4.5" fill="#fecaca" stroke="#ef4444" strokeWidth="2" />
        </>
      ),
      flight: { path: "beam", aim: 0, beam: { glow: "#ff6b6b", core: "#fff1f2" } },
      impact: {
        item: "pop",
        flash: ["#ffffff", "#fecaca", "#ef4444"],
        rings: ["#ff6b6b", "#ffffff"],
        tint: "#ef4444",
        bursts: [{ shape: "square", colours: ["#ff6b6b", "#ffffff", "#fde047", "#22d3ee"], count: 18, reach: 85, size: 9 }],
        stamp: {
          motion: "spin",
          size: 2.8,
          hold: 0.7,
          art: (
            <svg viewBox="0 0 100 100" className="size-full" aria-hidden>
              <circle cx="50" cy="50" r="40" fill="none" stroke="#ef4444" strokeWidth="4" strokeDasharray="18 8" />
              <circle cx="50" cy="50" r="30" fill="none" stroke="#ff6b6b" strokeWidth="2" />
              <path d="M50 2v20M50 78v20M2 50h20M78 50h20" stroke="#ef4444" strokeWidth="5" strokeLinecap="round" />
            </svg>
          ),
        },
        word: { text: "BEEP BOOP!", fill: "#fecaca", stroke: "#7f1d1d" },
        react: "flicker",
      },
    },
  ],
  blip: [
    {
      n: 1,
      name: "UFO Beam-Up",
      blurb: "A saucer hovers over them and beams them up",
      sound: "hit_ufo",
      art: (
        <>
          <ellipse cx="32" cy="26" rx="12" ry="11" fill="#a5f3fc" fillOpacity="0.85" stroke="#0e7490" strokeWidth="2" />
          <circle cx="32" cy="27" r="5" fill="#86efac" />
          <circle cx="30" cy="26" r="1.3" fill="#14532d" />
          <circle cx="34.5" cy="26" r="1.3" fill="#14532d" />
          <path d="M26 20c2-3 6-4 9-3" stroke="#fff" strokeWidth="2" strokeLinecap="round" fill="none" />
          <ellipse cx="32" cy="37" rx="28" ry="9" fill="#a78bfa" stroke="#4c1d95" strokeWidth="2.5" />
          <ellipse cx="32" cy="34" rx="20" ry="4" fill="#c4b5fd" />
          <circle cx="14" cy="39" r="2.4" fill="#fde047" />
          <circle cx="24" cy="42" r="2.4" fill="#86efac" />
          <circle cx="40" cy="42" r="2.4" fill="#fde047" />
          <circle cx="50" cy="39" r="2.4" fill="#86efac" />
        </>
      ),
      flight: { path: "hover", duration: 0.9, size: 62, trail: { shape: "dot", colours: ["#86efac", "#a78bfa"] } },
      impact: {
        item: "bob",
        flash: ["#ffffff", "#bbf7d0", "#22c55e"],
        rings: ["#86efac"],
        tint: "#22c55e",
        bursts: [
          { shape: "sparkle", colours: ["#bbf7d0", "#ffffff", "#86efac"], count: 14, reach: 80, size: 11, motion: "rise" },
          { shape: "dot", colours: ["#a78bfa", "#86efac"], count: 8, reach: 50, size: 7, motion: "rise", delay: 0.3 },
        ],
        stamp: {
          motion: "unroll",
          size: 2.2,
          ratio: 1.5,
          dy: -0.75,
          hold: 1,
          art: (
            <svg viewBox="0 0 100 150" className="size-full" aria-hidden>
              <defs>
                <linearGradient id="cstk-ufo-beam" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="#bbf7d0" stopOpacity="0.95" />
                  <stop offset="1" stopColor="#22c55e" stopOpacity="0.15" />
                </linearGradient>
              </defs>
              <path d="M38 0h24l38 150H0z" fill="url(#cstk-ufo-beam)" />
              <path d="M44 0L18 150M56 0l26 150" stroke="#ffffff" strokeWidth="1.5" opacity="0.5" />
              <ellipse cx="50" cy="142" rx="48" ry="7" fill="#86efac" opacity="0.6" />
            </svg>
          ),
        },
        word: { text: "BLIP BLOP!", fill: "#bbf7d0", stroke: "#4c1d95" },
        react: "lift",
      },
    },
  ],
  astro: [
    {
      n: 1,
      name: "Rocket Launch",
      blurb: "A rocket blasts over and pops into fireworks",
      sound: "hit_bomb",
      art: (
        <>
          <path d="M14 27c-5 0-10 2-12 5 2 3 7 5 12 5z" fill="#fbbf24" />
          <path d="M14 29c-3 0-6 1-7 3 1 2 4 3 7 3z" fill="#fff7ae" />
          <path d="M16 24L7 13h10l9 11zM16 40L7 51h10l9-11z" fill="#3b82f6" stroke="#1e3a8a" strokeWidth="2.5" strokeLinejoin="round" />
          <path d="M13 23h29c7 0 13 4 17 9-4 5-10 9-17 9H13z" fill="#f1f5f9" stroke="#1e3a8a" strokeWidth="2.5" strokeLinejoin="round" />
          <path d="M44 23c6 1 11 4 15 9-4 5-9 8-15 9z" fill="#ef4444" stroke="#1e3a8a" strokeWidth="2.5" strokeLinejoin="round" />
          <circle cx="32" cy="32" r="5" fill="#60a5fa" stroke="#1e3a8a" strokeWidth="2" />
          <path d="M30 30l2-1" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" />
          <path d="M18 27h18" stroke="#fff" strokeWidth="2" strokeLinecap="round" opacity="0.8" />
        </>
      ),
      flight: { path: "arc", lift: 140, aim: 0, duration: 1, trail: { shape: "puff", colours: ["#fde68a", "#fb923c", "#e2e8f0"] } },
      impact: {
        item: "pop",
        flash: ["#ffffff", "#fde68a", "#3b82f6"],
        rings: ["#fde047", "#60a5fa", "#f472b6"],
        tint: "#3b82f6",
        bursts: [
          { shape: "star", colours: ["#fde047", "#f472b6", "#60a5fa", "#4ade80"], count: 20, reach: 110, size: 13 },
          { shape: "sparkle", colours: ["#ffffff", "#fde68a"], count: 12, reach: 80, size: 9, motion: "fall", delay: 0.25 },
        ],
        word: { text: "LIFTOFF!", fill: "#fde68a", stroke: "#1e3a8a" },
        react: "shake",
      },
    },
  ],
  sixer: [
    {
      n: 1,
      name: "Sixer!",
      blurb: "Out of the ground, into their lap — SIX!",
      sound: "six",
      art: (
        <>
          <circle cx="32" cy="32" r="23" fill="#dc2626" stroke="#7f1d1d" strokeWidth="2.5" />
          <path d="M18 13c8 10 8 28 0 38M46 13c-8 10-8 28 0 38" stroke="#fef3c7" strokeWidth="2.2" fill="none" strokeDasharray="3 3" />
          <ellipse cx="24" cy="21" rx="6" ry="4" fill="#fca5a5" opacity="0.7" transform="rotate(-30 24 21)" />
        </>
      ),
      flight: { path: "arc", lift: 260, spin: 900, duration: 1.15, size: 48, trail: { shape: "dot", colours: ["#fde047", "#ffffff"] } },
      impact: {
        item: "pop",
        flash: ["#ffffff", "#fde047", "#2563eb"],
        rings: ["#fde047", "#2563eb"],
        tint: "#fde047",
        bursts: [
          { shape: "square", colours: ["#fde047", "#2563eb", "#22c55e", "#f97316", "#ffffff"], count: 22, reach: 110, size: 9, motion: "fall" },
          { shape: "star", colours: ["#fde047"], count: 8, reach: 70, size: 12 },
        ],
        stamp: {
          motion: "pop",
          size: 3,
          hold: 0.9,
          dy: -0.2,
          art: <ComicBurst text="SIX!" fill="#fde047" ink="#1e3a8a" size={30} />,
        },
        react: "knock",
      },
    },
  ],
  rangoli: [
    {
      n: 1,
      name: "Rangoli Bloom",
      blurb: "A spinning rangoli blooms round them in Holi colours",
      sound: "hit_sparkle",
      art: <Mandala />,
      flight: { path: "arc", lift: 90, spin: 720, trail: { shape: "dot", colours: ["#da77f2", "#fb923c", "#facc15", "#22d3ee"] } },
      impact: {
        item: "pop",
        flash: ["#ffffff", "#f5d0fe", "#da77f2"],
        rings: ["#da77f2", "#fb923c", "#22d3ee"],
        tint: "#da77f2",
        bursts: [
          { shape: "dot", colours: ["#da77f2", "#fb923c", "#facc15", "#22d3ee", "#f43f5e", "#4ade80"], count: 24, reach: 100, size: 10 },
          { shape: "petal", colours: ["#f472b6", "#facc15"], count: 8, reach: 70, size: 12, motion: "swirl", delay: 0.15 },
        ],
        stamp: {
          motion: "spin",
          size: 3.4,
          hold: 1,
          art: (
            <svg viewBox="0 0 64 64" className="size-full" opacity="0.6" aria-hidden>
              <Mandala />
            </svg>
          ),
        },
        word: { text: "WAAH!", fill: "#f5d0fe", stroke: "#86198f" },
        react: "wobble",
      },
    },
  ],
  "chai-uncle": [
    {
      n: 1,
      name: "Cutting Chai",
      blurb: "A glass of chai, a clink and a cloud of steam",
      sound: "hit_cheers",
      art: (
        <>
          <path d="M25 14c-2-3 2-5 0-9M33 14c-2-3 2-5 0-9M41 14c-2-3 2-5 0-9" stroke="#94a3b8" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          <path d="M15 18h34l-4 39H19z" fill="#e0f2fe" fillOpacity="0.55" stroke="#64748b" strokeWidth="2.5" strokeLinejoin="round" />
          <path d="M16.6 28h30.8l-3.1 27.5H19.7z" fill="#c2803a" />
          <path d="M16.6 28h30.8l-.6 5.5H17.2z" fill="#e8b878" />
          <path d="M24 21v33M32 21v33M40 21v33" stroke="#fff" strokeWidth="1.5" opacity="0.45" />
          <path d="M19 22l3 30" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" opacity="0.7" />
        </>
      ),
      flight: { path: "arc", lift: 80, spin: 15, trail: { shape: "puff", colours: ["#f1f5f9", "#e8b878"] } },
      impact: {
        item: "tilt",
        flash: ["#ffffff", "#fde68a", "#51cf66"],
        rings: ["#e8b878", "#51cf66"],
        bursts: [
          { shape: "puff", colours: ["#ffffff", "#f1f5f9"], count: 8, reach: 75, size: 22, motion: "rise" },
          { shape: "drop", colours: ["#c2803a", "#e8b878"], count: 8, reach: 50, size: 9, delay: 0.1 },
          { shape: "sparkle", colours: ["#fde68a", "#ffffff"], count: 6, reach: 60, size: 10, delay: 0.2 },
        ],
        word: { text: "EK AUR CHAI!", fill: "#fde68a", stroke: "#14532d" },
        react: "wobble",
      },
    },
  ],
}

/** Three tiger stripes slashed across. */
function ClawStripes() {
  return (
    <svg viewBox="0 0 100 100" className="size-full" aria-hidden>
      {[0, 1, 2].map((i) => (
        <g key={i}>
          <path data-draw pathLength={1} d={`M${18 + i * 20} ${12 + i * 3}Q${38 + i * 18} 52 ${28 + i * 20} ${88 - i * 3}`} stroke="#3b1d0e" strokeWidth="13" strokeLinecap="round" fill="none" />
          <path data-draw pathLength={1} d={`M${18 + i * 20} ${12 + i * 3}Q${38 + i * 18} 52 ${28 + i * 20} ${88 - i * 3}`} stroke="#ff9f1c" strokeWidth="6" strokeLinecap="round" fill="none" />
        </g>
      ))}
    </svg>
  )
}

/** Rangoli Rani's mandala (64×64). */
function Mandala() {
  return (
    <>
      <circle cx="32" cy="32" r="30" fill="#fdf4ff" stroke="#86198f" strokeWidth="1.5" />
      {Array.from({ length: 8 }, (_, i) => (
        <path key={`a${i}`} d="M32 32c-5-8-5-18 0-28 5 10 5 20 0 28z" fill={i % 2 ? "#fb923c" : "#da77f2"} transform={`rotate(${i * 45} 32 32)`} />
      ))}
      {Array.from({ length: 8 }, (_, i) => (
        <path key={`b${i}`} d="M32 32c-3-5-3-11 0-17 3 6 3 12 0 17z" fill={i % 2 ? "#22d3ee" : "#facc15"} transform={`rotate(${i * 45 + 22.5} 32 32)`} />
      ))}
      {Array.from({ length: 16 }, (_, i) => (
        <circle key={`c${i}`} cx="32" cy="3.5" r="1.6" fill="#f43f5e" transform={`rotate(${i * 22.5} 32 32)`} />
      ))}
      <Flower x={32} y={32} r={8} petal="#f43f5e" centre="#facc15" />
    </>
  )
}
