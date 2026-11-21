import { MATERIALS, CURRENCIES } from '../data/materials';
import { ACTIONS, SKILLS } from '../data/skills';
import { STATIONS } from '../data/hideout';
import { masteryThreshold } from '../engine/skillingMastery';
import { xpForLevel } from '../engine/xp';
import { game } from '../game';
import type { scenario } from './scenarios';

/** Disposable browser checks for the full profession UI, including old-save access and batches. */
export function mountProfessionPlaytest(load: typeof scenario) {
  const panel = document.createElement('div');
  panel.style.cssText = 'position:fixed;bottom:0;right:0;z-index:99999;background:#182129;padding:6px;max-width:450px;color:white';
  const errors: string[] = [];
  window.addEventListener('error', (e) => errors.push(e.message));
  window.addEventListener('unhandledrejection', (e) => errors.push(String(e.reason)));
  const info = document.createElement('pre');
  info.style.cssText = 'white-space:pre-wrap;max-height:110px;overflow:auto;font-size:10px';
  for (const [label, action] of [
    ['Starter professions', () => load({ classId: 'ranger', level: 1 })],
    ['Stocked professions', () => load({ classId: 'ranger', level: 60, zone: 'shatteredthrone', prepare: (s) => {
      s.action = null; s.combat = null;
      for (const id of Object.keys(SKILLS) as (keyof typeof SKILLS)[]) if (id !== 'combat') s.skills[id] = xpForLevel(90);
      for (const m of [...MATERIALS, ...CURRENCIES]) s.storage.bank[m.id] = 99999;
      for (const station of STATIONS) s.account.hideout[station.id] = station.levels.length;
      for (const a of ACTIONS) {
        s.professionProgress.legacyAccess[a.id] = true;
        if (a.mastery) s.skillingMastery[a.mastery.id] = masteryThreshold(91);
      }
    } })],
    ['Inspect professions', () => {
      const s = game.state;
      info.textContent = JSON.stringify({ action: s.action, skills: s.skills, work: s.professionProgress.work, errors });
    }],
    ['Hide profession controls', () => panel.remove()],
  ] as const) {
    const button = document.createElement('button'); button.textContent = label;
    button.onclick = () => { void action(); }; panel.append(button);
  }
  panel.append(info); document.body.append(panel);
}
