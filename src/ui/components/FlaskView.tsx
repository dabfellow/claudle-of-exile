import { INSTILL_CONDITIONS } from '../../data/flasks';
import { describeFlaskMod, flaskEffectText, flaskName, flaskStats } from '../../engine/flasks';
import type { FlaskInstance } from '../../engine/types';
import { game } from '../../game';
import { Art, togglePin } from './common';

/** A flask bottle: liquid level shows charges. */
export function FlaskIcon({ f, size = 34 }: { f: FlaskInstance; size?: number }) {
  const st = flaskStats(f);
  const fill = st.maxCharges ? Math.min(1, f.charges / st.maxCharges) : 0;
  return (
    <Art
      src={`flasks/${f.flaskId}.png`}
      alt={st.def.name}
      size={size}
      fallback={
        <span className="flask-icon" style={{ width: size * 0.62, height: size, ['--flask' as string]: st.def.color }}>
          <span className="flask-icon-neck" />
          <span className="flask-icon-body">
            <span className="flask-icon-liquid" style={{ height: `${fill * 100}%` }} />
          </span>
        </span>
      }
    />
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
        <div className="muted" style={{ fontSize: 11 }}>
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
  togglePin({ key: `flask-${f.uid}`, title: flaskName(f), render: () => <FlaskTip f={game.state.flaskSlots.find((x) => x?.uid === f.uid) ?? game.state.flaskStash.find((x) => x.uid === f.uid) ?? f} pinned /> });
}
