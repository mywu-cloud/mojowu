// mojowu.pages.dev → https://mojowu.app 永久轉址（301），保留路徑與查詢字串。
// 預覽部署（<hash>.mojowu.pages.dev、<branch>.mojowu.pages.dev）不轉，方便測試。
// 2026-11-25：pages.dev 上沒有封測者，直接轉址（DECISIONS 18 更新）。
export const CANONICAL = 'https://mojowu.app';

export function redirectTarget(url: string): string | null {
  const u = new URL(url);
  if (u.hostname !== 'mojowu.pages.dev') return null;
  return CANONICAL + u.pathname + u.search;
}

export const onRequest = async (ctx: { request: Request; next: () => Promise<Response> }): Promise<Response> => {
  const to = redirectTarget(ctx.request.url);
  if (to) return new Response(null, { status: 301, headers: { location: to, 'cache-control': 'public, max-age=86400' } });
  return ctx.next();
};
