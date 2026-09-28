import type { MiniHotelClient } from '@luxury/minihotel';
import { createAvailabilityService } from './availability.js';
import type { Dashboards } from './routes.js';
import { createTodayService } from './today.js';

/** Every MiniHotel dashboard, over one client. */
export function createDashboards(options: {
  readonly client: MiniHotelClient;
  readonly rateCode: string;
  readonly timeZone: string;
}): Dashboards {
  return {
    availability: createAvailabilityService(options),
    today: createTodayService({ client: options.client, timeZone: options.timeZone }),
  };
}
