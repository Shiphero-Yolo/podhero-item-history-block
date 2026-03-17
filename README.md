# PODHero - Item History Block

Shopify Admin UI extension that renders a per-item lifecycle stepper on the order details page. Pulls live data from Supabase.

## What it does

Shows every print-on-demand item on an order as a horizontal stepper:

`New → Batched → Treated → Decorated → QC Pass → Binned → Shipped`

Error states (QC Fail, API Fail, Inventory Fail, Cancelled) appear as a red branch off the happy path. Each step shows a timestamp when reached. A **Re-ship** button resets an item to `new` and logs the event.

## Architecture

```
Shopify Admin
  └── UI Extension (Preact)          extensions/item-history-block/src/
        └── calls ─▶ Express backend  web/index.js
                          └── queries ─▶ Supabase (sewingparts-podhero)
```

| Layer | Tech | Entry point |
|---|---|---|
| Extension | Preact + Shopify UI Extensions | `BlockExtension.jsx` |
| Backend | Express 5 | `web/index.js` |
| Database | Supabase (Postgres) | project: `sewingparts-podhero` |

### Key tables

- `order_items` — `id, order_id, product_name, sku, quantity, status`
- `order_events` — `order_id, order_item, event, timestamp`

### API endpoints

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/order-history?order_id=` | Fetch items + events for an order |
| POST | `/api/reship` | Reset item to `new`, log reship event |
| GET | `/api/statuses` | List valid statuses (cached 5 min) |

## Order ID resolution

The extension reads `data.selected[0].id` from the Shopify page context — a GID like `gid://shopify/Order/12345`. The numeric segment is extracted and passed as `order_id` to the backend. The backend matches this against `order_items.order_id`.

> The `order_id` in the database must match the numeric portion of Shopify's order GID for the block to show data.

## Local dev

```bash
npm run dev          # starts Shopify CLI tunnel + extension + web server
```

Backend runs on port 3000. Preview the stepper component without Shopify at `/preview`.

### Environment variables

| Variable | Purpose |
|---|---|
| `SUPABASE_URL` | Supabase API URL (defaults to local: `http://localhost:54321`) |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key for Supabase |
| `SHOPIFY_API_SECRET` | Used to decode extension session tokens |

## For agents

- Extension sandbox: `admin.order-details.block.render` — runs in an iframe, no DOM access to the host page
- CORS is open (reflects request origin) — required for Shopify's sandbox origin
- Session tokens are decoded but not signature-verified (RS256 / JWKS not implemented)
- `data.selected[0]` is the order currently open in admin; `.id` is always a GID
- Supabase project: **sewingparts-podhero**
