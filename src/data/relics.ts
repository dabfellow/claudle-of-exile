import type { CultureId } from './expedition';

/**
 * The Relic Forge (docs/GAME.md): a Sealed Relic from the Reliquary is restored into one of these forms, then
 * programmed with Ancient Data: you pick every modifier and its tier, and pay for each line.
 */

export interface RelicForm {
  id: string;
  name: string;
  baseId: string;
  /** whose relic it was, for colour and flavour; 'all' for the one they buried together */
  culture: CultureId | 'all';
  lore: string;
}

export const RELIC_FORMS: RelicForm[] = [
  { id: 'small_kings_bulwark', name: "The Small King's Bulwark", baseId: 'godforged_tower_shield', culture: 'giant', lore: 'Carried in front of a king the size of a hill. To him it was a buckler.' },
  { id: 'crown_of_the_cairn', name: 'Crown of the Cairn', baseId: 'godforged_helm', culture: 'giant', lore: 'Child-sized, for a giant. It still fits a grown man badly.' },
  { id: 'last_survey_aegis', name: 'Aegis of the Last Survey', baseId: 'empyrean_aegis', culture: 'surveyor', lore: 'Engraved with a map of the peaks that is more honest than the ones they sent home.' },
  { id: 'surveyor_generals_regalia', name: "Surveyor-General's Regalia", baseId: 'empyrean_regalia', culture: 'surveyor', lore: 'Brass buttons, every one stamped with an order to withdraw.' },
  { id: 'rimebound_oathmail', name: 'Rimebound Oathmail', baseId: 'celestial_raiment', culture: 'rime', lore: 'Cold to the touch, and colder to break your word in.' },
  { id: 'face_in_the_ice', name: 'The Face in the Ice', baseId: 'celestial_cowl', culture: 'rime', lore: 'The face looks back. It has been waiting longer than you.' },
  { id: 'heart_of_the_peaks', name: 'Heart of the Hollow Peaks', baseId: 'simplex_amulet', culture: 'all', lore: 'What the mountains were hollowed out to hide. Three peoples agreed on nothing else.' },
];

export function relicForm(id: string): RelicForm | undefined {
  return RELIC_FORMS.find((f) => f.id === id);
}

/** Item level every restored relic is made at. */
export const RELIC_ILVL = 84;
/** Modifier lines a relic can hold of each kind. */
export const RELIC_SLOTS = 3;
/** Ancient Data for one line, by how far below the best tier it is: the top tier is dearest. */
export const RELIC_TIER_COST = [120, 70, 40, 25, 15];

export function relicLineCost(rankFromTop: number): number {
  return RELIC_TIER_COST[Math.min(Math.max(0, rankFromTop), RELIC_TIER_COST.length - 1)];
}
