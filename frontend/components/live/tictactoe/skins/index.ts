import dynamic from "next/dynamic"

import type { TttScene } from "./types"
import ClassicScene from "./classic"

export type TttSkinId = "classic" | "candy" | "arcade" | "neon" | "flat" | "pastel" | "metal"

/** Each premium skin loads only when someone plays on it. */
export const TTT_SKINS: Record<TttSkinId, TttScene> = {
  classic: ClassicScene,
  candy: dynamic(() => import("./candy")),
  arcade: dynamic(() => import("./arcade")),
  neon: dynamic(() => import("./neon")),
  flat: dynamic(() => import("./flat")),
  pastel: dynamic(() => import("./pastel")),
  metal: dynamic(() => import("./metal")),
}
