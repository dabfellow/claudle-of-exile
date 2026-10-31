# The Ashen Codex — Path of Idle design system

Melvor Idle's usability with Path of Exile's grim atmosphere. The aim is clarity first:
flat dark surfaces, one warm accent, quiet borders, readable type, and states you can
read at a glance after hours of idle play. Ornament comes from the illustrations, not
from the chrome around them.

Everything lives in [`src/styles.css`](../../src/styles.css). Components never hardcode a
colour: they use the tokens below (data colours that come from game data, such as a
skill's or zone's colour, are passed in as CSS variables like `--zone`, `--station`,
`--rar`).

## 1. Tokens

### Colour

| Token | Value | Use |
| --- | --- | --- |
| `--bg` | `#101317` | page background |
| `--bg-2` | `#0C0F12` | sunken wells: inventory grids, inputs, slots |
| `--panel` | `#191D23` | cards and panels |
| `--panel-2` | `#242930` | raised: buttons, nested tiles, hover |
| `--panel-3` | `#2C323A` | raised hover / pressed |
| `--line` | `#2A3038` | default border (desaturated slate) |
| `--line-2` | `#3A424D` | strong border, hover border |
| `--text` | `#E5DCCE` | primary text |
| `--muted` | `#92969E` | secondary text |
| `--dim` | `#81868E` | tertiary text, hints (≥ 4.5:1 on `--panel`) |
| `--accent` | `#D1AD72` | gold: primary actions, current/selected, completion |
| `--accent-2` | `#E6C894` | bright gold for numbers and highlights |
| `--accent-soft` | gold @ 12% | selected / current backgrounds |
| `--accent-line` | gold @ 45% | selected / current borders |
| `--success` | `#729881` | running activity, success fills and borders |
| `--good` | `#8DB39C` | success **text** (tint of success for contrast) |
| `--danger` | `#A9635A` | destructive actions, danger fills and borders |
| `--bad` | `#CC8478` | danger **text** |
| `--warn` | `#C99A55` | warnings, risky |

Soft variants (`--success-soft`, `--danger-soft`, `--warn-soft`) are 12% tints for
badge and alert backgrounds.

Game semantics: rarity `--normal --magic --rare --unique --crafted --currency`;
resources `--life --life-2 --mana --mana-2`; damage `--phys --fire --cold --light`;
attributes `--str --dex --int`. Rarity colours are slightly desaturated versions of
PoE's so they sit on the palette without glowing.

### Type

- **Inter** (`--font`) for everything you read while playing: numbers, labels, cards,
  nav, buttons, tooltips, item names. Numbers use `.num` (tabular figures).
- **Cinzel** (`--font-display`) only for page titles (`h1`), section/act headings
  (`h2`), NPC and character names, and thematic headings (quest titles, the brand).

| Token | Size | Use |
| --- | --- | --- |
| `--fs-2xs` | 11px | the floor: only for micro labels inside item cells and slot keys |
| `--fs-xs` | 12px | meta lines, badges, hints |
| `--fs-sm` | 13px | dense UI: buttons, chips, card body |
| `--fs` | 14px | body |
| `--fs-md` | 16px | card titles, emphasised values |
| `--fs-lg` | 20px | section headings, big numbers |
| `--fs-xl` | 28px | page titles |

Labels (`.section-label`, nav groups) are 12px semibold uppercase with `0.06em`
tracking, never more. Line height 1.45 for body, 1.2 for headings.

### Spacing, radius, elevation

- Spacing scale `--s-1 … --s-7`: 4, 8, 12, 16, 24, 32, 48. Cards pad `--s-4`; grids
  gap `--s-3`; page sections gap `--s-5`.
- Radius: `--r-xs` 4 (pips, socket keys), `--r-sm` 6 (buttons, inputs, tiles),
  `--r` 8 (cells, nested panels), `--r-lg` 12 (cards, modals), `--r-pill` 999 (badges).
