import { useState, type ReactNode } from 'react';
import '../round2-session2.css';

const KEY = 'poi.fold.';

function readOpen(id: string, fallback: boolean): boolean {
  try {
    const v = localStorage.getItem(KEY + id);
    return v === null ? fallback : v === '1';
  } catch {
    return fallback;
  }
}

function saveOpen(id: string, open: boolean) {
  try {
    localStorage.setItem(KEY + id, open ? '1' : '0');
  } catch {
    // storage blocked: the section still folds, it just won't be remembered
  }
}

/**
 * A card whose body folds away on phones (its title becomes the toggle). On wider screens it's
 * always open and the title is plain. Open/closed is remembered per `id` on this device.
 */
export function Fold({ id, title, actions, children, className = '', defaultOpen = true }: { id: string; title: ReactNode; actions?: ReactNode; children: ReactNode; className?: string; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(() => readOpen(id, defaultOpen));
  const toggle = () => {
    setOpen(!open);
    saveOpen(id, !open);
  };
  return (
    <section className={`card fold ${open ? '' : 'closed'} ${className}`}>
      <div className="card-title fold-head">
        <button type="button" className="fold-toggle" aria-expanded={open} onClick={toggle}>
          <span className="fold-chevron" aria-hidden>
            ▸
          </span>
          {title}
        </button>
        <span className="grow" />
        {actions}
      </div>
      <div className="fold-body">{children}</div>
    </section>
  );
}
