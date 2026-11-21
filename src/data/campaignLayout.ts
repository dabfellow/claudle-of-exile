import type { BossMechanic, MonsterDef, ZoneDef, ZoneTerrain } from './zones';

/** Authored travel order. IDs survive the move so existing clears and equipped items remain valid. */
export const CAMPAIGN_CHAPTERS = [
  { act: 1, levels: [1, 10], zones: ['mudflats', 'brinecaves', 'ashwood', 'blackreed', 'crypt', 'shipgrave', 'stormcliffs', 'sanctum'] },
  { act: 2, levels: [10, 19], zones: ['cinderroad', 'saltflats', 'tithefields', 'fortobedience', 'blackgrass', 'bannerfield', 'assizes', 'caravan'] },
  { act: 3, levels: [19, 28], zones: ['kurgans', 'lowercity', 'dryaqueduct', 'plateau', 'wreckline', 'cinderkey', 'pyretemple', 'burningthrone'] },
  { act: 4, levels: [28, 38], zones: ['pilgrimgate', 'almsquarter', 'scourgeyard', 'reliquary', 'bellfoundry', 'inquisition', 'penitentstair', 'choirloft', 'saintswalk', 'highaltar'] },
  { act: 5, levels: [38, 47], zones: ['hollowpass', 'screefields', 'howlingfells', 'glasslake', 'bonequarry', 'icevault', 'mammothroad', 'hangingglacier', 'steading', 'longhall', 'kingsstair', 'giantsthrone'] },
  { act: 6, levels: [47, 57], zones: ['blackharbor', 'squallbanks', 'lampgulf', 'drownedfleet', 'brimstone', 'hollowreef', 'thunderhead', 'leviathanrib', 'blackcurrent', 'voicetrench', 'lightless', 'maelstrom'] },
  { act: 7, levels: [57, 65], zones: ['exilesgate', 'kingsroad', 'kingsmint', 'hanginggardens', 'burnedarchive', 'longfracture', 'driftingquarter', 'kingsreach', 'sunderedhall', 'hallofcrowns', 'ninthstair', 'shatteredthrone'] },
] as const;

/** Backdrops follow the live campaign geography, including zones that moved acts. */
const TERRAIN: Record<(typeof CAMPAIGN_CHAPTERS)[number]['zones'][number], ZoneTerrain> = {
  // The Wreck Coast
  mudflats: 'coast', brinecaves: 'cave', ashwood: 'forest', blackreed: 'marsh',
  crypt: 'underworks', shipgrave: 'coast', stormcliffs: 'coast', sanctum: 'ruins',
  // The Broken Roads
  cinderroad: 'plains', saltflats: 'plains', tithefields: 'plains', fortobedience: 'town',
  blackgrass: 'plains', bannerfield: 'plains', assizes: 'town', caravan: 'town',
  // Greyford
  kurgans: 'plains', lowercity: 'town', dryaqueduct: 'marsh', plateau: 'plains',
  wreckline: 'town', cinderkey: 'workshop', pyretemple: 'workshop', burningthrone: 'town',
  // Harrowgate
  pilgrimgate: 'ruins', almsquarter: 'ruins', scourgeyard: 'ruins', reliquary: 'underworks',
  bellfoundry: 'workshop', inquisition: 'ruins', penitentstair: 'ruins', choirloft: 'town',
  saintswalk: 'ruins', highaltar: 'ruins',
  // Cairnwatch Institute
  hollowpass: 'mountains', screefields: 'mountains', howlingfells: 'mountains', glasslake: 'mountains',
  bonequarry: 'mountains', icevault: 'cave', mammothroad: 'mountains', hangingglacier: 'mountains',
  steading: 'workshop', longhall: 'workshop', kingsstair: 'underworks', giantsthrone: 'workshop',
  // Caer Veyr
  blackharbor: 'town', squallbanks: 'town', lampgulf: 'town', drownedfleet: 'coast',
  brimstone: 'workshop', hollowreef: 'underworks', thunderhead: 'town', leviathanrib: 'forest',
  blackcurrent: 'town', voicetrench: 'town', lightless: 'workshop', maelstrom: 'underworks',
  // The First Seal
  exilesgate: 'underworks', kingsroad: 'underworks', kingsmint: 'workshop', hanginggardens: 'underworks',
  burnedarchive: 'underworks', longfracture: 'cave', driftingquarter: 'underworks', kingsreach: 'underworks',
  sunderedhall: 'underworks', hallofcrowns: 'underworks', ninthstair: 'cave', shatteredthrone: 'underworks',
};

const TERRAIN_VARIANTS: Partial<Record<keyof typeof TERRAIN, string>> = {
  brinecaves: 'bandits',
  ashwood: 'night',
  stormcliffs: 'storm',
  cinderkey: 'forge',
  bellfoundry: 'forge',
  howlingfells: 'bears',
  icevault: 'spiders',
  kingsmint: 'forge',
};

