import { KANA_ROWS, hiraToKata } from '../lib/romaji';
import { startKana } from '../session/actions';

export function Kana() {
  const cells = KANA_ROWS.flatMap(([k, r]) => [...k].map((c, i) => c.trim()
    ? <div key={k + i}><b>{c}</b><small>{hiraToKata(c)}・{r.split(' ')[i]}</small></div>
    : <div key={k + i} style={{ visibility: 'hidden' }} />));
  return <>
    <h1>五十音</h1><p className="sub" style={{ margin: 0 }}>平假名與片假名對照。點「開始練習」隨機出 10 題。</p>
    <button className="primary" data-act="kana" onClick={startKana}>開始練習</button>
    <div className="kana">{cells}</div>
  </>;
}
