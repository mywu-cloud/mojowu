import { KANA_ROWS, hiraToKata } from '../lib/romaji';
import { startKana } from '../session/actions';
import { speak } from '../lib/speech';

export function Kana() {
  const cells = KANA_ROWS.flatMap(([k, r]) => [...k].map((c, i) => c.trim()
    ? <button key={k + i} data-say={c} aria-label={`${c}（${r.split(' ')[i]}），播放發音`} onClick={() => speak(c)}><b>{c}</b><small>{hiraToKata(c)}・{r.split(' ')[i]}</small></button>
    : <div key={k + i} style={{ visibility: 'hidden' }} />));
  return <>
    <h1>五十音</h1><p className="sub" style={{ margin: 0 }}>平假名與片假名對照，點任一格可以聽發音。點「開始練習」隨機出 10 題。</p>
    <button className="primary" data-act="kana" onClick={startKana}>開始練習</button>
    <div className="kana">{cells}</div>
  </>;
}
