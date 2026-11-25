// Cloudflare Pages Function：POST /api/event —— 匿名學習事件（ROADMAP A3），用來算留存。
// 只記：隨機匿名代號、事件名稱、使用者當地日期、App 版本、數量。不記 IP、User-Agent 或任何個人資料。
// 需要 D1 綁定，變數名稱 DB（Pages 設定 → 繫結）；資料表見 docs/ANALYTICS.md。
// 尚未綁定時回 204 並略過，不影響 App。

interface D1Like { prepare(sql: string): { bind(...v: unknown[]): { run(): Promise<unknown> } } }
interface Env { DB?: D1Like }

export const EVENTS = ['app_open', 'lesson_done', 'review_done', 'test_done', 'kana_done'] as const;
const ANON = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const VER = /^[0-9A-Za-z.\-]{1,20}$/;

export interface EventBody { a: string; e: string; d: string; v: string; n?: number }

/** 驗證並正規化；不合法回 null */
export function parse(body: unknown, now = Date.now()): EventBody | null {
  if (!body || typeof body !== 'object') return null;
  const b = body as Record<string, unknown>;
  if (typeof b.a !== 'string' || !ANON.test(b.a)) return null;
  if (typeof b.e !== 'string' || !(EVENTS as readonly string[]).includes(b.e)) return null;
  if (typeof b.d !== 'string' || !DAY.test(b.d)) return null;
  const t = Date.parse(b.d + 'T00:00:00Z');                       // 當地日期與伺服器時間相差不可超過 3 天（時區＋時鐘誤差）
  if (!Number.isFinite(t) || Math.abs(t - now) > 2 * 864e5 + 864e5) return null;
  if (typeof b.v !== 'string' || !VER.test(b.v)) return null;
  const n = b.n === undefined ? 1 : b.n;
  if (typeof n !== 'number' || !Number.isInteger(n) || n < 0 || n > 1000) return null;
  return { a: b.a, e: b.e, d: b.d, v: b.v, n };
}

export const onRequestPost = async ({ request, env }: { request: Request; env: Env }): Promise<Response> => {
  if (+(request.headers.get('content-length') || 0) > 2048) return new Response(null, { status: 413 });
  let body: unknown;
  try { body = JSON.parse(await request.text()); } catch { return new Response(null, { status: 400 }); }
  const ev = parse(body);
  if (!ev) return new Response(null, { status: 400 });
  if (!env.DB) return new Response(null, { status: 204, headers: { 'x-mojowu-events': 'disabled' } });
  try {
    await env.DB.prepare('INSERT INTO events (anon, event, day, ts, ver, n) VALUES (?1, ?2, ?3, ?4, ?5, ?6)')
      .bind(ev.a, ev.e, ev.d, Date.now(), ev.v, ev.n).run();
  } catch { return new Response(null, { status: 500 }); }
  return new Response(null, { status: 204 });
};
