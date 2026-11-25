// 畫面狀態（目前分頁、學習回合、作答結果、對話框）。
// 與 MVP 相同採「改完狀態 → bump() 重繪」模式；元件以 useUi() 訂閱。
import { useSyncExternalStore } from 'react';
import type { Item, QuizItem } from '../content/types';

export type View = 'home' | 'path' | 'review' | 'jlpt' | 'me' | 'kana' | 'about';
export const VIEWS: View[] = ['home', 'path', 'review', 'jlpt', 'me', 'kana', 'about'];

export interface TestQ { sec: 0 | 1; it: Item; q: string; prompt: string; right: string; opts: string[] }
export type Session =
  | { kind: 'lesson'; learn: Item[]; li: number; queue: QuizItem[]; first: Record<string, boolean>; done: number; total: number }
  | { kind: 'review'; queue: QuizItem[]; first: Record<string, boolean>; done: number; total: number }
  | { kind: 'kana'; queue: QuizItem[]; first: Record<string, boolean>; done: number; total: number; score: number }
  | { kind: 'test'; queue: TestQ[]; i: number; res: { q: TestQ; ok: boolean }[]; total: number };
export interface Answered { ok: boolean; typed: string; pick?: number }
export interface TestResult { sec: { name: string; n: number; got: number }[]; wrongs: { q: string; a: string }[] }
export type Modal = { kind: 'toast'; text: string } | { kind: 'confirm'; text: string; onOk: () => void } | { kind: 'restore' };

export const ui = {
  view: 'home' as View,
  session: null as Session | null,
  answered: null as Answered | null,
  nudge: null as { id: string; typed: string } | null,
  testRes: null as TestResult | null,
  modal: null as Modal | null,
  msg: '',               // 「我的」頁備份訊息
  step: 0,               // 每換一題 +1，用來重置輸入框
};

let ver = 0;
const subs = new Set<() => void>();
export function bump() { ver++; subs.forEach(f => f()); }
const subscribe = (f: () => void) => { subs.add(f); return () => { subs.delete(f); }; };
export function useUi() { useSyncExternalStore(subscribe, () => ver); return ui; }
