// 匿名學習事件（ROADMAP A3）。送到 /api/event（functions/api/event.ts），用來算次日／7 日／30 日留存。
// 匿名代號是隨機 UUID，存在 localStorage「mojowu-anon」，與任何個人資料無關；「我的」頁可關閉。
import { today } from './date';
import { APP_VERSION } from '../version';

export type EventName = 'app_open' | 'lesson_done' | 'review_done' | 'test_done' | 'kana_done';
const ANON_KEY = 'mojowu-anon', OFF_KEY = 'mojowu-analytics', OPEN_KEY = 'mojowu-last-open';

const ls = {
  get: (k: string) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* 無痕模式 */ } },
};
export const analyticsOn = () => ls.get(OFF_KEY) !== 'off';
export const setAnalytics = (on: boolean) => ls.set(OFF_KEY, on ? 'on' : 'off');

function anonId(): string {
  let id = ls.get(ANON_KEY);
  if (!id) {
    id = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID()
      : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 3 | 8)).toString(16); });
    ls.set(ANON_KEY, id);
  }
  return id;
}

/** 只在正式網址送出：本機開發、e2e 測試不送 */
const enabled = () => typeof location !== 'undefined' && location.protocol === 'https:' && !/^(localhost|127\.|\[::1\])/.test(location.hostname);

export function track(e: EventName, n = 1) {
  if (!enabled() || !analyticsOn()) return;
  const body = JSON.stringify({ a: anonId(), e, d: today(), v: APP_VERSION, n });
  try {
    if (navigator.sendBeacon?.('/api/event', new Blob([body], { type: 'application/json' }))) return;
    fetch('/api/event', { method: 'POST', body, headers: { 'content-type': 'application/json' }, keepalive: true }).catch(() => {});
  } catch { /* 送不出去就算了 */ }
}

/** 每個當地日期只送一次 app_open */
export function trackOpen() {
  const t = today();
  if (ls.get(OPEN_KEY) === t) return;
  ls.set(OPEN_KEY, t); track('app_open');
}
