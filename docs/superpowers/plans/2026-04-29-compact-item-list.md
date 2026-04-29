# Compact Item List Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the per-item horizontal stepper with a compact, click-to-expand row list in the order-details block, so orders with many items remain scannable.

**Architecture:** A new `ItemRow.jsx` uses Shopify Admin's `s-details`/`s-summary` for native click-to-expand. The expanded panel reuses the existing `HorizontalStepper.jsx` unchanged. Status-tone mapping and shared constants move into a small `statusBadge.js` so `HorizontalStepper.jsx` and `ItemRow.jsx` share one source of truth. `BlockExtension.jsx` is reduced to: fetch, build event map, compute totals header, render rows.

**Tech Stack:** Preact 10 (classic JSX runtime), Shopify Admin UI Extensions Polaris web components (`s-*`), Supabase Edge Functions (already deployed; no backend changes here).

**Spec:** `docs/superpowers/specs/2026-04-29-compact-item-list-design.md`

**Note on testing:** This repo has no automated test harness, and the spec deliberately does not add one for this change. Each task ends with a manual verification step — run `npm run dev -- --store=pod-hero-app.myshopify.com` and load an order. The final task is a complete manual smoke pass.

**Note on expansion state:** The spec describes a controlled `expanded: Set<itemId>` in `BlockExtension`. The plan refines this to **uncontrolled** via `<s-details defaultOpen>` because Shopify Admin provides a native disclosure primitive that handles open/close state internally. The visible behavior is identical — error items start open on first render, the user can collapse/expand freely after — and the controlled set is unnecessary state.

---

## File structure

| File | Action | Responsibility |
|---|---|---|
| `extensions/item-history-block/src/statusBadge.js` | **Create** | Shared status constants (`HAPPY_PATH`, `ERROR_STATUSES`), `formatLabel`, and `statusBadge(status) → {label, tone}`. Single source of truth for badge tone mapping. |
| `extensions/item-history-block/src/HorizontalStepper.jsx` | **Modify** | Remove duplicated `HAPPY_PATH` / `ERROR_STATUSES` / `formatLabel` definitions; import them from `statusBadge.js`. No internal logic changes. |
| `extensions/item-history-block/src/ItemRow.jsx` | **Create** | One row of the list. Uses `s-details`/`s-summary` for click-to-expand. Renders name + SKU × qty + status badge + Re-ship button in the summary; renders `HorizontalStepper` in the body. |
| `extensions/item-history-block/src/BlockExtension.jsx` | **Modify** | Replace the per-item rendering loop with a totals header followed by an `ItemRow` per item. Drop the inline `itemEventMap` rendering scaffolding; keep fetch + reship handlers. |

---

## Task 1: Extract shared status constants into `statusBadge.js`

This is a pure refactor — no behavior changes. It exists so `HorizontalStepper.jsx` and the new `ItemRow.jsx` share a single source of truth for status → tone/label mapping.

**Files:**
- Create: `extensions/item-history-block/src/statusBadge.js`
- Modify: `extensions/item-history-block/src/HorizontalStepper.jsx` (lines 5–6 and 23 — replace top constants, replace local `formatLabel`)

- [ ] **Step 1.1 — Create `statusBadge.js`**

Write `extensions/item-history-block/src/statusBadge.js`:

```javascript
// Single source of truth for order_item status semantics shared by the
// stepper and the compact row list.

export const HAPPY_PATH = [
  'new',
  'batched',
  'treated',
  'decorated',
  'qc_pass',
  'binned',
  'shipped',
];

export const ERROR_STATUSES = new Set([
  'qc_fail',
  'api_fail',
  'inventory_fail',
  'cancelled',
]);

const SUCCESS_STATUSES = new Set(['shipped', 'binned', 'qc_pass']);
const INFO_STATUSES = new Set(['new', 'batched', 'treated', 'decorated']);

export function formatLabel(status) {
  return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function statusBadge(status) {
  let tone = 'neutral';
  if (ERROR_STATUSES.has(status)) tone = 'critical';
  else if (SUCCESS_STATUSES.has(status)) tone = 'success';
  else if (INFO_STATUSES.has(status)) tone = 'info';
  return { label: formatLabel(status), tone };
}
```

