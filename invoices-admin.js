import { boot, api, esc, money, $, $$, niceDate, statusOf, pill, toast, confirmBox, debounce, csvDownload, today, dialog } from './admin-ui.js';

let rows = [];
let docType = new URLSearchParams(location.search).get('type') === 'quotation' ? 'quotation' : 'invoice';
let statusFilter = 'all';

await boot({
  page: 'invoices', title: 'Invoices & quotes', subtitle: 'Every document, its balance and what to do next',
  actions: '<button class="btn" id="export"><i class="hgi-stroke hgi-download-04"></i>Export CSV</button><a class="btn primary" href="billing.html"><i class="hgi-stroke hgi-add-01"></i>New invoice</a>',
});

$('main.ad-main').innerHTML = `
  <div class="grid g-4" id="stats"></div>
  <section class="card mt">
    <div class="card-head">
      <div class="tabs" id="doc-tabs"><button data-t="invoice">Invoices</button><button data-t="quotation">Quotations</button></div>
      <div class="tabs" id="status-tabs"></div>
      <span class="sp"></span>
      <label class="search"><i class="hgi-stroke hgi-search-01"></i><input id="q" placeholder="Number, customer, phone" aria-label="Search"></label>
    </div>
    <div class="table-wrap"><table class="t"><thead><tr><th>Number</th><th>Customer</th><th>Journey</th><th>Date</th><th>Due</th><th>Status</th><th class="num">Total</th><th class="num">Balance</th><th></th></tr></thead><tbody id="rows"></tbody></table></div>
  </section>`;

const balance = (x) => Math.max(0, Number(x.total || 0) - Number(x.paid_amount || 0));
const FILTERS = { invoice: ['all', 'Draft', 'Sent', 'Part paid', 'Paid', 'Overdue', 'Cancelled'], quotation: ['all', 'Draft', 'Sent', 'Accepted', 'Cancelled'] };

function render() {
  $$('#doc-tabs button').forEach((b) => b.classList.toggle('active', b.dataset.t === docType));
  $('#status-tabs').innerHTML = FILTERS[docType].map((s) => `<button data-s="${s}" class="${s === statusFilter ? 'active' : ''}">${s === 'all' ? 'All' : s}</button>`).join('');
  const live = rows.filter((x) => x.status !== 'Cancelled');
  const billed = live.reduce((s, x) => s + Number(x.total || 0), 0);
  const open = live.reduce((s, x) => s + balance(x), 0);
  const overdue = live.filter((x) => statusOf(x) === 'Overdue');
  $('#stats').innerHTML = docType === 'invoice' ? `
    <div class="stat hero"><small>Total billed</small><strong>${money(billed, 0)}</strong><span>${live.length} invoices</span></div>
    <div class="stat good"><small>Collected</small><strong>${money(billed - open, 0)}</strong><span>Across all invoices</span></div>
    <div class="stat warn"><small>Balance to collect</small><strong>${money(open, 0)}</strong><span>${live.filter((x) => balance(x) > 0).length} open</span></div>
    <div class="stat"><small>Overdue</small><strong>${overdue.length}</strong><span>${money(overdue.reduce((s, x) => s + balance(x), 0), 0)}</span></div>` : `
    <div class="stat hero"><small>Quoted value</small><strong>${money(billed, 0)}</strong><span>${live.length} quotations</span></div>
    <div class="stat good"><small>Accepted</small><strong>${live.filter((x) => x.status === 'Accepted').length}</strong><span>Converted to invoices</span></div>
    <div class="stat"><small>Awaiting reply</small><strong>${live.filter((x) => x.status === 'Sent').length}</strong><span>Sent to customers</span></div>
    <div class="stat"><small>Drafts</small><strong>${live.filter((x) => x.status === 'Draft').length}</strong><span>Not sent</span></div>`;
  const list = rows.filter((x) => statusFilter === 'all' || statusOf(x) === statusFilter);
  $('#rows').innerHTML = list.length ? list.map((x) => {
    const st = statusOf(x);
    return `<tr>
      <td class="nowrap"><a href="billing.html?id=${x.id}"><strong>${esc(x.invoice_number)}</strong></a><small>${esc(x.booking_ref || '')}</small></td>
      <td><strong>${esc(x.customer_name)}</strong><small>${esc(x.phone || '')}</small></td>
      <td>${esc(x.package_name || '—')}</td>
      <td class="nowrap">${niceDate(x.invoice_date)}</td>
      <td class="nowrap">${x.due_date ? niceDate(x.due_date) : '—'}</td>
      <td>${pill(st)}</td>
      <td class="num">${money(x.total)}</td>
      <td class="num">${x.status === 'Cancelled' || docType === 'quotation' ? '—' : money(balance(x))}</td>
      <td><div class="actions">
        <a class="btn sm icon" href="paid-bill.html?id=${x.id}" title="View and print" target="_blank" rel="noopener"><i class="hgi-stroke hgi-view"></i></a>
        <a class="btn sm icon" href="billing.html?id=${x.id}" title="Edit"><i class="hgi-stroke hgi-edit-02"></i></a>
        ${docType === 'invoice' && balance(x) > 0 && x.status !== 'Cancelled' ? `<button class="btn sm icon" data-pay="${x.id}" title="Record payment"><i class="hgi-stroke hgi-credit-card"></i></button>` : ''}
        ${docType === 'quotation' && x.status !== 'Accepted' && x.status !== 'Cancelled' ? `<button class="btn sm" data-convert="${x.id}">To invoice</button>` : ''}
        <button class="btn sm icon danger" data-del="${x.id}" title="Delete"><i class="hgi-stroke hgi-delete-02"></i></button>
      </div></td></tr>`;
  }).join('') : `<tr><td colspan="9"><div class="empty"><i class="hgi-stroke hgi-invoice-03"></i>Nothing here yet.</div></td></tr>`;
}

