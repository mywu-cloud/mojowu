// 解鎖與排程查詢（見 docs/LEARNING.md §2）。
import { C } from '../content/load';
import type { Item } from '../content/types';
import { S } from './state';
import { NOW } from '../lib/date';

export const learned = (id: string) => !!S.cards[id];
export const kanjiReady = (id: string) => !!(S.cards[id] && S.cards[id].ok);
/** 單字要等它用到的 N5 漢字都答對過才解鎖 */
export const available = (it: Item) => it.type !== 'v' || it.req.every(kanjiReady);
export const unitItems = (n: number): Item[] => [...C.K, ...C.V, ...C.G].filter(it => it.unit === n);
export const unitDone = (n: number) => unitItems(n).every(it => learned(it.id));
export const currentUnit = () => (C.UNITS.find(u => !unitDone(u.n)) || C.UNITS.at(-1)!).n;
export const unitOpen = (n: number) => n === 1 || unitDone(n - 1);
export const HEAVY_K = 20;  // 漢字數達此門檻的單元標示「建議兩週」（目前只有單元 2：28 字）
export const unitHeavy = (n: number) => unitItems(n).filter(i => i.type === 'k').length >= HEAVY_K;

const ORDER = { k: 0, v: 1, g: 2 } as const;
export function nextNew(n: number, max = 5): Item[] {
  return unitItems(n).filter(it => !learned(it.id) && available(it)).sort((a, b) => ORDER[a.type] - ORDER[b.type]).slice(0, max);
}
export const dueList = (): Item[] => Object.entries(S.cards).filter(([, c]) => c.due! <= NOW()).map(([id]) => C.ITEMS[id]).filter(Boolean);
export const count = (arr: Item[]) => arr.filter(it => learned(it.id)).length;
