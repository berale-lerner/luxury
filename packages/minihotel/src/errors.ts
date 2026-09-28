/**
 * Why a call to MiniHotel did not produce data.
 *
 * The kinds are the distinctions a caller acts on differently: an address
 * missing from the vendor's allowlist is fixed by an email to their support,
 * a rejected user by checking the credentials, and the rest by waiting or by
 * reading the logs.
 */
export type MiniHotelFailure =
  /** The vendor refused the calling IP (code A01, or an HTTP 401 saying so). */
  | 'ip_not_authorized'
  /** The username, hotel code or user code was rejected (codes 210 / 211 / 863). */
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
    /**
     * For `bad_response`: which part of the answer did not match, described
     * by element and attribute names and types only — see shapeProblems().
     */
    readonly detail?: readonly string[],
  ) {
    super(code ? `MiniHotel ${failure} (code ${code})` : `MiniHotel ${failure}`);
    this.name = 'MiniHotelError';
  }
}

// From minihotel.readme.io/reference/error-codes. 863 is "Incorrect user
// code", not an address problem, whatever older notes said.
const IP_CODES = new Set(['A01']);
const AUTH_CODES = new Set(['210', '211', '863']);

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

/**
 * Why a document did not match a schema, safe to log.
 *
 * Paths and expected/received *types* only. A value never appears: Zod puts
 * the offending value in the message of some issue kinds (an enum, a
 * literal), so the message is not used at all.
 */
export function shapeProblems(
  issues: readonly { path: readonly (string | number)[]; code: string; expected?: unknown; received?: unknown }[],
  document: unknown,
): string[] {
  const root =
    document && typeof document === 'object' ? Object.keys(document).join(',') || '(empty)' : typeof document;
  const problems = issues.slice(0, 8).map((issue) => {
    const where = issue.path.join('.') || '(root)';
    const types =
      issue.code === 'invalid_type' ? ` expected ${String(issue.expected)}, got ${String(issue.received)}` : '';
    return `${where}: ${issue.code}${types}`;
  });
  return [`root elements: ${root}`, ...problems];
}
