import { useState } from 'react';
import { ui, bump } from '../store/ui';
import { closeModal } from '../session/actions';
import { defaultState, replaceState } from '../store/state';

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

export function Modal() {
  const m = ui.modal;
  if (!m) return <div id="modal" />;
  let body: JSX.Element;
  if (m.kind === 'toast') {
    body = <><p style={{ marginTop: 0 }}>{m.text}</p><button className="indigo" data-act="close" onClick={closeModal}>知道了</button></>;
  } else if (m.kind === 'confirm') {
    body = <><p style={{ marginTop: 0 }}>{m.text}</p><div className="row"><button className="ghost" data-act="close" onClick={closeModal}>取消</button><button className="primary" data-act="ok" onClick={() => { m.onOk(); ui.modal = null; bump(); }}>確定</button></div></>;
  } else body = <RestoreBox />;
  return <div id="modal"><div className="modal" role="dialog" aria-modal="true"><div className="card">{body}</div></div></div>;
}
