/**
 * The conversation layer: what the database knows about a thread.
 *
 * Sits under both of the others. The agent layer asks it for history; the
 * seam asks it where a reply goes. Every query here declares its RLS scope,
 * so a statement that forgets to returns nothing rather than everything.
 */
export * from './record-inbound.js';
export * from './history.js';
export * from './destination.js';
export * from './fallback.js';
