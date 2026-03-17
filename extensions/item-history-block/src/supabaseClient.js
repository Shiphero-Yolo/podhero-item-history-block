/**
 * Fetch order history from the app backend, which queries Supabase.
 * fetch() to relative paths is automatically authenticated by Shopify.
 */
export async function fetchOrderHistory(orderId) {
  const res = await fetch(
    `/api/order-history?order_id=${encodeURIComponent(orderId)}`,
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Backend error ${res.status}: ${text}`);
  }
  return res.json();
}

export async function reshipItem(itemId) {
  const res = await fetch('/api/reship', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ item_id: itemId }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Reship failed ${res.status}: ${text}`);
  }
  return res.json();
}
