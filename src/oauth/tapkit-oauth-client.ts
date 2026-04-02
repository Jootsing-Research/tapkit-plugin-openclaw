/**
 * HTTP client for TapKit's OAuth 2.0 endpoints at mcp.tapkit.ai.
 */

const DEFAULT_MCP_URL = 'https://mcp.tapkit.ai';

function getMcpUrl(): string {
  return process.env.TAPKIT_MCP_URL || DEFAULT_MCP_URL;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  scope: string;
}

export interface RegisterClientResponse {
  client_id: string;
  client_id_issued_at: number;
  redirect_uris: string[];
  client_name: string;
  scope: string;
  grant_types: string[];
  response_types: string[];
  token_endpoint_auth_method: string;
}

export async function registerClient(
  redirectUri: string
): Promise<RegisterClientResponse> {
  const res = await fetch(`${getMcpUrl()}/oauth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      redirect_uris: [redirectUri],
      client_name: 'tapkit-openclaw',
      grant_types: ['authorization_code', 'refresh_token'],
      response_types: ['code'],
      token_endpoint_auth_method: 'none',
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`OAuth client registration failed (${res.status}): ${body}`);
  }

  return res.json() as Promise<RegisterClientResponse>;
}

export async function exchangeCode(params: {
  code: string;
  redirectUri: string;
  clientId: string;
  codeVerifier: string;
}): Promise<TokenResponse> {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code: params.code,
    redirect_uri: params.redirectUri,
    client_id: params.clientId,
    code_verifier: params.codeVerifier,
  });

  const res = await fetch(`${getMcpUrl()}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token exchange failed (${res.status}): ${text}`);
  }

  return res.json() as Promise<TokenResponse>;
}

export async function refreshTokens(params: {
  refreshToken: string;
}): Promise<TokenResponse> {
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: params.refreshToken,
  });

  const res = await fetch(`${getMcpUrl()}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token refresh failed (${res.status}): ${text}`);
  }

  return res.json() as Promise<TokenResponse>;
}

export function buildAuthorizeUrl(params: {
  clientId: string;
  redirectUri: string;
  state: string;
  codeChallenge: string;
}): string {
  const url = new URL(`${getMcpUrl()}/oauth/authorize`);
  url.searchParams.set('client_id', params.clientId);
  url.searchParams.set('redirect_uri', params.redirectUri);
  url.searchParams.set('state', params.state);
  url.searchParams.set('code_challenge', params.codeChallenge);
  url.searchParams.set('code_challenge_method', 'S256');
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', 'phone:read phone:control');
  return url.toString();
}
