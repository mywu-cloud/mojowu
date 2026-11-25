import { C } from '../content/load';
import { APP_VERSION } from '../version';
import { FEEDBACK_URL } from '../links';
import { BRAND } from '../brand';

// 改這裡時同步更新 ATTRIBUTION.md（CC BY 姓名標示）
export const SOURCES = [
  { what: '漢字讀音、筆畫、JLPT 等級', name: 'kanji-data', by: 'David Luz Gouveia', url: 'https://github.com/davidluzgouveia/kanji-data', lic: 'MIT' },
  { what: '漢字讀音原始資料', name: 'KANJIDIC', by: 'Electronic Dictionary Research and Development Group（EDRDG）', url: 'https://www.edrdg.org/wiki/index.php/KANJIDIC_Project', lic: 'CC BY-SA 4.0（EDRDG 授權）', licUrl: 'https://www.edrdg.org/edrdg/licence.html' },
  { what: 'N5 單字與讀音（整理版）', name: 'open-anki-jlpt-decks', by: 'jamsinclair', url: 'https://github.com/jamsinclair/open-anki-jlpt-decks', lic: 'MIT' },
  { what: 'N5 單字原始清單', name: 'Tanos JLPT 清單', by: 'Jonathan Waller（tanos.co.uk）', url: 'https://www.tanos.co.uk/jlpt/', lic: 'CC BY', licUrl: 'https://creativecommons.org/licenses/by/4.0/deed.zh-hant' },
];
const Ext = ({ u, t }: { u: string; t: string }) => <a href={u} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--blue)' }}>{t}</a>;

export function About() {
  return <>
    <div className="row"><a className="btn ghost" href="#me" style={{ minHeight: 44, padding: '0 14px' }} aria-label="返回我的">← 返回</a></div>
    <h1>關於 {BRAND}</h1>
    <section className="card"><p style={{ margin: 0 }}>給繁體中文使用者的日語學習 App：五十音 → JLPT N5，文字・語彙・文法三軌並進，用間隔重複排程幫你記牢。</p>
      <p className="note" style={{ margin: '8px 0 0' }}>版本 {APP_VERSION}・封測版・內容範圍 N5（{C.K.length} 漢字、{C.V.length} 單字、{C.G.length} 文法）</p></section>
    <section className="card"><h2>資料來源與授權</h2><p className="sub" style={{ margin: '4px 0 10px' }}>感謝以下開放資料的作者。依授權條款標示姓名與來源。</p>
      <ul style={{ margin: 0, paddingLeft: 20, fontSize: 14 }}>{SOURCES.map(x => <li key={x.name} style={{ marginBottom: 10 }}><b>{x.what}</b><br /><Ext u={x.url} t={x.name} />　作者：{x.by}<br /><span className="pill">{x.licUrl ? <Ext u={x.licUrl} t={x.lic} /> : x.lic}</span></li>)}</ul>
      <p className="note" style={{ margin: '6px 0 0' }}>kanji-data 中的 WaniKani 欄位未使用。</p></section>
    <section className="card"><h2>本專案自行撰寫</h2><p className="sub" style={{ margin: '4px 0 0' }}>繁中釋義、單元分類、新字體對照、和製漢語提醒、文法點與例句。目前<b>尚未經日語教師校對</b>，如發現錯誤歡迎<Ext u={FEEDBACK_URL} t="填寫意見回饋表單" />。</p></section>
    <section className="card"><h2>關於 JLPT 範圍</h2><p className="sub" style={{ margin: '4px 0 0' }}>JLPT 自 2010 年起不公布官方字表，本 App 的 N5 範圍是依歷屆考題整理的業界估計。練習題為自行命題，未收錄官方考題，分數也不是官方換算。</p></section>
    <section className="card"><h2>其他</h2><p className="sub" style={{ margin: '4px 0 0' }}>字型：Noto Sans TC、Noto Serif JP（SIL Open Font License）。發音使用裝置內建語音合成。學習進度只存在這個瀏覽器，不會上傳。網站使用 Cloudflare Web Analytics 統計瀏覽量（不使用 Cookie）；App 另會傳送匿名學習事件（如「上完一課」）與隨機代號以計算留存，不含個人資料，可在「我的」關閉。</p></section>
  </>;
}
