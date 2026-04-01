/**
 * Helpers for building OpenClaw tool result content arrays.
 */

import type { ToolResult } from './errors.js';

export function textResult(text: string): ToolResult {
  return {
    content: [{ type: 'text' as const, text }],
    details: { status: 'ok' },
  };
}

export function imageResult(base64Data: string, mimeType = 'image/png'): ToolResult {
  return {
    content: [{ type: 'image' as const, data: base64Data, mimeType }],
    details: { status: 'ok' },
  };
}

export function mixedResult(
  text: string,
  base64Data: string,
  mimeType = 'image/png'
): ToolResult {
  return {
    content: [
      { type: 'image' as const, data: base64Data, mimeType },
      { type: 'text' as const, text },
    ],
    details: { status: 'ok' },
  };
}
