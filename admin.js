import { boot, api, esc, money0, $, niceDate, statusOf, pill, setBadge, waNumber, toast } from './admin-ui.js';

const stat = (label, value, note = '', cls = '', icon = '') => `<div class="stat ${cls}"><small>${icon ? `<i class="hgi-stroke hgi-${icon}"></i>` : ''}${esc(label)}</small><strong>${value}</strong><span>${esc(note)}</span></div>`;
const shortMoney = (v) => {
  const n = Math.abs(Number(v || 0));
  if (n >= 10000000) return (n / 10000000).toFixed(1) + 'Cr';
  if (n >= 100000) return (n / 100000).toFixed(1) + 'L';
  if (n >= 1000) return (n / 1000).toFixed(0) + 'k';
  return String(Math.round(n));
};

function renderBars(host, rows, series, labelOf) {
  const max = Math.max(1, ...rows.flatMap((r) => series.map((s) => Number(r[s.key] || 0))));
  host.innerHTML = rows.map((r) => `<div class="col"><div class="tip">${esc(labelOf(r, true))}: ${series.map((s) => `${s.name} ${s.money ? money0(r[s.key]) : r[s.key]}`).join(' · ')}</div><div class="stack">${series.map((s, i) => `<div class="b ${i ? 'c' + (i + 1) : ''}" style="height:${Math.max(1, (Number(r[s.key] || 0) / max) * 100)}%"></div>`).join('')}</div><label>${esc(labelOf(r))}</label></div>`).join('');
}

async function load() {
  const d = await api('admin');
  const m = d.metrics;
  const net = (d.monthly.at(-1)?.collected || 0) - m.expensesMonth;
  $('#kpis').innerHTML = [
    stat('Collected, last 30 days', money0(m.collected.d30), `${money0(m.collected.h24)} in the last 24 hours`, 'hero', 'credit-card'),
    stat('Outstanding', money0(m.outstanding), `${d.overdue.length} overdue`, m.outstanding ? 'warn' : '', 'invoice-03'),
    stat('Invoiced this year', money0(m.invoicedYear), `${money0(m.invoicedMonth)} this month`, '', 'chart-bar-line'),
    stat('Expenses this month', money0(m.expensesMonth), `Net cash ${money0(net)}`, '', 'wallet-01'),
  ].join('');
  $('#ops').innerHTML = [
    stat('Open booking requests', m.pending, `${m.bookings} bookings in total`, '', 'package'),
    stat('Draft invoices', m.drafts, 'Not yet sent', '', 'edit-02'),
    stat('Guest rating', m.rating ? m.rating.toFixed(1) : '—', `${m.reviewCount} approved reviews`, '', 'star'),
    stat('Visitors today', m.visitors.daily, `${m.visitors.viewsDaily} page views`, '', 'user-group'),
    stat('Visitors this month', m.visitors.monthly, `${m.visitors.viewsMonthly} page views`, '', 'analytics-01'),
  ].join('');
  renderBars($('#money-chart'), d.monthly, [{ key: 'invoiced', name: 'Invoiced', money: true }, { key: 'collected', name: 'Collected', money: true }, { key: 'expenses', name: 'Expenses', money: true }],
    (r, long) => new Date(r.m).toLocaleDateString('en-IN', long ? { month: 'short', year: 'numeric' } : { month: 'short' }));
  renderBars($('#traffic-chart'), d.traffic, [{ key: 'visitors', name: 'Visitors' }],
    (r, long) => new Date(r.d).toLocaleDateString('en-IN', long ? { day: 'numeric', month: 'short' } : { day: 'numeric' }));

  $('#overdue').innerHTML = d.overdue.length
    ? d.overdue.map((x) => `<tr><td><a href="billing.html?id=${x.id}"><strong>${esc(x.invoice_number)}</strong></a><small>${esc(x.customer_name)}</small></td><td class="nowrap">${niceDate(x.due_date)}</td><td class="num">${money0(Number(x.total) - Number(x.paid_amount))}</td><td><div class="actions"><a class="btn sm icon" title="Remind on WhatsApp" href="https://wa.me/${waNumber(x.phone)}?text=${encodeURIComponent(`Hello ${x.customer_name}, a reminder that ${money0(Number(x.total) - Number(x.paid_amount))} is due on invoice ${x.invoice_number}. Thank you.`)}" target="_blank" rel="noopener"><i class="hgi-stroke hgi-whatsapp"></i></a></div></td></tr>`).join('')
    : '<tr><td colspan="4"><div class="empty"><i class="hgi-stroke hgi-checkmark-circle-02"></i>Nothing overdue.</div></td></tr>';

  $('#bookings').innerHTML = d.bookings.length
    ? d.bookings.slice(0, 7).map((x) => `<tr><td><strong>${esc(x.name)}</strong><small>${esc(x.phone)}</small></td><td>${esc(x.trip)}<small>${esc(x.booking_ref || '')}</small></td><td class="nowrap">${esc(x.travel_date ? niceDate(x.travel_date) : 'Flexible')}</td><td>${pill(x.status)}</td><td><div class="actions"><a class="btn sm" href="billing.html?booking_ref=${encodeURIComponent(x.booking_ref || '')}">Bill</a></div></td></tr>`).join('')
    : '<tr><td colspan="5"><div class="empty"><i class="hgi-stroke hgi-package"></i>Booking requests from the website will appear here.</div></td></tr>';

  $('#invoices').innerHTML = d.invoices.length
    ? d.invoices.slice(0, 7).map((x) => `<tr><td><a href="billing.html?id=${x.id}"><strong>${esc(x.invoice_number)}</strong></a><small>${esc(x.customer_name)}</small></td><td>${pill(statusOf(x))}</td><td class="num">${money0(x.total)}</td></tr>`).join('')
    : '<tr><td colspan="3"><div class="empty"><i class="hgi-stroke hgi-invoice-03"></i>No invoices yet.</div></td></tr>';

  $('#activity').innerHTML = d.activity.map((x) => `<li><i class="hgi-stroke hgi-${x.icon === 'receipt-02' ? 'invoice-03' : esc(x.icon)}"></i><div><strong>${esc(x.title)}</strong><small>${esc(x.detail)}</small><small>${new Date(x.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</small></div></li>`).join('') || '<li><div class="empty" style="width:100%">Nothing yet.</div></li>';
  const line = [m.pending ? `${m.pending} booking ${m.pending === 1 ? 'request' : 'requests'} waiting` : 'No booking requests waiting', d.overdue.length ? `${d.overdue.length} overdue ${d.overdue.length === 1 ? 'invoice' : 'invoices'}` : 'nothing overdue', m.pendingReviews ? `${m.pendingReviews} ${m.pendingReviews === 1 ? 'review' : 'reviews'} to check` : ''].filter(Boolean).join(' · ');
  $('#hello-line').textContent = line + '.';
  setBadge('bookings', m.pending);
  setBadge('reviews', m.pendingReviews);
  setBadge('invoices', d.overdue.length);
}

