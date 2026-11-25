// FSRS-4.5 回歸測試：鎖住現行公式的輸出。改排程前先想清楚——封測者的卡片間隔會跟著變。
import { describe, it, expect } from 'vitest';
import { schedule, retr, ivl, W, DAY, type Card } from '../src/lib/fsrs';

const T0 = 1.7e12;

describe('公式', () => {
  it('R(0)=1、R(S)=0.9（穩定度定義）', () => {
    expect(retr(0, 5)).toBe(1);
    expect(retr(5, 5)).toBeCloseTo(0.9, 10);
  });
  it('目標 90% 時間隔≈穩定度', () => {
    for (const s of [1, 3.7145, 10, 100]) expect(ivl(s, 0.9)).toBe(Math.max(1, Math.round(s)));
  });
  it('目標記憶率越高，間隔越短', () => {
    expect(ivl(20, 0.95)).toBeLessThan(ivl(20, 0.9));
    expect(ivl(20, 0.9)).toBeLessThan(ivl(20, 0.85));
  });
  it('間隔至少 1 天', () => expect(ivl(0.1, 0.95)).toBe(1));
});

describe('新卡', () => {
  it('答對：S=w2、D=w4、4 天後到期', () => {
    const c = schedule({}, true, 0.9, T0);
    expect(c).toEqual({ s: W[2], d: W[4], reps: 1, last: T0, ok: true, due: T0 + 4 * DAY });
  });
  it('答錯：S=w0、D=w4+2·w5、10 分鐘後到期、不算 lapse', () => {
    const c = schedule({}, false, 0.9, T0);
    expect(c.s).toBe(W[0]);
    expect(c.d).toBeCloseTo(W[4] + 2 * W[5], 10);
    expect(c.due).toBe(T0 + 10 * 60e3);
    expect(c.lapses).toBeUndefined();
  });
});

describe('複習序列（回歸）', () => {
  it('對→對→錯→對→對', () => {
    const c: Card = {}; let now = T0;
    const steps = [[true, 4], [true, 10], [false, 30], [true, 0.01], [true, 3]] as const;
    const expected = [
      { s: 3.7145, d: 5.1618, days: 4 },
      { s: 14.808100506496405, d: 5.1618, days: 15 },
      { s: 2.9335001540968637, d: 6.901155, days: 10 / 1440 },
      { s: 36.46189708188972, d: 6.847234995, days: 36 },
      { s: 36.478284813288816, d: 6.794986510155, days: 36 },
    ];
    steps.forEach(([good, gap], i) => {
      schedule(c, good, 0.9, now);
      expect(c.s).toBeCloseTo(expected[i].s, 9);
      expect(c.d).toBeCloseTo(expected[i].d, 9);
      expect((c.due! - now) / DAY).toBeCloseTo(expected[i].days, 9);
      expect(c.reps).toBe(i + 1);
      now += gap * DAY;
    });
    expect(c.lapses).toBe(1);
  });
  it('難度維持在 1–10', () => {
    const c: Card = {}; let now = T0;
    for (let i = 0; i < 40; i++) { schedule(c, false, 0.9, now); now += DAY; expect(c.d).toBeLessThanOrEqual(10); }
    for (let i = 0; i < 40; i++) { schedule(c, true, 0.9, now); now += c.due! - now; expect(c.d).toBeGreaterThanOrEqual(1); }
  });
  it('準時答對時穩定度只增不減', () => {
    const c: Card = {}; let now = T0;
    schedule(c, true, 0.9, now);
    for (let i = 0; i < 10; i++) { const s = c.s!; now = c.due!; schedule(c, true, 0.9, now); expect(c.s!).toBeGreaterThan(s); }
  });
});
