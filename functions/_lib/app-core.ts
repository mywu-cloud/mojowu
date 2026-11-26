// 共用：型別、需要 D1、需要登入的中介層。
import type { MiddlewareHandler } from 'hono';
import { type Env, type D1, sha256 } from './db';

export interface User {
  id: string; email: string; display_name: string | null; plan: string; target_retention: number; timezone: string;
  goal: string | null; daily_minutes: number | null; streak: number; last_day: string | null; kana: number; target_at?: number; created_at: number; updated_at: number;
}
type Vars = { user: User; db: D1 };
export type AppEnv = { Bindings: Env; Variables: Vars };

export const SESSION_DAYS = 90;
const DAY = 864e5;

/** 需要 D1 */
export const needDB: MiddlewareHandler<AppEnv> = async (c, next) => {
  if (!c.env?.DB) return c.json({ error: 'db_unavailable' }, 503);
  c.set('db', c.env.DB);
  await next();
};

/** 需要登入：Authorization: Bearer <session token> */
export const auth: MiddlewareHandler<AppEnv> = async (c, next) => {
  const m = /^Bearer ([A-Za-z0-9_-]{20,200})$/.exec(c.req.header('authorization') || '');
  if (!m) return c.json({ error: 'unauthorized' }, 401);
  const db = c.get('db'), now = Date.now(), h = await sha256(m[1]);
  const row = await db.prepare(
    'SELECT u.*, s.expires_at AS s_exp, s.last_seen_at AS s_seen FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ?1',
  ).bind(h).first<User & { s_exp: number; s_seen: number }>();
  if (!row || row.s_exp < now) return c.json({ error: 'unauthorized' }, 401);
  if (now - row.s_seen > DAY)   // 一天最多展延一次，減少寫入
    await db.prepare('UPDATE sessions SET last_seen_at = ?1, expires_at = ?2 WHERE token_hash = ?3').bind(now, now + SESSION_DAYS * DAY, h).run();
  const { s_exp: _e, s_seen: _s, ...user } = row;
  c.set('user', user);
  await next();
};

