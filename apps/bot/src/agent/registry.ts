import type { ModelClient } from './model.js';
import { createAnthropicModel } from './providers/anthropic.js';
import { createGeminiModel } from './providers/gemini.js';

/**
 * Choosing which model answers.
 *
 * The choice is expressed as a plain description — a provider name and
 * optionally a model id — and turned into a ModelClient here. Nothing about
 * that description is tied to where it came from, which is the point: today
 * it comes from the service's environment, and when the admin screen grows a
 * model setting it will come from a row in the database instead. That change
 * touches this file's caller and nothing else.
 *
 * Adding a provider means an adapter under providers/ and an entry below.
 * The adapters construct their own vendor clients, so no SDK is imported
 * here and the boundary test that enforces that keeps holding.
 */

export const PROVIDERS = ['anthropic', 'gemini'] as const;
export type ProviderName = (typeof PROVIDERS)[number];

export function isProviderName(value: string): value is ProviderName {
  return (PROVIDERS as readonly string[]).includes(value);
}

/** What has to be decided to pick a model. Serialisable on purpose. */
export interface ModelSelection {
  readonly provider: ProviderName;
  /** Falls back to the adapter's default when omitted. */
  readonly model?: string;
}

/** The keys available to this service. A provider with no key cannot be used. */
export interface ProviderKeys {
  readonly anthropic?: string | undefined;
  readonly gemini?: string | undefined;
}

export function createModel(selection: ModelSelection, keys: ProviderKeys): ModelClient {
  switch (selection.provider) {
    case 'anthropic': {
      const apiKey = required(keys.anthropic, 'anthropic', 'ANTHROPIC_API_KEY');
      return createAnthropicModel({
        apiKey,
        ...(selection.model ? { model: selection.model } : {}),
      });
    }
    case 'gemini': {
      const apiKey = required(keys.gemini, 'gemini', 'GEMINI_API_KEY');
      return createGeminiModel({
        apiKey,
        ...(selection.model ? { model: selection.model } : {}),
      });
    }
  }
}

/** Which providers this service could actually use, given the keys it holds. */
export function availableProviders(keys: ProviderKeys): ProviderName[] {
  return PROVIDERS.filter((provider) => Boolean(keys[provider]));
}

function required(value: string | undefined, provider: ProviderName, envVar: string): string {
  if (!value) {
    // Naming the variable matters: the alternative symptom is an
    // authentication error from a vendor with no hint about which key is
    // missing or where it belongs.
    throw new MissingProviderKeyError(provider, envVar);
  }
  return value;
}

export class MissingProviderKeyError extends Error {
  constructor(
    readonly provider: ProviderName,
    readonly envVar: string,
  ) {
    super(`No API key for ${provider}. Set ${envVar} on this service.`);
    this.name = 'MissingProviderKeyError';
  }
}
