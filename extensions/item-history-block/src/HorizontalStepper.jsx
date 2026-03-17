/** @jsxRuntime classic */
/** @jsx h */
import { h } from 'preact';

const HAPPY_PATH = ['new', 'batched', 'treated', 'decorated', 'qc_pass', 'binned', 'shipped'];
const ERROR_STATUSES = new Set(['qc_fail', 'api_fail', 'inventory_fail', 'cancelled']);

const STATUS_ICONS = {
  new: 'clock',
  batched: 'order-batches',
  treated: 'color',
  decorated: 'paint-brush-round',
  qc_pass: 'check-circle',
  binned: 'package',
  shipped: 'delivery',
  qc_fail: 'x-circle',
  api_fail: 'alert-triangle',
  inventory_fail: 'alert-triangle',
  cancelled: 'disabled',
};

function formatLabel(status) {
  return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatTimestamp(ts) {
  if (!ts) return { date: '\u2014', time: '' };
  const d = new Date(ts);
  return {
    date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    time: d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
  };
}

export default function HorizontalStepper({ currentStatus, events }) {
  const eventTimestamps = {};
  (events || []).forEach((evt) => {
    eventTimestamps[evt.event] = evt.timestamp;
  });

  const isError = ERROR_STATUSES.has(currentStatus);
  const activeIndex = HAPPY_PATH.indexOf(currentStatus);

  const steps = HAPPY_PATH.map((step, i) => {
    const isCompleted = activeIndex >= 0 && i <= activeIndex;
    const isCurrent = i === activeIndex && !isError;
    let badgeTone = 'neutral';
    if (isCurrent) badgeTone = 'info';
    else if (isCompleted) badgeTone = 'success';

    return {
      key: step,
      icon: STATUS_ICONS[step] || 'circle',
      label: formatLabel(step),
      timestamp: isCompleted ? formatTimestamp(eventTimestamps[step]) : { date: '\u2014', time: '' },
      badgeTone,
      isCurrent,
      isCompleted,
    };
  });

  if (isError) {
    steps.push({
      key: currentStatus,
      icon: STATUS_ICONS[currentStatus] || 'alert-triangle',
      label: formatLabel(currentStatus),
      timestamp: formatTimestamp(eventTimestamps[currentStatus]),
      badgeTone: 'critical',
      isCurrent: true,
      isCompleted: false,
    });
  }

  // Build grid: alternating icon columns (auto) and connector columns (1fr)
  // e.g. for 7 steps: "auto 1fr auto 1fr auto 1fr auto 1fr auto 1fr auto 1fr auto"
  const colTemplate = steps
    .map((_, i) => (i < steps.length - 1 ? 'auto 1fr' : 'auto'))
    .join(' ');

  // Row 1: badge icons interleaved with connector lines
  const iconRow = steps.flatMap((step, i) => {
    const els = [
      <s-stack direction="block" alignItems="center">
        <s-badge tone={step.badgeTone}>
          <s-stack direction="inline" justifyContent="center">
            <s-icon type={step.icon} size="small" />
          </s-stack>
        </s-badge>
      </s-stack>,
    ];
    if (i < steps.length - 1) {
      els.push(<s-box blockSize="1px" background="subdued" />);
    }
    return els;
  });

  // Row 2: labels interleaved with empty spacers
  const labelRow = steps.flatMap((step, i) => {
    const els = [
      <s-stack direction="block" alignItems="center">
        <s-text
          tone={step.badgeTone === 'critical' ? 'critical' : undefined}
          color={step.badgeTone === 'neutral' ? 'subdued' : undefined}
          type={step.isCurrent ? 'strong' : undefined}
        >
          {step.label}
        </s-text>
      </s-stack>,
    ];
    if (i < steps.length - 1) {
      els.push(<s-box />);
    }
    return els;
  });

  // Row 3: timestamps interleaved with empty spacers
  const tsRow = steps.flatMap((step, i) => {
    const els = [
      <s-stack direction="block" alignItems="center" gap="none">
        <s-text color="subdued" variant="bodyXs">{step.timestamp.date}</s-text>
        {step.timestamp.time && <s-text color="subdued" variant="bodyXs">{step.timestamp.time}</s-text>}
      </s-stack>,
    ];
    if (i < steps.length - 1) {
      els.push(<s-box />);
    }
    return els;
  });

  return (
    <s-grid
      gridTemplateColumns={colTemplate}
      alignItems="center"
      rowGap="small-100"
      columnGap="none"
    >
      {iconRow}
      {labelRow}
      {tsRow}
    </s-grid>
  );
}
