// IndexedDB 儲存層（ROADMAP B3）。
// DB「mojowu」v1：
//   cards  — key=項目 ID（k001 / v0001 / g01），value=FSRS 卡片 {s,d,due,reps,lapses,last,ok}
//   meta   — key=欄位名，value=值：target、streak、lastDay、log、kana、savedAt、migratedFrom
// 升級資料表時調高 DB_VERSION 並在 onupgradeneeded 依 oldVersion 逐步遷移，不可刪資料。
import type { Card } from '../lib/fsrs';

export const DB_NAME = 'mojowu', DB_VERSION = 1;
export interface Snapshot { cards: Record<string, Card>; meta: Record<string, unknown> }

const req = <T,>(r: IDBRequest<T>) => new Promise<T>((ok, ng) => { r.onsuccess = () => ok(r.result); r.onerror = () => ng(r.error); });
const done = (tx: IDBTransaction) => new Promise<void>((ok, ng) => { tx.oncomplete = () => ok(); tx.onerror = tx.onabort = () => ng(tx.error); });

export function hasIDB() { try { return typeof indexedDB !== 'undefined' && !!indexedDB; } catch { return false; } }

export function openDB(): Promise<IDBDatabase> {
  return new Promise((ok, ng) => {
    const r = indexedDB.open(DB_NAME, DB_VERSION);
    r.onupgradeneeded = e => {
      const db = r.result;
      if ((e.oldVersion || 0) < 1) { db.createObjectStore('cards'); db.createObjectStore('meta'); }
    };
    r.onsuccess = () => ok(r.result);
    r.onerror = () => ng(r.error);
    r.onblocked = () => ng(new Error('IndexedDB blocked'));
  });
}

export async function readAll(db: IDBDatabase): Promise<Snapshot> {
  const tx = db.transaction(['cards', 'meta'], 'readonly');
  const cs = tx.objectStore('cards'), ms = tx.objectStore('meta');
  const [ck, cv, mk, mv] = await Promise.all([req(cs.getAllKeys()), req(cs.getAll()), req(ms.getAllKeys()), req(ms.getAll())]);
  const cards: Record<string, Card> = {}, meta: Record<string, unknown> = {};
  ck.forEach((k, i) => { cards[String(k)] = cv[i]; });
  mk.forEach((k, i) => { meta[String(k)] = mv[i]; });
  return { cards, meta };
}

/** 一個交易內寫入：put 變動的卡片、delete 移除的卡片、put 全部 meta */
export async function write(db: IDBDatabase, put: Record<string, Card>, del: string[], meta: Record<string, unknown>) {
  const tx = db.transaction(['cards', 'meta'], 'readwrite');
  const cs = tx.objectStore('cards'), ms = tx.objectStore('meta');
  for (const [id, c] of Object.entries(put)) cs.put(c, id);
  for (const id of del) cs.delete(id);
  for (const [k, v] of Object.entries(meta)) ms.put(v, k);
  await done(tx);
}