- [ ] **Step 1.2 — Update `HorizontalStepper.jsx` imports**

Open `extensions/item-history-block/src/HorizontalStepper.jsx`. At the top of the file, replace the inline `HAPPY_PATH` and `ERROR_STATUSES` declarations (currently lines 5–6) and the `formatLabel` function (currently lines 22–24) with an import.

The current top of the file looks like this:

```jsx
/** @jsxRuntime classic */
/** @jsx h */
import { h } from 'preact';

const HAPPY_PATH = ['new', 'batched', 'treated', 'decorated', 'qc_pass', 'binned', 'shipped'];
const ERROR_STATUSES = new Set(['qc_fail', 'api_fail', 'inventory_fail', 'cancelled']);

const STATUS_ICONS = {
  // …
};

function formatLabel(status) {
  return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}
```

Change it to this — leave `STATUS_ICONS` exactly as it is, and leave `formatTimestamp` and the rest of the file untouched:

```jsx
/** @jsxRuntime classic */
/** @jsx h */
import { h } from 'preact';
import { HAPPY_PATH, ERROR_STATUSES, formatLabel } from './statusBadge.js';

const STATUS_ICONS = {
  // …keep the existing object exactly as it is…
};
```

Confirm by re-reading the file: there should now be exactly one declaration of `HAPPY_PATH`, `ERROR_STATUSES`, and `formatLabel` in the codebase, all in `statusBadge.js`.

- [ ] **Step 1.3 — Verify the refactor compiles**

Run from the repo root:

```bash
npm run dev -- --store=pod-hero-app.myshopify.com
```

