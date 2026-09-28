import { bulkAriRequest, parseBulkAri, type BulkAri, type BulkAriQuery } from './bulk-ari.js';
import { MiniHotelError, vendorErrorIn } from './errors.js';
import { immediateAriRequest, parseImmediateAri, type ImmediateAri, type ImmediateAriQuery } from './immediate-ari.js';

export const PRODUCTION_ARI_URL = 'https://api.minihotel.cloud/gds';
export const SANDBOX_ARI_URL = 'https://sandbox.minihotel.cloud/gds';

const DEFAULT_TIMEOUT_MS = 10_000;

export interface MiniHotelCredentials {
  readonly username: string;
  readonly password: string;
  readonly hotelId: string;
}

export interface MiniHotelClientOptions {
  /** Passed in by the service that owns them. This package reads no env. */
  readonly credentials: MiniHotelCredentials;
  /** The ARI endpoint. Production unless told otherwise. */
  readonly ariUrl?: string;
  readonly timeoutMs?: number;
}

export interface MiniHotelClient {
  /**
   * Availability and prices for one stay. Works with a plain API user — this
   * is what Base44 used in production.
   */
  immediateAri(query: ImmediateAriQuery): Promise<ImmediateAri>;
  /**
   * Per-night ARI over a range. Answers `ERR 303` (room linkage) for our
   * production user, 2026-09-28: it is meant for OTAs with a mapping set up
   * by MiniHotel (MINIHOTEL.md).
   */
  bulkAri(query: BulkAriQuery): Promise<BulkAri>;
}

/**
 * The one place that knows MiniHotel's wire format.
 *
 * It does transport and parsing only: no caching, no decisions about which
 * fields anyone may see. Those belong to the caller, which knows who is
 * asking (STANDARDS.md, tools and use cases).
 *
 * The credential is monolithic — the same user can charge a credit card
 * (MINIHOTEL.md, "אימות") — so this client exposes reads only, and adding a
 * method here is adding reach to every service that holds one.
 */
export function createMiniHotelClient(options: MiniHotelClientOptions): MiniHotelClient {
  const ariUrl = options.ariUrl ?? PRODUCTION_ARI_URL;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  async function post(body: string): Promise<string> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    let response: Response;
    try {
      response = await fetch(ariUrl, {
        method: 'POST',
        headers: { 'content-type': 'application/xml; charset=utf-8' },
        body,
        signal: controller.signal,
      });
    } catch {
      if (controller.signal.aborted) throw new MiniHotelError('timeout');
      throw new MiniHotelError('unreachable');
    } finally {
      clearTimeout(timer);
    }

    const text = await response.text();
    if (!response.ok) {
      // Seen on the SCI endpoint from an address not on the allowlist:
      // 401 "Your IP Address is not authorized".
      if (response.status === 401 && /ip address is not authorized/i.test(text)) {
        throw new MiniHotelError('ip_not_authorized', undefined, 401);
      }
      throw vendorErrorIn(text) ?? new MiniHotelError('http_error', undefined, response.status);
    }
    const vendorError = vendorErrorIn(text);
    if (vendorError) throw vendorError;
    return text;
  }

  return {
    async immediateAri(query) {
      return parseImmediateAri(await post(immediateAriRequest(options.credentials, query)));
    },

    async bulkAri(query) {
      return parseBulkAri(await post(bulkAriRequest(options.credentials, query)));
    },
  };
}
