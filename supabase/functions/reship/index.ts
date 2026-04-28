// supabase/functions/reship/index.ts
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
    console.warn(`unprovisioned shop tried to reship: ${auth.shopDomain}`);
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

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase.rpc('reship_order_item', {
      p_item_id: itemId,
      p_account_id: accountId,
    });

    if (error) throw error;

    const result = data as
      | { success: true; item_id: string; previous_status: string | null }
      | { success: false; error: string };

    if (!result.success) {
      return jsonResponse(req, 404, { error: 'item_not_found' });
    }

    return jsonResponse(req, 200, result);
  } catch (err) {
    return internalError(req, 'reship', err);
  }
});