const MOVED: Record<string, { name: string; desc: string }> = {
  tithefields: { name: 'The Commons Allotments', desc: 'The road settlements once grew food here. Swollen roots choke the channels while the promised district supplies travel elsewhere.' },
  fortobedience: { name: 'The Roadwatch Fort', desc: 'A neglected road fort still demands papers and provisions from travellers it can no longer protect.' },
  bannerfield: { name: 'Muster Green', desc: 'Broken wagons and militia standards mark a supply camp abandoned when the road became too dangerous.' },
  assizes: { name: 'The Tollhouse Court', desc: 'Seized manifests and disputed cargo fill a roadside court. Its surviving records trace the missing food toward Wayfarer’s Post.' },
  lowercity: { name: 'Greyford Market Quarter', desc: 'Greyford’s crowded market survives on irregular deliveries, local bargains and work nobody else will take.' },
  dryaqueduct: { name: 'Greyford Millrace', desc: 'Roots have blocked the water feeding Greyford’s mills. Clearing it earns the trust of people who remember the capital’s delegation.' },
  wreckline: { name: 'Greyford Bonded Stores', desc: 'Bonded stores on Greyford’s outskirts hold supplies diverted from the coast to the research expedition.' },
  cinderkey: { name: 'The Greyford Kilns', desc: 'Brick kilns and guarded work yards supply the expedition while neighbouring farms fail beneath unnatural growth.' },
};

/** A moved boss teaches mechanics appropriate to its new chapter rather than carrying endgame Echoes inland. */
function earlyBoss(def: MonsterDef, act: number): MonsterDef {
  const mechanics: BossMechanic[] = act === 2 ? ['slam', 'summon'] : ['slam', 'nova', 'enrage'];
  return { ...def, mechanics, echoes: undefined, channel: undefined, rime: undefined, groundKind: undefined };
}

export function buildCampaign(templates: ZoneDef[]): ZoneDef[] {
  const byId = new Map(templates.map((z) => [z.id, z]));
  return CAMPAIGN_CHAPTERS.flatMap((chapter) => chapter.zones.map((id, index) => {
    const source = byId.get(id)!;
    const [start, end] = chapter.levels;
    // Narrow overlapping areas keep progress steady; the last chapter reserves level 66 for its guardian.
    const low = Math.round(start + (end - start - 1) * index / (chapter.zones.length - 1));
    const high = Math.min(end, low + (chapter.act === 1 ? 1 : 2));
    const level = (value: number) => Math.max(low, Math.min(high, Math.round(low +
      (high - low) * (value - source.levelRange[0]) / Math.max(1, source.levelRange[1] - source.levelRange[0]))));
    // Reward tables follow their established level curve, never a moved area's former late-game tier.
    const reward = templates.reduce((best, z) => Math.abs(z.levelRange[1] - high) < Math.abs(best.levelRange[1] - high) ? z : best);
    const moved = MOVED[id];
    const linear = chapter.act <= 3;
    let requires: ZoneDef['requires'] = linear ? { after: [index ? chapter.zones[index - 1] : CAMPAIGN_CHAPTERS[chapter.act - 2]?.zones.at(-1)].filter((v): v is NonNullable<typeof v> => !!v) } : source.requires;
    if (id === 'squallbanks') requires = { after: ['blackharbor'] };
    if (id === 'kingsmint') requires = { after: ['kingsroad'] };
    if (id === 'hanginggardens') requires = { after: ['kingsmint'] };
    if (id === 'maelstrom') requires = { after: ['voicetrench', 'lightless'], bosses: 8 };
    if (id === 'shatteredthrone') requires = { after: ['ninthstair'], bosses: 8 };
    const finale = index === chapter.zones.length - 1;
    const boss = { ...(moved ? earlyBoss(source.boss, chapter.act) : source.boss), level: id === 'shatteredthrone' ? 66 : high };
    // No underworld history is revealed by enemies relocated into the early investigation.
    const name = (text: string) => moved ? text.replace(/Founding |Buried |Root-Cellar /g, '').replace('Cellar Reaper', 'Field Reaper') : text;
    return {
      ...source, ...moved, act: chapter.act, levelRange: [low, high] as [number, number],
      terrain: TERRAIN[id], terrainVariant: TERRAIN_VARIANTS[id],
      tier: reward.tier, ilvlBonus: reward.ilvlBonus, requires, actBoss: finale,
      monsters: source.monsters.map((m) => ({ ...m, name: name(m.name), level: level(m.level) })),
      boss: { ...boss, name: name(boss.name) },
      bossEvery: reward.bossEvery,
      ...(moved ? { packSize: reward.packSize, spawnEveryMs: reward.spawnEveryMs } : {}),
    };
  }));
}
