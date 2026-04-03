# Migrate Express Backend to Supabase Edge Functions

## Summary

Replace the Express server (`web/index.js`) with three Supabase edge functions. The extension frontend updates to call the Supabase functions URL directly.

## Functions

### `order-history`
- **Method:** GET
- **Query param:** `order_id` (positive integer, validated)
- **Returns:** `{ items, events }` from `order_items` and `order_events` tables
- **Auth:** Shopify session token required

### `reship`
- **Method:** POST
- **Body:** `{ item_id: string }`
- **Behavior:** Look up item, reset status to `new`, insert `reship` event
- **Returns:** `{ success, item_id, previous_status }`
- **Auth:** Shopify session token required

### `statuses`
- **Method:** GET
- **Returns:** `{ statuses }` from `get_order_item_statuses` RPC
- **Auth:** Shopify session token required
- **Caching:** No in-memory cache (serverless). Rely on the RPC being fast.

## Shared Modules

### `_shared/cors.ts`
Reusable CORS headers for all functions. Allows `https://admin.shopify.com` and `*.myshopify.com` origins. Returns early for OPTIONS preflight.

### `_shared/auth.ts`
Verifies Shopify session tokens (HS256) using `SHOPIFY_API_SECRET` from Supabase secrets. Returns 401 on missing/invalid tokens.

## Environment

| Variable | Source |
|---|---|
| `SUPABASE_URL` | Auto-injected by Supabase runtime |
| `SUPABASE_SERVICE_ROLE_KEY` | Auto-injected by Supabase runtime |
| `SHOPIFY_API_SECRET` | Set via `supabase secrets set` |

## Extension Changes

`extensions/item-history-block/src/supabaseClient.js` — change fetch URLs from relative paths (`/api/order-history`) to the Supabase functions endpoint (`https://<project-ref>.supabase.co/functions/v1/order-history`). The base URL comes from an environment variable or build-time constant.

## App Config Changes

`shopify.app.toml` — update `application_url` to the Supabase functions base URL. Remove `web/shopify.web.toml` from active use since the Express server is no longer the production backend.

## File Structure

```
supabase/functions/
  _shared/
    cors.ts
    auth.ts
  order-history/
    index.ts
  reship/
    index.ts
  statuses/
    index.ts
```

## What Gets Removed

- `web/index.js` Express server is no longer needed for production
- In-memory status cache (not viable in serverless)

## Deployment

```bash
supabase secrets set SHOPIFY_API_SECRET=<value>
supabase functions deploy order-history
supabase functions deploy reship
supabase functions deploy statuses
```
