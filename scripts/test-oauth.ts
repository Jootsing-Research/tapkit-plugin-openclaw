#!/usr/bin/env tsx
/**
 * Test script for OAuth modules.
 * Run: npx tsx scripts/test-oauth.ts
 */

import { generateCodeVerifier, generateCodeChallenge, generateState } from '../src/oauth/pkce.js';
import { registerClient, buildAuthorizeUrl } from '../src/oauth/tapkit-oauth-client.js';
import { loadTapKitConfig, saveTapKitConfig, saveTokens, getStoredTokens, clearTokens } from '../src/oauth/token-store.js';
import { resolveAuthToken } from '../src/auth.js';

let passed = 0;
let failed = 0;

function assert(condition: boolean, label: string) {
  if (condition) {
    console.log(`  ✓ ${label}`);
    passed++;
  } else {
    console.log(`  ✗ ${label}`);
    failed++;
  }
}

async function testPkce() {
  console.log('\n— PKCE —');
  const verifier = generateCodeVerifier();
  assert(verifier.length >= 32, `verifier length ${verifier.length} >= 32`);
  assert(!/[+/=]/.test(verifier), 'verifier is base64url (no +/= chars)');

  const challenge = generateCodeChallenge(verifier);
  assert(challenge.length > 0, `challenge generated: ${challenge.slice(0, 20)}...`);
  assert(!/[+/=]/.test(challenge), 'challenge is base64url');

  const challenge2 = generateCodeChallenge(verifier);
  assert(challenge === challenge2, 'same verifier produces same challenge');

  const differentVerifier = generateCodeVerifier();
  const differentChallenge = generateCodeChallenge(differentVerifier);
  assert(challenge !== differentChallenge, 'different verifier produces different challenge');

  const state = generateState();
  assert(state.length === 32, `state is 32 hex chars: ${state}`);
  assert(/^[0-9a-f]+$/.test(state), 'state is hex');

  const state2 = generateState();
  assert(state !== state2, 'states are unique');
}

async function testTokenStore() {
  console.log('\n— Token Store —');
  const config = loadTapKitConfig();
  assert(typeof config === 'object', 'loadTapKitConfig returns object');

  // Save test tokens
  const testTokens = {
    access_token: 'test_access_123',
    refresh_token: 'test_refresh_456',
    expires_at: Date.now() + 3600000,
    client_id: 'mcp_test_client',
  };
  saveTokens(testTokens);
  const stored = getStoredTokens();
  assert(stored !== null, 'tokens stored successfully');
  assert(stored?.access_token === 'test_access_123', 'access_token matches');
  assert(stored?.refresh_token === 'test_refresh_456', 'refresh_token matches');
  assert(stored?.client_id === 'mcp_test_client', 'client_id matches');

  // Verify existing config fields preserved
  const fullConfig = loadTapKitConfig();
  assert(fullConfig.oauthTokens?.access_token === 'test_access_123', 'tokens in full config');

  // Clear tokens
  clearTokens();
  const cleared = getStoredTokens();
  assert(cleared === null, 'tokens cleared');

  // Verify config still loadable
  const afterClear = loadTapKitConfig();
  assert(afterClear.oauthTokens === undefined, 'oauthTokens removed from config');
}

async function testAuthResolution() {
  console.log('\n— Auth Resolution —');

  // With no auth configured and no stored tokens
  clearTokens();
  const noAuth = await resolveAuthToken({});
  assert(noAuth === null, 'no auth returns null');

  // With plugin config apiKey
  const withKey = await resolveAuthToken({ apiKey: 'tk_test_key' });
  assert(withKey === 'tk_test_key', 'plugin config apiKey resolves');

  // With stored OAuth token
  saveTokens({
    access_token: 'oauth_test_token',
    refresh_token: 'refresh_test',
    expires_at: Date.now() + 3600000, // 1 hour from now
    client_id: 'mcp_test',
  });
  const withOAuth = await resolveAuthToken({});
  assert(withOAuth === 'oauth_test_token', 'stored OAuth token resolves');

  // Plugin config takes precedence over stored OAuth
  const precedence = await resolveAuthToken({ apiKey: 'tk_override' });
  assert(precedence === 'tk_override', 'apiKey takes precedence over OAuth');

  // Clean up
  clearTokens();
}

async function testOAuthClientRegistration() {
  console.log('\n— OAuth Client Registration (live call to mcp.tapkit.ai) —');
  try {
    const result = await registerClient('http://localhost:18789/api/plugins/tapkit/oauth/callback');
    assert(result.client_id.startsWith('mcp_'), `client_id: ${result.client_id}`);
    assert(result.redirect_uris.length > 0, 'redirect_uris present');
    assert(result.client_name === 'tapkit-openclaw', `client_name: ${result.client_name}`);
    console.log('  (registered successfully with mcp.tapkit.ai)');
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.log(`  ⚠ Skipped (network error): ${msg}`);
  }
}

async function testAuthorizeUrlGeneration() {
  console.log('\n— Authorize URL —');
  const url = buildAuthorizeUrl({
    clientId: 'mcp_test_123',
    redirectUri: 'http://localhost:18789/callback',
    state: 'test_state_abc',
    codeChallenge: 'test_challenge_xyz',
  });
  assert(url.includes('mcp.tapkit.ai/oauth/authorize'), 'correct base URL');
  assert(url.includes('client_id=mcp_test_123'), 'client_id in URL');
  assert(url.includes('state=test_state_abc'), 'state in URL');
  assert(url.includes('code_challenge=test_challenge_xyz'), 'code_challenge in URL');
  assert(url.includes('code_challenge_method=S256'), 'PKCE method S256');
  assert(url.includes('response_type=code'), 'response_type=code');
  console.log(`  URL: ${url.slice(0, 80)}...`);
}

async function main() {
  console.log('TapKit OpenClaw Plugin — OAuth Test Suite\n');

  await testPkce();
  await testTokenStore();
  await testAuthResolution();
  await testAuthorizeUrlGeneration();
  await testOAuthClientRegistration();

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error('Test runner error:', err);
  process.exit(1);
});
