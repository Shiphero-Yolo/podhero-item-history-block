// supabase/functions/order-history/index.ts
import { handleCors } from '../_shared/cors.ts';
import { verifySessionToken } from '../_shared/auth.ts';
import { getAccountIdForShop } from '../_shared/account.ts';
import { createAdminClient } from '../_shared/supabase.ts';
import { internalError, jsonResponse } from '../_shared/http.ts';

// batched_at / decorated_at live on production_items (one row per unit), not on
// order_items. We fold a line item's units down to the earliest time it reached
// each step — i.e. when the line first got batched / decorated.
type ProductionStep = { batched: string | null; decorated: string | null };
type ProductionRow = { order_item_id: string; batched_at: string | null; decorated_at: string | null };

function earliest(a: string | null, b: string | null): string | null {
  if (!a) return b;
  if (!b) return a;
  return new Date(a) <= new Date(b) ? a : b;
}

function foldProductionSteps(rows: ProductionRow[]): Record<string, ProductionStep> {
  const byItem: Record<string, ProductionStep> = {};
  for (const r of rows) {
    const cur = byItem[r.order_item_id] ?? { batched: null, decorated: null };
    cur.batched = earliest(cur.batched, r.batched_at);
    cur.decorated = earliest(cur.decorated, r.decorated_at);
    byItem[r.order_item_id] = cur;
  }
  return byItem;
}

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  const auth = await verifySessionToken(req);
  if (!auth.ok) return jsonResponse(req, auth.status, { error: auth.error });

  const accountId = await getAccountIdForShop(auth.shopDomain);
  if (!accountId) {
    console.warn(`unprovisioned shop tried to access order-history: ${auth.shopDomain}`);
    return jsonResponse(req, 403, { error: 'shop_not_provisioned' });
  }

  // Accept either identifier:
  //   order_number — the merchant-facing order name (order_items.order_number),
  //                  sent by the extension after resolving the Shopify order name.
  //   order_id     — PODHero's internal order id (order_items.order_id), which is
  //                  also the only key on order_events.
  // order_number wins when both are present. Both are all-digit text values.
  const url = new URL(req.url);
  const orderNumber = url.searchParams.get('order_number');
  const orderId = url.searchParams.get('order_id');
  const lookupValue = orderNumber ?? orderId;
  const lookupColumn = orderNumber ? 'order_number' : 'order_id';
  if (!lookupValue || !/^\d+$/.test(lookupValue)) {
    return jsonResponse(req, 400, {
      error: 'order_number or order_id must be a positive integer',
    });
  }

  try {
    const supabase = createAdminClient();

    const itemsRes = await supabase
      .from('order_items')
      .select('*')
      .eq(lookupColumn, lookupValue)
      .eq('account_id', accountId);
    if (itemsRes.error) throw itemsRes.error;
    const items = itemsRes.data ?? [];

    // order_events is keyed by order_id only. When the caller passed order_id we
    // query it directly (unchanged behaviour); when they passed order_number we
    // resolve the order_id(s) from the matched items — 1:1 in practice, but `.in`
    // stays correct if a number ever spans rows.
    const eventOrderIds =
      lookupColumn === 'order_id'
        ? [lookupValue]
        : [...new Set(items.map((i) => i.order_id).filter(Boolean))];

    let events: unknown[] = [];
    if (eventOrderIds.length > 0) {
      const eventsRes = await supabase
        .from('order_events')
        .select('*')
        .in('order_id', eventOrderIds)
        .eq('account_id', accountId)
        .order('timestamp', { ascending: true });
      if (eventsRes.error) throw eventsRes.error;
      events = eventsRes.data ?? [];
    }

    const itemIds = items.map((i) => i.id);

    // production_items has no account_id of its own; scoping holds because
    // itemIds were already filtered by account_id above.
    let stepsByItem: Record<string, ProductionStep> = {};
    if (itemIds.length > 0) {
      const prodRes = await supabase
        .from('production_items')
        .select('order_item_id, batched_at, decorated_at')
        .in('order_item_id', itemIds);
      if (prodRes.error) throw prodRes.error;
      stepsByItem = foldProductionSteps((prodRes.data ?? []) as ProductionRow[]);
    }

    const itemsWithSteps = items.map((item) => ({
      ...item,
      step_timestamps: stepsByItem[item.id] ?? { batched: null, decorated: null },
    }));

    return jsonResponse(req, 200, { items: itemsWithSteps, events });
  } catch (err) {
    return internalError(req, 'order-history', err);
  }
});
