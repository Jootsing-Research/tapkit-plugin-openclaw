/**
 * Tool-level error handling.
 * Wraps execute functions to catch TapKitAPIError and return structured error content.
 */

import type { AgentToolResult } from '@mariozechner/pi-agent-core';
import { TapKitAPIError } from '../client/tapkit-client.js';

export type ToolResult = AgentToolResult<unknown>;

export type ToolExecuteFn = (
  callId: string,
  params: Record<string, unknown>,
  signal?: AbortSignal
) => Promise<ToolResult>;

export function withToolErrorHandling(fn: ToolExecuteFn): ToolExecuteFn {
  return async (callId, params, signal) => {
    try {
      return await fn(callId, params, signal);
    } catch (error) {
      if (error instanceof TapKitAPIError) {
        return {
          content: [{ type: 'text' as const, text: `TapKit error: ${error.toUserMessage()}` }],
          details: { status: 'error', code: error.code },
        };
      }
      const message = error instanceof Error ? error.message : String(error);
      return {
        content: [{ type: 'text' as const, text: `Error: ${message}` }],
        details: { status: 'error' },
      };
    }
  };
}
