// 測試用：以 Node 內建 SQLite（node:sqlite）模擬 Cloudflare D1 的 API，並可套用 migrations/*.sql。
import { createRequire } from 'module';
import fs from 'fs';
import type { D1, D1Stmt } from '../../../functions/_lib/db';

const { DatabaseSync } = createRequire(import.meta.url)('node:sqlite');
const MIG = new URL('../../../migrations/', import.meta.url);

const norm = (v: unknown) => (v === undefined ? null : typeof v === 'boolean' ? (v ? 1 : 0) : v);

export function makeD1(migrations: string[] | 'all' = 'all'): D1 & { raw: InstanceType<typeof DatabaseSync> } {
  const raw = new DatabaseSync(':memory:');
  raw.exec('PRAGMA foreign_keys = ON');   // D1 預設啟用外鍵
  const files = migrations === 'all' ? fs.readdirSync(MIG).filter(f => f.endsWith('.sql')).sort() : migrations;
  for (const f of files) raw.exec(fs.readFileSync(new URL(f, MIG), 'utf8'));
  const stmt = (sql: string, params: unknown[] = []): D1Stmt => ({
    bind: (...v) => stmt(sql, v.map(norm)),
    first: async <T,>() => (raw.prepare(sql).get(...params) ?? null) as T | null,
    all: async <T,>() => ({ results: raw.prepare(sql).all(...params) as T[] }),
    run: async () => { const r = raw.prepare(sql).run(...params); return { results: [], meta: { changes: Number(r.changes) } }; },
  });
  return {
    raw,
    prepare: sql => stmt(sql),
    batch: async stmts => {
      raw.exec('BEGIN');
      try { const out = []; for (const s of stmts) out.push(await s.run()); raw.exec('COMMIT'); return out; }
      catch (e) { raw.exec('ROLLBACK'); throw e; }
    },
  };
}

/** 建立使用者與 session，回傳 Bearer token */
export async function seedUser(db: ReturnType<typeof makeD1>, opts: { email?: string; expires?: number; lastSeen?: number } = {}) {
  const { sha256 } = await import('../../../functions/_lib/db');
  const id = crypto.randomUUID(), now = Date.now(), token = 'tok_' + crypto.randomUUID().replace(/-/g, '');
  db.raw.prepare('INSERT INTO users (id, email, created_at, updated_at) VALUES (?, ?, ?, ?)').run(id, opts.email ?? `${id.slice(0, 8)}@example.com`, now, now);
  db.raw.prepare('INSERT INTO sessions (token_hash, user_id, created_at, expires_at, last_seen_at) VALUES (?, ?, ?, ?, ?)')
    .run(await sha256(token), id, now, opts.expires ?? now + 864e5 * 90, opts.lastSeen ?? now);
  return { id, token };
}
