/**
 * Which screen the shell shows, from what it knows about the visitor.
 *
 * A function rather than a run of `if`s in App.tsx because the order of those
 * `if`s is the whole behaviour, and it was wrong once: a loading guard written
 * as `access === 'checking' || !admin` sat above the signed-out check, and a
 * visitor who had signed out never has an identity — so the guard caught them
 * first and showed "loading" forever, on every refresh.
 *
 * The rule the order encodes: a refusal is final and wins over everything,
 * including an identity left over from before the session ended. Only a
 * confirmed answer with an identity is the app. Anything in between is still
 * loading.
 *
 * No imports, so it can be tested without a browser.
 */

export type Access = 'checking' | 'ok' | 'signed-out' | 'not-allowed';

export type Screen<Identity> =
  | { readonly kind: 'loading' }
  | { readonly kind: 'sign-in' }
  | { readonly kind: 'not-allowed' }
  | { readonly kind: 'app'; readonly admin: Identity };

export function screenFor<Identity>(access: Access, admin: Identity | null): Screen<Identity> {
  if (access === 'signed-out') return { kind: 'sign-in' };
  if (access === 'not-allowed') return { kind: 'not-allowed' };
  if (access === 'ok' && admin !== null) return { kind: 'app', admin };
  return { kind: 'loading' };
}
