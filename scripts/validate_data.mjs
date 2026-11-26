// 驗證 App 課程資料（public/data/n5.json … n1.json）的格式與完整性。無依賴，CI 與本機都可跑。
// 用法：node scripts/validate_data.mjs [--level n4] [--baseline <舊版同級 json>]
//   不帶 --level：依序驗證所有存在的級數（N5→N1；高級單字可引用低級漢字 ID）
//   --baseline（需搭配 --level）：檢查舊版的每個 ID 都還在、漢字沒被換掉（CLAUDE.md 規則 4）
// ID：N5 為 k001 / v0001 / g01；其他級數加前綴 n4-k001 / n4-v0001 / n4-g01（N1 漢字可為 4 位數）。
import fs from 'fs';

const args = process.argv.slice(2);
const opt = k => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
const only = opt('--level'), baseline = opt('--baseline');
if (baseline && !only) { console.error('--baseline 需要搭配 --level'); process.exit(2); }
const LEVELS = ['n5', 'n4', 'n3', 'n2', 'n1'];
const file = l => new URL(`../public/data/${l}.json`, import.meta.url);
const errs = [];
const isStr = x => typeof x === 'string';
const strArr = x => Array.isArray(x) && x.every(isStr);
const kana = /^[ぁ-ゖァ-ヺー]+$/;
const knownK = new Map();   // 所有已驗證級數的漢字 ID → 單元（跨級只記 ID）
const summary = [];

