import { afterEach, describe, expect, it } from 'vitest';
import { TabClaims } from '../src/platform/tabClaims';

describe('tab claims', () => {
  const open: TabClaims[] = [];
  const tab = (release: (id: string, stale: boolean) => boolean) => {
    const t = new TabClaims(release);
    open.push(t);
    return t;
  };

  afterEach(() => open.splice(0).forEach((t) => t.close()));

  it('waits for the tab holding the character to save it', async () => {
    const saved: string[] = [];
    tab((id) => {
      saved.push(id);
      return true;
    });
    const started = Date.now();
    await tab(() => false).claim('a');
    expect(saved).toEqual(['a']);
    expect(Date.now() - started).toBeLessThan(200);
  });

  it('carries on after a moment when no tab holds the character', async () => {
    tab(() => false);
    const started = Date.now();
    await tab(() => false).claim('a');
    expect(Date.now() - started).toBeGreaterThanOrEqual(200);
  });

  it('marks a claim that arrives late as stale', async () => {
    const stale: boolean[] = [];
    const holder = tab((_, s) => {
      stale.push(s);
      return true;
    });
    holder['onMessage']({ type: 'claim', id: 'a', at: Date.now() - 5000 });
    holder['onMessage']({ type: 'claim', id: 'a', at: Date.now() });
    expect(stale).toEqual([true, false]);
  });
});
