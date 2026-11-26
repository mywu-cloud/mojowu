// 課程內容型別。對應 public/data/n5.json 的精簡陣列格式（見 docs/DATA.md）。
export interface Unit { n: number; t: string }
export interface Kanji { id: string; type: 'k'; unit: number; ch: string; trad: string; zh: string; on: string[]; kun: string[] }
export interface Vocab { id: string; type: 'v'; unit: number; ex: string; rd: string; zh: string; req: string[]; ff: string }
export interface Grammar { id: string; type: 'g'; unit: number; pat: string; zh: string; jp: string; tr: string; _opts?: string[] }
export type Item = Kanji | Vocab | Grammar;
/** 五十音練習題（不存成卡片，沒有 id） */
export interface KanaQ { type: 'kana'; ch: string; r: string; id?: undefined }
export type QuizItem = Item | KanaQ;

export type RawData = {
  u: [number, string][];
  k: [string, string, number, string, string, string[], string[]][];
  v: [string, number, string, string, string, string[], string][];
  g: [string, number, string, string, string, string][];
};
import type { Level } from './levels';
export interface Content { level: Level; UNITS: Unit[]; ITEMS: Record<string, Item>; K: Kanji[]; V: Vocab[]; G: Grammar[] }
