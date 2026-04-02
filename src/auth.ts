/**
 * Auth resolution for plugin context.
 * Precedence: TAPKIT_API_KEY env > plugin config apiKey > stored API key (~/.tapkit) > null
 */

import { TapKitAPIError } from './client/tapkit-client.js';
import { getStoredApiKey } from './oauth/token-store.js';

export interface PluginConfig {
  apiKey?: string;
}

/** Synchronous resolution — env, config, and stored key. */
export function resolveApiKey(pluginConfig: PluginConfig): string | null {
  if (process.env.TAPKIT_API_KEY) return process.env.TAPKIT_API_KEY;
  if (pluginConfig.apiKey) return pluginConfig.apiKey;
  const stored = getStoredApiKey();
  if (stored) return stored;
  return null;
}

/** Async resolution — same as resolveApiKey for now, async for future OAuth. */
export async function resolveAuthToken(pluginConfig: PluginConfig): Promise<string | null> {
  return resolveApiKey(pluginConfig);
}

export async function requireAuthToken(pluginConfig: PluginConfig): Promise<string> {
  const token = await resolveAuthToken(pluginConfig);
  if (!token) {
    throw new TapKitAPIError(
      401,
      'AUTH_REQUIRED',
      'TapKit not authenticated. Run /tapkit login <api_key> to sign in.'
    );
  }
  return token;
}
