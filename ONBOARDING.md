# PODHero Item History — Onboarding Bundle

Everything you need to get this running. Written 2026-07-06. Owner: abraham@shiphero.com.

## What this is

A Shopify **Admin UI extension** ("PODHero - Item History") that renders a per-item
lifecycle stepper (`New → Batched → Treated → Decorated → QC Pass → Binned → Shipped`)
on the order-details page, plus an **app-home landing page**. There is **no app server**:

```
Shopify Admin (order details page)
  └── UI Extension (Preact)              extensions/item-history-block/src/BlockExtension.jsx
        └── HTTPS ─▶ Supabase Edge Functions    supabase/functions/{order-history,reship,cancel,statuses}
                        └── Postgres (multi-tenant, scoped by account_id)

Shopify Admin (Apps menu → app home)
  └── iframe ─▶ static page on Vercel    landing/public/index.html  →  https://sewingpartsonline.block.wms.dev
```

Read `README.md` next — it covers the security model (session-token verification,
tenant scoping, RLS) in detail. This file is the operational stuff.

## Access checklist (request these first)

| System | What | Details |
|---|---|---|
| GitHub | repo access | `https://github.com/Shiphero-Yolo/podhero-item-history-block` |
| Shopify Dev Dashboard | the app | name **PODHero - Item History**, client_id `d2922a99be8c4ac800ca4f9c581dc08b` |
| Shopify dev store | collaborator access | `pod-hero-app.myshopify.com` |
| Supabase | project member | project **sewingpartsonline-podhero**, ref `qcjiezsjuhpsxcyiduaf` |
| Vercel | project access | the project that owns domain `sewingpartsonline.block.wms.dev` (serves `landing/`) |

## Shopify app config (`shopify.app.toml`)

- `client_id = d2922a99be8c4ac800ca4f9c581dc08b`, embedded app
- `application_url = https://sewingpartsonline.block.wms.dev` (the Vercel landing page)
- auth redirect: `https://sewingpartsonline.block.wms.dev/auth/callback`
- scopes: `read_orders` only
- extension target: `admin.order-details.block.render`, `network_access = true`
  (`extensions/item-history-block/shopify.extension.toml`)
- `automatically_update_urls_on_dev = false` — `shopify app dev` will NOT rewrite the app URL. Leave it that way.

## Env vars & secrets

Almost nothing lives locally. The real secrets live in **Supabase → Edge Functions → Secrets**:

| Where | Variable | Value / source |
|---|---|---|
| Supabase fn secrets | `SHOPIFY_API_SECRET` | App client secret from the Shopify Dev Dashboard. **Format is `shpss_…`** — if you're holding a secret that doesn't start with `shpss_`, it's the wrong one. |
| Supabase fn secrets | `SHOPIFY_API_KEY` | `d2922a99be8c4ac800ca4f9c581dc08b` (checked against the session-token `aud` claim) |
| Supabase fn secrets | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | injected automatically by Supabase — don't set |
| Local `.env` (optional) | `SHOPIFY_API_SECRET`, `PORT=3000` | only used for local HMAC-verification scripts; get the secret from Abraham or the Dev Dashboard. Not needed to run `shopify app dev`. |

**Before ever rotating/redeploying the secret**: verify it locally by HMAC-signing a
known session token and checking the signature matches. A wrong secret 401s every
merchant instantly.

## Running it

```bash
npm install
shopify app dev        # run this directly — it's a TUI; don't pipe/wrap it
```

- First run: Shopify CLI browser login, pick the org, pick app **PODHero - Item History**, dev store `pod-hero-app.myshopify.com`.
- There is no local backend. The extension calls the **deployed** edge functions at
  `https://qcjiezsjuhpsxcyiduaf.supabase.co/functions/v1/`.
- Open the dev store admin → any order → the "Item History" block renders.

### Test data gotcha (will bite you first day)