Wait for `Build successful`. If it fails to build, fix the import path. Stop the dev server with Ctrl-C once you confirm a clean build (you'll restart it for the manual smoke test in Task 4). No need to load the admin yet.

- [ ] **Step 1.4 — Commit**

```bash
git add extensions/item-history-block/src/statusBadge.js extensions/item-history-block/src/HorizontalStepper.jsx
git commit -m "refactor: extract status constants into statusBadge module"
```

---

## Task 2: Build `ItemRow.jsx`

Self-contained component for a single item row with native disclosure expansion. No changes to `BlockExtension.jsx` yet — this task only adds the new file.

**Files:**
- Create: `extensions/item-history-block/src/ItemRow.jsx`

- [ ] **Step 2.1 — Create `ItemRow.jsx`**

Write `extensions/item-history-block/src/ItemRow.jsx`:

```jsx
/** @jsxRuntime classic */
/** @jsx h */
import { h } from 'preact';
import HorizontalStepper from './HorizontalStepper.jsx';
import { statusBadge, ERROR_STATUSES } from './statusBadge.js';

export default function ItemRow({
  item,
  events,
  reshipLoading,
  reshipDone,
  onReship,
}) {
  const { label, tone } = statusBadge(item.status);
  const startsOpen = ERROR_STATUSES.has(item.status);

  function handleReshipClick(e) {
    // Prevent the click from toggling the s-details disclosure.
    if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
    onReship(item.id);
  }

  return (
    <s-details defaultOpen={startsOpen}>
      <s-summary>
        <s-stack
          direction="inline"
          gap="base"
          alignItems="center"
          justifyContent="space-between"
        >
          <s-stack direction="block" gap="none">
            <s-text type="strong">{item.product_name}</s-text>
            <s-text color="subdued" variant="bodyXs">
              SKU: {item.sku || '—'} × {item.quantity}
            </s-text>
          </s-stack>
          <s-stack direction="inline" gap="base" alignItems="center">
            <s-badge tone={tone}>{label}</s-badge>
            <s-button
              variant="secondary"
              disabled={reshipDone}
              loading={reshipLoading}
              onClick={handleReshipClick}
            >
              {reshipDone ? 'Re-ship requested' : 'Re-ship'}
            </s-button>
          </s-stack>
        </s-stack>
      </s-summary>
      <s-box paddingBlockStart="base">
        <HorizontalStepper currentStatus={item.status} events={events} />
      </s-box>
    </s-details>
  );
}
```

Key points to double-check:
- `defaultOpen` is uncontrolled — once the row is rendered, the user owns the open/closed state.
- `e.stopPropagation()` on the Re-ship button prevents the click from also toggling the disclosure.
- The expanded panel reuses `HorizontalStepper` with the same props it already accepts (`currentStatus`, `events`).
- `paddingBlockStart="base"` on the wrapping `s-box` adds breathing room between the summary row and the stepper.

- [ ] **Step 2.2 — Verify the file compiles in isolation**

It is not imported by anything yet, but the build still parses it. Run:

```bash
npm run dev -- --store=pod-hero-app.myshopify.com
```

Wait for `Build successful`, then Ctrl-C. If build fails, fix syntax in `ItemRow.jsx`.

- [ ] **Step 2.3 — Commit**

```bash
git add extensions/item-history-block/src/ItemRow.jsx
git commit -m "feat: add ItemRow component for compact item list"
```

---

## Task 3: Wire `ItemRow` into `BlockExtension.jsx`

Replace the per-item rendering loop with a totals header followed by the new compact rows.

**Files:**
- Modify: `extensions/item-history-block/src/BlockExtension.jsx`

- [ ] **Step 3.1 — Replace the file contents**

Open `extensions/item-history-block/src/BlockExtension.jsx`. Replace the entire file with:

```jsx
/** @jsxRuntime classic */
/** @jsx h */
import { h, render } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import { fetchOrderHistory, reshipItem } from './supabaseClient';
import ItemRow from './ItemRow.jsx';
import { ERROR_STATUSES } from './statusBadge.js';

export default async () => {
  render(<Extension />, document.body);
};

function Extension() {
  const { data } = shopify;
  const orderGid = data.selected?.[0]?.id ?? null;
  const orderId = orderGid ? orderGid.split('/').pop() : null;

  const [items, setItems] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reshipLoading, setReshipLoading] = useState({});
  const [reshipDone, setReshipDone] = useState({});

  async function handleReship(itemId) {
    setReshipLoading((prev) => ({ ...prev, [itemId]: true }));
    try {
      await reshipItem(itemId);
      setReshipDone((prev) => ({ ...prev, [itemId]: true }));
    } catch (err) {
      setError(err.message || 'Re-ship request failed.');
    } finally {
      setReshipLoading((prev) => ({ ...prev, [itemId]: false }));
    }
  }

  useEffect(() => {
    if (!orderId) {
      setLoading(false);
      setError('No order selected.');
      return;
    }

    async function fetchData() {
      try {
        const { items: itemsData, events: eventsData } = await fetchOrderHistory(orderId);
        setItems(itemsData);
        setEvents(eventsData);
      } catch (err) {
        setError(err.message || 'Failed to load item history.');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [orderId]);

  if (loading) {
    return (
      <s-admin-block title="Item History">
        <s-text>Loading...</s-text>
      </s-admin-block>
    );
  }

  if (error) {
    return (
      <s-admin-block title="Item History">
        <s-text tone="critical">{error}</s-text>
      </s-admin-block>
    );
  }

  if (items.length === 0 && events.length === 0) {
    return (
      <s-admin-block title="Item History">
        <s-text>No history found for this order.</s-text>
      </s-admin-block>
    );
  }

  // Build item -> events map (only item-level events).
  const itemEventMap = {};
  events
    .filter((e) => e.order_item)
    .forEach((e) => {
      if (!itemEventMap[e.order_item]) itemEventMap[e.order_item] = [];
      itemEventMap[e.order_item].push(e);
    });

  // Header totals.
  const totalCount = items.length;
  const errorCount = items.filter((i) => ERROR_STATUSES.has(i.status)).length;
  const shippedCount = items.filter((i) => i.status === 'shipped').length;
  const headerText = `${totalCount} items · ${errorCount} in error · ${shippedCount} shipped`;

  return (
    <s-admin-block title="Item History">
      <s-stack direction="block" gap="base">
        <s-text color="subdued">{headerText}</s-text>
        {items.map((item) => (
          <ItemRow
            key={item.id}
            item={item}
            events={itemEventMap[item.id] || []}
            reshipLoading={!!reshipLoading[item.id]}
            reshipDone={!!reshipDone[item.id]}
            onReship={handleReship}
          />
        ))}
      </s-stack>
    </s-admin-block>
  );
}
```

What changed compared to the previous version:
- Imports `ItemRow` and `ERROR_STATUSES`.
- `s-divider` between items is removed (the disclosure already provides visual separation).
- Per-item `<s-stack>` / `<s-heading>` / inline stepper rendering is replaced with one `<ItemRow />`.
- A new totals header line is emitted once at the top of the list.
- The unused `idx > 0 && <s-divider />` pattern is gone.

What stayed the same:
- `useEffect` fetch path, `handleReship`, all loading/error/empty branches, the `itemEventMap` build, and all state shapes (`reshipLoading`, `reshipDone` are still per-id maps).

- [ ] **Step 3.2 — Verify the build**

```bash
npm run dev -- --store=pod-hero-app.myshopify.com
```

Wait for `Build successful`. Leave the dev server running for Task 4.

- [ ] **Step 3.3 — Commit**

```bash
git add extensions/item-history-block/src/BlockExtension.jsx
git commit -m "feat: render compact item rows with totals header"
```

---

## Task 4: Manual smoke test

The dev server should still be running from Task 3.2. The dev preview UI in the terminal will print a URL — open it and select the development store preview when prompted.

- [ ] **Step 4.1 — Open an order with one item**

Pick any test order in `pod-hero-app.myshopify.com` that has exactly one PODHero-tracked item (or create one if needed). Open the order details page.

Verify:
- The Item History block shows a header line like `1 items · 0 in error · X shipped`.
- The single row is collapsed by default — only the summary line is visible, the stepper is not rendered.
- Clicking the row expands it and shows the horizontal stepper.
- The Re-ship button renders inline on the row.

- [ ] **Step 4.2 — Open an order with many items**

Pick (or seed) an order with at least ~20 items. Verify:
- All rows are collapsed by default.
- The header line shows correct counts (total / in-error / shipped).
- The list is scrollable inside the admin block; you can quickly scan SKUs and status badges without expanding anything.

- [ ] **Step 4.3 — Verify auto-expansion on error rows**

Pick (or seed) an order containing at least one item in `qc_fail`, `api_fail`, `inventory_fail`, or `cancelled`. Verify:
- That row starts **expanded** on first render.
- The badge for that row uses the `critical` tone (red).
- The expanded stepper shows the error status as a separate red branch (existing behavior of `HorizontalStepper`).

- [ ] **Step 4.4 — Verify Re-ship does not toggle expansion**

On a collapsed row:
- Click the **Re-ship** button (not the row body). The row must NOT expand.
- The button flips to "Re-ship requested" and becomes disabled on success.

On an expanded row:
- Click Re-ship. The row stays expanded.
- The button flips to "Re-ship requested" on success.

If the row toggles when clicking Re-ship, `e.stopPropagation()` is not firing — debug `handleReshipClick` in `ItemRow.jsx`.

- [ ] **Step 4.5 — Verify badge tones**

Spot-check one item per status bucket:
- `shipped` / `binned` / `qc_pass` → `success` (green) badge.
- `new` / `batched` / `treated` / `decorated` → `info` (blue) badge.
- Any error status → `critical` (red) badge.

- [ ] **Step 4.6 — Stop the dev server**

Ctrl-C in the terminal running `npm run dev`. Confirm the cloudflared tunnel and esbuild processes exited (they normally do automatically; otherwise `pkill -f "shopify app dev"`).

---

## Self-review notes (for the engineer executing this plan)

If you find behavior that differs from the spec while executing:

1. Re-read `docs/superpowers/specs/2026-04-29-compact-item-list-design.md` to confirm intent.
2. The one intentional refinement vs. the spec is uncontrolled vs. controlled expansion state (see "Note on expansion state" at the top). If you want a different behavior — e.g., an "expand all / collapse all" button — that is a follow-up, not part of this plan.
3. The 401 the user reported on `sewingpartsonline.myshopify.com` is unrelated and tracked separately. Do not investigate it as part of this work.
