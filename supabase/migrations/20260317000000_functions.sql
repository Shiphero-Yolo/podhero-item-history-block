CREATE OR REPLACE FUNCTION public.get_order_item_statuses()
  RETURNS text[]
  LANGUAGE plpgsql
  SECURITY DEFINER
AS $function$
DECLARE
  constraint_def text;
  statuses text[];
BEGIN
  SELECT pg_get_constraintdef(c.oid) INTO constraint_def
  FROM pg_constraint c
  JOIN pg_class t ON c.conrelid = t.oid
  JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(c.conkey)
  WHERE t.relname = 'order_items'
    AND a.attname = 'status'
    AND c.contype = 'c'
  LIMIT 1;

  SELECT array_agg(m[1]) INTO statuses
  FROM regexp_matches(constraint_def, '''([^'']+)''', 'g') AS m;

  RETURN statuses;
END;
$function$;
