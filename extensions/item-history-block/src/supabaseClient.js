/**
 * Fetch helpers that call Supabase Edge Functions instead of the Express backend.
 *
 * FUNCTIONS_BASE must match your deployed Supabase project.
 * Session token is retrieved from Shopify's `shopify.auth.idToken()` and sent
 * as a Bearer token so the edge functions can verify it.
 */

const FUNCTIONS_BASE = 'https://qcjiezsjuhpsxcyiduaf.supabase.co/functions/v1';

async function authedFetch(path, options = {}) {
  const token = await shopify.auth.idToken();
  const res = await fetch(`${FUNCTIONS_BASE}${path}`, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Backend error ${res.status}: ${text}`);
  }
  return res.json();
}

export async function fetchOrderHistory(orderId) {
  return authedFetch(`/order-history?order_id=${encodeURIComponent(orderId)}`);
}

export async function reshipItem(itemId) {
  return authedFetch('/reship', {
    method: 'POST',
    body: JSON.stringify({ item_id: itemId }),
  });
}

export async function cancelItem(itemId) {
  return authedFetch('/cancel', {
    method: 'POST',
    body: JSON.stringify({ item_id: itemId }),
  });
}
