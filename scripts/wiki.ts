/**
 * Player wiki, generated from the game's own data so it can't drift from the game.
 *   npm run wiki      writes static pages to public/path-of-idle/wiki/ (the build copies them into dist)
 *
 * Hand-written pages live in docs/wiki/*.html (an <h1> plus plain HTML); the generator wraps them in the wiki frame.
 */
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { AFFIXES } from '../src/data/affixes';
import { ASCENDANCIES } from '../src/data/ascendancies';
import { BASES, UNIQUES, WEAPON_FAMILIES, baseDef, attributeReq, type BaseDef, type UniqueDef } from '../src/data/bases';
import { CLASSES } from '../src/data/classes';
import { TRIALS } from '../src/data/ascendancies';
import { BOSS_TABLES, DROP_TABLES, areaCurrency, bossTable } from '../src/data/drops';
import { FLASKS, FLASK_AFFIXES, INSTILL_CONDITIONS } from '../src/data/flasks';
import { ACTIVE_GEMS, MAX_GEM_LEVEL, MAX_SUPPORT_SLOTS, RULE_LABELS, RULE_UNLOCK_NAMES, SKILL_BAR_SLOTS, SUPPORT_GEMS, TARGET_STATUSES, activeGemDef, gemAct, gemReqLevel, gemWeapons, type ActiveGemDef, type RuleCondition, type RuleUnlock, type SupportGemDef } from '../src/data/gems';
import { OFFLINE_HAUL_CAP, STATIONS, stationDef, type StationId } from '../src/data/hideout';
import { CURRENCIES, MATERIALS, type CurrencyDef } from '../src/data/materials';
import { MONSTER_MODS } from '../src/data/monsterMods';
import { MONSTER_PROFILES } from '../src/data/monsterProfiles';
import { MEALS, MEAL_MS } from '../src/data/cooking';
import { CULTURES, FIND_HOURS, SITES, STRATA } from '../src/data/expedition';
import { ALARM_KEEPS, CREW_SLOT_LEVELS, HEIST_JOBS, MAX_ROGUE_RANK, ROGUES, STEALTH_FLOOR } from '../src/data/heist';
import { ATLAS_NODES, ATLAS_POINT_CAP, DOOMED_MODS, DOOMED_TIERS, MAP_TIERS, NORMAL_MAP_MODS, SEXTANTS, SEXTANT_BASE_CHARGES, SEXTANT_MODS } from '../src/data/maps';
import { NEWS } from '../src/data/news';
import { PASSIVE_NODES } from '../src/data/passiveTree';
import { RESONANCE_PER_PIECE, RUNE_FAMILIES, RUNE_GRADES, RUNE_READINGS, runeEffect } from '../src/data/runes';
import { SKILL_TREE_NODES } from '../src/data/skillTree';
import { SKILLS, actionsFor } from '../src/data/skills';
import { describeStat } from '../src/data/statText';
import { ACTS, MECHANIC_INFO, ZONES, type MonsterDef, type ZoneDef } from '../src/data/zones';
import { GROUND_IN_PLAY, cleansesFrostbite, ruleUnlockLevel } from '../src/engine/automation';
import { freshAutomation } from '../src/engine/account';
import { areaXpMultiplier, OVERLEVEL_XP_PENALTY, UNDERLEVEL_XP_BONUS } from '../src/engine/character';
import {
  AILMENT_DECAY_PCT, AILMENT_THRESHOLD_PCT, BOSS_FREEZE_MS, CHILL_MS, CHILL_SLOW_PCT, FREEZE_MS, GEAR_POISON,
  MONSTER_OWN_RES, MONSTER_RARITY, SHOCK_MAX_PCT, SHOCK_MIN_PCT, SHOCK_MS, makeMonster, monsterXp,
} from '../src/engine/combat';
import { itemFigures } from '../src/engine/compare';
import { HEAD_CHEF_MORE } from '../src/engine/cooking';
import { ATTACK_PCT_PER_LEVEL, BURN_MS, BURN_SHARE, IGNITE_MS, IGNITE_SHARE, LIFE_RESERVE_PCT, SPELL_ADDED_EFFECTIVENESS, gemAttrReq, gemLevelReq, spellBaseAt, spellGrowth, supportFits, weaponPctAt } from '../src/engine/gems';
import { affixRangeText, createUnique, describeUniqueModDef, spawnWeight } from '../src/engine/items';
import { MARKET_CUT_PCT, MARKET_MAX_LISTINGS } from '../src/engine/market';
import { passiveNodeCost } from '../src/engine/passives';
import { MAX_SKILL_TREE_POINTS } from '../src/engine/skillTree';
import { MASTERY_CAP, MASTERY_CONSERVE_MAX, MASTERY_SPEED_MAX, MASTERY_YIELD_MAX } from '../src/engine/skillingMastery';
import type { GameState, Item } from '../src/engine/types';
import { xpToReach } from '../src/engine/xp';
import { CURRENCY_ART, GEM_GLYPHS, ITEM_ART, MONSTER_ART, UNIQUE_ART, ZONE_ART } from '../src/ui/assets';
import { MEGA_CRIT_MULTI } from '../src/engine/mechanics';
import { armourReduction, evadeChance, ES_RECHARGE_DELAY_MS, ES_RECHARGE_PCT, ATTRIBUTE_EFFECTS, RES_CAP } from '../src/engine/stats';

const ROOT = join(__dirname, '..');
const OUT = join(ROOT, 'public', 'path-of-idle', 'wiki');
const BASE_URL = '/path-of-idle/wiki/';

const esc = (s: unknown) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const title = (s: string) => s.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());
const attrName = { str: 'Strength', dex: 'Dexterity', int: 'Intelligence' } as const;
const secs = (ms: number) => (ms ? `${+(ms / 1000).toFixed(2)}s` : 'instant');

const VERSION: string = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')).version;

interface Section { slug: string; name: string; blurb: string; group: string; icon: string; art: string }
const START = 'Start here';
const CHARACTERS = 'Characters';
const EQUIPMENT = 'Equipment';
const WORLD = 'The world';
const IDLE = 'Idle systems';
const TOOLS = 'Tools';
const UPDATES = 'Updates';
const SECTIONS: Section[] = [
  { slug: 'classes', name: 'Classes and ascendancies', blurb: 'The seven classes and twelve ascendancies.', group: CHARACTERS, icon: '♜', art: 'portraits/craftpix-con1.png' },
  { slug: 'skills', name: 'Skill gems', blurb: 'Active skills: cost, cooldown, level and what they do.', group: CHARACTERS, icon: '✦', art: 'items/weapons/quintino-q34.png' },
  { slug: 'supports', name: 'Support gems', blurb: 'Supports and which skills they fit.', group: CHARACTERS, icon: '◇', art: 'items/materials/woshi-gem.png' },
  { slug: 'damage', name: 'Damage and ailments', blurb: 'Damage types, how a hit is worked out, and every ailment formula.', group: CHARACTERS, icon: '✹', art: 'items/weapons/weapons30-1.png' },
  { slug: 'items', name: 'Item bases', blurb: 'Every weapon and armour base by slot.', group: EQUIPMENT, icon: '⛨', art: 'items/armor/set-30-helmet.png' },
  { slug: 'uniques', name: 'Unique items', blurb: 'Unique items, their mods and where they drop.', group: EQUIPMENT, icon: '♛', art: 'items/weapons/pack3-bloodthirst.png' },
  { slug: 'modifiers', name: 'Modifiers', blurb: 'Every rollable modifier and its tiers.', group: EQUIPMENT, icon: '⚒', art: 'items/currency/sn-blessed-orb.png' },
  { slug: 'currency', name: 'Currency and materials', blurb: 'Orbs, crafting materials and gathered goods.', group: EQUIPMENT, icon: '◈', art: 'items/currency/codespree-copper-disk.png' },
  { slug: 'acts', name: 'Acts and areas', blurb: 'Every act, area, monster and boss.', group: WORLD, icon: '⚔', art: 'items/weapons/quintino-q1.png' },
  { slug: 'monsters', name: 'Monsters and bosses', blurb: 'Every monster and boss, with level, life and damage.', group: WORLD, icon: '☠', art: 'portraits/craftpix-con6.png' },
];
/**
 * Pages in the menu that aren't written yet. Adding docs/wiki/NN-<slug>.html fills one: the hand-written page takes
 * its place in the menu at the same address.
 */
const PLANNED: Omit<Section, 'art'>[] = [
  { slug: 'beginners-checklist', name: "Beginner's checklist", group: START, icon: '☑', blurb: 'The first things to do with a new character.' },
  { slug: 'faq', name: 'Frequently asked questions', group: START, icon: '?', blurb: 'Quick answers to common questions.' },
  { slug: 'builds', name: 'Builds and playstyles', group: CHARACTERS, icon: '✧', blurb: 'Starter builds and how each one plays.' },
  { slug: 'glossary', name: 'Glossary', group: CHARACTERS, icon: 'Aa', blurb: "What the game's terms mean." },
  { slug: 'walkthrough', name: 'Campaign walkthrough', group: WORLD, icon: '➜', blurb: 'Every area in order, with its boss and rewards.' },
  { slug: 'boss-prep', name: 'Boss preparation', group: WORLD, icon: '☗', blurb: 'What to bring, and how to answer each mechanic.' },
  { slug: 'loot', name: 'Loot and drop tables', group: WORLD, icon: '❖', blurb: 'What drops where.' },
  { slug: 'progression', name: 'Unlocks and progression', group: WORLD, icon: '➤', blurb: 'What opens when as you play.' },
  { slug: 'automation-basics', name: 'Automation basics', group: IDLE, icon: '⚙', blurb: 'How to make your skills fire on their own.' },
  { slug: 'automation-rules', name: 'Automation rule reference', group: IDLE, icon: '☰', blurb: 'Every rule, what unlocks it, and why a skill might not fire.' },
  { slug: 'offline', name: 'Offline progression', group: IDLE, icon: '☾', blurb: 'What keeps going while you are away, and what ends it.' },
  { slug: 'gathering', name: 'Gathering and production', group: IDLE, icon: '⛏', blurb: 'Gathering skills, resources and what they make.' },
  { slug: 'farming', name: 'Farming strategies', group: IDLE, icon: '⟳', blurb: 'Ways to farm, and when each one makes sense.' },
  { slug: 'item-comparison', name: 'Item comparison', group: TOOLS, icon: '⚖', blurb: 'Compare two items side by side.' },
  { slug: 'drop-calculator', name: 'Drop probability calculator', group: TOOLS, icon: '%', blurb: 'The chance of at least one drop after a number of tries.' },
  { slug: 'crafting-planner', name: 'Crafting planner', group: TOOLS, icon: '⚒', blurb: 'Pick a recipe and see the materials you need.' },
  { slug: 'farming-planner', name: 'XP and farming planner', group: TOOLS, icon: '⧗', blurb: 'Estimate progress from your own rates.' },
  { slug: 'rule-builder', name: 'Automation rule builder', group: TOOLS, icon: '⚙', blurb: 'Compose rules and see what they will do.' },
  { slug: 'build-planner', name: 'Build planner', group: TOOLS, icon: '✎', blurb: 'Plan skills, supports and equipment.' },
  { slug: 'patch-notes', name: 'Patch notes', group: UPDATES, icon: '✉', blurb: 'What changed in each version.' },
  { slug: 'data-version', name: 'Data version', group: UPDATES, icon: '#', blurb: 'Which game version this wiki was built from.' },
  { slug: 'report', name: 'Report incorrect information', group: UPDATES, icon: '!', blurb: 'Tell us when something here is wrong.' },
  { slug: 'passive-tree', name: 'Passive tree', group: CHARACTERS, icon: '+', blurb: 'Points, paths, Masteries, Gateways and tree profiles.' },
  { slug: 'runes', name: 'Runes', group: EQUIPMENT, icon: 'R', blurb: 'Rune families, grades, readings and resonance.' },
  { slug: 'flasks', name: 'Flasks and Instilling', group: EQUIPMENT, icon: 'F', blurb: 'Flask bases, magic modifiers and automatic triggers.' },
  { slug: 'meals', name: 'Meals and cooking', group: EQUIPMENT, icon: 'M', blurb: 'Combat meals, automatic re-eating and cooking bonuses.' },
  { slug: 'maps-atlas', name: 'Maps, Atlas and Sextants', group: WORLD, icon: 'X', blurb: 'The map endgame, Atlas points, Sextants and Doomed Maps.' },
  { slug: 'challenge-realms', name: 'Challenge realms', group: WORLD, icon: 'C', blurb: 'Hardcore, Solo Self-Found, Classic and shared realms.' },
  { slug: 'player-market', name: 'Player Market', group: WORLD, icon: '$', blurb: 'Trading, auctions, deliveries and interrupted-request recovery.' },
  { slug: 'side-systems', name: 'Side systems', group: IDLE, icon: 'S', blurb: 'Life-skill specialisation, work mastery, Heists and Expedition.' },
  { slug: 'greenhouse', name: 'Greenhouse', group: IDLE, icon: 'G', blurb: 'Grow herbs in the background while another activity runs.' },
  { slug: 'loadouts', name: 'Loadouts', group: IDLE, icon: 'L', blurb: 'Save gear, skill bars and linked tree profiles.' },
];
const NAV_GROUPS = [CHARACTERS, EQUIPMENT, WORLD, IDLE, TOOLS, UPDATES];
/** Game art the home page shows, copied next to the wiki pages. */
const GUIDE_ART = 'items/armor/pack3-unblinking_tome.png';
const HERO_ART = 'zones/gegx-forest-night.webp';
const usedArt = new Set<string>();
const artUrl = (rel: string) => {
  usedArt.add(rel);
  return `${BASE_URL}art/${rel}`;
};
/** The wiki's address for a file from src/ui/assets.ts, or '' when there's no art. */
const packArt = (file: string | undefined) => (file ? artUrl(relative(join(ROOT, 'src', 'assets'), fileURLToPath(file)).replace(/\\/g, '/')) : '');

