import { NextResponse } from 'next/server';

/**
 * Creates a JSON error response with the specified message and status code
 * @param message Error message to return
 * @param status HTTP status code (default: 400)
 * @returns NextResponse with error JSON
 */
export function jsonError(message: string, status = 400): NextResponse {
  return NextResponse.json({ error: message }, { status });
}
