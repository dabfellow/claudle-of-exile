import { useEffect, useState } from 'react';
import { AdminInbox } from './AdminInbox';
import { game } from '../../game';
import { isCloudAccount } from '../../platform/accounts';
import { cloudConfigured } from '../../platform/supabase';
import { errorText, FEEDBACK_MAX, feedbackContext, myReview, REVIEW_MAX, saveReview, sendFeedback, type FeedbackKind } from '../../platform/feedback';

const KINDS: { id: FeedbackKind; label: string }[] = [
  { id: 'bug', label: 'Bug report' },
  { id: 'idea', label: 'Idea' },
  { id: 'other', label: 'Something else' },
];

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

/** Settings: send a bug report or idea, and (signed in) rate the game. */
export function FeedbackCard() {
  const [kind, setKind] = useState<FeedbackKind>('bug');
  const [message, setMessage] = useState('');
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

  const send = async () => {
    setBusy(true);
    try {
      await sendFeedback(kind, message, feedbackContext(game.state, 'settings', game.combatLog.map((line) => line.text)));
      setMessage('');
      game.pushToast('Thanks! Your feedback was sent.', 'good');
    } catch (err) {
      game.pushToast(errorText(err, 'Could not send feedback'), 'bad');
    }
    setBusy(false);
  };

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
    <><AdminInbox /><div className="card">
      <div className="card-title">Feedback</div>
      <p className="muted" style={{ marginTop: 0 }}>
        Found a bug or have an idea? Your report includes your character name, gear, skills, passives, combat state and recent combat log for debugging. Signed-in reports are linked to your account so the developer can reply and help recover progress. Only administrators can read them.
      </p>
      <div className="row wrap" style={{ marginBottom: 8 }}>
        <select className="input" value={kind} onChange={(e) => setKind(e.target.value as FeedbackKind)}>
          {KINDS.map((k) => (
            <option key={k.id} value={k.id}>
              {k.label}
            </option>
          ))}
        </select>
      </div>
      <textarea
        className="input textarea"
        rows={4}
        maxLength={FEEDBACK_MAX}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder={kind === 'bug' ? 'What happened, and what did you expect?' : 'Tell us…'}
      />
      <div className="row" style={{ marginTop: 8 }}>
        <span className="dim small">
          {message.length}/{FEEDBACK_MAX}
        </span>
        <span className="spacer" />
        <button className="btn" disabled={busy || !message.trim()} onClick={send}>
          Send
        </button>
      </div>

      <div className="section-label" style={{ marginTop: 16 }}>
        Rate the game
      </div>
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
