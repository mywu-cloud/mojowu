// 羅馬字 → 平假名、答案正規化與比對。邏輯與 MVP public/index.html 相同（見 docs/LEARNING.md §4）。
import type { Item } from '../content/types';

export const KANA_ROWS: [string, string][] = [['あいうえお','a i u e o'],['かきくけこ','ka ki ku ke ko'],['さしすせそ','sa shi su se so'],['たちつてと','ta chi tsu te to'],['なにぬねの','na ni nu ne no'],['はひふへほ','ha hi fu he ho'],['まみむめも','ma mi mu me mo'],['や　ゆ　よ','ya - yu - yo'],['らりるれろ','ra ri ru re ro'],['わ　　　を','wa - - - wo'],['ん　　　　','n - - - -']];
export const ALT: Record<string, string[]> = {shi:['si'],chi:['ti'],tsu:['tu'],fu:['hu'],wo:['o']};
export const R2K: Record<string, string> = {a:'あ',i:'い',u:'う',e:'え',o:'お',ka:'か',ki:'き',ku:'く',ke:'け',ko:'こ',sa:'さ',shi:'し',si:'し',su:'す',se:'せ',so:'そ',ta:'た',chi:'ち',ti:'ち',tsu:'つ',tu:'つ',te:'て',to:'と',na:'な',ni:'に',nu:'ぬ',ne:'ね',no:'の',ha:'は',hi:'ひ',fu:'ふ',hu:'ふ',he:'へ',ho:'ほ',ma:'ま',mi:'み',mu:'む',me:'め',mo:'も',ya:'や',yu:'ゆ',yo:'よ',ra:'ら',ri:'り',ru:'る',re:'れ',ro:'ろ',wa:'わ',wo:'を',ga:'が',gi:'ぎ',gu:'ぐ',ge:'げ',go:'ご',za:'ざ',ji:'じ',zi:'じ',zu:'ず',ze:'ぜ',zo:'ぞ',da:'だ',di:'ぢ',du:'づ',de:'で',do:'ど',ba:'ば',bi:'び',bu:'ぶ',be:'べ',bo:'ぼ',pa:'ぱ',pi:'ぴ',pu:'ぷ',pe:'ぺ',po:'ぽ',kya:'きゃ',kyu:'きゅ',kyo:'きょ',sha:'しゃ',shu:'しゅ',sho:'しょ',sya:'しゃ',syu:'しゅ',syo:'しょ',cha:'ちゃ',chu:'ちゅ',cho:'ちょ',tya:'ちゃ',tyu:'ちゅ',tyo:'ちょ',nya:'にゃ',nyu:'にゅ',nyo:'にょ',hya:'ひゃ',hyu:'ひゅ',hyo:'ひょ',mya:'みゃ',myu:'みゅ',myo:'みょ',rya:'りゃ',ryu:'りゅ',ryo:'りょ',gya:'ぎゃ',gyu:'ぎゅ',gyo:'ぎょ',ja:'じゃ',ju:'じゅ',jo:'じょ',jya:'じゃ',jyu:'じゅ',jyo:'じょ',bya:'びゃ',byu:'びゅ',byo:'びょ',pya:'ぴゃ',pyu:'ぴゅ',pyo:'ぴょ',fa:'ふぁ',fi:'ふぃ',fe:'ふぇ',fo:'ふぉ',ti2:'てぃ',di2:'でぃ',xtu:'っ','-':'ー'};

export function toHira(input: string): string {
  const s = input.toLowerCase(); let out = '';
  for (let i = 0; i < s.length;) {
    const c = s[i];
    if (!/[a-z\-]/.test(c)) { out += c; i++; continue; }
    if (c === 'n' && s[i+1] === 'n') { out += 'ん'; i += /[aiueoy]/.test(s[i+2] || '') ? 1 : 2; continue; }
    if (c === 'n' && (i + 1 === s.length || !/[aiueoy]/.test(s[i+1]))) { out += 'ん'; i++; continue; }
    if (c === s[i+1] && /[bcdfghjkmpqrstvwxz]/.test(c)) { out += 'っ'; i++; continue; }
    let hit = false;
    for (const L of [3, 2, 1]) { const p = s.substr(i, L); if (R2K[p]) { out += R2K[p]; i += L; hit = true; break; } }
    if (!hit) { out += c; i++; }
  }
  return out;
}
export const kataToHira = (s: string) => s.replace(/[ァ-ヶ]/g, c => String.fromCharCode(c.charCodeAt(0) - 0x60));
export const hiraToKata = (s: string) => s.replace(/[ぁ-ゖ]/g, c => String.fromCharCode(c.charCodeAt(0) + 0x60));
export const norm = (s: string) => kataToHira(toHira(String(s).trim())).replace(/[\s～〜\.\-・]/g, '');

// 「差一點」：去掉促音 っ、長音 ー，並把長音母音（おう／おお／えい／ああ…）縮成一個
const VOW: Record<string, string> = Object.fromEntries([
  ...Object.entries(R2K).filter(([r, k]) => k.length === 1 && /[aiueo]$/.test(r)).map(([r, k]) => [k, r.at(-1)!]),
  ['ゃ','a'],['ゅ','u'],['ょ','o'],['ぁ','a'],['ぃ','i'],['ぅ','u'],['ぇ','e'],['ぉ','o'],
]);
export function loose(s: string): string {
  let out = '', pv = '';
  for (const c of s.replace(/[っー]/g, '')) {
    const v = VOW[c];
    if ('あいうえお'.includes(c) && pv && (v === pv || (pv === 'o' && v === 'u') || (pv === 'e' && v === 'i'))) continue;
    out += c; pv = v || '';
  }
  return out;
}

export function answersFor(it: Item): string[] {
  if (it.type === 'v') return it.rd.split(';').map(x => x.replace(/\(.*?\)|（.*?）/g, '').trim()).filter(Boolean);
  if (it.type === 'k') return [...it.on, ...it.kun.map(x => x.split('.')[0])].map(x => x.replace(/-/g, ''));
  return [];
}
export const isRight = (it: Item, typed: string) => { const t = norm(typed); return !!t && answersFor(it).some(a => norm(a) === t); };
export const isNear = (it: Item, typed: string) => { const t = loose(norm(typed)); return !!t && answersFor(it).some(a => loose(norm(a)) === t); };
export const isKanaRight = (r: string, typed: string) => [r, ...(ALT[r] || [])].includes(typed.trim().toLowerCase());
