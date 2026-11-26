// 前端登入流程（src/lib/account.ts）：寄信、點連結登入、登出。fetch 與 localStorage 以假物件取代。
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

class MemStorage { m = new Map<string, string>(); getItem(k: string) { return this.m.get(k) ?? null; } setItem(k: string, v: string) { this.m.set(k, v); } removeItem(k: string) { this.m.delete(k); } }
let calls: { url: string; body: unknown; auth: string | null }[], reply: (url: string) => [number, unknown];

beforeEach(() => {
  vi.resetModules(); calls = [];
  vi.stubGlobal('localStorage', new MemStorage());
  vi.stubGlobal('history', { replaceState: (_: unknown, __: string, url: string) => { (globalThis as { location: { hash: string } }).location.hash = url.slice(url.indexOf('#')); } });
  vi.stubGlobal('location', { hash: '', pathname: '/', search: '' });
  vi.stubGlobal('fetch', vi.fn(async (url: string, init: RequestInit) => {
    calls.push({ url, body: init.body ? JSON.parse(init.body as string) : null, auth: new Headers(init.headers).get('authorization') });
    const [status, body] = reply(url);
    return new Response(JSON.stringify(body), { status });
  }));
});
afterEach(() => vi.unstubAllGlobals());

describe('account', () => {
  it('寄登入信成功 → sentTo；失敗 → 中文錯誤訊息', async () => {
    const A = await import('../src/lib/account');
    reply = () => [200, { ok: true }];
    await A.requestLink(' me@example.com ');
    expect(calls[0]).toMatchObject({ url: '/api/auth/magic-link', body: { email: ' me@example.com ' } });
    expect(A.account.sentTo).toBe('me@example.com');
    reply = () => [429, { error: 'too_many' }];
    await A.requestLink('me@example.com');
    expect(A.account.error).toBe('寄太多次了，請一小時後再試。');
  });
  it('#login=<token> → verify、存 session、網址立刻換成 #me', async () => {
    location.hash = '#login=' + 'a'.repeat(43);
    const A = await import('../src/lib/account');
    const { ui } = await import('../src/store/ui');
    reply = () => [200, { token: 'sess_' + 'b'.repeat(40), user: { email: 'me@example.com' } }];
    expect(await A.handleLoginLink()).toBe(true);
    expect(location.hash).toBe('#me');
    expect(calls[0]).toMatchObject({ url: '/api/auth/verify', body: { token: 'a'.repeat(43) } });
    expect(A.account.session?.email).toBe('me@example.com');
    expect(JSON.parse(localStorage.getItem('mojowu-session')!).email).toBe('me@example.com');
    expect(ui.view).toBe('me'); expect(ui.modal).toMatchObject({ kind: 'toast', text: expect.stringContaining('登入成功！me@example.com') });
  });
  it('過期連結 → 提示重寄、不登入', async () => {
    location.hash = '#login=' + 'a'.repeat(43);
    const A = await import('../src/lib/account');
    const { ui } = await import('../src/store/ui');
    reply = () => [400, { error: 'invalid_or_expired' }];
    await A.handleLoginLink();
    expect(A.account.session).toBeNull();
    expect(ui.modal).toMatchObject({ text: '登入連結已失效或已使用過，請重新寄一封。' });
  });
  it('一般網址不處理', async () => {
    location.hash = '#home';
    const A = await import('../src/lib/account');
    expect(await A.handleLoginLink()).toBe(false); expect(calls).toHaveLength(0);
  });
  it('登出：呼叫 API（帶 Bearer）並清掉本機 session；API 失敗也照樣登出', async () => {
    localStorage.setItem('mojowu-session', JSON.stringify({ token: 'sess_x', email: 'me@example.com' }));
    const A = await import('../src/lib/account');
    reply = () => [500, {}];
    await A.logout();
    expect(calls[0]).toMatchObject({ url: '/api/auth/logout', auth: 'Bearer sess_x' });
    expect(A.account.session).toBeNull(); expect(localStorage.getItem('mojowu-session')).toBeNull();
  });
  it('API 回 401 → 自動登出', async () => {
    localStorage.setItem('mojowu-session', JSON.stringify({ token: 'sess_x', email: 'me@example.com' }));
    const A = await import('../src/lib/account');
    reply = () => [401, { error: 'unauthorized' }];
    await expect(A.api('/me')).rejects.toThrow('unauthorized');
    expect(A.account.session).toBeNull();
  });
});
