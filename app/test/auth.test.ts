// C2 登入：魔法連結 → verify → session → logout。Resend 以假 fetch 取代。
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createApp } from '../../functions/_lib/app';
import { sha256 } from '../../functions/_lib/db';
import { MAX_LINKS_PER_HOUR, loginEmail } from '../../functions/_lib/auth';
import { makeD1 } from './helpers/d1';

const app = createApp();
let DB: ReturnType<typeof makeD1>, sent: { to: string[]; html: string; text: string; from: string }[], resendStatus: number;
const env = () => ({ DB, RESEND_API_KEY: 're_test' });
const post = (path: string, body: unknown, opts: { origin?: string; token?: string; env?: object } = {}) =>
  app.request(`${opts.origin ?? 'https://mojowu.app'}/api${path}`, {
    method: 'POST', body: JSON.stringify(body),
    headers: { 'content-type': 'application/json', ...(opts.token ? { authorization: `Bearer ${opts.token}` } : {}) },
  }, opts.env ?? env());
const linkToken = (i = -1) => /#login=([A-Za-z0-9_-]+)/.exec(sent.at(i)!.text)![1];

beforeEach(() => {
  DB = makeD1(); sent = []; resendStatus = 200;
  vi.stubGlobal('fetch', vi.fn(async (url: string, init: RequestInit) => {
    expect(url).toBe('https://api.resend.com/emails');
    expect((init.headers as Record<string, string>).authorization).toBe('Bearer re_test');
    sent.push(JSON.parse(init.body as string));
    return new Response(resendStatus === 200 ? '{"id":"x"}' : 'err', { status: resendStatus });
  }));
});
afterEach(() => vi.unstubAllGlobals());

describe('POST /api/auth/magic-link', () => {
  it('寄出登入信：寄件人、收件人、連結指向這次請求的網址', async () => {
    const r = await post('/auth/magic-link', { email: '  MY@Example.com ' });
    expect(r.status).toBe(200);
    expect(sent).toHaveLength(1);
    expect(sent[0].to).toEqual(['my@example.com']);
    expect(sent[0].from).toBe('mojowu 魔力 日語學習 <login@mail.mojowu.app>');
    expect(sent[0].html).toContain('https://mojowu.app/#login=');
    expect(sent[0].text).toContain('15 分鐘');
  });
  it('pages.dev 來的請求 → 連結指向 pages.dev', async () => {
    await post('/auth/magic-link', { email: 'a@example.com' }, { origin: 'https://mojowu.pages.dev' });
    expect(sent[0].text).toContain('https://mojowu.pages.dev/#login=');
  });
  it('資料庫只存 token 雜湊、15 分鐘到期', async () => {
    await post('/auth/magic-link', { email: 'a@example.com' });
    const row = DB.raw.prepare('SELECT * FROM login_tokens').get() as { token_hash: string; expires_at: number; created_at: number };
    expect(row.token_hash).toBe(await sha256(linkToken()));
    expect(row.expires_at - row.created_at).toBe(15 * 60e3);
  });
  it.each([['不是 email', 'hello'], ['空白', ''], ['沒有網域', 'a@b']])('%s → 400', async (_, email) => {
    expect((await post('/auth/magic-link', { email })).status).toBe(400); expect(sent).toHaveLength(0);
  });
  it('不在白名單的網址 → 400（防止被拿去寄釣魚連結）', async () => {
    expect((await post('/auth/magic-link', { email: 'a@example.com' }, { origin: 'https://evil.example' })).status).toBe(400);
  });
  it(`同一 email 一小時最多 ${MAX_LINKS_PER_HOUR} 封`, async () => {
    for (let i = 0; i < MAX_LINKS_PER_HOUR; i++) expect((await post('/auth/magic-link', { email: 'a@example.com' })).status).toBe(200);
    expect((await post('/auth/magic-link', { email: 'a@example.com' })).status).toBe(429);
    expect((await post('/auth/magic-link', { email: 'b@example.com' })).status).toBe(200);
  });
  it('沒設 RESEND_API_KEY → 503；Resend 失敗 → 502', async () => {
    expect((await post('/auth/magic-link', { email: 'a@example.com' }, { env: { DB } })).status).toBe(503);
    resendStatus = 500;
    expect((await post('/auth/magic-link', { email: 'a@example.com' })).status).toBe(502);
  });
});

describe('POST /api/auth/verify', () => {
  it('新使用者：建立帳號並回傳 session，可用來呼叫 /me', async () => {
    await post('/auth/magic-link', { email: 'New@Example.com' });
    const r = await post('/auth/verify', { token: linkToken() });
    expect(r.status).toBe(200);
    const j = await r.json() as { token: string; isNew: boolean; user: { email: string } };
    expect(j.isNew).toBe(true); expect(j.user.email).toBe('new@example.com');
    const me = await app.request('https://mojowu.app/api/me', { headers: { authorization: `Bearer ${j.token}` } }, env());
    expect(me.status).toBe(200);
  });
  it('既有使用者：同一 email 再登入是同一個帳號', async () => {
    await post('/auth/magic-link', { email: 'a@example.com' });
    const first = await (await post('/auth/verify', { token: linkToken() })).json() as { user: { id: string } };
    await post('/auth/magic-link', { email: 'A@example.com' });
    const second = await (await post('/auth/verify', { token: linkToken() })).json() as { isNew: boolean; user: { id: string } };
    expect(second.isNew).toBe(false); expect(second.user.id).toBe(first.user.id);
    expect(DB.raw.prepare('SELECT COUNT(*) n FROM users').get()).toEqual({ n: 1 });
  });
  it('連結只能用一次', async () => {
    await post('/auth/magic-link', { email: 'a@example.com' });
    const t = linkToken();
    expect((await post('/auth/verify', { token: t })).status).toBe(200);
    expect((await post('/auth/verify', { token: t })).status).toBe(400);
  });
  it('過期的連結 → 400', async () => {
    await post('/auth/magic-link', { email: 'a@example.com' });
    DB.raw.prepare('UPDATE login_tokens SET expires_at = ?').run(Date.now() - 1);
    expect(await (await post('/auth/verify', { token: linkToken() })).json()).toEqual({ error: 'invalid_or_expired' });
  });
  it('亂打的 token → 400', async () => {
    expect((await post('/auth/verify', { token: 'x' })).status).toBe(400);
    expect((await post('/auth/verify', { token: 'A'.repeat(43) })).status).toBe(400);
  });
});

describe('POST /api/auth/logout', () => {
  it('登出後 session 失效', async () => {
    await post('/auth/magic-link', { email: 'a@example.com' });
    const { token } = await (await post('/auth/verify', { token: linkToken() })).json() as { token: string };
    expect((await post('/auth/logout', {}, { token })).status).toBe(200);
    expect((await app.request('https://mojowu.app/api/me', { headers: { authorization: `Bearer ${token}` } }, env())).status).toBe(401);
  });
  it('沒登入 → 401', async () => expect((await post('/auth/logout', {})).status).toBe(401));
});

it('信件內容：繁中、有按鈕與純文字連結', () => {
  const m = loginEmail('https://mojowu.app/#login=abc');
  expect(m.subject).toBe('登入 mojowu');
  expect(m.html).toContain('href="https://mojowu.app/#login=abc"');
  expect(m.text).toContain('https://mojowu.app/#login=abc');
});
