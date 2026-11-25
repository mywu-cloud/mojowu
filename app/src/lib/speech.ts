export function speak(text: string) {
  try { const u = new SpeechSynthesisUtterance(text); u.lang = 'ja-JP'; u.rate = .9; speechSynthesis.cancel(); speechSynthesis.speak(u); } catch { /* 裝置不支援 TTS */ }
}
