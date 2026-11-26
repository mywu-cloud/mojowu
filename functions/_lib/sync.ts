// C3：POST /api/sync —— 一次往返完成雙向同步（docs/API.md「同步」）。
// 用戶端送：since（上次同步的伺服器時間）、有變動的卡片、尚未上傳的作答紀錄、設定與每日次數。
// 伺服器：
//   卡片  —— 同一張卡以 last_review_at 較新者為準；相同時取 due_at 較早者（測驗錯題會提前到期）
//   作答  —— reviews 只增不改，以 id 去重
//   每日  —— daily_stats.reviews 取兩邊較大值（可重送不重複計算）
//   連續  —— last_day 較晚者的 streak；同一天取較大值。kana 取較大值。
//   目標記憶率 —— target_at 較新者
// 回傳：updated_at > since 的卡片、合併後的設定與每日次數、serverTime（下次的 since）。
import { Hono } from 'hono';
import type { AppEnv } from './app-core';
import type { D1Stmt } from './db';

export interface WireCard { s?: number; d?: number; due?: number; reps?: number; lapses?: number; last?: number; ok?: boolean }
export interface WireReview { id: string; item: string; at: number; rating: number; source: string }
export interface SyncBody {
  since: number;
  cards: Record<string, WireCard>;
  reviews: WireReview[];
  meta: { streak: number; lastDay: string; kana: number; log: Record<string, number>; target: number; targetAt: number };
}

const ITEM = /^(n\d-)?[kvg]\d{2,4}$/;
const DAYRE = /^\d{4}-\d{2}-\d{2}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const num = (x: unknown, min = -Infinity, max = Infinity) => typeof x === 'number' && Number.isFinite(x) && x >= min && x <= max;
const optNum = (x: unknown, min?: number, max?: number) => x === undefined || x === null || num(x, min, max);
export const MAX_CARDS = 5000, MAX_REVIEWS = 5000;

/** 驗證請求；不合法回傳錯誤碼 */
export function validate(b: unknown): string | null {
  if (!b || typeof b !== 'object') return 'bad_body';
  const x = b as Partial<SyncBody>;
  if (!num(x.since, 0)) return 'bad_since';
  if (!x.cards || typeof x.cards !== 'object' || Array.isArray(x.cards)) return 'bad_cards';
  const ids = Object.keys(x.cards);
  if (ids.length > MAX_CARDS) return 'too_many_cards';
  for (const id of ids) {
    const c = x.cards[id];
    if (!ITEM.test(id) || !c || typeof c !== 'object') return 'bad_card';
    if (!optNum(c.s, 0, 1e7) || !optNum(c.d, 0, 11) || !optNum(c.due, 0) || !optNum(c.reps, 0, 1e6) || !optNum(c.lapses, 0, 1e6) || !optNum(c.last, 0)) return 'bad_card';
    if (c.ok !== undefined && typeof c.ok !== 'boolean') return 'bad_card';
  }
  if (!Array.isArray(x.reviews) || x.reviews.length > MAX_REVIEWS) return 'bad_reviews';
  for (const r of x.reviews) {
    if (!r || !UUID.test(r.id) || !ITEM.test(r.item) || !num(r.at, 0) || ![1, 2, 3, 4].includes(r.rating) || !['lesson', 'review', 'mock', 'placement'].includes(r.source)) return 'bad_review';
  }
  const m = x.meta;
  if (!m || !num(m.streak, 0, 1e5) || !(m.lastDay === '' || DAYRE.test(m.lastDay)) || !num(m.kana, 0, 1) || ![0.85, 0.9, 0.95].includes(m.target) || !num(m.targetAt, 0)) return 'bad_meta';
  if (!m.log || typeof m.log !== 'object') return 'bad_meta';
  for (const [d, n] of Object.entries(m.log)) if (!DAYRE.test(d) || !num(n, 0, 1e6)) return 'bad_meta';
  return null;
}

interface CardRow { item_id: string; stability: number | null; difficulty: number | null; due_at: number | null; last_review_at: number | null; reps: number; lapses: number; last_ok: number | null }
export const toWire = (r: CardRow): WireCard => {
  const c: WireCard = { reps: r.reps };
  if (r.stability !== null) c.s = r.stability;
  if (r.difficulty !== null) c.d = r.difficulty;
  if (r.due_at !== null) c.due = r.due_at;
  if (r.last_review_at !== null) c.last = r.last_review_at;
  if (r.lapses) c.lapses = r.lapses;
  if (r.last_ok !== null) c.ok = !!r.last_ok;
  return c;
};

