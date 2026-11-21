import type { DamageType, MonsterInstance } from '../engine/types';
import type { TacticRule } from './gems';

interface PackCounter {
  tip: string;
  affix?: string;
  flask?: string;
  gems?: readonly string[];
  rule?: TacticRule;
}

const dangerousPack: TacticRule = { when: 'dangerousPack' };
const guards = ['iron_guard', 'smoke_step', 'frost_ward'];
const counters = {
  armour: { tip: 'Armour on gear', affix: 'flat_armour' },
  life: { tip: 'Maximum Life on gear', affix: 'flat_life' },
  fire: { tip: 'Fire Resistance on gear', affix: 'fire_res' },
  cold: { tip: 'Cold Resistance on gear', affix: 'cold_res' },
  lightning: { tip: 'Lightning Resistance on gear', affix: 'light_res' },
  chaos: { tip: 'Chaos Resistance on gear', affix: 'chaos_res' },
  block: { tip: 'Block chance on a shield', affix: 'block_chance' },
  spellBlock: { tip: 'Spell Block on a shield', affix: 'spell_block' },
  weaponCold: { tip: 'Added Cold Damage on an attack weapon', affix: 'added_cold' },
  lifeFlask: { tip: 'A full Small Life Flask', flask: 'life_small' },
  ruby: { tip: 'Ruby Flask for elemental resistance', flask: 'ruby' },
  amethyst: { tip: 'Amethyst Flask for chaos resistance', flask: 'amethyst' },
  guard: { tip: 'A guard on the dangerous pack rule', gems: guards, rule: dangerousPack },
  burningGround: {
    tip: 'A guard set to trigger on Burning Ground', gems: guards, rule: { when: 'onGround', ground: 'burning' },
  },
  stormwater: {
    tip: 'A guard set to trigger on Storm-tossed water', gems: guards, rule: { when: 'onGround', ground: 'stormwater' },
  },
  area: {
    tip: 'An area or chain skill on the dangerous pack rule', gems: ['rain_of_arrows', 'ground_slam', 'spark'], rule: dangerousPack,
  },
  nonColdSpell: {
    tip: 'A non-cold spell such as Spark on the dangerous pack rule', gems: ['spark'], rule: dangerousPack,
  },
  coldOrLightningSpell: {
    tip: 'Frost Needle or Spark on the dangerous pack rule', gems: ['frost_needle', 'spark'], rule: dangerousPack,
  },
} satisfies Record<string, PackCounter>;

export interface CampaignGearCheck {
  monsterId: string;
  name: string;
  skill: string;
  warning: string;
  counters: readonly PackCounter[];
  major?: true;
  pressure?: number;
  interval?: number;
  damageType?: DamageType;
  dot?: { kind: NonNullable<MonsterInstance['attackAilment']>; share: number } | false;
  crit?: { chance: number; multiplier: number };
  resist?: Partial<MonsterInstance['res']>;
  block?: number;
  ground?: false;
}

export function gearCheckAdvice(check: CampaignGearCheck): string {
  return `${check.warning} Counters include ${check.counters.map((counter) => counter.tip).join(' · ')}.`;
}

