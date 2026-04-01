import type { OpenClawPluginApi } from 'openclaw/plugin-sdk/plugin-entry';
import { registerPhoneTools } from './phone-tools.js';
import { registerGestureTools } from './gesture-tools.js';
import { registerInputTools } from './input-tools.js';
import { registerNavigationTools } from './navigation-tools.js';
import { registerDeviceTools } from './device-tools.js';

export function registerAllTools(api: OpenClawPluginApi) {
  registerPhoneTools(api);
  registerGestureTools(api);
  registerInputTools(api);
  registerNavigationTools(api);
  registerDeviceTools(api);
}
