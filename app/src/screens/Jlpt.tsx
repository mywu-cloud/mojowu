import { ui } from '../store/ui';
import { startTest } from '../session/actions';

export function Jlpt() {
  const r = ui.testRes;
  if (r) {
    const tot = r.sec.reduce((a, s) => a + s.got, 0), max = r.sec.reduce((a, s) => a + s.n, 0);
    return <>
      <h1>練習測驗結果</h1>
      <section className="card row"><div style={{ flex: 1 }}><span className="sub">答對</span><div><b style={{ fontSize: 44 }}>{tot}</b> / {max}</div><span className="sub">正確率 {Math.round(tot / max * 100)}%</span></div><div className="stamp">{tot / max >= .6 ? '良好' : '加油'}</div></section>
      <section className="card">{r.sec.map(s => <div key={s.name} style={{ marginBottom: 12 }}><div className="row between"><span>{s.name}</span><b>{s.got} / {s.n}</b></div><div className="bar"><i style={{ width: `${s.got / s.n * 100}%`, background: 'var(--blue)' }} /></div></div>)}</section>
      {r.wrongs.length > 0 && <section className="card"><h2>錯題已加入複習牌組</h2>{r.wrongs.map((w, i) => <div key={i} className="row between" style={{ marginTop: 8 }}><span className="jp">{w.q}</span><span className="sub">{w.a}</span></div>)}</section>}
      <button className="primary" data-act="retest" onClick={startTest}>再測一次</button>
      <p className="note">這是依 N5 範圍出題的練習，不是官方換算分數。正式 JLPT 為 180 分制、各分項有最低分。</p>
    </>;
  }
  return <>
    <h1>JLPT 練習</h1>
    <section className="card"><h2>N5 小測驗・15 題</h2><p className="sub">漢字讀音 6 題、語彙意思 5 題、文法 4 題。錯題會自動變成複習卡。</p><button className="primary" data-act="test" onClick={startTest}>開始測驗</button></section>
    <section className="card"><h2>正式考試的合格條件</h2><p className="sub" style={{ margin: '4px 0 0' }}>N5 總分 180 分需 80 分；「語言知識・讀解」120 分中需 38 分，「聽解」60 分中需 19 分。</p></section>
  </>;
}
