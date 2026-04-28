-- PODHero Item History — security and atomicity hardening.
--
-- 1. Maps Shopify shop domains to PODHero accounts (so session tokens can be
--    converted to an account_id without trusting the client).
-- 2. Adds the indexes the Item History block actually queries on.
-- 3. Adds an atomic reship RPC so status update + event insert can't drift apart.
--
-- RLS is already enabled on order_items / order_events with a service_role
-- bypass policy, so this migration does not touch RLS.

-- 1) Shop -> account mapping
ALTER TABLE public.accounts
  ADD COLUMN IF NOT EXISTS shop_domain text;

CREATE UNIQUE INDEX IF NOT EXISTS accounts_shop_domain_key
  ON public.accounts (shop_domain)
  WHERE shop_domain IS NOT NULL;

COMMENT ON COLUMN public.accounts.shop_domain IS
  'Shopify shop domain (e.g. example.myshopify.com). Used to resolve Shopify session tokens to a PODHero account.';

-- 2) Indexes used by /order-history and /reship lookups
CREATE INDEX IF NOT EXISTS order_events_order_id_idx       ON public.order_events (order_id);
CREATE INDEX IF NOT EXISTS order_events_order_item_idx     ON public.order_events (order_item);
CREATE INDEX IF NOT EXISTS order_events_account_id_idx     ON public.order_events (account_id);
CREATE INDEX IF NOT EXISTS order_items_account_id_idx      ON public.order_items  (account_id);

-- 3) Atomic reship: status update + event insert in one transaction, scoped by
--    account so a caller cannot reship items belonging to another tenant.
CREATE OR REPLACE FUNCTION public.reship_order_item(
  p_item_id    text,
  p_account_id text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_id              uuid;
  v_order_id        text;
  v_previous_status text;
BEGIN
  -- Lock the row so concurrent reships don't insert duplicate events.
  SELECT id, order_id, status
    INTO v_id, v_order_id, v_previous_status
  FROM public.order_items
  WHERE id::text = p_item_id
    AND account_id = p_account_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'not_found');
  END IF;

  UPDATE public.order_items
     SET status = 'new'
   WHERE id = v_id;

  INSERT INTO public.order_events (order_id, order_item, event, timestamp, account_id)
  VALUES (v_order_id, v_id::text, 'reship', now(), p_account_id);

  RETURN json_build_object(
    'success',         true,
    'item_id',         v_id,
    'previous_status', v_previous_status
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.reship_order_item(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reship_order_item(text, text) TO service_role;

COMMENT ON FUNCTION public.reship_order_item(text, text) IS
  'Atomically reset an order_item to status=new and log a reship event. Scoped by account_id; returns {success:false, error:''not_found''} if the item does not belong to that account.';
