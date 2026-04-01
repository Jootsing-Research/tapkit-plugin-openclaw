/**
 * OAuth login flow orchestration.
 * Bridges the /tapkit login command (async) with the HTTP callback handler.
 */

import type { IncomingMessage, ServerResponse } from 'node:http';
import { generateCodeVerifier, generateCodeChallenge, generateState } from './pkce.js';
import {
  registerClient,
  exchangeCode,
  refreshTokens,
  buildAuthorizeUrl,
} from './tapkit-oauth-client.js';
import { getStoredTokens, saveTokens, clearTokens } from './token-store.js';
import type { StoredOAuthTokens } from './token-store.js';

interface PendingLogin {
  state: string;
  codeVerifier: string;
  clientId: string;
  callbackUrl: string;
}

let pendingLogin: PendingLogin | null = null;

// Simple mutex for token refresh to avoid concurrent refreshes
let refreshPromise: Promise<string | null> | null = null;

/**
 * Initiate the OAuth login flow.
 * Returns the authorization URL the user should visit.
 */
export async function startLogin(opts: {
  gatewayPort?: number;
  callbackUrl?: string;
}): Promise<{ authorizeUrl: string }> {
  const callbackUrl =
    process.env.TAPKIT_CALLBACK_URL ||
    opts.callbackUrl ||
    `http://localhost:${opts.gatewayPort ?? 18789}/api/plugins/tapkit/oauth/callback`;

  const codeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);
  const state = generateState();

  const { client_id } = await registerClient(callbackUrl);

  pendingLogin = {
    state,
    codeVerifier,
    clientId: client_id,
    callbackUrl,
  };

  const authorizeUrl = buildAuthorizeUrl({
    clientId: client_id,
    redirectUri: callbackUrl,
    state,
    codeChallenge,
  });

  return { authorizeUrl };
}

/**
 * HTTP route handler for the OAuth callback.
 * Registered at /api/plugins/tapkit/oauth/callback on the Gateway.
 */
export async function handleOAuthCallback(
  req: IncomingMessage,
  res: ServerResponse
): Promise<boolean> {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');

  if (error) {
    const desc = url.searchParams.get('error_description') || error;
    serveHtml(res, 400, 'Login Failed', `<p>${escapeHtml(desc)}</p><p>Close this tab and try <code>/tapkit login</code> again.</p>`);
    return true;
  }

  if (!code || !state) {
    serveHtml(res, 400, 'Login Failed', '<p>Missing authorization code or state parameter.</p>');
    return true;
  }

  if (!pendingLogin || state !== pendingLogin.state) {
    serveHtml(res, 400, 'Login Failed', '<p>Invalid or expired login session. Run <code>/tapkit login</code> again.</p>');
    return true;
  }

  try {
    const tokens = await exchangeCode({
      code,
      redirectUri: pendingLogin.callbackUrl,
      clientId: pendingLogin.clientId,
      codeVerifier: pendingLogin.codeVerifier,
    });

    const stored: StoredOAuthTokens = {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: Date.now() + tokens.expires_in * 1000,
      client_id: pendingLogin.clientId,
    };

    saveTokens(stored);
    pendingLogin = null;

    serveHtml(res, 200, 'Login Successful', '<p>You are now authenticated with TapKit. You can close this tab.</p>');
    return true;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    serveHtml(res, 500, 'Login Failed', `<p>Token exchange failed: ${escapeHtml(msg)}</p><p>Run <code>/tapkit login</code> to try again.</p>`);
    pendingLogin = null;
    return true;
  }
}

/**
 * Get a valid OAuth access token, auto-refreshing if needed.
 * Returns null if no tokens stored or refresh fails.
 */
export async function getValidAccessToken(): Promise<string | null> {
  const tokens = getStoredTokens();
  if (!tokens) return null;

  // Token still valid (with 5-minute buffer)
  const FIVE_MINUTES = 5 * 60 * 1000;
  if (tokens.expires_at > Date.now() + FIVE_MINUTES) {
    return tokens.access_token;
  }

  // Need to refresh — use mutex to avoid concurrent refreshes
  if (refreshPromise) return refreshPromise;

  refreshPromise = doRefresh(tokens).finally(() => {
    refreshPromise = null;
  });

  return refreshPromise;
}

async function doRefresh(tokens: StoredOAuthTokens): Promise<string | null> {
  try {
    const newTokens = await refreshTokens({
      refreshToken: tokens.refresh_token,
    });

    const stored: StoredOAuthTokens = {
      access_token: newTokens.access_token,
      refresh_token: newTokens.refresh_token,
      expires_at: Date.now() + newTokens.expires_in * 1000,
      client_id: tokens.client_id,
    };

    saveTokens(stored);
    return stored.access_token;
  } catch {
    // Refresh failed — clear tokens so user re-authenticates
    clearTokens();
    return null;
  }
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function serveHtml(res: ServerResponse, status: number, title: string, body: string): void {
  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>TapKit — ${escapeHtml(title)}</title>
<style>body{font-family:system-ui,sans-serif;max-width:480px;margin:80px auto;text-align:center}
h1{font-size:1.5rem}code{background:#f0f0f0;padding:2px 6px;border-radius:3px}</style>
</head><body><h1>${escapeHtml(title)}</h1>${body}</body></html>`;
  res.writeHead(status, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(html);
}