- Elevation: cards are flat (border only). `--shadow` for popovers (tooltips, toasts,
  modals) and nothing else.
- Motion: `--dur-fast` 120ms, `--dur` 200ms, `--ease`. Hover lifts are 1–2px at most.
  `prefers-reduced-motion` and the in-game *Reduce motion* setting turn off all
  animation and transitions.

## 2. Interaction states

Every interactive component uses the same vocabulary:

| State | Treatment |
| --- | --- |
| hover | border → `--line-2`, surface one step lighter |
| focus-visible | 2px gold ring offset from the surface (`--focus`) |
| pressed | `translateY(1px)` |
| disabled | 45% opacity, `not-allowed` cursor, no hover |
| selected / current | `--accent-line` border, `--accent-soft` background |
| **active** (running activity) | `--success` border, a success status badge and a progress bar |
| **locked** | 55% opacity, greyscale art, lock badge with the requirement, no hover lift |
| **unavailable** (unlocked but can't start: missing materials, full inventory) | full opacity, the reason in `--bad` text, disabled button |
| **completed** | gold border and medallion, a "Complete" badge |

## 3. Components

Shared React components live in [`src/ui/components/common.tsx`](../../src/ui/components/common.tsx);
the rest are CSS classes.

| Component | Where | Notes |
| --- | --- | --- |
| `PageHeader` | every page | title (Cinzel), subtitle, optional kicker and actions |
| `Tabs` | Trader, Stash, Tree, Campaign, skill filters, inventory sort | one style: segmented, gold underline for the active tab, optional count badge |
| `.card`, `.card-title`, `.section-label` | everywhere | Inter titles |
| `.card-grid` | all card lists | `auto-fill, minmax(var(--card-min), 1fr)` |
| `SkillHeader` | every gathering/production skill | icon, name, level, XP bar, XP/hour |
| `.action-card` | skill activities | art, name, meta, inputs → outputs, status badge, one button |
| `.station` | Hideout | illustration header, level pips, *Now/Next* benefit rows, cost, upgrade |
| `.achievement` | Achievements | compact medallion card, progress, rewards |
| `.offer-card`, `.cell` | Trader, Stash, Equipment | rarity edge + tint; price row |
| `.npc-panel` | Trader, quest tracker | portrait, Cinzel name, italic quote |
| `.modal`, `.tip`, `.toast` | overlays | the only places with shadow |
| `EmptyState` | empty lists | icon, title, one line of help |
| `.btn` (`primary`, default secondary, `ghost`, `danger`, `sm`, `lg`) | everywhere | primary is solid gold, at most one per card |
| `.bar` | progress | 8/12/20px heights, flat fill, no gloss |
| `Badge` (`.badge` + tone) | statuses, counts | neutral, gold, success, danger, warn |
| `.chip` / `CurrencyAmount` | currency displays | icon, tabular number, optional name |

## 4. Layout

- Three columns: sidebar nav (232px), main, activity/combat log (300px). Below 1200px
  the log hides (the quest tracker floats); below 860px the nav becomes a scrollable
  icon strip above the content.
- The centre uses one container: `.page` (max 1280px, `.page.wide` 1440px) with
  `--s-5` gaps, so pages fill wide screens without a sea of empty space.
- Card lists are `.card-grid`s; set `--card-min` per page instead of writing grid CSS.

## 5. Shared components updated first

1. Tokens, base type and body (`:root`, `h1–h3`, `.num`, text tones).
2. Buttons, tabs, badges, chips, inputs, progress bars, focus rings.
3. Cards, card titles, section labels, card grids, empty states.
4. Sidebar nav, top bar, activity/combat log, XP footer.
5. Tooltips, modals, toasts.
6. Item cells and item tooltips (rarity), currency/material tiles.

Then the screens: skill pages → Hideout → Trader → Achievements → Stash and
Equipment → Campaign, Combat, Bench, Skills, Tree, Settings, boot screens.
