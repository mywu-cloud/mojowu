import type { Content, RawData, Kanji, Vocab, Grammar, Item } from './types';
import { AVAILABLE, storedLevel, storeLevel, type Level } from './levels';

export function expand(RAW: RawData, level: Level = 'n5'): Content {
  const ITEMS: Record<string, Item> = {};
  const UNITS = RAW.u.map(([n, t]) => ({ n, t }));
  const K = RAW.k.map(([id, ch, unit, trad, zh, on, kun]): Kanji => (ITEMS[id] = { id, type: 'k', unit, ch, trad, zh, on, kun }) as Kanji);
  const V = RAW.v.map(([id, unit, ex, rd, zh, req, ff]): Vocab => (ITEMS[id] = { id, type: 'v', unit, ex, rd, zh, req, ff }) as Vocab);
  const G = RAW.g.map(([id, unit, pat, zh, jp, tr]): Grammar => (ITEMS[id] = { id, type: 'g', unit, pat, zh, jp, tr }) as Grammar);
  return { level, UNITS, ITEMS, K, V, G };
}

/** 所有已載入級數的項目（複習會跨級數） */
export const ALL_ITEMS: Record<string, Item> = {};
/** 已載入的級數 */
export const LOADED: Partial<Record<Level, Content>> = {};
/** 目前選的級數（學習路徑、首頁、測驗用）。ITEMS 指向 ALL_ITEMS。 */
export let C: Content;

function register(c: Content) {
  LOADED[c.level] = c;
  Object.assign(ALL_ITEMS, c.ITEMS);
}

/** App 啟動時載入所有已上線的級數，並切到上次選的級數 */
export async function loadContent(): Promise<Content> {
  const got = await Promise.all(AVAILABLE.map(async l => {
    const r = await fetch(`data/${l}.json`);
    if (!r.ok) throw new Error(`${l} ${r.status}`);
    return expand(await r.json(), l);
  }));
  got.forEach(register);
  setLevel(storedLevel());
  return C;
}

export function setLevel(l: Level) {
  const c = LOADED[l] || LOADED.n5!;
  C = { ...c, ITEMS: ALL_ITEMS };
  storeLevel(c.level);
}

/** 測試用：只用這一份內容 */
export function setContent(c: Content) { C = c; }
