/**
 * The channel layer: everything that speaks a messaging platform's protocol.
 *
 * Inbound only, and generic by construction. Each platform implements the
 * InboundChannel port in channel.ts — authenticate however that platform
 * does it, then produce a channel-neutral message. Nothing here knows what a
 * model is.
 *
 * Adding WhatsApp means a new adapter and a registry entry. The route, the
 * storage path, and the reply loop do not change.
 *
 * The outbound half lives in packages/messaging, shared with apps/admin —
 * one sender for confirmations, reminders and the manager's own messages.
 */
export * from './channel.js';
export * from './webhook.js';
export * from './telegram/channel.js';
export * from './telegram/update.js';
