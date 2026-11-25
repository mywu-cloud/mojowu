// 驗證 App 課程資料（public/data/*.json）的格式與完整性。無依賴，CI 與本機都可跑。
// 用法：node scripts/validate_data.mjs [--baseline <舊版 n5.json>]
//   --baseline：檢查舊版的每個 ID 都還在（CLAUDE.md 規則 4：ID 不可刪除或改號）
import fs from 'fs';

const args = process.argv.slice(2);
const bi = args.indexOf('--baseline');
const baseline = bi >= 0 ? args[bi + 1] : null;
const FILE = new URL('../public/data/n5.json', import.meta.url);
const errs = [];
const fail = m => errs.push(m);
const isStr = x => typeof x === 'string';
const strArr = x => Array.isArray(x) && x.every(isStr);

const d = JSON.parse(fs.readFileSync(FILE, 'utf8'));
for (const key of ['u', 'k', 'v', 'g']) if (!Array.isArray(d[key])) fail(`缺少陣列 ${key}`);
if (errs.length) done();

const units = new Set();
d.u.forEach((u, i) => {
  if (!Array.isArray(u) || u.length !== 2 || !Number.isInteger(u[0]) || !isStr(u[1]) || !u[1]) fail(`u[${i}] 格式錯誤`);
  else if (units.has(u[0])) fail(`單元 ${u[0]} 重複`); else units.add(u[0]);
});
[...units].sort((a, b) => a - b).forEach((n, i) => { if (n !== i + 1) fail(`單元編號不連續：期望 ${i + 1}，得到 ${n}`); });

const ids = new Map();   // id -> type
const addId = (id, type, re, where) => {
  if (!isStr(id) || !re.test(id)) return fail(`${where} ID 格式錯誤：${id}`);
  if (ids.has(id)) return fail(`ID 重複：${id}`);
  ids.set(id, type);
};
const unitOk = (n, where) => { if (!units.has(n)) fail(`${where} 單元 ${n} 不存在`); };
const kana = /^[ぁ-ゖァ-ヺー]+$/;

d.k.forEach((k, i) => {
  const w = `k[${i}]`;
  if (!Array.isArray(k) || k.length !== 7) return fail(`${w} 應為 7 欄`);
  const [id, ch, unit, trad, zh, on, kun] = k;
  addId(id, 'k', /^(n\d-)?k\d{3}$/, w); unitOk(unit, `${w} ${id}`);
  if (!isStr(ch) || [...ch].length !== 1) fail(`${w} ${id} 漢字應為單一字元`);
  if (!isStr(trad) || !trad) fail(`${w} ${id} 缺繁體`);
  if (!isStr(zh) || !zh) fail(`${w} ${id} 缺繁中字義`);
  if (!strArr(on) || !strArr(kun)) fail(`${w} ${id} 音讀／訓讀應為字串陣列`);
  else {
    if (!on.length && !kun.length) fail(`${w} ${id} 沒有任何讀音`);
    on.forEach(r => { if (!/^[ァ-ヺー\-]+$/.test(r)) fail(`${w} ${id} 音讀應為片假名：${r}`); });
    kun.forEach(r => { if (!/^[ぁ-ゖー.\-]+$/.test(r)) fail(`${w} ${id} 訓讀應為平假名：${r}`); });
  }
});
d.v.forEach((v, i) => {
  const w = `v[${i}]`;
  if (!Array.isArray(v) || v.length !== 7) return fail(`${w} 應為 7 欄`);
  const [id, unit, ex, rd, zh, req, ff] = v;
  addId(id, 'v', /^(n\d-)?v\d{4}$/, w); unitOk(unit, `${w} ${id}`);
  if (!isStr(ex) || !ex) fail(`${w} ${id} 缺表記`);
  if (!isStr(rd) || !rd) fail(`${w} ${id} 缺讀音`);
  else rd.split(';').map(x => x.replace(/\(.*?\)|（.*?）/g, '').trim()).filter(Boolean)
    .forEach(r => { if (!kana.test(r.replace(/[\s～〜.・\-]/g, ''))) fail(`${w} ${id} 讀音含非假名：${r}`); });
  if (!isStr(zh) || !zh) fail(`${w} ${id} 缺繁中釋義`);
  if (!strArr(req)) fail(`${w} ${id} requires_kanji 應為字串陣列`);
  if (!isStr(ff)) fail(`${w} ${id} false_friend 應為字串`);
});
d.g.forEach((g, i) => {
  const w = `g[${i}]`;
  if (!Array.isArray(g) || g.length !== 6) return fail(`${w} 應為 6 欄`);
  const [id, unit, ...rest] = g;
  addId(id, 'g', /^(n\d-)?g\d{2,3}$/, w); unitOk(unit, `${w} ${id}`);
  if (!rest.every(x => isStr(x) && x)) fail(`${w} ${id} 句型／說明／例句不可為空`);
});

// 單字所需漢字必須存在、是漢字、且不晚於單字的單元（否則單字永遠解鎖不了）
const kUnit = Object.fromEntries(d.k.map(k => [k[0], k[2]]));
d.v.forEach(([id, unit, , , , req]) => (req || []).forEach(r => {
  if (ids.get(r) !== 'k') fail(`${id} 需要的漢字 ${r} 不存在`);
  else if (kUnit[r] > unit) fail(`${id}（單元 ${unit}）需要的漢字 ${r} 排在單元 ${kUnit[r]}，會永遠鎖住`);
}));
// 每個單元至少要有內容
for (const n of units) if (![...d.k, ...d.g].some(x => (x[0][0] === 'g' ? x[1] : x[2]) === n) && !d.v.some(x => x[1] === n)) fail(`單元 ${n} 沒有任何內容`);

if (baseline) {
  const old = JSON.parse(fs.readFileSync(baseline, 'utf8'));
  for (const key of ['k', 'v', 'g']) for (const row of old[key] || []) if (!ids.has(row[0])) fail(`ID ${row[0]} 在舊版存在但被刪除或改號（規則 4）`);
  // 同一 ID 的漢字本身不可被換掉
  const oldK = Object.fromEntries((old.k || []).map(k => [k[0], k[1]]));
  d.k.forEach(([id, ch]) => { if (oldK[id] && oldK[id] !== ch) fail(`ID ${id} 原本是「${oldK[id]}」，現在變成「${ch}」——ID 不可重用`); });
}
done();

function done() {
  if (errs.length) { console.error(`✗ 資料驗證失敗（${errs.length} 項）：\n` + errs.slice(0, 50).map(e => '  - ' + e).join('\n')); process.exit(1); }
  console.log(`✓ public/data/n5.json：${d.u.length} 單元、${d.k.length} 漢字、${d.v.length} 單字、${d.g.length} 文法${baseline ? '；ID 與基準版相容' : ''}`);
}
