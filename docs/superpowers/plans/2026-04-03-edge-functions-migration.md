# Edge Functions Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Express backend (`web/index.js`) with three Supabase edge functions so the entire backend lives inside Supabase.

**Architecture:** Each Express route becomes a standalone Deno edge function under `supabase/functions/`. Shared CORS and auth logic lives in `supabase/functions/_shared/`. The Shopify extension fetches from the Supabase functions URL instead of relative paths.

**Tech Stack:** Deno, TypeScript, `@supabase/supabase-js@2` (npm import), Shopify session tokens (HS256 JWT via `djwt`)

---

## File Structure

```
supabase/functions/
  _shared/
    cors.ts          — CORS header helper + preflight handler
    auth.ts          — Shopify session token verification
    supabase.ts      — Admin Supabase client factory
  order-history/
    index.ts         — GET handler: fetch items + events
  reship/
    index.ts         — POST handler: reset item, log event
  statuses/
    index.ts         — GET handler: call get_order_item_statuses RPC
extensions/item-history-block/src/
  supabaseClient.js  — MODIFY: point fetch URLs at Supabase functions
```

---

### Task 1: Create shared CORS module

**Files:**
- Create: `supabase/functions/_shared/cors.ts`

- [ ] **Step 1: Create `_shared/cors.ts`**

```ts
// supabase/functions/_shared/cors.ts

const ALLOWED_ORIGINS = new Set([
  'https://admin.shopify.com',
]);

function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false;
  if (ALLOWED_ORIGINS.has(origin)) return true;
  try {
    const { hostname } = new URL(origin);
    return hostname.endsWith('.myshopify.com');
  } catch {
    return false;
  }
}

export function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('Origin');
  const headers: Record<string, string> = {
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
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
```

- [ ] **Step 2: Commit**

```bash
git add supabase/functions/_shared/cors.ts
git commit -m "feat: add shared CORS module for edge functions"
```

---

### Task 2: Create shared auth module

**Files:**
- Create: `supabase/functions/_shared/auth.ts`

- [ ] **Step 1: Create `_shared/auth.ts`**

```ts
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
```

- [ ] **Step 2: Commit**

```bash
git add supabase/functions/_shared/auth.ts
git commit -m "feat: add shared Shopify session token auth module"
```

---

### Task 3: Create shared Supabase client module

**Files:**
- Create: `supabase/functions/_shared/supabase.ts`

- [ ] **Step 1: Create `_shared/supabase.ts`**

```ts
// supabase/functions/_shared/supabase.ts
import { createClient } from 'npm:@supabase/supabase-js@2';

export function createAdminClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add supabase/functions/_shared/supabase.ts
git commit -m "feat: add shared Supabase admin client factory"
```

---

### Task 4: Create `order-history` edge function

**Files:**
- Create: `supabase/functions/order-history/index.ts`

- [ ] **Step 1: Create `order-history/index.ts`**

```ts
// supabase/functions/order-history/index.ts
import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { verifySessionToken } from '../_shared/auth.ts';
import { createAdminClient } from '../_shared/supabase.ts';

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  const headers = { ...corsHeaders(req), 'Content-Type': 'application/json' };

  const authError = await verifySessionToken(req);
  if (authError) return authError;

  const url = new URL(req.url);
  const orderId = url.searchParams.get('order_id');

  if (!orderId || !/^\d+$/.test(orderId)) {
    return new Response(
      JSON.stringify({ error: 'order_id must be a positive integer' }),
      { status: 400, headers },
    );
  }

  try {
    const supabase = createAdminClient();

    const [itemsRes, eventsRes] = await Promise.all([
      supabase.from('order_items').select('*').eq('order_id', orderId),
      supabase
        .from('order_events')
        .select('*')
        .eq('order_id', orderId)
        .order('timestamp', { ascending: true }),
    ]);

    if (itemsRes.error) throw itemsRes.error;
    if (eventsRes.error) throw eventsRes.error;

    return new Response(
      JSON.stringify({ items: itemsRes.data, events: eventsRes.data }),
      { status: 200, headers },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers },
    );
  }
});
```

- [ ] **Step 2: Commit**

```bash
git add supabase/functions/order-history/index.ts
git commit -m "feat: add order-history edge function"
```

---

### Task 5: Create `reship` edge function

**Files:**
- Create: `supabase/functions/reship/index.ts`

- [ ] **Step 1: Create `reship/index.ts`**

