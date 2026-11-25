// FSRS-4.5（預設權重），與 MVP 公式相同（見 docs/LEARNING.md §3）。
// 之後若改用 ts-fsrs 套件，先以 test/fsrs.test.ts 做回歸比對。
export interface Card { s?: number; d?: number; due?: number; reps?: number; lapses?: number; last?: number; ok?: boolean }

export const DAY = 864e5;
export const W = [0.4872,1.4003,3.7145,13.8206,5.1618,1.2298,0.8975,0.031,1.6474,0.1367,1.0461,2.1072,0.0793,0.3246,1.587,0.2272,2.8755];
const DECAY = -0.5, FACTOR = 19/81;
const clampD = (d: number) => Math.min(10, Math.max(1, d));
const d0 = (g: number) => clampD(W[4] - (g - 3) * W[5]);
export const retr = (t: number, s: number) => Math.pow(1 + FACTOR * t / s, DECAY);
export const ivl = (s: number, r: number) => Math.max(1, Math.round(s / FACTOR * (Math.pow(r, 1 / DECAY) - 1)));

/** 依作答結果更新卡片（就地修改）。good=答對。target=目標記憶率。 */
export function schedule(card: Card, good: boolean, target: number, now = Date.now()): Card {
  const g = good ? 3 : 1;
  if (!card.reps) {
    card.s = W[g - 1]; card.d = d0(g);
  } else {
    const t = Math.max(0, (now - card.last!) / DAY), r = retr(t, card.s!);
    card.d = clampD(W[7] * d0(3) + (1 - W[7]) * (card.d! - W[6] * (g - 3)));
    card.s = good
      ? card.s! * (Math.exp(W[8]) * (11 - card.d) * Math.pow(card.s!, -W[9]) * (Math.exp(W[10] * (1 - r)) - 1) + 1)
      : W[11] * Math.pow(card.d, -W[12]) * (Math.pow(card.s! + 1, W[13]) - 1) * Math.exp(W[14] * (1 - r));
    if (!good) card.lapses = (card.lapses || 0) + 1;
  }
  card.reps = (card.reps || 0) + 1; card.last = now; card.ok = good;
  card.due = good ? now + ivl(card.s!, target) * DAY : now + 10 * 60e3;
  return card;
}
