import { useState } from 'react';
import { ui, bump } from '../store/ui';
import { closeModal } from '../session/actions';
import { defaultState, replaceState } from '../store/state';
import { account, deleteAccount } from '../lib/account';

function RestoreBox() {
  const [text, setText] = useState(''), [bad, setBad] = useState(false);
  const restore = () => {
    try { const v = JSON.parse(text); if (!v.cards) throw 0; replaceState(Object.assign(defaultState(), v)); ui.modal = null; bump(); }
    catch { setBad(true); }
  };
  return <><label htmlFor="rs">貼上先前複製的進度</label>
    <textarea id="rs" value={text} onChange={e => { setText(e.target.value); setBad(false); }} style={{ width: '100%', height: 120, margin: '8px 0', borderRadius: 12, border: `1px solid ${bad ? 'var(--red)' : 'var(--line)'}`, background: 'var(--bg)', color: 'var(--ink)', font: '13px monospace', padding: 8 }} />
    <div className="row"><button className="ghost" data-act="close" onClick={closeModal}>取消</button><button className="primary" data-act="dorestore" onClick={restore}>還原</button></div></>;
}

const CONFIRM_WORD = '刪除';
function DeleteAccountBox() {
  const [text, setText] = useState(''), [busy, setBusy] = useState(false);
  const ok = text.trim() === CONFIRM_WORD;
  return <><h2 style={{ marginTop: 0 }}>刪除帳號</h2>
    <p style={{ margin: '0 0 8px' }}>將永久刪除 <b>{account.session?.email}</b> 的帳號，以及雲端上的所有學習紀錄（卡片進度、作答紀錄、每日統計）。<b>這個動作無法復原。</b></p>
    <p className="sub" style={{ margin: '0 0 10px' }}>這台裝置上的進度會保留，變回未登入狀態；其他已登入的裝置也會被登出。之後仍可用同一個 Email 重新註冊，但會是全新的帳號。</p>
    <label htmlFor="delc">請輸入「{CONFIRM_WORD}」確認</label>
    <input id="delc" value={text} onChange={e => setText(e.target.value)} autoComplete="off"
      style={{ width: '100%', height: 44, border: '1.5px solid var(--line)', borderRadius: 12, background: 'var(--bg)', color: 'var(--ink)', padding: '0 12px', font: 'inherit', margin: '6px 0 10px' }} />
    <div className="row"><button className="ghost" data-act="close" onClick={closeModal} disabled={busy}>取消</button>
      <button className="primary" data-act="dodelete" style={{ background: 'var(--red)', borderColor: 'var(--red)' }} disabled={!ok || busy}
        onClick={async () => { setBusy(true); await deleteAccount(); }}>{busy ? '刪除中…' : '永久刪除'}</button></div></>;
}

export function Modal() {
  const m = ui.modal;
  if (!m) return <div id="modal" />;
  let body: JSX.Element;
  if (m.kind === 'toast') {
    body = <><p style={{ marginTop: 0, whiteSpace: 'pre-line' }}>{m.text}</p><button className="indigo" data-act="close" onClick={closeModal}>知道了</button></>;
  } else if (m.kind === 'confirm') {
    body = <><p style={{ marginTop: 0 }}>{m.text}</p><div className="row"><button className="ghost" data-act="close" onClick={closeModal}>取消</button><button className="primary" data-act="ok" onClick={() => { m.onOk(); ui.modal = null; bump(); }}>確定</button></div></>;
  } else if (m.kind === 'deleteAccount') body = <DeleteAccountBox />;
  else body = <RestoreBox />;
  return <div id="modal"><div className="modal" role="dialog" aria-modal="true"><div className="card">{body}</div></div></div>;
}
