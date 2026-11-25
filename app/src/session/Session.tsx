import { useEffect, useRef, useState } from 'react';
import { C } from '../content/load';
import type { Item, QuizItem } from '../content/types';
import { answersFor, toHira } from '../lib/romaji';
import { S } from '../store/state';
import { currentUnit, nextNew } from '../store/progress';
import { ui, type Session as Sess } from '../store/ui';
import { CloseIcon, SayButton, ReadingChips } from '../components/common';
import { autoplayOn, speak } from '../lib/speech';
import { advance, check, nextLearn, pickGrammar, pickTest, quit, startKana, startLesson, testNext } from './actions';

const Top = ({ pct, label, color }: { pct: number; label: string; color?: string }) => (
  <div className="top"><button className="x" data-act="quit" aria-label="離開" onClick={quit}><CloseIcon /></button>
    <div className="bar"><i style={{ width: `${pct}%`, background: color }} /></div><span className="sub">{label}</span></div>
);

function LearnCard({ it }: { it: Item }) {
  if (it.type === 'k') return <>
    <div className="card pop" style={{ textAlign: 'center' }}><span className="sub">新漢字・第 {it.unit} 單元</span>
      <div className="row" style={{ justifyContent: 'center', gap: 22 }}><div className="big jp">{it.ch}</div>
        {it.trad !== it.ch && <div><div className="sub">繁體</div><div style={{ fontSize: 40, color: 'var(--mute)' }}>{it.trad}</div><span className="pill red">新字體</span></div>}</div>
      <p className="sub">字義：{it.zh}。字義你已經會了，專心記讀音。</p></div>
    <div className="read"><div><span className="sub">音讀</span><br /><ReadingChips list={it.on} /></div><div><span className="sub">訓讀</span><br /><ReadingChips list={it.kun} /></div></div>
    <p className="note" style={{ margin: 0, textAlign: 'center' }}>點讀音可以聽發音</p>
  </>;
  if (it.type === 'v') return <>
    <div className="card pop" style={{ textAlign: 'center' }}><span className="sub">新單字・第 {it.unit} 單元</span>
      <div className="jp" style={{ fontSize: 52, fontWeight: 700 }}>{it.ex}</div><div className="row" style={{ justifyContent: 'center' }}>{it.rd} <SayButton text={it.rd.split(';')[0]} /></div><p style={{ fontSize: 20, margin: '6px 0 0' }}>{it.zh}</p></div>
    {it.ff && <div className="warn"><b>和製漢語陷阱：</b>{it.ff}</div>}
  </>;
  return <>
    <div className="card pop"><span className="sub">新文法・第 {it.unit} 單元</span><div className="jp" style={{ fontSize: 26, fontWeight: 700, margin: '6px 0' }}>{it.pat}</div><p style={{ margin: 0 }}>{it.zh}</p></div>
    <div className="card"><div className="row between"><span className="jp" style={{ fontSize: 20 }}>{it.jp}</span><SayButton text={it.jp} /></div><p className="sub" style={{ margin: '4px 0 0' }}>{it.tr}</p></div>
  </>;
}

/** 這題正解要唸的日文 */
export const sayFor = (it: QuizItem) => it.type === 'kana' ? it.ch : it.type === 'g' ? it.jp : it.type === 'v' ? it.rd : (it.kun[0] || it.on[0] || '');

function Feedback({ it, kind }: { it: QuizItem; kind: Sess['kind'] }) {
  const a = ui.answered;
  useEffect(() => { if (a && autoplayOn()) speak(sayFor(it)); }, [a, it]);
  if (!a) return null;
  const say = <span style={{ float: 'right', marginTop: -10 }}><SayButton text={sayFor(it)} /></span>;
  if (a.ok) return <div className="fb ok pop">{say}<b>答對了！</b> {it.type === 'kana' ? it.r : it.type === 'g' ? '' : answersFor(it).join('、')}</div>;
  const right = it.type === 'kana' ? it.r : it.type === 'g' ? it.jp : answersFor(it).join('、');
  return <div className="fb bad pop">{say}<b>正解：</b><span className="jp">{right}</span>{it.type === 'v' && it.ff && <div style={{ marginTop: 4 }}>{it.ff}</div>}<div className="note" style={{ marginTop: 4 }}>{kind === 'kana' ? '' : '這張卡等一下會再出現一次，不扣分。'}</div></div>;
}

