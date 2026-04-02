import { definePluginEntry } from 'openclaw/plugin-sdk/plugin-entry';
import { registerAllTools } from './tools/index.js';
import { getClient, getSessionPhoneId, resetClient } from './state.js';
import { resolveAuthToken } from './auth.js';
import type { PluginConfig } from './auth.js';
import { TapKitAPIError } from './client/tapkit-client.js';
import { saveApiKey, clearApiKey, loadTapKitConfig } from './oauth/token-store.js';

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
          description: 'TapKit API key (get one at tapkit.ai/dashboard).',
        },
      },
    },
    uiHints: {
      apiKey: {
        label: 'API Key',
        help: 'Your TapKit API key. Use /tapkit login <key> to set it.',
        sensitive: true,
        placeholder: 'tk_...',
      },
    },
  },
  register(api) {
    registerAllTools(api);

    api.registerCommand({
      name: 'tapkit',
      description: 'TapKit status and authentication',
      acceptsArgs: true,
      handler: async (ctx) => {
        const args = ctx.args?.trim() || '';
        const parts = args.split(/\s+/);
        const subcommand = parts[0];

        if (subcommand === 'login') {
          const apiKey = parts[1];
          return handleLoginCommand(apiKey);
        }
        if (subcommand === 'logout') {
          return handleLogoutCommand();
        }
        return handleStatusCommand(api.config as PluginConfig);
      },
    });
  },
});

function handleLoginCommand(
  apiKey?: string
): { text: string; isError?: boolean } {
  if (!apiKey) {
    return {
      text: 'Usage: /tapkit login <api_key>\n\nGet your API key from https://tapkit.ai/dashboard\nThen run: /tapkit login tk_your_key_here',
    };
  }

  if (!apiKey.startsWith('tk_') && !apiKey.startsWith('ses_')) {
    return {
      text: 'Invalid API key format. Keys should start with tk_ or ses_.\n\nGet your key from https://tapkit.ai/dashboard',
      isError: true,
    };
  }

  saveApiKey(apiKey);
  resetClient();

  const masked = apiKey.slice(0, 6) + '...' + apiKey.slice(-4);
  return {
    text: `Authenticated. API key saved (${masked}).\n\nYou can now use TapKit tools. Try: tapkit_screenshot`,
  };
}

function handleLogoutCommand(): { text: string } {
  clearApiKey();
  resetClient();
  return { text: 'Logged out of TapKit. Stored API key cleared.' };
}

async function handleStatusCommand(
  pluginConfig: PluginConfig
): Promise<{ text: string; isError?: boolean }> {
  try {
    const token = await resolveAuthToken(pluginConfig);
    if (!token) {
      return {
        text: 'TapKit: Not authenticated.\n\nRun: /tapkit login <api_key>\nGet your key from https://tapkit.ai/dashboard',
      };
    }

    let authSource = 'unknown';
    if (process.env.TAPKIT_API_KEY) {
      authSource = 'environment variable';
    } else if (pluginConfig.apiKey) {
      authSource = 'plugin config';
    } else {
      const config = loadTapKitConfig();
      if (config.apiKey) {
        authSource = 'saved key (~/.tapkit/config.json)';
      }
    }

    const masked = token.slice(0, 6) + '...' + token.slice(-4);

    const client = await getClient(pluginConfig);
    const phones = await client.listPhones();
    const selectedId =
      getSessionPhoneId() || process.env.TAPKIT_PHONE_ID || '(auto)';

    const lines = [
      `Auth: ${masked} (${authSource})`,
      `Phones: ${phones.length} connected`,
      ...phones.map(
        (p) => `  - ${p.name} (${p.id})${p.id === selectedId ? ' [selected]' : ''}`
      ),
      `Selected: ${selectedId}`,
    ];
    return { text: lines.join('\n') };
  } catch (error) {
    const msg =
      error instanceof TapKitAPIError ? error.toUserMessage() : String(error);
    return { text: `TapKit: ${msg}`, isError: true };
  }
}
