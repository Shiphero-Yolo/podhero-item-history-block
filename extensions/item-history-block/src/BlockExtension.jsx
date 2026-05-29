/** @jsxRuntime classic */
/** @jsx h */
import { h, render } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import { fetchOrderHistory, reshipItem, cancelItem } from './supabaseClient';
import ItemRow from './ItemRow.jsx';
import { ERROR_STATUSES } from './statusBadge.js';

export default async () => {
  render(<Extension />, document.body);
};

function Extension() {
  const { data } = shopify;
  const orderGid = data.selected?.[0]?.id ?? null;
  // DEV: hardcoded to a real sewingparts-podhero order so the block can be
  // exercised from any order page in the pod-hero-app dev store. Order 805210884
  // (account sewingpartsonline.myshopify.com) has 5 line items spanning shipped,
  // cancelled, and backordered — it exercises the happy path, the error branch,
  // and a neutral status in one view. Restore `orderGid.split('/').pop()` before ship.
  const orderId = '805210884';

  const [items, setItems] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reshipLoading, setReshipLoading] = useState({});
  const [reshipDone, setReshipDone] = useState({});
  const [cancelLoading, setCancelLoading] = useState({});
  const [cancelDone, setCancelDone] = useState({});

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

  async function handleCancel(itemId) {
    if (!window.confirm('Cancel this line item? This cannot be undone.')) return;
    setCancelLoading((prev) => ({ ...prev, [itemId]: true }));
    try {
      await cancelItem(itemId);
      setCancelDone((prev) => ({ ...prev, [itemId]: true }));
    } catch (err) {
      setError(err.message || 'Cancel request failed.');
    } finally {
      setCancelLoading((prev) => ({ ...prev, [itemId]: false }));
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
            cancelLoading={!!cancelLoading[item.id]}
            cancelDone={!!cancelDone[item.id]}
            onCancel={handleCancel}
          />
        ))}
      </s-stack>
    </s-admin-block>
  );
}
