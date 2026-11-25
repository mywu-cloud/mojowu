import { describe, it, expect } from 'vitest';
import { toHira, norm, loose } from '../src/lib/romaji';

describe('toHira', () => {
  it.each([['kyou','きょう'],['gakkou','がっこう'],['konnichiha','こんにちは'],['shinbun','しんぶん'],['denwa','でんわ'],
    ['onna','おんな'],['kippu','きっぷ'],['benkyou','べんきょう'],['erebe-ta-','えれべーたー'],['konnnichiha','こんにちは']])('%s → %s', (i, o) => {
    expect(toHira(i)).toBe(o);
  });
});

describe('norm', () => {
  it('片假名與羅馬字相等', () => expect(norm('エレベーター')).toBe(norm('erebe-ta-')));
  it('去掉波浪號', () => expect(norm('～えん')).toBe(norm('en')));
});

describe('loose（差一點）', () => {
  it.each([['がっこう','gakou'],['きって','kite'],['とけい','toke'],['おとうさん','otosan'],['おおきい','okii'],['コーヒー','kohi'],['せんせい','sense'],['ちょっと','choto']])('%s ≈ %s', (a, t) => {
    expect(loose(norm(a))).toBe(loose(norm(t)));
  });
  it.each([['がっこう','gakkai'],['いえ','ii'],['とけい','tokai']])('%s ≠ %s', (a, t) => {
    expect(loose(norm(a))).not.toBe(loose(norm(t)));
  });
});
