import { speak } from '../lib/speech';

export function Ring({ pct, color, label }: { pct: number; color: string; label: string }) {
  return (
    <svg width="74" height="74" viewBox="0 0 74 74" role="img" aria-label={`${label} ${pct}%`}>
      <circle cx="37" cy="37" r="30" fill="none" stroke="var(--soft)" strokeWidth="7" />
      <circle cx="37" cy="37" r="30" fill="none" stroke={color} strokeWidth="7" strokeLinecap="round" strokeDasharray={`${(188.5 * pct / 100).toFixed(1)} 188.5`} transform="rotate(-90 37 37)" />
      <text x="37" y="42" textAnchor="middle" fontSize="15" fontWeight="700" fill="currentColor">{pct}%</text>
    </svg>
  );
}

export function SayButton({ text }: { text: string }) {
  return (
    <button className="x" data-say={text} aria-label="播放發音" onClick={() => speak(text)}>
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 9v6h4l5 4V5L8 9z" /><path d="M16 9a4 4 0 0 1 0 6" /></svg>
    </button>
  );
}

export function CloseIcon() {
  return <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 6l12 12M18 6L6 18" /></svg>;
}
