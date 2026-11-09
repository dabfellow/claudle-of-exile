import { Component, type ErrorInfo, type ReactNode } from 'react';
import { reportError } from '../../platform/errors';

/**
 * Catches a crash inside one page, so it shows what went wrong with a way out, instead of React unmounting the
 * whole game and leaving a black screen. The crash still goes to the error tracker.
 */
export class PageErrorBoundary extends Component<{ children: ReactNode; where: string; onLeave?: () => void }, { error: Error | null }> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    reportError(error, { where: this.props.where, componentStack: info.componentStack });
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    return (
      <div className="page">
        <div className="card">
          <div className="card-title">Something went wrong on this page</div>
          <p className="muted" style={{ marginTop: 0 }}>
            The rest of the game is fine and still running. Try the page again, or go somewhere else. If it keeps happening, a bug report from Settings helps a lot.
          </p>
          <pre className="dim small" style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', margin: '0 0 12px' }}>
            {error.message}
          </pre>
          <div className="row wrap" style={{ gap: 8 }}>
            <button className="btn sm primary" onClick={() => this.setState({ error: null })}>
              Try again
            </button>
            {this.props.onLeave && (
              <button className="btn sm" onClick={this.props.onLeave}>
                Back to the Hideout
              </button>
            )}
            <button className="btn sm ghost" onClick={() => location.reload()}>
              Reload the game
            </button>
          </div>
        </div>
      </div>
    );
  }
}
