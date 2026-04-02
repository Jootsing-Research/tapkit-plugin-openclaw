/**
 * TapKit API Client
 * Copied from tapkit-cli/src/tapkit-client.ts for OpenClaw plugin use.
 * No sharp dependency — screenshots return raw PNG buffers.
 *
 * TODO: Extract into @jootsing/tapkit-sdk and import as a dependency.
 */

const DEFAULT_API_URL = 'https://api.tapkit.ai/v1';

function getApiUrl(): string {
  return process.env.TAPKIT_API_URL || DEFAULT_API_URL;
}

export interface Phone {
  id: string;
  name: string;
  unique_id: string;
  phone_number: string | null;
  width?: number;
  height?: number;
}

export interface PhoneInfo {
  width: number;
  height: number;
  name: string;
}

export interface TapResult {
  success: boolean;
  job_id?: string;
}

export interface TapKitError {
  error: string;
  message: string;
}

export const MAX_LONG_EDGE = 1344;

export interface ScreenScaling {
  nativeWidth: number;
  nativeHeight: number;
  scaledWidth: number;
  scaledHeight: number;
  scaleFactor: number;
}

export class TapKitClient {
  private authToken: string;
  private phoneId: string | null = null;
  private scaling: ScreenScaling | null = null;

  constructor(authToken: string) {
    this.authToken = authToken;
  }

