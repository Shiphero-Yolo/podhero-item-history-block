/** @jsxRuntime classic */
/** @jsx h */
import { h } from 'preact';
import HorizontalStepper from './HorizontalStepper.jsx';
import { statusBadge, ERROR_STATUSES } from './statusBadge.js';

export default function ItemRow({
  item,
  events,
  reshipLoading,
  reshipDone,
  onReship,
}) {
  const { label, tone } = statusBadge(item.status);
  const startsOpen = ERROR_STATUSES.has(item.status);

  function handleReshipClick(e) {
    // Prevent the click from toggling the s-details disclosure.
    if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
    onReship(item.id);
  }

  return (
    <s-details defaultOpen={startsOpen}>
      <s-summary>
        <s-stack
          direction="inline"
          gap="base"
          alignItems="center"
          justifyContent="space-between"
        >
          <s-stack direction="block" gap="none">
            <s-text type="strong">{item.product_name}</s-text>
            <s-text color="subdued" variant="bodyXs">
              SKU: {item.sku || '—'} × {item.quantity}
            </s-text>
          </s-stack>
          <s-stack direction="inline" gap="base" alignItems="center">
            <s-badge tone={tone}>{label}</s-badge>
            <s-button
              variant="secondary"
              disabled={reshipDone}
              loading={reshipLoading}
              onClick={handleReshipClick}
            >
              {reshipDone ? 'Re-ship requested' : 'Re-ship'}
            </s-button>
          </s-stack>
        </s-stack>
      </s-summary>
      <s-box paddingBlockStart="base">
        <HorizontalStepper currentStatus={item.status} events={events} />
      </s-box>
    </s-details>
  );
}
