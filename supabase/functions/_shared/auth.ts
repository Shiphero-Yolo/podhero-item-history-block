// supabase/functions/_shared/auth.ts
//
// Full Shopify session-token verification.
//
// Shopify session tokens are HS256 JWTs signed with the app's API secret.
// In addition to signature, we MUST validate:
//   - aud  = our Shopify API key (this app, not some other app)
//   - dest = same shop as iss, and ends in .myshopify.com
//   - exp / nbf (jose handles these via the verify call)
//
// Reference: https://shopify.dev/docs/api/admin-extensions/authenticate#session-tokens

import { jwtVerify } from 'https://deno.land/x/jose@v5.9.6/index.ts';

const SECRET = new TextEncoder().encode(Deno.env.get('SHOPIFY_API_SECRET') ?? '');
const API_KEY = Deno.env.get('SHOPIFY_API_KEY') ?? '';

export type AuthResult =
  | { ok: true; shopDomain: string }
  | { ok: false; status: number; error: string };

export async function verifySessionToken(req: Request): Promise<AuthResult> {
  if (!API_KEY) {
    console.error('SHOPIFY_API_KEY env var is not set; refusing all requests.');
    return { ok: false, status: 500, error: 'server_misconfigured' };
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return { ok: false, status: 401, error: 'missing_token' };
  }

  const token = authHeader.slice(7).trim();
  if (!token) return { ok: false, status: 401, error: 'missing_token' };

  let payload: Record<string, unknown>;
  try {
    const verified = await jwtVerify(token, SECRET, {
      algorithms: ['HS256'],
      audience: API_KEY,
      clockTolerance: 30,
    });
    payload = verified.payload as Record<string, unknown>;
  } catch {
    return { ok: false, status: 401, error: 'invalid_token' };
  }

  const dest = typeof payload.dest === 'string' ? payload.dest : '';
  const iss = typeof payload.iss === 'string' ? payload.iss : '';
  const destHost = parseHost(dest);
  const issHost = parseHost(iss);

  if (!destHost || !issHost || destHost !== issHost) {
    return { ok: false, status: 401, error: 'invalid_token' };
  }
  if (!destHost.endsWith('.myshopify.com')) {
    return { ok: false, status: 401, error: 'invalid_token' };
  }

  return { ok: true, shopDomain: destHost };
}

function parseHost(maybeUrl: string): string | null {
  try {
    return new URL(maybeUrl).hostname.toLowerCase();
  } catch {
    return null;
  }
}
