import { useState } from 'react';
import { FLASKS, flaskDef, INSTILL_CONDITIONS } from '../../data/flasks';
import { describeFlaskMod, flaskEffectText, flaskName, flaskStats } from '../../engine/flasks';
import type { FlaskInstance } from '../../engine/types';
import { game } from '../../game';
import { artUrl, Tabs, togglePin, Tooltip } from './common';
import { packArtUrl } from '../assets';

/** A flask bottle: liquid level shows charges. With art, the art sits behind a charge meter. */
export function FlaskIcon({ f, size = 34 }: { f: FlaskInstance; size?: number }) {
  const st = flaskStats(f);
  const fill = st.maxCharges ? Math.min(1, f.charges / st.maxCharges) : 0;
  const key = `flasks/${f.flaskId}`;
  const own = artUrl(key);
  const art = own ?? packArtUrl(key);
  if (art)
    return (
      <span className="flask-art" style={{ width: size, height: size, ['--flask' as string]: st.def.color }}>
        <img className={`art ${!own ? 'pack-art' : ''}`} src={art} alt={st.def.name} width={size} height={size} loading="lazy" decoding="async" draggable={false} />
        <span className="flask-art-meter">
          <span className="flask-art-fill" style={{ height: `${fill * 100}%` }} />
        </span>
      </span>
    );
  return (
    <span className="flask-icon" style={{ width: size * 0.62, height: size, ['--flask' as string]: st.def.color }}>
      <span className="flask-icon-neck" />
      <span className="flask-icon-body">
        <span className="flask-icon-liquid" style={{ height: `${fill * 100}%` }} />
      </span>
    </span>
  );
}

export function FlaskTip({ f, pinned = false }: { f: FlaskInstance; pinned?: boolean }) {
  const st = flaskStats(f);
  const enchant = INSTILL_CONDITIONS.find((c) => c.id === f.instill);
  const rar = f.rarity === 'magic' ? 'rar-magic' : 'rar-normal';
  return (
    <div className={`tip item-tip ${rar}`}>
      <div className="item-tip-head">
        <div>{flaskName(f)}</div>
      </div>
      <div className="item-tip-body">
        <div className="muted small">
          {f.rarity === 'magic' ? 'Magic' : 'Normal'} {st.def.kind} flask · Item Level {f.ilvl}
        </div>
        <div>{flaskEffectText(f)}</div>
        <div>
          Consumes <b>{st.chargesPerUse}</b> of <b>{st.maxCharges}</b> charges · currently <b>{Math.floor(f.charges)}</b>
        </div>
        {(f.prefixes.length > 0 || f.suffixes.length > 0) && <div className="sep" />}
        {[...f.prefixes, ...f.suffixes].map((m) => (
          <div key={m.affixId} className="mod">
            {describeFlaskMod(m)}
          </div>
        ))}
        {enchant && (
          <>
            <div className="sep" />
            <div className="mod enchant">Enchanted: {enchant.desc}</div>
          </>
        )}
        {!pinned && <div className="tip-hint">Right-click: pin</div>}
      </div>
    </div>
  );
}

export function pinFlask(f: FlaskInstance): void {
  togglePin({ key: `flask-${f.uid}`, title: flaskName(f), render: () => <FlaskTip f={game.state.flaskSlots.find((x) => x?.uid === f.uid) ?? game.state.account.flaskStash.find((x) => x.uid === f.uid) ?? f} pinned /> });
}

/** Life and Mana flasks group by kind; each utility flask (Granite, Ruby, …) is its own group. */
function shelfKey(f: FlaskInstance): string {
  const def = flaskDef(f.flaskId);
  return def.kind === 'utility' ? def.id : def.kind;
}

const SHELF_ORDER: { id: string; label: string }[] = [
  { id: 'life', label: 'Life' },
  { id: 'mana', label: 'Mana' },
  ...FLASKS.filter((d) => d.kind === 'utility').map((d) => ({ id: d.id, label: d.name.replace(' Flask', '') })),
];

/** Spare flasks behind one tab per kind, so a full rack isn't one long jumble. */
export function FlaskShelf({ flasks, selected, onPick }: { flasks: FlaskInstance[]; selected?: number | null; onPick?: (f: FlaskInstance) => void }) {
  const groups = SHELF_ORDER.map((g) => ({ ...g, list: flasks.filter((f) => shelfKey(f) === g.id) })).filter((g) => g.list.length);
  const [tab, setTab] = useState<string | null>(null);
  const shown = groups.find((g) => g.id === tab) ?? groups[0];
  if (!shown) return null;
  return (
    <div className="flask-shelf">
      <Tabs compact value={shown.id} onChange={setTab} tabs={groups.map((g) => ({ id: g.id, label: g.label, count: g.list.length }))} />
      <div className="gem-bag">
        {shown.list.map((f) => (
          <Tooltip key={f.uid} content={<FlaskTip f={f} />}>
            <button
              className={`gem-card ${selected === f.uid ? 'selected' : ''} ${onPick ? '' : 'static'}`}
              onClick={onPick ? () => onPick(f) : undefined}
              onContextMenu={(e) => (e.preventDefault(), pinFlask(f))}
            >
              <FlaskIcon f={f} size={30} />
              <b className={f.rarity === 'magic' ? 'magic-text' : ''}>{flaskName(f)}</b>
            </button>
          </Tooltip>
        ))}
      </div>
    </div>
  );
}
