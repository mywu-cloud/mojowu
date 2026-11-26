// 整合：兩台「裝置」的用戶端 sync.ts 透過真正的 Hono API（node:sqlite）同步。
import { it, expect, vi, afterEach } from 'vitest';
import { createApp } from '../../functions/_lib/app';
import { makeD1, seedUser } from './helpers/d1';

class MemStorage { m = new Map<string, string>(); getItem(k: string) { return this.m.get(k) ?? null; } setItem(k: string, v: string) { this.m.set(k, String(v)); } removeItem(k: string) { this.m.delete(k); } }
afterEach(() => vi.unstubAllGlobals());

it('手機學了 → 電腦登入同一帳號就拿到；電腦再學 → 手機同步後也有', async () => {
  const app = createApp(), DB = makeD1(), { token } = await seedUser(DB, { email: 'me@example.com' });
  vi.stubGlobal('navigator', { onLine: true });
  vi.stubGlobal('fetch', (url: string, init: RequestInit) => app.request('https://mojowu.app' + url, init, { DB }));
  const device = async () => {
    vi.resetModules();
    const ls = new MemStorage(); vi.stubGlobal('localStorage', ls);
    ls.setItem('mojowu-session', JSON.stringify({ token, email: 'me@example.com' }));
    const sync = await import('../src/lib/sync'), st = await import('../src/store/state');
    return { sync, st, ls };
  };
  // 手機
  const phone = await device();
  phone.st.S.cards.k001 = { s: 3.7145, d: 5.1618, due: 1e13, reps: 1, last: 1000, ok: true };
  Object.assign(phone.st.S, { streak: 3, lastDay: '2026-11-26', log: { '2026-11-26': 5 }, kana: 1 });
  phone.sync.recordReview('k001', true, 'lesson', 1000);
  await phone.sync.runSync();
  expect(phone.sync.sync.state).toBe('idle');
  // 電腦：原本有另一張卡
  const pc = await device();
  pc.st.S.cards.v0005 = { s: 0.4872, d: 7.6, due: 5000, reps: 1, last: 2000, ok: false };
  await pc.sync.runSync();
  expect(Object.keys(pc.st.S.cards).sort()).toEqual(['k001', 'v0005']);
  expect(pc.st.S).toMatchObject({ streak: 3, lastDay: '2026-11-26', kana: 1, log: { '2026-11-26': 5 } });
  // 電腦再複習 k001
  pc.st.S.cards.k001 = { s: 14.8, d: 5.1618, due: 2e13, reps: 2, last: 9000, ok: true };
  await pc.sync.runSync();
  // 回到手機（同一個 localStorage）
  vi.stubGlobal('localStorage', phone.ls); vi.resetModules();
  const phone2 = { sync: await import('../src/lib/sync'), st: await import('../src/store/state') };
  await phone2.sync.runSync();
  expect(phone2.st.S.cards.k001).toMatchObject({ reps: 2, last: 9000 });
  expect(phone2.st.S.cards.v0005).toBeTruthy();
  expect(DB.raw.prepare('SELECT COUNT(*) n FROM reviews').get()).toEqual({ n: 1 });
  expect(DB.raw.prepare('SELECT COUNT(*) n FROM cards').get()).toEqual({ n: 2 });
});