const search: { t: string; u: string; k: string; c: string; s?: string; i?: string }[] = [];
const index = (t: string, u: string, k: string, s?: string, i?: string) =>
  search.push({ t, u, k, c: k.startsWith('boss') ? 'Boss' : u.includes('/areas/') ? 'Area' : SECTIONS.find((x) => u.includes(`/${x.slug}/`))?.name ?? 'Guide', s, i: i || undefined });

function frame(slug: string, pageTitle: string, body: string, parent?: { slug: string; name: string }): string {
  const here = parent?.slug ?? slug;
  const written = (to: string) => !PLANNED.some((p) => p.slug === to) || extraPages.some((p) => p.slug === to);
  const link = (to: string, name: string, icon: string) =>
    `<a class="navlink${here === to ? ' active' : ''}${written(to) ? '' : ' stub'}" href="${BASE_URL}${to === 'index' ? '' : `${to}/`}"><span class="ico">${icon}</span>${esc(name)}</a>`;
  const group = (label: string, links: string[]) =>
    `<details class="navgroup" open data-group="${esc(label)}"><summary class="navlabel">${esc(label)}</summary>${links.join('\n')}</details>`;
  const planned = (label: string) => PLANNED.filter((s) => s.group === label).map((s) => link(s.slug, s.name, s.icon));
  const nav = [
    group(START, [
      link('index', 'Codex home', '⌂'),
      ...extraPages.filter((p) => !PLANNED.some((s) => s.slug === p.slug)).map((p) => link(p.slug, p.name, '✧')),
      ...planned(START),
    ]),
    ...NAV_GROUPS.map((label) => group(label, [...SECTIONS.filter((s) => s.group === label).map((s) => link(s.slug, s.name, s.icon)), ...planned(label)])),
  ].join('\n');
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(pageTitle)} - Path of Idle Wiki</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@500;600&family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="${BASE_URL}wiki.css">
</head>
<body>
<div class="app">
<aside class="sidebar" id="sidebar">
  <a class="brand" href="${BASE_URL}"><span class="sigil">✦</span><span><b>PATH OF IDLE</b><small>THE EXILE'S CODEX</small></span></a>
  <nav>${nav}</nav>
  <div class="sidebar-foot">An archive of all things lost, forged and found.<br><br>Game data version <b>${esc(VERSION)}</b></div>
</aside>
<div class="main">
<header class="topbar">
  <button id="menu" type="button" aria-label="Open the menu" aria-controls="sidebar" aria-expanded="false">☰</button>
  <div class="crumbs"><a href="${BASE_URL}">The archive</a><i>&rsaquo;</i>${parent ? `<a href="${BASE_URL}${parent.slug}/">${esc(parent.name)}</a><i>&rsaquo;</i>` : ''}${slug === 'index' ? 'Codex home' : esc(pageTitle)}</div>
  <div class="toptools">
    <input id="q" type="search" placeholder="Search the codex  ( / )" aria-label="Search the wiki" autocomplete="off">
    <a class="play" href="/path-of-idle/">▶ PLAY GAME</a>
    <div id="results" hidden></div>
  </div>
</header>
<main class="content">
${slug === 'index' ? body : `<div class="page"><article>
${body}
</article>
<div class="side"><div class="rail" id="toc" hidden><h4>Contents</h4><ol></ol></div></div></div>`}
<footer class="footer"><span>PATH OF IDLE · THE EXILE'S CODEX</span><span>Generated from game data, version ${esc(VERSION)}. Skill icons from game-icons.net (CC BY 3.0).</span><span><a href="${BASE_URL}report/">Report an error</a> &middot; <a href="#">Back to top ↑</a></span></footer>
</main>
</div>
</div>
<script src="${BASE_URL}wiki.js"></script>
</body>
</html>
`;
}

function write(rel: string, content: string) {
  const file = join(OUT, rel);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, content);
}

function table(head: string[], rows: string[][]): string {
  return `<div class="tw"><table><thead><tr>${head.map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows
    .map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join('')}</tr>`)
    .join('')}</tbody></table></div>`;
}

// ---------- hand-written pages ----------
const extraPages: { slug: string; name: string; html: string }[] = [];
const HAND = join(ROOT, 'docs', 'wiki');
if (existsSync(HAND)) {
  for (const f of readdirSync(HAND).filter((n) => n.endsWith('.html')).sort()) {
    const html = readFileSync(join(HAND, f), 'utf8');
    const name = /<h1[^>]*>(.*?)<\/h1>/s.exec(html)?.[1].replace(/<[^>]+>/g, '') ?? title(f.replace('.html', ''));
    extraPages.push({ slug: f.replace('.html', '').replace(/^\d+-/, ''), name, html });
  }
}

// ---------- entries: every gem, item, area and monster has its own page ----------
const dmgName: Record<string, string> = { phys: 'Physical', fire: 'Fire', cold: 'Cold', light: 'Lightning', chaos: 'Chaos' };
const SPOILER_ACT = 4;
const OPEN_ZONES = ZONES.filter((z) => ACTS.find((a) => a.n === z.act)?.open);
const ZONE_OF = new Map(OPEN_ZONES.flatMap((z) => [...z.monsters, z.boss].map((m) => [m.id, z] as const)));
const isBoss = (m: MonsterDef) => ZONE_OF.get(m.id)?.boss.id === m.id;

const U = {
  skill: (id: string) => `${BASE_URL}skills/${id}/`,
  support: (id: string) => `${BASE_URL}supports/${id}/`,
  item: (id: string) => `${BASE_URL}items/${id}/`,
  unique: (id: string) => `${BASE_URL}uniques/${id}/`,
  currency: (id: string) => `${BASE_URL}currency/${id}/`,
  area: (id: string) => `${BASE_URL}areas/${id}/`,
  monster: (id: string) => `${BASE_URL}monsters/${id}/`,
};

/** What an entry's links, search result and hover card all show, from one place. */
interface Entity { name: string; kind: string; art: string; pixel?: boolean; text: string }
const ENTITIES = new Map<string, Entity>();
const ent = (url: string, label?: string) => `<a class="ent" href="${url}">${esc(label ?? ENTITIES.get(url)!.name)}</a>`;
const entList = (urls: string[]) => `<div class="linklist">${urls.map((u) => ent(u)).join('')}</div>`;
const chip = (text: string, cls = '') => `<span class="chip ${cls}">${esc(text)}</span>`;
const facts = (rows: [string, string][]) =>
  `<dl class="facts">${rows.filter(([, v]) => v).map(([k, v]) => `<dt>${esc(k)}</dt><dd>${v}</dd>`).join('')}</dl>`;
const spoiler = (label: string, html: string) => `<details class="spoiler"><summary>Spoiler: ${esc(label)} (click to show)</summary>${html}</details>`;
const baseStats = (b: BaseDef) =>
  [
    b.phys ? `${b.phys[0]}-${b.phys[1]} physical` : '',
    b.crit ? `${b.crit}% crit` : '',
    b.armour ? `${b.armour} armour` : '',
    b.evasion ? `${b.evasion} evasion` : '',
    b.energyShield ? `${b.energyShield} energy shield` : '',
  ].filter(Boolean).join(', ');
const uniqueMods = (u: UniqueDef) => u.mods.map(describeUniqueModDef);

function registerEntities() {
  for (const g of ACTIVE_GEMS) ENTITIES.set(U.skill(g.id), { name: g.name, kind: 'Skill gem', art: packArt(GEM_GLYPHS[g.id]), text: g.desc });
  for (const g of SUPPORT_GEMS) ENTITIES.set(U.support(g.id), { name: g.name, kind: g.signatureFor ? 'Signature support' : 'Support gem', art: packArt(GEM_GLYPHS[g.id]), text: g.desc });
  for (const b of BASES) ENTITIES.set(U.item(b.id), { name: b.name, kind: `${title(b.slot)}, level ${b.reqLevel}`, art: packArt(ITEM_ART[b.id]), text: baseStats(b) });
  for (const u of UNIQUES) {
    ENTITIES.set(U.unique(u.id), { name: u.name, kind: `Unique ${baseDef(u.baseId).name}`, art: packArt(UNIQUE_ART[u.id] ?? ITEM_ART[u.baseId]), text: uniqueMods(u).join('; ') });
  }
  for (const c of CURRENCIES) ENTITIES.set(U.currency(c.id), { name: c.name, kind: 'Currency', art: packArt(CURRENCY_ART[c.id]), text: c.desc });
  for (const z of OPEN_ZONES) {
    ENTITIES.set(U.area(z.id), { name: z.name, kind: `Act ${z.act} area, level ${z.levelRange[0]}-${z.levelRange[1]}`, art: packArt(ZONE_ART[z.art ?? z.id]), text: z.desc });
    for (const m of [...z.monsters, z.boss]) {
      ENTITIES.set(U.monster(m.id), { name: m.name, kind: `${isBoss(m) ? 'Boss' : 'Monster'}, level ${m.level}`, art: packArt(MONSTER_ART[m.id]), pixel: true, text: `${dmgName[m.dmgType]} damage. Found in ${z.name}.` });
    }
  }
}

/** Write one entry's page, with its heading, and list it in the search. */
function entry(sectionSlug: string, url: string, keywords: string, chips: string, body: string, banner = '') {
  const section = SECTIONS.find((s) => s.slug === sectionSlug) ?? { slug: 'acts', name: 'Acts and areas' };
  const e = ENTITIES.get(url)!;
  const pic = e.art && !banner
    ? `<img class="entry-art${e.pixel ? ' pixel' : ''}" src="${e.art}" alt="">`
    : banner ? '' : `<span class="entry-art noart">${esc(e.name[0])}</span>`;
  const head = `${banner ? `<img class="entry-banner" src="${banner}" alt="">` : ''}<div class="entry-head">${pic}<div><h1>${esc(e.name)}</h1><div class="chips">${chips}</div></div></div>`;
  write(`${url.slice(BASE_URL.length)}index.html`, frame(url, e.name, head + body, section));
  index(e.name, url, keywords, e.text, e.art);
}

const openZonesText = (zones: ZoneDef[]) => entList(zones.map((z) => U.area(z.id)));