await boot({
  page: 'dashboard', title: 'Business dashboard', subtitle: 'Your business at a glance',
  actions: '<button class="btn icon" id="refresh" aria-label="Refresh"><i class="hgi-stroke hgi-refresh"></i></button><a class="btn" href="billing.html?type=quotation"><i class="hgi-stroke hgi-add-01"></i>Quotation</a><a class="btn primary" href="billing.html"><i class="hgi-stroke hgi-add-01"></i>New invoice</a>',
});

const hour = new Date().getHours();
$('main.ad-main').innerHTML = `
  <section class="ad-hello">
    <img class="c-b" src="assets/sky/cloud-c.webp" alt=""><img class="c-a" src="assets/sky/cloud-b.webp" alt="">
    <svg class="ad-plane" viewBox="0 0 24 24" aria-hidden="true"><path transform="rotate(90 12 12)" d="M21 16v-2l-8-5V3.500a1.500 1.500 0 0 0-3 0V9l-8 5v2l8-2.500V19l-2 1.500V22l3.500-1 3.500 1v-1.500L13 19v-5.500l8 2.500Z"/></svg>
    <div><small>${new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</small><h2>Good ${hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening'}, Bahadur team</h2><p id="hello-line">Getting today’s figures…</p></div>
    <div class="quick"><a href="bookings-admin.html"><i class="hgi-stroke hgi-package"></i>Bookings</a><a href="billing.html"><i class="hgi-stroke hgi-add-01"></i>Invoice</a><a href="reports-admin.html"><i class="hgi-stroke hgi-chart-bar-line"></i>Reports</a></div>
  </section>
  <div class="grid g-4" id="kpis">${'<div class="stat"><div class="skeleton"></div></div>'.repeat(4)}</div>
  <div class="grid g-5 mt" id="ops"></div>
  <div class="grid g-2-1 mt">
    <section class="card"><div class="card-head"><h3>Money, last 12 months</h3><span class="sp"></span><div class="legend"><span><i></i>Invoiced</span><span><i style="background:var(--navy)"></i>Collected</span><span><i style="background:#f3b9a0"></i>Expenses</span></div></div><div class="card-body"><div class="bars" id="money-chart"></div></div></section>
    <section class="card"><div class="card-head"><h3>Visitors, 14 days</h3></div><div class="card-body"><div class="bars" id="traffic-chart"></div></div></section>
  </div>
  <div class="grid g-2 mt">
    <section class="card"><div class="card-head"><h3>Overdue payments</h3><span class="sp"></span><a class="btn sm" href="invoices-admin.html">All invoices</a></div><div class="table-wrap"><table class="t"><thead><tr><th>Invoice</th><th>Due</th><th class="num">Balance</th><th></th></tr></thead><tbody id="overdue"></tbody></table></div></section>
    <section class="card"><div class="card-head"><h3>Latest invoices</h3></div><div class="table-wrap"><table class="t"><thead><tr><th>Invoice</th><th>Status</th><th class="num">Total</th></tr></thead><tbody id="invoices"></tbody></table></div></section>
  </div>
  <div class="grid g-2-1 mt">
    <section class="card"><div class="card-head"><h3>Latest booking requests</h3><span class="sp"></span><a class="btn sm" href="bookings-admin.html">All bookings</a></div><div class="table-wrap"><table class="t"><thead><tr><th>Guest</th><th>Journey</th><th>Travel</th><th>Status</th><th></th></tr></thead><tbody id="bookings"></tbody></table></div></section>
    <section class="card"><div class="card-head"><h3>Activity</h3></div><ul class="feed" id="activity"></ul></section>
  </div>`;

$('#refresh').onclick = () => load().then(() => toast('Updated')).catch((e) => toast(e.message, 'bad'));
load().catch((e) => toast(e.message, 'bad'));
