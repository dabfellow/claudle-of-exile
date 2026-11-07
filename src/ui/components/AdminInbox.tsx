import { useEffect, useState } from 'react';
import { game, useGame } from '../../game';
import { isCloudAccount } from '../../platform/accounts';
import { markAdminMail } from '../../platform/admin';
import { errorText } from '../../platform/feedback';

export function AdminInbox() {
  useGame();
  const rows = game.adminMail;
  const [error, setError] = useState('');
  useEffect(() => {
    if (!isCloudAccount(game.account) || game.sandbox) return;
    void game.refreshAdminMail();
  }, []);
  if (game.sandbox || !isCloudAccount(game.account) || !rows.length) return null;
  return <div className="card"><div className="card-title">Messages from the developer</div>
    {rows.map((mail) => <details key={mail.id} open={!mail.read_at} className="admin-mail"><summary>{mail.read_at ? '' : 'New · '}{new Date(mail.created_at).toLocaleString()} · {mail.realm}</summary>
      <p style={{ whiteSpace: 'pre-wrap' }}>{mail.message}</p>
      {mail.compensation && <p className="dim small">Compensation was sent to realm {mail.realm}. Open a character in that realm to collect it.</p>}
      {mail.compensation && mail.realm === game.realm.realm && <button className="btn sm" onClick={() => void game.collectAdminCompensation().catch((e) => setError(errorText(e)))}>Collect compensation</button>}
      {!mail.read_at && <button className="btn sm ghost" onClick={() => void markAdminMail(mail.id).then(() => game.refreshAdminMail(), (e) => setError(errorText(e)))}>Mark read</button>}
    </details>)}
    {error && <p className="warn">{error}</p>}
  </div>;
}

export function AdminMailNotice({ open }: { open: () => void }) {
  useGame();
  const unread = game.sandbox ? 0 : game.adminMail.filter((mail) => !mail.read_at).length;
  if (!unread) return null;
  return <div className="card guest-banner"><span>{unread} unread {unread === 1 ? 'reply' : 'replies'} from the developer</span><button className="btn sm" onClick={open}>Read in Settings</button></div>;
}