  private async request<T>(
    method: string,
    endpoint: string,
    body?: Record<string, unknown>
  ): Promise<T> {
    const url = `${getApiUrl()}${endpoint}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.authToken.startsWith('tk_') || this.authToken.startsWith('ses_')) {
      headers['X-API-Key'] = this.authToken;
    } else {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }

    let response: Response;
    try {
      response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });
    } catch (fetchError) {
      throw new TapKitAPIError(
        0,
        'NETWORK_ERROR',
        fetchError instanceof Error ? fetchError.message : 'Network request failed'
      );
    }

    if (!response.ok) {
      let errorCode = 'UNKNOWN_ERROR';
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;

      try {
        const responseBody = await response.json() as Record<string, unknown>;
        const errorData = (responseBody.detail || responseBody) as Record<string, string>;
        if (errorData.error) errorCode = errorData.error;
        if (errorData.message) errorMessage = errorData.message;
      } catch {
        // Response wasn't JSON, use defaults
      }

      throw new TapKitAPIError(response.status, errorCode, errorMessage);
    }

    // Screenshot endpoint returns binary
    if (endpoint.includes('/screenshot')) {
      const buffer = await response.arrayBuffer();
      return Buffer.from(buffer) as unknown as T;
    }

    return response.json() as Promise<T>;
  }

  setPhoneId(phoneId: string): void {
    this.phoneId = phoneId;
  }

  setScreenDimensions(nativeWidth: number, nativeHeight: number): void {
    const longest = Math.max(nativeWidth, nativeHeight);
    const scaleFactor = Math.min(1.0, MAX_LONG_EDGE / longest);
    this.scaling = {
      nativeWidth,
      nativeHeight,
      scaledWidth: Math.round(nativeWidth * scaleFactor),
      scaledHeight: Math.round(nativeHeight * scaleFactor),
      scaleFactor,
    };
  }

  getScaling(): ScreenScaling | null {
    return this.scaling;
  }

  toNative(x: number, y: number): { x: number; y: number } {
    if (!this.scaling) return { x, y };
    return {
      x: Math.round(x / this.scaling.scaleFactor),
      y: Math.round(y / this.scaling.scaleFactor),
    };
  }

  async getPhoneId(): Promise<string> {
    if (this.phoneId) return this.phoneId;
    throw new TapKitAPIError(
      400,
      'NO_PHONE_SELECTED',
      'No phone selected. Use the tapkit_select_phone tool or set TAPKIT_PHONE_ID.'
    );
  }

  async resolvePhone(phoneId?: string): Promise<string> {
    if (phoneId) {
      this.phoneId = phoneId;
      try {
        const info = await this.getPhoneInfo(phoneId);
        this.setScreenDimensions(info.width, info.height);
      } catch {
        // Scaling unavailable
      }
      return phoneId;
    }

    if (this.phoneId) return this.phoneId;

    const phones = await this.listPhones();
    if (phones.length === 0) {
      throw new TapKitAPIError(
        404,
        'NO_PHONES_CONNECTED',
        'No phones are connected. Please ensure TapKit is running and a phone is connected.'
      );
    }

    if (phones.length === 1) {
      const phone = phones[0];
      this.phoneId = phone.id;
      if (phone.width && phone.height) {
        this.setScreenDimensions(phone.width, phone.height);
      }
      return phone.id;
    }

    const phoneList = phones.map(p => `${p.name} (ID: ${p.id})`).join(', ');
    throw new TapKitAPIError(
      400,
      'NO_PHONE_SELECTED',
      `Multiple phones connected. Use tapkit_select_phone to choose one. Available: ${phoneList}`
    );
  }

  async listPhones(): Promise<Phone[]> {
    const phones = await this.request<Phone[]>('GET', '/phones');
    await Promise.all(
      phones.map(async (phone) => {
        try {
          const info = await this.getPhoneInfo(phone.id);
          phone.width = info.width;
          phone.height = info.height;
        } catch {
          // Dimensions unavailable
        }
      })
    );
    return phones;
  }

  async getPhoneInfo(phoneId: string): Promise<PhoneInfo> {
    return this.request<PhoneInfo>('GET', `/phones/${phoneId}/info`);
  }

  async screenshot(): Promise<Buffer> {
    const phoneId = await this.getPhoneId();
    return this.request<Buffer>('GET', `/phones/${phoneId}/screenshot`);
  }

  async tap(x: number, y: number): Promise<TapResult> {
    const phoneId = await this.getPhoneId();
    return this.request<TapResult>('POST', `/phones/${phoneId}/tap`, { x, y });
  }

  async doubleTap(x: number, y: number): Promise<TapResult> {
    const phoneId = await this.getPhoneId();
    return this.request<TapResult>('POST', `/phones/${phoneId}/double-tap`, { x, y });
  }

  async longPress(x: number, y: number, durationMs?: number): Promise<TapResult> {
    const phoneId = await this.getPhoneId();
    return this.request<TapResult>('POST', `/phones/${phoneId}/tap-and-hold`, {
      x,
      y,
      duration_ms: durationMs || 1000,
    });
  }

  async flick(x: number, y: number, direction: string): Promise<TapResult> {
    const phoneId = await this.getPhoneId();
    return this.request<TapResult>('POST', `/phones/${phoneId}/flick`, { x, y, direction });
  }

  async drag(
    fromX: number,
    fromY: number,
    toX: number,
    toY: number
  ): Promise<TapResult> {
    const phoneId = await this.getPhoneId();
    return this.request<TapResult>('POST', `/phones/${phoneId}/drag`, {
      from_x: fromX,
      from_y: fromY,
      to_x: toX,
      to_y: toY,
    });
  }

  async holdAndDrag(
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
    holdDurationMs?: number
  ): Promise<TapResult> {
    const phoneId = await this.getPhoneId();
    return this.request<TapResult>('POST', `/phones/${phoneId}/hold-and-drag`, {
      from_x: fromX,
      from_y: fromY,
      to_x: toX,
      to_y: toY,
      hold_duration_ms: holdDurationMs || 500,
    });
  }

  async typeText(text: string): Promise<TapResult> {
    const phoneId = await this.getPhoneId();
    return this.request<TapResult>('POST', `/phones/${phoneId}/type`, {
      text,
      method: 'shortcut',
    });
  }

  async pressHome(): Promise<TapResult> {
    const phoneId = await this.getPhoneId();
    return this.request<TapResult>('POST', `/phones/${phoneId}/home`, {});
  }

  async openApp(appName: string): Promise<TapResult> {
    const phoneId = await this.getPhoneId();
    return this.request<TapResult>('POST', `/phones/${phoneId}/open-app`, {
      app_name: appName,
    });
  }

  async lock(): Promise<TapResult> {
    const phoneId = await this.getPhoneId();
    return this.request<TapResult>('POST', `/phones/${phoneId}/lock`, {});
  }

  async unlock(passcode?: string): Promise<TapResult> {
    const phoneId = await this.getPhoneId();
    return this.request<TapResult>('POST', `/phones/${phoneId}/unlock`, {
      ...(passcode ? { passcode } : {}),
    });
  }

  async volumeUp(): Promise<TapResult> {
    const phoneId = await this.getPhoneId();
    return this.request<TapResult>('POST', `/phones/${phoneId}/volume-up`, {});
  }

  async volumeDown(): Promise<TapResult> {
    const phoneId = await this.getPhoneId();
    return this.request<TapResult>('POST', `/phones/${phoneId}/volume-down`, {});
  }

  async spotlight(query?: string): Promise<TapResult> {
    const phoneId = await this.getPhoneId();
    const result = await this.request<TapResult>('POST', `/phones/${phoneId}/spotlight`, {});
    if (query) {
      await this.typeText(query);
    }
    return result;
  }

  async activateSiri(): Promise<TapResult> {
    const phoneId = await this.getPhoneId();
    return this.request<TapResult>('POST', `/phones/${phoneId}/siri`, {});
  }

  async escape(): Promise<TapResult> {
    const phoneId = await this.getPhoneId();
    return this.request<TapResult>('POST', `/phones/${phoneId}/escape`, {});
  }

  async runShortcut(index: number): Promise<TapResult> {
    const phoneId = await this.getPhoneId();
    return this.request<TapResult>('POST', `/phones/${phoneId}/shortcut`, { index });
  }

  async enableSwitchControl(): Promise<TapResult> {
    const phoneId = await this.getPhoneId();
    return this.request<TapResult>('POST', `/phones/${phoneId}/switch-control`, {});
  }
}

export class TapKitAPIError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = 'TapKitAPIError';
    this.status = status;
    this.code = code;
  }

  toUserMessage(): string {
    switch (this.code) {
      case 'NO_PHONES_CONNECTED':
        return 'No phones connected. Please ensure TapKit is running and a phone is connected.';
      case 'NO_PHONE_SELECTED':
        return this.message;
      case 'PHONE_NOT_FOUND':
        return 'Phone not found. The device may have been disconnected.';
      case 'MAC_APP_NOT_RUNNING':
        return 'TapKit companion app is not running on your Mac.';
      case 'TIMEOUT':
        return 'Operation timed out. The app may be unresponsive.';
      case 'INVALID_API_KEY':
      case 'INVALID_TOKEN':
        return 'Invalid API key or token. Set TAPKIT_API_KEY or configure apiKey in plugin settings.';
      case 'AUTH_REQUIRED':
        return 'Authentication required. Set TAPKIT_API_KEY or configure apiKey in plugin settings.';
      case 'SUBSCRIPTION_REQUIRED':
        return 'An active TapKit subscription is required.';
      case 'NETWORK_ERROR':
        return `Network error: ${this.message}`;
      case 'USER_NOT_FOUND':
        return 'User not found. Please ensure you have a TapKit account.';
      case 'ORG_NOT_FOUND':
        return 'Organization not found. Please ensure your account is set up correctly.';
      default:
        return `${this.code}: ${this.message}`;
    }
  }
}
