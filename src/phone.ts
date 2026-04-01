/**
 * Phone resolution for tool context.
 * Precedence: session phoneId > TAPKIT_PHONE_ID env > client auto-select
 */

import type { TapKitClient } from './client/tapkit-client.js';
import { getSessionPhoneId } from './state.js';

export async function resolvePhoneForTool(client: TapKitClient): Promise<string> {
  const sessionId = getSessionPhoneId();
  if (sessionId) {
    client.setPhoneId(sessionId);
    return sessionId;
  }

  const envPhone = process.env.TAPKIT_PHONE_ID;
  if (envPhone) {
    client.setPhoneId(envPhone);
    return envPhone;
  }

  return client.resolvePhone();
}
