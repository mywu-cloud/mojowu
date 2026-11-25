// 學習進度 S。localStorage key 與欄位和 MVP 完全相同（mojowu-v1），封測者的進度可直接沿用。
// 不要改 key 或欄位意義而不寫遷移（CLAUDE.md 規則 3）。IndexedDB 遷移見 ROADMAP B3。
import type { Card } from '../lib/fsrs';
import { today, yesterday } from '../lib/date';

export interface State {
  cards: Record<string, Card>;   // 卡片存在＝已學過
  target: number;                // 目標記憶率 0.85 | 0.9 | 0.95
  streak: number;
  lastDay: string;               // YYYY-MM-DD
  log: Record<string, number>;   // 每日作答次數
  kana: number;                  // 1 = 假名練習曾答對 ≥ 8/10
}
export const KEY = 'mojowu-v1';
export const defaultState = (): State => ({ cards: {}, target: 0.9, streak: 0, lastDay: '', log: {}, kana: 0 });

function read(): State {
  const S = defaultState();
  try { const v = JSON.parse(localStorage.getItem(KEY) || 'null'); if (v && v.cards) Object.assign(S, v); } catch { /* 壞資料就用預設 */ }
  return S;
}
export let S: State = read();
export const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch { /* 無痕模式等 */ } };
export function replaceState(v: State) { S = v; save(); }
export function reloadState() { S = read(); }

/** 記一次學習：更新連續天數與當日次數 */
export function touchDay(n = 1) {
  const t = today();
  if (S.lastDay !== t) { S.streak = S.lastDay === yesterday() ? S.streak + 1 : 1; S.lastDay = t; }
  S.log[t] = (S.log[t] || 0) + n; save();
}
/** 畫面上顯示的連續天數（昨天之前斷掉就是 0） */
export const shownStreak = () => (S.lastDay === today() || S.lastDay === yesterday() ? S.streak : 0);