Dev-store orders do **not** exist in the PODHero database, so most orders show
nothing / `order_not_found`. The showcase order with real event data is
**order 805210884**. The `order-history` fn resolves orders by **order_number**
(what merchants see) with order_id fallback — don't "fix" one side to the other
without checking `supabase/functions/order-history/index.ts` first.

## Deploying

| What | How | Notes |
|---|---|---|
| Extension + app config | `shopify app deploy` | releases a new extension version to Shopify |
| Edge functions | `supabase functions deploy <name> --project-ref qcjiezsjuhpsxcyiduaf` | fns: `order-history`, `reship`, `cancel`, `statuses` (`app` is vestigial — the live app home is Vercel, not the Supabase `app` fn) |
| Landing page | `cd landing && npx vercel deploy --prod --yes` | static HTML; custom domain `sewingpartsonline.block.wms.dev` is set in the Vercel project (CNAME → `cname.vercel-dns.com`) |

After deploying edge functions, run the auth smoke test:

```bash
FUNCTIONS_BASE=https://qcjiezsjuhpsxcyiduaf.supabase.co/functions/v1 ./scripts/smoke-test.sh
```

**CORS invariant**: `order-history`, `reship`, and `cancel` must allow origins for
`https://admin.shopify.com`, `https://*.myshopify.com`, **and** `https://*.block.wms.dev`
(the landing page calls them too). If the app home breaks but the order block works,
check CORS first.

## Provisioning a shop

Shops are tenant-mapped in Postgres. An unmapped shop gets `403 shop_not_provisioned`:

```sql
update accounts set shop_domain = 'example.myshopify.com' where id = '<account_id>';
```

---

## Instructions for your Claude agents (Opus / Fable)

Paste-able context — or just tell your agent to read this file and `README.md`.

**Setup**: `.mcp.json` in this repo auto-configures the Supabase MCP server for
project `qcjiezsjuhpsxcyiduaf` — approve it and your agent can query the DB, read
fn logs, and deploy edge functions directly. Model split that works: Opus for routine
extension/fn edits; Fable for cross-system debugging (extension ↔ edge fn ↔ Vercel ↔ DB)
and anything touching the auth/tenancy boundary.

**Invariants — do not let an agent "simplify" these away:**

1. Every endpoint verifies the Shopify session token: HS256 signature + `aud`, `iss`,
   `dest`, `exp`, `nbf`. Tenancy comes from the token's `dest` → `accounts.shop_domain`
   → `account_id`, and **every** query is scoped by `account_id`. Never widen this.
2. `reship` goes through the `public.reship_order_item(item_id, account_id)`
   SECURITY DEFINER RPC — one atomic transaction. Don't replace it with two queries.
3. `order-history` is keyed by **order_number** (merchant-facing), not order_id. The
   two have diverged before; check the fn source before changing either side.
4. CORS on `order-history`/`reship`/`cancel` must include `*.block.wms.dev` in
   addition to the Shopify origins.

**Known traps:**

- **Verify the served artifact, not the file you edited.** The live extension version
  and the Vercel deploy have both drifted ahead of git before. After any deploy,
  fetch/inspect what's actually being served (`shopify app versions list`, curl the
  Vercel URL) before declaring done.
- The Supabase `app` edge function is vestigial. The app home at
  `sewingpartsonline.block.wms.dev` is a **Vercel** deploy from `landing/`. Don't
  debug the wrong one.
- Stepper timestamps render blank when `order_events.event` names don't match the
  extension's `HAPPY_PATH` keys — it's a vocabulary mismatch, not a data bug. Compare
  the event names in the DB against the keys in `BlockExtension.jsx` before touching code.
- Dev-store orders aren't in the PODHero DB. Use order **805210884** for a full
  happy-path render. Empty stepper on a random dev order is expected, not a bug.
- `shopify app dev` is interactive; agents should run it in a real terminal or
  background task, not through output-filtering wrappers.

**Verification loop** (before claiming anything works): deploy → `scripts/smoke-test.sh`
(auth boundary) → load order 805210884 in the dev store admin (happy path) → load the
app home from the Apps menu (CORS + iframe CSP).
