import { game } from '../game';
import type { scenario } from './scenarios';

/** Demo-only controls for checking the ledger at both ends of target progression. */
export function mountThievingPlaytest(load: typeof scenario) {
  const panel = document.createElement('div');
  panel.style.cssText = 'position:fixed;bottom:0;right:0;z-index:99999;background:#182129;padding:8px;max-width:min(500px,100vw);box-sizing:border-box;display:flex;flex-wrap:wrap;gap:4px;color:white';
  const errors: string[] = [];
  window.addEventListener('error', (e) => errors.push(e.message));
  window.addEventListener('unhandledrejection', (e) => errors.push(String(e.reason)));
  const output = document.createElement('pre');
  output.style.cssText = 'white-space:pre-wrap;max-height:100px;overflow:auto;font-size:11px;flex-basis:100%;margin:4px 0 0';
  for (const [label, action] of [
    ['Load starter thief', () => load('thievingStarter')],
    ['Load veteran thief', () => load('rogueRoster')],
    ['Load endgame thief', () => load('thievingEndgame')],
    ['Inspect thief', () => {
      const s = game.state;
      output.textContent = JSON.stringify({
        gold: s.storage.bank.gold,
        lifts: s.professionProgress.counters['thieving.markers'],
        xp: s.skills.thieving,
        planned: s.heist.planned,
        keepsakes: s.collectibles.filter((c) => c.startsWith('thieving.')),
        viewport: { scrollWidth: document.documentElement.scrollWidth, innerWidth: window.innerWidth },
        errors,
      });
    }],
    ['Hide test controls', () => panel.remove()],
  ] as const) {
    const button = document.createElement('button');
    button.textContent = label;
    button.onclick = () => { void action(); };
    panel.append(button);
  }
  panel.append(output);
  document.body.append(panel);
}