function skillEntry(g: ActiveGemDef) {
  const e = g.effect;
  const lvl = (n: number) => {
    if (e.weaponPct) return `${Math.round(weaponPctAt(g, n))}% of weapon damage`;
    if (!e.base) return '';
    const [lo, hi] = spellBaseAt(g, n);
    return `${lo}-${hi} ${dmgName[e.type ?? 'fire'].toLowerCase()} damage`;
  };
  const rule = g.defaultRule;
  const label = RULE_LABELS[rule.when];
  const status = TARGET_STATUSES.find((t) => t.id === rule.status)?.label;
  const ruleText = `${label.label}${rule.value != null ? ` ${rule.value}${label.unit ?? ''}` : ''}${status ? ` ${status}` : ''}`;
  const weapons = gemWeapons(g);
  const fits = SUPPORT_GEMS.filter((s) => supportFits(s, g));
  const starts = CLASSES.filter((c) => c.starterGems.includes(g.id));
  const near = ACTIVE_GEMS.filter((o) => o.id !== g.id && o.role === g.role && o.attr === g.attr).sort((a, b) => gemReqLevel(a.id) - gemReqLevel(b.id)).slice(0, 8);
  entry('skills', U.skill(g.id), `skill gem ${g.tags.join(' ')}`,
    chip(attrName[g.attr], g.attr) + g.tags.map((t) => chip(t)).join(''),
    `<p>${esc(g.desc)}</p>
${facts([
    ['Required level', String(gemReqLevel(g.id))],
    ['First appears', `Act ${gemAct(g.id)}`],
    ['Mana cost', String(g.manaCost)],
    ['Cooldown', secs(g.cooldownMs)],
    ['Attack or cast time', secs(g.timeMs)],
    ['Damage at gem level 1', esc(lvl(1))],
    [`Damage at gem level ${MAX_GEM_LEVEL}`, esc(lvl(MAX_GEM_LEVEL))],
    ['Weapons', esc(weapons ? weapons.map((w) => WEAPON_FAMILIES[w].name).join(', ') : 'Any')],
    ['Suggested rule', esc(ruleText)],
    ['Starting skill for', esc(starts.map((c) => c.name).join(', '))],
  ])}
<h2 id="supports">Supports that fit (${fits.length})</h2>${fits.length ? entList(fits.map((s) => U.support(s.id))) : '<p>No support fits this skill.</p>'}
${near.length ? `<h2 id="related">Related skills</h2>${entList(near.map((o) => U.skill(o.id)))}` : ''}`);
}

function supportFitsText(g: SupportGemDef) {
  if (g.signatureFor) return `Only ${activeGemDef(g.signatureFor).name}`;
  return [g.fits.join(' or '), g.needs?.length ? `must also be ${g.needs.join(', ')}` : '', g.not?.length ? `not ${g.not.join(', ')}` : ''].filter(Boolean).join('; ');
}

function supportEntry(g: SupportGemDef) {
  const fits = ACTIVE_GEMS.filter((a) => supportFits(g, a));
  entry('supports', U.support(g.id), 'support gem',
    chip(attrName[g.attr], g.attr) + (g.signatureFor ? chip('Signature', 'gold') : ''),
    `<p>${esc(g.desc)}</p>
${facts([
    ['Required level', String(gemReqLevel(g.id))],
    ['First appears', `Act ${gemAct(g.id)}`],
    ['Fits', esc(supportFitsText(g))],
  ])}
<h2 id="skills">Skills it fits (${fits.length})</h2>${entList(fits.map((a) => U.skill(a.id)))}`);
}

function rollableTable(b: BaseDef) {
  const pool = AFFIXES.filter((a) => a.tiers.length && spawnWeight(a, b) > 0);
  const sum = (kind: string) => pool.filter((a) => a.kind === kind).reduce((n, a) => n + spawnWeight(a, b), 0);
  const rows = [...pool].sort((a, c) => a.kind.localeCompare(c.kind) || spawnWeight(c, b) - spawnWeight(a, b)).map((a) => {
    const best = a.tiers.length - 1;
    return [
      `<a href="${BASE_URL}modifiers/#m-${a.id}">${esc(a.text.replace(/\{\d\}/g, '#'))}</a>`,
      a.kind === 'prefix' ? 'Prefix' : 'Suffix',
      `${((spawnWeight(a, b) / sum(a.kind)) * 100).toFixed(1)}%`,
      esc(affixRangeText(a.id, 0)),
      esc(affixRangeText(a.id, best)),
      String(a.tiers[best].ilvl),
    ];
  });
  return rows.length ? table(['Modifier', 'Kind', 'Chance within its kind', 'Lowest tier', 'Best tier', 'Best needs item level'], rows) : '<p>No modifiers roll on this base.</p>';
}

function itemEntry(b: BaseDef) {
  const uniques = UNIQUES.filter((u) => u.baseId === b.id);
  const similar = BASES.filter((o) => o.id !== b.id && !o.retired && o.slot === b.slot && o.family === b.family).sort((x, y) => Math.abs(x.reqLevel - b.reqLevel) - Math.abs(y.reqLevel - b.reqLevel)).slice(0, 6);
  const first = OPEN_ZONES.find((z) => z.levelRange[1] >= b.reqLevel);
  const req = Object.entries(attributeReq(b)).map(([k, v]) => `${v} ${attrName[k as keyof typeof attrName]}`).join(', ');
  entry('items', U.item(b.id), `base ${b.slot}`,
    chip(title(b.slot)) + (b.family ? chip(WEAPON_FAMILIES[b.family].name) : '') + (b.twoHanded ? chip('Two-handed') : ''),
    `${facts([
      ['Required level', String(b.reqLevel)],
      ['Stats', esc(baseStats(b))],
      ['Attack speed', b.speed ? `+${b.speed}%` : ''],
      ['Attributes', esc(req)],
      ['Built-in', esc((b.implicits ?? []).map((i) => i.text).join('; '))],
      ['Drops from', first ? `Item level ${b.reqLevel} and up. First possible around ${ent(U.area(first.id))}` : ''],
    ])}
<h2 id="mods">Modifiers that can roll</h2><p>Chances are for a pick among the modifiers of that kind on this base. Item level also limits which tiers appear.</p>${rollableTable(b)}
${uniques.length ? `<h2 id="uniques">Uniques on this base</h2>${entList(uniques.map((u) => U.unique(u.id)))}` : ''}
${similar.length ? `<h2 id="similar">Similar bases</h2>${entList(similar.map((o) => U.item(o.id)))}` : ''}`);
}

function uniqueEntry(u: UniqueDef) {
  const zones = OPEN_ZONES.filter((z) => z.uniques.includes(u.id));
  const base = baseDef(u.baseId);
  entry('uniques', U.unique(u.id), `unique ${base.name}`,
    chip('Unique', 'gold') + chip(title(base.slot)) + (u.noTrade ? chip("Can't be traded") : ''),
    `<ul>${uniqueMods(u).map((m) => `<li>${esc(m)}</li>`).join('')}</ul><p class="quote">${esc(u.flavour)}</p>
${facts([['Base', ent(U.item(base.id))], ['Required level', String(base.reqLevel)]])}
${zones.length ? `<h2 id="drops">Where it drops</h2>${spoiler('drop areas', openZonesText(zones))}` : ''}`);
}

function currencyEntry(c: CurrencyDef) {
  const first = OPEN_ZONES.find((z) => z.tier >= c.minTier);
  entry('currency', U.currency(c.id), 'currency orb', chip('Currency', 'gold'),
    `<p>${esc(c.desc)}</p>
${facts([
    ['Drops from', c.dropWeight && first ? `Area tier ${c.minTier} and up, first in ${ent(U.area(first.id))}` : 'Does not drop'],
    ['Sell value', String(c.value)],
  ])}`);
}

function monsterRow(m: MonsterDef): string[] {
  return [ent(U.monster(m.id)), String(m.level), esc(dmgName[makeMonster(m, isBoss(m)).dmgType]), esc(m.basic.name)];
}

function bossBlock(b: MonsterDef): string {
  const mech = (b.mechanics ?? []).map((k) => `<li><strong>${esc(MECHANIC_INFO[k].name)}</strong>: ${esc(MECHANIC_INFO[k].tip)}</li>`).join('');
  return `<p><strong>Boss: ${ent(U.monster(b.id))}</strong> (level ${b.level}, ${esc(dmgName[makeMonster(b, true).dmgType])})</p>${mech ? spoiler('boss mechanics', `<ul>${mech}</ul>`) : ''}`;
}

function areaEntry(z: ZoneDef, i: number) {
  const before = z.requires?.after ?? (i > 0 ? [OPEN_ZONES[i - 1].id] : []);
  const opens = OPEN_ZONES.filter((o, n) => (o.requires?.after ?? (n > 0 ? [OPEN_ZONES[n - 1].id] : [])).includes(z.id));
  const gems = ACTIVE_GEMS.filter((g) => gemAct(g.id) === z.act && gemReqLevel(g.id) >= z.levelRange[0] && gemReqLevel(g.id) <= z.levelRange[1]);
  const uniques = z.uniques.filter((id) => UNIQUES.some((u) => u.id === id));
  const body = `<p>${esc(z.desc)}</p>
${facts([
    ['Act', `<a href="${BASE_URL}acts/#act-${z.act}">Act ${z.act}: ${esc(ACTS.find((a) => a.n === z.act)!.name)}</a>`],
    ['Monster levels', `${z.levelRange[0]}-${z.levelRange[1]}`],
    ['Boss appears after', `${z.bossEvery} kills`],
    ['Monsters per wave', `${z.packSize[0]}-${z.packSize[1]}`],
    ['Comes after', before.filter((id) => ENTITIES.has(U.area(id))).map((id) => ent(U.area(id))).join(', ')],
    ['Also needs', z.requires?.bosses ? `${z.requires.bosses} of this act's bosses beaten` : ''],
    ['Leads to', opens.map((o) => ent(U.area(o.id))).join(', ')],
  ])}
<h2 id="monsters">Monsters</h2>${table(['Monster', 'Level', 'Damage', 'Attack'], z.monsters.map(monsterRow))}
<h2 id="boss">Boss</h2>${bossBlock(z.boss)}
${uniques.length ? `<h2 id="uniques">Uniques that drop here</h2>${spoiler('drops', entList(uniques.map(U.unique)))}` : ''}
${gems.length ? `<h2 id="skills">Skills for this level</h2>${entList(gems.map((g) => U.skill(g.id)))}` : ''}`;
  entry('acts', U.area(z.id), `area act ${z.act} ${z.name} ${z.boss.name}`, chip(`Act ${z.act}`, 'gold') + chip(`Level ${z.levelRange[0]}-${z.levelRange[1]}`) + (z.actBoss ? chip('Act boss') : ''),
    z.act >= SPOILER_ACT ? spoiler(`Act ${z.act}`, body) : body, ENTITIES.get(U.area(z.id))!.art);
}

function monsterEntry(m: MonsterDef) {
  const z = ZONE_OF.get(m.id)!;
  const boss = isBoss(m);
  const made = makeMonster(m, boss);
  const res = (['fire', 'cold', 'light', 'chaos'] as const).filter((t) => made.res[t]).map((t) => `${made.res[t]}% ${dmgName[t].toLowerCase()}`).join(', ');
  const casts = [m.slam, m.nova, m.channel].filter(Boolean).map((c) => `${c!.name} (${secs(c!.ms)} wind-up)`).join(', ');
  const mech = (m.mechanics ?? []).map((k) => `<li><strong>${esc(MECHANIC_INFO[k].name)}</strong>: ${esc(MECHANIC_INFO[k].tip)}</li>`).join('');
  const others = [...z.monsters, z.boss].filter((o) => o.id !== m.id);
  const body = `${facts([
    ['Found in', ent(U.area(z.id))],
    ['Level', String(m.level)],
    ['Archetype', made.archetype ? MONSTER_PROFILES[made.archetype].name : 'Encounter summon'],
    ['Life', String(Math.round(made.maxLife))],
    ['Energy Shield', String(Math.round(made.maxEs ?? 0))],
    ['Armour / Evasion', `${Math.round(made.armour ?? 0)} / ${Math.round(made.evasion ?? 0)}`],
    ['Attack / spell block', `${made.blockChance ?? 0}% / ${made.spellBlockChance ?? 0}%`],
    ['Basic hit (before criticals)', String(Math.round(made.damage * (made.basicDamageMult ?? 1)))],
    ['Damage type', dmgName[made.dmgType]],
    ['Attack', `${esc(m.basic.name)} (${m.basic.kind}, ${secs(made.attackMs)})`],
    ['Critical chance / multiplier', `${made.critChance ?? 0}% / ${made.critMulti ?? 1.5}×`],
    ['Ailment', made.attackAilment ? `${title(made.attackAilment)} (${Math.round((made.dotShare ?? 0) * 100)}% of basic damage budget)` : 'Cold and lightning hits can inflict their elemental ailments'],
    ['Resistances', res || 'None'],
    ['Big moves', esc(casts)],
  ])}
