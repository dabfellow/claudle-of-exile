import type { ReactNode } from 'react';
import { GameIcon, Tooltip } from './common';

/**
 * Compact inline `?` tooltip (or labelled underlined phrase + `?`) for unfamiliar skilling terms.
 * Works on mouse hover and mobile press-and-hold via shared `<Tooltip>`.
 */
export function HelpTip({ label, tip }: { label?: ReactNode; tip: ReactNode }) {
  return (
    <Tooltip content={<div className="tip help-tip-box">{tip}</div>}>
      <span className={`help-tip ${label ? 'with-label' : ''}`} tabIndex={0} role="note">
        {label && <span className="help-tip-label">{label}</span>}
        <span className="help-tip-q" aria-hidden="true">?</span>
      </span>
    </Tooltip>
  );
}

/**
 * One-line orientation bar shown at the top of a skill's workbench:
 * highlights the immediate first step and explains how the skill loop fits together.
 */
export function SkillIntro({ step, children, action }: { step: string; children: ReactNode; action?: ReactNode }) {
  return (
    <div className="skill-intro-banner" role="region" aria-label="Getting started">
      <div className="skill-intro-body">
        <span className="skill-intro-step">{step}</span>
        <span className="skill-intro-text">{children}</span>
      </div>
      {action && <div className="skill-intro-action">{action}</div>}
    </div>
  );
}

/** Consistent locked-level badge shown on locked panels, regions, upgrades, or tabs. */
export function LockedBadge({ level, reason }: { level?: number; reason?: string }) {
  return (
    <span className="badge locked" title={reason}>
      <GameIcon name="lock" size={11} />
      {level !== undefined ? `Lv ${level}` : reason ?? 'Locked'}
    </span>
  );
}
