import { useEffect, useState } from 'react';
import { AdminInbox } from './AdminInbox';
import { game } from '../../game';
import { isCloudAccount } from '../../platform/accounts';
import { cloudConfigured } from '../../platform/supabase';
import { errorText, myReview, REVIEW_MAX, saveReview } from '../../platform/feedback';

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
    <><AdminInbox /><div className="card">
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
