import { DAY } from '../lib/fsrs';
import { NOW } from '../lib/date';
import { S } from '../store/state';
import { dueList } from '../store/progress';
import { startReview } from '../session/actions';

export function Review() {
  const due = dueList(), all = Object.values(S.cards);
  const days = [...Array(7)].map((_, i) => { const end = NOW() + (i + 1) * DAY; return all.filter(c => c.due! > NOW() + i * DAY && c.due! <= end).length; });
  const mx = Math.max(1, ...days);
  return <>
    <h1>複習</h1>
    <section className="card"><div className="row between"><div><b style={{ fontSize: 36 }}>{due.length}</b> <span className="sub">張現在到期</span></div>
      <button className="indigo" data-act="review" disabled={!due.length} onClick={startReview}>開始複習</button></div></section>
    <section className="card"><h2>未來 7 天到期</h2><div className="days" style={{ marginTop: 10 }}>
      {days.map((d, i) => <div key={i}><span>{d}</span><i style={{ height: `${d / mx * 60}px` }} /><span>{i ? '+' + (i + 1) : '明天'}</span></div>)}</div></section>
    <p className="note">排程採 FSRS-4.5 演算法，目標記憶率 {Math.round(S.target * 100)}%（可在「我的」調整）。答錯的卡 10 分鐘後會再出現，不扣分。</p>
  </>;
}