${mech ? `<h2 id="mechanics">Mechanics</h2>${spoiler('boss mechanics', `<ul>${mech}</ul>`)}` : ''}
<h2 id="also">Also in this area</h2>${entList(others.map((o) => U.monster(o.id)))}`;
  entry('monsters', U.monster(m.id), `${boss ? 'boss' : 'monster'} ${z.name}`, chip(boss ? 'Boss' : 'Monster', boss ? 'gold' : '') + chip(`Level ${m.level}`) + chip(dmgName[made.dmgType]),
    z.act >= SPOILER_ACT ? spoiler(`Act ${z.act}`, body) : body);
}

function monstersPage(): string {
  const rows = OPEN_ZONES.flatMap((z) => [...z.monsters, z.boss].map((m) => {
    const made = makeMonster(m, isBoss(m));
    return [ent(U.monster(m.id)), isBoss(m) ? 'Boss' : 'Monster', String(m.level), String(Math.round(made.maxLife)), String(Math.round(made.maxEs ?? 0)), String(Math.round(made.damage * (made.basicDamageMult ?? 1))), dmgName[made.dmgType], secs(made.attackMs), `Act ${z.act}`, ent(U.area(z.id))];
  }));
  const mods = MONSTER_MODS.map((m) => [esc(m.name), esc(m.desc), m.minLevel ? String(m.minLevel) : '1']);
  return `<h1>Monsters and bosses</h1><p>Life and damage are for a single normal monster at full strength. Packs split these between their members.</p>
<p>Creature archetypes trade Life for Armour, Evasion, block or Energy Shield. Chaos bypasses ES. Regular monster ES recharges at 5% per second after one second without damage; bosses retain their authored ward recovery instead. Slow basics hit harder and fast basics hit softer; criticals and poison, bleed or burn share the original damage budget. Cold builds Chill/Freeze and lightning builds Shock. Build matchups vary even with equal reference effective pools and raw damage per second.</p>
${table(['Name', 'Kind', 'Level', 'Life', 'ES', 'Basic hit', 'Type', 'Attack interval', 'Act', 'Area'], rows)}
<h2 id="rarity">Monster rarity</h2>
<p>${pct(MONSTER_RARITY.magicPackChance)} of packs are Magic: every monster in the pack shares one modifier, has ${MONSTER_RARITY.magic.life} times Life and ES, and pays ${MONSTER_RARITY.magic.xp} times experience and ${MONSTER_RARITY.magic.loot} times loot. ${pct(MONSTER_RARITY.rareChance)} of other packs contain a Rare with three modifiers, ${MONSTER_RARITY.rare.life} times Life and ES, and ${MONSTER_RARITY.rare.xp} times experience and ${MONSTER_RARITY.rare.loot} times loot.</p>
${table(['Modifier', 'Effect', 'From monster level'], mods)}`;
}

function actsPage(): string {
  let body = `<h1>Acts and areas</h1><p>Each act is a chain of areas. Beating an area's boss opens the road onward. Levels are monster levels.</p>`;
  for (const act of ACTS.filter((a) => a.open)) {
    body += `<h2 id="act-${act.n}">Act ${act.n}: ${esc(act.name)}</h2>`;
    for (const z of OPEN_ZONES.filter((o) => o.act === act.n)) {
      const inner = `<p>${esc(z.desc)}</p>
${table(['Monster', 'Level', 'Damage', 'Attack'], z.monsters.map(monsterRow))}
${bossBlock(z.boss)}
<p class="meta">Boss appears after ${z.bossEvery} kills.</p>`;
      body += `<section class="card" id="${z.id}"><h3>${ent(U.area(z.id))} <small>level ${z.levelRange[0]}-${z.levelRange[1]}${z.actBoss ? ' &middot; act boss' : ''}</small></h3>${act.n >= SPOILER_ACT ? spoiler(`Act ${act.n}`, inner) : inner}</section>`;
    }
    if (act.outro) body += act.n >= SPOILER_ACT ? spoiler(`how Act ${act.n} ends`, `<p class="quote">${esc(act.outro)}</p>`) : `<p class="quote">${esc(act.outro)}</p>`;
  }
  return body;
}

// ---------- gems ----------
function skillsPage(): string {
  const rows = [...ACTIVE_GEMS].sort((a, b) => gemReqLevel(a.id) - gemReqLevel(b.id) || a.name.localeCompare(b.name)).map((g) => {
    return [
      `<span id="${g.id}"></span>${ent(U.skill(g.id))}`,
      String(gemReqLevel(g.id)),
      String(gemAct(g.id)),
      esc(attrName[g.attr]),
      String(g.manaCost),
      secs(g.cooldownMs),
      secs(g.timeMs),
      esc(g.tags.join(', ')),
      esc(g.desc),
    ];
  });
  return `<h1>Skill gems</h1><p>Level is the character level needed. Act is the act the gem first appears in. Cooldown and cast/attack time are before speed bonuses.</p>${table(
    ['Skill', 'Level', 'Act', 'Attribute', 'Mana', 'Cooldown', 'Time', 'Tags', 'What it does'],
    rows,
  )}`;
}

function supportsPage(): string {
  const rows = [...SUPPORT_GEMS].sort((a, b) => gemReqLevel(a.id) - gemReqLevel(b.id) || a.name.localeCompare(b.name)).map((g) => {
    const fits = g.signatureFor ? `Only ${esc(activeGemDef(g.signatureFor).name)}` : esc([...g.fits, ...(g.needs ? g.needs.map((t) => `+${t}`) : [])].join(', ') || 'any');
    const skills = ACTIVE_GEMS.filter((a) => supportFits(g, a)).map((a) => a.name).join('|');
    return [`<span id="${g.id}" data-skills="${esc(skills)}"></span>${ent(U.support(g.id))}`, String(gemReqLevel(g.id)), esc(attrName[g.attr]), fits, esc(g.desc)];
  });
  return `<h1>Support gems</h1><p>A support fits a skill that has any of the listed tags. Signature supports fit one skill only. Pick a skill below to see only the supports that fit it, using the game's own rule.</p>${table(
    ['Support', 'Level', 'Attribute', 'Fits', 'What it does'],
    rows,
  )}`;
}

// ---------- items ----------
function itemsPage(): string {
  const bySlot = new Map<string, typeof BASES>();
  for (const b of BASES.filter((x) => !x.retired)) bySlot.set(b.slot, [...(bySlot.get(b.slot) ?? []), b]);
  let body = `<h1>Item bases</h1><p>The base decides an item's starting stats and what level it can drop at. Modifiers are added on top.</p>`;
  for (const [slot, list] of bySlot) {
    const rows = [...list].sort((a, b) => a.reqLevel - b.reqLevel).map((b) => {
      const req = Object.entries(attributeReq(b)).map(([k, v]) => `${v} ${k}`).join(', ');
      return [`<span id="${b.id}"></span>${ent(U.item(b.id))}`, String(b.reqLevel), esc(baseStats(b)), esc(req), esc((b.implicits ?? []).map((i) => i.text).join('; '))];
    });
    body += `<h2>${esc(title(slot))}</h2>${table(['Base', 'Level', 'Stats', 'Attributes', 'Built-in'], rows)}`;
  }
  return body;
}

function uniquesPage(): string {
  const cards = UNIQUES.map((u) => {
    const mods = uniqueMods(u).map((m) => `<li>${esc(m)}</li>`).join('');
    const where = OPEN_ZONES.filter((z) => z.uniques.includes(u.id));
    return `<section class="card" id="${u.id}"><h3>${ent(U.unique(u.id))} <small>${ent(U.item(u.baseId))}, level ${baseDef(u.baseId).reqLevel}</small></h3><ul>${mods}</ul><p class="quote">${esc(u.flavour)}</p>${where.length ? spoiler('drop areas', openZonesText(where)) : ''}</section>`;
  });
  return `<h1>Unique items</h1><p>${UNIQUES.length} uniques.</p>${cards.join('')}`;
}

function modifiersPage(): string {
  const tagName = (t: string) => title(t);
  const plain = (a: (typeof AFFIXES)[number]) => a.text.replace(/\{\d\}/g, '#');
  const section = (kind: 'prefix' | 'suffix') => {
    const rows = AFFIXES.filter((a) => a.kind === kind && a.tiers.length).map((a) => {
      const best = a.tiers.length - 1;
      const w = Object.entries(a.weights).map(([t, n]) => `${tagName(t)} ${n}`).join(', ');
      return [
        `<span id="m-${a.id}"></span>${esc(a.label)}`,
        esc(plain(a)),
        String(a.tiers.length),
        esc(affixRangeText(a.id, 0)),
        esc(affixRangeText(a.id, best)),
        String(a.tiers[best].ilvl),
        esc(w || 'Never rolls'),
      ];
    });
    return `<h2>${kind === 'prefix' ? 'Prefixes' : 'Suffixes'}</h2>` + table(['Name', 'Modifier', 'Tiers', 'Lowest tier', 'Best tier', 'Best needs item level', 'Spawn weights'], rows);
  };
  // weights by item type: how likely each modifier is to be picked among those that can roll on that type
  const rollable = AFFIXES.filter((a) => a.tiers.length && !a.uniqueOnly);
  const tags = [...new Set(rollable.flatMap((a) => Object.keys(a.weights)))].sort();
  let byType = `<h2 id="weights">Modifier weights by item type</h2><p>When an item gains a modifier, one is picked at random from those that fit it, and a higher weight means a likelier pick. Weights are shown as a share of all prefixes or all suffixes that can roll on that item type. Item level also limits which tiers can appear.</p><p class="meta">Jump to: ${tags.map((t) => `<a href="#w-${t}">${esc(tagName(t))}</a>`).join(' &middot; ')}</p>`;
  for (const t of tags) {
    const pool = rollable.filter((a) => (a.weights as Record<string, number>)[t]);
    const w = (a: (typeof AFFIXES)[number]) => (a.weights as Record<string, number>)[t];
    const sum = (k: string) => pool.filter((a) => a.kind === k).reduce((n, a) => n + w(a), 0);
    const rows = [...pool].sort((a, b) => a.kind.localeCompare(b.kind) || w(b) - w(a)).map((a) => [
      esc(plain(a)),
      a.kind === 'prefix' ? 'Prefix' : 'Suffix',
      String(w(a)),
      `${((w(a) / sum(a.kind)) * 100).toFixed(1)}%`,
    ]);
    byType += `<h3 id="w-${t}">${esc(tagName(t))}</h3>${table(['Modifier', 'Kind', 'Weight', 'Chance within its kind'], rows)}`;
    index(`${tagName(t)} modifier weights`, `${BASE_URL}modifiers/#w-${t}`, 'modifier weights spawn chance');
  }
  for (const a of AFFIXES) index(plain(a), a.tiers.length ? `${BASE_URL}modifiers/#m-${a.id}` : `${BASE_URL}modifiers/`, `modifier ${a.kind} ${a.label}`);
  const slots = [...new Set(BASES.map((b) => b.slot))];
  const explorer = `<div class="jump"><label for="base-jump">See what can roll on a base:</label><select id="base-jump" data-jump><option value="">Choose a base</option>${slots.map((s) => `<optgroup label="${esc(title(s))}">${BASES.filter((b) => b.slot === s).map((b) => `<option value="${U.item(b.id)}#mods">${esc(b.name)}</option>`).join('')}</optgroup>`).join('')}</select></div>`;
  return `<h1>Modifiers</h1><p>Rare items roll prefixes and suffixes. Higher item levels unlock better tiers. <a href="#weights">Jump to weights by item type</a>.</p>${explorer}${section('prefix')}${section('suffix')}${byType}`;
}

