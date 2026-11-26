import { S, save, replaceState, defaultState, storage } from '../store/state';
import { ui, bump } from '../store/ui';
import { analyticsOn, setAnalytics } from '../lib/track';
import { FEEDBACK_URL } from '../links';
import { AccountCard } from '../components/AccountCard';
import { autoplayOn, setAutoplay, japaneseVoice, speak } from '../lib/speech';
import { touchTarget, scheduleSync } from '../lib/sync';

export function Me() {
  const all = Object.values(S.cards), dayKeys = Object.keys(S.log).length;
  const setMsg = (m: string) => { ui.msg = m; bump(); };
  const copy = () => navigator.clipboard.writeText(JSON.stringify(S)).then(() => setMsg('已複製到剪貼簿。'), () => setMsg('無法存取剪貼簿。'));
  return <>
    <h1>我的</h1>
    <section className="card"><div className="stats" style={{ color: 'inherit' }}>
      <div className="stat" style={{ background: 'var(--bg)' }}><b>{all.length}</b><span>已學項目</span></div>
      <div className="stat" style={{ background: 'var(--bg)' }}><b>{S.streak}</b><span>連續天數</span></div>
      <div className="stat" style={{ background: 'var(--bg)' }}><b>{dayKeys}</b><span>學習天數</span></div></div></section>
    <AccountCard />
    <section className="card"><label htmlFor="tg">目標記憶率</label><p className="sub" style={{ margin: '2px 0 8px' }}>越高記得越牢，但每天複習越多。</p>
      <select id="tg" value={S.target} onChange={e => { S.target = +e.target.value; touchTarget(); save(); scheduleSync(); bump(); }}>{[.85, .9, .95].map(v => <option key={v} value={v}>{v * 100}%</option>)}</select></section>
    <section className="card"><h2>日語發音</h2>
      <label className="row between" style={{ fontWeight: 400, marginTop: 6 }}><span>答題後自動唸出正解</span>
        <input type="checkbox" id="ap" style={{ width: 24, height: 24, flex: 'none' }} checked={autoplayOn()} onChange={e => { setAutoplay(e.target.checked); bump(); }} /></label>
      <button className="ghost" style={{ marginTop: 10 }} onClick={() => speak('こんにちは')}>試聽「こんにちは」</button>
      {japaneseVoice() === 'no' && <div className="warn" style={{ marginTop: 10 }}><b>這台裝置沒有日語語音</b>，發音可能不正確。安裝方法：<br />iPhone／iPad：設定 → 輔助使用 → 朗讀內容 → 聲音 → 日文<br />Android：設定 → 系統 → 語言 → 文字轉語音 → 安裝日文語音資料<br />Windows：設定 → 時間與語言 → 語音 → 新增語音 → 日本語</div>}
      <p className="note" style={{ margin: '8px 0 0' }}>發音使用裝置內建的語音合成，音質依裝置而異。</p></section>
    <section className="card"><h2>備份進度</h2><p className="sub">進度只存在這個瀏覽器{storage.backend === 'indexedDB' ? '（IndexedDB）' : ''}。複製後可貼回來還原。</p>
      <div className="row wrap"><button className="ghost" data-act="copy" onClick={copy}>複製進度</button><button className="ghost" data-act="restore" onClick={() => { ui.modal = { kind: 'restore' }; bump(); }}>貼上還原</button></div><div id="msg" className="note">{ui.msg}</div></section>
    <section className="card"><label className="row between" style={{ fontWeight: 400 }}><span><b>傳送匿名使用統計</b><br /><span className="sub">只記「上完一課」這類事件與隨機代號，用來改善課程。不含個人資料。</span></span>
      <input type="checkbox" id="an" style={{ width: 24, height: 24, flex: 'none' }} checked={analyticsOn()} onChange={e => { setAnalytics(e.target.checked); bump(); }} /></label></section>
    <section className="card"><h2>意見回饋</h2><p className="sub">發現錯字、讀音錯誤，或有任何建議，都歡迎告訴我們。</p>
      <a className="btn indigo" href={FEEDBACK_URL} target="_blank" rel="noopener noreferrer">填寫意見回饋表單</a></section>
    <a className="btn ghost" href="#about">關於 mojowu／資料來源</a>
    <button className="ghost" style={{ borderColor: 'var(--red)', color: 'var(--red)' }} data-act="reset" onClick={() => { ui.modal = { kind: 'confirm', text: '確定清除所有學習進度？這個動作無法復原。', onOk: () => replaceState(defaultState()) }; bump(); }}>清除所有進度</button>
  </>;
}