async function chunks(db: { batch(s: D1Stmt[]): Promise<unknown> }, stmts: D1Stmt[], size = 50) {
  for (let i = 0; i < stmts.length; i += size) await db.batch(stmts.slice(i, i + size));
}

export function syncRoutes() {
  const r = new Hono<AppEnv>();
  r.post('/', async c => {
    let body: unknown;
    try { body = await c.req.json(); } catch { return c.json({ error: 'bad_json' }, 400); }
    const err = validate(body);
    if (err) return c.json({ error: err }, 400);
    const b = body as SyncBody, db = c.get('db'), uid = c.get('user').id, now = Date.now();

    // 卡片：較新者勝
    const upsert = db.prepare(`INSERT INTO cards (user_id, item_id, stability, difficulty, due_at, last_review_at, reps, lapses, last_ok, state, updated_at)
      VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, 'learning', ?10)
      ON CONFLICT(user_id, item_id) DO UPDATE SET stability = excluded.stability, difficulty = excluded.difficulty, due_at = excluded.due_at,
        last_review_at = excluded.last_review_at, reps = excluded.reps, lapses = excluded.lapses, last_ok = excluded.last_ok, updated_at = excluded.updated_at
      WHERE cards.last_review_at IS NULL
         OR COALESCE(excluded.last_review_at, 0) > cards.last_review_at
         OR (COALESCE(excluded.last_review_at, 0) = cards.last_review_at AND COALESCE(excluded.due_at, 0) < COALESCE(cards.due_at, 0))`);
    const cardStmts = Object.entries(b.cards).map(([id, x]) =>
      upsert.bind(uid, id, x.s ?? null, x.d ?? null, x.due ?? null, x.last ?? null, x.reps ?? 0, x.lapses ?? 0, x.ok === undefined ? null : x.ok ? 1 : 0, now));
    const revStmt = db.prepare('INSERT OR IGNORE INTO reviews (id, user_id, item_id, reviewed_at, rating, source) VALUES (?1, ?2, ?3, ?4, ?5, ?6)');
    const revStmts = b.reviews.map(x => revStmt.bind(x.id, uid, x.item, x.at, x.rating, x.source));
    const dayStmt = db.prepare(`INSERT INTO daily_stats (user_id, day, reviews) VALUES (?1, ?2, ?3)
      ON CONFLICT(user_id, day) DO UPDATE SET reviews = MAX(daily_stats.reviews, excluded.reviews)`);
    const dayStmts = Object.entries(b.meta.log).map(([d, n]) => dayStmt.bind(uid, d, n));
    await chunks(db, [...cardStmts, ...revStmts, ...dayStmts]);

    // 設定與連續天數
    const m = b.meta;
    await db.prepare(`UPDATE users SET
        streak    = CASE WHEN ?2 > COALESCE(last_day, '') OR (?2 = COALESCE(last_day, '') AND ?3 > streak) THEN ?3 ELSE streak END,
        last_day  = CASE WHEN ?2 > COALESCE(last_day, '') THEN ?2 ELSE last_day END,
        kana      = MAX(kana, ?4),
        target_retention = CASE WHEN ?6 > target_at THEN ?5 ELSE target_retention END,
        target_at = MAX(target_at, ?6),
        updated_at = ?7
      WHERE id = ?1`).bind(uid, m.lastDay, m.streak, m.kana, m.target, m.targetAt, now).run();

    const [cards, user, days] = await Promise.all([
      db.prepare('SELECT item_id, stability, difficulty, due_at, last_review_at, reps, lapses, last_ok FROM cards WHERE user_id = ?1 AND updated_at > ?2').bind(uid, b.since).all<CardRow>(),
      db.prepare('SELECT streak, last_day, kana, target_retention, target_at FROM users WHERE id = ?1').bind(uid).first<{ streak: number; last_day: string | null; kana: number; target_retention: number; target_at: number }>(),
      db.prepare('SELECT day, reviews FROM daily_stats WHERE user_id = ?1').bind(uid).all<{ day: string; reviews: number }>(),
    ]);
    return c.json({
      serverTime: now,
      cards: Object.fromEntries(cards.results.map(r => [r.item_id, toWire(r)])),
      meta: { streak: user!.streak, lastDay: user!.last_day || '', kana: user!.kana, target: user!.target_retention, targetAt: user!.target_at,
        log: Object.fromEntries(days.results.map(d => [d.day, d.reviews])) },
    });
  });
  return r;
}
