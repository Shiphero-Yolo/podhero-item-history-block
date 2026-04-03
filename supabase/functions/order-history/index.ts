// supabase/functions/order-history/index.ts
import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { verifySessionToken } from '../_shared/auth.ts';
import { createAdminClient } from '../_shared/supabase.ts';

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  const headers = { ...corsHeaders(req), 'Content-Type': 'application/json' };

  const authError = await verifySessionToken(req);
  if (authError) return authError;

  const url = new URL(req.url);
  const orderId = url.searchParams.get('order_id');

  if (!orderId || !/^\d+$/.test(orderId)) {
    return new Response(
      JSON.stringify({ error: 'order_id must be a positive integer' }),
      { status: 400, headers },
    );
  }

  try {
    const supabase = createAdminClient();

    const [itemsRes, eventsRes] = await Promise.all([
      supabase.from('order_items').select('*').eq('order_id', orderId),
      supabase
        .from('order_events')
        .select('*')
        .eq('order_id', orderId)
        .order('timestamp', { ascending: true }),
    ]);

    if (itemsRes.error) throw itemsRes.error;
    if (eventsRes.error) throw eventsRes.error;

    return new Response(
      JSON.stringify({ items: itemsRes.data, events: eventsRes.data }),
      { status: 200, headers },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers },
    );
  }
});
