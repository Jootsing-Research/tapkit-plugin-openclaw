import { Type } from '@sinclair/typebox';
import type { OpenClawPluginApi } from 'openclaw/plugin-sdk/plugin-entry';
import { withToolErrorHandling } from '../util/errors.js';
import { textResult, imageResult } from '../util/result.js';
import { getClient, setSessionPhoneId } from '../state.js';
import { resolvePhoneForTool } from '../phone.js';
import type { PluginConfig } from '../auth.js';

export function registerDeviceTools(api: OpenClawPluginApi) {
  const config = api.config as PluginConfig;

  api.registerTool({
    name: 'tapkit_screenshot',
    label: 'TapKit: Screenshot',
    description: 'Capture the current iPhone screen as an image',
    parameters: Type.Object({
      phone_id: Type.Optional(
        Type.String({ description: 'Phone ID (optional if only one phone)' })
      ),
    }),
    execute: withToolErrorHandling(async (_callId, params) => {
      const client = await getClient(config);
      if (params.phone_id) {
        const phoneId = params.phone_id as string;
        setSessionPhoneId(phoneId);
        client.setPhoneId(phoneId);
      } else {
        await resolvePhoneForTool(client);
      }
      const buffer = await client.screenshot();
      const base64 = buffer.toString('base64');
      return imageResult(base64);
    }),
  });

  api.registerTool({
    name: 'tapkit_lock',
    label: 'TapKit: Lock',
    description: 'Lock the iPhone screen',
    parameters: Type.Object({}),
    execute: withToolErrorHandling(async () => {
      const client = await getClient(config);
      await resolvePhoneForTool(client);
      await client.lock();
      return textResult('Phone locked');
    }),
  });

  api.registerTool({
    name: 'tapkit_unlock',
    label: 'TapKit: Unlock',
    description: 'Unlock the iPhone screen',
    parameters: Type.Object({
      passcode: Type.Optional(
        Type.String({ description: 'Passcode to unlock (if required)' })
      ),
    }),
    execute: withToolErrorHandling(async (_callId, params) => {
      const client = await getClient(config);
      await resolvePhoneForTool(client);
      await client.unlock(params.passcode as string | undefined);
      return textResult('Phone unlocked');
    }),
  });

  api.registerTool({
    name: 'tapkit_volume_up',
    label: 'TapKit: Volume Up',
    description: 'Increase iPhone volume',
    parameters: Type.Object({}),
    execute: withToolErrorHandling(async () => {
      const client = await getClient(config);
      await resolvePhoneForTool(client);
      await client.volumeUp();
      return textResult('Volume increased');
    }),
  });

  api.registerTool({
    name: 'tapkit_volume_down',
    label: 'TapKit: Volume Down',
    description: 'Decrease iPhone volume',
    parameters: Type.Object({}),
    execute: withToolErrorHandling(async () => {
      const client = await getClient(config);
      await resolvePhoneForTool(client);
      await client.volumeDown();
      return textResult('Volume decreased');
    }),
  });

  api.registerTool({
    name: 'tapkit_run_shortcut',
    label: 'TapKit: Run Shortcut',
    description: 'Run an iOS Shortcut by its index number',
    parameters: Type.Object({
      index: Type.Number({ description: 'Shortcut index number' }),
    }),
    execute: withToolErrorHandling(async (_callId, params) => {
      const client = await getClient(config);
      await resolvePhoneForTool(client);
      await client.runShortcut(params.index as number);
      return textResult(`Ran shortcut #${params.index}`);
    }),
  });

  api.registerTool({
    name: 'tapkit_enable_switch_control',
    label: 'TapKit: Enable Switch Control',
    description: 'Enable Switch Control accessibility feature on the iPhone',
    parameters: Type.Object({}),
    execute: withToolErrorHandling(async () => {
      const client = await getClient(config);
      await resolvePhoneForTool(client);
      await client.enableSwitchControl();
      return textResult('Switch Control enabled');
    }),
  });
}
