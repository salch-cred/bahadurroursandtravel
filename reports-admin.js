import { boot, api, esc, money, $, toast, today, csvDownload } from './admin-ui.js';

const fyStart = () => { const d = new Date(); const y = d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1; return `${y}-04-01`; };
const monthName = (m) => new Date(m + '-01T00:00:00').toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
let data = null;

await boot({
  page: 'reports', title: 'Reports & GST', subtitle: 'Profit, receivables and tax for your accountant',
  actions: `<label class="field" style="flex-direction:row;align-items:center;gap:6px"><span>From</span><input type="date" id="from" value="${fyStart()}" style="width:150px"></label><label class="field" style="flex-direction:row;align-items:center;gap:6px"><span>To</span><input type="date" id="to" value="${today()}" style="width:150px"></label><button class="btn" id="export"><i class="hgi-stroke hgi-download-04"></i>GST CSV</button>`,
});

$('main.ad-main').innerHTML = `
  <div class="grid g-4" id="stats"></div>
  <section class="card mt"><div class="card-head"><h3>Profit and loss</h3><small>Revenue excludes tax</small></div><div class="table-wrap"><table class="t"><thead><tr><th>Month</th><th class="num">Revenue</th><th class="num">Collected</th><th class="num">Expenses</th><th class="num">Profit</th></tr></thead><tbody id="pl"></tbody></table></div></section>
  <section class="card mt"><div class="card-head"><h3>GST summary</h3><small>Sent, part-paid and paid invoices</small></div><div class="table-wrap"><table class="t"><thead><tr><th>Month</th><th class="num">Invoices</th><th class="num">Taxable value</th><th class="num">CGST</th><th class="num">SGST</th><th class="num">IGST</th><th class="num">Total tax</th><th class="num">Invoice value</th></tr></thead><tbody id="gst"></tbody></table></div></section>
  <div class="grid g-3 mt">
    <section class="card"><div class="card-head"><h3>Receivables by age</h3></div><div class="card-body" id="aging"></div></section>
    <section class="card"><div class="card-head"><h3>Collections by mode</h3></div><div class="card-body" id="modes"></div></section>
    <section class="card"><div class="card-head"><h3>Expenses by category</h3></div><div class="card-body" id="cats"></div></section>
  </div>
  <section class="card mt"><div class="card-head"><h3>Top journeys</h3></div><div class="table-wrap"><table class="t"><thead><tr><th>Journey</th><th class="num">Invoices</th><th class="num">Billed</th></tr></thead><tbody id="top"></tbody></table></div></section>`;

const meters = (rows, label, value) => {
  const max = Math.max(1, ...rows.map((r) => Math.abs(Number(r[value]))));
  return rows.length ? rows.map((r) => `<div style="margin-bottom:10px"><div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:3px"><span>${esc(r[label])}</span><b style="font-weight:600">${money(r[value], 0)}</b></div><div class="meter"><span style="width:${(Math.abs(Number(r[value])) / max) * 100}%"></span></div></div>`).join('') : '<div class="empty">No data in this period.</div>';
};

function render() {
  const d = data;
  const sum = (rows, key) => rows.reduce((s, r) => s + Number(r[key] || 0), 0);
  const revenue = sum(d.profit, 'revenue'), expenses = sum(d.profit, 'expenses'), tax = sum(d.gst, 'tax');
  const a = d.aging || {};
  const open = ['current', 'd30', 'd60', 'd90', 'older'].reduce((s, k) => s + Number(a[k] || 0), 0);
  $('#stats').innerHTML = `
    <div class="stat hero"><small>Revenue</small><strong>${money(revenue, 0)}</strong><span>Before tax</span></div>
    <div class="stat warn"><small>Expenses</small><strong>${money(expenses, 0)}</strong><span>All categories</span></div>
    <div class="stat ${revenue - expenses >= 0 ? 'good' : 'warn'}"><small>Profit</small><strong>${money(revenue - expenses, 0)}</strong><span>${revenue ? Math.round(((revenue - expenses) / revenue) * 100) : 0}% margin</span></div>
    <div class="stat"><small>Tax collected</small><strong>${money(tax, 0)}</strong><span>${money(open, 0)} still receivable</span></div>`;
  $('#pl').innerHTML = d.profit.map((r) => { const p = Number(r.revenue) - Number(r.expenses); return `<tr><td>${monthName(r.month)}</td><td class="num">${money(r.revenue)}</td><td class="num">${money(r.collected)}</td><td class="num">${money(r.expenses)}</td><td class="num" style="font-weight:600;color:${p < 0 ? 'var(--red)' : 'var(--green)'}">${money(p)}</td></tr>`; }).join('') || '<tr><td colspan="5"><div class="empty">No data in this period.</div></td></tr>';
  $('#gst').innerHTML = d.gst.map((r) => `<tr><td>${monthName(r.month)}</td><td class="num">${r.invoices}</td><td class="num">${money(r.taxable)}</td><td class="num">${money(r.cgst_sgst / 2)}</td><td class="num">${money(r.cgst_sgst / 2)}</td><td class="num">${money(r.igst)}</td><td class="num">${money(r.tax)}</td><td class="num">${money(r.total)}</td></tr>`).join('') || '<tr><td colspan="8"><div class="empty">No invoices in this period.</div></td></tr>';
  $('#aging').innerHTML = meters([{ l: 'Not yet due', v: a.current }, { l: '1–30 days late', v: a.d30 }, { l: '31–60 days late', v: a.d60 }, { l: '61–90 days late', v: a.d90 }, { l: 'Over 90 days', v: a.older }], 'l', 'v');
  $('#modes').innerHTML = meters(d.modes, 'mode', 'amount');
  $('#cats').innerHTML = meters(d.expenseByCategory, 'category', 'amount');
  $('#top').innerHTML = d.packages.map((r) => `<tr><td><strong>${esc(r.package)}</strong></td><td class="num">${r.invoices}</td><td class="num">${money(r.total)}</td></tr>`).join('') || '<tr><td colspan="3"><div class="empty">No data in this period.</div></td></tr>';
}

async function load() {
  data = await api(`admin?type=reports&from=${$('#from').value}&to=${$('#to').value}`);
  render();
}
$('#from').onchange = $('#to').onchange = () => load().catch((e) => toast(e.message, 'bad'));
$('#export').onclick = () => csvDownload(`bahadur-gst-${$('#from').value}-to-${$('#to').value}.csv`, [['Month', 'Invoices', 'Taxable value', 'CGST', 'SGST', 'IGST', 'Total tax', 'Invoice value'], ...data.gst.map((r) => [r.month, r.invoices, r.taxable, r.cgst_sgst / 2, r.cgst_sgst / 2, r.igst, r.tax, r.total])]);
load().catch((e) => toast(e.message, 'bad'));
