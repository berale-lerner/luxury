import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { MiniHotelError } from '@luxury/minihotel';
import { requires } from '../auth/roles.js';
import { addDays, type AvailabilityService } from './week.js';

/** MiniHotel's Bulk ARI accepts up to two years; the screen needs far less. */
const EARLIEST_DAYS = -366;
const LATEST_DAYS = 730;

const DATE = /^\d{4}-\d{2}-\d{2}$/;

const querySchema = z.object({
  from: z
    .string()
    // One check, not a regex then a refine: Zod runs the refine even after
    // the regex fails, and addDays throws on text that is not a date.
    // The round trip rejects 2026-02-31, which matches the pattern.
    .refine((value) => DATE.test(value) && addDays(value, 0) === value)
    .optional(),
});

export interface AvailabilityRoutesDeps {
  /** Null when this environment has no MiniHotel credentials. */
  readonly availability: AvailabilityService | null;
}

/**
 * The availability screen's one endpoint.
 *
 * A vendor failure is answered with its kind rather than a bare 502, because
 * the first use of this screen is finding out whether MiniHotel accepts our
 * addresses at all — and "not on their allowlist" and "wrong password" are
 * fixed by different people.
 */
export function registerAvailabilityRoutes(app: FastifyInstance, deps: AvailabilityRoutesDeps): void {
  app.get('/api/availability', { config: requires('viewer') }, async (request, reply) => {
    const service = deps.availability;
    if (!service) return reply.code(503).send({ error: 'not_configured' });

    const query = querySchema.safeParse(request.query);
    if (!query.success) return reply.code(400).send({ error: 'bad_request' });

    const today = service.today();
    const from = query.data.from ?? today;
    if (from < addDays(today, EARLIEST_DAYS) || from > addDays(today, LATEST_DAYS)) {
      return reply.code(400).send({ error: 'bad_request' });
    }

    const started = Date.now();
    try {
      const week = await service.week(from);
      request.log.info(
        { event: 'minihotel.bulk_ari', from, ok: true, ms: Date.now() - started },
        'availability loaded',
      );
      return reply.send({ today, ...week });
    } catch (error) {
      if (!(error instanceof MiniHotelError)) throw error;
      request.log.warn(
        {
          event: 'minihotel.bulk_ari',
          from,
          ok: false,
          ms: Date.now() - started,
          failure: error.failure,
          code: error.code,
          status: error.status,
        },
        'availability failed',
      );
      return reply.code(502).send({ error: error.failure, code: error.code ?? null });
    }
  });
}
