// 學習回合規則（docs/ARCHITECTURE.md §1「學習回合」）：只有第一次作答寫入 FSRS、答錯推回尾端、差一點只提示一次。
import { describe, it, expect, beforeEach } from 'vitest';
import { setContent, expand } from '../src/content/load';
import { S, replaceState, defaultState } from '../src/store/state';
import { ui } from '../src/store/ui';
import { startLesson, nextLearn, check, advance, quit, startKana } from '../src/session/actions';
import type { RawData } from '../src/content/types';

const raw: RawData = {
  u: [[1, 'A']],
  k: [['k1', '一', 1, '一', '一', ['イチ'], []]],
  v: [['v1', 1, '学校', 'がっこう', '學校', [], '']],
  g: [],
};
beforeEach(() => { setContent(expand(raw)); replaceState(defaultState()); quit(); ui.modal = null; });
const lessonToQuiz = () => { startLesson(1); nextLearn(); nextLearn(); };
const cur = () => (ui.session as { queue: { id?: string }[] }).queue[0];

describe('新課', () => {
  it('看完新卡才進測驗', () => {
    startLesson(1);
    expect(ui.session?.kind).toBe('lesson');
    lessonToQuiz();
    expect(cur().id).toBe('k1');
  });
  it('答錯：寫入 FSRS（ok=false）、推回尾端；之後答對不再改 FSRS', () => {
    lessonToQuiz();
    check('zzz'); expect(ui.answered?.ok).toBe(false); expect(S.cards.k1.ok).toBe(false); expect(S.cards.k1.reps).toBe(1);
    advance(); expect(cur().id).toBe('v1');
    check('gakkou'); advance();
    expect(cur().id).toBe('k1');
    check('ichi'); expect(ui.answered?.ok).toBe(true);
    expect(S.cards.k1.reps).toBe(1); expect(S.cards.k1.ok).toBe(false);
    advance();
    expect(ui.session && 'done' in ui.session && ui.session.done).toBe(2);
    expect(ui.session && ui.session.queue.length).toBe(0);
  });
  it('完成回合會記一次學習天', () => {
    lessonToQuiz(); check('ichi'); advance(); check('gakkou'); advance();
    expect(S.streak).toBe(1); expect(Object.values(S.log)[0]).toBe(2);
  });
  it('沒有新項目時跳提示、不開回合', () => {
    S.cards.k1 = { ok: true, reps: 1, due: Date.now() + 1e9 }; S.cards.v1 = { ok: true, reps: 1, due: Date.now() + 1e9 };
    startLesson(1);
    expect(ui.session).toBeNull(); expect(ui.modal?.kind).toBe('toast');
  });
});

describe('差一點', () => {
  it('第一次只差長音 → 提示、不計分；第二次照常計分', () => {
    lessonToQuiz(); check('ichi'); advance();
    check('gakou');
    expect(ui.nudge).toEqual({ id: 'v1', typed: 'gakou' }); expect(ui.answered).toBeNull(); expect(S.cards.v1).toBeUndefined();
    check('gakou');
    expect(ui.answered?.ok).toBe(false); expect(S.cards.v1.ok).toBe(false); expect(ui.nudge).toBeNull();
  });
  it('提示後打對 → 算答對', () => {
    lessonToQuiz(); check('ichi'); advance();
    check('gakou'); check('gakkou');
    expect(ui.answered?.ok).toBe(true); expect(S.cards.v1.ok).toBe(true);
  });
  it('空白輸入不做任何事', () => { lessonToQuiz(); check('  '); expect(ui.answered).toBeNull(); expect(ui.nudge).toBeNull(); });
});

describe('五十音', () => {
  it('10 題、答錯不推回、8 題以上才算通過', () => {
    startKana();
    const s = ui.session!; expect(s.queue).toHaveLength(10);
    for (let i = 0; i < 10; i++) { const q = s.queue[0] as { r: string }; check(i < 8 ? q.r : 'zz'); advance(); }
    expect(s.queue).toHaveLength(0); expect(S.kana).toBe(1);
  });
});
