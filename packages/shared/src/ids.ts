/**
 * Identifiers that cross package boundaries.
 *
 * Branded so that a conversation id cannot be passed where a contact id is
 * expected. The send layer takes a `ConversationId`, never an address
 * (CLAUDE.md, "Outbound messages") — the brand makes that signature mean
 * something at compile time, on top of the runtime resolution from the DB.
 */
declare const brand: unique symbol;

type Branded<T, B extends string> = T & { readonly [brand]: B };

export type ConversationId = Branded<string, 'ConversationId'>;
export type GuestId = Branded<string, 'GuestId'>;
export type UnitId = Branded<string, 'UnitId'>;
export type BookingId = Branded<string, 'BookingId'>;
