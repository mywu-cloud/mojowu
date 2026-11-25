import { useEffect } from 'react';
import { ui, useUi, VIEWS, bump, type View } from './store/ui';
import { Nav } from './components/Nav';
import { Modal } from './components/Modal';
import { Home } from './screens/Home';
import { Path } from './screens/Path';
import { Review } from './screens/Review';
import { Jlpt } from './screens/Jlpt';
import { Me } from './screens/Me';
import { Kana } from './screens/Kana';
import { About } from './screens/About';
import { SessionView } from './session/Session';
import { advance } from './session/actions';

const SCREENS: Record<View, () => JSX.Element> = { home: Home, path: Path, review: Review, jlpt: Jlpt, me: Me, kana: Kana, about: About };

/** hash 路由：#home #path #review #jlpt #me #kana #about。學習回合不進 hash。 */
function route() {
  const h = location.hash.slice(1) as View;
  if (VIEWS.includes(h)) { ui.view = h; ui.session = null; ui.answered = null; ui.nudge = null; }
  bump();
}

export function App() {
  const { view, session } = useUi();
  useEffect(() => { route(); window.addEventListener('hashchange', route); return () => window.removeEventListener('hashchange', route); }, []);
  // 已作答時按 Enter＝繼續（與 MVP 相同；焦點在按鈕上時交給瀏覽器原生行為）
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const s = ui.session;
      if (e.key !== 'Enter' || !ui.answered || !s || s.kind === 'test') return;
      const it = s.queue[0]; if (!it || it.type === 'g') return;
      const n = document.querySelector<HTMLButtonElement>('[data-act=next]');
      if (n && document.activeElement !== n && document.activeElement?.id !== 'ans') { e.preventDefault(); advance(); }
    };
    document.addEventListener('keydown', onKey); return () => document.removeEventListener('keydown', onKey);
  }, []);
  useEffect(() => { window.scrollTo(0, 0); }, [view, !!session]);
  const Screen = SCREENS[view] || Home;
  return <>
    <div className="app">
      <main id="main" aria-live="polite">{session ? <SessionView s={session} /> : <Screen />}</main>
      <Nav view={view} hidden={!!session} />
    </div>
    <Modal />
  </>;
}