// ---------- currency and materials ----------
function currencyPage(): string {
  const cur = CURRENCIES.map((c) => {
    return [`<span id="${c.id}"></span>${ent(U.currency(c.id))}`, esc(c.desc), c.dropWeight ? `Area tier ${c.minTier}+` : 'Does not drop', String(c.value)];
  });
  let body = `<h1>Currency and materials</h1><h2>Currency</h2>${table(['Orb', 'What it does', 'Drops from', 'Sell value'], cur)}`;
  const kinds = new Map<string, typeof MATERIALS>();
  for (const m of MATERIALS) {
    if (m.kind === 'fish' || m.kind === 'currency' || m.kind === 'gold') continue;
    kinds.set(m.kind, [...(kinds.get(m.kind) ?? []), m]);
  }
  for (const [kind, list] of kinds) {
    body += `<h2>${esc(title(kind))}</h2>${table(['Material', 'Notes', 'Sell value'], list.map((m) => {
      index(m.name, `${BASE_URL}currency/#${m.id}`, `material ${kind}`);
      return [`<span id="${m.id}"></span><strong>${esc(m.name)}</strong>`, esc(m.desc ?? ''), String(m.value)];
    }))}`;
  }
  return body;
}

// ---------- classes ----------
function classesPage(): string {
  let body = `<h1>Classes and ascendancies</h1><p>Each class has one combat mechanic of its own. After the first ascendancy trial a class picks one of two ascendancies.</p>`;
  for (const c of CLASSES) {
    index(c.name, `${BASE_URL}classes/#${c.id}`, `class ${c.tagline}`);
    const asc = ASCENDANCIES.filter((a) => a.classId === c.id);
    body += `<section class="card" id="${c.id}"><h2>${esc(c.name)} <small>${esc(c.attribute)}</small></h2><p>${esc(c.desc)}</p>
<p><strong>Mechanic:</strong> ${esc(c.mechanicText)}</p>
${c.bonusText.length ? `<ul>${c.bonusText.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>` : ''}
<p class="meta">Starts with: ${c.starterGems.map((g) => ent(U.skill(g))).join(', ') || 'no skills'}. Starting attributes: ${c.baseAttributes.str} Str, ${c.baseAttributes.dex} Dex, ${c.baseAttributes.int} Int.</p>`;
    for (const a of asc) {
      index(a.name, `${BASE_URL}classes/#${a.id}`, `ascendancy ${c.name}`);
      body += `<div class="sub" id="${a.id}"><h3>${esc(a.name)}</h3><p>${esc(a.plays)}</p><p><strong>Gate:</strong> ${esc(a.gate.desc ?? '')}</p>
<ul>${a.notables.map((n) => `<li><strong>${esc(n.name)}</strong>: ${esc(n.desc ?? '')}</li>`).join('')}${a.capstones.map((n) => `<li><strong>${esc(n.name)}</strong> (capstone): ${esc(n.desc ?? '')}</li>`).join('')}</ul></div>`;
    }
    body += `</section>`;
  }
  return body;
}

// ---------- damage and ailments ----------
function ailmentSkillRows(): string[][] {
  const ailmentOf = { fire: 'Burn', cold: 'Chill', light: 'Shock' } as Record<string, string>;
  const rows: string[][] = [];
  for (const g of [...ACTIVE_GEMS].sort((a, b) => a.name.localeCompare(b.name))) {
    const e = g.effect;
    const link = ent(U.skill(g.id));
    if (e.ailment) rows.push([link, title(e.ailment.kind), `${e.ailment.pctPerSec}% of the hit per second for ${secs(e.ailment.durationMs)}`]);
    const type = e.convert?.type ?? e.type;
    if (e.chillMs) rows.push([link, 'Chill', `Always, for ${secs(e.chillMs)}`]);
    else if (e.ailmentChance && type) rows.push([link, ailmentOf[type] ?? 'None', `${e.ailmentChance}% chance per hit`]);
  }
  return rows;
}

function damagePage(): string {
  const threshold = AILMENT_THRESHOLD_PCT;
  const decay = (threshold * AILMENT_DECAY_PCT) / 100;
  const igniteOfLife = (threshold * IGNITE_SHARE) / 100;
  const burnPerSec = +(BURN_SHARE / (BURN_MS / 1000)).toFixed(2);
  const ignitePerSec = +(IGNITE_SHARE / (IGNITE_MS / 1000)).toFixed(2);
  const shockHalf = (SHOCK_MIN_PCT + SHOCK_MAX_PCT) / 2;
  const { str, dex, int } = ATTRIBUTE_EFFECTS;
  const lookup: [string, string, string][] = [
    ['Physical damage', 'physical', 'damage type armour'],
    ['Elemental damage', 'elemental', 'fire cold lightning resistance'],
    ['Chaos damage', 'chaos', 'damage type'],
    ['Critical strikes', 'crit', 'crit chance multiplier'],
    ['Burn', 'burn', 'ailment fire'],
    ['Ignite', 'burn', 'ailment fire'],
    ['Chill', 'chill', 'ailment cold'],
    ['Freeze', 'chill', 'ailment cold'],
    ['Shock', 'shock', 'ailment lightning'],
    ['Poison', 'poison', 'ailment'],
    ['Bleed', 'bleed', 'ailment'],
    ['Armour and evasion', 'defence', 'mitigation taking damage'],
  ];
  for (const [t, id, k] of lookup) index(t, `${BASE_URL}damage/#${id}`, k);
  return `<h1>Damage and ailments</h1>
<p>How the game works out every hit and ailment. The numbers on this page come from the game's own code.</p>

<h2 id="types">Damage types</h2>
${table(['Type', 'Raised by', 'Reduced on monsters by', 'Reduced on you by', 'Ailment'], [
    [`<strong id="physical">Physical</strong>`, `% physical and Strength (${str.physPctPer}% per point)`, 'Nothing', 'Armour', 'None of its own'],
    [`<strong id="elemental">Fire</strong>`, `% fire, % elemental and Intelligence (${int.elemPctPer}% per point)`, 'Fire resistance', 'Fire resistance', '<a href="#burn">Burn, then Ignite</a>'],
    ['<strong>Cold</strong>', `% cold, % elemental and Intelligence (${int.elemPctPer}% per point)`, 'Cold resistance', 'Cold resistance', '<a href="#chill">Chill, then Freeze</a>'],
    ['<strong>Lightning</strong>', `% lightning, % elemental and Intelligence (${int.elemPctPer}% per point)`, 'Lightning resistance', 'Lightning resistance', '<a href="#shock">Shock</a>'],
    [`<strong id="chaos">Chaos</strong>`, '% chaos only', 'Chaos resistance', 'Chaos resistance', 'Poison when a skill or modifier grants it'],
  ])}
<p>A hit can carry several types at once. Each is raised and resisted on its own, then added into the number you see. A monster's base resistance to its own damage type is ${MONSTER_OWN_RES}%; modifiers and encounter effects can change its resistances. Your own resistances normally cap at ${RES_CAP}%.</p>

<h2 id="attacks">How an attack is worked out</h2>
<ol>
  <li><strong>Base damage:</strong> your weapon's physical damage plus flat damage of each type from anywhere. Dual wielding averages the two weapons.</li>
  <li><strong>Increases by type:</strong> each type is multiplied by its own increases, from the table above. All your increases to a type add together first.</li>
  <li><strong>The skill:</strong> multiply by the skill's weapon damage %, which grows by ${ATTACK_PCT_PER_LEVEL}% of its base per gem level.</li>
  <li><strong>Conversion:</strong> converted physical damage stops using physical increases and uses the new type's instead.</li>
  <li><strong>Skill type:</strong> % melee (physical only) and % projectile.</li>
  <li><strong>More multipliers:</strong> supports, buffs, Rage and the like. Each one multiplies separately, so they are stronger than increases.</li>
  <li><strong>Critical strike:</strong> see <a href="#crit">below</a>.</li>
  <li><strong>The monster:</strong> resistance reduces each type except physical, then shock and other vulnerabilities multiply the total.</li>
</ol>
<p>Attacks can miss. Your chance to hit is between 60% and 95%, from your accuracy and the monster's level:</p>
<p class="formula">Hit chance = 1.25 × accuracy ÷ (accuracy + (0.2 × monster evasion)^0.9), where monster evasion = 30 + 12 × its level</p>
<p>Each point of Dexterity gives ${dex.accuracyPer} accuracy. Attack speed sets how often all of this happens. Only the main hand's speed counts, and each skill has its own base time.</p>

<h2 id="spells">How a spell is worked out</h2>
<p>Your weapon's physical damage, attack speed and crit chance do nothing for a spell. Spells never miss.</p>
<p class="formula">Damage = (the gem's base damage × increases for its type) + (flat fire, cold and lightning × ${SPELL_ADDED_EFFECTIVENESS * 100}%) + "Adds X to Y to Spells" in full</p>
<p>The gem's base damage follows a tapered growth curve. Relative to level 1, its base scales to ${spellGrowth(2).toFixed(2)}× at level 2, ${spellGrowth(10).toFixed(2)}× at level 10 and ${spellGrowth(MAX_GEM_LEVEL).toFixed(2)}× at level ${MAX_GEM_LEVEL}. Flat damage counts your increases to its type too. The total is then multiplied by % spell damage, supports and buffs, and monster resistance applies. Generic flat physical and chaos attack damage do not add to spells.</p>

<h2 id="crit">Critical strikes</h2>
<p class="formula">Crit chance = base crit × (1 + % crit ÷ 100), up to 95%</p>
<p>The base is your weapon's crit for attacks and the gem's own crit for spells. Spells also add % spell crit. A crit multiplies the whole hit by 150% plus your crit multiplier bonuses. Mega Crits are a flat ${MEGA_CRIT_MULTI * 100}% and ignore crit multiplier.</p>

<h2 id="ailments">Ailments</h2>
<p>There are two families. <strong>Burn, chill and shock</strong> roll on each hit and use only their own element's damage. <strong>Poison and bleed</strong> use the whole finished hit, whatever its types.</p>
<h3 id="chance">Chance to apply burn, chill and shock</h3>
<p>Every hit rolls separately for each element in it. The chance starts at 0.</p>
<p class="formula">Chance = the skill's ailment chance + % chance to burn, chill or shock from gear and passives</p>
<p>A skill's chance covers every element in the hit, so added fire on a lightning skill can burn. Skills that say they always chill, and "Cold hits slow" gear, chill on every cold hit.</p>
<h3 id="buildup">Buildup</h3>
<p>Each burn, chill or shock that lands adds its damage to that ailment's buildup on the target, after resistance. Damage from hits that didn't apply the ailment doesn't count.</p>
<p class="formula">Threshold = ${threshold}% of the target's maximum life. Buildup fades by ${AILMENT_DECAY_PCT}% of the threshold per second</p>
<p>That fade is ${decay}% of maximum life per second, so big enemies take far longer and you need steady damage to fill the bar.</p>

<h3 id="burn">Burn and Ignite (fire)</h3>
<p class="formula">Burn = ${BURN_SHARE}% of the hit's fire damage, over ${secs(BURN_MS)} (${burnPerSec}% per second)</p>
<p>Burns pool into one: the damage left on the old burn joins the new one, and the timer restarts. When fire buildup reaches the threshold, the target ignites and its buildup resets.</p>
<p class="formula">Ignite = ${IGNITE_SHARE}% of the buildup, over ${secs(IGNITE_MS)} (${ignitePerSec}% per second)</p>
<p>A full ignite is worth at least ${igniteOfLife}% of the target's maximum life. Only the strongest ignite runs at a time. Example: a monster with 1,000 life has a threshold of ${10 * threshold}. A burn from a 100 fire hit deals ${BURN_SHARE} over ${secs(BURN_MS)}, and an ignite from ${10 * threshold} buildup deals ${(10 * threshold * IGNITE_SHARE) / 100} over ${secs(IGNITE_MS)}.</p>

<h3 id="chill">Chill and Freeze (cold)</h3>
<p>Chill makes the target attack ${CHILL_SLOW_PCT}% slower for ${secs(CHILL_MS)}. "Cold hits slow" adds to that, up to 60%. When cold buildup reaches the threshold, the target freezes and its buildup resets.</p>
<p class="formula">Freeze = ${secs(FREEZE_MS)} on normal monsters, ${secs(BOSS_FREEZE_MS)} on bosses</p>
<p>A frozen target can't act, and freezing breaks a channel. Some supports freeze a target that is already chilled straight away.</p>

<h3 id="shock">Shock (lightning)</h3>
<p class="formula">Shock = ${SHOCK_MIN_PCT}% + (${SHOCK_MAX_PCT - SHOCK_MIN_PCT}% × buildup ÷ threshold) more damage from hits, for ${secs(SHOCK_MS)}</p>
<p>Shock has no second stage: it stops at ${SHOCK_MAX_PCT}% at a full threshold, and buildup only fades once the shock ends. At half the threshold it's ${shockHalf}%. Shock doesn't raise damage over time that is already running, but burns, poisons and bleeds from a hit on a shocked target start larger.</p>

<h3 id="poison">Poison</h3>
<p class="formula">Per second = the finished hit × the skill's % per second × (1 + (% poison + % all ailments) ÷ 100)</p>
<p>Poison stacks: every application runs on its own. "Chance to Poison" gear works on any hit, at ${GEAR_POISON.pctPerSec}% per second for ${secs(GEAR_POISON.durationMs)}. Anything that makes the hit bigger makes the poison bigger, including crits.</p>

<h3 id="bleed">Bleed</h3>
<p class="formula">Per second = the finished hit × the skill's % per second × (1 + (% bleed + % all ailments) ÷ 100) × more bleed</p>
<p>Bleed doesn't stack: only the strongest runs. A new bleed replaces the old one if it is at least as strong. "Chance to Bleed" works on attacks, at 20% per second for 4s. Bleed uses the whole hit, so fire or cold damage on the hit counts too.</p>

<h3 id="duration">Ailment damage and duration</h3>
<p class="formula">Duration = base × the skill's duration × (1 + (% ailment duration + % duration of that ailment) ÷ 100)</p>
<p>Burn and Ignite share the same damage and duration stats. Longer burns, ignites and poisons deal more in total, because damage per second doesn't drop. Chill and shock last longer only from the skill's own duration, and freeze time is fixed. Ailment damage ignores resistance, because the hit it came from was already resisted.</p>

<h3 id="skills">Skills that apply ailments</h3>
${table(['Skill', 'Ailment', 'How'], ailmentSkillRows())}
<p class="meta">Spells and attacks with an elemental ailment chance can also apply the ailments of any other element they carry. Supports and gear add more.</p>

<h2 id="defence">Damage you take</h2>
<p>Armour reduction is capped at ${Math.round(armourReduction(1e12, 1) * 100)}%. For a 100-damage physical hit, 200 Armour prevents ${Math.round(armourReduction(200, 100) * 100)}%; for a 1,000-damage hit, the same Armour prevents ${(armourReduction(200, 1000) * 100).toFixed(1)}%. These examples are calculated by the engine.</p>
<p>Armour works best against small hits: the same armour stops far less of a big one.</p>
<p class="formula">Fire, cold, lightning and chaos hits: damage × (1 − resistance ÷ 100)</p>
<p>Evasion depends on monster level and caps at ${Math.round(evadeChance(1e12, 1) * 100)}%. With 1,000 Evasion against a level-50 monster, the engine gives ${(evadeChance(1000, 50) * 100).toFixed(1)}% avoidance.</p>
<p>Energy Shield recharges ${ES_RECHARGE_PCT}% per second after ${ES_RECHARGE_DELAY_MS / 1000} seconds without a hit. Special skills and modifiers can change these defenses. Heavy boss wind-ups have special avoidance rules; ordinary Evasion alone does not answer them. Blocks stop slams but not novas.</p>`;
}

