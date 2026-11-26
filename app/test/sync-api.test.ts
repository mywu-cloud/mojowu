// C3：POST /api/sync（node:sqlite 模擬 D1，套用全部 migration）。
import { describe, it, expect, beforeEach } from 'vitest';
import { createApp } from '../../functions/_lib/app';
import { validate, type SyncBody } from '../../functions/_lib/sync';
import { makeD1, seedUser } from './helpers/d1';

const app = createApp();
let DB: ReturnType<typeof makeD1>, tok: string;
const meta = (o: Partial<SyncBody['meta']> = {}): SyncBody['meta'] => ({ streak: 0, lastDay: '', kana: 0, log: {}, target: 0.9, targetAt: 0, ...o });
const body = (o: Partial<SyncBody> = {}): SyncBody => ({ since: 0, cards: {}, reviews: [], meta: meta(), ...o });
const sync = async (b: unknown, token = tok) => {
  const r = await app.request('https://mojowu.app/api/sync', { method: 'POST', body: JSON.stringify(b), headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` } }, { DB });
  return { status: r.status, j: await r.json() as { serverTime: number; cards: Record<string, Record<string, unknown>>; meta: SyncBody['meta']; error?: string } };
};
const rid = () => crypto.randomUUID();
beforeEach(async () => { DB = makeD1(); tok = (await seedUser(DB)).token; });

describe('驗證', () => {
  it('需要登入', async () => expect((await sync(body(), 'tok_' + 'x'.repeat(30))).status).toBe(401));
  it.each([
    ['since 負數', { since: -1 }],
    ['卡片 ID 格式錯', { cards: { 'x1': {} } }],
    ['難度超出範圍', { cards: { k001: { d: 99 } } }],
    ['ok 不是布林', { cards: { k001: { ok: 'yes' } } }],
    ['作答 rating 錯', { reviews: [{ id: rid(), item: 'k001', at: 1, rating: 9, source: 'lesson' }] }],
    ['作答 source 錯', { reviews: [{ id: rid(), item: 'k001', at: 1, rating: 3, source: 'hack' }] }],
    ['目標記憶率錯', { meta: meta({ target: 0.5 }) }],
    ['日期格式錯', { meta: meta({ log: { '2026/11/26': 3 } }) }],
  ])('%s → 400', async (_, o) => {
    const r = await sync({ ...body(), ...o }); expect(r.status).toBe(400);
  });
  it('validate 接受空同步', () => expect(validate(body())).toBeNull());
});

describe('卡片', () => {
  it('上傳後可在另一台裝置（since=0）下載，格式與本機一致', async () => {
    const card = { s: 3.7145, d: 5.1618, due: 2000, reps: 1, last: 1000, ok: true };
    const a = await sync(body({ cards: { k001: card, v0002: { s: 0.4872, d: 7.6214, due: 1500, reps: 2, lapses: 1, last: 900, ok: false } } }));
    expect(a.status).toBe(200);
    const b = await sync(body());
    expect(b.j.cards.k001).toEqual(card);
    expect(b.j.cards.v0002).toEqual({ s: 0.4872, d: 7.6214, due: 1500, reps: 2, lapses: 1, last: 900, ok: false });
  });
  it('較舊的作答不會覆蓋較新的', async () => {
    await sync(body({ cards: { k001: { s: 10, d: 5, due: 9000, reps: 3, last: 5000, ok: true } } }));
    await sync(body({ cards: { k001: { s: 1, d: 5, due: 3000, reps: 1, last: 1000, ok: false } } }));
    expect((await sync(body())).j.cards.k001).toMatchObject({ s: 10, last: 5000 });
  });
  it('較新的作答會覆蓋', async () => {
    await sync(body({ cards: { k001: { s: 1, d: 5, due: 3000, reps: 1, last: 1000, ok: true } } }));
    await sync(body({ cards: { k001: { s: 9, d: 4, due: 8000, reps: 2, last: 6000, ok: true } } }));
    expect((await sync(body())).j.cards.k001).toMatchObject({ s: 9, reps: 2, last: 6000 });
  });
  it('作答時間相同、到期較早（測驗錯題）→ 採用較早的到期時間', async () => {
    await sync(body({ cards: { k001: { s: 5, d: 5, due: 9000, reps: 2, last: 1000, ok: true } } }));
    await sync(body({ cards: { k001: { s: 5, d: 5, due: 2000, reps: 2, last: 1000, ok: true } } }));
    expect((await sync(body())).j.cards.k001.due).toBe(2000);
  });
  it('since 之後才回傳；剛上傳的卡也會回傳', async () => {
    const first = await sync(body({ cards: { k001: { last: 1, due: 1, reps: 1 } } }));
    expect(Object.keys(first.j.cards)).toEqual(['k001']);
    const second = await sync(body({ since: first.j.serverTime }));
    expect(second.j.cards).toEqual({});
  });
  it('不同使用者互不影響', async () => {
    const other = (await seedUser(DB, { email: 'other@example.com' })).token;
    await sync(body({ cards: { k001: { last: 1, due: 1, reps: 1 } } }));
    expect((await sync(body(), other)).j.cards).toEqual({});
  });
});

describe('作答紀錄', () => {
  it('以 id 去重，重送不會重複', async () => {
    const rv = { id: rid(), item: 'k001', at: 1000, rating: 3, source: 'lesson' };
    await sync(body({ reviews: [rv] })); await sync(body({ reviews: [rv] }));
    expect(DB.raw.prepare('SELECT COUNT(*) n FROM reviews').get()).toEqual({ n: 1 });
  });
});

describe('設定與統計', () => {
  it('每日次數取較大值（重送不重複累加）', async () => {
    await sync(body({ meta: meta({ log: { '2026-11-25': 10 } }) }));
    await sync(body({ meta: meta({ log: { '2026-11-25': 7, '2026-11-26': 3 } }) }));
    expect((await sync(body())).j.meta.log).toEqual({ '2026-11-25': 10, '2026-11-26': 3 });
  });
  it('連續天數：較晚的 lastDay 勝；同一天取較大值', async () => {
    await sync(body({ meta: meta({ streak: 5, lastDay: '2026-11-25' }) }));
    expect((await sync(body({ meta: meta({ streak: 1, lastDay: '2026-11-20' }) }))).j.meta).toMatchObject({ streak: 5, lastDay: '2026-11-25' });
    expect((await sync(body({ meta: meta({ streak: 6, lastDay: '2026-11-25' }) }))).j.meta).toMatchObject({ streak: 6 });
    expect((await sync(body({ meta: meta({ streak: 1, lastDay: '2026-11-26' }) }))).j.meta).toMatchObject({ streak: 1, lastDay: '2026-11-26' });
  });
  it('kana 取較大值', async () => {
    await sync(body({ meta: meta({ kana: 1 }) }));
    expect((await sync(body({ meta: meta({ kana: 0 }) }))).j.meta.kana).toBe(1);
  });
  it('目標記憶率：targetAt 較新者勝', async () => {
    await sync(body({ meta: meta({ target: 0.95, targetAt: 2000 }) }));
    expect((await sync(body({ meta: meta({ target: 0.85, targetAt: 1000 }) }))).j.meta).toMatchObject({ target: 0.95, targetAt: 2000 });
    expect((await sync(body({ meta: meta({ target: 0.85, targetAt: 3000 }) }))).j.meta).toMatchObject({ target: 0.85, targetAt: 3000 });
  });
});
