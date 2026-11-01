# Ascendancies

Drafted 2026-10-30, decided 2026-10-31, built 2026-10-31 (see [Built](#built)). They arrive in Milestone 6 of the
[MILESTONES.md](../MILESTONES.md), and stay switched off for live players until Act 3 opens.

**Settled:** two per class for the six main classes, 12 in total. Exile has none. Picking one opens its own tree, on a
new tab in the passive tree. Names are a first pass.

## How a section is laid out

Every section has the same shape, about 12 nodes:

```
Gate ─ small ─ small ─ Notable ─┐
  ├─── small ─ small ─ Notable ─┼─ small ─ Capstone
  └─── small ─ small ─ Notable ─┘
```

- **Gate:** free when you pick. It holds the headline rule, so the character changes the moment you choose.
- **Notables:** three that lean into that rule in different ways.
- **Capstone:** a keystone that finishes the idea.

The class mechanic rules in [CLASSES.md](CLASSES.md) still apply: everything has to work while idling, tactics rules
make it better, and each rule fits in one sentence.

## At a glance

| Class | Ascendancy | In a line |
|---|---|---|
| Warrior | Ravager | Rage builds to a rampage that hits everything next to you |
| Warrior | Anvil | Rage comes from being hit, and enemies break on your Armour |
| Ranger | Longshot | Momentum becomes damage, so you fire slow shots that kill at range |
| Ranger | Falconer | Momentum drives a hawk that hits what you can't reach |
| Mage | Wildcaster | Mana is Power flipped: the emptier you are, the harder you hit |
| Mage | Alchemist | Flask charges count as mana, and every flask you drink explodes |
| Duelist | Matador | Only evades Riposte, and a streak of them grows huge |
| Duelist | Vanguard | Only blocks Riposte, and each one hits everything next to you |
| Templar | Flagellant | You hurt yourself to fill Fervor, so novas fire on trash too |
| Templar | Lightkeeper | You store novas and release them when it counts |
| Shadow | Headsman | A killing Coup de Grâce refunds Malice and chains through packs |
| Shadow | Plaguewright | Ailments fill Malice, and Coup de Grâce bursts them |

## Warrior

### Ravager
*"Let it build, then let it out."*

- **Plays:** surges instead of a steady ramp. Quiet until the meter fills, then the whole front line goes down. Best in
  the swarm, and the "class meter full" tactic lets you line up Berserk with it.
- **Gate:** at full Rage you Rampage for 6s: melee hits strike all of ring 1 while Rage drains to 0.
- **Notables:** *Bloodlust* (kills add time to the Rampage), *Trample* (it reaches ring 2), *Red Haze* (more attack speed
  during it).
- **Capstone:** *No Mercy*: Rage stops draining during a Rampage while you keep getting kills.

### Anvil
*"They break on you."*

- **Plays:** your damage comes from being hit, so Armour is your damage stat and attack speed barely matters. It wants
  ring 1 full, is the easiest class to leave idling, and is slow when few enemies come at you.
- **Gate:** you gain Rage from hits you take instead of hits you deal, and attackers take damage based on your Armour
  and Rage.
- **Notables:** *Hold the Line* (more Rage per enemy in ring 1), *Shatter* (surviving a boss wind-up fills Rage), *Temper*
  (blocked hits still count).
- **Capstone:** *Unmoved*: enemies that hit you at full Rage are stunned.

## Ranger

### Longshot
*"One arrow, well placed."*

- **Plays:** slow, heavy shots that kill things before they arrive, using Farthest targeting. Weak for the first few
  shots of a fight, and in trouble if the swarm reaches you.
- **Gate:** Momentum grants more damage instead of attack speed, doubled against enemies in rings 3–4.
- **Notables:** *Head Start* (begin each fight with Momentum), *Pin* (your hits slow enemies walking in), *Steady Aim*
  (being hit removes less Momentum).
- **Capstone:** *Last Arrow*: at full Momentum your next attack spends it all on a guaranteed crit that hits the whole
  line to the target.

### Falconer
*"Never hunts alone."*

- **Plays:** two attackers. The hawk ignores blocked paths, so casters behind the front line stop being a problem, and
  you pick its target priority separately from your own.
- **Gate:** a hawk attacks alongside you, and each Momentum makes it attack faster.
- **Notables:** *Talons* (hawk hits Bleed), *Hooded* (it goes for ranged enemies first), *Bond* (its hits count as attacks
  for Momentum).
- **Capstone:** *Stoop*: at full Momentum the hawk dives for a huge hit that stuns.

## Mage

### Wildcaster
*"Spend it all."*

- **Plays:** the opposite of careful mana use. You burn the tank on cheap spells, peak near empty, then wait out a
  dry spell. Max mana stops being damage and mana regen becomes pacing, so gear choices flip.
- **Gate:** Mana is Power is reversed: 30% more spell damage at empty mana, 0% at full.
- **Notables:** *Ragged Edge* (more bonus below 25% mana), *Feedback* (kills restore a little mana), *Backdraft* (spells
  cost less while you're below half).
- **Capstone:** *Burnout*: hitting 0 mana makes your next 3 spells free at the full bonus.

### Alchemist
*"The brew is the spell."*

- **Plays:** flasks are your main weapon. Kills refill charges and charges fuel spells, so fast clearing feeds itself,
  and it pairs with Instilling Orb auto-flasks for idling. Flask Effect becomes a damage stat.
- **Gate:** Mana is Power also counts flask charges, and every flask you drink bursts on your target.
- **Notables:** *Volatile Mix* (bursts hit nearby enemies), *Deep Cellar* (more maximum charges), *Tonic* (flasks restore
  mana).
- **Capstone:** *Philosopher's Draught*: each active flask adds more damage, and they stack.

## Duelist

### Matador
*"Let it miss by an inch."*

- **Plays:** pure Evasion with no block. Damage climbs through a long fight, and one clean hit on you throws the streak
  away, so it's a high wire compared to steady Riposte.
- **Gate:** only evades trigger Riposte, and each Riposte in a row adds damage to the next, until you're hit.
- **Notables:** *Veronica* (higher streak cap), *Close Call* (being hit halves the streak instead of ending it), *Crowd's
  Roar* (attack speed per streak).
- **Capstone:** *Moment of Truth*: at a streak of 10 your next Riposte is a Mega Crit.

### Vanguard
*"Hold the line."*

- **Plays:** shield and Armour. Block chance becomes area damage, and guard skills like Iron Guard and Parry turn into
  your pack clear. Slower on one target, excellent in the swarm.
- **Gate:** only blocks trigger Riposte, and each one hits all of ring 1.
- **Notables:** *Raised Shield* (more Block chance), *Press Forward* (Ripostes reach ring 2), *Stand Fast* (each block
  grants Armour briefly).
- **Capstone:** *Phalanx*: blocking a boss wind-up triggers a Riposte for triple damage.

## Templar

### Flagellant
*"Pain on demand."*

- **Plays:** a hurt and heal loop. Templar normally barely fills Fervor on trash, but this fills it everywhere. It needs
  Life regen to stay safe, and a bad setup can kill itself offline.
- **Gate:** using a skill costs a little Life, and that Life fills Fervor three times as fast as a hit.
- **Notables:** *Scourge* (more nova damage from self-harm), *Mortify* (more damage while below half Life), *Absolution*
  (more nova healing).
- **Capstone:** *Ecstasy*: while below half Life your skills are faster and cost no mana.

### Lightkeeper
*"Hold the light until it's needed."*

- **Plays:** the hands-on Templar. Save novas through a fight, then spend them on a boss wind-up as a burst and a heal.
  Left alone it releases at full, and reactive rules let it hold for the right moment on idle.
- **Gate:** Fervor stores up to 3 novas, released when full unless a tactic or a click says otherwise.
- **Notables:** *Reserve* (stored novas grow stronger), *Vespers* (a nova also grants a shield), *Beacon* (a nova hits
  every ring).
- **Capstone:** *Dawn*: releasing all 3 at once stuns everything and absorbs the next boss wind-up.

## Shadow

### Headsman
*"One cut per neck."*

- **Plays:** the low-crit path made into a pack killer. Lowest Life targeting and a cheap meter let one Coup chain into
  the next, so it clears in streaks, with long gaps when a boss won't die to one.
- **Gate:** a Coup de Grâce that kills refunds half the Malice meter.
- **Notables:** *Sharp Axe* (more Coup damage to wounded enemies), *Marked* (a Coup that doesn't kill makes the target
  take more damage), *Next* (Malice carries into the next fight).
- **Capstone:** *The Block*: a Coup de Grâce kills any non-boss below 30% Life outright.

### Plaguewright
*"Let it spread."*

- **Plays:** hit once and wait. You rely on ailments rather than hits, spreading them across the field with Ailing
  targeting. Poison Dart and Ignite builds get a big finish they don't have today.
- **Gate:** ailments ticking on enemies fill Malice, and a Coup de Grâce bursts every ailment on its target.
- **Notables:** *Incubation* (longer ailments), *Bloom* (more burst damage per ailment type), *Contagion* (kills spread
  ailments).
- **Capstone:** *Pandemic*: the burst copies the ailments to enemies within 1 ring.

## Decisions (2026-10-31)

1. **Twist:** the gate changes a rule of the class mechanic, as written above.
2. **Three trials:** one at the start of Act 3 opens the gate and the choice, one at the end of Act 4 opens the notables,
   and one at the start of Act 6 opens the capstone.
3. **Own points:** the first pass of each trial gives ascendancy points that only work here; bosses give none (changed
   2026-11-01). They stop short of the whole section, and the main tree loses nothing.
4. **Separate tree:** the ascendancy gets its own tab in the passive tree after the first trial. So it's usable the
   moment you pick, and the layout above stands on its own.
5. **Switching:** allowed for a rare material, plus the usual Orb of Regret per node.
6. **Exile:** no ascendancy, in the campaign or in challenge modes. This keeps [CLASSES.md](CLASSES.md)'s rule that Exile
   gets no gameplay rewards.

## Defaults

- Existing mechanic keystones like Endless Fury still work alongside any ascendancy, and odd combinations are left in.
- You can read both ascendancies before you choose.
- Challenge modes work the same way.
- The hawk is the one new thing on the battlefield. It doesn't take up a hex.

## Built

Data is in `src/data/ascendancies.ts`, choice, points and switching in `src/engine/ascendancy.ts`, and the rules in
`src/engine/mechanics.ts` (numbers at the top) and `src/engine/combat.ts`. All 12 gates work; notables and capstones are
built and tested. Trial 2 stands on the Giants' Throne (Act 4) and opens the notables. Trial 3 stands on the Exiles' Gate, the first stage of Act 6, and opens the capstones.

Calls made while building:

- **Switching price:** 1 Divine Orb, plus an Orb of Regret per node. Divine is already a rare drop and the deepest boss
  table guarantees one, so no new source or art was needed.
- **Points:** trials give 3 each, 9 of the 11 the section could use, so nobody fills it. That buys three of the four big
  nodes: all three notables, or two notables, the bridge and the capstone with a point over. Saves were cut back to this
  in v30, and a tree holding more than its points was refunded.
- **Ravager:** a Rampage drains on a clock, so hits during it don't hold it up. It counts as a full meter for tactics, so
  Berserk can line up. No Mercy holds the drain for 2s per kill.
- **Anvil:** attackers take 4% of your Armour, plus 5% of that per Rage.
- **Longshot:** 3% more attack damage per Momentum, the same number as the speed it replaces.
- **Falconer:** the hawk swings every 1.6s for half a weapon hit, 6% faster per Momentum. It has its own Targeting, set on
  the Ascendancy tab. Stoop spends the Momentum, or every attack at full would be a dive. It has no sprite yet: its hits
  show as ordinary hit numbers.
- **Burnout:** "hitting 0" means a spell leaves you unable to pay for it again, since mana rarely lands on exactly 0. It
  rearms above half Mana.
- **Alchemist:** one charge counts as 3 Mana, so a full belt weighs about as much as a mid-game mana pool. A burst is 12
  fire damage per character level, before Flask Effect.
- **Matador:** a Riposte that misses doesn't add to the streak. Each one adds 15% more damage.
- **Flagellant:** bar skills cost 3% of max Life; the free Default Attack doesn't. At that price a nova every seven
  casts about pays back what it cost, so Life regen is what keeps you ahead.
- **Lightkeeper:** the release setting on the Ascendancy tab is the "tactic": at 3, on a wind-up, below half Life, or by
  click, with the middle two needing their War Table rules. "On a wind-up" still releases at 3 against trash.
- **Beacon changed:** novas already hit every ring, so it would have done nothing. It breaks armour on every ring instead.
- **Plaguewright:** each ailment ticking gives 0.5 Malice per second. A burst deals everything left on the ailments and
  ends them.
