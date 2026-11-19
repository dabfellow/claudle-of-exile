import { ZONES } from '../data/zones';
import { game } from '../game';
import type { scenario } from './scenarios';

/** Visible controls for disposable desktop/browser campaign acceptance checks. */
export function mountCampaignPlaytest(load: typeof scenario) {
  const panel = document.createElement('div');
  panel.style.cssText = 'position:fixed;bottom:0;right:0;z-index:99999;background:#182129;padding:6px;max-width:440px;color:white';
  const errors: string[] = [];
  window.addEventListener('error', (event) => errors.push(event.message));
  window.addEventListener('unhandledrejection', (event) => errors.push(String(event.reason)));
  const info = document.createElement('pre');
  info.style.cssText = 'font-size:10px;white-space:pre-wrap;max-height:90px;overflow:auto';
  for (const [label, run] of [
    ['Fresh exile', () => load({ classId: 'ranger', level: 1, prepare: (s) => { s.combat = null; s.action = null; s.unlockedZones = ['mudflats']; s.bossesDefeated = []; s.campaignQuests.completed = []; } })],
    ['Seven-act veteran', () => load({ classId: 'ranger', level: 70, zone: 'shatteredthrone', prepare: (s) => { s.combat = null; s.action = null; s.unlockedZones = ZONES.map((z) => z.id); s.bossesDefeated = ZONES.map((z) => z.id); s.account.campaignDone = true; s.campaignQuests.completed = []; } })],
    ['Inspect campaign', () => { const s = game.state; info.textContent = JSON.stringify({ areas: s.unlockedZones.length, clears: s.bossesDefeated.length, interactions: s.campaignQuests.completed, errors }); }],
    ['Hide test controls', () => panel.remove()],
  ] as const) {
    const button = document.createElement('button'); button.textContent = label;
    button.onclick = () => { void run(); }; panel.append(button);
  }
  panel.append(info); document.body.append(panel);
}
