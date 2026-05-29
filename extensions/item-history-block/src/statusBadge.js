// Single source of truth for order_item status semantics shared by the
// stepper and the compact row list.

export const HAPPY_PATH = [
  'new',
  'batched',
  'treated',
  'decorated',
  'qc_pass',
  'binned',
  'shipped',
];

export const ERROR_STATUSES = new Set([
  'qc_fail',
  'api_fail',
  'inventory_fail',
  'cancelled',
]);

// Maps raw `order_events.event` names (the warehouse vocabulary) to the
// canonical happy-path step they stamp. Only events that mark a step a line
// item actually reached belong here; order-level and operational events
// (order_enriched, hospital_flagged, …) are intentionally absent. The stepper
// ignores any event not listed here — extend this as more per-item events land.
export const EVENT_TO_STEP = {
  item_binned: 'binned',
  qc_pass: 'qc_pass',
};

const SUCCESS_STATUSES = new Set(['shipped', 'binned', 'qc_pass']);
const INFO_STATUSES = new Set(['new', 'batched', 'treated', 'decorated']);

export function formatLabel(status) {
  return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function statusBadge(status) {
  let tone = 'neutral';
  if (ERROR_STATUSES.has(status)) tone = 'critical';
  else if (SUCCESS_STATUSES.has(status)) tone = 'success';
  else if (INFO_STATUSES.has(status)) tone = 'info';
  return { label: formatLabel(status), tone };
}
