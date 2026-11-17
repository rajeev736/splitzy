import type { CharacterDef } from "../types"
import { Fox, Frog, Owl, Panda, Penguin, Tiger } from "./basic/animals"
import { Alien, Astronaut, ChaiUncle, CricketFan, RangoliGirl, Robot } from "./basic/folks"

/** Free, still characters anyone can pick (drawn in packs/basic). */
export const BASIC_CHARACTERS: CharacterDef[] = [
  { id: "foxy", name: "Foxy", tagline: "Quick paws, quicker moves", tier: "basic", price: 0, accent: "#20c9b0", Art: Fox },
  { id: "bao", name: "Bao", tagline: "Snacks first, then checkmate", tier: "basic", price: 0, accent: "#a3e635", Art: Panda },
  { id: "hoppy", name: "Hoppy", tagline: "A frog prince who hops to win", tier: "basic", price: 0, accent: "#ff7ab6", Art: Frog },
  { id: "waddles", name: "Waddles", tagline: "Cool as ice, every round", tier: "basic", price: 0, accent: "#ff9f43", Art: Penguin },
  { id: "sheru", name: "Sheru", tagline: "Roars on every six", tier: "basic", price: 0, accent: "#9775fa", Art: Tiger },
  { id: "hootie", name: "Hootie", tagline: "Thinks three moves ahead", tier: "basic", price: 0, accent: "#4dc9f6", Art: Owl },
  { id: "bolt", name: "Bolt", tagline: "Beep boop, your move", tier: "basic", price: 0, accent: "#ff6b6b", Art: Robot },
  { id: "blip", name: "Blip", tagline: "Came in peace, stayed to win", tier: "basic", price: 0, accent: "#6c63ff", Art: Alien },
  { id: "astro", name: "Astro", tagline: "Next stop: the moon", tier: "basic", price: 0, accent: "#3b82f6", Art: Astronaut },
  { id: "sixer", name: "Sixer", tagline: "Shouts “Sixer!” at every roll", tier: "basic", price: 0, accent: "#ffd43b", Art: CricketFan },
  { id: "rangoli", name: "Rangoli Rani", tagline: "Adds colour to every game", tier: "basic", price: 0, accent: "#da77f2", Art: RangoliGirl },
  { id: "chai-uncle", name: "Chai Uncle", tagline: "One more game, one more chai", tier: "basic", price: 0, accent: "#51cf66", Art: ChaiUncle },
]
