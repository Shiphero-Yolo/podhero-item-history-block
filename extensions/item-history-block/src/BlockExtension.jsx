/** @jsxRuntime classic */
/** @jsx h */
import { h, render } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import { fetchOrderHistory, reshipItem } from './supabaseClient';
import ItemRow from './ItemRow.jsx';
import { ERROR_STATUSES } from './statusBadge.js';

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

  const itemEventMap = {};
  events
    .filter((e) => e.order_item)
    .forEach((e) => {
      if (!itemEventMap[e.order_item]) itemEventMap[e.order_item] = [];
      itemEventMap[e.order_item].push(e);
    });

  const totalCount = items.length;
  const errorCount = items.filter((i) => ERROR_STATUSES.has(i.status)).length;
  const shippedCount = items.filter((i) => i.status === 'shipped').length;
  const headerText = `${totalCount} items · ${errorCount} in error · ${shippedCount} shipped`;

  return (
    <s-admin-block title="Item History">
      <s-stack direction="block" gap="base">
        <s-text color="subdued">{headerText}</s-text>
        {items.map((item) => (
          <ItemRow
            key={item.id}
            item={item}
            events={itemEventMap[item.id] || []}
            reshipLoading={!!reshipLoading[item.id]}
            reshipDone={!!reshipDone[item.id]}
            onReship={handleReship}
          />
        ))}
      </s-stack>
    </s-admin-block>
  );
}
