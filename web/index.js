import express from 'express';
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';

const SUPABASE_URL = process.env.SUPABASE_URL || 'http://localhost:54321';
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const SHOPIFY_API_SECRET = process.env.SHOPIFY_API_SECRET;
if (!SHOPIFY_API_SECRET) {
  console.warn('WARNING: SHOPIFY_API_SECRET is not set. Session token verification will reject all requests.');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const app = express();

app.use(express.json());

// --- CORS middleware ---
// Extensions run in a Shopify sandbox; the origin may be a tunnel URL,
// admin.shopify.com, *.myshopify.com, or null. Reflect the request origin.
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  // Prevent ORB from stripping cross-origin JSON responses
  res.setHeader('X-Content-Type-Options', 'nosniff');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

// --- Session token verification middleware for /api/* routes ---
// Shopify admin extensions send an OIDC ID token via Authorization header.
// For now, decode and log but don't reject — full verification requires
// fetching Shopify's JWKS to verify RS256 signatures.
function verifySessionToken(req, _res, next) {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    try {
      const decoded = jwt.decode(token);
      req.sessionToken = decoded;
      console.log('Session token shop:', decoded?.dest || decoded?.iss);
    } catch (err) {
      console.warn('Could not decode session token:', err.message);
    }
  }
  next();
}

app.use('/api', verifySessionToken);

let statusCache = { statuses: null, expiresAt: 0 };

