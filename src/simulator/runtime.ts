/** Public simulator API. This module is built alongside the game from the same engine and data. */
export { catalog } from './catalog';
export { defaultConfig, LIVE_RATES, validateConfig, prepareCharacter, applyRates, createSimulation } from './model';
export { deriveStats } from '../engine/stats';
export { characterLevel } from '../engine/character';
export { activeEvents, eventBoost, eventCalendar } from '../data/events';
export type { SimConfig, SimReport } from './model';
export const schemaVersion = 1;
export const gameVersion = __APP_VERSION__;
