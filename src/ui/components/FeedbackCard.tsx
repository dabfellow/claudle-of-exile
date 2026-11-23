import { useEffect, useState } from 'react';
import { AdminInbox } from './AdminInbox';
import { game } from '../../game';
import { isCloudAccount } from '../../platform/accounts';
import { cloudConfigured } from '../../platform/supabase';
import { errorText, myFeedback, myReview, playerStatus, REVIEW_MAX, saveReview, type MyFeedbackRow } from '../../platform/feedback';
import { Badge } from './common';

const KIND_LABEL = { bug: 'Bug report', idea: 'Idea', other: 'Something else' } as const;

/** The player's own reports: what they wrote, where it stands, and the developer's replies. */
function MyReports() {
  const account = game.account;
  const signedIn = isCloudAccount(account) && !game.sandbox;
  const [rows, setRows] = useState<MyFeedbackRow[] | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!signedIn) return;
    const load = () => myFeedback().then((r) => { setRows(r); setFailed(false); }, () => setFailed(true));
    void load();
    window.addEventListener('feedback-sent', load);
    return () => window.removeEventListener('feedback-sent', load);
  }, [signedIn]);

  if (!signedIn) {
    return <div className="card"><div className="card-title">Your reports</div>
      <p className="dim small" style={{ marginBottom: 0 }}>Sign in with Google or Discord to keep copies of your reports, see where they stand and read replies.</p>
    </div>;
  }
  // Until the database side is installed, quietly leave the section out rather than show an error.
  if (failed) return null;
  return <div className="card"><div className="card-title">Your reports</div>
    {!rows && <p className="dim small">Loading your reports…</p>}
    {rows?.length === 0 && <p className="dim small" style={{ marginBottom: 0 }}>Reports you send with the Report button show up here, with their status and any reply.</p>}
    {rows?.map((row) => {
      const status = playerStatus(row.status);
      const replies = row.replies ?? [];
      return <details key={row.id} className="my-report" open={row.status !== 'resolved' && replies.length > 0}>
        <summary>
          <Badge tone={status.tone}>{status.label}</Badge>
          <span className="my-report-title">{KIND_LABEL[row.kind] ?? row.kind}{replies.length ? ` · ${replies.length} ${replies.length === 1 ? 'reply' : 'replies'}` : ''}</span>
          <span className="dim small">{new Date(row.created_at).toLocaleDateString()}</span>
        </summary>
        <p className="my-report-message">{row.message}</p>
        <p className="dim small">Sent {new Date(row.created_at).toLocaleString()}{row.version ? ` · v${row.version}` : ''}{row.character_name ? ` · ${row.character_name}` : ''}</p>
        {replies.map((reply) => <div key={reply.id} className="my-report-reply">
          <div className="small"><b>Reply from the developer</b> <span className="dim">· {new Date(reply.created_at).toLocaleString()}</span></div>
          <p className="my-report-message">{reply.message}</p>
        </div>)}
      </details>;
    })}
  </div>;
}

export function Stars({ value, onChange, size = 20 }: { value: number; onChange?: (n: number) => void; size?: number }) {
  return (
    <span className="stars" role={onChange ? 'radiogroup' : undefined} aria-label={`${value} of 5 stars`} style={{ fontSize: size }}>
      {[1, 2, 3, 4, 5].map((n) =>
        onChange ? (
          <button key={n} type="button" role="radio" aria-checked={value === n} className={`star ${n <= value ? 'on' : ''}`} onClick={() => onChange(n)} title={`${n} star${n > 1 ? 's' : ''}`}>
            ★
          </button>
        ) : (
          <span key={n} className={`star ${n <= value ? 'on' : ''}`}>
            ★
          </span>
        ),
      )}
    </span>
  );
}

/** Settings keeps developer replies and game reviews. */
export function FeedbackCard() {
  const [busy, setBusy] = useState(false);
  const account = game.account;
  const signedIn = isCloudAccount(account);

  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState('');
  const [reviewed, setReviewed] = useState(false);
  useEffect(() => {
    if (!signedIn || !account) return;
    myReview(account.id).then(
      (r) => {
        if (!r) return;
        setStars(r.stars);
        setComment(r.comment);
        setReviewed(true);
      },
      () => undefined,
    );
  }, [signedIn, account]);

  if (!cloudConfigured()) return null;

  const review = async () => {
    if (!account || !stars) return;
    setBusy(true);
    try {
      await saveReview(account.id, stars, comment, account.displayName);
      setReviewed(true);
      game.pushToast('Thanks for the review!', 'good');
    } catch (err) {
      game.pushToast(errorText(err, 'Could not save your review'), 'bad');
    }
    setBusy(false);
  };

  return (
    <><AdminInbox /><MyReports /><div className="card">
      <div className="card-title">Rate the game</div>
      {signedIn ? (
        <>
          <Stars value={stars} onChange={setStars} size={24} />
          <textarea
            className="input textarea"
            rows={2}
            maxLength={REVIEW_MAX}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Anything you'd like to add? (optional)"
            style={{ marginTop: 8 }}
          />
          <div className="row" style={{ marginTop: 8 }}>
            {reviewed && <span className="dim small">You can update your review any time.</span>}
            <span className="spacer" />
            <button className="btn" disabled={busy || !stars} onClick={review}>
              {reviewed ? 'Update review' : 'Submit review'}
            </button>
          </div>
        </>
      ) : (
        <p className="dim small" style={{ marginBottom: 0 }}>
          Sign in with Google or Discord to leave a review.
        </p>
      )}
    </div></>
  );
}
