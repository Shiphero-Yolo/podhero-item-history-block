// supabase/functions/app/index.ts
//
// Serves the embedded "app home" page that Shopify Admin loads in an iframe.
//
// Two modes, decided client-side from the URL:
//   • No order_number (opened from the Apps menu)  -> static "you're all set"
//     onboarding page.
//   • ?order_number=<n> (the "Open full history" link on the order-details
//     block) -> loads App Bridge, mints a session token, calls the
//     order-history edge function, and renders the full per-item lifecycle.
//
// The full-history view mirrors the order-details block's status/step vocabulary
// (see extensions/.../statusBadge.js + HorizontalStepper.jsx) so the two stay
// visually consistent. order-history's CORS must allow this origin
// (.block.wms.dev — see _shared/cors.ts).
//
// Framed only by Shopify Admin and any *.myshopify.com origin.

// Shopify's API key (== client_id == session-token `aud`). App Bridge reads it
// from the <meta> tag to authenticate the embedded session.
const API_KEY = Deno.env.get('SHOPIFY_API_KEY') ?? 'd2922a99be8c4ac800ca4f9c581dc08b';

const STYLE = `
  :root {
    --purple: #5B2C91;
    --coral: #FF4D6D;
    --yellow: #FFD93D;
    --navy: #1B1B3A;
    --gray-bg: #F4F4F8;
    --gray-text: #5C5C7A;
    --line: #E0E0E8;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0; padding: 0;
    font-family: -apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", Roboto, sans-serif;
    background: var(--gray-bg);
    color: var(--navy);
    -webkit-font-smoothing: antialiased;
  }
  .wrap { max-width: 760px; margin: 0 auto; padding: 32px 24px 64px; }
  .hero {
    background: var(--purple); color: #fff;
    padding: 32px; border-radius: 14px;
    position: relative; overflow: hidden;
  }
  .hero::after {
    content: ""; position: absolute; right: -40px; top: -40px;
    width: 140px; height: 140px; border-radius: 50%;
    background: var(--yellow); opacity: 0.9;
  }
  .hero::before {
    content: ""; position: absolute; left: -10%; bottom: -30px;
    width: 120%; height: 30px; transform: rotate(-3deg);
    background: var(--coral);
  }
  .badge {
    display: inline-block; background: var(--yellow); color: var(--purple);
    padding: 6px 14px; border-radius: 8px;
    font-weight: 700; font-size: 14px; letter-spacing: 0.3px;
    margin-bottom: 18px; position: relative; z-index: 1;
  }
  h1 { margin: 0 0 6px; font-size: 30px; line-height: 1.15; position: relative; z-index: 1; }
  .tagline { color: var(--yellow); margin: 0; font-size: 16px; position: relative; z-index: 1; }

  .card {
    background: #fff; padding: 24px 28px; border-radius: 12px;
    margin-top: 18px; border-left: 4px solid var(--coral);
    box-shadow: 0 1px 2px rgba(27,27,58,0.04);
  }
  .card.tip { border-left-color: var(--purple); background: #FFF8DC; }
  .card.err { border-left-color: var(--coral); }
  .card h2 { margin: 0 0 8px; color: var(--purple); font-size: 18px; }
  .card p { margin: 0 0 8px; line-height: 1.55; }
  .card p:last-child { margin-bottom: 0; }
  .muted { color: var(--gray-text); font-size: 14px; }

  .pipeline { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; margin: 18px 0 4px; }
  .stage {
    background: var(--purple); color: #fff;
    padding: 7px 12px; border-radius: 6px;
    font-size: 12px; font-weight: 600;
    white-space: nowrap;
  }
  .arrow { color: var(--purple); font-size: 18px; line-height: 1; }

  .steps { padding-left: 0; list-style: none; counter-reset: step; }
  .steps li {
    counter-increment: step;
    position: relative; padding: 4px 0 4px 36px;
    line-height: 1.5;
  }
  .steps li::before {
    content: counter(step);
    position: absolute; left: 0; top: 4px;
    width: 24px; height: 24px; border-radius: 50%;
    background: var(--purple); color: #fff;
    font-size: 12px; font-weight: 700;
    display: flex; align-items: center; justify-content: center;
  }

  /* ---- full-history view ---- */
  .order-head { margin-top: 6px; padding: 4px 4px 0; }
  .order-head h2 { margin: 0 0 4px; color: var(--purple); font-size: 22px; }
  .summary { color: var(--gray-text); font-size: 14px; }

  .card.item { border-left-color: var(--purple); }
  .item-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; margin-bottom: 6px; }
  .item-name { font-weight: 700; color: var(--navy); }
  .pill { display: inline-block; padding: 4px 10px; border-radius: 999px; font-size: 12px; font-weight: 700; white-space: nowrap; }
  .pill.success { background: #E3F1E1; color: #0B6B2E; }
  .pill.info { background: #E6E0F2; color: var(--purple); }
  .pill.critical { background: #FDE2E7; color: #B3123A; }
  .pill.neutral { background: #ECECF2; color: var(--gray-text); }

  .stepper { display: flex; align-items: flex-start; overflow-x: auto; padding: 10px 0 2px; }
  .node { display: flex; flex-direction: column; align-items: center; text-align: center; min-width: 66px; flex: 0 0 auto; }
  .dot { width: 18px; height: 18px; border-radius: 50%; background: var(--line); border: 2px solid var(--line); }
  .node.completed .dot { background: var(--purple); border-color: var(--purple); }
  .node.current .dot { background: #fff; border-color: var(--purple); box-shadow: 0 0 0 3px rgba(91,44,145,0.2); }
  .node.error .dot { background: var(--coral); border-color: var(--coral); }
  .conn { flex: 1 1 18px; min-width: 14px; height: 2px; background: var(--line); margin-top: 9px; }
  .slabel { font-size: 12px; font-weight: 600; margin-top: 6px; }
  .node.current .slabel { color: var(--purple); }
  .node.error .slabel { color: var(--coral); }
  .stime { font-size: 11px; color: var(--gray-text); margin-top: 2px; line-height: 1.3; }

  .evlog { margin-top: 14px; }
  .evlog summary { cursor: pointer; color: var(--purple); font-size: 13px; font-weight: 600; }
  .evlog ul { list-style: none; padding-left: 0; margin: 8px 0 0; }
  .evlog li { display: flex; gap: 12px; padding: 4px 0; font-size: 13px; border-top: 1px solid #EFEFF4; }
  .ev-time { color: var(--gray-text); min-width: 118px; flex: 0 0 auto; }
  .ev-name { font-weight: 600; }

  .loading { text-align: center; color: var(--gray-text); padding: 40px 0; }
  .spinner { width: 28px; height: 28px; border: 3px solid var(--line); border-top-color: var(--purple); border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 12px; }
  @keyframes spin { to { transform: rotate(360deg); } }

  footer { color: var(--gray-text); font-size: 12px; margin-top: 24px; text-align: center; }
`;

