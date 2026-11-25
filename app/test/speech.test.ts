import { it, expect } from 'vitest';
import { speakable } from '../src/lib/speech';

it('speakable：整理讀音字串給 TTS', () => {
  expect(speakable('ひと.つ')).toBe('ひとつ');
  expect(speakable('-び')).toBe('び');
  expect(speakable('けっこん (する)')).toBe('けっこん');
  expect(speakable('あさって;みょうごにち')).toBe('あさって');
  expect(speakable('ニチ、ジツ')).toBe('ニチ');
  expect(speakable('私は学生です。')).toBe('私は学生です。');
});
