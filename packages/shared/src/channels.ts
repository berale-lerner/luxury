/**
 * The messaging platforms the system speaks.
 *
 * Lives here rather than in either layer because both need it and neither
 * owns it: a channel adapter produces it, the conversation row stores it, and
 * the send router dispatches on it. Keeping it in packages/shared is what
 * stops the conversation layer from having to import a channel to name one.
 *
 * The values match the CHECK constraint on public.conversations.channel.
 */
export type ChannelName = 'telegram' | 'whatsapp' | 'instagram';

export const CHANNEL_NAMES = ['telegram', 'whatsapp', 'instagram'] as const;
