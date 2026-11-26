import { C } from '../content/load';
import { S } from '../store/state';
import { count, currentUnit, unitHeavy, unitItems, unitOpen } from '../store/progress';
import { go, startLesson } from '../session/actions';
import { LevelTabs } from '../components/LevelTabs';
import { label } from '../content/levels';

export function Path() {
  const cu = currentUnit();
  return <>
    <h1>學習路徑</h1>
    <LevelTabs />
    <p className="sub" style={{ margin: 0 }}>{label(C.level)} 共 {C.UNITS.length} 個單元。漢字答對後才解鎖含該字的單字；學完一單元開下一單元。已有程度的話，可以直接選較高的級數開始。</p>
    {C.level === 'n5' && <button className="unit" data-go="kana" onClick={() => go('kana')}><span className={`dot ${S.kana >= 1 ? 'done' : 'now'}`}>あ</span><span style={{ flex: 1 }}><b>入門・五十音</b><br /><span className="sub">平假名、片假名辨識練習</span></span></button>}
    {C.UNITS.map(u => {
      const items = unitItems(u.n), got = count(items), open = unitOpen(u.n), done = got === items.length;
      const k = items.filter(i => i.type === 'k').length, v = items.filter(i => i.type === 'v').length, g = items.filter(i => i.type === 'g').length;
      return (
        <button key={u.n} className={`unit ${open ? '' : 'locked'}`} data-unit={open ? u.n : undefined} disabled={!open} onClick={() => startLesson(u.n)} aria-label={`第 ${u.n} 單元 ${u.t}${open ? '' : '，尚未解鎖'}`}>
          <span className={`dot ${done ? 'done' : u.n === cu ? 'now' : ''}`}>{u.n}</span>
          <span style={{ flex: 1 }}><span className="row between"><b>{u.t}</b><span className="sub">{got}/{items.length}</span></span>
            <span className="sub">{k} 漢字・{v} 單字・{g} 文法</span>
            {unitHeavy(u.n) && !done && <span className="row" style={{ marginTop: 4 }}><span className="pill red">建議兩週</span><span className="note">漢字較多，慢慢來沒關係</span></span>}
            {open && !done && <span className="bar" style={{ marginTop: 6 }}><i style={{ width: `${got / items.length * 100}%` }} /></span>}</span>
        </button>
      );
    })}
    <p className="note">N2、N1 將依相同結構陸續加入。</p>
  </>;
}
