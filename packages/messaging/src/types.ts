import type { ConversationId } from '@luxury/shared';

export type Channel = 'telegram';

/**
 * Credentials are passed in by the service that owns them. This package never
 * reads them from the environment (CLAUDE.md, "Outbound messages").
 */
export interface MessagingCredentials {
  readonly telegramBotToken: string;
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
