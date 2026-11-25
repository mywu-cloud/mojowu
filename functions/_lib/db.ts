// D1 型別（只列用到的部分，免裝 @cloudflare/workers-types）
export interface D1Result<T = Record<string, unknown>> { results: T[]; meta?: { changes?: number } }
export interface D1Stmt {
  bind(...v: unknown[]): D1Stmt;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<D1Result<T>>;
  run(): Promise<D1Result>;
}
export interface D1 { prepare(sql: string): D1Stmt; batch(stmts: D1Stmt[]): Promise<D1Result[]> }
export interface Env { DB?: D1 }

export async function sha256(s: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}
export const uuid = () => crypto.randomUUID();
