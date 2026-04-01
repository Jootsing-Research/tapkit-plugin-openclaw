/**
 * Module-level session state.
 * Persists across tool calls within a single OpenClaw session.
 */

import { TapKitClient } from './client/tapkit-client.js';
import { requireApiKey, type PluginConfig } from './auth.js';

let sessionPhoneId: string | null = null;
let client: TapKitClient | null = null;
let currentApiKey: string | null = null;

export function getSessionPhoneId(): string | null {
  return sessionPhoneId;
}

export function setSessionPhoneId(id: string): void {
  sessionPhoneId = id;
}

export function getClient(pluginConfig: PluginConfig): TapKitClient {
  const apiKey = requireApiKey(pluginConfig);
  if (!client || apiKey !== currentApiKey) {
    client = new TapKitClient(apiKey);
    currentApiKey = apiKey;
    if (sessionPhoneId) {
      client.setPhoneId(sessionPhoneId);
    }
  }
  return client;
}