/** Campaign pack leaders use existing creatures and art, with their own attacks and defenses. */
export const CAMPAIGN_GEAR_CHECKS: Readonly<Partial<Record<string, CampaignGearCheck>>> = {
  // Act 1
  ashwood: {
    monsterId: 'emberkin', name: 'Cinder-Keeper', skill: 'Scatter Embers',
    warning: 'Spreads burning ground.',
    counters: [counters.fire, counters.burningGround],
    dot: { kind: 'burn', share: 0.28 },
  },
  crypt: {
    monsterId: 'frostwraith', name: 'Vault Tide-Wraith', skill: 'Brine Needle',
    warning: 'Casts rapid cold spells and resists cold damage.',
    counters: [counters.cold, counters.spellBlock, counters.nonColdSpell],
    interval: 0.67, resist: { cold: 35 },
  },
  stormcliffs: {
    monsterId: 'ravager', name: 'Hookblade Claimant', skill: 'Salvage Hook', major: true,
    warning: 'Hook strikes cause heavy bleeding.',
    counters: [counters.armour, counters.lifeFlask, counters.guard],
    pressure: 1.42, dot: { kind: 'bleed', share: 0.38 },
  },

  // Act 2
  saltflats: {
    monsterId: 'mirage', name: 'Saltpan Mirage', skill: 'Salt Flash',
    warning: 'Quick lightning spells build Shock.',
    counters: [counters.lightning, counters.spellBlock, counters.guard],
    interval: 0.65,
  },
  fortobedience: {
    monsterId: 'garrisonman', name: 'Roadwatch Shieldkeeper', skill: 'Roadblock Bash',
    warning: 'Blocks attacks from behind a road shield.',
    counters: [counters.coldOrLightningSpell, counters.armour, counters.guard],
    block: 35,
  },
  caravan: {
    monsterId: 'lancer', name: 'Post Outrider', skill: 'Couched Lance', major: true,
    warning: 'Lance thrusts often crit for more than double damage.',
    counters: [counters.armour, counters.life, counters.guard],
    pressure: 1.30, interval: 1.2, crit: { chance: 45, multiplier: 2.25 }, dot: false,
  },

  // Act 3
  dryaqueduct: {
    monsterId: 'frostmoth', name: 'Millrace Rime Moth', skill: 'Rime Dust',
    warning: 'Rapid cold hits build Chill.',
    counters: [counters.cold, counters.area],
    interval: 0.72, damageType: 'cold',
  },
  cinderkey: {
    monsterId: 'obsidiancrab', name: 'Kiln Glassback', skill: 'Glass Pincer Stab',
    warning: 'The kiln-fired shell resists fire and blocks attacks.',
    counters: [counters.coldOrLightningSpell, counters.weaponCold, counters.armour],
    resist: { fire: 55 }, block: 25,
  },
  pyretemple: {
    monsterId: 'acolyte', name: 'Expedition Kiln-Tender', skill: 'Pitchfire', major: true,
    warning: 'Pitchfire spells Ignite on a hit.',
    counters: [counters.fire, counters.ruby, counters.burningGround],
    pressure: 1.45, dot: { kind: 'ignite', share: 0.38 },
  },

  // Act 4
  scourgeyard: {
    monsterId: 'flagellant', name: 'Cloth-Court Scourger', skill: 'Hooked Lash',
    warning: 'Barbed lashes leave bleeding wounds.',
    counters: [counters.armour, counters.block, counters.guard],
    dot: { kind: 'bleed', share: 0.27 },
  },
  bellfoundry: {
    monsterId: 'bellcaster', name: 'Bronze Ladler', skill: 'Molten Pour',
    warning: 'Slow blows leave burns.',
    counters: [counters.fire, counters.block, counters.guard],
    interval: 1.25, dot: { kind: 'burn', share: 0.34 },
  },
  highaltar: {
    monsterId: 'sacristan', name: 'Sapknife Sacristan', skill: 'Root Venom', major: true,
    warning: 'Sap-coated knives stack Poison.',
    counters: [counters.chaos, counters.amethyst, counters.life],
    pressure: 1.50, interval: 0.77, damageType: 'chaos', dot: { kind: 'poison', share: 0.45 },
  },

  // Act 5
  screefields: {
    monsterId: 'screegolem', name: 'Quarry Rime Golem', skill: 'Frozen Stone Fist',
    warning: 'Slow, heavy cold blows.',
    counters: [counters.cold, counters.block, counters.guard],
    interval: 1.24,
  },
  icevault: {
    monsterId: 'hoarfrost', name: 'Rime Warden', skill: 'Seal Frost',
    warning: 'Fast cold spells and high cold resistance.',
    counters: [counters.cold, counters.spellBlock, counters.nonColdSpell],
    pressure: 1.12, interval: 0.49, resist: { cold: 60 }, ground: false,
  },
  kingsstair: {
    monsterId: 'kingsrime', name: 'Cairnwatch Rime Herald', skill: 'Containment Flash-Freeze', major: true,
    warning: 'Heavy cold spells build toward Freeze.',
    counters: [counters.cold, counters.ruby, counters.spellBlock],
    pressure: 1.52, ground: false,
  },

  // Act 6
  drownedfleet: {
    monsterId: 'fleetgunner', name: 'Kroten Broadside Gunner', skill: 'Incendiary Chain Shot',
    warning: 'Slow fire attacks leave a burn.',
    counters: [counters.fire, counters.block, counters.guard],
    interval: 1.3, dot: { kind: 'burn', share: 0.3 },
  },
  brimstone: {
    monsterId: 'brimstonehulk', name: 'Slag Hulk', skill: 'Molten Fist',
    warning: 'Slow fire blows and a heat-hardened shell.',
    counters: [counters.fire, counters.coldOrLightningSpell, counters.weaponCold],
    interval: 1.25, resist: { fire: 55 },
  },
  maelstrom: {
    monsterId: 'eyestorm', name: 'Breach Herald', skill: 'Feed the Breach', major: true,
    warning: 'Lightning spells inflict Shock and leave stormwater.',
    counters: [counters.lightning, counters.ruby, counters.stormwater],
    pressure: 1.42, interval: 0.8,
  },

  // Act 7
  kingsmint: {
    monsterId: 'coinstriker', name: 'Foundry Die-Striker', skill: 'Precision Stamp',
    warning: 'Precise hammer blows crit often.',
    counters: [counters.armour, counters.block, counters.guard],
    interval: 1.1, crit: { chance: 35, multiplier: 2 }, dot: false,
  },
  hanginggardens: {
    monsterId: 'gardenwasp', name: 'First Garden Sting-Wasp', skill: 'Sap Sting',
    warning: 'Quick stings stack Poison.',
    counters: [counters.chaos, counters.amethyst, counters.area],
    interval: 0.65, damageType: 'chaos', dot: { kind: 'poison', share: 0.35 },
  },
  ninthstair: {
    monsterId: 'kingsvoice', name: 'Voice of the First Seal', skill: 'You Will Stay', major: true,
    warning: 'Sustained chaos spells bypass Energy Shield.',
    counters: [counters.life, counters.chaos, counters.amethyst],
    pressure: 1.55, interval: 0.68, damageType: 'chaos', ground: false,
  },
};
