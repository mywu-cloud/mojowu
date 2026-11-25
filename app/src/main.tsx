import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import { loadContent } from './content/load';
import { App } from './App';

const root = createRoot(document.getElementById('root')!);
loadContent().then(
  () => root.render(<StrictMode><App /></StrictMode>),
  () => root.render(<div className="app"><main id="main"><h1>mojowu</h1><p>課程資料載入失敗，請檢查網路後重新整理。</p></main></div>),
);
if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
