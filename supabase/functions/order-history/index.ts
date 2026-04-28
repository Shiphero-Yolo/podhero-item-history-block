// supabase/functions/order-history/index.ts
import { handleCors } from '../_shared/cors.ts';
import { verifySessionToken } from '../_shared/auth.ts';
import { getAccountIdForShop } from '../_shared/account.ts';
import { createAdminClient } from '../_shared/supabase.ts';
import { internalError, jsonResponse } from '../_shared/http.ts';

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

    return jsonResponse(req, 200, { items: itemsRes.data, events: eventsRes.data });
  } catch (err) {
    return internalError(req, 'order-history', err);
  }
});
