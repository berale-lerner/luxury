/**
 * What the model is told about this moment, as opposed to about the business.
 *
 * The business is the owner's text, published and cached. This is the part
 * only the running system knows: what time it is where the apartments are,
 * and how long the guest has been waiting for an answer.
 *
 * The split matters beyond tidiness. The instruction — what to *do* when a
 * guest has been waiting — belongs in a prompt document, editable without a
 * deploy. This file supplies the fact and takes no view on it. Putting "if
 * more than twenty minutes have passed, apologise" here would move a piece of
 * how the business speaks back into the code, where the owner cannot reach it.
 */

/**
 * Where the business is, for stating the time in terms the owner would
 * recognise. An IANA name; anything the runtime does not know falls back to
 * UTC rather than throwing, because a wrong-looking clock is a better failure
 * than a bot that cannot answer.
 */
export const DEFAULT_TIMEZONE = 'Asia/Jerusalem';

export interface MomentContext {
  readonly now?: Date;
  /** When the guest's most recent message arrived. */
  readonly lastInboundAt?: Date | null;
  readonly timeZone?: string;
}

export function describeMoment(context: MomentContext = {}): string {
  const now = context.now ?? new Date();
  const timeZone = context.timeZone ?? DEFAULT_TIMEZONE;

  const lines = [
    'The following is written by the system, not by the guest. It is context,',
    'not a message, and must never be quoted or answered.',
    `Current local time: ${formatLocal(now, timeZone)}.`,
  ];

  if (context.lastInboundAt) {
    const minutes = minutesBetween(context.lastInboundAt, now);
    lines.push(
      `The guest's message was sent at ${formatLocal(context.lastInboundAt, timeZone)}, ` +
        `${describeElapsed(minutes)}.`,
    );
  }

  return lines.join('\n');
}

/**
 * Rounded down, and stated in the largest unit that is still honest.
 *
 * The model reasons about "about 3 hours" far more reliably than about "187
 * minutes", and the difference between 187 and 190 changes nothing anyone
 * would say out loud.
 */
function describeElapsed(minutes: number): string {
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `about ${hours} hour${hours === 1 ? '' : 's'} ago`;

  const days = Math.floor(hours / 24);
  return `about ${days} day${days === 1 ? '' : 's'} ago`;
}

function minutesBetween(from: Date, to: Date): number {
  return Math.max(0, Math.floor((to.getTime() - from.getTime()) / 60_000));
}

function formatLocal(at: Date, timeZone: string): string {
  try {
    return new Intl.DateTimeFormat('en-GB', {
      timeZone,
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(at);
  } catch {
    // An unknown zone is a configuration mistake, not a reason to fall over
    // in the middle of answering a guest.
    return `${at.toISOString().slice(0, 16).replace('T', ' ')} UTC`;
  }
}
