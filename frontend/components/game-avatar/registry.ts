import { BASIC_CHARACTERS } from "./packs/basic"
import { FOLK_CHARACTERS } from "./packs/folk"
import { SQUAD_CHARACTERS } from "./packs/squad"
import type { CharacterDef } from "./types"

/** Every game character, basic first. */
export const CHARACTERS: CharacterDef[] = [...BASIC_CHARACTERS, ...SQUAD_CHARACTERS, ...FOLK_CHARACTERS]

const BY_ID = new Map(CHARACTERS.map((c) => [c.id, c]))
export const characterById = (id: string | null | undefined) => (id ? BY_ID.get(id) : undefined)
export const isCharacterId = (v: unknown): v is string => typeof v === "string" && BY_ID.has(v)
/** Free to pick without buying. */
export const isFreeCharacter = (id: string) => BY_ID.get(id)?.price === 0 && !BY_ID.get(id)?.earn
