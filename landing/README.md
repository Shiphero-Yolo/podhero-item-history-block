# PODHero Item History — App Home landing page

Static HTML served at `https://sewingpartsonline.block.wms.dev/`. Shopify Admin
loads this in the embedded iframe when the merchant clicks the app from the
Apps menu. There is no backend behind it — the actual functionality lives in
the order-details extension.

## Deploy

```bash
cd landing
npx vercel deploy --prod --yes
```

First run will prompt for login and project linking — pick the Vercel
project that owns `sewingpartsonline.block.wms.dev` (or create a new one
and add the custom domain in the Vercel dashboard afterwards).

Subsequent deploys reuse the saved `.vercel/project.json` link.

## Custom domain

In the Vercel project: **Settings → Domains → Add `sewingpartsonline.block.wms.dev`**.

DNS:

```
sewingpartsonline.block.wms.dev  CNAME  cname.vercel-dns.com
```

## Why a static page

The page is rendered inside Shopify Admin's iframe. The CSP `frame-ancestors`
header in `vercel.json` lets it be framed only by `*.myshopify.com` and
`admin.shopify.com`, which both protects against clickjacking and lets
Shopify embed it.
