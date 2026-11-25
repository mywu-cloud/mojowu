// functions/_lib/app.ts（Hono API）＋ migrations/*.sql，在真的 SQLite 上測。
import { describe, it, expect, beforeEach } from 'vitest';
import { createApp } from '../../functions/_lib/app';
import { sha256 } from '../../functions/_lib/db';
import { makeD1, seedUser } from './helpers/d1';

const app = createApp();
let DB: ReturnType<typeof makeD1>;
const call = (path: string, init: RequestInit & { token?: string } = {}, env: object = { DB }) => {
  const headers = new Headers(init.headers);
  if (init.token) headers.set('authorization', `Bearer ${init.token}`);
  if (init.body) headers.set('content-type', 'application/json');
  return app.request(`https://mojowu.pages.dev/api${path}`, { ...init, headers }, env);
};
beforeEach(() => { DB = makeD1(); });

describe('migrations', () => {
  it('可重複執行（IF NOT EXISTS）', () => { expect(() => makeD1(['0000_events.sql', '0001_accounts.sql', '0000_events.sql', '0001_accounts.sql'])).not.toThrow(); });
  it('刪除使用者會連帶刪除 session 與卡片', async () => {
    const { id } = await seedUser(DB);
    DB.raw.prepare('INSERT INTO cards (user_id, item_id, updated_at) VALUES (?, ?, ?)').run(id, 'k001', 1);
    DB.raw.prepare('DELETE FROM users WHERE id = ?').run(id);
    expect(DB.raw.prepare('SELECT COUNT(*) n FROM sessions').get()).toEqual({ n: 0 });
    expect(DB.raw.prepare('SELECT COUNT(*) n FROM cards').get()).toEqual({ n: 0 });
  });
});

describe('/api/health', () => {
  it('沒有 D1 → 503', async () => expect((await call('/health', {}, {})).status).toBe(503));
  it('只有 events 表 → ok:false（尚未執行 0001）', async () => {
    DB = makeD1(['0000_events.sql']);
    expect(await (await call('/health')).json()).toEqual({ ok: false, db: true, tables: [] });
  });
  it('資料表齊全 → ok:true', async () => {
    const r = await call('/health');
    expect(r.status).toBe(200);
    expect(await r.json()).toMatchObject({ ok: true, db: true });
  });
});

describe('驗證', () => {
  it('沒有 token / 格式錯 / 不存在 → 401', async () => {
    expect((await call('/me')).status).toBe(401);
    expect((await call('/me', { headers: { authorization: 'Basic abc' } })).status).toBe(401);
    expect((await call('/me', { token: 'tok_' + 'x'.repeat(32) })).status).toBe(401);
  });
  it('session 過期 → 401', async () => {
    const { token } = await seedUser(DB, { expires: Date.now() - 1 });
    expect((await call('/me', { token })).status).toBe(401);
  });
  it('資料庫只存 token 雜湊', async () => {
    const { token } = await seedUser(DB);
    const row = DB.raw.prepare('SELECT token_hash FROM sessions').get() as { token_hash: string };
    expect(row.token_hash).toBe(await sha256(token)); expect(row.token_hash).not.toContain(token);
  });
  it('超過一天沒用 → 使用時展延 90 天', async () => {
    const { token } = await seedUser(DB, { lastSeen: Date.now() - 2 * 864e5, expires: Date.now() + 864e5 });
    expect((await call('/me', { token })).status).toBe(200);
    const s = DB.raw.prepare('SELECT expires_at FROM sessions').get() as { expires_at: number };
    expect(s.expires_at).toBeGreaterThan(Date.now() + 89 * 864e5);
  });
  it('沒有 D1 → 503', async () => expect((await call('/me', { token: 'tok_' + 'x'.repeat(32) }, {})).status).toBe(503));
});

describe('/api/me', () => {
  it('GET 回傳使用者設定（不含內部欄位）', async () => {
    const { token, id } = await seedUser(DB, { email: 'my@example.com' });
    const r = await call('/me', { token });
    expect(r.status).toBe(200);
    const me = await r.json();
    expect(me).toMatchObject({ id, email: 'my@example.com', plan: 'free', targetRetention: 0.9, timezone: 'Asia/Taipei', streak: 0, kana: 0 });
    expect(me).not.toHaveProperty('updated_at');
  });
  it('PATCH 更新允許的欄位', async () => {
    const { token } = await seedUser(DB);
    const r = await call('/me', { method: 'PATCH', token, body: JSON.stringify({ targetRetention: 0.95, timezone: 'Asia/Tokyo', displayName: '  MY ', goal: 'jlpt', dailyMinutes: 10 }) });
    expect(r.status).toBe(200);
    expect(await r.json()).toMatchObject({ targetRetention: 0.95, timezone: 'Asia/Tokyo', displayName: 'MY', goal: 'jlpt', dailyMinutes: 10 });
  });
  it.each([
    [{ targetRetention: 0.7 }, 'bad_targetRetention'],
    [{ timezone: 'Mars/Base' }, 'bad_timezone'],
    [{ displayName: 'x'.repeat(41) }, 'bad_displayName'],
    [{ goal: 'hack' }, 'bad_goal'],
    [{ dailyMinutes: 999 }, 'bad_dailyMinutes'],
    [{ email: 'other@example.com' }, 'nothing_to_update'],
  ])('PATCH %j → 400 %s', async (body, err) => {
    const { token } = await seedUser(DB);
    const r = await call('/me', { method: 'PATCH', token, body: JSON.stringify(body) });
    expect(r.status).toBe(400); expect(await r.json()).toEqual({ error: err });
  });
  it('只能改自己的資料', async () => {
    const a = await seedUser(DB, { email: 'a@example.com' }), b = await seedUser(DB, { email: 'b@example.com' });
    await call('/me', { method: 'PATCH', token: a.token, body: JSON.stringify({ displayName: 'A' }) });
    expect(await (await call('/me', { token: b.token })).json()).toMatchObject({ displayName: null });
  });
});

it('未知路徑 → 404 JSON', async () => {
  const r = await call('/nope');
  expect(r.status).toBe(404); expect(await r.json()).toEqual({ error: 'not_found' });
});