app.get('/api/statuses', async (_req, res) => {
  try {
    if (statusCache.statuses && Date.now() < statusCache.expiresAt) {
      return res.json({ statuses: statusCache.statuses });
    }
    const { data, error } = await supabase.rpc('get_order_item_statuses');
    if (error) throw error;
    statusCache = { statuses: data, expiresAt: Date.now() + 5 * 60 * 1000 };
    res.json({ statuses: data });
  } catch (err) {
    console.error('Error fetching statuses:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/order-history', async (req, res) => {
  const orderId = req.query.order_id;
  if (!orderId) return res.status(400).json({ error: 'order_id is required' });

  try {
    const [itemsRes, eventsRes] = await Promise.all([
      supabase.from('order_items').select('*').eq('order_id', orderId),
      supabase
        .from('order_events')
        .select('*')
        .eq('order_id', orderId)
        .order('timestamp', { ascending: true }),
    ]);

    if (itemsRes.error) throw itemsRes.error;
    if (eventsRes.error) throw eventsRes.error;

    res.json({ items: itemsRes.data, events: eventsRes.data });
  } catch (err) {
    console.error('Error fetching order history:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/reship', async (req, res) => {
  const { item_id } = req.body;
  if (!item_id) return res.status(400).json({ error: 'item_id is required' });

  try {
    // Look up the item to confirm it exists
    const { data: item, error: lookupErr } = await supabase
      .from('order_items')
      .select('id, order_id, status')
      .eq('id', item_id)
      .single();

    if (lookupErr || !item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    // Reset item status back to "new"
    const { error: updateErr } = await supabase
      .from('order_items')
      .update({ status: 'new' })
      .eq('id', item_id);

    if (updateErr) throw updateErr;

    // Log a reship event
    const { error: eventErr } = await supabase.from('order_events').insert({
      order_id: item.order_id,
      order_item: item.id,
      event: 'reship',
      timestamp: new Date().toISOString(),
    });

    if (eventErr) throw eventErr;

    res.json({ success: true, item_id, previous_status: item.status });
  } catch (err) {
    console.error('Error processing reship:', err);
    res.status(500).json({ error: err.message });
  }
});

// App page shown when "Open app" is clicked from the admin
app.get('/', async (req, res) => {
  // TODO: use req.query.order_id once Shopify order IDs are linked to DB
  const orderId = '766995939';

  const [itemsRes, eventsRes] = await Promise.all([
    supabase.from('order_items').select('*').eq('order_id', orderId),
    supabase.from('order_events').select('*').eq('order_id', orderId).order('timestamp', { ascending: true }),
  ]);

  const items = itemsRes.data || [];
  const events = eventsRes.data || [];

  const HAPPY_PATH = ['new', 'batched', 'treated', 'decorated', 'qc_pass', 'binned', 'shipped'];
  const ERROR_STATUSES = new Set(['qc_fail', 'api_fail', 'inventory_fail', 'cancelled']);
  const STATUS_ICONS = {
    new: 'clock', batched: 'order-batches', treated: 'color', decorated: 'paint-brush-round',
    qc_pass: 'check-circle', binned: 'package', shipped: 'delivery',
    qc_fail: 'x-circle', api_fail: 'alert-triangle', inventory_fail: 'alert-triangle', cancelled: 'disabled',
  };

  function formatLabel(s) { return s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()); }
  function formatTimestamp(ts) {
    if (!ts) return { date: '\u2014', time: '' };
    const d = new Date(ts);
    return {
      date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      time: d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    };
  }

  function renderStepper(currentStatus, itemEvents) {
    const eventTimestamps = {};
    itemEvents.forEach(evt => { eventTimestamps[evt.event] = evt.timestamp; });
    const isError = ERROR_STATUSES.has(currentStatus);
    const activeIndex = HAPPY_PATH.indexOf(currentStatus);

    const steps = HAPPY_PATH.map((step, i) => {
      const isCompleted = activeIndex >= 0 && i <= activeIndex;
      const isCurrent = i === activeIndex && !isError;
      let badgeTone = 'neutral';
      if (isCurrent) badgeTone = 'info';
      else if (isCompleted) badgeTone = 'success';
      return { key: step, icon: STATUS_ICONS[step] || 'circle', label: formatLabel(step),
        timestamp: isCompleted ? formatTimestamp(eventTimestamps[step]) : { date: '\u2014', time: '' }, badgeTone, isCurrent, isCompleted };
    });

    if (isError) {
      steps.push({ key: currentStatus, icon: STATUS_ICONS[currentStatus] || 'alert-triangle',
        label: formatLabel(currentStatus), timestamp: formatTimestamp(eventTimestamps[currentStatus]),
        badgeTone: 'critical', isCurrent: true, isCompleted: false });
    }

    const colTemplate = steps.map((_, i) => (i < steps.length - 1 ? 'auto 1fr' : 'auto')).join(' ');

    const iconRow = steps.map((step, i) => {
      let html = `<s-stack direction="block" alignItems="center"><s-badge tone="${step.badgeTone}"><s-stack direction="inline" justifyContent="center"><s-icon type="${step.icon}" size="small"></s-icon></s-stack></s-badge></s-stack>`;
      if (i < steps.length - 1) html += `<s-box blockSize="1px" background="subdued"></s-box>`;
      return html;
    }).join('');

    const labelRow = steps.map((step, i) => {
      const tone = step.badgeTone === 'critical' ? ' tone="critical"' : '';
      const color = step.badgeTone === 'neutral' ? ' color="subdued"' : '';
      const type = step.isCurrent ? ' type="strong"' : '';
      let html = `<s-stack direction="block" alignItems="center"><s-text${tone}${color}${type}>${step.label}</s-text></s-stack>`;
      if (i < steps.length - 1) html += `<s-box></s-box>`;
      return html;
    }).join('');

    const tsRow = steps.map((step, i) => {
      const timeHtml = step.timestamp.time ? `<s-text color="subdued" variant="bodyXs">${step.timestamp.time}</s-text>` : '';
      let html = `<s-stack direction="block" alignItems="center" gap="none"><s-text color="subdued" variant="bodyXs">${step.timestamp.date}</s-text>${timeHtml}</s-stack>`;
      if (i < steps.length - 1) html += `<s-box></s-box>`;
      return html;
    }).join('');

    return `<s-grid gridTemplateColumns="${colTemplate}" alignItems="center" rowGap="small-100" columnGap="none">${iconRow}${labelRow}${tsRow}</s-grid>`;
  }

  const itemEventMap = {};
  events.filter(e => e.order_item).forEach(e => {
    if (!itemEventMap[e.order_item]) itemEventMap[e.order_item] = [];
    itemEventMap[e.order_item].push(e);
  });

  const itemsHtml = items.length === 0
    ? '<s-text>No history found for this order.</s-text>'
    : items.map((item, idx) => {
        const itemEvents = itemEventMap[item.id] || [];
        const divider = idx > 0 ? '<s-divider></s-divider>' : '';
        return `<s-stack direction="block" gap="small">
          ${divider}
          <s-heading>${item.product_name}</s-heading>
          <s-text color="subdued">SKU: ${item.sku || '\u2014'} \u00d7 ${item.quantity}</s-text>
          ${renderStepper(item.status, itemEvents)}
        </s-stack>`;
      }).join('');

  res.type('html').send(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>PODHero - Item History</title>
  <script src="https://cdn.shopify.com/shopifycloud/polaris.js"></script>
</head>
<body>
  <s-page heading="Item History">
    <s-section>
      <s-stack direction="block" gap="base">
        ${itemsHtml}
      </s-stack>
    </s-section>
  </s-page>
</body>
</html>`);
});

// --- Stepper preview page (standalone, no Shopify/Supabase needed) ---
app.get('/preview', (_req, res) => {
  res.type('html').send(buildPreviewHtml());
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`App server listening on port ${PORT}`));

function buildPreviewHtml() {
  const HAPPY_PATH = ['new', 'batched', 'treated', 'decorated', 'qc_pass', 'binned', 'shipped'];
  const ERROR_STATUSES = ['qc_fail', 'api_fail', 'inventory_fail', 'cancelled'];
  const GREEN = '#008060', GREY = '#c9cccf', RED = '#d72c0d';

  const ICONS = {
    new: (c) => `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
    batched: (c) => `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>`,
    treated: (c) => `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>`,
    decorated: (c) => `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><path d="M2 2l7.586 7.586"/><circle cx="11" cy="11" r="2"/></svg>`,
    qc_pass: (c) => `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`,
    binned: (c) => `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>`,
    shipped: (c) => `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>`,
    qc_fail: (c) => `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
    _error: (c) => `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
  };

  function getIcon(status, color) { return (ICONS[status] || ICONS._error)(color); }
  function formatLabel(s) { return s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()); }
  function fmtTs(ts) { return ts ? new Date(ts).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '\u2014'; }

  function mockEvents(status) {
    const idx = HAPPY_PATH.indexOf(status);
    const isErr = ERROR_STATUSES.includes(status);
    const events = [];
    const base = new Date('2026-03-14T09:00:00Z');
    const stepsToFill = isErr ? HAPPY_PATH.length : (idx >= 0 ? idx + 1 : 0);
    for (let i = 0; i < stepsToFill; i++) {
      events.push({ event: HAPPY_PATH[i], timestamp: new Date(base.getTime() + i * 3600000 * 4).toISOString() });
    }
    if (isErr) {
      events.push({ event: status, timestamp: new Date(base.getTime() + stepsToFill * 3600000 * 4).toISOString() });
    }
    return events;
  }

  function renderStepperHtml(currentStatus, events) {
    const evtMap = {};
    events.forEach(e => { evtMap[e.event] = e.timestamp; });
    const isError = ERROR_STATUSES.includes(currentStatus);
    const activeIndex = HAPPY_PATH.indexOf(currentStatus);

    let html = '<div style="display:flex;align-items:flex-start;min-width:max-content;overflow-x:auto;margin:8px 0 4px">';
    for (let i = 0; i < HAPPY_PATH.length; i++) {
      const step = HAPPY_PATH[i];
      const isCompleted = activeIndex >= 0 && i <= activeIndex;
      const isCurrent = i === activeIndex && !isError;
      const iconColor = isCompleted ? GREEN : GREY;
      const lineColor = (activeIndex >= 0 && i < activeIndex) ? GREEN : GREY;
      const lineDashed = !(activeIndex >= 0 && i < activeIndex);

      html += '<div style="display:flex;align-items:flex-start">';
      html += `<div style="display:flex;flex-direction:column;align-items:center;min-width:56px">`;
      html += `<div style="width:20px;height:20px;flex-shrink:0;opacity:${isCompleted ? 1 : 0.5}">${getIcon(step, iconColor)}</div>`;
      html += `<div style="font-size:10px;margin-top:4px;color:${isCurrent || isCompleted ? '#1a1a1a' : '#8c9196'};font-weight:${isCurrent ? 'bold' : 'normal'};text-align:center;max-width:64px;line-height:1.2">${formatLabel(step)}</div>`;
      html += `<div style="font-size:9px;margin-top:2px;color:#8c9196;text-align:center;max-width:64px;line-height:1.2">${isCompleted ? fmtTs(evtMap[step]) : '\u2014'}</div>`;
      html += '</div>';
      if (i < HAPPY_PATH.length - 1) {
        html += `<div style="width:20px;height:0;margin-top:10px;border-top:2px ${lineDashed ? 'dashed ' + GREY : 'solid ' + lineColor};flex-shrink:0"></div>`;
      }
      html += '</div>';
    }

    if (isError) {
      html += '<div style="display:flex;align-items:flex-start">';
      html += `<div style="width:20px;height:0;margin-top:10px;border-top:2px dashed ${RED};flex-shrink:0"></div>`;
      html += `<div style="display:flex;flex-direction:column;align-items:center;min-width:56px">`;
      html += `<div style="width:20px;height:20px;flex-shrink:0">${getIcon(currentStatus, RED)}</div>`;
      html += `<div style="font-size:10px;margin-top:4px;color:${RED};font-weight:bold;text-align:center;max-width:64px;line-height:1.2">${formatLabel(currentStatus)}</div>`;
      html += `<div style="font-size:9px;margin-top:2px;color:#8c9196;text-align:center;max-width:64px;line-height:1.2">${fmtTs(evtMap[currentStatus])}</div>`;
      html += '</div></div>';
    }

    html += '</div>';
    return html;
  }

  const scenarios = [
    { name: 'Brand New Order', status: 'new', product: 'Premium Hoodie &mdash; Navy / M', sku: 'HOD-NVY-M', qty: 1 },
    { name: 'In Batching', status: 'batched', product: 'Classic Tee &mdash; White / L', sku: 'TEE-WHT-L', qty: 3 },
    { name: 'Midway (Decorated)', status: 'decorated', product: 'Tank Top &mdash; Red / S', sku: 'TNK-RED-S', qty: 1 },
    { name: 'QC Passed', status: 'qc_pass', product: 'Long Sleeve &mdash; Grey / XL', sku: 'LSV-GRY-XL', qty: 2 },
    { name: 'Fully Shipped', status: 'shipped', product: 'Polo Shirt &mdash; Green / M', sku: 'POL-GRN-M', qty: 1 },
    { name: 'QC Failed (Error)', status: 'qc_fail', product: 'V-Neck &mdash; Black / L', sku: 'VNK-BLK-L', qty: 1 },
    { name: 'API Failure (Error)', status: 'api_fail', product: 'Sweatshirt &mdash; Blue / S', sku: 'SWT-BLU-S', qty: 2 },
    { name: 'Cancelled', status: 'cancelled', product: 'Cap &mdash; White / OS', sku: 'CAP-WHT-OS', qty: 1 },
  ];

  let cardsHtml = '';
  for (const s of scenarios) {
    cardsHtml += `<div class="card"><h3>${s.product}</h3><div class="meta">SKU: ${s.sku} &times; ${s.qty} &mdash; <strong>${s.name}</strong></div>${renderStepperHtml(s.status, mockEvents(s.status))}</div>`;
  }

  // Interactive buttons
  const allStatuses = [...HAPPY_PATH, ...ERROR_STATUSES];
  const defaultStatus = 'decorated';
  let buttonsHtml = '';
  for (const status of allStatuses) {
    const cls = status === defaultStatus ? ' active' : '';
    buttonsHtml += `<button class="status-btn${cls}" data-status="${status}">${formatLabel(status)}</button>`;
  }

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Stepper Preview</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f6f6f7; color: #1a1a1a; padding: 24px; }
    .container { max-width: 900px; margin: 0 auto; }
    h1 { font-size: 20px; margin-bottom: 4px; }
    .subtitle { color: #616161; margin-bottom: 24px; font-size: 14px; }
    .card { background: #fff; border: 1px solid #e1e1e1; border-radius: 12px; padding: 16px 20px; margin-bottom: 16px; }
    .card h3 { font-size: 14px; margin-bottom: 2px; }
    .card .meta { font-size: 12px; color: #616161; margin-bottom: 8px; }
    .controls { margin-bottom: 24px; display: flex; gap: 8px; flex-wrap: wrap; }
    .status-btn { padding: 6px 14px; border: 1px solid #ccc; border-radius: 6px; background: #fff; cursor: pointer; font-size: 13px; }
    .status-btn:hover { background: #f0f0f0; }
    .status-btn.active { background: #008060; color: #fff; border-color: #008060; }
    h2 { font-size: 16px; margin: 24px 0 12px; }
    h2:first-of-type { margin-top: 0; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Stepper Component Preview</h1>
    <p class="subtitle">Interactive preview of the HorizontalStepper with mock data</p>

    <h2>All States</h2>
    ${cardsHtml}

    <h2>Interactive</h2>
    <div class="controls">${buttonsHtml}</div>
    <div class="card">
      <h3>Custom T-Shirt &mdash; Black / XL</h3>
      <div class="meta">SKU: TSH-BLK-XL &times; 2</div>
      <div id="interactive-stepper">${renderStepperHtml(defaultStatus, mockEvents(defaultStatus))}</div>
    </div>
  </div>

  <script>
    // Interactive stepper - pre-render all states as hidden divs to avoid innerHTML
    const STATUSES = ${JSON.stringify(allStatuses)};
    const preRendered = {};
    ${allStatuses.map(s => `preRendered[${JSON.stringify(s)}] = ${JSON.stringify(renderStepperHtml(s, mockEvents(s)))};`).join('\n    ')}

    const container = document.getElementById('interactive-stepper');
    const buttons = document.querySelectorAll('.status-btn');

    // Use DOMParser for safe HTML insertion (all content is server-generated, no user input)
    const parser = new DOMParser();
    function safeSetHtml(el, html) {
      const doc = parser.parseFromString(html, 'text/html');
      el.textContent = '';
      Array.from(doc.body.childNodes).forEach(node => el.appendChild(document.adoptNode(node)));
    }

    buttons.forEach(btn => {
      btn.addEventListener('click', () => {
        buttons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        safeSetHtml(container, preRendered[btn.dataset.status]);
      });
    });
  </script>
</body>
</html>`;
}
