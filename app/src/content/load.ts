import type { Content, RawData, Kanji, Vocab, Grammar, Item } from './types';

export function expand(RAW: RawData): Content {
  const ITEMS: Record<string, Item> = {};
  const UNITS = RAW.u.map(([n, t]) => ({ n, t }));
  const K = RAW.k.map(([id, ch, unit, trad, zh, on, kun]): Kanji => (ITEMS[id] = { id, type: 'k', unit, ch, trad, zh, on, kun }) as Kanji);
  const V = RAW.v.map(([id, unit, ex, rd, zh, req, ff]): Vocab => (ITEMS[id] = { id, type: 'v', unit, ex, rd, zh, req, ff }) as Vocab);
  const G = RAW.g.map(([id, unit, pat, zh, jp, tr]): Grammar => (ITEMS[id] = { id, type: 'g', unit, pat, zh, jp, tr }) as Grammar);
  return { UNITS, ITEMS, K, V, G };
}

/** 目前載入的課程（App 啟動時 loadContent() 後才可用） */
export let C: Content;
export async function loadContent(url = 'data/n5.json'): Promise<Content> {
  const r = await fetch(url);
  if (!r.ok) throw new Error(String(r.status));
  C = expand(await r.json());
  return C;
}
export function setContent(c: Content) { C = c; }
