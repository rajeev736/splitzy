import type { CharacterDef } from "../types"
import { Bijou } from "./squad/bijou"
import { Cinder } from "./squad/cinder"
import { Fizzwick } from "./squad/fizzwick"
import { Fuzzby } from "./squad/fuzzby"
import { Zenko } from "./squad/zenko"

/** Premium animated mascots, each with a signature intro (drawn in packs/squad). */
export const SQUAD_CHARACTERS: CharacterDef[] = [
  {
    id: "fuzzby",
    name: "Fuzzby",
    tagline: "Bounces in, steals hearts",
    tier: "premium",
    price: 3000,
    accent: "#2b7de9",
    Art: Fuzzby,
  },
  {
    id: "zenko",
    name: "Zenko",
    tagline: "Throws a mean shuriken",
    tier: "premium",
    price: 4500,
    accent: "#f5b800",
    Art: Zenko,
  },
  {
    id: "fizzwick",
    name: "Fizzwick",
    tagline: "Mad science, gladly",
    tier: "premium",
    price: 4000,
    accent: "#7cc520",
    Art: Fizzwick,
  },
  {
    id: "cinder",
    name: "Cinder",
    tagline: "Hot-headed. Literally.",
    tier: "premium",
    price: 5000,
    accent: "#e5322d",
    Art: Cinder,
  },
  {
    id: "bijou",
    name: "Bijou",
    tagline: "Not impressed. Yet.",
    tier: "premium",
    price: 6000,
    accent: "#d63bb5",
    Art: Bijou,
  },
]
