import { describe, it, expect } from 'vitest';
import { redirectTarget, onRequest } from '../../functions/_middleware';

describe('pages.dev → mojowu.app 轉址', () => {
  it('正式 pages.dev 轉到同一路徑', () => {
    expect(redirectTarget('https://mojowu.pages.dev/')).toBe('https://mojowu.app/');
    expect(redirectTarget('https://mojowu.pages.dev/data/n5.json?v=2')).toBe('https://mojowu.app/data/n5.json?v=2');
  });
  it('mojowu.app、預覽網址、本機不轉', () => {
    for (const u of ['https://mojowu.app/', 'https://abc123.mojowu.pages.dev/', 'https://dev.mojowu.pages.dev/', 'http://localhost:8788/']) expect(redirectTarget(u)).toBeNull();
  });
  it('回 301 與 Location；其他網址交給下一層', async () => {
    const r = await onRequest({ request: new Request('https://mojowu.pages.dev/api/health'), next: async () => new Response('next') });
    expect(r.status).toBe(301); expect(r.headers.get('location')).toBe('https://mojowu.app/api/health');
    const n = await onRequest({ request: new Request('https://mojowu.app/'), next: async () => new Response('next') });
    expect(await n.text()).toBe('next');
  });
});
