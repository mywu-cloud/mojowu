// C2：帳號（Email 魔法連結）。session token 存 localStorage「mojowu-session」，與學習進度分開。
// 登入後由 lib/sync.ts 做雲端同步（C3）。C4：deleteAccount() 刪除帳號與雲端資料（本機進度保留）。
import { ui, bump } from '../store/ui';

const KEY = 'mojowu-session';
export interface Session { token: string; email: string }

const ls = {
  get: () => { try { return JSON.parse(localStorage.getItem(KEY) || 'null') as Session | null; } catch { return null; } },
  set: (s: Session | null) => { try { if (s) localStorage.setItem(KEY, JSON.stringify(s)); else localStorage.removeItem(KEY); } catch { /* 無痕模式 */ } },
};
export const account = { session: ls.get(), sending: false, sentTo: '', error: '' };

const ERR: Record<string, string> = {
  bad_email: 'Email 格式不正確。',
  too_many: '寄太多次了，請一小時後再試。',
  email_unavailable: '登入信服務暫時無法使用，請稍後再試。',
  send_failed: '寄信失敗，請稍後再試。',
  invalid_or_expired: '登入連結已失效或已使用過，請重新寄一封。',
};
const msg = (code: string) => ERR[code] || '連線失敗，請檢查網路後再試。';

/** 呼叫 /api；有登入就帶 Bearer。401 時自動登出。 */
export async function api<T = unknown>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body) headers.set('content-type', 'application/json');
  if (account.session) headers.set('authorization', `Bearer ${account.session.token}`);
  const r = await fetch(`/api${path}`, { ...init, headers });
  const j = await r.json().catch(() => ({}));
  if (r.status === 401 && account.session) { account.session = null; ls.set(null); bump(); }
  if (!r.ok) throw new Error((j as { error?: string }).error || String(r.status));
  return j as T;
}

export async function requestLink(email: string) {
  account.sending = true; account.error = ''; account.sentTo = ''; bump();
  try { await api('/auth/magic-link', { method: 'POST', body: JSON.stringify({ email }) }); account.sentTo = email.trim(); }
  catch (e) { account.error = msg((e as Error).message); }
  finally { account.sending = false; bump(); }
}

/** 網址是 #login=<token> 時換成 session。回傳是否處理了登入連結。 */
export async function handleLoginLink(): Promise<boolean> {
  const m = /^#login=([A-Za-z0-9_-]+)$/.exec(location.hash);
  if (!m) return false;
  history.replaceState(null, '', location.pathname + location.search + '#me');   // 立刻從網址移除 token
  ui.view = 'me';
  try {
    const r = await api<{ token: string; user: { email: string } }>('/auth/verify', { method: 'POST', body: JSON.stringify({ token: m[1] }) });
    account.session = { token: r.token, email: r.user.email }; ls.set(account.session);
    ui.modal = { kind: 'toast', text: `登入成功！${r.user.email}\n正在同步學習進度…` };
    (await import('./sync')).runSync();
  } catch (e) {
    ui.modal = { kind: 'toast', text: msg((e as Error).message) };
  }
  bump();
  return true;
}

export async function logout() {
  try { await api('/auth/logout', { method: 'POST', body: '{}' }); } catch { /* 離線也照樣登出本機 */ }
  account.session = null; account.sentTo = ''; ls.set(null);
  (await import('./sync')).resetSync();
  bump();
}

/** C4：刪除帳號與所有雲端資料。成功後本機變回未登入，學習進度留在這台裝置。 */
export async function deleteAccount(): Promise<boolean> {
  const email = account.session?.email ?? '';
  try { await api('/me', { method: 'DELETE' }); }
  catch (e) {
    ui.modal = { kind: 'toast', text: account.session ? `刪除失敗：${msg((e as Error).message)}` : '登入已過期，請重新登入後再刪除帳號。' };
    bump(); return false;
  }
  account.session = null; account.sentTo = ''; ls.set(null);
  (await import('./sync')).resetSync();
  ui.modal = { kind: 'toast', text: `帳號 ${email} 與雲端上的學習資料已刪除。\n這台裝置上的進度仍保留；不需要的話，可以在「我的」最下方按「清除所有進度」。` };
  bump(); return true;
}