// ---------- guides: hand-written pages, with live tables and links dropped in ----------
const matName = (id: string) => [...MATERIALS, ...CURRENCIES].find((m) => m.id === id)?.name ?? title(id);
const costText = (cost: Record<string, number>) => Object.entries(cost).map(([id, n]) => `${n.toLocaleString('en')} ${matName(id)}`).join(', ') || 'Free';
const stationTable = (id: StationId) => table(['Level', 'Cost', 'What it gives'], stationDef(id).levels.map((l, i) => [String(i + 1), esc(costText(l.cost)), esc(l.effect)]));
const pct = (n: number, digits = 1) => `${+(n * 100).toFixed(digits)}%`;
const rewardText = (list: { id: string; qty: number }[]) => list.map((r) => `${matName(r.id)} ×${r.qty}`).join(', ');
const zoneBefore = (z: ZoneDef) => {
  const i = OPEN_ZONES.indexOf(z);
  return (z.requires?.after ?? (i > 0 ? [OPEN_ZONES[i - 1].id] : [])).filter((id) => ENTITIES.has(U.area(id)));
};

/** A starter plan. The generator refuses a support that doesn't fit its skill, or a gem nobody could reach by this stage. */
interface Build { classId: string; plays: string; main: string; supports: string[]; extras: string[]; stats: string; rules: string; weapon?: string }
const BUILDS: Build[] = [
  { classId: 'warrior', plays: 'Hit hard, maintain defensive gear and let Rage build.', main: 'heavy_strike', supports: ['faster_attacks', 'brutality', 'life_leech'], extras: ['iron_guard', 'war_cry', 'leeching_blow'], stats: 'Life and Armour, then physical damage.', rules: 'Iron Guard on wind-ups, Leeching Blow on low life, and War Cry on channels.' },
  { classId: 'ranger', plays: 'Shoot fast from a bow, avoid being hit, and keep Momentum up.', main: 'ice_shot', supports: ['faster_attacks', 'added_cold', 'critical_strikes'], extras: ['rain_of_arrows', 'smoke_step', 'barrage'], stats: 'Evasion, attack speed and crit.', rules: 'Smoke Step on wind-ups, and Rain of Arrows at 3 enemies.', weapon: 'Every attack here needs a bow.' },
  { classId: 'mage', plays: 'Spend and recover Mana steadily to build Mana is Power, and clear from range.', main: 'spark', supports: ['added_lightning', 'elemental_focus', 'faster_casts'], extras: ['frost_ward', 'mind_sip', 'shock_nova'], stats: 'Mana, energy shield and elemental damage.', rules: 'Frost Ward on wind-ups, Mind Sip on low mana, and Shock Nova at 3 enemies. Use Frost Needle until Shock Nova.', weapon: 'Every skill here needs a wand, staff or sceptre.' },
  { classId: 'duelist', plays: 'Block and evade to trigger Riposte, and let the counter-attacks do the work.', main: 'twin_strike', supports: ['faster_attacks', 'life_leech', 'brutality'], extras: ['iron_guard', 'ground_slam', 'parry'], stats: 'Evasion and block, then physical damage.', rules: 'Iron Guard on wind-ups, Ground Slam at 3 enemies, and Parry when life is low.' },
  { classId: 'templar', plays: 'Take hits on purpose: every one fills Fervor for a healing nova. Your class bonus favours elemental damage.', main: 'infernal_blow', supports: ['added_fire', 'elemental_focus', 'life_leech'], extras: ['heavy_strike', 'iron_guard', 'consecrate'], stats: 'Life, Armour, resistances and elemental damage.', rules: 'Iron Guard on wind-ups. Start on Heavy Strike until Infernal Blow.', weapon: 'Infernal Blow needs a mace, axe, sceptre or staff. Consecrate needs a wand, staff or sceptre.' },
  { classId: 'shadow', plays: 'Stack poisons and wait for Coup de Grâce. Avoid crit if you want it often, because a normal crit empties Malice.', main: 'poison_dart', supports: ['lingering', 'faster_attacks', 'efficiency'], extras: ['rain_of_daggers', 'twin_strike', 'brine_leech'], stats: 'Evasion, attack speed and ailment damage.', rules: 'Rain of Daggers at 3 enemies, Twin Strike whenever ready, and Brine Leech on low life.', weapon: 'Rain of Daggers needs a dagger.' },
  { classId: 'exile', plays: 'No mechanic and no bonus. From the centre start you hold a Rusted Sword, so play it like a simple Warrior. From another class\'s start, follow that class\'s plan.', main: 'heavy_strike', supports: ['faster_attacks', 'life_leech', 'brutality'], extras: ['ground_slam', 'iron_guard', 'leeching_blow'], stats: 'Life first, then whatever defence your gear rolls.', rules: 'Iron Guard on wind-ups, Ground Slam at 3 enemies, and Leeching Blow on low life.' },
];

function buildsBlock(): string {
  return BUILDS.map((b) => {
    const c = CLASSES.find((x) => x.id === b.classId)!;
    const main = activeGemDef(b.main);
    for (const id of b.supports) {
      const s = SUPPORT_GEMS.find((x) => x.id === id);
      if (!s || !supportFits(s, main)) throw new Error(`wiki: build ${b.classId}: ${id} doesn't fit ${b.main}`);
    }
    for (const id of [b.main, ...b.supports, ...b.extras]) if (gemReqLevel(id) > 16) throw new Error(`wiki: build ${b.classId}: ${id} is past level 16`);
    return `<section class="card" id="${c.id}"><h3><a href="${BASE_URL}classes/#${c.id}">${esc(c.name)}</a></h3><p>${esc(b.plays)}</p>
${facts([
      ['Main skill', ent(U.skill(b.main))],
      ['Supports', b.supports.map((s) => ent(U.support(s))).join(', ')],
      ['Also bring', b.extras.map((s) => ent(U.skill(s))).join(', ')],
      ['Look for', esc(b.stats)],
      ['Rules', esc(b.rules)],
      ['Weapons', esc(b.weapon ?? '')],
    ])}</section>`;
  }).join('');
}

function rulesBlock(): string {
  return table(['Rule', 'Value', 'Needs'], (Object.values(RULE_LABELS)).map((r) => [
    esc(r.label),
    r.status ? 'A status' : r.ground ? 'A kind of ground' : r.defaultValue != null ? `Default ${r.defaultValue}${r.unit ?? ''}` : '',
    r.unlock && !freshAutomation().rules.includes(r.unlock) ? `${esc(RULE_UNLOCK_NAMES[r.unlock])} (War Table level ${ruleUnlockLevel(r.unlock)})${r.act ? `, Act ${r.act}` : ''}` : 'Free',
  ]));
}

function gatheringBlock(): string {
  return Object.values(SKILLS).filter((s) => s.group === 'gathering' && !s.soon).map((s) => {
    const rows = actionsFor(s.id).filter((a) => !a.soon).map((a) => {
      const perHour = 3600000 / a.intervalMs;
      const zone = a.area ?? a.gate?.zone;
      const out = Object.entries(a.outputs ?? {}).map(([id, n]) => `${n} ${matName(id)}`).join(', ');
      const extra = (a.bonus ?? []).map((b) => `${matName(b.id)} ${pct(b.chance)}`).join(', ');
      return [esc(a.name), String(a.level), secs(a.intervalMs), Math.round(perHour * a.xp).toLocaleString('en'), esc(out), pct(a.outputChance ?? 1), esc(extra), zone && ENTITIES.has(U.area(zone)) ? ent(U.area(zone)) : 'From the start'];
    });
    return `<h3 id="${s.id}">${esc(s.name)}</h3><p>${esc(s.desc)}</p>${table(['Spot', 'Level', 'Time', 'XP per hour', 'Gives', 'Yield', 'Extra finds', 'Opens with'], rows)}`;
  }).join('');
}

function walkthroughBlock(): string {
  return ACTS.filter((a) => a.open).map((act) => {
    const rows = OPEN_ZONES.filter((z) => z.act === act.n).map((z) => [
      ent(U.area(z.id)),
      `${z.levelRange[0]}-${z.levelRange[1]}`,
      ent(U.monster(z.boss.id)),
      String(z.bossEvery),
      esc(rewardText(bossTable(z.tier).guaranteed)),
      zoneBefore(z).map((id) => ent(U.area(id))).join(', '),
    ]);
    const trials = TRIALS.filter((t) => t.zoneId && OPEN_ZONES.find((z) => z.id === t.zoneId)?.act === act.n)
      .map((t) => `<p><strong>Trial ${t.n}</strong> at ${t.zoneId ? ent(U.area(t.zoneId)) : esc(t.name)}: ${esc(t.result)}</p>`).join('');
    const inner = table(['Area', 'Levels', 'Boss', 'Kills to boss', 'First-kill reward', 'Comes after'], rows) + trials;
    return `<h2 id="act-${act.n}">Act ${act.n}: ${esc(act.name)}</h2>${act.n >= SPOILER_ACT ? spoiler(`Act ${act.n}`, inner) : inner}`;
  }).join('');
}

/** A calculator's place on a page, with the game numbers it runs on. tools.js does the rest. */
function tool(name: string, data: unknown): string {
  const json = JSON.stringify(data).replace(/</g, '\\u003c');
  return `<div class="tool" data-tool="${name}"></div><script type="application/json" id="tool-data">${json}</script><script src="${BASE_URL}tools.js" defer></script><noscript><p>This tool needs JavaScript.</p></noscript>`;
}

const ZONE_DROPS = () => OPEN_ZONES.map((z) => ({ n: z.name, act: z.act, tier: z.tier, cur: Object.fromEntries(Object.entries(areaCurrency(z)).map(([id, w]) => [matName(id), w])), u:z.uniques.flatMap((id) => UNIQUES.find((u) => u.id === id)?.name ?? []) }));

function dropTool() {
  const tiers = Object.fromEntries(Object.entries(DROP_TABLES).map(([k, t]) => [k, {
    cc: t.currencyChance, ic: t.itemChance, rarity: t.rarity, fc: t.flaskChance, uc: t.uniqueChance,
  }]));
  const bosses = Object.fromEntries(Object.entries(BOSS_TABLES).map(([k, t]) => [k, { uc: t.uniqueChance }]));
  return tool('drop', { areas: ZONE_DROPS(), tiers, bosses });
}

