/** @jsxRuntime classic */
/** @jsx h */
import { h, render } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import { fetchOrderHistory, reshipItem, cancelItem } from './supabaseClient';
import ItemRow from './ItemRow.jsx';
import { ERROR_STATUSES } from './statusBadge.js';

// Surfaced as a small badge so we can tell which build a merchant is running
// when debugging in the admin. Bump on each release.
const VERSION = 'v1.3.0';

// DEV showcase override. The pod-hero-app dev store's own orders don't exist in
// PODHero's data, so a live lookup there renders "No history found". Set this to
// a real PODHero order_number (e.g. '32163704' — order_id 805210884, account
// sewingpartsonline, 5 line items spanning shipped/cancelled/backordered) to
// force that order to render from any dev-store order page. Leave '' in
// production so the block uses the actually-selected order. Remove before GA.
const DEV_ORDER_NUMBER_OVERRIDE = '';

// Resolves a Shopify order GID to its human order number (the order *name*,
// e.g. "#32163704" -> "32163704") — the key PODHero stores order history under.
async function fetchOrderName(orderGid) {
  const res = await fetch('shopify:admin/api/graphql.json', {
    method: 'POST',
    body: JSON.stringify({
      query: 'query($id: ID!) { order(id: $id) { name } }',
      variables: { id: orderGid },
    }),
  });
  if (!res.ok) throw new Error(`Shopify GraphQL ${res.status}`);
  const json = await res.json();
  const name = json?.data?.order?.name;
  if (!name) throw new Error('Order name not found');
  return name.replace(/^#/, '').trim();
}

export default async () => {
  render(<Extension />, document.body);
};

function Extension() {
  const { data } = shopify;
  const orderGid = data.selected?.[0]?.id ?? null;

  const [orderNumber, setOrderNumber] = useState(DEV_ORDER_NUMBER_OVERRIDE);
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
    if (!orderGid && !DEV_ORDER_NUMBER_OVERRIDE) {
      setLoading(false);
      setError('No order selected.');
      return;
    }

    async function fetchData() {
      try {
        // The dev override (when set) wins so the showcase order renders from any
        // dev-store order page; otherwise resolve the selected order's number.
        const number = DEV_ORDER_NUMBER_OVERRIDE || (await fetchOrderName(orderGid));
        setOrderNumber(number);
        const { items: itemsData, events: eventsData } = await fetchOrderHistory(number);
        setItems(itemsData);
        setEvents(eventsData);
      } catch (err) {
        setError(err.message || 'Failed to load item history.');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [orderGid]);

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
        <s-stack
          direction="inline"
          gap="small"
          justifyContent="space-between"
          alignItems="center"
        >
          <s-text color="subdued">{headerText}</s-text>
          <s-stack direction="inline" gap="small" alignItems="center">
            {orderNumber && (
              <s-link
                href={`shopify:admin/apps/podhero-item-history?order_number=${orderNumber}`}
                tone="primary"
              >
                Open full history
              </s-link>
            )}
            <s-text color="subdued">{VERSION}</s-text>
          </s-stack>
        </s-stack>
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
