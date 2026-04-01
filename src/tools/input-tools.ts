import { Type } from '@sinclair/typebox';
import type { OpenClawPluginApi } from 'openclaw/plugin-sdk/plugin-entry';
import { withToolErrorHandling } from '../util/errors.js';
import { textResult } from '../util/result.js';
import { getClient } from '../state.js';
import { resolvePhoneForTool } from '../phone.js';
import type { PluginConfig } from '../auth.js';

export function registerInputTools(api: OpenClawPluginApi) {
  const config = api.config as PluginConfig;

  api.registerTool({
    name: 'tapkit_copy_text_to_phone',
    label: 'TapKit: Copy Text to Phone',
    description:
      'Copy text to the iPhone clipboard for pasting into text fields. Use long_press on a text field then tap "Paste" to input text.',
    parameters: Type.Object({
      text: Type.String({ description: 'Text to copy to the phone clipboard' }),
    }),
    execute: withToolErrorHandling(async (_callId, params) => {
      const client = await getClient(config);
      await resolvePhoneForTool(client);
      await client.typeText(params.text as string);
      return textResult(`Copied text to phone clipboard: "${params.text}"`);
    }),
  });

  api.registerTool({
    name: 'tapkit_escape',
    label: 'TapKit: Escape',
    description: 'Dismiss keyboard, modal, or popup on the iPhone screen',
    parameters: Type.Object({}),
    execute: withToolErrorHandling(async () => {
      const client = await getClient(config);
      await resolvePhoneForTool(client);
      await client.escape();
      return textResult('Escape sent');
    }),
  });
}
