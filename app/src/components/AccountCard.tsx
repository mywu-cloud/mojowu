import { useState } from 'react';
import { account, logout, requestLink } from '../lib/account';

export function AccountCard() {
  const [email, setEmail] = useState('');
  const s = account.session;
  if (s) return (
    <section className="card"><h2>帳號</h2>
      <p className="sub" style={{ margin: '4px 0 10px' }}>已登入：<b style={{ color: 'var(--ink)' }}>{s.email}</b><br />雲端備份與跨裝置同步即將推出，目前進度仍只存在這台裝置。</p>
      <button className="ghost" data-act="logout" onClick={logout}>登出</button></section>
  );
  return (
    <section className="card"><h2>登入</h2>
      <p className="sub" style={{ margin: '4px 0 10px' }}>輸入 Email，我們會寄一封登入連結給你，不需要密碼。登入後即可使用即將推出的雲端備份與跨裝置同步。</p>
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
