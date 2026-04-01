import { Type } from '@sinclair/typebox';
import type { OpenClawPluginApi } from 'openclaw/plugin-sdk/plugin-entry';
import { withToolErrorHandling } from '../util/errors.js';
import { textResult } from '../util/result.js';
import { getClient } from '../state.js';
import { resolvePhoneForTool } from '../phone.js';
import type { PluginConfig } from '../auth.js';

export function registerGestureTools(api: OpenClawPluginApi) {
  const config = api.config as PluginConfig;

  api.registerTool({
    name: 'tapkit_tap',
    label: 'TapKit: Tap',
    description: 'Tap at specific x,y coordinates on the iPhone screen',
    parameters: Type.Object({
      x: Type.Number({ description: 'X coordinate' }),
      y: Type.Number({ description: 'Y coordinate' }),
    }),
    execute: withToolErrorHandling(async (_callId, params) => {
      const client = await getClient(config);
      await resolvePhoneForTool(client);
      await client.tap(params.x as number, params.y as number);
      return textResult(`Tapped at (${params.x}, ${params.y})`);
    }),
  });

  api.registerTool({
    name: 'tapkit_double_tap',
    label: 'TapKit: Double Tap',
    description: 'Double tap at coordinates. Use for zooming or text selection.',
    parameters: Type.Object({
      x: Type.Number({ description: 'X coordinate' }),
      y: Type.Number({ description: 'Y coordinate' }),
    }),
    execute: withToolErrorHandling(async (_callId, params) => {
      const client = await getClient(config);
      await resolvePhoneForTool(client);
      await client.doubleTap(params.x as number, params.y as number);
      return textResult(`Double tapped at (${params.x}, ${params.y})`);
    }),
  });

  api.registerTool({
    name: 'tapkit_long_press',
    label: 'TapKit: Long Press',
    description:
      'Long press (tap and hold) at coordinates. Opens context menus. Default 1000ms.',
    parameters: Type.Object({
      x: Type.Number({ description: 'X coordinate' }),
      y: Type.Number({ description: 'Y coordinate' }),
      duration: Type.Optional(
        Type.Number({ description: 'Hold duration in milliseconds (default 1000)' })
      ),
    }),
    execute: withToolErrorHandling(async (_callId, params) => {
      const client = await getClient(config);
      await resolvePhoneForTool(client);
      await client.longPress(
        params.x as number,
        params.y as number,
        params.duration as number | undefined
      );
      return textResult(
        `Long pressed at (${params.x}, ${params.y}) for ${params.duration || 1000}ms`
      );
    }),
  });

  api.registerTool({
    name: 'tapkit_swipe',
    label: 'TapKit: Swipe',
    description:
      'Swipe (flick) gesture at coordinates. Use for scrolling, dismissing, switching pages.',
    parameters: Type.Object({
      x: Type.Number({ description: 'X coordinate to start swipe' }),
      y: Type.Number({ description: 'Y coordinate to start swipe' }),
      direction: Type.Union(
        [
          Type.Literal('up'),
          Type.Literal('down'),
          Type.Literal('left'),
          Type.Literal('right'),
        ],
        { description: 'Swipe direction: up, down, left, right' }
      ),
    }),
    execute: withToolErrorHandling(async (_callId, params) => {
      const client = await getClient(config);
      await resolvePhoneForTool(client);
      await client.flick(
        params.x as number,
        params.y as number,
        params.direction as string
      );
      return textResult(
        `Swiped ${params.direction} from (${params.x}, ${params.y})`
      );
    }),
  });

  api.registerTool({
    name: 'tapkit_drag',
    label: 'TapKit: Drag',
    description:
      'Drag from one point to another. Use for sliders, precise scrolling, moving items.',
    parameters: Type.Object({
      from_x: Type.Number({ description: 'Start X coordinate' }),
      from_y: Type.Number({ description: 'Start Y coordinate' }),
      to_x: Type.Number({ description: 'End X coordinate' }),
      to_y: Type.Number({ description: 'End Y coordinate' }),
    }),
    execute: withToolErrorHandling(async (_callId, params) => {
      const client = await getClient(config);
      await resolvePhoneForTool(client);
      await client.drag(
        params.from_x as number,
        params.from_y as number,
        params.to_x as number,
        params.to_y as number
      );
      return textResult(
        `Dragged from (${params.from_x}, ${params.from_y}) to (${params.to_x}, ${params.to_y})`
      );
    }),
  });

  api.registerTool({
    name: 'tapkit_hold_and_drag',
    label: 'TapKit: Hold and Drag',
    description:
      'Long press then drag. Use for drag-and-drop, reordering lists.',
    parameters: Type.Object({
      from_x: Type.Number({ description: 'Start X coordinate' }),
      from_y: Type.Number({ description: 'Start Y coordinate' }),
      to_x: Type.Number({ description: 'End X coordinate' }),
      to_y: Type.Number({ description: 'End Y coordinate' }),
      hold_duration_ms: Type.Optional(
        Type.Number({
          description: 'Hold duration before dragging in milliseconds (default 500)',
        })
      ),
    }),
    execute: withToolErrorHandling(async (_callId, params) => {
      const client = await getClient(config);
      await resolvePhoneForTool(client);
      await client.holdAndDrag(
        params.from_x as number,
        params.from_y as number,
        params.to_x as number,
        params.to_y as number,
        params.hold_duration_ms as number | undefined
      );
      return textResult(
        `Hold-and-dragged from (${params.from_x}, ${params.from_y}) to (${params.to_x}, ${params.to_y})`
      );
    }),
  });
}
