/**
 * The outbound messaging layer, shared by apps/bot and apps/admin.
 *
 * One router, one sender per platform. The router is the only thing callers
 * touch: it takes a conversation id, resolves the destination from the
 * database, and dispatches to the platform that conversation lives on.
 *
 * There is deliberately no function anywhere in here that accepts an address.
 * That is what makes "the recipient is never determined by model output"
 * (CLAUDE.md) a property of the code rather than a rule to remember.
 */
export * from './types.js';
export * from './router.js';
export * from './telegram.js';
