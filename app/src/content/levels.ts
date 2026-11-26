// JLPT 級數。新增一級的內容時：把它加進 AVAILABLE，並放好 public/data/<level>.json。
export type Level = 'n5' | 'n4' | 'n3' | 'n2' | 'n1';
export const LEVELS: Level[] = ['n5', 'n4', 'n3', 'n2', 'n1'];
export const AVAILABLE: Level[] = ['n5', 'n4', 'n3'];
export const label = (l: Level) => l.toUpperCase();

/** 正式 JLPT 合格條件（日本語能力試驗官方公布；總分 180） */
export const PASS: Record<Level, { total: number; sections: string }> = {
  n5: { total: 80, sections: '「語言知識・讀解」120 分中需 38 分，「聽解」60 分中需 19 分' },
  n4: { total: 90, sections: '「語言知識・讀解」120 分中需 38 分，「聽解」60 分中需 19 分' },
  n3: { total: 95, sections: '「語言知識」「讀解」「聽解」各 60 分，每項需 19 分' },
  n2: { total: 90, sections: '「語言知識」「讀解」「聽解」各 60 分，每項需 19 分' },
  n1: { total: 100, sections: '「語言知識」「讀解」「聽解」各 60 分，每項需 19 分' },
};

const KEY = 'mojowu-level';
export function storedLevel(): Level {
  try { const l = localStorage.getItem(KEY) as Level | null; if (l && AVAILABLE.includes(l)) return l; } catch { /* 無痕模式 */ }
  return 'n5';
}
export function storeLevel(l: Level) { try { localStorage.setItem(KEY, l); } catch { /* 無痕模式 */ } }
