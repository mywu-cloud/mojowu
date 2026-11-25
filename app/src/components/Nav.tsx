import type { View } from '../store/ui';

const TABS: { v: View; label: string; icon: JSX.Element }[] = [
  { v: 'home', label: '首頁', icon: <path d="M3 11l9-7 9 7v9H3z" /> },
  { v: 'path', label: '路徑', icon: <><circle cx="6" cy="18" r="2" /><circle cx="18" cy="6" r="2" /><path d="M8 18h6a4 4 0 0 0 0-8h-4a4 4 0 0 1 0-8h6" /></> },
  { v: 'review', label: '複習', icon: <><rect x="4" y="5" width="14" height="16" rx="2" /><path d="M8 3h12v14" /></> },
  { v: 'jlpt', label: 'JLPT', icon: <><path d="M5 3h14v18H5z" /><path d="M9 8h6M9 12h6M9 16h3" /></> },
  { v: 'me', label: '我的', icon: <><circle cx="12" cy="8" r="4" /><path d="M4 21c1-4 4-6 8-6s7 2 8 6" /></> },
];

export function Nav({ view, hidden }: { view: View; hidden: boolean }) {
  const tab = view === 'about' ? 'me' : view;
  return (
    <nav aria-label="主選單" id="nav" style={hidden ? { display: 'none' } : undefined}>
      {TABS.map(t => (
        <a key={t.v} href={`#${t.v}`} data-v={t.v} aria-current={t.v === tab ? 'page' : undefined}>
          <svg viewBox="0 0 24 24">{t.icon}</svg>{t.label}
        </a>
      ))}
    </nav>
  );
}