// Default #content for when the page is opened with no order (Apps menu).
const INFO_CARDS = `
    <div class="card">
      <h2>You're all set.</h2>
      <p>The Item History block has been added to your store's order detail pages — there's nothing to configure here.</p>
      <p class="muted">Open any order from <strong>Orders</strong> in the sidebar and scroll down to see the full lifecycle for every item on that order.</p>
    </div>

    <div class="card">
      <h2>What you'll see</h2>
      <div class="pipeline">
        <span class="stage">New</span><span class="arrow">›</span>
        <span class="stage">Batched</span><span class="arrow">›</span>
        <span class="stage">Treated</span><span class="arrow">›</span>
        <span class="stage">Decorated</span><span class="arrow">›</span>
        <span class="stage">QC Pass</span><span class="arrow">›</span>
        <span class="stage">Binned</span><span class="arrow">›</span>
        <span class="stage">Shipped</span>
      </div>
      <p class="muted">Each step shows the date and time it was reached. Errors (QC Fail, API Fail, Inventory Fail, Cancelled) appear as a red branch off the timeline.</p>
    </div>

    <div class="card">
      <h2>How to use it</h2>
      <ol class="steps">
        <li>Go to <strong>Orders</strong> and open any order.</li>
        <li>Scroll down to the <strong>Item History</strong> section.</li>
        <li>Click <strong>Re-ship</strong> on any item that needs to be made again.</li>
      </ol>
    </div>

    <div class="card tip">
      <h2>Need a hand?</h2>
      <p>Reach out to your PODHero point of contact with the Shopify order number — that's the fastest way to get help.</p>
    </div>
`;

