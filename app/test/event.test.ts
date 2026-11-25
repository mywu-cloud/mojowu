// functions/api/event.ts（Pages Function）的驗證與寫入。
import { describe, it, expect } from 'vitest';
import { parse, onRequestPost } from '../../functions/api/event';

const ok = { a: '3b241101-e2bb-4255-8caf-4136c566a962', e: 'lesson_done', d: new Date().toISOString().slice(0, 10), v: '0.2.2', n: 5 };
const req = (body: unknown, len?: number) => new Request('https://x/api/event', { method: 'POST', body: typeof body === 'string' ? body : JSON.stringify(body), headers: len ? { 'content-length': String(len) } : {} });
const fakeDB = () => { const rows: unknown[][] = []; return { rows, prepare: () => ({ bind: (...v: unknown[]) => ({ run: async () => { rows.push(v); } }) }) }; };

describe('parse', () => {
  it('合法事件', () => expect(parse(ok)).toEqual(ok));
  it('n 預設 1', () => expect(parse({ ...ok, n: undefined })?.n).toBe(1));
  it.each([
    ['匿名代號不是 UUID', { ...ok, a: 'me@example.com' }],
    ['未知事件', { ...ok, e: 'purchase' }],
    ['日期格式錯', { ...ok, d: '2026/11/25' }],
    ['日期離現在太遠', { ...ok, d: '2020-01-01' }],
    ['版本含怪字', { ...ok, v: '<script>' }],
    ['n 不是整數', { ...ok, n: 1.5 }],
    ['n 太大', { ...ok, n: 99999 }],
    ['不是物件', 'hello'],
  ])('%s → null', (_, b) => expect(parse(b)).toBeNull());
});

describe('onRequestPost', () => {
  it('寫入 D1：只有匿名代號、事件、日期、時間、版本、數量', async () => {
    const DB = fakeDB();
    const r = await onRequestPost({ request: req(ok), env: { DB } });
    expect(r.status).toBe(204);
    expect(DB.rows).toHaveLength(1);
    expect(DB.rows[0]).toEqual([ok.a, ok.e, ok.d, expect.any(Number), ok.v, 5]);
  });
  it('尚未綁定 D1 → 204 略過', async () => {
    const r = await onRequestPost({ request: req(ok), env: {} });
    expect(r.status).toBe(204); expect(r.headers.get('x-mojowu-events')).toBe('disabled');
  });
  it('壞 JSON / 不合法 → 400；太大 → 413', async () => {
    expect((await onRequestPost({ request: req('{bad'), env: {} })).status).toBe(400);
    expect((await onRequestPost({ request: req({ ...ok, e: 'x' }), env: {} })).status).toBe(400);
    expect((await onRequestPost({ request: req(ok, 5000), env: {} })).status).toBe(413);
  });
});
