import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { game } from './game';
import { App } from './ui/App';
import './styles.css';

void game.boot();
// handy for poking at state from the devtools console
if (import.meta.env.DEV) (window as unknown as { game: typeof game }).game = game;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