for (const lv of LEVELS) {
  if (!fs.existsSync(file(lv))) continue;
  if (only && LEVELS.indexOf(lv) > LEVELS.indexOf(only)) break;
  const check = !only || lv === only;
  const d = JSON.parse(fs.readFileSync(file(lv), 'utf8'));
  const fail = m => { if (check) errs.push(`[${lv}] ${m}`); };
  const pre = lv === 'n5' ? '' : `${lv}-`;
  const idRe = { k: new RegExp(`^${pre}k\\d{3,4}$`), v: new RegExp(`^${pre}v\\d{4}$`), g: new RegExp(`^${pre}g\\d{2,3}$`) };
  for (const key of ['u', 'k', 'v', 'g']) if (!Array.isArray(d[key])) { fail(`缺少陣列 ${key}`); }
  if (!Array.isArray(d.u) || !Array.isArray(d.k) || !Array.isArray(d.v) || !Array.isArray(d.g)) continue;

  const units = new Set();
  d.u.forEach((u, i) => {
    if (!Array.isArray(u) || u.length !== 2 || !Number.isInteger(u[0]) || !isStr(u[1]) || !u[1]) fail(`u[${i}] 格式錯誤`);
    else if (units.has(u[0])) fail(`單元 ${u[0]} 重複`); else units.add(u[0]);
  });
  [...units].sort((a, b) => a - b).forEach((n, i) => { if (n !== i + 1) fail(`單元編號不連續：期望 ${i + 1}，得到 ${n}`); });

  const ids = new Map();
  const addId = (id, type, where) => {
    if (!isStr(id) || !idRe[type].test(id)) return fail(`${where} ID 格式錯誤：${id}`);
    if (ids.has(id) || knownK.has(id)) return fail(`ID 重複：${id}`);
    ids.set(id, type);
  };
  const unitOk = (n, where) => { if (!units.has(n)) fail(`${where} 單元 ${n} 不存在`); };

  d.k.forEach((k, i) => {
    const w = `k[${i}]`;
    if (!Array.isArray(k) || k.length !== 7) return fail(`${w} 應為 7 欄`);
    const [id, ch, unit, trad, zh, on, kun] = k;
    addId(id, 'k', w); unitOk(unit, `${w} ${id}`);
    if (!isStr(ch) || [...ch].length !== 1) fail(`${w} ${id} 漢字應為單一字元`);
    if (!isStr(trad) || !trad) fail(`${w} ${id} 缺繁體`);
    if (!isStr(zh) || !zh) fail(`${w} ${id} 缺繁中字義`);
    if (!strArr(on) || !strArr(kun)) return fail(`${w} ${id} 音讀／訓讀應為字串陣列`);
    if (!on.length && !kun.length) fail(`${w} ${id} 沒有任何讀音`);
    on.forEach(r => { if (!/^[ァ-ヺー\-]+$/.test(r)) fail(`${w} ${id} 音讀應為片假名：${r}`); });
    kun.forEach(r => { if (!/^[ぁ-ゖー.\-]+$/.test(r)) fail(`${w} ${id} 訓讀應為平假名：${r}`); });
  });
  const kUnit = Object.fromEntries(d.k.map(k => [k[0], k[2]]));
  d.v.forEach((v, i) => {
    const w = `v[${i}]`;
    if (!Array.isArray(v) || v.length !== 7) return fail(`${w} 應為 7 欄`);
    const [id, unit, ex, rd, zh, req, ff] = v;
    addId(id, 'v', w); unitOk(unit, `${w} ${id}`);
    if (!isStr(ex) || !ex) fail(`${w} ${id} 缺表記`);
    if (!isStr(rd) || !rd) fail(`${w} ${id} 缺讀音`);
    else rd.split(';').map(x => x.replace(/\(.*?\)|（.*?）/g, '').trim()).filter(Boolean)
      .forEach(r => { if (!kana.test(r.replace(/[\s～〜.・\-]/g, ''))) fail(`${w} ${id} 讀音含非假名：${r}`); });
    if (!isStr(zh) || !zh) fail(`${w} ${id} 缺繁中釋義`);
    if (!strArr(req)) fail(`${w} ${id} requires_kanji 應為字串陣列`);
    else req.forEach(r => {
      if (ids.get(r) === 'k') { if (kUnit[r] > unit) fail(`${id}（單元 ${unit}）需要的漢字 ${r} 排在單元 ${kUnit[r]}，會永遠鎖住`); }
      else if (!knownK.has(r)) fail(`${id} 需要的漢字 ${r} 不存在`);
    });
    if (!isStr(ff)) fail(`${w} ${id} false_friend 應為字串`);
  });
  d.g.forEach((g, i) => {
    const w = `g[${i}]`;
    if (!Array.isArray(g) || g.length !== 6) return fail(`${w} 應為 6 欄`);
    const [id, unit, ...rest] = g;
    addId(id, 'g', w); unitOk(unit, `${w} ${id}`);
    if (!rest.every(x => isStr(x) && x)) fail(`${w} ${id} 句型／說明／例句不可為空`);
  });
  for (const n of units) if (![...d.k.map(x => x[2]), ...d.v.map(x => x[1]), ...d.g.map(x => x[1])].includes(n)) fail(`單元 ${n} 沒有任何內容`);

  if (check && baseline) {
    const old = JSON.parse(fs.readFileSync(baseline, 'utf8'));
    for (const key of ['k', 'v', 'g']) for (const row of old[key] || []) if (!ids.has(row[0])) fail(`ID ${row[0]} 在舊版存在但被刪除或改號（規則 4）`);
    const oldK = Object.fromEntries((old.k || []).map(k => [k[0], k[1]]));
    d.k.forEach(([id, ch]) => { if (oldK[id] && oldK[id] !== ch) fail(`ID ${id} 原本是「${oldK[id]}」，現在變成「${ch}」——ID 不可重用`); });
  }
  d.k.forEach(k => knownK.set(k[0], k[2]));
  if (check) summary.push(`${lv.toUpperCase()}：${d.u.length} 單元、${d.k.length} 漢字、${d.v.length} 單字、${d.g.length} 文法`);
}

if (errs.length) { console.error(`✗ 資料驗證失敗（${errs.length} 項）：\n` + errs.slice(0, 50).map(e => '  - ' + e).join('\n')); process.exit(1); }
console.log(`✓ ${summary.join('；')}${baseline ? '；ID 與基準版相容' : ''}`);