async function load() {
  const q = $('#q').value.trim();
  const d = await api(`admin?type=invoices&doc_type=${docType}&q=${encodeURIComponent(q)}`);
  rows = d.invoices;
  render();
}

function payDialog(inv) {
  const bal = balance(inv);
  const dlg = dialog({
    title: `Record payment · ${inv.invoice_number}`,
    body: `<form id="pf" class="form-grid">
      <label class="field"><span>Amount ₹</span><input name="amount" type="number" min="0.01" step="0.01" value="${bal}" required></label>
      <label class="field"><span>Date</span><input name="paid_on" type="date" value="${today()}" required></label>
      <label class="field"><span>Mode</span><select name="mode"><option>UPI</option><option>Bank transfer</option><option>Cash</option><option>Card</option><option>Cheque</option></select></label>
      <label class="field"><span>Reference</span><input name="reference" placeholder="UTR or cheque no."></label></form>
      <p style="margin:10px 0 0;color:var(--muted);font-size:13px">${esc(inv.customer_name)} · Balance ${money(bal)}</p>`,
    footer: '<button class="btn" data-c>Cancel</button><button class="btn primary" data-ok>Save payment</button>',
  });
  $('[data-c]', dlg.el).onclick = dlg.close;
  $('[data-ok]', dlg.el).onclick = async () => {
    const f = $('#pf', dlg.el);
    if (!f.reportValidity()) return;
    try {
      const { payment } = await api('admin', { method: 'POST', body: { type: 'payments', payment: { ...Object.fromEntries(new FormData(f)), invoice_id: inv.id } } });
      dlg.close();
      toast(`${payment.receipt_no} recorded`, 'good');
      load();
    } catch (e) { toast(e.message, 'bad'); }
  };
}

$('main.ad-main').addEventListener('click', async (e) => {
  const t = e.target.closest('button');
  if (!t) return;
  try {
    if (t.dataset.t) { docType = t.dataset.t; statusFilter = 'all'; await load(); }
    if (t.dataset.s) { statusFilter = t.dataset.s; render(); }
    if (t.dataset.pay) payDialog(rows.find((x) => x.id === t.dataset.pay));
    if (t.dataset.convert) {
      const { invoice } = await api('admin', { method: 'POST', body: { type: 'convert_quotation', id: t.dataset.convert } });
      toast(`Created ${invoice.invoice_number}`, 'good');
      location.href = `billing.html?id=${invoice.id}`;
    }
    if (t.dataset.del) {
      const inv = rows.find((x) => x.id === t.dataset.del);
      if (!(await confirmBox('Delete this document?', `${inv.invoice_number} will be removed permanently.`, 'Delete', true))) return;
      await api(`admin?id=${t.dataset.del}`, { method: 'DELETE' });
      toast('Deleted');
      await load();
    }
  } catch (err) { toast(err.message, 'bad'); }
});

$('#q').addEventListener('input', debounce(() => load().catch((e) => toast(e.message, 'bad')), 250));
$('#export').onclick = () => csvDownload(`bahadur-${docType}s-${today()}.csv`, [
  ['Number', 'Date', 'Due', 'Customer', 'Phone', 'Booking ref', 'Journey', 'Status', 'Subtotal', 'Discount', 'Tax', 'Total', 'Paid', 'Balance'],
  ...rows.map((x) => [x.invoice_number, String(x.invoice_date).slice(0, 10), String(x.due_date || '').slice(0, 10), x.customer_name, x.phone, x.booking_ref, x.package_name, statusOf(x), x.subtotal, x.discount, x.tax, x.total, x.paid_amount, balance(x)]),
]);
load().catch((e) => toast(e.message, 'bad'));
