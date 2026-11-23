import { useEffect, useRef, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { game } from '../../game';
import { errorText, FEEDBACK_MAX, feedbackContext, sendFeedback, type FeedbackContext, type FeedbackKind } from '../../platform/feedback';
import { cloudConfigured } from '../../platform/supabase';
import { GameIcon } from './common';
import './report.css';

const KINDS: { id: FeedbackKind; label: string }[] = [
  { id: 'bug', label: 'Bug report' },
  { id: 'idea', label: 'Idea' },
  { id: 'other', label: 'Something else' },
];

/** Lives in the sidebar so exploring the game never unmounts the draft. */
export function ReportButton({ page }: { page: string }) {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<FeedbackKind>('bug');
  const [message, setMessage] = useState('');
  const [context, setContext] = useState<FeedbackContext | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const opener = useRef<HTMLButtonElement>(null);
  const body = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) body.current?.focus({ preventScroll: true });
  }, [open]);

  if (!cloudConfigured()) return null;

  const show = () => {
    if (!message.trim() && !busy) {
      setContext(feedbackContext(game.state, page, game.combatLog.map((line) => line.text)));
    }
    setOpen(true);
  };
  const close = () => {
    setOpen(false);
    if (document.activeElement?.closest('#report-popup')) {
      opener.current?.focus({ preventScroll: true });
    }
  };
  const send = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy || !message.trim() || !context) return;
    setBusy(true);
    setError('');
    try {
      await sendFeedback(kind, message, context);
      setMessage('');
      close();
      game.pushToast('Thanks! Your report was sent.', 'good');
    } catch (err) {
      setError(errorText(err, 'Could not send your report. Try again.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button ref={opener} className="nav-item" type="button" aria-haspopup="dialog" aria-expanded={open}
        aria-controls={open ? 'report-popup' : undefined} onClick={open ? close : show}>
        <span className="nav-icon"><GameIcon name="book" size={16} /></span>
        <span className="nav-name">Report</span>
      </button>
      {open && createPortal(
        <dialog id="report-popup" className="card report-popup" open aria-labelledby="report-popup-title"
          onKeyDown={(event) => {
            if (event.key !== 'Escape') return;
            event.stopPropagation();
            close();
          }}>
          <form onSubmit={send}>
            <div className="report-popup-head">
              <h2 id="report-popup-title">Report</h2>
              <button className="btn sm ghost" type="button" aria-label="Close report" onClick={close}>
                <GameIcon name="close" size={16} />
              </button>
            </div>
            <p className="dim small">
              Your report includes your character name, gear, skills, passives, combat state and recent combat log.
              Administrators can read it and reply if you’re signed in.
            </p>
            <label>
              Type
              <select className="input" value={kind} disabled={busy} onChange={(event) => setKind(event.target.value as FeedbackKind)}>
                {KINDS.map(({ id, label }) => <option key={id} value={id}>{label}</option>)}
              </select>
            </label>
            <label>
              Message
              <textarea ref={body} className="input textarea" rows={4} maxLength={FEEDBACK_MAX} value={message}
                readOnly={busy} onChange={(event) => setMessage(event.target.value)}
                placeholder={kind === 'bug' ? 'What happened, and what did you expect?' : 'Tell us…'} />
            </label>
            {error && <p className="bad small" role="alert">{error}</p>}
            <div className="report-popup-actions">
              <span className="dim small">{message.length}/{FEEDBACK_MAX}</span>
              <button className="btn primary" disabled={busy || !message.trim()}>{busy ? 'Sending…' : 'Send report'}</button>
            </div>
          </form>
        </dialog>,
        document.body,
      )}
    </>
  );
}
