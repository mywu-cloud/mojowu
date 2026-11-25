// mojowu API（Hono）。部署為 Pages Functions：functions/api/[[route]].ts 把 /api/* 交給這裡。
// 端點規格見 docs/API.md。C1：/health、/me；C2：/auth/*（auth.ts）。C3 同步、C4 刪除帳號在後續加入。
import { Hono } from 'hono';
import { needDB, auth, type AppEnv, type User } from './app-core';
import { authRoutes } from './auth';
export { auth, SESSION_DAYS, type AppEnv, type User } from './app-core';

const publicUser = (u: User) => ({
  id: u.id, email: u.email, displayName: u.display_name, plan: u.plan, targetRetention: u.target_retention, timezone: u.timezone,
  goal: u.goal, dailyMinutes: u.daily_minutes, streak: u.streak, lastDay: u.last_day, kana: u.kana, createdAt: u.created_at,
});

const isTimezone = (tz: string) => { try { new Intl.DateTimeFormat('en', { timeZone: tz }); return true; } catch { return false; } };

export function createApp() {
  const app = new Hono<AppEnv>().basePath('/api');

  app.onError((err, c) => { console.error(err); return c.json({ error: 'internal' }, 500); });
  app.notFound(c => c.json({ error: 'not_found' }, 404));

  /** 健康檢查：D1 是否綁定、C1 資料表是否已建立 */
  app.get('/health', async c => {
    if (!c.env?.DB) return c.json({ ok: false, db: false }, 503);
    const r = await c.env.DB.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name IN ('users','cards','reviews','sessions','login_tokens')").all<{ name: string }>();
    const tables = r.results.map(x => x.name).sort();
    return c.json({ ok: tables.length === 5, db: true, tables });
  });

  app.use('/auth/*', needDB);
  app.route('/auth', authRoutes());

  app.use('/me', needDB, auth);
  app.use('/me/*', needDB, auth);

  app.get('/me', c => c.json(publicUser(c.get('user'))));

  app.patch('/me', async c => {
    let body: Record<string, unknown>;
    try { body = await c.req.json(); } catch { return c.json({ error: 'bad_json' }, 400); }
    const sets: string[] = [], vals: unknown[] = [];
    const set = (col: string, v: unknown) => { vals.push(v); sets.push(`${col} = ?${vals.length}`); };
    if ('targetRetention' in body) { if (![0.85, 0.9, 0.95].includes(body.targetRetention as number)) return c.json({ error: 'bad_targetRetention' }, 400); set('target_retention', body.targetRetention); }
    if ('timezone' in body) { if (typeof body.timezone !== 'string' || !isTimezone(body.timezone)) return c.json({ error: 'bad_timezone' }, 400); set('timezone', body.timezone); }
    if ('displayName' in body) {
      const v = body.displayName;
      if (v !== null && (typeof v !== 'string' || v.trim().length > 40)) return c.json({ error: 'bad_displayName' }, 400);
      set('display_name', v === null ? null : (v as string).trim() || null);
    }
    if ('goal' in body) { if (body.goal !== null && !['travel', 'jlpt', 'anime', 'work', 'other'].includes(body.goal as string)) return c.json({ error: 'bad_goal' }, 400); set('goal', body.goal); }
    if ('dailyMinutes' in body) { if (body.dailyMinutes !== null && ![5, 10, 20, 30].includes(body.dailyMinutes as number)) return c.json({ error: 'bad_dailyMinutes' }, 400); set('daily_minutes', body.dailyMinutes); }
    if (!sets.length) return c.json({ error: 'nothing_to_update' }, 400);
    const u = c.get('user');
    set('updated_at', Date.now());
    vals.push(u.id);
    await c.get('db').prepare(`UPDATE users SET ${sets.join(', ')} WHERE id = ?${vals.length}`).bind(...vals).run();
    const fresh = await c.get('db').prepare('SELECT * FROM users WHERE id = ?1').bind(u.id).first<User>();
    return c.json(publicUser(fresh!));
  });

  return app;
}

export const app = createApp();
