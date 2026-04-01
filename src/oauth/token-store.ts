/**
 * Token persistence via ~/.tapkit/config.json.
 * Shares the config file with the TapKit CLI so users only log in once.
 */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

export interface StoredOAuthTokens {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  client_id: string;
}

export interface TapKitConfig {
  apiKey?: string;
  phoneId?: string;
  phoneName?: string;
  oauthTokens?: StoredOAuthTokens;
}

const CONFIG_DIR = path.join(os.homedir(), '.tapkit');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

function ensureConfigDir(): void {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { mode: 0o700, recursive: true });
  }
}

export function loadTapKitConfig(): TapKitConfig {
  if (!fs.existsSync(CONFIG_FILE)) {
    return {};
  }
  try {
    const raw = fs.readFileSync(CONFIG_FILE, 'utf-8');
    return JSON.parse(raw) as TapKitConfig;
  } catch {
    return {};
  }
}

export function saveTapKitConfig(config: TapKitConfig): void {
  ensureConfigDir();
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2) + '\n', {
    mode: 0o600,
  });
}

export function getStoredTokens(): StoredOAuthTokens | null {
  const config = loadTapKitConfig();
  return config.oauthTokens ?? null;
}

export function saveTokens(tokens: StoredOAuthTokens): void {
  const config = loadTapKitConfig();
  config.oauthTokens = tokens;
  saveTapKitConfig(config);
}

export function clearTokens(): void {
  const config = loadTapKitConfig();
  delete config.oauthTokens;
  saveTapKitConfig(config);
}
