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

  const url = new URL(req.url);
  const orderId = url.searchParams.get('order_id');
  if (!orderId || !/^\d+$/.test(orderId)) {
    return jsonResponse(req, 400, { error: 'order_id must be a positive integer' });
  }

  try {
    const supabase = createAdminClient();
    const [itemsRes, eventsRes] = await Promise.all([
      supabase
        .from('order_items')
        .select('*')
        .eq('order_id', orderId)
        .eq('account_id', accountId),
      supabase
        .from('order_events')
        .select('*')
        .eq('order_id', orderId)
        .eq('account_id', accountId)
        .order('timestamp', { ascending: true }),
    ]);

    if (itemsRes.error) throw itemsRes.error;
    if (eventsRes.error) throw eventsRes.error;

    const items = itemsRes.data ?? [];
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

    return jsonResponse(req, 200, { items: itemsWithSteps, events: eventsRes.data });
  } catch (err) {
    return internalError(req, 'order-history', err);
  }
});
