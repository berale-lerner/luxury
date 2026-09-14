/**
 * Which screen the admin shell shows.
 *
 * Found in production: after signing out, the interface showed "loading"
 * forever and a refresh did not help. The check for a missing identity ran
 * before the check for a signed-out visitor, and a signed-out visitor never
 * has an identity — so the first check always won.
 *
 * Frontend is deliberately almost untested here (TESTING.md). This is the
 * exception because the decision is a lockout, and it is a pure function, so
 * it costs nothing to prove.
 */
import { describe, expect, it } from 'vitest';
import { screenFor } from '../../apps/admin/web/src/shell/access.js';

const ME = { email: 'manager@example.com', role: 'owner' };

describe('a visitor the server refused', () => {
  it('who signed out sees the sign-in screen, not loading', () => {
    // The bug itself: refused, and no identity was ever loaded.
    expect(screenFor('signed-out', null)).toEqual({ kind: 'sign-in' });
  });

  it('who is not on the allowlist sees why, not loading', () => {
    expect(screenFor('not-allowed', null)).toEqual({ kind: 'not-allowed' });
  });

  it('whose session ended mid-use is refused despite the identity already loaded', () => {
    // The identity is left over from before the 401. A refusal is final.
    expect(screenFor('signed-out', ME)).toEqual({ kind: 'sign-in' });
    expect(screenFor('not-allowed', ME)).toEqual({ kind: 'not-allowed' });
  });
});

describe('a visitor still being checked', () => {
  it('sees loading', () => {
    expect(screenFor('checking', null)).toEqual({ kind: 'loading' });
  });
});

describe('a visitor the server accepted', () => {
  it('sees the app, with the identity it was given', () => {
    expect(screenFor('ok', ME)).toEqual({ kind: 'app', admin: ME });
  });

  it('does not see the app without an identity to render it for', () => {
    expect(screenFor('ok', null)).toEqual({ kind: 'loading' });
  });
});
