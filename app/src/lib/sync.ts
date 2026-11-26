// C3：雲端同步（用戶端）。伺服器端見 functions/_lib/sync.ts。
// 何時同步：開 App（已登入）、登入成功、每回合結束（延遲 1.5 秒合併）、恢復連線、回到 App 且距上次超過 1 分鐘、按「立即同步」。
// 上傳：自上次同步後有變動的卡片（以快照比對）、尚未上傳的作答紀錄、設定與每日次數。
// 合併：同一張卡以 last 較新者為準，相同時取 due 較早者；每日次數取較大值；連續天數取 lastDay 較晚者；kana 取較大值；目標記憶率取 targetAt 較新者。
import type { Card } from './fsrs';
import { S, save } from '../store/state';
import { bump } from '../store/ui';
import { account, api } from './account';

const SYNC_KEY = 'mojowu-sync', PENDING_KEY = 'mojowu-pending', SNAP_KEY = 'mojowu-sync-snap', TARGET_AT_KEY = 'mojowu-target-at';
export interface PendingReview { id: string; item: string; at: number; rating: 1 | 3; source: 'lesson' | 'review' | 'mock' }
interface SyncState { since: number; at: number; email: string }
export interface SyncMeta { streak: number; lastDay: string; kana: number; log: Record<string, number>; target: number; targetAt: number }
export interface SyncResponse { serverTime: number; cards: Record<string, Card>; meta: SyncMeta }

const read = <T,>(k: string, d: T): T => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) as T : d; } catch { return d; } };
const write = (k: string, v: unknown) => { try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); } catch { /* 無痕模式、容量滿 */ } };

export const sync = { state: 'idle' as 'idle' | 'syncing' | 'error' | 'offline', at: read<SyncState | null>(SYNC_KEY, null)?.at || 0, error: '' };

/** 記一筆作答（只有寫入 FSRS 的那一次） */
export function recordReview(item: string, ok: boolean, source: PendingReview['source'], at = Date.now()) {
  const list = read<PendingReview[]>(PENDING_KEY, []);
  list.push({ id: crypto.randomUUID(), item, at, rating: ok ? 3 : 1, source });
  write(PENDING_KEY, list.slice(-5000));
}
export const targetAt = () => read<number>(TARGET_AT_KEY, 0);
export const touchTarget = () => write(TARGET_AT_KEY, Date.now());

const sig = (c: Card) => `${c.last ?? ''}|${c.due ?? ''}|${c.reps ?? 0}|${c.ok ? 1 : 0}`;

/** 遠端卡片是否該取代本機的 */
export const remoteWins = (local: Card | undefined, remote: Card) =>
  !local || (remote.last ?? 0) > (local.last ?? 0) || ((remote.last ?? 0) === (local.last ?? 0) && (remote.due ?? 0) < (local.due ?? 0));

/** 把伺服器回應合併進 S（就地修改）。回傳被更新的卡片數。 */
export function mergeResponse(res: SyncResponse, localTargetAt: number): number {
  let n = 0;
  for (const [id, c] of Object.entries(res.cards)) if (remoteWins(S.cards[id], c)) { S.cards[id] = c; n++; }
  const m = res.meta;
  for (const [d, v] of Object.entries(m.log)) if ((S.log[d] || 0) < v) S.log[d] = v;
  if (m.lastDay > S.lastDay || (m.lastDay === S.lastDay && m.streak > S.streak)) { S.streak = m.streak; S.lastDay = m.lastDay; }
  S.kana = Math.max(S.kana, m.kana);
  if (m.targetAt > localTargetAt) { S.target = m.target; write(TARGET_AT_KEY, m.targetAt); }
  return n;
}

let running: Promise<void> | null = null, again = false, timer: ReturnType<typeof setTimeout> | null = null;

/** 執行一次同步（同時只跑一個，期間再要求會在結束後補跑一次） */
export function runSync(): Promise<void> {
  if (!account.session) return Promise.resolve();
  if (running) { again = true; return running; }
  running = (async () => {
    try {
      do { again = false; await once(); } while (again);
    } finally { running = null; }
  })();
  return running;
}

async function once() {
  const sess = account.session; if (!sess) return;
  if (typeof navigator !== 'undefined' && navigator.onLine === false) { sync.state = 'offline'; bump(); return; }
  sync.state = 'syncing'; sync.error = ''; bump();
  let st = read<SyncState | null>(SYNC_KEY, null);
  let snap = read<Record<string, string>>(SNAP_KEY, {});
  if (!st || st.email !== sess.email) { st = { since: 0, at: 0, email: sess.email }; snap = {}; }   // 換帳號或第一次：全部上傳、全部下載
  const cards: Record<string, Card> = {};
  for (const [id, c] of Object.entries(S.cards)) if (snap[id] !== sig(c)) cards[id] = c;
  const pending = read<PendingReview[]>(PENDING_KEY, []);
  const tAt = targetAt();
  try {
    const res = await api<SyncResponse>('/sync', { method: 'POST', body: JSON.stringify({
      since: st.since, cards, reviews: pending,
      meta: { streak: S.streak, lastDay: S.lastDay, kana: S.kana, log: S.log, target: S.target, targetAt: tAt },
    }) });
    mergeResponse(res, tAt);
    save();
    for (const [id, c] of Object.entries(S.cards)) snap[id] = sig(c);
    write(SNAP_KEY, snap);
    const left = read<PendingReview[]>(PENDING_KEY, []).filter(r => !pending.some(p => p.id === r.id));   // 同步期間新增的保留
    write(PENDING_KEY, left);
    st = { since: res.serverTime, at: Date.now(), email: sess.email }; write(SYNC_KEY, st);
    sync.state = 'idle'; sync.at = st.at;
  } catch (e) {
    sync.state = navigator.onLine === false ? 'offline' : 'error';
    sync.error = (e as Error).message;
  }
  bump();
}

/** 回合結束後呼叫：1.5 秒內多次只同步一次 */
export function scheduleSync(delay = 1500) {
  if (!account.session) return;
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => { timer = null; runSync(); }, delay);
}

/** 登出時清掉同步狀態（本機學習進度保留） */
export function resetSync() { write(SYNC_KEY, null); write(SNAP_KEY, null); write(PENDING_KEY, null); sync.at = 0; sync.state = 'idle'; sync.error = ''; }

/** App 啟動時呼叫一次 */
export function startAutoSync() {
  runSync();
  try {
    addEventListener('online', () => runSync());
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && Date.now() - sync.at > 60e3) runSync(); });
  } catch { /* 非瀏覽器環境 */ }
}
