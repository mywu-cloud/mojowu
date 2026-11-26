// 學習回合（新課／複習／假名／測驗）的動作。行為與 MVP 的 startX / grade / advance 相同。
import { C } from '../content/load';
import type { KanaQ, QuizItem, Item } from '../content/types';
import { schedule } from '../lib/fsrs';
import { NOW } from '../lib/date';
import { KANA_ROWS, hiraToKata, isRight, isNear, isKanaRight } from '../lib/romaji';
import { S, save, touchDay } from '../store/state';
import { currentUnit, dueList, nextNew } from '../store/progress';
import { ui, bump, type TestQ } from '../store/ui';
import { track } from '../lib/track';
import { recordReview, scheduleSync } from '../lib/sync';

const rnd = <T,>(a: T[]) => [...a].sort(() => Math.random() - .5);

export function toast(text: string) { ui.modal = { kind: 'toast', text }; bump(); }
export function closeModal() { ui.modal = null; bump(); }

export function startLesson(n?: number) {
  const items = nextNew(n ?? currentUnit());
  if (!items.length) { toast('這個單元目前沒有可學的新項目，先完成複習讓漢字解鎖單字。'); return; }
  ui.session = { kind: 'lesson', learn: items, li: 0, queue: [...items], first: {}, done: 0, total: items.length };
  bump();
}
export function startReview() {
  const due = dueList(); if (!due.length) return;
  ui.session = { kind: 'review', queue: due.slice(0, 30), first: {}, done: 0, total: Math.min(30, due.length) }; bump();
}
export function startKana() {
  const all = KANA_ROWS.flatMap(([k, r]) => [...k].map((c, i) => [c, r.split(' ')[i]] as const)).filter(([c, r]) => r !== '-' && c.trim());
  const pick: KanaQ[] = rnd(all).slice(0, 10).map(([c, r], i) => ({ type: 'kana', ch: i % 2 ? hiraToKata(c) : c, r }));
  ui.session = { kind: 'kana', queue: pick, first: {}, done: 0, total: 10, score: 0 }; bump();
}
export function startTest() {
  const { K, V, G } = C;
  const distract = <T,>(pool: T[], right: string, f: (x: T) => string) => [...new Set(rnd(pool).map(f).filter(x => x && x !== right))].slice(0, 3);
  const qs: TestQ[] = [];
  rnd(K).slice(0, 6).forEach(k => { const right = k.on[0] || k.kun[0]; qs.push({ sec: 0, it: k, q: k.ch, prompt: '選出正確的讀音', right, opts: rnd([right, ...distract(K, right, x => x.on[0] || x.kun[0])]) }); });
  rnd(V.filter(v => v.ex !== v.rd)).slice(0, 5).forEach(v => qs.push({ sec: 0, it: v, q: v.ex.split(';')[0], prompt: '選出意思', right: v.zh, opts: rnd([v.zh, ...distract(V, v.zh, x => x.zh)]) }));
  rnd(G).slice(0, 4).forEach(g => qs.push({ sec: 1, it: g, q: g.tr, prompt: '選出正確的日文', right: g.jp, opts: rnd([g.jp, ...distract(G, g.jp, x => x.jp)]) }));
  ui.testRes = null;
  ui.session = { kind: 'test', queue: qs, i: 0, res: [], total: qs.length }; bump();
}

export function nextLearn() { const s = ui.session; if (s?.kind === 'lesson') { s.li++; bump(); } }

function grade(ok: boolean, typed: string, pick?: number) {
  const s = ui.session; if (!s || s.kind === 'test') return;
  const it = s.queue[0];
  ui.answered = { ok, typed, pick };
  if (s.kind === 'kana') { if (ok) s.score++; bump(); return; }
  const item = it as Item;
  if (!(item.id in s.first)) {          // 只有第一次作答寫入 FSRS
    s.first[item.id] = ok;
    const c = schedule(S.cards[item.id] ??= {}, ok, S.target); save();
    recordReview(item.id, ok, s.kind === 'lesson' ? 'lesson' : 'review', c.last);
  }
  bump();
}

/** 打字題「確認答案」。長音／促音只差一點時先提示一次、不計分。 */
export function check(value: string) {
  const s = ui.session; if (!s || s.kind === 'test' || !value.trim()) return;
  const it = s.queue[0];
  if (it.type === 'kana') { grade(isKanaRight(it.r, value), value); return; }
  const ok = isRight(it, value);
  if (!ok && !(ui.nudge && ui.nudge.id === it.id) && isNear(it, value)) { ui.nudge = { id: it.id, typed: value }; bump(); return; }
  ui.nudge = null; grade(ok, value);
}
/** 文法選擇題 */
export function pickGrammar(i: number) {
  const s = ui.session; if (!s || s.kind === 'test') return;
  const it = s.queue[0]; if (it.type !== 'g') return;
  grade(it._opts![i] === it.jp, '', i);
}
export function advance() {
  const s = ui.session; if (!s || s.kind === 'test' || !ui.answered) return;
  const it = s.queue.shift() as QuizItem;
  if (s.kind !== 'kana' && !ui.answered.ok) s.queue.push(it); else s.done++;   // 答錯推回尾端，同回合答對才結束
  ui.answered = null; ui.nudge = null; ui.step++;
  if (!s.queue.length && s.kind !== 'kana') { touchDay(s.total); track(s.kind === 'lesson' ? 'lesson_done' : 'review_done', s.total); scheduleSync(); }
  if (!s.queue.length && s.kind === 'kana') { S.kana = Math.max(S.kana, s.score >= 8 ? 1 : 0); touchDay(1); track('kana_done', s.score); scheduleSync(); }
  bump();
}

export function pickTest(i: number) {
  const s = ui.session; if (s?.kind !== 'test' || ui.answered) return;
  const q = s.queue[s.i], ok = q.opts[i] === q.right;
  ui.answered = { ok, typed: '', pick: i }; s.res.push({ q, ok }); bump();
}
export function testNext() {
  const s = ui.session; if (s?.kind !== 'test') return;
  ui.answered = null;
  if (++s.i >= s.total) {
    const res = s.res, wrongs: { q: string; a: string }[] = [];
    res.filter(r => !r.ok).forEach(r => {               // 錯題變複習卡：新卡排入、舊卡立即到期
      const c = S.cards[r.q.it.id] ??= {};
      if (!c.reps) schedule(c, false, S.target); else c.due = NOW();
      recordReview(r.q.it.id, false, 'mock');
      wrongs.push({ q: r.q.q, a: r.q.right });
    });
    ui.testRes = {
      sec: [
        { name: '文字・語彙', n: res.filter(r => !r.q.sec).length, got: res.filter(r => !r.q.sec && r.ok).length },
        { name: '文法', n: res.filter(r => r.q.sec).length, got: res.filter(r => r.q.sec && r.ok).length },
      ], wrongs,
    };
    touchDay(1); track('test_done', res.filter(r => r.ok).length); scheduleSync(); ui.session = null; ui.view = 'jlpt';
  }
  bump();
}
export function quit() { ui.session = null; ui.answered = null; ui.nudge = null; bump(); }
export function go(v: typeof ui.view) { ui.view = v; bump(); }
