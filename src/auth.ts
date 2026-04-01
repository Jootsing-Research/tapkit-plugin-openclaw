/**
 * Auth resolution for plugin context.
 * Precedence: TAPKIT_API_KEY env > plugin config apiKey > stored OAuth token > null
 */

import { TapKitAPIError } from './client/tapkit-client.js';
import { getValidAccessToken } from './oauth/login-flow.js';

export interface PluginConfig {
  apiKey?: string;
  callbackUrl?: string;
}

/** Synchronous resolution — env and config only (no OAuth). */
export function resolveApiKey(pluginConfig: PluginConfig): string | null {
  if (process.env.TAPKIT_API_KEY) return process.env.TAPKIT_API_KEY;
  if (pluginConfig.apiKey) return pluginConfig.apiKey;
  return null;
}

/** Async resolution — includes OAuth stored token with auto-refresh. */
export async function resolveAuthToken(pluginConfig: PluginConfig): Promise<string | null> {
  // 1. env var (highest priority)
  if (process.env.TAPKIT_API_KEY) return process.env.TAPKIT_API_KEY;
  // 2. plugin config
  if (pluginConfig.apiKey) return pluginConfig.apiKey;
  // 3. stored OAuth token (auto-refresh)
  const oauthToken = await getValidAccessToken();
  if (oauthToken) return oauthToken;
  // 4. not authenticated
  return null;
}

export async function requireAuthToken(pluginConfig: PluginConfig): Promise<string> {
  const token = await resolveAuthToken(pluginConfig);
  if (!token) {
    throw new TapKitAPIError(
      401,
      'AUTH_REQUIRED',
      'TapKit not authenticated. Run /tapkit login to sign in, or set TAPKIT_API_KEY.'
    );
  }
  return token;
}
