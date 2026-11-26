import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import { loadContent } from './content/load';
import { initState } from './store/state';
import { trackOpen } from './lib/track';
import { handleLoginLink } from './lib/account';
import { startAutoSync } from './lib/sync';
import { App } from './App';

const root = createRoot(document.getElementById('root')!);
Promise.all([loadContent(), initState()]).then(
  () => { root.render(<StrictMode><App /></StrictMode>); trackOpen(); handleLoginLink().then(linked => { if (!linked) startAutoSync(); }); },
  () => root.render(<div className="app"><main id="main"><h1>mojowu</h1><p>課程資料載入失敗，請檢查網路後重新整理。</p></main></div>),
);
if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
