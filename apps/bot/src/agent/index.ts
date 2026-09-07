/**
 * The model layer.
 *
 * Everything here is about asking a model for text: the published system
 * prompt, the shape of a conversation turn, and the call itself.
 *
 * It knows nothing about Telegram, HTTP, or how a reply is delivered. That
 * is not tidiness — it is the reason the agent has no way to send anything.
 * A module that cannot import a channel cannot acquire a send tool by
 * accident, and the separation is enforced in tests/structure.
 *
 * The provider sits behind the ModelClient port in model.ts. Only the
 * adapters under providers/ import a vendor SDK.
 */
export * from './model.js';
export * from './generate.js';
export * from './prompt.js';
export * from './providers/anthropic.js';
