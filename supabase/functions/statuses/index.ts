// supabase/functions/statuses/index.ts
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

  // Statuses are global, but we still require a provisioned shop so that
  // unknown/abandoned tokens can't probe the function.
  const accountId = await getAccountIdForShop(auth.shopDomain);
  if (!accountId) {
    return jsonResponse(req, 403, { error: 'shop_not_provisioned' });
  }

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase.rpc('get_order_item_statuses');
    if (error) throw error;
    return jsonResponse(req, 200, { statuses: data });
  } catch (err) {
    return internalError(req, 'statuses', err);
  }
});
