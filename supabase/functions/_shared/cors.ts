// supabase/functions/_shared/cors.ts

const ALLOWED_ORIGINS = new Set([
  'https://admin.shopify.com',
  'https://extensions.shopifycdn.com',
]);

function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false;
  if (ALLOWED_ORIGINS.has(origin)) return true;
  try {
    const { hostname } = new URL(origin);
    // .myshopify.com — the shop admin iframe; .block.wms.dev — the embedded
    // app-home iframe (application_url), which calls order-history from the
    // full-history page.
    return hostname.endsWith('.myshopify.com') || hostname.endsWith('.block.wms.dev');
  } catch {
    return false;
  }
}

export function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('Origin');
  const headers: Record<string, string> = {
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Vary': 'Origin',
    'X-Content-Type-Options': 'nosniff',
  };
  if (isAllowedOrigin(origin)) {
    headers['Access-Control-Allow-Origin'] = origin!;
    headers['Access-Control-Allow-Credentials'] = 'true';
  }
  return headers;
}

export function handleCors(req: Request): Response | null {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders(req) });
  }
  return null;
}
