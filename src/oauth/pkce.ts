/**
 * PKCE (Proof Key for Code Exchange) utilities for OAuth 2.0.
 * Uses Node.js crypto — no external dependencies.
 */

import { randomBytes, createHash } from 'node:crypto';

function base64url(buffer: Buffer): string {
  return buffer.toString('base64url');
}

export function generateCodeVerifier(): string {
  return base64url(randomBytes(32));
}

export function generateCodeChallenge(verifier: string): string {
  const hash = createHash('sha256').update(verifier).digest();
  return base64url(hash);
}

export function generateState(): string {
  return randomBytes(16).toString('hex');
}
