import type { FastifyBaseLogger, FastifyInstance, FastifyReply } from 'fastify';
import { z } from 'zod';
import { MiniHotelError } from '@luxury/minihotel';
import { requires } from '../auth/roles.js';
import type { AvailabilityService } from './availability.js';
import type { TodayService } from './today.js';
import { addDays } from './ttl-cache.js';

/** The availability screen reaches a year back and two years ahead. */
const EARLIEST_DAYS = -366;
const LATEST_DAYS = 730;

const DATE = /^\d{4}-\d{2}-\d{2}$/;

const availabilityQuery = z.object({
  from: z
    .string()
    // One check, not a regex then a refine: Zod runs the refine even after
    // the regex fails, and addDays throws on text that is not a date.
    // The round trip rejects 2026-02-31, which matches the pattern.
    .refine((value) => DATE.test(value) && addDays(value, 0) === value)
    .optional(),
});

/** The dashboards backed by MiniHotel. Null when this environment has no credentials. */
export interface Dashboards {
  readonly availability: AvailabilityService;
  readonly today: TodayService;
}

export interface DashboardRoutesDeps {
  readonly dashboards: Dashboards | null;
}

/**
 * Answers a MiniHotel failure with its kind rather than a bare 502: "not on
 * their allowlist" and "wrong password" are fixed by different people.
 */
function vendorFailure(
  error: unknown,
  reply: FastifyReply,
  log: FastifyBaseLogger,
  context: { event: string; ms: number },
): FastifyReply {
  if (!(error instanceof MiniHotelError)) throw error;
  log.warn(
    {
      ...context,
      ok: false,
      failure: error.failure,
      code: error.code,
      status: error.status,
      // Element names and types only, never values (errors.ts).
      detail: error.detail,
    },
    'dashboard failed',
  );
  return reply.code(502).send({ error: error.failure, code: error.code ?? null });
}

/**
 * The dashboards' endpoints. Each reads MiniHotel live, behind a short cache.
 */
export function registerDashboardRoutes(app: FastifyInstance, deps: DashboardRoutesDeps): void {
  app.get('/api/dashboards/availability', { config: requires('viewer') }, async (request, reply) => {
    const dashboards = deps.dashboards;
    if (!dashboards) return reply.code(503).send({ error: 'not_configured' });

    const query = availabilityQuery.safeParse(request.query);
    if (!query.success) return reply.code(400).send({ error: 'bad_request' });

    const today = dashboards.availability.today();
    const from = query.data.from ?? today;
    if (from < addDays(today, EARLIEST_DAYS) || from > addDays(today, LATEST_DAYS)) {
      return reply.code(400).send({ error: 'bad_request' });
    }

    const started = Date.now();
    try {
      const week = await dashboards.availability.week(from);
      request.log.info(
        { event: 'minihotel.availability_week', from, ok: true, ms: Date.now() - started },
        'availability loaded',
      );
      return reply.send({ today, ...week });
    } catch (error) {
      return vendorFailure(error, reply, request.log, {
        event: 'minihotel.availability_week',
        ms: Date.now() - started,
      });
    }
  });

  app.get('/api/dashboards/today', { config: requires('viewer') }, async (request, reply) => {
    const dashboards = deps.dashboards;
    if (!dashboards) return reply.code(503).send({ error: 'not_configured' });

    const started = Date.now();
    try {
      const board = await dashboards.today.board();
      // Counts only: the board carries guest names, which are not logged
      // (STANDARDS.md, logs).
      request.log.info(
        {
          event: 'minihotel.room_status',
          ok: true,
          ms: Date.now() - started,
          arrivals: board.arrivals.length,
          departures: board.departures.length,
          stayovers: board.stayovers.length,
          vacant: board.vacant.length,
        },
        'today loaded',
      );
      return reply.send(board);
    } catch (error) {
      return vendorFailure(error, reply, request.log, {
        event: 'minihotel.room_status',
        ms: Date.now() - started,
      });
    }
  });
}
