// /api/* 交給 Hono（functions/_lib/app.ts）。/api/event 有自己的檔案（functions/api/event.ts），Pages 會優先比對較精確的路徑。
import { handle } from 'hono/cloudflare-pages';
import { app } from '../_lib/app';

export const onRequest = handle(app);