```ts
// supabase/functions/reship/index.ts
import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { verifySessionToken } from '../_shared/auth.ts';
import { createAdminClient } from '../_shared/supabase.ts';

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  const headers = { ...corsHeaders(req), 'Content-Type': 'application/json' };

  const authError = await verifySessionToken(req);
  if (authError) return authError;

  let body: { item_id?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ error: 'Invalid JSON body' }),
      { status: 400, headers },
    );
  }

  const { item_id } = body;
  if (!item_id || typeof item_id !== 'string' || item_id.trim() === '') {
    return new Response(
      JSON.stringify({ error: 'item_id is required' }),
      { status: 400, headers },
    );
  }

  try {
    const supabase = createAdminClient();

    // Look up the item to confirm it exists
    const { data: item, error: lookupErr } = await supabase
      .from('order_items')
      .select('id, order_id, status')
      .eq('id', item_id)
      .single();

    if (lookupErr || !item) {
      return new Response(
        JSON.stringify({ error: 'Item not found' }),
        { status: 404, headers },
      );
    }

    // Reset item status back to "new"
    const { error: updateErr } = await supabase
      .from('order_items')
      .update({ status: 'new' })
      .eq('id', item_id);

    if (updateErr) throw updateErr;

    // Log a reship event
    const { error: eventErr } = await supabase.from('order_events').insert({
      order_id: item.order_id,
      order_item: item.id,
      event: 'reship',
      timestamp: new Date().toISOString(),
    });

    if (eventErr) throw eventErr;

    return new Response(
      JSON.stringify({ success: true, item_id, previous_status: item.status }),
      { status: 200, headers },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers },
    );
  }
});
```

- [ ] **Step 2: Commit**

```bash
git add supabase/functions/reship/index.ts
git commit -m "feat: add reship edge function"
```

---

### Task 6: Create `statuses` edge function

**Files:**
- Create: `supabase/functions/statuses/index.ts`

- [ ] **Step 1: Create `statuses/index.ts`**

```ts
// supabase/functions/statuses/index.ts
import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { verifySessionToken } from '../_shared/auth.ts';
import { createAdminClient } from '../_shared/supabase.ts';

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  const headers = { ...corsHeaders(req), 'Content-Type': 'application/json' };

  const authError = await verifySessionToken(req);
  if (authError) return authError;

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase.rpc('get_order_item_statuses');

    if (error) throw error;

    return new Response(
      JSON.stringify({ statuses: data }),
      { status: 200, headers },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers },
    );
  }
});
```

- [ ] **Step 2: Commit**

```bash
git add supabase/functions/statuses/index.ts
git commit -m "feat: add statuses edge function"
```

---

### Task 7: Update extension to call Supabase functions URL

**Files:**
- Modify: `extensions/item-history-block/src/supabaseClient.js`

- [ ] **Step 1: Update `supabaseClient.js` to use Supabase functions URL**

The extension needs a base URL for the edge functions. Since Shopify UI extensions don't have build-time env vars, we hardcode the Supabase project URL. The project ref comes from `SUPABASE_URL` which is `https://<ref>.supabase.co`.

Replace the entire contents of `supabaseClient.js` with:

```js
/**
 * Fetch helpers that call Supabase Edge Functions instead of the Express backend.
 *
 * FUNCTIONS_BASE must match your deployed Supabase project.
 * Session token is retrieved from Shopify's `shopify.idToken()` and sent as
 * a Bearer token so the edge functions can verify it.
 */

const FUNCTIONS_BASE = 'https://sewingparts-podhero.supabase.co/functions/v1';

async function authedFetch(path, options = {}) {
  const token = await shopify.idToken();
  const res = await fetch(`${FUNCTIONS_BASE}${path}`, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Backend error ${res.status}: ${text}`);
  }
  return res.json();
}

export async function fetchOrderHistory(orderId) {
  return authedFetch(`/order-history?order_id=${encodeURIComponent(orderId)}`);
}

export async function reshipItem(itemId) {
  return authedFetch('/reship', {
    method: 'POST',
    body: JSON.stringify({ item_id: itemId }),
  });
}
```

Key changes:
- Fetches go to the full Supabase functions URL instead of relative `/api/` paths
- Session token is explicitly retrieved via `shopify.idToken()` and sent as Bearer
- Shared `authedFetch` helper removes duplication

- [ ] **Step 2: Commit**

```bash
git add extensions/item-history-block/src/supabaseClient.js
git commit -m "feat: point extension at Supabase edge functions URL"
```

---

### Task 8: Set Supabase secret and deploy

- [ ] **Step 1: Set the Shopify API secret**

```bash
supabase secrets set SHOPIFY_API_SECRET=<your-shopify-api-secret>
```

- [ ] **Step 2: Deploy all three functions**

```bash
supabase functions deploy order-history
supabase functions deploy reship
supabase functions deploy statuses
```

- [ ] **Step 3: Verify each function is reachable**

```bash
# Should return 401 (no auth token) — confirms the function is live
curl -s -o /dev/null -w "%{http_code}" https://sewingparts-podhero.supabase.co/functions/v1/order-history
# Expected: 401
```

- [ ] **Step 4: Deploy the updated extension**

```bash
npm run deploy
```

This pushes the updated extension (with new fetch URLs) to Shopify.

- [ ] **Step 5: Commit any config changes**

```bash
git add -A
git commit -m "chore: deploy edge functions and updated extension"
```

---

### Task 9: Verify end-to-end in Shopify admin

- [ ] **Step 1: Open an order in Shopify admin that has data in `order_items`**

Confirm the Item History block loads, shows the stepper, and timestamps.

- [ ] **Step 2: Test the Re-ship button**

Click Re-ship on an item. Confirm it resets the status and the event appears.

- [ ] **Step 3: Check browser devtools Network tab**

Verify requests go to `https://sewingparts-podhero.supabase.co/functions/v1/order-history` (not `/api/order-history`).
