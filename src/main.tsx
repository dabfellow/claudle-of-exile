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
  const dev = window as unknown as { game: typeof game; passTrial: (n: 1 | 2 | 3, points?: number) => void };
  dev.game = game;
  // stands in for a trial's boss (points tops up, to try sealed nodes)
  dev.passTrial = (n, points = 0) =>
    game.act((s, ctx) => {
      passTrial(s, ctx, n);
      s.ascendancy.points += points;
    });
  void import('./dev/scenarios').then(({ scenario }) => {
    (window as unknown as { scenario: typeof scenario }).scenario = scenario;
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