// Browser script. Written WITHOUT backticks or ${...} so it can live inside the
// outer HTML template literal untouched. Mirrors statusBadge.js +
// HorizontalStepper.jsx so the full-history view matches the order block.
const CLIENT_JS = `
(function () {
  var FUNCTIONS_BASE = 'https://qcjiezsjuhpsxcyiduaf.supabase.co/functions/v1';
  var HAPPY_PATH = ['new', 'batched', 'treated', 'decorated', 'qc_pass', 'binned', 'shipped'];
  var ERROR_STATUSES = { qc_fail: 1, api_fail: 1, inventory_fail: 1, cancelled: 1 };
  var EVENT_TO_STEP = { item_binned: 'binned', qc_pass: 'qc_pass' };
  var SUCCESS = { shipped: 1, binned: 1, qc_pass: 1 };
  var INFO = { new: 1, batched: 1, treated: 1, decorated: 1 };

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function label(s) {
    return String(s).split('_').map(function (w) {
      return w ? w.charAt(0).toUpperCase() + w.slice(1) : w;
    }).join(' ');
  }
  function fmtDate(ts) {
    if (!ts) return '—';
    return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
  function fmtTime(ts) {
    if (!ts) return '';
    return new Date(ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  }
  function toneOf(status) {
    if (ERROR_STATUSES[status]) return 'critical';
    if (SUCCESS[status]) return 'success';
    if (INFO[status]) return 'info';
    return 'neutral';
  }

  // Earliest evidence each step was reached: mapped order_events win, then
  // production-derived step_timestamps (batched/decorated), then created_at -> new.
  function stepTimes(item, evts) {
    var t = {};
    (evts || []).forEach(function (e) {
      var step = EVENT_TO_STEP[e.event];
      if (!step) return;
      if (!t[step] || new Date(e.timestamp) < new Date(t[step])) t[step] = e.timestamp;
    });
    var st = item.step_timestamps;
    if (st) Object.keys(st).forEach(function (k) { if (st[k] && !t[k]) t[k] = st[k]; });
    if (item.created_at && !t.new) t.new = item.created_at;
    return t;
  }

  function timeCell(ts) {
    var d = esc(fmtDate(ts));
    var tm = fmtTime(ts);
    return tm ? d + '<br>' + esc(tm) : d;
  }

  function nodeHtml(label_, cls, ts) {
    return '<div class="' + cls + '"><div class="dot"></div><div class="slabel">' +
      esc(label_) + '</div><div class="stime">' + timeCell(ts) + '</div></div>';
  }

  function stepperHtml(item, evts) {
    var times = stepTimes(item, evts);
    var status = item.status;
    var isError = !!ERROR_STATUSES[status];
    var activeIndex = HAPPY_PATH.indexOf(status);
    var parts = HAPPY_PATH.map(function (step, i) {
      var completed = activeIndex >= 0 && i <= activeIndex;
      var current = i === activeIndex && !isError;
      var cls = 'node' + (completed ? ' completed' : '') + (current ? ' current' : '');
      return nodeHtml(label(step), cls, times[step]);
    });
    if (isError) parts.push(nodeHtml(label(status), 'node error', times[status]));
    return '<div class="stepper">' + parts.join('<div class="conn"></div>') + '</div>';
  }

  function eventLogHtml(evts) {
    if (!evts.length) return '';
    var sorted = evts.slice().sort(function (a, b) {
      return new Date(a.timestamp) - new Date(b.timestamp);
    });
    var rows = sorted.map(function (e) {
      return '<li><span class="ev-time">' + esc(fmtDate(e.timestamp)) + ' ' +
        esc(fmtTime(e.timestamp)) + '</span><span class="ev-name">' +
        esc(label(e.event)) + '</span></li>';
    });
    return '<details class="evlog"><summary>Full event log (' + evts.length +
      ')</summary><ul>' + rows.join('') + '</ul></details>';
  }

  function itemCardHtml(item, evts) {
    return '<div class="card item"><div class="item-head"><div>' +
      '<div class="item-name">' + esc(item.product_name) + '</div>' +
      '<div class="muted">SKU: ' + esc(item.sku || '—') + ' × ' + esc(item.quantity) +
      '</div></div><span class="pill ' + toneOf(item.status) + '">' +
      esc(label(item.status)) + '</span></div>' +
      stepperHtml(item, evts) + eventLogHtml(evts) + '</div>';
  }

  function setContent(html) { document.getElementById('content').innerHTML = html; }

  function renderHistory(orderNumber, items, events) {
    if (!items.length) {
      setContent('<div class="card"><h2>No history found</h2><p class="muted">No PODHero history exists for order #' +
        esc(orderNumber) + '.</p></div>');
      return;
    }
    var byItem = {};
    (events || []).forEach(function (e) {
      if (!e.order_item) return;
      (byItem[e.order_item] = byItem[e.order_item] || []).push(e);
    });
    var total = items.length;
    var errs = items.filter(function (i) { return ERROR_STATUSES[i.status]; }).length;
    var shipped = items.filter(function (i) { return i.status === 'shipped'; }).length;
    var head = '<div class="order-head"><h2>Order #' + esc(orderNumber) +
      '</h2><div class="summary">' + total + ' items · ' + errs + ' in error · ' +
      shipped + ' shipped</div></div>';
    var cards = items.map(function (it) { return itemCardHtml(it, byItem[it.id] || []); }).join('');
    setContent(head + cards);
  }

  function renderError(orderNumber, msg) {
    setContent('<div class="card err"><h2>Could not load history</h2><p class="muted">Order #' +
      esc(orderNumber) + '</p><p>' + esc(msg) + '</p></div>');
  }

  function renderLoading(orderNumber) {
    setContent('<div class="loading"><div class="spinner"></div>Loading history for order #' +
      esc(orderNumber) + '…</div>');
  }

  async function main() {
    var params = new URLSearchParams(window.location.search);
    var orderNumber = params.get('order_number');
    if (!orderNumber) return; // no order: keep the static onboarding cards

    renderLoading(orderNumber);

    if (typeof shopify === 'undefined' || !shopify.idToken) {
      renderError(orderNumber, 'Open this page from the Shopify admin to view history.');
      return;
    }

    try {
      var token = await shopify.idToken();
      var res = await fetch(
        FUNCTIONS_BASE + '/order-history?order_number=' + encodeURIComponent(orderNumber),
        { headers: { Authorization: 'Bearer ' + token } }
      );
      if (!res.ok) {
        var text = await res.text();
        throw new Error('Backend error ' + res.status + ': ' + text);
      }
      var data = await res.json();
      renderHistory(orderNumber, data.items || [], data.events || []);
    } catch (err) {
      renderError(orderNumber, (err && err.message) || 'Failed to load item history.');
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', main);
  } else {
    main();
  }
})();
`;

const HTML = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<meta name="shopify-api-key" content="${API_KEY}" />
<script src="https://cdn.shopify.com/shopifycloud/app-bridge.js"></script>
<title>PODHero · Item History</title>
<style>${STYLE}</style>
</head>
<body>
  <div class="wrap">
    <div class="hero">
      <span class="badge">PODHero</span>
      <h1>Item History</h1>
      <p class="tagline">Track every order. Every step. Every time.</p>
    </div>

    <div id="content">${INFO_CARDS}</div>

    <footer>© PODHero · Item History</footer>
  </div>
  <script>${CLIENT_JS}</script>
</body>
</html>`;

const HEADERS: Record<string, string> = {
  "Content-Type": "text/html; charset=utf-8",
  // Allow Shopify Admin to frame us, block everyone else.
  "Content-Security-Policy":
    "frame-ancestors https://*.myshopify.com https://admin.shopify.com;",
  "X-Content-Type-Options": "nosniff",
  "Cache-Control": "public, max-age=300",
};

Deno.serve((_req: Request) => {
  return new Response(HTML, { status: 200, headers: HEADERS });
});
