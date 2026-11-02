import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ACTIVE_GEMS, activeGemDef } from '../src/data/gems';
import { newGame } from '../src/engine/state';
import { GemTip } from '../src/ui/components/GemView';

describe('a gem on a shop shelf', () => {
  it('has a tooltip for every skill gem, summons and storms included', () => {
    const s = newGame(1);
    for (const def of ACTIVE_GEMS) expect(() => renderToString(createElement(GemTip, { state: s, def }))).not.toThrow();
  });

  it("shows the gem's own numbers, not the Default Attack's", () => {
    const html = renderToString(createElement(GemTip, { state: newGame(1), def: activeGemDef('squall') }));
    expect(html).toContain('Storms at once');
    expect(html).toContain('Mana cost');
  });
});
