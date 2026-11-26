// C3 用戶端：合併規則與同步流程（fetch、localStorage 以假物件取代）。
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

class MemStorage { m = new Map<string, string>(); getItem(k: string) { return this.m.get(k) ?? null; } setItem(k: string, v: string) { this.m.set(k, String(v)); } removeItem(k: string) { this.m.delete(k); } }
let sent: Record<string, unknown>[], reply: () => unknown;

beforeEach(() => {
  vi.resetModules(); sent = [];
  vi.stubGlobal('localStorage', new MemStorage());
  vi.stubGlobal('navigator', { onLine: true });
  localStorage.setItem('mojowu-session', JSON.stringify({ token: 'sess_x', email: 'me@example.com' }));
  vi.stubGlobal('fetch', vi.fn(async (_: string, init: RequestInit) => { sent.push(JSON.parse(init.body as string)); return new Response(JSON.stringify(reply()), { status: 200 }); }));
});
afterEach(() => vi.unstubAllGlobals());
const load = async () => ({ ...(await import('../src/lib/sync')), st: await import('../src/store/state') });
const empty = (o: object = {}) => ({ serverTime: 5000, cards: {}, meta: { streak: 0, lastDay: '', kana: 0, log: {}, target: 0.9, targetAt: 0 }, ...o });

describe('remoteWins', () => {
  it('本機沒有 → 用遠端；last 較新者勝；last 相同取 due 較早', async () => {
    const { remoteWins } = await load();
    expect(remoteWins(undefined, { last: 1 })).toBe(true);
    expect(remoteWins({ last: 5, due: 9 }, { last: 6, due: 99 })).toBe(true);
    expect(remoteWins({ last: 6, due: 9 }, { last: 5, due: 1 })).toBe(false);
    expect(remoteWins({ last: 5, due: 9 }, { last: 5, due: 2 })).toBe(true);
    expect(remoteWins({ last: 5, due: 2 }, { last: 5, due: 9 })).toBe(false);
  });
});

describe('mergeResponse', () => {
  it('卡片、每日次數、連續天數、kana、目標記憶率', async () => {
    const { mergeResponse, st } = await load();
    Object.assign(st.S, { cards: { k001: { last: 10, due: 20 }, k002: { last: 50, due: 60 } }, log: { '2026-11-25': 5 }, streak: 2, lastDay: '2026-11-25', kana: 0, target: 0.9 });
    const n = mergeResponse({ serverTime: 1, cards: { k001: { last: 30, due: 40 }, k002: { last: 40, due: 1 }, v0003: { last: 1 } },
      meta: { streak: 3, lastDay: '2026-11-26', kana: 1, log: { '2026-11-25': 3, '2026-11-26': 7 }, target: 0.95, targetAt: 100 } }, 50);
    expect(n).toBe(2);
    expect(st.S.cards).toEqual({ k001: { last: 30, due: 40 }, k002: { last: 50, due: 60 }, v0003: { last: 1 } });
    expect(st.S.log).toEqual({ '2026-11-25': 5, '2026-11-26': 7 });
    expect(st.S).toMatchObject({ streak: 3, lastDay: '2026-11-26', kana: 1, target: 0.95 });
  });
  it('本機目標記憶率較新 → 保留本機', async () => {
    const { mergeResponse, st } = await load();
    st.S.target = 0.85;
    mergeResponse(empty({ meta: { streak: 0, lastDay: '', kana: 0, log: {}, target: 0.95, targetAt: 100 } }) as never, 200);
    expect(st.S.target).toBe(0.85);
  });
});

describe('runSync', () => {
  it('第一次：上傳全部卡片與作答紀錄；之後只上傳有變動的', async () => {
    const { runSync, recordReview, st, sync } = await load();
    st.S.cards = { k001: { last: 1, due: 2, reps: 1, ok: true }, k002: { last: 3, due: 4, reps: 1, ok: false } };
    recordReview('k002', false, 'lesson', 3);
    reply = () => empty();
    await runSync();
    expect(sent[0]).toMatchObject({ since: 0 });
    expect(Object.keys(sent[0].cards as object).sort()).toEqual(['k001', 'k002']);
    expect((sent[0].reviews as { item: string; rating: number }[])).toMatchObject([{ item: 'k002', rating: 1, source: 'lesson' }]);
    expect(sync.state).toBe('idle'); expect(sync.at).toBeGreaterThan(0);
    // 第二次：只有 k001 變了；作答紀錄已清空；since 用伺服器時間
    st.S.cards.k001 = { last: 9, due: 10, reps: 2, ok: true };
    await runSync();
    expect(sent[1]).toMatchObject({ since: 5000, reviews: [] });
    expect(Object.keys(sent[1].cards as object)).toEqual(['k001']);
  });
  it('下載的卡片寫入本機進度', async () => {
    const { runSync, st } = await load();
    reply = () => empty({ cards: { g01: { s: 3.7, d: 5, due: 99, reps: 1, last: 50, ok: true } } });
    await runSync();
    expect(st.S.cards.g01).toMatchObject({ s: 3.7, last: 50 });
    expect(JSON.parse(localStorage.getItem('mojowu-v1')!).cards.g01).toBeTruthy();
  });
  it('換帳號 → since 歸零、重新上傳全部', async () => {
    const { runSync, st } = await load();
    st.S.cards = { k001: { last: 1, due: 2, reps: 1 } };
    reply = () => empty();
    await runSync();
    localStorage.setItem('mojowu-session', JSON.stringify({ token: 'sess_y', email: 'other@example.com' }));
    vi.resetModules();
    const again = await load();
    again.st.S.cards = { k001: { last: 1, due: 2, reps: 1 } };
    await again.runSync();
    expect(sent[1]).toMatchObject({ since: 0 });
    expect(Object.keys(sent[1].cards as object)).toEqual(['k001']);
  });
  it('離線 → 不送、狀態 offline；失敗 → error，作答紀錄保留', async () => {
    const { runSync, recordReview, sync } = await load();
    recordReview('k001', true, 'review');
    vi.stubGlobal('navigator', { onLine: false });
    await runSync();
    expect(sent).toHaveLength(0); expect(sync.state).toBe('offline');
    vi.stubGlobal('navigator', { onLine: true });
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{"error":"internal"}', { status: 500 })));
    await runSync();
    expect(sync.state).toBe('error');
    expect(JSON.parse(localStorage.getItem('mojowu-pending')!)).toHaveLength(1);
  });
  it('沒登入 → 不同步', async () => {
    localStorage.removeItem('mojowu-session');
    const { runSync } = await load();
    await runSync(); expect(sent).toHaveLength(0);
  });
});
