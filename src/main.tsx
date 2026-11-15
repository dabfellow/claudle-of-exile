import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { passTrial } from './engine/ascendancy';
import { game } from './game';
import { initErrorReporting } from './platform/errors';
import { App } from './ui/App';
import { startMusic } from './ui/music';
import './styles.css';

void initErrorReporting();
void game.boot();
startMusic();
// handy for poking at state from the devtools console
if (import.meta.env.DEV) {
  const dev = window as unknown as { game: typeof game; passTrial: (n: 1 | 2 | 3 | 4, points?: number) => void };
  dev.game = game;
  // stands in for a trial's boss (points tops up, to try any path)
  dev.passTrial = (n, points = 0) =>
    game.act((s, ctx) => {
      passTrial(s, ctx, n);
      s.ascendancy.points += points;
    });
  void import('./dev/scenarios').then(({ scenario }) => {
    (window as unknown as { scenario: typeof scenario }).scenario = scenario;
    if (location.search.includes('overhaulPlaytest')) void import('./dev/overhaulPlaytest').then(({ mountOverhaulPlaytest }) => mountOverhaulPlaytest(scenario));
    if (location.search.includes('phase06')) {
      const panel = document.createElement('div');
      panel.style.cssText = 'position:fixed;bottom:0;right:0;z-index:99999;background:#182129;padding:8px;max-width:680px;color:white';
      const errors: string[] = [];
      window.addEventListener('error', (e) => errors.push(e.message));
      window.addEventListener('unhandledrejection', (e) => errors.push(String(e.reason)));
      for (const [label, fn] of [
        ['Starter', () => scenario('foragingStarter')],
        ['Greenhouse test', () => scenario('foragingGreenhouse')],
        ['Away 10 min', () => game.simulateAway(600_000)],
        ['Away 8 hours', () => game.simulateAway(28_800_000)],
        ['Inspect', () => { const s = game.state; info.textContent = JSON.stringify({ bank: s.account.bank, greenhouse: s.greenhouse, discoveries: s.professionProgress.discoveries, counters: s.professionProgress.counters, errors }); }],
      ] as const) { const b = document.createElement('button'); b.textContent = label; b.onclick = () => { void fn(); }; panel.append(b); }
      const info = document.createElement('pre'); info.style.cssText = 'white-space:pre-wrap;max-height:180px;overflow:auto;font-size:12px'; panel.append(info); document.body.append(panel);
    }
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
