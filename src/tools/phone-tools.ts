import { Type } from '@sinclair/typebox';
import type { OpenClawPluginApi } from 'openclaw/plugin-sdk/plugin-entry';
import { withToolErrorHandling } from '../util/errors.js';
import { textResult } from '../util/result.js';
import { getClient, setSessionPhoneId } from '../state.js';
import { resolvePhoneForTool } from '../phone.js';
import type { PluginConfig } from '../auth.js';

export function registerPhoneTools(api: OpenClawPluginApi) {
  const config = api.config as PluginConfig;

  api.registerTool({
    name: 'tapkit_list_phones',
    label: 'TapKit: List Phones',
    description: 'List all connected iPhone devices',
    parameters: Type.Object({}),
    execute: withToolErrorHandling(async () => {
      const client = getClient(config);
      const phones = await client.listPhones();
      if (phones.length === 0) {
        return textResult('No phones connected.');
      }
      const lines = phones.map(
        (p) =>
          `- ${p.name} (ID: ${p.id})${p.width && p.height ? ` — ${p.width}x${p.height}` : ''}`
      );
      return textResult(`Connected phones:\n${lines.join('\n')}`);
    }),
  });

  api.registerTool({
    name: 'tapkit_select_phone',
    label: 'TapKit: Select Phone',
    description:
      'Select a specific iPhone to control. Required when multiple phones are connected.',
    parameters: Type.Object({
      phone_id: Type.String({ description: 'Phone ID from tapkit_list_phones' }),
    }),
    execute: withToolErrorHandling(async (_callId, params) => {
      const client = getClient(config);
      const phoneId = params.phone_id as string;
      setSessionPhoneId(phoneId);
      client.setPhoneId(phoneId);
      try {
        const info = await client.getPhoneInfo(phoneId);
        client.setScreenDimensions(info.width, info.height);
        return textResult(
          `Selected phone ${info.name} (${phoneId}) — screen ${info.width}x${info.height}`
        );
      } catch {
        return textResult(`Selected phone ${phoneId} (screen dimensions unavailable)`);
      }
    }),
  });

  api.registerTool({
    name: 'tapkit_get_phone_info',
    label: 'TapKit: Get Phone Info',
    description: 'Get screen dimensions and device info for a phone',
    parameters: Type.Object({
      phone_id: Type.Optional(
        Type.String({ description: 'Phone ID (optional if only one phone)' })
      ),
    }),
    execute: withToolErrorHandling(async (_callId, params) => {
      const client = getClient(config);
      const phoneId = params.phone_id as string | undefined;
      if (phoneId) {
        const info = await client.getPhoneInfo(phoneId);
        return textResult(
          `Phone: ${info.name}\nScreen: ${info.width}x${info.height}`
        );
      }
      await resolvePhoneForTool(client);
      const resolved = await client.getPhoneId();
      const info = await client.getPhoneInfo(resolved);
      return textResult(
        `Phone: ${info.name}\nScreen: ${info.width}x${info.height}`
      );
    }),
  });
}
