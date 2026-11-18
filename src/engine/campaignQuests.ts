import { CAMPAIGN_QUESTS, type CampaignQuestChapter, type CampaignQuestStep } from '../data/campaignQuests';
import type { CampaignQuestState, GameState } from './types';

const STEPS = CAMPAIGN_QUESTS.flatMap((chapter) => chapter.steps);
const INTERACTIONS = new Set(STEPS.filter((step) => step.kind === 'interaction').map((step) => step.id));

export function newCampaignQuestState(): CampaignQuestState {
  return { completed: [] };
}

/** Save normalization never invents conversations or deliveries from combat history. */
export function settleCampaignQuests(s: GameState): void {
  const saved = s.campaignQuests;
  s.campaignQuests = {
    completed: [...new Set(Array.isArray(saved?.completed) ? saved.completed.filter((id) => typeof id === 'string' && INTERACTIONS.has(id)) : [])],
  };
}

function reached(s: GameState, zoneId: string): boolean {
  return s.unlockedZones.includes(zoneId) || s.bossesDefeated.includes(zoneId);
}

export interface CampaignQuestStepView {
  step: CampaignQuestStep;
  complete: boolean;
  current: boolean;
  available: boolean;
}

/** Combat history is evidence only for clear objectives; interactions require their own saved IDs. */
export function campaignQuestSteps(s: GameState): CampaignQuestStepView[] {
  const completed = new Set(s.campaignQuests?.completed ?? []);
  let previousComplete = true;
  return STEPS.map((step) => {
    const evidence = step.kind === 'clear' ? s.bossesDefeated.includes(step.zoneId) : completed.has(step.id);
    const complete = previousComplete && evidence;
    const current = previousComplete && !complete;
    previousComplete = complete;
    return { step, complete, current, available: current && reached(s, step.zoneId) };
  });
}

export interface CampaignQuestView {
  chapter: CampaignQuestChapter;
  steps: CampaignQuestStepView[];
  complete: boolean;
  locked: boolean;
}

export function campaignQuestView(s: GameState, act?: number): CampaignQuestView {
  const all = campaignQuestSteps(s);
  const current = all.find((entry) => entry.current)?.step.id;
  const chapter = CAMPAIGN_QUESTS.find((entry) => act === undefined ? entry.steps.some((step) => step.id === current) : entry.act === act) ?? CAMPAIGN_QUESTS[CAMPAIGN_QUESTS.length - 1];
  const ids = new Set(chapter.steps.map((step) => step.id));
  const steps = all.filter((entry) => ids.has(entry.step.id));
  return { chapter, steps, complete: steps.every((entry) => entry.complete), locked: !steps.some((entry) => entry.current || entry.complete) };
}

/** Player-initiated interactions are idempotent and grant no duplicate combat/tutorial rewards. */
export function campaignQuestAction(s: GameState, stepId: string): string | null {
  const entry = campaignQuestSteps(s).find((candidate) => candidate.step.id === stepId);
  if (!entry) return 'That story task does not exist.';
  if (entry.complete) return 'That task is already complete.';
  if (!entry.current) return 'Finish the earlier story task first.';
  if (entry.step.kind !== 'interaction') return 'Clear the marked area to complete this task.';
  if (!entry.available) return 'Reach this area before continuing the story.';
  settleCampaignQuests(s);
  s.campaignQuests.completed.push(stepId);
  return null;
}
