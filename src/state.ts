/**
 * Module-level session state.
 * Persists across tool calls within a single OpenClaw session.
 */

import { TapKitClient } from './client/tapkit-client.js';
import { requireAuthToken, type PluginConfig } from './auth.js';

let sessionPhoneId: string | null = null;
let client: TapKitClient | null = null;
let currentToken: string | null = null;

export function getSessionPhoneId(): string | null {
  return sessionPhoneId;
}

export function setSessionPhoneId(id: string): void {
  sessionPhoneId = id;
}

export async function getClient(pluginConfig: PluginConfig): Promise<TapKitClient> {
  const token = await requireAuthToken(pluginConfig);
  if (!client || token !== currentToken) {
    client = new TapKitClient(token);
    currentToken = token;
    if (sessionPhoneId) {
      client.setPhoneId(sessionPhoneId);
    }
  }
  return client;
}

export function resetClient(): void {
  client = null;
  currentToken = null;
}
