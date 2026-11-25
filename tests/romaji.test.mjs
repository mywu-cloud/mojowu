// Unit test for the romaji→kana converter and answer normalisation in public/index.html.
// Usage: node tests/romaji.test.mjs   (exit code 1 on failure)
import fs from 'fs';
const html = fs.readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');
const js = html.slice(html.indexOf('const R2K'), html.indexOf('const isRight'));
const { toHira, norm, loose } = new Function(js + '; return {toHira, norm, loose};')();
const cases = [['kyou','きょう'],['gakkou','がっこう'],['konnichiha','こんにちは'],['shinbun','しんぶん'],
  ['denwa','でんわ'],['onna','おんな'],['kippu','きっぷ'],['benkyou','べんきょう'],['erebe-ta-','えれべーたー'],['konnnichiha','こんにちは']];
let fail = 0;
for (const [i, o] of cases) { const got = toHira(i); if (got !== o) { fail++; console.log('FAIL', i, got, '!=', o); } }
if (norm('エレベーター') !== norm('erebe-ta-')) { fail++; console.log('FAIL katakana norm'); }
if (norm('～えん') !== norm('en')) { fail++; console.log('FAIL tilde norm'); }
// 「差一點」：只差長音／促音 → loose 相同；真的不同 → loose 不同
const near = [['がっこう','gakou'],['きって','kite'],['とけい','toke'],['おとうさん','otosan'],['おおきい','okii'],['コーヒー','kohi'],['せんせい','sense'],['ちょっと','choto']];
const far = [['がっこう','gakkai'],['いえ','ii'],['とけい','tokai'],['おばさん','obaasan_x']];
for (const [a, t] of near) if (loose(norm(a)) !== loose(norm(t))) { fail++; console.log('FAIL near', a, t, loose(norm(a)), loose(norm(t))); }
for (const [a, t] of far) if (loose(norm(a)) === loose(norm(t))) { fail++; console.log('FAIL far', a, t); }
console.log(fail ? `${fail} failed` : `all ${cases.length + 2 + near.length + far.length} passed`);
process.exit(fail ? 1 : 0);
