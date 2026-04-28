// supabase/functions/_shared/account.ts
//
// Resolves a Shopify shop domain (taken from a verified session token's `dest`
// claim) to a PODHero account_id. The mapping lives in `accounts.shop_domain`.
//
// Returns null if no account is provisioned for the shop. Callers must treat
// this as a hard authorization failure — never fall back to "unscoped" data.

import { createAdminClient } from './supabase.ts';

const cache = new Map<string, { id: string; expiresAt: number }>();
const TTL_MS = 60_000;

export async function getAccountIdForShop(shopDomain: string): Promise<string | null> {
  const now = Date.now();
  const cached = cache.get(shopDomain);
  if (cached && cached.expiresAt > now) return cached.id;

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('accounts')
    .select('id')
    .eq('shop_domain', shopDomain)
    .maybeSingle();

  if (error) {
    console.error('account lookup failed:', error.message);
    return null;
  }
  if (!data) return null;

  const id = data.id as string;
  cache.set(shopDomain, { id, expiresAt: now + TTL_MS });
  return id;
}
