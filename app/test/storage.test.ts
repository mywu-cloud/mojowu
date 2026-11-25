// B3：IndexedDB 儲存、localStorage 鏡像、從 MVP 遷移。
import { describe, it, expect, beforeEach } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import * as st from '../src/store/state';
import { openDB, readAll } from '../src/store/db';

class MemStorage { m = new Map<string, string>(); getItem(k: string) { return this.m.get(k) ?? null; } setItem(k: string, v: string) { this.m.set(k, String(v)); } removeItem(k: string) { this.m.delete(k); } clear() { this.m.clear(); } }
const g = globalThis as unknown as { localStorage: MemStorage; indexedDB: IDBFactory | undefined };
const MVP = { cards: { k001: { s: 3.7, d: 5.1, due: 1, reps: 1, last: 0, ok: true }, v0002: { s: 0.4, d: 7.6, due: 2, reps: 2, last: 0, ok: false, lapses: 1 } }, target: 0.95, streak: 4, lastDay: '2026-11-20', log: { '2026-11-20': 12 }, kana: 1 };
const idb = async () => { const db = await openDB(); const s = await readAll(db); db.close(); return s; };
/** 模擬重開 App */
const restart = async () => { await st.settled(); st._resetForTest(); await st.initState(); };

beforeEach(() => { st._resetForTest(); g.localStorage = new MemStorage(); g.indexedDB = new IDBFactory(); });

describe('從 MVP 遷移', () => {
  it('首次啟動：localStorage 的 mojowu-v1 原封不動搬進 IndexedDB', async () => {
    g.localStorage.setItem(st.KEY, JSON.stringify(MVP));
    await st.initState(); await st.settled();
    expect(st.S).toEqual(MVP);
    expect(st.storage).toMatchObject({ backend: 'indexedDB', migrated: true });
    const snap = await idb();
    expect(snap.cards).toEqual(MVP.cards);
    expect(snap.meta).toMatchObject({ target: 0.95, streak: 4, lastDay: '2026-11-20', kana: 1, migratedFrom: 'localStorage:mojowu-v1' });
    expect(JSON.parse(g.localStorage.getItem(st.KEY)!)).toEqual(MVP);   // 鏡像保留，欄位不變
  });
  it('只遷移一次：第二次啟動從 IndexedDB 讀、不再標示遷移', async () => {
    g.localStorage.setItem(st.KEY, JSON.stringify(MVP));
    await st.initState(); await restart();
    expect(st.storage.migrated).toBe(false);
    expect(st.S).toEqual(MVP);
  });
  it('全新使用者：沒有資料時用預設值', async () => {
    await st.initState();
    expect(st.S).toEqual(st.defaultState());
    expect(st.storage.migrated).toBe(false);
  });
});

describe('儲存', () => {
  it('作答後重開，進度還在', async () => {
    await st.initState();
    st.S.cards.k010 = { s: 1, d: 5, due: 9, reps: 1, last: 0, ok: true }; st.S.streak = 2; st.save();
    await restart();
    expect(st.S.cards.k010).toEqual({ s: 1, d: 5, due: 9, reps: 1, last: 0, ok: true });
    expect(st.S.streak).toBe(2);
  });
  it('連續多次 save 會合併，最後狀態正確', async () => {
    await st.initState();
    for (let i = 0; i < 20; i++) { st.S.cards[`v${i}`] = { reps: i }; st.save(); }
    await st.settled();
    expect(Object.keys((await idb()).cards)).toHaveLength(20);
  });
  it('清除進度會刪掉 IndexedDB 的卡片', async () => {
    g.localStorage.setItem(st.KEY, JSON.stringify(MVP));
    await st.initState();
    st.replaceState(st.defaultState()); await st.settled();
    expect((await idb()).cards).toEqual({});
    await restart();
    expect(st.S).toEqual(st.defaultState());
  });
  it('貼上還原（取代整份）後重開仍是還原的內容', async () => {
    await st.initState();
    st.replaceState(Object.assign(st.defaultState(), MVP));
    await restart();
    expect(st.S).toEqual(MVP);
  });
});

describe('IndexedDB 沒寫完時以鏡像救回', () => {
  it('鏡像較新 → 用鏡像並補寫 IndexedDB', async () => {
    g.localStorage.setItem(st.KEY, JSON.stringify(MVP));
    await st.initState(); await st.settled();
    // 模擬：最後一題已同步寫進鏡像，但 IndexedDB 交易沒完成就關掉 App
    const newer = { ...MVP, streak: 5, cards: { ...MVP.cards, g01: { reps: 1, ok: true } } };
    g.localStorage.setItem(st.KEY, JSON.stringify(newer));
    g.localStorage.setItem(st.SAVED_AT_KEY, String(Date.now() + 60_000));
    st._resetForTest(); await st.initState(); await st.settled();
    expect(st.S).toEqual(newer);
    expect((await idb()).cards.g01).toEqual({ reps: 1, ok: true });
  });
  it('IndexedDB 較新 → 用 IndexedDB 並更新鏡像', async () => {
    await st.initState();
    st.S.kana = 1; st.save(); await st.settled();
    g.localStorage.setItem(st.KEY, JSON.stringify(st.defaultState()));
    g.localStorage.setItem(st.SAVED_AT_KEY, '1');
    st._resetForTest(); await st.initState();
    expect(st.S.kana).toBe(1);
    expect(JSON.parse(g.localStorage.getItem(st.KEY)!).kana).toBe(1);
  });
});

describe('沒有 IndexedDB 的瀏覽器', () => {
  it('退回只用 localStorage', async () => {
    g.indexedDB = undefined;
    g.localStorage.setItem(st.KEY, JSON.stringify(MVP));
    await st.initState();
    expect(st.storage.backend).toBe('localStorage');
    expect(st.S).toEqual(MVP);
    st.S.streak = 9; st.save();
    expect(JSON.parse(g.localStorage.getItem(st.KEY)!).streak).toBe(9);
  });
});
