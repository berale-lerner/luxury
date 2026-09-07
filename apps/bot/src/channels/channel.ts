import type { ChannelName } from '@luxury/shared';
import type { InboundTextMessage } from '../conversations/index.js';

/**
 * The port every messaging platform implements on the way in.
 *
 * A channel does two things and nothing else: prove a request really came
 * from the platform, and turn its payload into a channel-neutral message.
 * Whether that means a secret header, an HMAC signature, or a shared token
 * is the channel's business.
 *
 * Adding WhatsApp is a new file implementing this, plus a row in the
 * registry — not a change to the webhook plumbing, the storage path, or
 * anything the model touches.
 */

export type { ChannelName };

/** What a channel decided about one request. */
export type InboundResult =
  /** Authentic and actionable. */
  | { readonly kind: 'message'; readonly message: InboundTextMessage }
  /**
   * Authentic, but nothing this service acts on — an edit, a photo, a join
   * event. Acknowledged so the provider stops redelivering it.
   */
  | { readonly kind: 'ignored'; readonly reason: string }
  /** Not provably from the platform. Rejected without touching the body. */
  | { readonly kind: 'unauthenticated' };

export interface InboundRequest {
  readonly headers: Readonly<Record<string, string | string[] | undefined>>;
  readonly body: unknown;
}

export interface InboundChannel {
  readonly name: ChannelName;
  /** Route this channel listens on, e.g. `/telegram/webhook`. */
  readonly webhookPath: string;
  /**
   * Authenticates and parses in one step, so there is no way to read the
   * body of a request that was never proven to be authentic.
   */
  receive(request: InboundRequest): InboundResult;
}
