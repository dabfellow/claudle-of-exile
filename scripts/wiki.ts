/**
 * Player wiki, generated from the game's own data so it can't drift from the game.
 *   npm run wiki      writes static pages to public/path-of-idle/wiki/ (the build copies them into dist)
 *
 * Hand-written pages live in docs/wiki/*.html (an <h1> plus plain HTML); the generator wraps them in the wiki frame.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { AFFIXES } from '../src/data/affixes';
import { ASCENDANCIES } from '../src/data/ascendancies';
import { BASES, UNIQUES, baseDef, attributeReq } from '../src/data/bases';
import { CLASSES } from '../src/data/classes';
import { ACTIVE_GEMS, SUPPORT_GEMS, activeGemDef, gemAct, gemReqLevel } from '../src/data/gems';
import { CURRENCIES, MATERIALS } from '../src/data/materials';
import { ACTS, MECHANIC_INFO, ZONES, type MonsterDef } from '../src/data/zones';
import { affixRangeText, describeMod } from '../src/engine/items';

const ROOT = join(__dirname, '..');
const OUT = join(ROOT, 'public', 'path-of-idle', 'wiki');
const BASE_URL = '/path-of-idle/wiki/';

const esc = (s: unknown) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const title = (s: string) => s.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());
const attrName = { str: 'Strength', dex: 'Dexterity', int: 'Intelligence' } as const;
const secs = (ms: number) => (ms ? `${+(ms / 1000).toFixed(2)}s` : 'instant');

interface Section { slug: string; name: string; blurb: string }
const SECTIONS: Section[] = [
  { slug: 'acts', name: 'Acts and areas', blurb: 'Every act, area, monster and boss.' },
  { slug: 'skills', name: 'Skill gems', blurb: 'Active skills: cost, cooldown, level and what they do.' },
  { slug: 'supports', name: 'Support gems', blurb: 'Supports and which skills they fit.' },
  { slug: 'items', name: 'Item bases', blurb: 'Every weapon and armour base by slot.' },
  { slug: 'uniques', name: 'Unique items', blurb: 'Unique items, their mods and where they drop.' },
  { slug: 'modifiers', name: 'Modifiers', blurb: 'Every rollable modifier and its tiers.' },
  { slug: 'currency', name: 'Currency and materials', blurb: 'Orbs, crafting materials and gathered goods.' },
  { slug: 'classes', name: 'Classes and ascendancies', blurb: 'The seven classes and twelve ascendancies.' },
];

const search: { t: string; u: string; k: string }[] = [];
const index = (t: string, u: string, k: string) => search.push({ t, u, k });

function frame(slug: string, pageTitle: string, body: string): string {
  const nav = [
    `<a href="${BASE_URL}"${slug === 'index' ? ' class="on"' : ''}>Home</a>`,
    ...extraPages.map((p) => `<a href="${BASE_URL}${p.slug}/"${slug === p.slug ? ' class="on"' : ''}>${esc(p.name)}</a>`),
    ...SECTIONS.map((s) => `<a href="${BASE_URL}${s.slug}/"${slug === s.slug ? ' class="on"' : ''}>${esc(s.name)}</a>`),
  ].join('\n');
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(pageTitle)} - Path of Idle Wiki</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Rubik:wght@500;600&family=Inter:wght@400;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="${BASE_URL}wiki.css">
</head>
<body>
<header class="top">
  <a class="brand" href="${BASE_URL}">PATH OF IDLE <span>WIKI</span></a>
  <input id="q" type="search" placeholder="Search this wiki" autocomplete="off">
  <a class="play" href="/path-of-idle/">Play the game</a>
</header>
<div id="results" hidden></div>
<div class="hero">
  <div class="hero-in">
    <a class="hero-name" href="${BASE_URL}">Path of Idle Wiki</a>
    <nav>${nav}</nav>
  </div>
</div>
<div class="wrap">
<main>
<div class="crumbs"><a href="${BASE_URL}">Path of Idle Wiki</a>${slug === 'index' ? '' : ` <i>&rsaquo;</i> ${esc(pageTitle)}`}</div>
<article>
${body}
<div class="cats"><b>Category:</b> <a href="${BASE_URL}">${slug === 'index' ? 'Main page' : esc(pageTitle)}</a></div>
</article>
</main>
<aside>
  <div class="rail" id="toc" hidden><h4>Contents</h4><ol></ol></div>
  <div class="rail"><h4>Explore</h4><ul>${SECTIONS.map((s) => `<li><a href="${BASE_URL}${s.slug}/">${esc(s.name)}</a></li>`).join('')}</ul></div>
  <div class="rail"><h4>Play now</h4><p>Fed up reading? <a href="/path-of-idle/">Jump into the game</a>.</p></div>
</aside>
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

// ---------- acts and areas ----------
const dmgName: Record<string, string> = { phys: 'Physical', fire: 'Fire', cold: 'Cold', lightning: 'Lightning', chaos: 'Chaos' };

function monsterRow(m: MonsterDef): string[] {
  return [esc(m.name), String(m.level), esc(dmgName[m.dmgType] ?? m.dmgType), esc(m.basic.name)];
}

function bossBlock(b: MonsterDef): string {
  const mech = (b.mechanics ?? []).map((k) => `<li><strong>${esc(MECHANIC_INFO[k].name)}</strong>: ${esc(MECHANIC_INFO[k].tip)}</li>`).join('');
  return `<p><strong>Boss: ${esc(b.name)}</strong> (level ${b.level}, ${esc(dmgName[b.dmgType] ?? b.dmgType)})</p>${mech ? `<ul>${mech}</ul>` : ''}`;
}

function actsPage(): string {
  let body = `<h1>Acts and areas</h1><p>Each act is a chain of areas. Beating an area's boss opens the road onward. Levels are monster levels.</p>`;
  const uniqueName = (id: string) => UNIQUES.find((u) => u.id === id)?.name ?? id;
  for (const act of ACTS.filter((a) => a.open)) {
    const zones = ZONES.filter((z) => z.act === act.n);
    body += `<h2 id="act-${act.n}">Act ${act.n}: ${esc(act.name)}</h2>`;
    for (const z of zones) {
      index(z.name, `${BASE_URL}acts/#${z.id}`, `area act ${act.n} ${z.name} ${z.boss.name}`);
      index(z.boss.name, `${BASE_URL}acts/#${z.id}`, `boss ${z.name}`);
      body += `<section class="card" id="${z.id}"><h3>${esc(z.name)} <small>level ${z.levelRange[0]}-${z.levelRange[1]}${z.actBoss ? ' &middot; act boss' : ''}</small></h3>
<p>${esc(z.desc)}</p>
${table(['Monster', 'Level', 'Damage', 'Attack'], z.monsters.map(monsterRow))}
${bossBlock(z.boss)}
<p class="meta">Boss appears after ${z.bossEvery} kills.${z.uniques.length ? ` Uniques: ${z.uniques.map((u) => `<a href="${BASE_URL}uniques/#${u}">${esc(uniqueName(u))}</a>`).join(', ')}.` : ''}</p></section>`;
    }
    if (act.outro) body += `<p class="quote">${esc(act.outro)}</p>`;
  }
  return body;
}

// ---------- gems ----------
function skillsPage(): string {
  const rows = [...ACTIVE_GEMS].sort((a, b) => gemReqLevel(a.id) - gemReqLevel(b.id) || a.name.localeCompare(b.name)).map((g) => {
    index(g.name, `${BASE_URL}skills/#${g.id}`, `skill gem ${g.tags.join(' ')}`);
    return [
      `<span id="${g.id}"></span><strong>${esc(g.name)}</strong>`,
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
    index(g.name, `${BASE_URL}supports/#${g.id}`, 'support gem');
    const fits = g.signatureFor ? `Only ${esc(activeGemDef(g.signatureFor).name)}` : esc([...g.fits, ...(g.needs ? g.needs.map((t) => `+${t}`) : [])].join(', ') || 'any');
    return [`<span id="${g.id}"></span><strong>${esc(g.name)}</strong>`, String(gemReqLevel(g.id)), esc(attrName[g.attr]), fits, esc(g.desc)];
  });
  return `<h1>Support gems</h1><p>A support fits a skill that has any of the listed tags. Signature supports fit one skill only.</p>${table(
    ['Support', 'Level', 'Attribute', 'Fits', 'What it does'],
    rows,
  )}`;
}

// ---------- items ----------
function itemsPage(): string {
  const bySlot = new Map<string, typeof BASES>();
  for (const b of BASES) bySlot.set(b.slot, [...(bySlot.get(b.slot) ?? []), b]);
  let body = `<h1>Item bases</h1><p>The base decides an item's starting stats and what level it can drop at. Modifiers are added on top.</p>`;
  for (const [slot, list] of bySlot) {
    const rows = [...list].sort((a, b) => a.reqLevel - b.reqLevel).map((b) => {
      index(b.name, `${BASE_URL}items/#${b.id}`, `base ${slot}`);
      const stats = [
        b.phys ? `${b.phys[0]}-${b.phys[1]} physical` : '',
        b.crit ? `${b.crit}% crit` : '',
        b.armour ? `${b.armour} armour` : '',
        b.evasion ? `${b.evasion} evasion` : '',
        b.energyShield ? `${b.energyShield} energy shield` : '',
      ].filter(Boolean).join(', ');
      const req = Object.entries(attributeReq(b)).map(([k, v]) => `${v} ${k}`).join(', ');
      return [`<span id="${b.id}"></span><strong>${esc(b.name)}</strong>`, String(b.reqLevel), esc(stats), esc(req), esc((b.implicits ?? []).map((i) => i.text).join('; '))];
    });
    body += `<h2>${esc(title(slot))}</h2>${table(['Base', 'Level', 'Stats', 'Attributes', 'Built-in'], rows)}`;
  }
  return body;
}

function uniquesPage(): string {
  const dropsIn = (id: string) => ZONES.filter((z) => z.uniques.includes(id)).map((z) => z.name);
  const cards = UNIQUES.map((u) => {
    index(u.name, `${BASE_URL}uniques/#${u.id}`, `unique ${baseDef(u.baseId).name}`);
    const mods = u.mods.map((m) => `<li>${esc(describeMod({ affixId: m.affixId, values: m.values, tier: -1 } as never))}</li>`).join('');
    const where = dropsIn(u.id);
    return `<section class="card" id="${u.id}"><h3>${esc(u.name)} <small>${esc(baseDef(u.baseId).name)}, level ${baseDef(u.baseId).reqLevel}</small></h3><ul>${mods}</ul><p class="quote">${esc(u.flavour)}</p>${where.length ? `<p class="meta">Drops in: ${esc(where.join(', '))}</p>` : ''}</section>`;
  });
  return `<h1>Unique items</h1><p>${UNIQUES.length} uniques.</p>${cards.join('')}`;
}

function modifiersPage(): string {
  const section = (kind: 'prefix' | 'suffix') => {
    const rows = AFFIXES.filter((a) => a.kind === kind && a.tiers.length).map((a) => {
      const best = a.tiers.length - 1;
      return [
        esc(a.label),
        esc(a.text.replace(/\{\d\}/g, '#')),
        String(a.tiers.length),
        esc(affixRangeText(a.id, 0)),
        esc(affixRangeText(a.id, best)),
        String(a.tiers[best].ilvl),
      ];
    });
    return `<h2>${kind === 'prefix' ? 'Prefixes' : 'Suffixes'}</h2>` + table(['Name', 'Modifier', 'Tiers', 'Lowest tier', 'Best tier', 'Best needs item level'], rows);
  };
  for (const a of AFFIXES) index(a.text.replace(/\{\d\}/g, '#'), `${BASE_URL}modifiers/`, `modifier ${a.kind} ${a.label}`);
  return `<h1>Modifiers</h1><p>Rare items roll prefixes and suffixes. Higher item levels unlock better tiers.</p>${section('prefix')}${section('suffix')}`;
}

// ---------- currency and materials ----------
function currencyPage(): string {
  const cur = CURRENCIES.map((c) => {
    index(c.name, `${BASE_URL}currency/#${c.id}`, 'currency orb');
    return [`<span id="${c.id}"></span><strong>${esc(c.name)}</strong>`, esc(c.desc), c.dropWeight ? `Area tier ${c.minTier}+` : 'Does not drop', String(c.value)];
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
<p class="meta">Starts with: ${esc(c.starterGems.map((g) => activeGemDef(g).name).join(', '))}. Starting attributes: ${c.baseAttributes.str} Str, ${c.baseAttributes.dex} Dex, ${c.baseAttributes.int} Int.</p>`;
    for (const a of asc) {
      index(a.name, `${BASE_URL}classes/#${a.id}`, `ascendancy ${c.name}`);
      body += `<div class="sub" id="${a.id}"><h3>${esc(a.name)}</h3><p>${esc(a.plays)}</p><p><strong>Gate:</strong> ${esc(a.gate.desc ?? '')}</p>
<ul>${a.notables.map((n) => `<li><strong>${esc(n.name)}</strong>: ${esc(n.desc ?? '')}</li>`).join('')}<li><strong>${esc(a.capstone.name)}</strong> (capstone): ${esc(a.capstone.desc ?? '')}</li></ul></div>`;
    }
    body += `</section>`;
  }
  return body;
}

// ---------- write everything ----------
rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

const pages: Record<string, () => string> = {
  acts: actsPage, skills: skillsPage, supports: supportsPage, items: itemsPage,
  uniques: uniquesPage, modifiers: modifiersPage, currency: currencyPage, classes: classesPage,
};
for (const s of SECTIONS) {
  const body = pages[s.slug]();
  write(`${s.slug}/index.html`, frame(s.slug, s.name, body));
  index(s.name, `${BASE_URL}${s.slug}/`, s.blurb);
}
for (const p of extraPages) {
  write(`${p.slug}/index.html`, frame(p.slug, p.name, p.html));
  index(p.name, `${BASE_URL}${p.slug}/`, 'guide');
}

const home = `<h1>Path of Idle Wiki</h1>
<p>Everything here is generated from the game's own data, so it always matches the version you are playing.</p>
${extraPages.length ? `<h2>Guides</h2><ul class="tiles">${extraPages.map((p) => `<li><a href="${BASE_URL}${p.slug}/">${esc(p.name)}</a></li>`).join('')}</ul>` : ''}
<h2>Reference</h2>
<ul class="tiles">${SECTIONS.map((s) => `<li><a href="${BASE_URL}${s.slug}/">${esc(s.name)}</a><span>${esc(s.blurb)}</span></li>`).join('')}</ul>
<p class="meta">Game version ${esc(JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')).version)}.</p>`;
write('index.html', frame('index', 'Home', home));

write('search-index.json', JSON.stringify(search));
write('wiki.css', readFileSync(join(__dirname, 'wiki-assets', 'wiki.css'), 'utf8'));
write('wiki.js', readFileSync(join(__dirname, 'wiki-assets', 'wiki.js'), 'utf8'));

console.log(`wiki: ${SECTIONS.length + extraPages.length + 1} pages, ${search.length} searchable entries -> ${OUT}`);
