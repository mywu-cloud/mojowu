// 解鎖規則與連續天數（docs/LEARNING.md §2 MVP 欄）。用小型假資料。
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { setContent, expand } from '../src/content/load';
import { S, replaceState, defaultState, touchDay, shownStreak } from '../src/store/state';
import { available, nextNew, unitOpen, unitDone, currentUnit, dueList, unitHeavy, HEAVY_K } from '../src/store/progress';
import type { RawData } from '../src/content/types';

const raw: RawData = {
  u: [[1, 'A'], [2, 'B']],
  k: [['k1', '一', 1, '一', '一', ['イチ'], []], ['k2', '二', 1, '二', '二', ['ニ'], []],
      ...Array.from({ length: HEAVY_K }, (_, i) => [`k${i + 10}`, 'x', 2, 'x', 'x', ['ア'], []] as RawData['k'][number])],
  v: [['v1', 1, '一つ', 'ひとつ', '一個', ['k1'], ''], ['v2', 1, '二つ', 'ふたつ', '兩個', ['k2'], ''], ['v3', 1, 'はい', 'はい', '是', [], ''],
      ['v4', 1, '一二', 'いちに', 'x', ['k1', 'k2'], '']],
  g: [['g1', 1, 'です', '是', 'です。', '是。']],
};
const C = expand(raw);
const learn = (id: string, ok = true, due = Date.now() + 864e5) => { S.cards[id] = { ok, due, reps: 1 }; };

beforeEach(() => { setContent(C); replaceState(defaultState()); });
afterEach(() => vi.useRealTimers());

describe('單字解鎖', () => {
  it('所需漢字沒學過 → 鎖住；沒有漢字的單字一開始就可學', () => {
    expect(available(C.ITEMS.v1)).toBe(false);
    expect(available(C.ITEMS.v3)).toBe(true);
  });
  it('漢字最近一次答錯 → 仍鎖住；答對 → 解鎖', () => {
    learn('k1', false); expect(available(C.ITEMS.v1)).toBe(false);
    learn('k1', true); expect(available(C.ITEMS.v1)).toBe(true);
  });
  it('需要多個漢字時要全部答對', () => {
    learn('k1'); expect(available(C.ITEMS.v4)).toBe(false);
    learn('k2'); expect(available(C.ITEMS.v4)).toBe(true);
  });
  it('漢字與文法永遠可學', () => { expect(available(C.ITEMS.k1)).toBe(true); expect(available(C.ITEMS.g1)).toBe(true); });
});

describe('nextNew', () => {
  it('順序：漢字 → 可解鎖單字 → 文法，跳過已學與鎖住的', () => {
    expect(nextNew(1).map(i => i.id)).toEqual(['k1', 'k2', 'v3', 'g1']);
    learn('k1');
    expect(nextNew(1).map(i => i.id)).toEqual(['k2', 'v1', 'v3', 'g1']);
  });
  it('最多 5 項', () => {
    learn('k1'); learn('k2');
    expect(nextNew(1)).toHaveLength(5);
    expect(nextNew(1, 2).map(i => i.id)).toEqual(['v1', 'v2']);
  });
});

describe('單元', () => {
  it('第 1 單元永遠開；上一單元全學過才開下一單元', () => {
    expect(unitOpen(1)).toBe(true); expect(unitOpen(2)).toBe(false);
    for (const id of ['k1', 'k2', 'v1', 'v2', 'v3', 'v4']) learn(id);
    expect(unitDone(1)).toBe(false); expect(currentUnit()).toBe(1);
    learn('g1');
    expect(unitDone(1)).toBe(true); expect(unitOpen(2)).toBe(true); expect(currentUnit()).toBe(2);
  });
  it('全部學完時 currentUnit 停在最後一單元', () => {
    for (const id of Object.keys(C.ITEMS)) learn(id);
    expect(currentUnit()).toBe(2);
  });
  it(`漢字 ≥ ${HEAVY_K} 的單元標示建議兩週`, () => { expect(unitHeavy(1)).toBe(false); expect(unitHeavy(2)).toBe(true); });
});

describe('dueList', () => {
  it('只列到期且存在於內容的卡', () => {
    learn('k1', true, Date.now() - 1); learn('k2', true, Date.now() + 1e6); learn('gone', true, 0);
    expect(dueList().map(i => i.id)).toEqual(['k1']);
  });
});

describe('連續天數', () => {
  const at = (d: string) => vi.setSystemTime(new Date(`${d}T12:00:00`));
  beforeEach(() => vi.useFakeTimers());
  it('第一天＝1、同一天不重複加、隔天 +1、中斷重設為 1', () => {
    at('2026-11-01'); touchDay(); expect(S.streak).toBe(1);
    touchDay(3); expect(S.streak).toBe(1); expect(S.log['2026-11-01']).toBe(4);
    at('2026-11-02'); touchDay(); expect(S.streak).toBe(2);
    at('2026-11-05'); touchDay(); expect(S.streak).toBe(1);
  });
  it('畫面顯示：今天或昨天有學才顯示，否則 0', () => {
    at('2026-11-01'); touchDay(); at('2026-11-02'); touchDay();
    at('2026-11-03'); expect(shownStreak()).toBe(2);
    at('2026-11-04'); expect(shownStreak()).toBe(0);
  });
});