function craftTool() {
  const crafting = Object.values(SKILLS).filter((s) => s.group === 'production');
  const recipes = crafting.flatMap((s) => actionsFor(s.id).filter((a) => !a.soon).map((a) => {
    const zone = a.area ? ENTITIES.get(U.area(a.area))?.name : a.gate?.label;
    const out = a.baseId ? baseDef(a.baseId).name : a.gem ? `a random ${a.gem.kind} gem` : Object.entries(a.outputs ?? {}).map(([id, n]) => `${n} ${matName(id)}`).join(', ');
    return {
      n: a.name, skill: s.name, skillName: s.name, lvl: a.level, ms: a.intervalMs, xp: a.xp,
      in: Object.fromEntries(Object.entries(a.inputs ?? {}).map(([id, n]) => [matName(id), n])),
      out: out || (a.flaskId ? 'a flask' : ''),
      where: zone ? `${zone} open` : '',
    };
  }));
  return tool('craft', { skills: crafting.map((s) => s.name), recipes });
}

function xpTool() {
  const levels = (skill: 'combat' | 'mining', top: number) => Array.from({ length: top + 1 }, (_, l) => xpToReach(skill, l));
  const areas = OPEN_ZONES.map((z) => ({
    n: z.name, act: z.act, min: z.levelRange[0], max: z.levelRange[1],
    xp: z.monsters.reduce((sum, m) => sum + monsterXp(makeMonster(m, false)), 0) / z.monsters.length,
  }));
  // how far past or short of an area's range changes XP, from the game's own function
  const over = OVERLEVEL_XP_PENALTY.map((_, i) => areaXpMultiplier(201 + i, [200, 200]));
  const under = UNDERLEVEL_XP_BONUS.map((_, i) => areaXpMultiplier(199 - i, [200, 200]));
  const spots = Object.values(SKILLS).filter((s) => s.id !== 'combat' && !s.soon).map((s) => ({
    n: s.name, spots: actionsFor(s.id).filter((a) => !a.soon).map((a) => ({ n: a.name, lvl: a.level, ms: a.intervalMs, xp: a.xp })),
  }));
  return tool('xp', { char: levels('combat', 100), skill: levels('mining', 99), areas, over, under, spots });
}

function compareTool() {
  const figures = (item: Item) => itemFigures(item).map((f) => [f.label, f.value, f.digits ?? 0, f.unit ?? '']);
  const req = (b: BaseDef) => Object.entries(attributeReq(b)).map(([k, v]) => `${v} ${attrName[k as keyof typeof attrName]}`).join(', ');
  const stub = { nextUid: 1 } as unknown as GameState;
  const items = [
    ...BASES.map((b) => ({ n: b.name, slot: title(b.slot), lvl: b.reqLevel, req: req(b), mods: (b.implicits ?? []).map((i) => i.text), fig: figures({ uid: 0, baseId: b.id, ilvl: b.reqLevel, rarity: 'normal', name: null, prefixes: [], suffixes: [] }), group: title(b.slot) })),
    ...UNIQUES.map((u) => {
      const b = baseDef(u.baseId);
      return { n: u.name, slot: title(b.slot), lvl: b.reqLevel, req: req(b), mods: [...(b.implicits ?? []).map((i) => i.text), ...uniqueMods(u)], fig: figures(createUnique(stub, u.id, b.reqLevel)), group: 'Uniques' };
    }),
  ];
  const groups = [...new Set(items.map((i) => i.group))].map((n) => ({ n, items: items.flatMap((x, i) => (x.group === n ? [i] : [])) }));
  const first = items.findIndex((i) => i.n === 'Rusted Sword');
  return tool('compare', { items, groups, start: [first, items.findIndex((i, n) => n > first && i.group === 'Weapon')] });
}

function ruleTool() {
  const keys = Object.keys(RULE_LABELS) as RuleCondition[];
  const unlockLevel = (u?: RuleUnlock) => (u ? ruleUnlockLevel(u) : 1);
  const rules = keys.map((id) => {
    const r = RULE_LABELS[id];
    return { id, label: r.label, unit: r.unit, def: r.defaultValue, status: r.status, ground: r.ground, level: unlockLevel(r.unlock), act: r.act };
  });
  const skills = [...ACTIVE_GEMS].sort((a, b) => a.name.localeCompare(b.name)).map((g) => {
    const e = g.effect;
    return {
      n: g.name, mana: g.manaCost, cd: g.cooldownMs ? secs(g.cooldownMs) : '', melee: !!(e.weaponPct || e.base),
      tracked: !!(e.buff || e.blocks || e.evadeMs || e.shieldPct || e.ailment || e.curse || e.minion || e.storm),
      cleanses: cleansesFrostbite(g), breaks: !!(e.interrupts || e.stunChance),
      rule: { i: keys.indexOf(g.defaultRule.when), value: g.defaultRule.value },
    };
  });
  const levels = stationDef('war_table').levels.map((l, i) => ({ level: i + 1, text: l.effect.split(':')[0], slots: i === 0 ? freshAutomation().ruleSlots : l.grants?.ruleSlots }));
  return tool('rules', { rules, skills, levels, statuses: TARGET_STATUSES.map((s) => s.label), grounds: [...GROUND_IN_PLAY].map((g) => title(g)) });
}

function buildTool() {
  const supports = SUPPORT_GEMS.map((s) => ({ id: s.id, n: s.name, lvl: gemReqLevel(s.id) }));
  const skills = ACTIVE_GEMS.map((g) => ({
    id: g.id, n: g.name, attr: g.attr, lvl: gemReqLevel(g.id), w: gemWeapons(g) ?? null,
    levels: Array.from({ length: MAX_GEM_LEVEL }, (_, i) => gemLevelReq(g.id, i + 1)),
    attrs: Array.from({ length: MAX_GEM_LEVEL }, (_, i) => gemAttrReq(g.id, i + 1)),
    sup: SUPPORT_GEMS.flatMap((s, i) => (supportFits(s, g) ? [i] : [])),
  }));
  return tool('build', {
    skills, supports, bar: SKILL_BAR_SLOTS, maxSockets: MAX_SUPPORT_SLOTS, attrs: attrName,
    weapons: Object.fromEntries(Object.entries(WEAPON_FAMILIES).map(([k, f]) => [k, f.name])),
    classes: CLASSES.map((c) => ({ id: c.id, n: c.name, attr: c.baseAttributes })),
  });
}

function passiveCostsBlock(): string {
  const groups = new Map<string, { kind: string; pool: string; cost: number; count: number }>();
  for (const node of PASSIVE_NODES.filter((n) => n.kind !== 'start')) {
    const price = passiveNodeCost(node);
    const key = `${node.kind}:${price.pool}:${price.cost}`;
    const row = groups.get(key) ?? { kind: title(node.kind), pool: price.pool === 'travelPoints' ? 'Travel' : price.pool === 'masteryPoints' ? 'Mastery' : 'Passive', cost: price.cost, count: 0 };
    row.count += 1;
    groups.set(key, row);
  }
  return table(['Node type', 'Point pool', 'Cost', 'Nodes'], [...groups.values()].sort((a, b) => a.pool.localeCompare(b.pool) || a.cost - b.cost).map((r) => [esc(r.kind), r.pool, String(r.cost), String(r.count)]));
}

function runeFamiliesBlock(): string {
  return table(['Family', ...RUNE_READINGS.map((r) => r.label)], RUNE_FAMILIES.map((family) => [
    esc(family.name),
    ...RUNE_READINGS.map((reading) => RUNE_GRADES.map((grade) => describeStat(runeEffect({ id: '', name: '', family, grade }, reading.id).stat, runeEffect({ id: '', name: '', family, grade }, reading.id).value)).join('<br>')),
  ]));
}

function runeGradesBlock(): string {
  return table(['Grade', 'Rune-carving level', 'Minimum item level', 'Time', 'XP'], RUNE_GRADES.map((g) => [esc(g.name), String(g.level), String(g.ilvl), secs(g.intervalMs), String(g.xp)]));
}

function flaskBasesBlock(): string {
  return table(['Flask', 'Belt slot', 'Charges', 'Per use', 'Effect', 'Drops from'], FLASKS.map((f) => [
    esc(f.name), title(f.kind), String(f.maxCharges), String(f.chargesPerUse), esc(f.desc), Number.isFinite(f.dropLevel) ? `Monster level ${f.dropLevel}+` : (f.unique ? 'Special drop only' : 'Brew only'),
  ]));
}

function flaskAffixesBlock(): string {
  return table(['Modifier', 'Type', 'Fits', 'Tiers by item level'], FLASK_AFFIXES.map((a) => [
    esc(a.text.replace('{0}', 'X')), title(a.kind), a.for.map(title).join(', '), a.tiers.map((t) => `${t.ilvl}+: ${Math.abs(t.range[0])}-${Math.abs(t.range[1])}%`).join('<br>'),
  ]));
}

function mealsBlock(): string {
  return table(['Meal', 'Effect'], MEALS.map((m) => [esc(m.name), Object.entries(m.stats).map(([k, v]) => esc(describeStat(k as any, v))).join('<br>')]));
}

function skillBranchesBlock(): string {
  const branches = [...new Set(SKILL_TREE_NODES.map((n) => n.branch).filter((b) => b !== 'core' && b !== 'fishing'))];
  return table(['Branch', 'Level 15', 'Level 30', 'Level 50 keystone'], branches.map((branch) => {
    const nodes = SKILL_TREE_NODES.filter((n) => n.branch === branch);
    const at = (level: number) => nodes.find((n) => n.req?.level === level);
    return [esc(SKILLS[branch as keyof typeof SKILLS]?.name ?? title(branch)), ...[15, 30, 50].map((level) => { const n = at(level); return n ? `<strong>${esc(n.name)}</strong><br>${esc(n.desc)}` : ''; })];
  }));
}

function heistsBlock(): string {
  return table(['Job', 'Level', 'Rooms', 'Room time', 'Markers', 'Alarm per room', 'Favours'], HEIST_JOBS.map((j) => [esc(j.name), String(j.level), String(j.rooms), secs(j.roomMs), String(j.cost), `${j.alert}% x room`, esc(j.favours)]));
}

function roguesBlock(): string {
  return table(['Rogue', 'Hire level', 'Each rank'], ROGUES.map((r) => [esc(r.name), String(r.level), `${Math.round(r.perRank * 100)}% ${esc(r.effect)}`]));
}

function expeditionBlock(): string {
  return table(['Site', 'Culture', 'Level', 'Base artifact rate', 'Finds'], SITES.map((s) => [esc(s.name), esc(CULTURES.find((c) => c.id === s.culture)?.name ?? s.culture), String(s.level), `${s.rate}/hour`, s.finds.map(esc).join('<br>')]));
}

function mapTiersBlock(): string {
  return table(['Tier', 'Level', 'Packs', 'Permanent danger', 'Reward identity'], MAP_TIERS.map((m) => [String(m.tier), String(m.level), String(m.packs), `<strong>${esc(m.modName)}</strong><br>${esc(m.modDesc)}`, esc(m.rewardDesc)]));
}

function normalMapModsBlock(): string {
  return table(['Modifier', 'Danger', 'Reward'], NORMAL_MAP_MODS.map((m) => [esc(m.name), esc(m.dangerDesc), esc(m.rewardDesc)]));
}

function sextantsBlock(): string {
  return SEXTANTS.map((s) => `<h3>${esc(s.name)}</h3><p>${esc(s.desc)}</p>${table(['Possible modifier', 'Effect'], SEXTANT_MODS.filter((m) => m.tier === s.tier).map((m) => [esc(m.name), esc(m.desc)]))}`).join('');
}

function doomedBlock(): string {
  return table(['Map', 'Level', 'Packs', 'Rolled modifiers', 'Uber-key chance'], DOOMED_TIERS.map((d) => [esc(d.name), String(d.level), String(d.packs), d.modCount[0] === d.modCount[1] ? String(d.modCount[0]) : `${d.modCount[0]}-${d.modCount[1]}`, pct(d.keyChance)]));
}

