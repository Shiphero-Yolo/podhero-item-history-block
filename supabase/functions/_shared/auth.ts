// supabase/functions/_shared/auth.ts
import { jwtVerify } from 'https://deno.land/x/jose@v5.9.6/index.ts';

const SECRET = new TextEncoder().encode(Deno.env.get('SHOPIFY_API_SECRET') ?? '');

export async function verifySessionToken(req: Request): Promise<Response | null> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Missing authorization token' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  const token = authHeader.slice(7);
  try {
    await jwtVerify(token, SECRET, { algorithms: ['HS256'] });
    return null; // success — caller proceeds
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid or expired session token' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
