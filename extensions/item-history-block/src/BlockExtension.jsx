/** @jsxRuntime classic */
/** @jsx h */
import { h, render } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import { fetchOrderHistory, reshipItem } from './supabaseClient';
import HorizontalStepper from './HorizontalStepper.jsx';

export default async () => {
  render(<Extension />, document.body);
};

function Extension() {
  const { data } = shopify;
  const orderGid = data.selected?.[0]?.id ?? null;
  const orderId = orderGid ? orderGid.split('/').pop() : null;

  const [items, setItems] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reshipLoading, setReshipLoading] = useState({});
  const [reshipDone, setReshipDone] = useState({});

  async function handleReship(itemId) {
    setReshipLoading((prev) => ({ ...prev, [itemId]: true }));
    try {
      await reshipItem(itemId);
      setReshipDone((prev) => ({ ...prev, [itemId]: true }));
    } catch (err) {
      setError(err.message || 'Re-ship request failed.');
    } finally {
      setReshipLoading((prev) => ({ ...prev, [itemId]: false }));
    }
  }

  useEffect(() => {
    if (!orderId) {
      setLoading(false);
      setError('No order selected.');
      return;
    }

    async function fetchData() {
      try {
        const { items: itemsData, events: eventsData } = await fetchOrderHistory(orderId);
        setItems(itemsData);
        setEvents(eventsData);
      } catch (err) {
        setError(err.message || 'Failed to load item history.');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [orderId]);

  if (loading) {
    return (
      <s-admin-block title="Item History">
        <s-text>Loading...</s-text>
      </s-admin-block>
    );
  }

  if (error) {
    return (
      <s-admin-block title="Item History">
        <s-text tone="critical">{error}</s-text>
      </s-admin-block>
    );
  }

  if (items.length === 0 && events.length === 0) {
    return (
      <s-admin-block title="Item History">
        <s-text>No history found for this order.</s-text>
      </s-admin-block>
    );
  }

  // Build item → events map (only item-level events)
  const itemEventMap = {};
  events
    .filter((e) => e.order_item)
    .forEach((e) => {
      if (!itemEventMap[e.order_item]) itemEventMap[e.order_item] = [];
      itemEventMap[e.order_item].push(e);
    });

  return (
    <s-admin-block title="Item History">
      <s-stack direction="block" gap="base">
        {items.map((item, idx) => {
          const itemEvents = itemEventMap[item.id] || [];

          return (
            <s-stack direction="block" gap="small" key={item.id}>
              {idx > 0 && <s-divider />}
              <s-heading>{item.product_name}</s-heading>
              <s-text color="subdued">
                SKU: {item.sku || '—'} × {item.quantity}
              </s-text>
              <HorizontalStepper currentStatus={item.status} events={itemEvents} />
              <s-stack direction="inline" justifyContent="end">
                <s-button
                  variant="secondary"
                  disabled={reshipDone[item.id]}
                  loading={reshipLoading[item.id]}
                  onClick={() => handleReship(item.id)}
                >
                  {reshipDone[item.id] ? 'Re-ship requested' : 'Re-ship'}
                </s-button>
              </s-stack>
            </s-stack>
          );
        })}
      </s-stack>
    </s-admin-block>
  );
}
