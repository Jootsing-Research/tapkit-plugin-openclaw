import { Type } from '@sinclair/typebox';
import type { OpenClawPluginApi } from 'openclaw/plugin-sdk/plugin-entry';
import { withToolErrorHandling } from '../util/errors.js';
import { textResult } from '../util/result.js';
import { getClient } from '../state.js';
import { resolvePhoneForTool } from '../phone.js';
import type { PluginConfig } from '../auth.js';

export function registerNavigationTools(api: OpenClawPluginApi) {
  const config = api.config as PluginConfig;

  api.registerTool({
    name: 'tapkit_open_app',
    label: 'TapKit: Open App',
    description: 'Open an app by name on the iPhone (e.g. "Settings", "Safari", "Instagram")',
    parameters: Type.Object({
      app_name: Type.String({ description: 'App name to open' }),
    }),
    execute: withToolErrorHandling(async (_callId, params) => {
      const client = await getClient(config);
      await resolvePhoneForTool(client);
      await client.openApp(params.app_name as string);
      return textResult(`Opened ${params.app_name}`);
    }),
  });

  api.registerTool({
    name: 'tapkit_press_home',
    label: 'TapKit: Press Home',
    description: 'Press the home button to go to the iPhone home screen',
    parameters: Type.Object({}),
    execute: withToolErrorHandling(async () => {
      const client = await getClient(config);
      await resolvePhoneForTool(client);
      await client.pressHome();
      return textResult('Pressed home');
    }),
  });

  api.registerTool({
    name: 'tapkit_spotlight',
    label: 'TapKit: Spotlight',
    description: 'Open Spotlight search on the iPhone, optionally with a search query',
    parameters: Type.Object({
      query: Type.Optional(
        Type.String({ description: 'Search query to type into Spotlight' })
      ),
    }),
    execute: withToolErrorHandling(async (_callId, params) => {
      const client = await getClient(config);
      await resolvePhoneForTool(client);
      await client.spotlight(params.query as string | undefined);
      const msg = params.query
        ? `Opened Spotlight and searched for "${params.query}"`
        : 'Opened Spotlight';
      return textResult(msg);
    }),
  });

  api.registerTool({
    name: 'tapkit_activate_siri',
    label: 'TapKit: Activate Siri',
    description: 'Activate Siri voice assistant on the iPhone',
    parameters: Type.Object({}),
    execute: withToolErrorHandling(async () => {
      const client = await getClient(config);
      await resolvePhoneForTool(client);
      await client.activateSiri();
      return textResult('Siri activated');
    }),
  });
}
