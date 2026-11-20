import * as React from "react"

import { cardOf, type CCCard, type CCColour } from "@/lib/live/colorclash"
import { cn } from "@/lib/utils"

/** Card face colours (bright, flat, chunky) and a darker edge of each. */
export const CC_PAINT: Record<CCColour, { face: string; deep: string; light: string; label: string }> = {
  red: { face: "#ef3b3b", deep: "#a91d24", light: "#ff7a6b", label: "Red" },
  yellow: { face: "#ffc21a", deep: "#c98a00", light: "#ffe27a", label: "Yellow" },
  green: { face: "#2fb24c", deep: "#17762f", light: "#6fdc7f", label: "Green" },
  blue: { face: "#2a7cf0", deep: "#1748a8", light: "#6fb0ff", label: "Blue" },
}
const WILD_FACE = "#1c1a2e"
const ORDER: CCColour[] = ["red", "yellow", "green", "blue"]
const FONT = "ui-rounded, 'Arial Rounded MT Bold', system-ui, sans-serif"

/**
 * A card's symbol, drawn centred at (0, 0) about 60 units tall: a number, a
 * no-entry sign (Skip), two bent arrows (Reverse), two stacked cards (+2), a
 * four-colour pinwheel (Wild) or four fanned cards (Wild +4).
 */
function Glyph({ card, fill, outline }: { card: CCCard; fill: string; outline: string }) {
  switch (card.kind) {
    case "num":
      return (
        <g>
          <text
            x="0"
            y="21"
            textAnchor="middle"
            fontSize="62"
            fontWeight="900"
            fontFamily={FONT}
            fill={fill}
            stroke={outline}
            strokeWidth="5"
            paintOrder="stroke"
            strokeLinejoin="round"
          >
            {card.value}
          </text>
          {(card.value === 6 || card.value === 9) && <rect x="-14" y="27" width="28" height="5" rx="2.5" fill={fill} stroke={outline} strokeWidth="2" />}
        </g>
      )
    case "skip":
      return (
        <g fill="none" stroke={outline} strokeWidth="15" strokeLinecap="round">
          <circle r="21" />
          <path d="M-14 14 14 -14" />
          <g stroke={fill} strokeWidth="9">
            <circle r="21" />
            <path d="M-14 14 14 -14" />
          </g>
        </g>
      )
    case "reverse": {
      const arrow = "M-17 6 V-6 a10 10 0 0 1 10 -10 H10 M2 -25 l10 9 -10 9"
      return (
        <g fill="none" strokeLinecap="round" strokeLinejoin="round">
          {[0, 180].map((r) => (
            <g key={r} transform={`rotate(${r}) translate(0 -4)`}>
              <path d={arrow} stroke={outline} strokeWidth="13" />
              <path d={arrow} stroke={fill} strokeWidth="7" />
            </g>
          ))}
        </g>
      )
    }
    case "draw2":
      return (
        <g strokeLinejoin="round">
          {[
            [-7, -9, -12],
            [7, 7, 10],
          ].map(([x, y, r], i) => (
            <rect key={i} x={x - 12} y={y - 17} width="24" height="34" rx="5" fill={fill} stroke={outline} strokeWidth="4" transform={`rotate(${r} ${x} ${y})`} />
          ))}
        </g>
      )
    case "wild":
      return <Pinwheel r={26} />
    case "wild4":
      return (
        <g strokeLinejoin="round">
          {ORDER.map((c, i) => {
            const r = -27 + i * 18
            return (
              <rect
                key={c}
                x="-10"
                y="-30"
                width="20"
                height="30"
                rx="4"
                fill={CC_PAINT[c].face}
                stroke="#fff"
                strokeWidth="3"
                transform={`translate(0 4) rotate(${r} 0 4)`}
              />
            )
          })}
        </g>
      )
  }
}

/** Four colour quarters in a ring, slightly turned. */
function Pinwheel({ r }: { r: number }) {
  const q = (i: number) => {
    const a0 = ((i * 90 - 45 - 15) * Math.PI) / 180
    const a1 = (((i + 1) * 90 - 45 - 15) * Math.PI) / 180
    return `M0 0 L${(r * Math.cos(a0)).toFixed(2)} ${(r * Math.sin(a0)).toFixed(2)} A${r} ${r} 0 0 1 ${(r * Math.cos(a1)).toFixed(2)} ${(r * Math.sin(a1)).toFixed(2)} Z`
  }
  return (
    <g>
      {ORDER.map((c, i) => (
        <path key={c} d={q(i)} fill={CC_PAINT[c].face} />
      ))}
      <circle r={r} fill="none" stroke="#fff" strokeWidth="3.5" />
      <circle r={r * 0.28} fill="#fff" />
    </g>
  )
}

