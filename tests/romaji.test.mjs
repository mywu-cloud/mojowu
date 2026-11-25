// Unit test for the romaji→kana converter and answer normalisation in public/index.html.
// Usage: node tests/romaji.test.mjs   (exit code 1 on failure)
import fs from 'fs';
const html = fs.readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');
const js = html.slice(html.indexOf('const R2K'), html.indexOf('const isRight'));
const { toHira, norm } = new Function(js + '; return {toHira, norm};')();
const cases = [['kyou','きょう'],['gakkou','がっこう'],['konnichiha','こんにちは'],['shinbun','しんぶん'],
  ['denwa','でんわ'],['onna','おんな'],['kippu','きっぷ'],['benkyou','べんきょう'],['erebe-ta-','えれべーたー'],['konnnichiha','こんにちは']];
let fail = 0;
for (const [i, o] of cases) { const got = toHira(i); if (got !== o) { fail++; console.log('FAIL', i, got, '!=', o); } }
if (norm('エレベーター') !== norm('erebe-ta-')) { fail++; console.log('FAIL katakana norm'); }
if (norm('～えん') !== norm('en')) { fail++; console.log('FAIL tilde norm'); }
console.log(fail ? `${fail} failed` : `all ${cases.length + 2} passed`);
process.exit(fail ? 1 : 0);
