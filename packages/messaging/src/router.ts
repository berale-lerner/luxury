import type { ConversationId } from '@luxury/shared';
import type {
  Channel,
  ChannelSender,
  DestinationResolver,
  MessagingClient,
  SendResult,
} from './types.js';

export interface RouterOptions {
  readonly resolver: DestinationResolver;
  readonly senders: readonly ChannelSender[];
  readonly log?: (event: Record<string, unknown>) => void;
}

/**
 * The one entry point for sending, across every platform.
 *
 * It takes a conversation id, asks the resolver which platform and address
 * that conversation belongs to, and hands the text to the sender for that
 * platform. Callers — the bot answering a guest, admin sending a
 * confirmation — never name a channel and never name an address.
 *
 * That is what keeps the guarantee true as platforms are added: there is
 * still exactly one function that sends, and it still cannot be given a
 * destination. A new platform is a sender in this list.
 */
export function createMessagingRouter(options: RouterOptions): MessagingClient {
  const log = options.log ?? (() => {});
  const byChannel = new Map<Channel, ChannelSender>(
    options.senders.map((sender) => [sender.channel, sender]),
  );

  return {
    async sendToConversation(conversationId: ConversationId, text: string): Promise<SendResult> {
      const destination = await options.resolver.resolve(conversationId);

      const sender = byChannel.get(destination.channel);
      if (!sender) {
        // A conversation on a platform this service was not configured to
        // send on. Loud, because the alternative is a guest waiting forever.
        throw new UnsupportedChannelError(destination.channel, [...byChannel.keys()]);
      }

      const startedAt = Date.now();
      const result = await sender.send({ chatId: destination.chatId }, text);

      log({
        event: 'messaging.sent',
        channel: destination.channel,
        conversationId,
        durationMs: Date.now() - startedAt,
      });

      return result;
    },
  };
}

export class UnsupportedChannelError extends Error {
  constructor(
    readonly channel: Channel,
    readonly configured: readonly Channel[],
  ) {
    super(`No sender configured for ${channel}; this service sends on: ${configured.join(', ')}`);
    this.name = 'UnsupportedChannelError';
  }
}
