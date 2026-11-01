const CHANNEL = 'coe-character-tabs';
/** how long a tab opening a character waits for another tab to save it and let go */
const RELEASE_WAIT_MS = 250;
/** a claim this old reached a tab that was frozen or asleep, whose copy of the character is out of date */
const STALE_CLAIM_MS = 1000;

type Message = { type: 'claim'; id: string; at: number } | { type: 'released'; id: string };

/** Keeps a character open in one tab at a time: opening it asks any other tab of this browser to let go. */
export class TabClaims {
  private channel: BroadcastChannel | null = typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel(CHANNEL);
  private waiting = new Map<string, () => void>();

  /** `release` gives the character up, keeping its progress unless it's `stale`, and returns false if this tab doesn't hold it. */
  constructor(private release: (id: string, stale: boolean) => boolean) {
    if (this.channel) this.channel.onmessage = (e: MessageEvent<Message>) => this.onMessage(e.data);
  }

  private onMessage(m: Message) {
    if (m.type === 'released') {
      this.waiting.get(m.id)?.();
    } else if (this.release(m.id, Date.now() - m.at > STALE_CLAIM_MS)) {
      this.send({ type: 'released', id: m.id });
    }
  }

  private send(m: Message) {
    this.channel?.postMessage(m);
  }

  /** Resolves once another tab has saved the character, or right after the wait if no tab answers. */
  claim(id: string): Promise<void> {
    if (!this.channel) return Promise.resolve();
    return new Promise((resolve) => {
      const done = () => {
        clearTimeout(timer);
        this.waiting.delete(id);
        resolve();
      };
      const timer = setTimeout(done, RELEASE_WAIT_MS);
      this.waiting.set(id, done);
      this.send({ type: 'claim', id, at: Date.now() });
    });
  }

  close() {
    this.channel?.close();
  }
}
