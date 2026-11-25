// 日語發音：瀏覽器內建語音合成（TTS）。品質依裝置而異；正式版改預錄音檔（ROADMAP D2）。
let jaVoice: SpeechSynthesisVoice | null = null;
let voicesKnown = false;

function pickVoice() {
  try {
    const vs = speechSynthesis.getVoices();
    if (vs.length) voicesKnown = true;
    jaVoice = vs.find(v => /^ja(-|_|$)/i.test(v.lang) && v.localService) || vs.find(v => /^ja(-|_|$)/i.test(v.lang)) || null;
  } catch { /* 不支援 */ }
}
try { pickVoice(); speechSynthesis.addEventListener?.('voiceschanged', pickVoice); } catch { /* 不支援 */ }

/** 讀音字串整理：去掉送假名分隔「.」、接頭接尾「-」、括號註記、多讀音只取第一個 */
export const speakable = (s: string) => s.split(/[;；、]/)[0].replace(/\(.*?\)|（.*?）/g, '').replace(/[.\-～〜]/g, '').trim();

export function speak(text: string) {
  try {
    const t = speakable(text); if (!t) return;
    const u = new SpeechSynthesisUtterance(t);
    u.lang = 'ja-JP'; u.rate = .9;
    if (jaVoice) u.voice = jaVoice;
    speechSynthesis.cancel(); speechSynthesis.speak(u);
  } catch { /* 裝置不支援 TTS */ }
}

/** 'yes'：有日語語音；'no'：確定沒有；'unknown'：瀏覽器還沒回報語音清單 */
export function japaneseVoice(): 'yes' | 'no' | 'unknown' {
  pickVoice();
  if (typeof speechSynthesis === 'undefined') return 'no';
  return jaVoice ? 'yes' : voicesKnown ? 'no' : 'unknown';
}

// 答題後自動唸出正解（偏好存在本機，不進學習進度 S）
const AUTO_KEY = 'mojowu-autoplay';
export const autoplayOn = () => { try { return localStorage.getItem(AUTO_KEY) === 'on'; } catch { return false; } };
export const setAutoplay = (on: boolean) => { try { localStorage.setItem(AUTO_KEY, on ? 'on' : 'off'); } catch { /* 無痕模式 */ } };
