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
  cancelLoading,
  cancelDone,
  onCancel,
}) {
  const { label, tone } = statusBadge(item.status);
  const startsOpen = ERROR_STATUSES.has(item.status);

  function handleReshipClick(e) {
    // s-details toggles on click bubbling up from the summary; stop both
    // the bubble and the default toggle so the disclosure state stays put.
    e.stopPropagation();
    e.preventDefault();
    onReship(item.id);
  }

  function handleCancelClick(e) {
    e.stopPropagation();
    e.preventDefault();
    onCancel(item.id);
  }

  return (
    <s-details defaultOpen={startsOpen || undefined}>
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
            <s-button
              variant="secondary"
              tone="critical"
              disabled={cancelDone}
              loading={cancelLoading}
              onClick={handleCancelClick}
            >
              {cancelDone ? 'Cancellation requested' : 'Cancel'}
            </s-button>
          </s-stack>
        </s-stack>
      </s-summary>
      <s-box paddingBlockStart="base">
        <HorizontalStepper currentStatus={item.status} events={events} createdAt={item.created_at} stepTimestamps={item.step_timestamps} />
      </s-box>
    </s-details>
  );
}
