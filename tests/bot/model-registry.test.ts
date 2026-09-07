/**
 * Choosing a provider.
 *
 * These construct clients but never call one: no request reaches Anthropic or
 * Google (TESTING.md). What is being checked is the selection — that a
 * provider can be swapped by configuration, and that a missing key is caught
 * where it can still be acted on.
 */
import { describe, expect, it } from 'vitest';
import {
  PROVIDERS,
  availableProviders,
  createModel,
  isProviderName,
  MissingProviderKeyError,
} from '../../apps/bot/src/agent/index.js';
import { loadConfig, modelSelection, providerKeys } from '../../apps/bot/src/config.js';

const KEYS = { anthropic: 'sk-test-anthropic', gemini: 'test-gemini-key' };

describe('creating a model from a selection', () => {
  it('builds the provider it was asked for', () => {
    expect(createModel({ provider: 'anthropic' }, KEYS).provider).toBe('anthropic');
    expect(createModel({ provider: 'gemini' }, KEYS).provider).toBe('gemini');
  });

  it('accepts a specific model id for either provider', () => {
    // The id is the adapter's business; the selection just carries it.
    expect(createModel({ provider: 'gemini', model: 'gemini-3.8-flash' }, KEYS).provider).toBe(
      'gemini',
    );
  });

  it('names the missing variable when the key for the choice is absent', () => {
    const error = (() => {
      try {
        createModel({ provider: 'gemini' }, { anthropic: KEYS.anthropic });
      } catch (e) {
        return e as MissingProviderKeyError;
      }
      throw new Error('expected the selection to be rejected');
    })();

    // The alternative symptom is a vendor authentication error with no hint
    // about which key is missing or where it belongs.
    expect(error).toBeInstanceOf(MissingProviderKeyError);
    expect(error.envVar).toBe('GEMINI_API_KEY');
  });

  it('reports which providers this service could actually use', () => {
    expect(availableProviders(KEYS).sort()).toEqual(['anthropic', 'gemini']);
    expect(availableProviders({ gemini: KEYS.gemini })).toEqual(['gemini']);
    expect(availableProviders({})).toEqual([]);
  });

  it('recognises exactly the providers it can build', () => {
    // Guards the case where a name is added to one list and not the other.
    for (const provider of PROVIDERS) {
      expect(isProviderName(provider)).toBe(true);
      expect(() => createModel({ provider }, KEYS)).not.toThrow();
    }
    expect(isProviderName('some-other-vendor')).toBe(false);
  });
});

describe('selecting a provider by configuration', () => {
  const base = {
    DATABASE_URL: 'postgres://bot_user:pw@localhost:5432/db',
    TELEGRAM_WEBHOOK_SECRET: 'a-secret-of-at-least-16-chars',
    TELEGRAM_BOT_TOKEN: 'stub-token',
  };

  it('defaults to anthropic', () => {
    const config = loadConfig({ ...base, ANTHROPIC_API_KEY: KEYS.anthropic } as NodeJS.ProcessEnv);
    expect(modelSelection(config)).toEqual({ provider: 'anthropic' });
  });

  it('switches provider on one variable', () => {
    const config = loadConfig({
      ...base,
      MODEL_PROVIDER: 'gemini',
      GEMINI_API_KEY: KEYS.gemini,
    } as NodeJS.ProcessEnv);

    // The whole point of the registry: this is the only change required.
    expect(modelSelection(config)).toEqual({ provider: 'gemini' });
    expect(createModel(modelSelection(config), providerKeys(config)).provider).toBe('gemini');
  });

  it('carries a specific model id through', () => {
    const config = loadConfig({
      ...base,
      MODEL_PROVIDER: 'gemini',
      MODEL_NAME: 'gemini-3.8-flash',
      GEMINI_API_KEY: KEYS.gemini,
    } as NodeJS.ProcessEnv);

    expect(modelSelection(config)).toEqual({ provider: 'gemini', model: 'gemini-3.8-flash' });
  });

  it('refuses to start when the selected provider has no key', () => {
    // At boot, not on the first guest message: a service that started
    // without it would look healthy and fail the moment someone wrote in.
    expect(() =>
      loadConfig({
        ...base,
        MODEL_PROVIDER: 'gemini',
        ANTHROPIC_API_KEY: KEYS.anthropic,
      } as NodeJS.ProcessEnv),
    ).toThrow(/no key for it is set/);
  });

  it('allows holding a key for a provider it is not currently using', () => {
    const config = loadConfig({
      ...base,
      MODEL_PROVIDER: 'anthropic',
      ANTHROPIC_API_KEY: KEYS.anthropic,
      GEMINI_API_KEY: KEYS.gemini,
    } as NodeJS.ProcessEnv);

    // Both keys present is how a switch happens without a redeploy.
    expect(availableProviders(providerKeys(config)).sort()).toEqual(['anthropic', 'gemini']);
  });
});
