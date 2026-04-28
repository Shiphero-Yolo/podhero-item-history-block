# PODHero - Item History Block

Shopify Admin UI extension that renders a per-item lifecycle stepper on the order details page. Pulls live data from Supabase via Edge Functions.

## What it does

Shows every print-on-demand item on an order as a horizontal stepper:

`New → Batched → Treated → Decorated → QC Pass → Binned → Shipped`

Error states (QC Fail, API Fail, Inventory Fail, Cancelled) appear as a red branch off the happy path. Each step shows a timestamp when reached. A **Re-ship** button atomically resets an item to `new` and logs the event.

## Architecture

```
Shopify Admin
  └── UI Extension (Preact)         extensions/item-history-block/src/
        └── calls ─▶ Supabase Edge Functions   supabase/functions/
                          └── queries ─▶ Postgres (sewingparts-podhero)
```

| Layer | Tech | Entry point |
|---|---|---|
| Extension | Preact + Shopify UI Extensions | `BlockExtension.jsx` |
| Backend | Supabase Edge Functions (Deno) | `supabase/functions/*/index.ts` |
| Database | Supabase (Postgres) | project: `sewingparts-podhero` |

### Endpoints

| Method | Path | Purpose |
|---|---|---|
| GET | `/functions/v1/order-history?order_id=` | Items + events for an order, scoped to the calling shop's account |
| POST | `/functions/v1/reship` | Atomically reset item to `new` and log a reship event (single RPC) |
| GET | `/functions/v1/statuses` | List valid statuses |

All endpoints require a valid Shopify session token in `Authorization: Bearer <jwt>`.

## Security model

1. Every request must carry a Shopify session token. The edge functions verify HS256 signature plus `aud`, `iss`, `dest`, `exp`, and `nbf` (clock skew 30s).
2. The shop in the token's `dest` claim is looked up against `accounts.shop_domain` to resolve the PODHero `account_id`. Unknown shops get `403 shop_not_provisioned`.
3. Every database query is scoped by that `account_id`. A merchant cannot read or modify another tenant's data even if they know the IDs.
4. The reship operation runs through `public.reship_order_item(item_id, account_id)` — a `SECURITY DEFINER` function that locks the row and updates status + inserts the event in one transaction.
5. RLS is enabled on `order_items` and `order_events`; service-role bypass is the only path the edge functions take, and all scoping is done in code (and re-checked inside the RPC).

### Provisioning a new shop

```sql
update accounts set shop_domain = 'example.myshopify.com' where id = '<account_id>';
```

Until that row is set, the shop will see `403 shop_not_provisioned` from every endpoint.

## Order ID resolution

The extension reads `data.selected[0].id` from the Shopify page context — a GID like `gid://shopify/Order/12345`. The numeric segment is extracted and passed as `order_id`.

## Local dev

```bash
npm run dev          # starts Shopify CLI tunnel + extension
```

The extension talks directly to deployed Supabase edge functions — there is no local backend to run.

### Supabase function secrets

Set on the Supabase project (Edge Functions → Secrets):

| Variable | Purpose |
|---|---|
| `SHOPIFY_API_SECRET` | HS256 signing key for session tokens |
| `SHOPIFY_API_KEY` | App `client_id`; checked against `aud` claim |

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected automatically.

## Smoke tests

After deploying, verify the auth boundary holds:

```bash
FUNCTIONS_BASE=https://qcjiezsjuhpsxcyiduaf.supabase.co/functions/v1 \
  ./scripts/smoke-test.sh
```

The script checks that unauthenticated and malformed-token requests get rejected with 401.

## For agents

- Extension sandbox: `admin.order-details.block.render` — runs in an iframe, no DOM access to the host page
- CORS: `https://admin.shopify.com` and `*.myshopify.com` are allowed
- Session tokens are fully validated (signature, aud, iss/dest, exp, nbf)
- `data.selected[0].id` is always a Shopify Order GID
- Supabase project: **sewingparts-podhero**
