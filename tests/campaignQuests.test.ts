import { describe, expect, it } from 'vitest';
import { CAMPAIGN_QUESTS } from '../src/data/campaignQuests';
import { ZONES } from '../src/data/zones';
import { campaignQuestAction, campaignQuestSteps, campaignQuestView, settleCampaignQuests } from '../src/engine/campaignQuests';
import { deserialize, serialize } from '../src/engine/save';
import { newGame, SAVE_VERSION } from '../src/engine/state';
import type { GameState } from '../src/engine/types';

function advanceTo(s: GameState, target: string): void {
  for (let n = 0; n < 100; n++) {
    const entry = campaignQuestSteps(s).find((step) => step.current);
    if (!entry || entry.step.id === target) return;
    if (!s.unlockedZones.includes(entry.step.zoneId)) s.unlockedZones.push(entry.step.zoneId);
    if (entry.step.kind === 'clear') s.bossesDefeated.push(entry.step.zoneId);
    else expect(campaignQuestAction(s, entry.step.id)).toBeNull();
  }
  throw new Error('Story progression did not reach its target.');
}

describe('campaign story interactions', () => {
  it('has seven separately identified chapters and valid stable area anchors', () => {
    expect(CAMPAIGN_QUESTS.map((chapter) => chapter.act)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    const steps = CAMPAIGN_QUESTS.flatMap((chapter) => chapter.steps);
    expect(new Set(steps.map((step) => step.id)).size).toBe(steps.length);
    for (const step of steps) expect(ZONES.some((zone) => zone.id === step.zoneId)).toBe(true);
  });

  it('requires explicit interactions in order, and only counts actual boss clears as combat evidence', () => {
    const s = newGame(1);
    expect(campaignQuestAction(s, 'wreck_cache_recovered')).toMatch(/earlier/);
    expect(campaignQuestAction(s, 'winnie_sponsorship')).toBeNull();
    expect(campaignQuestAction(s, 'wreck_cache_access')).toMatch(/Clear/);
    s.unlockedZones.push('shipgrave');
    expect(campaignQuestView(s).steps.find((entry) => entry.current)?.step.id).toBe('wreck_cache_access');
    s.bossesDefeated.push('shipgrave');
    expect(campaignQuestView(s).steps.find((entry) => entry.current)?.step.id).toBe('wreck_cache_recovered');
    expect(s.campaignQuests.completed).not.toContain('wreck_cache_recovered');
    expect(campaignQuestAction(s, 'wreck_cache_recovered')).toBeNull();
    expect(campaignQuestAction(s, 'wreck_cache_recovered')).toMatch(/already/);
  });

  it('does not complete delivery from accepting the parcel or clearing the city alone', () => {
    const s = newGame(2);
    advanceTo(s, 'eastmere_delivery_completed');
    expect(s.campaignQuests.completed).toContain('eastmere_delivery_accepted');
    expect(s.bossesDefeated).toContain('highaltar');
    expect(s.campaignQuests.completed).not.toContain('eastmere_delivery_completed');
    s.unlockedZones = s.unlockedZones.filter((id) => id !== 'choirloft');
    s.bossesDefeated = s.bossesDefeated.filter((id) => id !== 'choirloft');
    expect(campaignQuestAction(s, 'eastmere_delivery_completed')).toMatch(/Reach/);
    s.unlockedZones.push('choirloft');
    expect(campaignQuestAction(s, 'eastmere_delivery_completed')).toBeNull();
    expect(campaignQuestAction(s, 'eastmere_delivery_completed')).toMatch(/already/);
  });

  it('preserves tutorial, account rewards and combat progression when performing story interactions', () => {
    const s = newGame(3);
    const before = JSON.stringify({ tutorial: s.tutorial, account: s.account, passives: s.passivePoints, zones: s.unlockedZones, bosses: s.bossesDefeated });
    campaignQuestAction(s, 'winnie_sponsorship');
    expect(JSON.stringify({ tutorial: s.tutorial, account: s.account, passives: s.passivePoints, zones: s.unlockedZones, bosses: s.bossesDefeated })).toBe(before);
  });

  it('migrates legacy progress without fabricating conversations or removing unlocked travel', () => {
    const old = newGame(4);
    old.version = 47;
    old.unlockedZones = ZONES.map((zone) => zone.id);
    old.bossesDefeated = ZONES.map((zone) => zone.id);
    old.tutorial = { step: 2, progress: 1, done: false, skipped: false }; // a step the combat-tutorial migration leaves in place
    const raw = JSON.parse(serialize(old));
    delete raw.campaignQuests;
    const s = deserialize(JSON.stringify(raw));
    expect(s.version).toBe(SAVE_VERSION);
    expect(s.campaignQuests.completed).toEqual([]);
    expect(s.tutorial).toEqual(old.tutorial);
    expect(s.unlockedZones).toEqual(expect.arrayContaining(old.unlockedZones));
    expect(s.bossesDefeated).toEqual(old.bossesDefeated);
    expect(campaignQuestView(s).chapter.act).toBe(1);
    expect(campaignQuestView(s, 7).locked).toBe(true);
  });

  it('roundtrips stable interaction IDs and normalizes invalid saved entries', () => {
    const s = newGame(5);
    campaignQuestAction(s, 'winnie_sponsorship');
    const loaded = deserialize(serialize(s));
    expect(loaded.campaignQuests.completed).toEqual(['winnie_sponsorship']);
    loaded.campaignQuests.completed.push('winnie_sponsorship', 'not_a_quest', 'wreck_cache_access');
    settleCampaignQuests(loaded);
    expect(loaded.campaignQuests.completed).toEqual(['winnie_sponsorship']);
  });

  it('records the campaign aftermath only after the finale and an explicit onward action', () => {
    const s = newGame(6);
    advanceTo(s, 'first_exile_defeated');
    expect(campaignQuestView(s).chapter.act).toBe(7);
    expect(campaignQuestAction(s, 'unfinished_maps')).toMatch(/earlier/);
    s.bossesDefeated.push('shatteredthrone');
    expect(campaignQuestView(s).complete).toBe(false);
    expect(campaignQuestAction(s, 'unfinished_maps')).toBeNull();
    expect(campaignQuestView(s).complete).toBe(true);
  });
});
