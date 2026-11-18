import { game } from '../game';
import type { scenario } from './scenarios';

/** Reusable controls for browser tools that cannot run console JavaScript. Demo only. */
export function mountRoguePlaytest(load: typeof scenario) {
  const panel = document.createElement('div');
  panel.style.cssText = 'position:fixed;bottom:0;right:0;z-index:99999;background:#182129;padding:8px;max-width:600px;color:white';
  const errors: string[] = [];
  window.addEventListener('error', (e) => errors.push(e.message));
  window.addEventListener('unhandledrejection', (e) => errors.push(String(e.reason)));
  const output = document.createElement('pre');
  output.style.cssText = 'white-space:pre-wrap;max-height:130px;overflow:auto;font-size:11px';
  for (const [label, action] of [
    ['Load rogue demo', () => load('rogueRoster')],
    ['Inspect rogue demo', () => {
      const s = game.state;
      output.textContent = JSON.stringify({ crew: s.heist.crew, bruiser: s.heist.roster?.bruiser, gold: s.account.bank.gold, action: s.action, errors });
    }],
  ] as const) {
    const button = document.createElement('button');
    button.textContent = label;
    button.onclick = () => { void action(); };
    panel.append(button);
  }
  panel.append(output);
  document.body.append(panel);
}
