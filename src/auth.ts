/**
 * API key resolution for plugin context.
 * Precedence: TAPKIT_API_KEY env var > plugin config apiKey > null
 */

import { TapKitAPIError } from './client/tapkit-client.js';

export interface PluginConfig {
  apiKey?: string;
}

export function resolveApiKey(pluginConfig: PluginConfig): string | null {
  if (process.env.TAPKIT_API_KEY) return process.env.TAPKIT_API_KEY;
  if (pluginConfig.apiKey) return pluginConfig.apiKey;
  return null;
}

export function requireApiKey(pluginConfig: PluginConfig): string {
  const key = resolveApiKey(pluginConfig);
  if (!key) {
    throw new TapKitAPIError(
      401,
      'AUTH_REQUIRED',
      'TapKit API key not configured. Set TAPKIT_API_KEY env var or configure apiKey in plugin settings.'
    );
  }
  return key;
}
