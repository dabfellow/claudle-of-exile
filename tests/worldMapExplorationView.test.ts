import { describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { newGame } from '../src/engine/state';
import { zonesInAct } from '../src/data/zones';

vi.mock('../src/game', () => ({ game: {}, useGame: vi.fn() }));
import { WorldMap } from '../src/ui/pages/CampaignPage';

describe('world map locked navigation', () => {
  it('keeps fog and accessible navigation in sync with character progression', () => {
    const s = newGame(4);
    const fresh = renderToStaticMarkup(createElement(WorldMap, { s, onOpen: () => {} }));
    expect(fresh.match(/aria-disabled="true"/g)).toHaveLength(12);
    expect(fresh.match(/class="is-revealed"/g)).toHaveLength(1);
    expect(fresh).toContain('Act 2 · Unexplored');
    s.unlockedZones.push(zonesInAct(2)[0].id);
    const progressed = renderToStaticMarkup(createElement(WorldMap, { s, onOpen: () => {} }));
    expect(progressed.match(/aria-disabled="true"/g)).toHaveLength(10);
    expect(progressed.match(/class="is-revealed"/g)).toHaveLength(2);
    expect(progressed).not.toContain('Act 2 · Unexplored');
    s.bossesDefeated.push('shatteredthrone');
    const veteran = renderToStaticMarkup(createElement(WorldMap, { s, onOpen: () => {} }));
    expect(veteran).not.toContain('aria-disabled="true"');
    expect(veteran.match(/class="is-revealed"/g)).toHaveLength(7);
  });
});
