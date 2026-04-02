import { definePluginEntry } from 'openclaw/plugin-sdk/plugin-entry';
import type { OpenClawConfig } from 'openclaw/plugin-sdk/plugin-entry';
import { registerAllTools } from './tools/index.js';
import { getClient, getSessionPhoneId, resetClient } from './state.js';
import { resolveApiKey, resolveAuthToken } from './auth.js';
import type { PluginConfig } from './auth.js';
import { TapKitAPIError } from './client/tapkit-client.js';
import { startLogin, handleOAuthCallback } from './oauth/login-flow.js';
import { clearTokens, getStoredTokens } from './oauth/token-store.js';

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
      if (obj.callbackUrl !== undefined && typeof obj.callbackUrl !== 'string') {
        return { ok: false as const, errors: ['callbackUrl must be a string'] };
      }
      return { ok: true as const, value: obj };
    },
    jsonSchema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        apiKey: {
          type: 'string',
          description: 'TapKit API key (get one at tapkit.ai). Can also use TAPKIT_API_KEY env var.',
        },
        callbackUrl: {
          type: 'string',
          description: 'Override OAuth callback URL for non-localhost deployments.',
        },
      },
    },
    uiHints: {
      apiKey: {
        label: 'API Key',
        help: 'Your TapKit API key. Alternatively use /tapkit login for browser-based auth.',
        sensitive: true,
        placeholder: 'tk_...',
      },
      callbackUrl: {
        label: 'OAuth Callback URL',
        help: 'Only needed for remote/non-localhost Gateway deployments.',
        advanced: true,
      },
    },
  },
  register(api) {
    registerAllTools(api);

    // OAuth callback route
    api.registerHttpRoute({
      path: '/api/plugins/tapkit/oauth/callback',
      auth: 'plugin',
      match: 'exact',
      handler: handleOAuthCallback,
    });

    api.registerCommand({
      name: 'tapkit',
      description: 'TapKit status, login, and configuration',
      acceptsArgs: true,
      handler: async (ctx) => {
        const subcommand = ctx.args?.trim().split(/\s+/)[0];

        if (subcommand === 'login') {
          return handleLoginCommand(api.config as PluginConfig, ctx.config);
        }
        if (subcommand === 'logout') {
          return handleLogoutCommand();
        }
        return handleStatusCommand(api.config as PluginConfig);
      },
    });
  },
});

async function handleLoginCommand(
  pluginConfig: PluginConfig,
  openclawConfig: OpenClawConfig
): Promise<{ text: string; isError?: boolean }> {
  try {
    const gatewayPort = (openclawConfig as Record<string, unknown> & { gateway?: { port?: number } }).gateway?.port ?? 18789;
    const { authorizeUrl } = await startLogin({
      gatewayPort,
      callbackUrl: pluginConfig.callbackUrl,
    });

    return {
      text: `Visit this URL to log in to TapKit:\n\n${authorizeUrl}`,
    };
  } catch (error) {
    return {
      text: `Login failed: ${error instanceof Error ? error.message : String(error)}`,
      isError: true,
    };
  }
}

function handleLogoutCommand(): { text: string } {
  clearTokens();
  resetClient();
  return { text: 'Logged out of TapKit. Stored tokens cleared.' };
}

async function handleStatusCommand(
  pluginConfig: PluginConfig
): Promise<{ text: string; isError?: boolean }> {
  try {
    const token = await resolveAuthToken(pluginConfig);
    if (!token) {
      return {
        text: 'TapKit: Not authenticated.\n\nRun /tapkit login to sign in with your browser, or set TAPKIT_API_KEY.',
      };
    }

    // Determine auth source
    let authSource = 'unknown';
    if (process.env.TAPKIT_API_KEY) {
      authSource = 'environment variable';
    } else if (pluginConfig.apiKey) {
      authSource = 'plugin config';
    } else {
      const stored = getStoredTokens();
      if (stored) {
        const minutesLeft = Math.round((stored.expires_at - Date.now()) / 60000);
        authSource = `OAuth (expires in ${minutesLeft}m)`;
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
