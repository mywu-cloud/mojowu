import { C, setLevel } from '../content/load';
import { AVAILABLE, LEVELS, label } from '../content/levels';
import { bump } from '../store/ui';

/** 級數切換（可自由選級，見 DECISIONS 21） */
export function LevelTabs() {
  return (
    <div className="levels" role="tablist" aria-label="JLPT 級數">
      {LEVELS.map(l => {
        const on = AVAILABLE.includes(l);
        return <button key={l} role="tab" aria-selected={C.level === l} data-level={l} disabled={!on}
          className={C.level === l ? 'on' : ''} onClick={() => { setLevel(l); bump(); }}
          title={on ? undefined : '即將推出'}>{label(l)}{!on && <small>即將推出</small>}</button>;
      })}
    </div>
  );
}
