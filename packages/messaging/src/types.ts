import type { ChannelName, ConversationId } from '@luxury/shared';

export type Channel = ChannelName;

/**
 * Credentials are passed in by the service that owns them. This package never
 * reads them from the environment (CLAUDE.md, "Outbound messages").
 *
 * One field per platform, all optional but for the ones actually wired up:
 * a service configures the channels it sends on and no others.
 */
export interface MessagingCredentials {
  readonly telegramBotToken: string;
}

/**
 * One platform's sender.
 *
 * Narrower than MessagingClient: it is handed a destination that has already
 * been resolved, so an adapter never touches the database and never has a
 * chance to accept an address from a caller.
 */
export interface ChannelSender {
  readonly channel: Channel;
  send(destination: { chatId: string }, text: string): Promise<SendResult>;
}

/**
 * Resolves the delivery destination for a conversation from the database.
 * Injected by the caller, because each service connects as its own DB role.
 *
 * This is the reason the send signature can refuse free-form addresses: the
 * destination is looked up, never supplied.
 */
export interface DestinationResolver {
  resolve(conversationId: ConversationId): Promise<{ channel: Channel; chatId: string }>;
}

export interface SendResult {
  readonly channel: Channel;
  readonly providerMessageId: string;
}

export interface MessagingClient {
  /** The only way to send. No overload accepts an address. */
  sendToConversation(conversationId: ConversationId, text: string): Promise<SendResult>;
}
