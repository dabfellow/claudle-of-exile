import type { SkillAction } from './skills';
import { CULTURES } from './expedition';

export const relicFragment = (culture: string) => `${culture === 'surveyor' ? 'survey' : culture}_relic_fragment`;
export const ARCHAEOLOGY_RECIPES: SkillAction[] = [
  ...CULTURES.map((c): SkillAction => ({
    id: `sift_${c.id}`, name: `Sift ${c.artifactName}`, skill: 'archaeology', level: c.id === 'giant' ? 1 : c.id === 'surveyor' ? 12 : 24,
    accomplishments: c.id === 'giant' ? [] : [`expedition.${c.id === 'surveyor' ? 'dig_cairn' : 'dig_cutting'}.0`],
    intervalMs: 10_000, xp: 7, inputs: { rubble: 1 }, protectedOutputs: { [c.artifact]: 1 }, color: c.color,
  })),
  ...(['fire', 'cold', 'light'] as const).map((element): SkillAction => ({
    id: `restore_surveyors_guard_${element}`, name: `Restore Surveyor's Guard · ${element === 'light' ? 'lightning' : element} resistance`,
    skill: 'archaeology', level: 15, forge: 1, intervalMs: 600_000, xp: 600,
    accomplishments: ['expedition.dig_cairn.0'], inputs: { survey_relic_fragment: 5, giant_tally: 50, copper_bar: 5 },
    baseId: 'banded_shield', purpose: { id: `resistance_${element}`, guarantees: ['flat_life', `${element}_res`] }, color: '#d0a040',
  })),
  { id: 'restore_taboo_tablet', name: 'Restore Taboo Tablet', skill: 'archaeology', level: 75,
    accomplishments: ['expedition.dig_adit.0'], intervalMs: 600_000, xp: 800,
    inputs: { survey_relic_fragment: 10, survey_brass: 100, rime_idol: 50 }, protectedOutputs: { restored_taboo_tablet: 1 }, color: '#d0a040' },
  { id: 'restore_convergence_relic', name: 'Restore Convergence Relic', skill: 'archaeology', level: 85,
    accomplishments: ['expedition.dig_heart.0'], intervalMs: 600_000, xp: 1000,
    inputs: { giant_relic_fragment: 5, survey_relic_fragment: 5, rime_relic_fragment: 5, giant_tally: 25, survey_brass: 25, rime_idol: 25 },
    protectedOutputs: { convergence_relic: 1 }, color: '#a8c8f8' },
];
