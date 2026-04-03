// supabase/functions/reship/index.ts
import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { verifySessionToken } from '../_shared/auth.ts';
import { createAdminClient } from '../_shared/supabase.ts';

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  const headers = { ...corsHeaders(req), 'Content-Type': 'application/json' };

  const authError = await verifySessionToken(req);
  if (authError) return authError;

  let body: { item_id?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ error: 'Invalid JSON body' }),
      { status: 400, headers },
    );
  }

  const { item_id } = body;
  if (!item_id || typeof item_id !== 'string' || item_id.trim() === '') {
    return new Response(
      JSON.stringify({ error: 'item_id is required' }),
      { status: 400, headers },
    );
  }

  try {
    const supabase = createAdminClient();

    // Look up the item to confirm it exists
    const { data: item, error: lookupErr } = await supabase
      .from('order_items')
      .select('id, order_id, status')
      .eq('id', item_id)
      .single();

    if (lookupErr || !item) {
      return new Response(
        JSON.stringify({ error: 'Item not found' }),
        { status: 404, headers },
      );
    }

    // Reset item status back to "new"
    const { error: updateErr } = await supabase
      .from('order_items')
      .update({ status: 'new' })
      .eq('id', item_id);

    if (updateErr) throw updateErr;

    // Log a reship event
    const { error: eventErr } = await supabase.from('order_events').insert({
      order_id: item.order_id,
      order_item: item.id,
      event: 'reship',
      timestamp: new Date().toISOString(),
    });

    if (eventErr) throw eventErr;

    return new Response(
      JSON.stringify({ success: true, item_id, previous_status: item.status }),
      { status: 200, headers },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers },
    );
  }
});
