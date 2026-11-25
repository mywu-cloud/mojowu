// 學習進度 S。
// 儲存（B3）：主要存在 IndexedDB（store/db.ts）；同時把同樣的 JSON 寫進 localStorage「mojowu-v1」當鏡像——
//   1. IndexedDB 是非同步寫入，App 被突然關掉時，最後一題仍有同步寫入的鏡像可救回；
//   2. B5 切換部署後若需回退 MVP，MVP 讀的仍是這份資料。
// 啟動時兩邊都讀，取 savedAt 較新的一份；IndexedDB 是空的而 localStorage 有資料＝從 MVP 遷移。
// S 的欄位意義與 MVP 完全相同，不要改（CLAUDE.md 規則 3）。savedAt 另存在 localStorage「mojowu-v1-savedAt」，不加進 S。
import type { Card } from '../lib/fsrs';
import { today, yesterday } from '../lib/date';
import { hasIDB, openDB, readAll, write } from './db';

export interface State {
  cards: Record<string, Card>;   // 卡片存在＝已學過
  target: number;                // 目標記憶率 0.85 | 0.9 | 0.95
  streak: number;
  lastDay: string;               // YYYY-MM-DD
  log: Record<string, number>;   // 每日作答次數
  kana: number;                  // 1 = 假名練習曾答對 ≥ 8/10
}
export const KEY = 'mojowu-v1', SAVED_AT_KEY = 'mojowu-v1-savedAt';
export const defaultState = (): State => ({ cards: {}, target: 0.9, streak: 0, lastDay: '', log: {}, kana: 0 });
const META_KEYS = ['target', 'streak', 'lastDay', 'log', 'kana'] as const;

function readLocal(): { state: State | null; savedAt: number } {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (v && v.cards) return { state: Object.assign(defaultState(), v), savedAt: +(localStorage.getItem(SAVED_AT_KEY) || 0) };
  } catch { /* 壞資料或沒有 localStorage */ }
  return { state: null, savedAt: 0 };
}

export let S: State = readLocal().state || defaultState();   // 同步初值；initState() 後以較新的一份為準
/** 儲存後端狀態，「我的」頁與測試用 */
export const storage = { backend: 'localStorage' as 'indexedDB' | 'localStorage', migrated: false, error: '' };

let db: IDBDatabase | null = null;
let saved = new Map<string, string>();   // 已寫入 IndexedDB 的卡片 JSON，用來只寫有變動的卡
let flushing: Promise<void> | null = null, again = false;

/** 啟動時呼叫一次：開 IndexedDB、決定用哪份資料、必要時從 localStorage 遷移 */
export async function initState(): Promise<void> {
  const local = readLocal();
  if (!hasIDB()) { S = local.state || defaultState(); return; }
  try {
    db = await openDB();
    const snap = await readAll(db);
    const idbAt = +(snap.meta.savedAt as number || 0);
    const idbHas = Object.keys(snap.cards).length > 0 || 'target' in snap.meta;
    if (idbHas && idbAt >= local.savedAt) {
      S = defaultState();
      S.cards = snap.cards;
      for (const k of META_KEYS) if (k in snap.meta) (S as unknown as Record<string, unknown>)[k] = snap.meta[k];
      saved = new Map(Object.entries(snap.cards).map(([id, c]) => [id, JSON.stringify(c)]));
      storage.backend = 'indexedDB'; lastAt = idbAt;
      if (local.savedAt < idbAt) writeLocal(idbAt);           // 鏡像比較舊（或不存在）→ 補上
    } else {
      // IndexedDB 空的（首次啟動＝從 MVP 遷移），或鏡像比較新（上次 IndexedDB 沒寫完）
      S = local.state || defaultState();
      storage.backend = 'indexedDB';
      storage.migrated = !idbHas && !!local.state;
      saved = new Map(Object.entries(snap.cards).map(([id, c]) => [id, JSON.stringify(c)]));
      lastAt = Math.max(Date.now(), local.savedAt); writeLocal(lastAt);
      await flush(storage.migrated ? { migratedFrom: 'localStorage:mojowu-v1', migratedAt: Date.now() } : {});
    }
    try { await navigator.storage?.persist?.(); } catch { /* 瀏覽器不支援 */ }
  } catch (e) {
    db = null; storage.backend = 'localStorage'; storage.error = String(e);
    S = local.state || defaultState();
  }
}

function writeLocal(at: number) {
  try { localStorage.setItem(KEY, JSON.stringify(S)); localStorage.setItem(SAVED_AT_KEY, String(at)); } catch { /* 無痕模式、容量滿 */ }
}

async function flush(extraMeta: Record<string, unknown> = {}) {
  if (!db) return;
  const put: Record<string, Card> = {}, next = new Map<string, string>();
  for (const [id, c] of Object.entries(S.cards)) { const j = JSON.stringify(c); next.set(id, j); if (saved.get(id) !== j) put[id] = c; }
  const del = [...saved.keys()].filter(id => !next.has(id));
  const meta: Record<string, unknown> = { savedAt: lastAt, ...extraMeta };
  for (const k of META_KEYS) meta[k] = S[k];
  await write(db, put, del, meta);
  saved = next;
}

let lastAt = 0;
/** 同步寫 localStorage 鏡像，並排入 IndexedDB 寫入（多次呼叫會合併） */
export function save() {
  lastAt = Math.max(Date.now(), lastAt + 1);
  writeLocal(lastAt);
  if (!db) return;
  if (flushing) { again = true; return; }
  flushing = (async () => {
    try { do { again = false; await flush(); } while (again); }
    catch (e) { storage.error = String(e); }
    finally { flushing = null; }
  })();
}
/** 等待排入的 IndexedDB 寫入完成（測試、匯出前用） */
export const settled = async () => { while (flushing) await flushing; };

export function replaceState(v: State) { S = v; save(); }

/** 記一次學習：更新連續天數與當日次數 */
export function touchDay(n = 1) {
  const t = today();
  if (S.lastDay !== t) { S.streak = S.lastDay === yesterday() ? S.streak + 1 : 1; S.lastDay = t; }
  S.log[t] = (S.log[t] || 0) + n; save();
}
/** 畫面上顯示的連續天數（昨天之前斷掉就是 0） */
export const shownStreak = () => (S.lastDay === today() || S.lastDay === yesterday() ? S.streak : 0);

/** 測試用：關閉連線並重置模組狀態 */
export function _resetForTest() { db?.close(); db = null; saved = new Map(); flushing = null; again = false; lastAt = 0; storage.backend = 'localStorage'; storage.migrated = false; storage.error = ''; }
