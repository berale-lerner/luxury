/**
 * The bot's MiniHotel settings: optional as a group, all-or-nothing within it.
 * Without them the agent is not offered the availability tool at all.
 */
import { describe, expect, it } from 'vitest';
import { loadConfig, miniHotelSettings } from '../../apps/bot/src/config.js';

const REQUIRED = {
  DATABASE_URL: 'postgres://x',
  TELEGRAM_WEBHOOK_SECRET: 'a-secret-of-at-least-16',
  TELEGRAM_BOT_TOKEN: 'token',
  MODEL_PROVIDER: 'gemini',
  GEMINI_API_KEY: 'key',
};

describe("the bot's MiniHotel settings", () => {
  it('are optional: without them there is no MiniHotel, and so no tool', () => {
    expect(miniHotelSettings(loadConfig({ ...REQUIRED }))).toBeNull();
  });

  it('treat the empty values in .env.example as unset', () => {
    const config = loadConfig({
      ...REQUIRED,
      MINIHOTEL_USERNAME: '',
      MINIHOTEL_PASSWORD: '',
      MINIHOTEL_HOTEL_ID: '',
      MINIHOTEL_RATE_CODE: '',
      MINIHOTEL_ARI_URL: '',
    });
    expect(miniHotelSettings(config)).toBeNull();
  });

  it('refuse to start with only some of the credentials, naming what is missing and not the values', () => {
    expect(() => loadConfig({ ...REQUIRED, MINIHOTEL_PASSWORD: 'the-real-password' })).toThrow(
      /MINIHOTEL_USERNAME, MINIHOTEL_HOTEL_ID/,
    );
    expect(() => loadConfig({ ...REQUIRED, MINIHOTEL_PASSWORD: 'the-real-password' })).toThrow(
      /^(?!.*the-real-password)/s,
    );
  });

  it('default to production and the USD rate code', () => {
    const settings = miniHotelSettings(
      loadConfig({ ...REQUIRED, MINIHOTEL_USERNAME: 'u', MINIHOTEL_PASSWORD: 'p', MINIHOTEL_HOTEL_ID: 'luxury50' }),
    );
    expect(settings).toEqual({ credentials: { username: 'u', password: 'p', hotelId: 'luxury50' }, rateCode: 'USD' });
  });
});
