import { useState } from 'react';
import { ESSENCES, FOSSILS } from '../../data/craftMats';
import { AUTO_CRAFT_BENCH_LEVEL, CRAFT_STEP_MS } from '../../data/hideout';
import { findItem } from '../../engine/crafting';
import { stationLevel } from '../../engine/hideout';
import { affixName, craftUntilReason, methodName, ruleText, startCraftUntil } from '../../engine/craftUntil';
import { eligibleAffixes, itemName } from '../../engine/items';
import { stopAction } from '../../engine/skills';
import type { CraftMethod, GameState, Item, StopRule } from '../../engine/types';
import { game } from '../../game';
import { EmptyState, fmt, GameIcon, ProgressBar } from './common';

/** Every modifier that could roll on this item's base at its item level, ignoring what it has now. */
function rollableAffixes(item: Item) {
  const blank = { ...item, prefixes: [], suffixes: [] };
  return [...eligibleAffixes(blank, 'prefix'), ...eligibleAffixes(blank, 'suffix')];
}

/** Auto-crafting: spend orbs or Essences on an inventory item until a stop rule matches (runs offline too). */
export function CraftUntilCard({ s, item }: { s: GameState; item: Item | undefined }) {
  const [method, setMethod] = useState<'alteration' | 'chaos' | 'essence'>('alteration');
  const [fossil, setFossil] = useState('');
  const [essence, setEssence] = useState('');
  const [affixA, setAffixA] = useState('');
  const [minTier, setMinTier] = useState(0);
  const [affixB, setAffixB] = useState('');
  const run = s.action?.kind === 'craft' ? s.action : null;

  if (run) {
    const target = findItem(s, run.uid);
    return (
      <div className="card">
        <div className="card-title">Auto-crafting</div>
        <p className="small">
          <b>{target ? itemName(target) : 'Item'}</b> · {methodName(run.method)} · stop at {ruleText(run.rule)}
        </p>
        <ProgressBar value={run.progress / CRAFT_STEP_MS} color="var(--currency)" />
        <div className="row" style={{ marginTop: 8 }}>
          <span className="dim small num">
            {run.steps} step{run.steps === 1 ? '' : 's'} so far
          </span>
          <span className="grow" />
          <button className="btn sm" onClick={() => game.act((st) => stopAction(st))}>
            Stop
          </button>
        </div>
      </div>
    );
  }

  if (stationLevel(s, 'bench') < AUTO_CRAFT_BENCH_LEVEL) {
    return (
      <div className="card">
        <div className="card-title">Auto-crafting</div>
        <EmptyState small icon={<GameIcon name="lock" size={24} color="var(--dim)" />}>
          Upgrade the Crafting Bench to level {AUTO_CRAFT_BENCH_LEVEL} to spend orbs automatically until a modifier rolls, even while you're away.
        </EmptyState>
      </div>
    );
  }

  const affixes = item ? rollableAffixes(item) : [];
  const a = affixes.find((x) => x.id === affixA);
  const tiers = a && item ? a.tiers.map((t, i) => ({ t, i })).filter((x) => x.t.ilvl <= item.ilvl) : [];
  const craftMethod: CraftMethod = method === 'essence' ? { essence } : { orb: method, fossil: fossil || null };
  const rule: StopRule = affixB ? { kind: 'twoOf', affixIds: [affixA, affixB] } : { kind: 'has', affixId: affixA, minTier };
  const reason = !item
    ? 'Select an item'
    : !affixA
      ? 'Pick a modifier to stop at'
      : method === 'essence' && !essence
        ? 'Pick an essence'
        : craftUntilReason(s, item.uid, craftMethod, rule);

  return (
    <div className="card">
      <div className="card-title">
        Auto-crafting
        <span className="grow" />
        <span className="card-hint">One step every {CRAFT_STEP_MS / 1000}s, offline too</span>
      </div>
      <div className="catalyst-row">
        <label>
          <span className="dim small">Spend</span>
          <select className="input" value={method} onChange={(e) => setMethod(e.target.value as typeof method)}>
            <option value="alteration">Orb of Alteration ({fmt(s.account.bank.alteration ?? 0)}) — Magic items</option>
            <option value="chaos">Chaos Orb ({fmt(s.account.bank.chaos ?? 0)}) — Rare items</option>
            <option value="essence">Essence — Normal or Magic items</option>
          </select>
        </label>
        {method === 'essence' ? (
          <label>
            <span className="dim small">Essence</span>
            <select className="input" value={essence} onChange={(e) => setEssence(e.target.value)}>
              <option value="">Pick one</option>
              {ESSENCES.map((x) => (
                <option key={x.id} value={x.id} disabled={!s.account.bank[x.id]}>
                  {x.name} ({fmt(s.account.bank[x.id] ?? 0)})
                </option>
              ))}
            </select>
          </label>
        ) : (
          <label>
            <span className="dim small">With Fossil</span>
            <select className="input" value={fossil} onChange={(e) => setFossil(e.target.value)}>
              <option value="">None</option>
              {FOSSILS.map((f) => (
                <option key={f.id} value={f.id} disabled={!s.account.bank[f.id]}>
                  {f.name} ({fmt(s.account.bank[f.id] ?? 0)})
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
      <div className="catalyst-row">
        <label>
          <span className="dim small">Stop when it has</span>
          <select
            className="input"
            value={affixA}
            disabled={!item}
            onChange={(e) => {
              setAffixA(e.target.value);
              setMinTier(0);
            }}
          >
            <option value="">Pick a modifier</option>
            {affixes.map((x) => (
              <option key={x.id} value={x.id}>
                {affixName(x.id)}
              </option>
            ))}
          </select>
        </label>
        {!affixB && (
          <label>
            <span className="dim small">At tier</span>
            <select className="input" value={minTier} disabled={!a} onChange={(e) => setMinTier(Number(e.target.value))}>
              {tiers.map(({ i }) => (
                <option key={i} value={i}>
                  {i === 0 ? 'Any tier' : `T${a!.tiers.length - i} or better`}
                </option>
              ))}
            </select>
          </label>
        )}
        <label>
          <span className="dim small">…or 2 of these (optional)</span>
          <select className="input" value={affixB} disabled={!affixA} onChange={(e) => setAffixB(e.target.value)}>
            <option value="">Just the one</option>
            {affixes
              .filter((x) => x.id !== affixA)
              .map((x) => (
                <option key={x.id} value={x.id}>
                  {affixName(x.id)}
                </option>
              ))}
          </select>
        </label>
      </div>
      <button
        className={`btn block ${reason ? '' : 'primary'}`}
        style={{ marginTop: 10 }}
        disabled={!!reason}
        title={reason ?? ''}
        onClick={() => item && game.act((st, ctx) => startCraftUntil(st, ctx, item.uid, craftMethod, rule))}
      >
        {reason ?? 'Start crafting'}
      </button>
    </div>
  );
}
