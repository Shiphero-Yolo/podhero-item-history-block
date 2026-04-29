# Compact item list for the order-details block

**Status:** Design approved, awaiting implementation plan
**Author:** abraham
**Date:** 2026-04-29

## Problem

The Item History block on the Shopify Order details page renders a full
seven-stage horizontal stepper for every item in the order. On orders with
many items (tens or hundreds), this layout is unscannable: the merchant
cannot see the full list at a glance and has to scroll past one giant
stepper per item to find the one they care about.

## Goal

Make the block usable on orders of any size while keeping the lifecycle
detail one click away.

## Non-goals

- No search, filter, or sort.
- No bulk actions across items.
- No backend, edge function, or database changes.
- No changes to the embedded app home (the static landing page).
- No changes to `HorizontalStepper.jsx` internals — it is reused as-is.
- The 401 the merchant is seeing on `sewingpartsonline` is tracked
  separately; it is not addressed here.

## Design

### Layout

The block renders a single vertical list. Each item is one row:

```
[chevron] Product name             SKU × qty           [Status badge]   [Re-ship]
```

- Clicking anywhere on the row (except the Re-ship button) toggles the
  expanded state for that row.
- Expanded rows render the existing `HorizontalStepper` directly below
  the row, indented under that item's row.
- Above the list, a small header shows totals:
  `23 items · 3 in error · 12 shipped`. All three counts are always
  shown, even when zero (`5 items · 0 in error · 0 shipped`). Counts
  derive from the items array client-side; no extra fetch.

### Default expansion

- All rows collapsed by default.
- Items in an error status (`qc_fail`, `api_fail`, `inventory_fail`,
  `cancelled`) start expanded so visible problems are not hidden behind
  a click. The set of error statuses is the existing `ERROR_STATUSES`
  constant in `HorizontalStepper.jsx`.

### Status badge tones

The badge in the collapsed row uses these tones:

| Status                                              | Tone       |
| --------------------------------------------------- | ---------- |
| `qc_fail`, `api_fail`, `inventory_fail`, `cancelled`| `critical` |
| `shipped`, `binned`, `qc_pass`                      | `success`  |
| `new`, `batched`, `treated`, `decorated`            | `info`     |
| anything else                                       | `neutral`  |

Label for the badge is the existing `formatLabel(status)` (raw status
with underscores → spaces, title-cased).

### Re-ship interaction

- The Re-ship button lives on the collapsed row, right of the badge.
- Clicking it must not toggle row expansion — `event.stopPropagation()`
  on the button's click handler.
- All existing optimistic state (`reshipLoading[itemId]`,
  `reshipDone[itemId]`) is preserved; the button still flips to
  "Re-ship requested" after success.

## Components

### Touched

- `extensions/item-history-block/src/BlockExtension.jsx`
  - Replaces the per-item stepper rendering with `ItemRow` components.
  - Adds `expanded: Set<string>` state and a toggle helper.
  - Computes header totals (total, in-error, shipped) from `items`.

### New

- `extensions/item-history-block/src/ItemRow.jsx`
  - Props: `item`, `events`, `expanded`, `onToggle`,
    `reshipLoading`, `reshipDone`, `onReship`.
  - Renders the collapsed row plus, when `expanded` is true, the
    existing `HorizontalStepper` underneath.
- `extensions/item-history-block/src/statusBadge.js`
  - Exports `statusBadge(status) → { label, tone }` and the
    `ERROR_STATUSES` set. `HorizontalStepper.jsx` is updated to import
    `ERROR_STATUSES` and `formatLabel` from this module so there is a
    single source of truth (no duplication of the constants in two
    places).

### Unchanged

- `HorizontalStepper.jsx` — internals untouched; only its imports for
  `ERROR_STATUSES` / `formatLabel` move to `statusBadge.js`.
- `supabaseClient.js` — no API changes.
- All edge functions and migrations.

## Data flow

Identical to today:

1. Mount → `fetchOrderHistory(orderId)` returns `{ items, events }`.
2. Build `itemEventMap` keyed by `event.order_item`.
3. Render header (totals from `items`) + one `ItemRow` per item with the
   item's events from the map.
4. Re-ship still posts to `/reship` via `reshipItem(itemId)`.

## State

In `BlockExtension`:

| State                | Existing? | Notes                                    |
| -------------------- | --------- | ---------------------------------------- |
| `items`              | yes       | Unchanged                                |
| `events`             | yes       | Unchanged                                |
| `loading`            | yes       | Unchanged                                |
| `error`              | yes       | Unchanged (top-level error banner)       |
| `reshipLoading`      | yes       | Unchanged                                |
| `reshipDone`         | yes       | Unchanged                                |
| `expanded`           | new       | `Set<itemId>`; seeded from error items   |

## Edge cases

- **Item with no events** — row renders; expanded stepper shows
  all-empty timestamps (current behavior).
- **Status not in any tone bucket** — badge tone falls back to
  `neutral`, label is `formatLabel(status)`.
- **Re-ship failure** — surfaces through the existing top-level
  `error` state. No change.
- **Empty order** — current "No history found for this order." message
  is preserved.

## Testing

No automated tests in this repo today; not adding a harness in this
change.

Manual verification on `pod-hero-app.myshopify.com` (order details page):

- Order with 1 item — collapsed by default, expanding shows the
  stepper, Re-ship still works.
- Order with ≥20 items — list is scannable; only error rows start
  expanded.
- Order with an item in `qc_fail` — that row starts expanded, badge is
  `critical`.
- Re-ship click on a collapsed row — does not toggle expansion;
  button flips to "Re-ship requested" on success.
- Re-ship click on an expanded row — same as today.
