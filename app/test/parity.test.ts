// 與 MVP（public/index.html）對照：同樣輸入必須得到同樣結果，確保移植沒有改變行為。
// MVP 退場後可刪除此檔。
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import * as R from '../src/lib/romaji';
import { schedule, type Card } from '../src/lib/fsrs';

const html = fs.readFileSync(new URL('../../public/index.html', import.meta.url), 'utf8');
const mvpRomaji = new Function(html.slice(html.indexOf('const R2K'), html.indexOf('/* ---------- FSRS')) + '; return {toHira, norm, loose, isRight, isNear};')();
const fsrsSrc = html.slice(html.indexOf('const W = '), html.indexOf('/* ---------- state'));
const mvpSchedule = (card: Card, good: boolean, target: number, now: number) =>
  new Function('S', 'DAY', 'NOW', fsrsSrc + '; return schedule;')({ target }, 864e5, () => now)(card, good);

const words = ['kyou','gakkou','konnichiha','shinbun','onna','kippu','erebe-ta-','nnn','tteeee','sha','xtu','ti2','コーヒー','がっこう','おおきい','とうきょう','ジュース','～えん',' ka ','Tokyo','n\'a'];
const rnd = (n: number) => Array.from({ length: n }, () => 'aiueokstnhmyrwgzdbpjf-'.charAt(Math.floor(Math.random() * 22))).join('');

describe('romaji parity with MVP', () => {
  const inputs = [...words, ...Array.from({ length: 400 }, () => rnd(1 + Math.floor(Math.random() * 8)))];
  it('toHira / norm / loose', () => {
    for (const w of inputs) {
      expect(R.toHira(w), w).toBe(mvpRomaji.toHira(w));
      expect(R.norm(w), w).toBe(mvpRomaji.norm(w));
      expect(R.loose(R.norm(w)), w).toBe(mvpRomaji.loose(mvpRomaji.norm(w)));
    }
  });
  it('isRight / isNear on sample items', () => {
    const items = [
      { id: 'k', type: 'k', unit: 1, ch: '学', trad: '學', zh: '', on: ['ガク'], kun: ['まな.ぶ'] },
      { id: 'v', type: 'v', unit: 1, ex: '学校', rd: 'がっこう', zh: '', req: [], ff: '' },
      { id: 'v2', type: 'v', unit: 1, ex: '一つ', rd: 'ひとつ;ひとつ(め)', zh: '', req: [], ff: '' },
    ] as const;
    for (const it of items) for (const w of [...inputs, 'gaku', 'manabu', 'gakkou', 'gakou', 'hitotsu', 'hitotu', 'hitoutsu']) {
      expect(R.isRight(it as never, w), `${it.id} ${w}`).toBe(mvpRomaji.isRight(it, w));
      expect(R.isNear(it as never, w), `${it.id} ${w}`).toBe(mvpRomaji.isNear(it, w));
    }
  });
});

describe('FSRS parity with MVP', () => {
  it('500 random review sequences', () => {
    for (let n = 0; n < 500; n++) {
      const target = [.85, .9, .95][n % 3], a: Card = {}, b: Card = {};
      let now = 1.7e12;
      for (let step = 0; step < 8; step++) {
        const good = Math.random() < .75;
        schedule(a, good, target, now); mvpSchedule(b, good, target, now);
        expect(a).toEqual(b);
        now += Math.random() * 30 * 864e5;
      }
    }
  });
});
