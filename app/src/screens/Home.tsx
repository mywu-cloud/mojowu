import { C } from '../content/load';
import { DAY } from '../lib/fsrs';
import { today } from '../lib/date';
import { S, shownStreak } from '../store/state';
import { count, currentUnit, dueList, nextNew, unitHeavy } from '../store/progress';
import { Ring, SayButton } from '../components/common';
import { go, startLesson, startReview } from '../session/actions';
import { BRAND } from '../brand';
import { label } from '../content/levels';

export function Home() {
  const { K, V, G } = C;
  const due = dueList().length, u = currentUnit(), nw = nextNew(u).length;
  const mins = Math.max(1, Math.round(due * 0.25 + nw * 1.2));
  const pk = count(K), pv = count(V), pg = count(G);
  const wd = new Date().toLocaleDateString('zh-TW', { month: 'long', day: 'numeric', weekday: 'long' });
  const pool = V.filter(v => !/^[～〜]/.test(v.ex));   // 不選「～軒」這類接尾詞
  const word = pool[Math.floor(Date.parse(today()) / DAY) % pool.length];
  const h = new Date().getHours();
  return <>
    <div className="row between"><div><div style={{ fontWeight: 700, color: 'var(--red)', letterSpacing: '.02em' }}>{BRAND}</div><div className="sub">{wd}</div><h1>{h < 11 ? 'おはよう' : h < 18 ? 'こんにちは' : 'こんばんは'}</h1></div>
      <span className="pill red">連續 {shownStreak()} 天</span></div>
    <section className="hero pop"><div className="row between"><h2>今日任務</h2><span style={{ fontSize: 14 }}>{label(C.level)}・第 {u} 單元{unitHeavy(u) ? '・建議兩週' : ''}</span></div>
      <div className="stats"><div className="stat"><b>{due}</b><span>張到期複習</span></div><div className="stat"><b>{nw}</b><span>項新內容</span></div><div className="stat"><b>{mins}</b><span>分鐘左右</span></div></div>
      <button className="light" data-act={due ? 'review' : 'lesson'} onClick={() => (due ? startReview() : startLesson())}>{due ? '先複習到期的卡' : nw ? '開始新課' : '本單元已學完'}</button>
      {due > 0 && nw > 0 && <button className="light" style={{ background: 'rgba(255,255,255,.16)', color: '#fff' }} data-act="lesson" onClick={() => startLesson()}>直接上新課</button>}</section>
    {S.kana < 1 && <button className="ghost" data-go="kana" onClick={() => go('kana')}>還不熟五十音？先做假名練習</button>}
    <section className="card"><div className="row between" style={{ marginBottom: 10 }}><h2>{label(C.level)} 三軌進度</h2><button className="x" style={{ width: 'auto', padding: '0 10px', color: 'var(--blue)', fontSize: 14 }} data-go="path" onClick={() => go('path')}>切換級數</button></div><div className="rings">
      <div><Ring pct={Math.round(pk / K.length * 100)} color="var(--red)" label="漢字" /><b>文字・漢字</b><small>{pk} / {K.length}</small></div>
      <div><Ring pct={Math.round(pv / V.length * 100)} color="var(--blue)" label="語彙" /><b>語彙</b><small>{pv} / {V.length}</small></div>
      <div><Ring pct={Math.round(pg / G.length * 100)} color="var(--gold)" label="文法" /><b>文法</b><small>{pg} / {G.length}</small></div></div></section>
    <section className="card"><div className="row between"><span className="sub">今日一字</span><SayButton text={word.rd.split(';')[0]} /></div>
      <div className="row"><span className="jp" style={{ fontSize: 40, fontWeight: 700 }}>{word.ex.split(';')[0]}</span><span>{word.rd}・{word.zh}</span></div>
      {word.ff && <div className="warn">{word.ff}</div>}</section>
  </>;
}