/** 一題測驗（打字或文法選擇）。打字內容存在元件 state，換題時以 key 重置。 */
function Quiz({ it, kind }: { it: QuizItem; kind: Sess['kind'] }) {
  const a = ui.answered, nudged = !!(ui.nudge && it.type !== 'kana' && ui.nudge.id === it.id);
  const [typed, setTyped] = useState('');
  const inp = useRef<HTMLInputElement>(null), next = useRef<HTMLButtonElement>(null);
  useEffect(() => { if (a) next.current?.focus(); else inp.current?.focus(); }, [a, nudged]);

  if (it.type === 'g') {
    if (!it._opts) it._opts = [it.jp, ...[...C.G].filter(x => x !== it).sort(() => Math.random() - .5).slice(0, 2).map(x => x.jp)].sort(() => Math.random() - .5);
    return <>
      <div className="card"><span className="pill">文法</span><p style={{ fontSize: 18 }}>「{it.tr}」用日文怎麼說？</p></div>
      <div className="choices">{it._opts.map((o, i) => <button key={i} className={`choice jp ${a ? (o === it.jp ? 'right' : a.pick === i ? 'wrong' : '') : ''}`} data-pick={i} disabled={!!a} onClick={() => pickGrammar(i)}>{o}</button>)}</div>
      <Feedback it={it} kind={kind} /><div style={{ flex: 1 }} />
      {a && <button ref={next} className="indigo" data-act="next" onClick={advance}>繼續</button>}
    </>;
  }
  const hasK = it.type === 'v' && /[一-鿿]/.test(it.ex);
  const q = it.type === 'kana' || it.type === 'k' ? it.ch : hasK ? it.ex.split(';')[0] : it.zh;
  const ask = it.type === 'kana' ? '輸入羅馬拼音' : it.type === 'k' ? `輸入讀音（音讀或訓讀皆可）・${it.zh}` : hasK ? `輸入讀音・${it.zh}` : '用日文怎麼說？輸入假名';
  const shown = a ? a.typed : typed;
  return <>
    <div className="card" style={{ textAlign: 'center' }}><span className="pill">{it.type === 'kana' ? '假名' : it.type === 'k' ? '漢字' : '單字'}</span>
      <div className="jp" style={{ fontSize: q.length > 4 ? 44 : 72, fontWeight: 700, lineHeight: 1.3 }}>{q}</div><p className="sub" style={{ margin: 0 }}>{ask}</p></div>
    <form id="af" onSubmit={e => { e.preventDefault(); if (a) advance(); else check(typed); }}>
      <label htmlFor="ans">{it.type === 'kana' ? '例：ka' : '可直接打羅馬字，會自動轉成假名'}</label>
      <input ref={inp} type="text" id="ans" autoComplete="off" autoCapitalize="off" spellCheck={false} disabled={!!a} value={shown} onChange={e => setTyped(e.target.value)} />
      <div id="pv" className="note jp" style={{ minHeight: 20 }}>{!a && it.type !== 'kana' ? toHira(typed) : ''}</div></form>
    {!a && nudged && <div className="warn pop" role="status"><b>差一點！</b>注意長音（う・い・ー）和促音（っ），再試一次。</div>}
    <Feedback it={it} kind={kind} /><div style={{ flex: 1 }} />
    {a ? <button ref={next} className="indigo" data-act="next" onClick={advance}>繼續</button>
      : <button className="indigo" data-act="check" onClick={() => check(typed)}>確認答案</button>}
  </>;
}

function Finish({ s }: { s: Exclude<Sess, { kind: 'test' }> }) {
  if (s.kind === 'kana') return <>
    <div className="card" style={{ textAlign: 'center' }}><div className="stamp" style={{ margin: '0 auto' }}>{s.score}/10</div><h2 style={{ marginTop: 12 }}>假名練習完成</h2><p className="sub">答對 8 題以上，表示可以開始 N5 第 1 單元。</p></div>
    <button className="primary" data-act="kanaagain" onClick={startKana}>再練一次</button><button className="ghost" data-act="quit" onClick={quit}>回首頁</button>
  </>;
  const right = Object.values(s.first).filter(Boolean).length;
  return <>
    <div className="card pop" style={{ textAlign: 'center' }}><div className="stamp" style={{ margin: '0 auto' }}>完成</div><h2 style={{ marginTop: 12 }}>{s.kind === 'lesson' ? '新課完成' : '複習完成'}</h2>
      <p className="sub">{s.total} 項中第一次就答對 {right} 項。連續 {S.streak} 天。</p></div>
    {nextNew(currentUnit()).length > 0 && <button className="primary" data-act="lesson" onClick={() => { ui.session = null; startLesson(); }}>再上一課</button>}
    <button className="ghost" data-act="quit" onClick={quit}>回首頁</button>
  </>;
}

export function SessionView({ s }: { s: Sess }) {
  const a = ui.answered;
  if (s.kind === 'test') {
    const q = s.queue[s.i];
    return <>
      <Top pct={s.i / s.total * 100} label={`${s.i + 1}/${s.total}`} color="var(--blue)" />
      <div className="card" style={{ textAlign: 'center' }}><span className="pill">{q.sec ? '文法' : '文字・語彙'}</span><div className="jp" style={{ fontSize: q.q.length > 6 ? 22 : 48, fontWeight: 700 }}>{q.q}</div><p className="sub" style={{ margin: 0 }}>{q.prompt}</p></div>
      <div className="choices">{q.opts.map((o, i) => <button key={i} className={`choice jp ${a ? (o === q.right ? 'right' : a.pick === i ? 'wrong' : '') : ''}`} data-tpick={i} disabled={!!a} onClick={() => pickTest(i)}>{o}</button>)}</div>
      {a && <button className="indigo" data-act="tnext" onClick={testNext} autoFocus>{s.i + 1 < s.total ? '下一題' : '看結果'}</button>}
    </>;
  }
  const head = <Top pct={s.done / s.total * 100} label={`${s.done}/${s.total}`} />;
  if (s.kind === 'lesson' && s.li < s.learn.length) return <>
    {head}<LearnCard it={s.learn[s.li]} /><div style={{ flex: 1 }} />
    <button className="primary" data-act="lnext" onClick={nextLearn}>{s.li + 1 < s.learn.length ? '記住了，下一個' : '開始小測驗'}</button>
  </>;
  if (!s.queue.length) return <Finish s={s} />;
  const it = s.queue[0];
  // key：每換一題（含答錯的卡再出現）重置輸入框
  return <>{head}<Quiz key={ui.step} it={it} kind={s.kind} /></>;
}
