// 答案比對：用真實 N5 資料檢查每一筆的正解都會被接受（docs/LEARNING.md §4）。
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import { expand } from '../src/content/load';
import { answersFor, isRight, isNear, isKanaRight, toHira, norm } from '../src/lib/romaji';
import type { Kanji, Vocab } from '../src/content/types';

const C = expand(JSON.parse(fs.readFileSync(new URL('../../public/data/n5.json', import.meta.url), 'utf8')));
const v = (rd: string): Vocab => ({ id: 'x', type: 'v', unit: 1, ex: 'x', rd, zh: '', req: [], ff: '' });
const k = (on: string[], kun: string[]): Kanji => ({ id: 'y', type: 'k', unit: 1, ch: 'x', trad: 'x', zh: '', on, kun });

describe('answersFor', () => {
  it('單字：以 ; 拆開並去掉括號', () => expect(answersFor(v('けっこん (する);けっこん（する）'))).toEqual(['けっこん', 'けっこん']));
  it('漢字：音讀＋訓讀（取 . 前、去掉 -）', () => expect(answersFor(k(['イチ'], ['ひと-', 'ひと.つ', '-び']))).toEqual(['イチ', 'ひと', 'ひと', 'び']));
  it('文法題沒有打字答案', () => expect(answersFor(C.G[0])).toEqual([]));
});

describe('isRight', () => {
  it('羅馬字、平假名、片假名都可以', () => {
    const it = v('がっこう');
    for (const t of ['gakkou', 'がっこう', 'ガッコウ', ' gakkou ', 'GAKKOU']) expect(isRight(it, t), t).toBe(true);
  });
  it('音讀片假名也可用羅馬字作答', () => expect(isRight(k(['コク'], ['くに']), 'koku')).toBe(true));
  it('空白、錯字、只差長音都算錯', () => {
    const it = v('がっこう');
    for (const t of ['', '   ', 'gakko', 'gakou', 'gakkai']) expect(isRight(it, t), t).toBe(false);
  });
  it('外來語長音用 - 輸入', () => expect(isRight(v('テレビ'), 'terebi') && isRight(v('コーヒー'), 'ko-hi-')).toBe(true));
});

describe('isNear（差一點）', () => {
  it('只差長音／促音 → true', () => {
    expect(isNear(v('がっこう'), 'gakou')).toBe(true);
    expect(isNear(v('きって'), 'kite')).toBe(true);
    expect(isNear(v('コーヒー'), 'kohi')).toBe(true);
  });
  it('差在其他地方 → false', () => {
    expect(isNear(v('がっこう'), 'gakkai')).toBe(false);
    expect(isNear(v('がっこう'), '')).toBe(false);
  });
});

describe('isKanaRight', () => {
  it('接受替代拼法', () => { expect(isKanaRight('shi', 'si')).toBe(true); expect(isKanaRight('wo', 'o')).toBe(true); expect(isKanaRight('ka', 'KA ')).toBe(true); });
  it('不接受錯的', () => expect(isKanaRight('ka', 'ga')).toBe(false));
});

for (const lv of ['n4', 'n3', 'n2'] as const) {
  const D = expand(JSON.parse(fs.readFileSync(new URL(`../../public/data/${lv}.json`, import.meta.url), 'utf8')), lv);
  describe(`真實 ${lv.toUpperCase()} 資料：每個正解都能答對`, () => {
    it(`${D.V.length} 單字`, () => {
      const bad = D.V.filter(it => !answersFor(it).length || !answersFor(it).every(a => isRight(it, a)));
      expect(bad.map(x => `${x.id} ${x.rd}`)).toEqual([]);
    });
    it(`${D.K.length} 漢字`, () => {
      const bad = D.K.filter(it => !answersFor(it).length || !answersFor(it).every(a => isRight(it, a)));
      expect(bad.map(x => x.id)).toEqual([]);
    });
    it('正解經過 norm 後只剩假名', () => {
      const odd = [...D.V, ...D.K].flatMap(it => answersFor(it).map(a => [it.id, norm(a)] as const)).filter(([, a]) => !/^[ぁ-ゖー]+$/.test(a));
      expect(odd).toEqual([]);
    });
  });
}

describe('真實 N5 資料：每個正解都能答對', () => {
  it(`${C.V.length} 單字`, () => {
    const bad = C.V.filter(it => !answersFor(it).length || !answersFor(it).every(a => isRight(it, a)));
    expect(bad.map(x => `${x.id} ${x.rd}`)).toEqual([]);
  });
  it(`${C.K.length} 漢字`, () => {
    const bad = C.K.filter(it => !answersFor(it).length || !answersFor(it).every(a => isRight(it, a)));
    expect(bad.map(x => x.id)).toEqual([]);
  });
  it('正解經過 norm 後只剩假名（沒有殘留羅馬字或符號）', () => {
    const odd = [...C.V, ...C.K].flatMap(it => answersFor(it).map(a => [it.id, norm(a)] as const)).filter(([, a]) => !/^[ぁ-ゖー]+$/.test(a));
    expect(odd).toEqual([]);
  });
  it('toHira 不改動已是假名的輸入', () => expect(toHira('がっこう')).toBe('がっこう'));
});
