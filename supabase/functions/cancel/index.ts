// supabase/functions/cancel/index.ts
import { handleCors } from '../_shared/cors.ts';
import { verifySessionToken } from '../_shared/auth.ts';
import { getAccountIdForShop } from '../_shared/account.ts';
import { createAdminClient } from '../_shared/supabase.ts';
import { internalError, jsonResponse } from '../_shared/http.ts';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  const auth = await verifySessionToken(req);
  if (!auth.ok) return jsonResponse(req, auth.status, { error: auth.error });

  const accountId = await getAccountIdForShop(auth.shopDomain);
  if (!accountId) {
    console.warn(`unprovisioned shop tried to cancel: ${auth.shopDomain}`);
    return jsonResponse(req, 403, { error: 'shop_not_provisioned' });
  }

  let body: { item_id?: string };
  try {
    body = await req.json();
  } catch {
    return jsonResponse(req, 400, { error: 'invalid_json' });
  }

  const itemId = body.item_id;
  if (!itemId || typeof itemId !== 'string' || itemId.trim() === '') {
    return jsonResponse(req, 400, { error: 'item_id is required' });
  }

  // order_items.id is a uuid; a malformed id would fail the cast inside the
  // RPC and surface as a 500.
  if (!UUID_RE.test(itemId)) {
    return jsonResponse(req, 404, { error: 'item_not_found' });
  }

  try {
    const supabase = createAdminClient();

    // enqueue_cancel_line_item(p_order_item_id) is not account-scoped, so
    // confirm the line belongs to this shop's account before enqueueing.
    const { data: item, error: itemError } = await supabase
      .from('order_items')
      .select('id')
      .eq('id', itemId)
      .eq('account_id', accountId)
      .maybeSingle();

    if (itemError) throw itemError;
    if (!item) return jsonResponse(req, 404, { error: 'item_not_found' });

    const { data, error } = await supabase.rpc('enqueue_cancel_line_item', {
      p_order_item_id: itemId,
    });

    if (error) throw error;

    const result = data as
      | { success: true; message_id?: number; already_cancelled?: boolean }
      | { success: false; error: string };

    if (!result.success) {
      return jsonResponse(req, 404, { error: 'item_not_found' });
    }

    return jsonResponse(req, 200, { ...result, item_id: itemId });
  } catch (err) {
    return internalError(req, 'cancel', err);
  }
});
