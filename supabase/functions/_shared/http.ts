// supabase/functions/_shared/http.ts
//
// Small response helpers so handlers don't repeat header plumbing and don't
// accidentally leak Supabase error messages to the client.

import { corsHeaders } from './cors.ts';

export function jsonResponse(
  req: Request,
  status: number,
  body: unknown,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
  });
}

export function internalError(req: Request, where: string, err: unknown): Response {
  console.error(`[${where}]`, err instanceof Error ? err.message : err);
  return jsonResponse(req, 500, { error: 'internal_error' });
}
