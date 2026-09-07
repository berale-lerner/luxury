/**
 * The channel layer: everything that speaks a messaging platform's protocol.
 *
 * Inbound only. This is where a platform's payload is authenticated and
 * parsed into something the rest of the service can use, and where nothing
 * knows what a model is.
 *
 * The outbound half lives in packages/messaging, shared with apps/admin —
 * one sender for confirmations, reminders and the manager's own messages.
 */
export * from './telegram/update.js';
export * from './telegram/webhook.js';
