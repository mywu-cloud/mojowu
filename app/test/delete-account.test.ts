// C4：DELETE /api/me 刪除帳號與所有雲端資料（node:sqlite 模擬 D1）。
import { describe, it, expect, beforeEach } from 'vitest';
import { createApp } from '../../functions/_lib/app';
import { makeD1, seedUser } from './helpers/d1';

const app = createApp();
let DB: ReturnType<typeof makeD1>;
const call = (method: string, path: string, token?: string, body?: unknown) =>
  app.request(`https://mojowu.app/api${path}`, { method, body: body ? JSON.stringify(body) : undefined,
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) } }, { DB });
const count = (table: string, where = '1=1', ...v: unknown[]) => (DB.raw.prepare(`SELECT COUNT(*) AS n FROM ${table} WHERE ${where}`).get(...v) as { n: number }).n;

beforeEach(() => { DB = makeD1(); });

describe('DELETE /api/me', () => {
  it('需要登入', async () => {
    expect((await call('DELETE', '/me')).status).toBe(401);
  });

  it('刪除自己的帳號、卡片、作答、每日統計、session、登入連結；不動其他人', async () => {
    const a = await seedUser(DB, { email: 'a@example.com' }), b = await seedUser(DB, { email: 'b@example.com' });
    const card = { s: 3, d: 5, due: 2000, reps: 1, last: 1000, ok: true };
    for (const u of [a, b]) {
      const r = await call('POST', '/sync', u.token, { since: 0, cards: { k001: card },
        reviews: [{ id: crypto.randomUUID(), item: 'k001', at: 1000, rating: 3, source: 'lesson' }],
        meta: { streak: 1, lastDay: '2026-11-26', kana: 0, log: { '2026-11-26': 1 }, target: 0.9, targetAt: 0 } });
      expect(r.status).toBe(200);
    }
    DB.raw.prepare('INSERT INTO login_tokens (token_hash, email, created_at, expires_at) VALUES (?, ?, ?, ?)').run('h1', 'a@example.com', 1, 2);
    DB.raw.prepare('INSERT INTO login_tokens (token_hash, email, created_at, expires_at) VALUES (?, ?, ?, ?)').run('h2', 'b@example.com', 1, 2);

    const r = await call('DELETE', '/me', a.token);
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ ok: true, deleted: true });

    for (const t of ['cards', 'reviews', 'daily_stats', 'sessions']) {
      expect(count(t, 'user_id = ?', a.id), t).toBe(0);
      expect(count(t, 'user_id = ?', b.id), t).toBe(1);
    }
    expect(count('users', 'id = ?', a.id)).toBe(0);
    expect(count('users', 'id = ?', b.id)).toBe(1);
    expect(count('login_tokens', 'email = ?', 'a@example.com')).toBe(0);
    expect(count('login_tokens', 'email = ?', 'b@example.com')).toBe(1);
  });

  it('刪除後舊 token 失效；同一個 Email 之後可重新註冊成新帳號', async () => {
    const a = await seedUser(DB, { email: 'a@example.com' });
    expect((await call('DELETE', '/me', a.token)).status).toBe(200);
    expect((await call('GET', '/me', a.token)).status).toBe(401);
    const again = await seedUser(DB, { email: 'a@example.com' });
    expect(again.id).not.toBe(a.id);
    expect((await call('GET', '/me', again.token)).status).toBe(200);
  });
});
