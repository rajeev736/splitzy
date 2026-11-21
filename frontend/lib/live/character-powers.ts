import type { PowerKind } from "./ludo"

/**
 * Power Ludo: every game character (components/game-avatar) brings ONE
 * signature power — the same kinds as the power-ups on the track. The player
 * who has that character equipped when the game starts may use it once, on
 * their turn before rolling; it never fizzles out.
 *
 * Data only (no React, no art) so the engine stays plain TS. The room entry's
 * `avatar` is self-reported, so little here is worth faking: every kind is
 * also given by a basic character (two each; Foxy and Bao free, the rest a
 * few coins), and a premium or legend character's power is never stronger
 * than a basic one's.
 */
export const CHARACTER_POWER: Record<string, PowerKind> = {
  // Basic (free or cheap): two of each kind
  foxy: "jump", // quick paws
  hoppy: "jump", // a frog hops
  waddles: "freeze", // cool as ice
  blip: "freeze", // tractor beam
  bolt: "push", // robot arm shove
  "chai-uncle": "push", // "Arre, go back!"
  bao: "shield", // big, soft and unbothered
  astro: "shield", // space suit
  hootie: "lock", // thinks three moves ahead
  rangoli: "lock", // draws a pattern round your piece
  sheru: "double", // roars on every six
  sixer: "double", // shouts "Sixer!"

  // Squad
  zenko: "jump", // ninja leap
  cinder: "push", // a blast of fire sends you back
  bijou: "freeze", // an icy stare
  fuzzby: "shield", // a big fluffy hug
  fizzwick: "lock", // a gadget clamps your piece

  // Folk
  pip: "jump", // has wandered every board
  buck: "push", // lassoes you back
  mimi: "push", // sharp claws
  nova: "freeze", // a cryo experiment
  brick: "shield", // doesn't talk, can't be moved
  pemberton: "shield", // a gentleman's umbrella
  bramble: "lock", // has a theory about your next number
  flora: "lock", // vines tangle your piece
  riff: "double", // turns it up to eleven
  skye: "double", // flies straight to the finish
}

/** The signature power of a character id, or null (no character, or one we don't know). */
export const characterPower = (id: string | null | undefined): PowerKind | null =>
  id && Object.prototype.hasOwnProperty.call(CHARACTER_POWER, id) ? CHARACTER_POWER[id] : null
