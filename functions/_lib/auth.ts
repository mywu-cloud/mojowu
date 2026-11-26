// C2：Email 魔法連結登入。
// POST /api/auth/magic-link {email} → 寄出登入連結（15 分鐘、一次性）
// POST /api/auth/verify {token}     → 換成 session token（90 天）
// POST /api/auth/logout              → 刪除目前 session
// 只存 token 的 SHA-256；連結的網址取自這次請求的 origin（只接受白名單），讓 mojowu.app 與 pages.dev 各自登入。
import { Hono } from 'hono';
import { sha256, uuid } from './db';
import { auth, SESSION_DAYS, type AppEnv, type User } from './app-core';

export const LOGIN_TTL_MIN = 15, MAX_LINKS_PER_HOUR = 5;
const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/;
export const ALLOWED_ORIGINS = [/^https:\/\/mojowu\.app$/, /^https:\/\/mojowu\.pages\.dev$/, /^https:\/\/[a-z0-9-]+\.mojowu\.pages\.dev$/, /^http:\/\/localhost(:\d+)?$/];

/** 32 bytes 隨機，base64url */
export function randomToken(): string {
  const b = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...b)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function loginEmail(link: string) {
  const subject = '登入 mojowu';
  const text = `你好！\n\n點下面的連結就能登入 mojowu（${LOGIN_TTL_MIN} 分鐘內有效，只能使用一次）：\n\n${link}\n\n如果不是你本人要求登入，請忽略這封信，帳號不會有任何變動。\n\n— mojowu 日語學習`;
  const html = `<!doctype html><html><body style="margin:0;background:#F7F3EA;font-family:'Noto Sans TC',system-ui,sans-serif;color:#1F1B16">
<div style="max-width:480px;margin:0 auto;padding:32px 24px">
<div style="font-weight:700;color:#C23B22;font-size:20px">mojowu 魔力 日語學習</div>
<h1 style="font-size:22px;margin:16px 0 8px">登入 mojowu</h1>
<p style="font-size:16px;line-height:1.6;margin:0 0 24px">點下面的按鈕就能登入。連結 ${LOGIN_TTL_MIN} 分鐘內有效，只能使用一次。</p>
<p style="margin:0 0 24px"><a href="${link}" style="display:inline-block;background:#C23B22;color:#fff;text-decoration:none;font-weight:700;padding:14px 28px;border-radius:14px">登入 mojowu</a></p>
<p style="font-size:13px;color:#6B645A;line-height:1.6;margin:0">按鈕沒反應的話，複製這個網址到瀏覽器開啟：<br><span style="word-break:break-all">${link}</span></p>
<p style="font-size:13px;color:#6B645A;line-height:1.6;margin:24px 0 0">如果不是你本人要求登入，請忽略這封信，帳號不會有任何變動。</p>
</div></body></html>`;
  return { subject, text, html };
}

export function authRoutes() {
  const r = new Hono<AppEnv>();

  r.post('/magic-link', async c => {
    let body: { email?: unknown };
    try { body = await c.req.json(); } catch { return c.json({ error: 'bad_json' }, 400); }
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    if (!EMAIL.test(email) || email.length > 254) return c.json({ error: 'bad_email' }, 400);
    const origin = new URL(c.req.url).origin;
    if (!ALLOWED_ORIGINS.some(re => re.test(origin))) return c.json({ error: 'bad_origin' }, 400);
    if (!c.env.RESEND_API_KEY) return c.json({ error: 'email_unavailable' }, 503);
    const db = c.get('db'), now = Date.now();
    const recent = await db.prepare('SELECT COUNT(*) AS n FROM login_tokens WHERE email = ?1 AND created_at > ?2').bind(email, now - 3600e3).first<{ n: number }>();
    if ((recent?.n ?? 0) >= MAX_LINKS_PER_HOUR) return c.json({ error: 'too_many' }, 429);
    const token = randomToken();
    await db.prepare('INSERT INTO login_tokens (token_hash, email, created_at, expires_at) VALUES (?1, ?2, ?3, ?4)')
      .bind(await sha256(token), email, now, now + LOGIN_TTL_MIN * 60e3).run();
    const link = `${origin}/#login=${token}`;       // 放在 # 後：不會出現在伺服器紀錄與 Referer
    const msg = loginEmail(link);
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { authorization: `Bearer ${c.env.RESEND_API_KEY}`, 'content-type': 'application/json' },
      body: JSON.stringify({ from: c.env.MAIL_FROM || 'mojowu <login@mail.mojowu.app>', to: [email], subject: msg.subject, text: msg.text, html: msg.html }),
    });
    if (!res.ok) { console.error('resend', res.status, await res.text().catch(() => '')); return c.json({ error: 'send_failed' }, 502); }
    return c.json({ ok: true });
  });

  r.post('/verify', async c => {
    let body: { token?: unknown };
    try { body = await c.req.json(); } catch { return c.json({ error: 'bad_json' }, 400); }
    const token = typeof body.token === 'string' ? body.token : '';
    if (!/^[A-Za-z0-9_-]{40,60}$/.test(token)) return c.json({ error: 'bad_token' }, 400);
    const db = c.get('db'), now = Date.now(), h = await sha256(token);
    // 一次性：只有 used_at 為空且未過期的那一筆會被標記成功
    const used = await db.prepare('UPDATE login_tokens SET used_at = ?1 WHERE token_hash = ?2 AND used_at IS NULL AND expires_at > ?1').bind(now, h).run();
    if (!used.meta?.changes) return c.json({ error: 'invalid_or_expired' }, 400);
    const { email } = (await db.prepare('SELECT email FROM login_tokens WHERE token_hash = ?1').bind(h).first<{ email: string }>())!;
    let user = await db.prepare('SELECT * FROM users WHERE email = ?1').bind(email).first<User>();
    const isNew = !user;
    if (!user) {
      const id = uuid();
      await db.prepare('INSERT INTO users (id, email, created_at, updated_at) VALUES (?1, ?2, ?3, ?3)').bind(id, email, now).run();
      user = (await db.prepare('SELECT * FROM users WHERE id = ?1').bind(id).first<User>())!;
    }
    const session = randomToken();
    await db.prepare('INSERT INTO sessions (token_hash, user_id, created_at, expires_at, last_seen_at) VALUES (?1, ?2, ?3, ?4, ?3)')
      .bind(await sha256(session), user.id, now, now + SESSION_DAYS * 864e5).run();
    return c.json({ token: session, isNew, user: { id: user.id, email: user.email } });
  });

  r.post('/logout', auth, async c => {
    const m = /^Bearer (.+)$/.exec(c.req.header('authorization') || '')!;
    await c.get('db').prepare('DELETE FROM sessions WHERE token_hash = ?1').bind(await sha256(m[1])).run();
    return c.json({ ok: true });
  });

  return r;
}
