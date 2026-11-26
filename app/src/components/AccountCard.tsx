import { useState } from 'react';
import { account, logout, requestLink } from '../lib/account';
import { ui, bump } from '../store/ui';
import { sync, runSync } from '../lib/sync';

function ago(t: number) {
  if (!t) return '尚未同步';
  const m = Math.round((Date.now() - t) / 60e3);
  return m < 1 ? '剛剛同步' : m < 60 ? `${m} 分鐘前同步` : m < 1440 ? `${Math.round(m / 60)} 小時前同步` : `${Math.round(m / 1440)} 天前同步`;
}

export function AccountCard() {
  const [email, setEmail] = useState('');
  const s = account.session;
  if (s) return (
    <section className="card"><h2>帳號</h2>
      <p className="sub" style={{ margin: '4px 0 6px' }}>已登入：<b style={{ color: 'var(--ink)' }}>{s.email}</b></p>
      <p className="note" role="status" style={{ margin: '0 0 10px', color: sync.state === 'error' ? 'var(--redink)' : undefined }}>
        {sync.state === 'syncing' ? '同步中…' : sync.state === 'offline' ? '目前離線，連上網路後會自動同步。' : sync.state === 'error' ? '同步失敗，稍後會再試。' : `已備份到雲端・${ago(sync.at)}`}</p>
      <p className="sub" style={{ margin: '0 0 10px' }}>學習進度會自動備份，在其他裝置用同一個 Email 登入就能接著學。</p>
      <div className="row wrap"><button className="ghost" data-act="sync" disabled={sync.state === 'syncing'} onClick={() => runSync()}>立即同步</button>
        <button className="ghost" data-act="logout" onClick={logout}>登出</button></div>
      <div className="row wrap" style={{ marginTop: 12 }}>
        <a className="btn ghost" href="/privacy.html" target="_blank" rel="noopener" style={{ minHeight: 44 }}>隱私權政策</a>
        <button className="ghost" data-act="delete-account" style={{ minHeight: 44, borderColor: 'var(--red)', color: 'var(--red)' }}
          onClick={() => { ui.modal = { kind: 'deleteAccount' }; bump(); }}>刪除帳號</button></div></section>
  );
  return (
    <section className="card"><h2>登入</h2>
      <p className="sub" style={{ margin: '4px 0 10px' }}>輸入 Email，我們會寄一封登入連結給你，不需要密碼。登入後學習進度會自動備份到雲端，換手機也能接著學。詳見<a href="/privacy.html" target="_blank" rel="noopener" style={{ color: 'var(--blue)' }}>隱私權政策</a>。</p>
      {account.sentTo
        ? <div className="fb ok" role="status">登入信已寄到 <b>{account.sentTo}</b>，請在 15 分鐘內打開信裡的連結。沒收到的話看看垃圾郵件匣。<div style={{ marginTop: 8 }}><button className="ghost" onClick={() => { account.sentTo = ''; setEmail(''); }}>改用其他 Email</button></div></div>
        : <form onSubmit={e => { e.preventDefault(); if (email.trim()) requestLink(email); }}>
            <label htmlFor="em">Email</label>
            <input type="email" id="em" autoComplete="email" inputMode="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com"
              style={{ width: '100%', height: 48, border: '1.5px solid var(--line)', borderRadius: 14, background: 'var(--card)', color: 'var(--ink)', padding: '0 14px', font: 'inherit', margin: '6px 0 10px' }} />
            {account.error && <p className="note" role="alert" style={{ color: 'var(--redink)', margin: '0 0 8px' }}>{account.error}</p>}
            <button className="primary" type="submit" data-act="login" disabled={account.sending || !email.trim()}>{account.sending ? '寄送中…' : '寄送登入連結'}</button>
          </form>}
    </section>
  );
}
