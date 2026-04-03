// supabase/functions/statuses/index.ts
import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { verifySessionToken } from '../_shared/auth.ts';
import { createAdminClient } from '../_shared/supabase.ts';

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  const headers = { ...corsHeaders(req), 'Content-Type': 'application/json' };

  const authError = await verifySessionToken(req);
  if (authError) return authError;

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase.rpc('get_order_item_statuses');

    if (error) throw error;

    return new Response(
      JSON.stringify({ statuses: data }),
      { status: 200, headers },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers },
    );
  }
});