const GUIDE_DATA: Record<string, () => string> = {
  'tool-drop': dropTool,
  'tool-craft': craftTool,
  'tool-xp': xpTool,
  'tool-compare': compareTool,
  'tool-rules': ruleTool,
  'tool-build': buildTool,
  builds: buildsBlock,
  rules: rulesBlock,
  gathering: gatheringBlock,
  walkthrough: walkthroughBlock,
  'war-table': () => stationTable('war_table'),
  watchtower: () => stationTable('watchtower'),
  stations: () => STATIONS.map((s) => `<h3 id="${s.id}">${esc(s.name)}</h3><p>${esc(s.desc)}</p>${stationTable(s.id)}`).join(''),
  instill: () => table(['Condition', 'What it does'], INSTILL_CONDITIONS.map((c) => [esc(c.label), esc(c.desc)])),
  'life-reserve': () => String(LIFE_RESERVE_PCT),
  'haul-cap': () => String(OFFLINE_HAUL_CAP),
  'passive-costs': passiveCostsBlock,
  'rune-families': runeFamiliesBlock,
  'rune-grades': runeGradesBlock,
  'rune-resonance': () => String(RESONANCE_PER_PIECE * 100),
  'flask-bases': flaskBasesBlock,
  'flask-affixes': flaskAffixesBlock,
  'meal-length': () => String(MEAL_MS / 60000),
  'meal-head-chef': () => String(HEAD_CHEF_MORE),
  meals: mealsBlock,
  'skill-branches': skillBranchesBlock,
  heists: heistsBlock,
  rogues: roguesBlock,
  expedition: expeditionBlock,
  'skill-point-cap': () => String(MAX_SKILL_TREE_POINTS),
  'mastery-cap-hours': () => String(MASTERY_CAP / 3600),
  'mastery-speed': () => String(MASTERY_SPEED_MAX),
  'mastery-yield': () => String(MASTERY_YIELD_MAX * 100),
  'mastery-conserve': () => String(MASTERY_CONSERVE_MAX * 100),
  'heist-keeps': () => String(ALARM_KEEPS * 100),
  'heist-stealth-floor': () => String(STEALTH_FLOOR * 100),
  'rogue-rank-cap': () => String(MAX_ROGUE_RANK),
  'crew-slots': () => CREW_SLOT_LEVELS.join(', '),
  'expedition-hours': () => FIND_HOURS.join(', '),
  'expedition-strata': () => STRATA.join(', '),
  'map-tiers': mapTiersBlock,
  'normal-map-mods': normalMapModsBlock,
  sextants: sextantsBlock,
  'sextant-runs': () => String(SEXTANT_BASE_CHARGES),
  'atlas-nodes': () => String(ATLAS_NODES.length),
  'atlas-cap': () => String(ATLAS_POINT_CAP),
  'doomed-tiers': doomedBlock,
  'doomed-mods': () => table(['Modifier', 'Effect'], DOOMED_MODS.map((m) => [esc(m.name), esc(m.desc)])),
  'market-cut': () => String(MARKET_CUT_PCT),
  'market-listings': () => String(MARKET_MAX_LISTINGS),
  trials: () => table(['Trial', 'Place', 'Points', 'Result'], TRIALS.map((t) => [String(t.n), t.zoneId ? ent(U.area(t.zoneId)) : esc(t.name), String(t.points), esc(t.result)])),
  production: () => table(['Skill', 'What it does', 'Recipes'], Object.values(SKILLS).filter((s) => s.group === 'production').map((s) => [esc(s.name), esc(s.desc), String(actionsFor(s.id).length)])),
  drops: () => table(['Tier', 'First area', 'Currency', 'Item', 'Rare share', 'Flask', 'Unique'], Object.entries(DROP_TABLES).map(([tier, t]) => {
    const z = OPEN_ZONES.find((o) => o.tier === +tier);
    const total = t.rarity.normal + t.rarity.magic + t.rarity.rare;
    return [tier, z ? ent(U.area(z.id)) : '', pct(t.currencyChance), pct(t.itemChance), pct(t.rarity.rare / total), pct(t.flaskChance), pct(t.uniqueChance, 2)];
  })),
  'boss-drops': () => table(['Tier', 'First-kill reward', 'Repeat chance', 'Items', 'Rare share', 'Unique'], Object.entries(BOSS_TABLES).map(([tier, t]) => {
    const total = t.rarity.normal + t.rarity.magic + t.rarity.rare;
    return [tier, esc(rewardText(t.guaranteed)), pct(t.repeatChance), t.items[0] === t.items[1] ? String(t.items[0]) : `${t.items[0]}-${t.items[1]}`, pct(t.rarity.rare / total), pct(t.uniqueChance)];
  })),
  mechanics: () => spoiler('boss mechanics', Object.values(MECHANIC_INFO).map((m) => `<h3>${esc(m.name)}</h3><p>${esc(m.tip)}</p>`).join('')),
  'patch-notes': () => NEWS.map((n) => `<h2 id="v${n.version.replace(/\./g, '-')}">${esc(n.version)}: ${esc(n.title)}</h2><p class="meta">${esc(n.date)}</p><ul>${n.items.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>`).join(''),
  version: () => facts([
    ['Game version', esc(VERSION)],
    ['Skill gems', String(ACTIVE_GEMS.length)],
    ['Support gems', String(SUPPORT_GEMS.length)],
    ['Item bases', String(BASES.length)],
    ['Unique items', String(UNIQUES.length)],
    ['Areas', String(OPEN_ZONES.length)],
    ['Monsters and bosses', String(ZONE_OF.size)],
  ]),
};

const GUIDE_LINKS: Record<string, (id: string) => string> = U;

/** Fill a guide's {{data:name}} tables and {{skill:id}} links. A name that doesn't exist fails the build. */
function renderGuide(html: string): string {
  const body = html.replace(/\{\{(\w+):([\w-]+)\}\}/g, (_, kind: string, id: string) => {
    if (kind === 'data') {
      if (!GUIDE_DATA[id]) throw new Error(`wiki: no guide data called ${id}`);
      return GUIDE_DATA[id]();
    }
    const url = GUIDE_LINKS[kind]?.(id);
    if (!url || !ENTITIES.has(url)) throw new Error(`wiki: guide links to unknown ${kind} ${id}`);
    return ent(url);
  });
  const checked = /<!-- checked ([\d.]+) -->/.exec(html)?.[1];
  return `${body}${checked ? `<p class="meta">Guide last checked against game version ${esc(checked)}. Tables and linked stats update with the game. Advice is opinion.</p>` : ''}`;
}

// ---------- write everything ----------
rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

registerEntities();
ACTIVE_GEMS.forEach(skillEntry);
SUPPORT_GEMS.forEach(supportEntry);
BASES.forEach(itemEntry);
UNIQUES.forEach(uniqueEntry);
CURRENCIES.forEach(currencyEntry);
OPEN_ZONES.forEach(areaEntry);
OPEN_ZONES.forEach((z) => [...z.monsters, z.boss].forEach(monsterEntry));

const pages: Record<string, () => string> = {
  acts: actsPage, skills: skillsPage, supports: supportsPage, items: itemsPage,
  uniques: uniquesPage, modifiers: modifiersPage, currency: currencyPage, classes: classesPage, damage: damagePage, monsters: monstersPage,
};
for (const s of SECTIONS) {
  const body = pages[s.slug]();
  write(`${s.slug}/index.html`, frame(s.slug, s.name, body));
  index(s.name, `${BASE_URL}${s.slug}/`, s.blurb);
}
for (const p of extraPages) {
  write(`${p.slug}/index.html`, frame(p.slug, p.name, renderGuide(p.html)));
  index(p.name, `${BASE_URL}${p.slug}/`, 'guide', PLANNED.find((x) => x.slug === p.slug)?.blurb);
}
for (const p of PLANNED.filter((x) => !extraPages.some((e) => e.slug === x.slug))) {
  write(`${p.slug}/index.html`, frame(p.slug, p.name, `<h1>${esc(p.name)}</h1><div class="notice"><p><strong>This page is still being written.</strong></p><p>${esc(p.blurb)}</p></div>`));
  index(p.name, `${BASE_URL}${p.slug}/`, 'guide coming soon', p.blurb);
}

const sectionBy = (slug: string) => SECTIONS.find((s) => s.slug === slug)!;
const feature = (href: string, art: string, name: string, text: string) =>
  `<a class="feature" href="${BASE_URL}${href}/"><img src="${artUrl(art)}" alt="" loading="lazy"><h3>${esc(name)}</h3><p>${esc(text)}</p><span class="arrow">↗</span></a>`;
const reference = (s: Section) =>
  `<a class="reference" href="${BASE_URL}${s.slug}/"><div class="iconbox"><img src="${artUrl(s.art)}" alt="" loading="lazy"></div><div><h3>${esc(s.name)}</h3><p>${esc(s.blurb)}</p></div></a>`;
const home = `<section class="hero" style="--scene:url('${artUrl(HERO_ART)}')"><div class="heroinner">
<div class="eyebrow">The game reference · v${esc(VERSION)}</div>
<h1>The Exile's <em>Codex</em></h1>
<p>Knowledge is the last weapon of the forsaken. Discover the lands beyond the shore, master forbidden skills, and uncover the secrets of every item, class and enemy.</p>
<a class="cta" href="${BASE_URL}getting-started/">BEGIN YOUR JOURNEY ↗</a><a class="cta secondary" href="#explore">EXPLORE THE ARCHIVE ↓</a>
</div><div class="hero-version">✦ GENERATED FROM LIVE GAME DATA</div></section>
<div class="sectionhead"><h2>Begin Your Journey</h2><small>Choose your path through the archive</small></div>
<div class="featuregrid">
${feature('getting-started', GUIDE_ART, 'Getting started', 'Survive the Mud Flats, learn combat, automation and your first upgrades.')}
${feature('acts', sectionBy('acts').art, 'Acts and areas', 'Traverse the campaign. Discover areas, monsters, bosses and encounters.')}
${feature('classes', sectionBy('classes').art, 'Classes and paths', `Find your fighting style among ${CLASSES.length} classes and ${ASCENDANCIES.length} ascendancies.`)}
${feature('uniques', sectionBy('uniques').art, 'Unique treasures', 'Uncover rare equipment, distinctive modifiers and where each item drops.')}
</div>
<div class="sectionhead" id="explore"><h2>Explore the Archive</h2><small>Detailed references and item knowledge</small></div>
<div class="referencegrid">${['skills', 'supports', 'items', 'modifiers', 'currency', 'damage'].map((s) => reference(sectionBy(s))).join('')}</div>
<div class="bottomgrid">
<div class="panel"><h3>New to the Shore?</h3><div class="steps">
<div class="step"><span class="number">01</span><span><b>Enter the Mud Flats.</b> Start your campaign and meet Old Brannoc.</span></div>
<div class="step"><span class="number">02</span><span><b>Set your skill rules.</b> Decide when your abilities fire automatically.</span></div>
<div class="step"><span class="number">03</span><span><b>Claim your first spoils.</b> Equip better gear and prepare for the boss.</span></div>
</div></div>
<div class="panel"><h3>Living Game Archive</h3><p>This wiki is generated directly from the game's own data, so items, stats and areas stay in step with the game.</p><div class="version"><span>Current game data</span><span class="pill">VERSION ${esc(VERSION)}</span></div></div>
</div>`;
write('index.html', frame('index', 'Home', home));

// areas are listed on the Acts page, so their parent address goes there
write('areas/index.html', `<!doctype html><meta charset="utf-8"><meta http-equiv="refresh" content="0;url=${BASE_URL}acts/"><title>Acts and areas</title><a href="${BASE_URL}acts/">Acts and areas</a>`);
write('search-index.json', JSON.stringify(search));
write('hover-cards.json', JSON.stringify(Object.fromEntries([...ENTITIES].map(([u, e]) => [u, { n: e.name, k: e.kind, a: e.art || undefined, p: e.pixel || undefined, t: e.text }]))));
write('wiki.css', readFileSync(join(__dirname, 'wiki-assets', 'wiki.css'), 'utf8'));
write('wiki.js', readFileSync(join(__dirname, 'wiki-assets', 'wiki.js'), 'utf8'));
write('tools.js', readFileSync(join(__dirname, 'wiki-assets', 'tools.js'), 'utf8'));

for (const rel of usedArt) {
  mkdirSync(dirname(join(OUT, 'art', rel)), { recursive: true });
  copyFileSync(join(ROOT, 'src', 'assets', rel), join(OUT, 'art', rel));
}

// a page that links somewhere missing fails the build rather than reaching players
function htmlFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((f) => (f.isDirectory() ? htmlFiles(join(dir, f.name)) : f.name.endsWith('.html') ? [join(dir, f.name)] : []));
}
const html = htmlFiles(OUT);
const broken = new Set<string>();
for (const file of html) {
  for (const [, path] of readFileSync(file, 'utf8').matchAll(/(?:href|src)="\/path-of-idle\/wiki\/([^"#?]*)/g)) {
    if (!existsSync(join(OUT, path)) || (path.endsWith('/') && !existsSync(join(OUT, path, 'index.html')))) broken.add(path);
  }
}
if (broken.size) throw new Error(`wiki: broken links to ${[...broken].join(', ')}`);

console.log(`wiki: ${html.length} pages, ${search.length} searchable entries, ${usedArt.size} art files -> ${OUT}`);