/** Small corner mark. */
function Corner({ card, colour }: { card: CCCard; colour: string }) {
  if (card.kind === "draw2" || card.kind === "wild4")
    return (
      <text x="0" y="7" textAnchor="middle" fontSize="21" fontWeight="900" fontFamily={FONT} fill="#fff" stroke={colour} strokeWidth="3" paintOrder="stroke">
        {card.kind === "draw2" ? "+2" : "+4"}
      </text>
    )
  if (card.kind === "wild") return <Pinwheel r={9} />
  return (
    <g transform="scale(0.36)">
      <Glyph card={card} fill="#fff" outline={colour} />
    </g>
  )
}

/** A card face, 100 × 150 units. */
function Face({ card, id }: { card: CCCard; id: string }) {
  const paint = card.colour ? CC_PAINT[card.colour] : null
  const face = paint?.face ?? WILD_FACE
  const deep = paint?.deep ?? "#000"
  return (
    <>
      <defs>
        <linearGradient id={`${id}-g`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={paint?.light ?? "#3a3658"} stopOpacity="0.55" />
          <stop offset="0.45" stopColor={face} stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect x="1" y="1" width="98" height="148" rx="13" fill="#fff" />
      <rect x="7" y="7" width="86" height="136" rx="9" fill={face} />
      <rect x="7" y="7" width="86" height="136" rx="9" fill={`url(#${id}-g)`} />
      {/* The centre plate: a round white badge with a ring of the card's colour (a Wild's is dark) */}
      <g transform="translate(50 75)">
        <circle r="38" fill={paint ? "#fff" : "#0d0c18"} stroke="#fff" strokeWidth="2.5" />
        <circle r="33" fill="none" stroke={paint?.light ?? "#3a3658"} strokeWidth="2" strokeDasharray="5 4" opacity="0.9" />
      </g>
      <g transform="translate(50 75)">
        <Glyph card={card} fill={face} outline={deep} />
        {card.kind === "wild4" && (
          <text x="0" y="30" textAnchor="middle" fontSize="17" fontWeight="900" fontFamily={FONT} fill="#fff" stroke="#000" strokeWidth="4" paintOrder="stroke">
            +4
          </text>
        )}
      </g>
      <g transform="translate(20 23)">
        <Corner card={card} colour={deep} />
      </g>
      <g transform="translate(80 127) rotate(180)">
        <Corner card={card} colour={deep} />
      </g>
    </>
  )
}

/** The back: dark, a four-colour burst and COLOR CLASH across it. */
function Back({ id }: { id: string }) {
  return (
    <>
      <defs>
        <radialGradient id={`${id}-b`} cx="0.5" cy="0.45" r="0.7">
          <stop offset="0" stopColor="#3a2f66" />
          <stop offset="1" stopColor="#14112a" />
        </radialGradient>
      </defs>
      <rect x="1" y="1" width="98" height="148" rx="13" fill="#fff" />
      <rect x="7" y="7" width="86" height="136" rx="9" fill={`url(#${id}-b)`} />
      <g transform="translate(50 75)">
        <g transform="rotate(-18)">
          {ORDER.map((c, i) => (
            <circle key={c} cx={i % 2 ? 11 : -11} cy={i < 2 ? -11 : 11} r="15" fill={CC_PAINT[c].face} opacity="0.95" />
          ))}
          <circle r="11" fill="#fff" />
        </g>
        <g transform="rotate(-18)">
          <rect x="-44" y="-11" width="88" height="22" rx="6" fill="#0d0c18" stroke="#fff" strokeWidth="2" />
          <text x="0" y="4.5" textAnchor="middle" fontSize="12" fontWeight="900" fontFamily={FONT} fill="#fff" textLength="78" lengthAdjust="spacingAndGlyphs">
            COLOR CLASH
          </text>
        </g>
      </g>
    </>
  )
}

/**
 * A playing card, `width` px wide (1.5× as tall). `card` null: face down.
 */
export function CCCardView({ card, width, className, style }: { card: number | null; width: number; className?: string; style?: React.CSSProperties }) {
  const uid = React.useId().replace(/:/g, "")
  const c = card === null ? null : cardOf(card)
  return (
    <svg
      viewBox="0 0 100 150"
      width={width}
      height={width * 1.5}
      className={cn("block shrink-0 drop-shadow-[0_2px_3px_rgb(0_0_0/0.35)]", className)}
      style={style}
      aria-hidden
    >
      {c ? <Face card={c} id={uid} /> : <Back id={uid} />}
    </svg>
  )
}
