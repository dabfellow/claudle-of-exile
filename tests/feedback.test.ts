import { describe, expect, it } from 'vitest';
import { feedbackContext } from '../src/platform/feedback';
import { newGame } from '../src/engine/state';

describe('feedback', () => {
  it('carries the build and where the player is, but nothing personal', () => {
    const s = newGame(1, { name: 'Secret Name', classId: 'templar' });
    const ctx = feedbackContext(s, 'settings');
    expect(ctx).toMatchObject({ classId: 'templar', level: 1, zone: null, page: 'settings' });
    expect(ctx.version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(JSON.stringify(ctx)).not.toContain('Secret Name');
  });

  it('works without a character', () => {
    expect(feedbackContext(null).classId).toBeUndefined();
  });
});
