import type { CharacterDef } from "../types"
import { BRAMBLE } from "./folk/bramble"
import { BRICK } from "./folk/brick"
import { BUCK } from "./folk/buck"
import { FLORA } from "./folk/flora"
import { MIMI } from "./folk/mimi"
import { NOVA } from "./folk/nova"
import { PEMBERTON } from "./folk/pemberton"
import { PIP } from "./folk/pip"
import { RIFF } from "./folk/riff"
import { SKYE } from "./folk/skye"

/**
 * Premium illustrated people (and a few animals), each with a signature intro
 * effect inside its square. Premium first, then the legends.
 */
export const FOLK_CHARACTERS: CharacterDef[] = [
  BUCK,
  MIMI,
  PIP,
  BRICK,
  SKYE,
  NOVA,
  BRAMBLE,
  RIFF,
  PEMBERTON,
  FLORA,
]
