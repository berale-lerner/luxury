/**
 * Why a call to MiniHotel did not produce data.
 *
 * The kinds are the distinctions a caller acts on differently: an address
 * missing from the vendor's allowlist is fixed by an email to their support,
 * a rejected user by checking the credentials, and the rest by waiting or by
 * reading the logs.
 */
export type MiniHotelFailure =
  /** The vendor refused the calling IP (codes 863 / A01, or an HTTP 401 saying so). */
  | 'ip_not_authorized'
  /** The username, password or hotel code was rejected (codes 210 / 211). */
  | 'auth_failed'
  /** Any other `ERR nnn:` answer. The code is carried. */
  | 'vendor_error'
  /** An answer that is neither an error nor the XML we expect. */
  | 'bad_response'
  /** A non-2xx HTTP status that is not one of the above. */
  | 'http_error'
  | 'timeout'
  /** DNS, TCP or TLS failure — the request never got an answer. */
  | 'unreachable';

/**
 * Carries the kind and, when the vendor gave one, its error code.
 *
 * Never the vendor's message text and never the request: an error message
 * can echo what was sent, and what was sent includes the password. The code
 * is enough to look up in MINIHOTEL.md.
 */
export class MiniHotelError extends Error {
  constructor(
    readonly failure: MiniHotelFailure,
    readonly code?: string,
    readonly status?: number,
  ) {
    super(code ? `MiniHotel ${failure} (code ${code})` : `MiniHotel ${failure}`);
    this.name = 'MiniHotelError';
  }
}

const IP_CODES = new Set(['863', 'A01']);
const AUTH_CODES = new Set(['210', '211']);

/**
 * MiniHotel reports errors as HTTP 200 with a plain-text body such as
 * `ERR 202: Hotel GDS Code does not exist: …` — observed against the sandbox
 * and production on 2026-09-28. Returns null for anything else.
 */
export function vendorErrorIn(body: string): MiniHotelError | null {
  const match = /^ERR\s+([A-Za-z0-9]+)\s*:/.exec(body.trimStart());
  if (!match) return null;
  const code = match[1]!;
  if (IP_CODES.has(code)) return new MiniHotelError('ip_not_authorized', code);
  if (AUTH_CODES.has(code)) return new MiniHotelError('auth_failed', code);
  return new MiniHotelError('vendor_error', code);
}
