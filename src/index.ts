import { definePluginEntry } from 'openclaw/plugin-sdk/plugin-entry';
import { registerAllTools } from './tools/index.js';
import { getClient, getSessionPhoneId } from './state.js';
import { resolveApiKey } from './auth.js';
import { TapKitAPIError } from './client/tapkit-client.js';

export default definePluginEntry({
  id: 'tapkit',
  name: 'TapKit',
  description:
    'iPhone automation — control real iPhones with taps, swipes, screenshots, and app navigation',
  configSchema: {
    validate(value: unknown) {
      if (value === undefined || value === null) return { ok: true as const };
      if (typeof value !== 'object') return { ok: false as const, errors: ['Config must be an object'] };
      const obj = value as Record<string, unknown>;
      if (obj.apiKey !== undefined && typeof obj.apiKey !== 'string') {
        return { ok: false as const, errors: ['apiKey must be a string'] };
      }
      return { ok: true as const, value: obj };
    },
    jsonSchema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        apiKey: {
          type: 'string',
          description:
            'TapKit API key (get one at tapkit.ai). Can also use TAPKIT_API_KEY env var.',
        },
      },
    },
    uiHints: {
      apiKey: {
        label: 'API Key',
        help: 'Your TapKit API key from tapkit.ai. Alternatively set TAPKIT_API_KEY env var.',
        sensitive: true,
        placeholder: 'tk_...',
      },
    },
  },
  register(api) {
    registerAllTools(api);

    api.registerCommand({
      name: 'tapkit',
      description: 'Show TapKit status — API key, connected phones, selected phone',
      handler: async () => {
        try {
          const config = api.config as { apiKey?: string };
          const apiKey = resolveApiKey(config);
          if (!apiKey) {
            return {
              text: 'TapKit: Not configured. Set TAPKIT_API_KEY env var or configure apiKey in plugin settings.',
            };
          }

          const client = getClient(config);
          const phones = await client.listPhones();
          const selectedId =
            getSessionPhoneId() || process.env.TAPKIT_PHONE_ID || '(auto)';

          const lines = [
            `API Key: ${apiKey.slice(0, 6)}...`,
            `Phones: ${phones.length} connected`,
            ...phones.map(
              (p) =>
                `  - ${p.name} (${p.id})${p.id === selectedId ? ' [selected]' : ''}`
            ),
            `Selected: ${selectedId}`,
          ];
          return { text: lines.join('\n') };
        } catch (error) {
          const msg =
            error instanceof TapKitAPIError
              ? error.toUserMessage()
              : String(error);
          return { text: `TapKit: ${msg}`, isError: true };
        }
      },
    });
  },
});
