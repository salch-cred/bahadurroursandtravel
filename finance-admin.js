import { boot, api, esc, money, $, $$, niceDate, toast, confirmBox, dialog, today, csvDownload } from './admin-ui.js';

const CATEGORIES = ['Flights', 'Hotels', 'Transport', 'Visa & permits', 'Guides', 'Salaries', 'Marketing', 'Office & rent', 'Fuel & vehicle', 'Other'];
const fyStart = () => { const d = new Date(); const y = d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1; return `${y}-04-01`; };
let tab = location.hash === '#expenses' ? 'expenses' : 'payments';
let payments = [], expenses = [];

await boot({
  page: 'finance', title: 'Payments & expenses', subtitle: 'Money in, money out',
  actions: '<button class="btn" id="export"><i class="hgi-stroke hgi-download-04"></i>Export CSV</button><button class="btn primary" id="add-expense"><i class="hgi-stroke hgi-add-01"></i>Add expense</button>',
});

$('main.ad-main').innerHTML = `
  <div class="grid g-4" id="stats"></div>
  <section class="card mt">
    <div class="card-head">
      <div class="tabs" id="tabs"><button data-tab="payments">Payments received</button><button data-tab="expenses">Expenses</button></div>
      <span class="sp"></span>
      <label class="field" style="flex-direction:row;align-items:center;gap:6px"><span>From</span><input type="date" id="from" value="${fyStart()}" style="width:150px"></label>
      <label class="field" style="flex-direction:row;align-items:center;gap:6px"><span>To</span><input type="date" id="to" value="${today()}" style="width:150px"></label>
    </div>
    <div class="table-wrap" id="body"></div>
  </section>`;

function render() {
  $$('#tabs button').forEach((b) => b.classList.toggle('active', b.dataset.tab === tab));
  const inTotal = payments.reduce((s, p) => s + Number(p.amount), 0);
  const outTotal = expenses.reduce((s, x) => s + Number(x.amount), 0);
  const refunds = payments.filter((p) => Number(p.amount) < 0).reduce((s, p) => s + Number(p.amount), 0);
  $('#stats').innerHTML = `
    <div class="stat hero"><small>Net collected</small><strong>${money(inTotal, 0)}</strong><span>${payments.length} entries</span></div>
    <div class="stat warn"><small>Expenses</small><strong>${money(outTotal, 0)}</strong><span>${expenses.length} entries</span></div>
    <div class="stat ${inTotal - outTotal >= 0 ? 'good' : 'warn'}"><small>Net cash</small><strong>${money(inTotal - outTotal, 0)}</strong><span>Collected minus expenses</span></div>
    <div class="stat"><small>Refunds</small><strong>${money(Math.abs(refunds), 0)}</strong><span>Paid back to customers</span></div>`;
  if (tab === 'payments') {
    $('#body').innerHTML = `<table class="t"><thead><tr><th>Date</th><th>Receipt</th><th>Customer</th><th>Invoice</th><th>Mode</th><th>Reference</th><th class="num">Amount</th><th></th></tr></thead><tbody>${payments.map((p) => `<tr>
      <td class="nowrap">${niceDate(p.paid_on)}</td><td class="nowrap"><strong>${esc(p.receipt_no)}</strong></td><td>${esc(p.customer_name)}<small>${esc(p.phone || '')}</small></td>
      <td class="nowrap"><a href="billing.html?id=${p.invoice_id}" style="color:var(--sky-700)">${esc(p.invoice_number)}</a></td><td>${esc(p.mode)}</td><td>${esc(p.reference || '—')}</td>
      <td class="num" style="color:${Number(p.amount) < 0 ? 'var(--red)' : 'inherit'}">${money(p.amount)}</td>
      <td><div class="actions"><a class="btn sm" href="paid-bill.html?receipt=${p.id}" target="_blank" rel="noopener">Receipt</a><button class="btn sm icon danger" data-del-pay="${p.id}" title="Remove"><i class="hgi-stroke hgi-delete-02"></i></button></div></td>
    </tr>`).join('') || '<tr><td colspan="8"><div class="empty"><i class="hgi-stroke hgi-credit-card"></i>Payments you record on invoices appear here.</div></td></tr>'}</tbody></table>`;
  } else {
    $('#body').innerHTML = `<table class="t"><thead><tr><th>Date</th><th>Category</th><th>Vendor</th><th>Description</th><th>Booking</th><th>Paid by</th><th class="num">Amount</th><th></th></tr></thead><tbody>${expenses.map((x) => `<tr>
      <td class="nowrap">${niceDate(x.spent_on)}</td><td><span class="pill">${esc(x.category)}</span></td><td><strong>${esc(x.vendor || '—')}</strong></td><td>${esc(x.description || '—')}</td><td>${esc(x.booking_ref || '—')}</td><td>${esc(x.mode)}</td>
      <td class="num">${money(x.amount)}</td><td><div class="actions"><button class="btn sm icon" data-edit="${x.id}" title="Edit"><i class="hgi-stroke hgi-edit-02"></i></button><button class="btn sm icon danger" data-del-exp="${x.id}" title="Delete"><i class="hgi-stroke hgi-delete-02"></i></button></div></td>
    </tr>`).join('') || '<tr><td colspan="8"><div class="empty"><i class="hgi-stroke hgi-wallet-01"></i>Add hotel, flight, salary and office costs to see your real profit.</div></td></tr>'}</tbody></table>`;
  }
}

async function load() {
  const range = `from=${$('#from').value}&to=${$('#to').value}`;
  const [p, x] = await Promise.all([api(`admin?type=payments&${range}`), api(`admin?type=expenses&${range}`)]);
  payments = p.payments;
  expenses = x.expenses;
  render();
}

function expenseDialog(item) {
  const x = item || { spent_on: today(), category: 'Hotels', mode: 'UPI' };
  const dlg = dialog({
    title: item ? 'Edit expense' : 'Add expense',
    body: `<form id="ef" class="form-grid">
      <label class="field"><span>Amount ₹</span><input name="amount" type="number" min="0.01" step="0.01" required value="${esc(x.amount ?? '')}"></label>
      <label class="field"><span>Date</span><input name="spent_on" type="date" required value="${esc(String(x.spent_on).slice(0, 10))}"></label>
      <label class="field"><span>Category</span><select name="category">${CATEGORIES.map((c) => `<option${c === x.category ? ' selected' : ''}>${c}</option>`).join('')}</select></label>
      <label class="field"><span>Vendor</span><input name="vendor" value="${esc(x.vendor ?? '')}"></label>
      <label class="field full"><span>Description</span><input name="description" value="${esc(x.description ?? '')}"></label>
      <label class="field"><span>Paid by</span><select name="mode">${['UPI', 'Bank transfer', 'Cash', 'Card', 'Cheque'].map((m) => `<option${m === x.mode ? ' selected' : ''}>${m}</option>`).join('')}</select></label>
      <label class="field"><span>Booking reference</span><input name="booking_ref" value="${esc(x.booking_ref ?? '')}" placeholder="Optional"></label>
    </form>`,
    footer: '<button class="btn" data-c>Cancel</button><button class="btn primary" data-ok>Save expense</button>',
  });
  $('[data-c]', dlg.el).onclick = dlg.close;
  $('[data-ok]', dlg.el).onclick = async () => {
    const f = $('#ef', dlg.el);
    if (!f.reportValidity()) return;
    try {
      await api(item ? `admin?type=expenses&id=${item.id}` : 'admin', { method: item ? 'PUT' : 'POST', body: { type: 'expenses', expense: Object.fromEntries(new FormData(f)) } });
      dlg.close();
      toast('Expense saved', 'good');
      tab = 'expenses';
      load();
    } catch (e) { toast(e.message, 'bad'); }
  };
}

$('#add-expense').onclick = () => expenseDialog();
$('#from').onchange = $('#to').onchange = () => load().catch((e) => toast(e.message, 'bad'));
$('main.ad-main').addEventListener('click', async (e) => {
  const t = e.target.closest('button');
  if (!t) return;
  try {
    if (t.dataset.tab) { tab = t.dataset.tab; render(); }
    if (t.dataset.edit) expenseDialog(expenses.find((x) => x.id === t.dataset.edit));
    if (t.dataset.delExp) {
      if (!(await confirmBox('Delete this expense?', 'It will leave your reports.', 'Delete', true))) return;
      await api(`admin?type=expenses&id=${t.dataset.delExp}`, { method: 'DELETE' });
      toast('Deleted'); await load();
    }
    if (t.dataset.delPay) {
      if (!(await confirmBox('Remove this payment?', 'The invoice balance will go back up.', 'Remove', true))) return;
      await api(`admin?type=payments&id=${t.dataset.delPay}`, { method: 'DELETE' });
      toast('Removed'); await load();
    }
  } catch (err) { toast(err.message, 'bad'); }
});
$('#export').onclick = () => {
  if (tab === 'payments') csvDownload(`bahadur-payments-${today()}.csv`, [['Date', 'Receipt', 'Customer', 'Invoice', 'Mode', 'Reference', 'Amount'], ...payments.map((p) => [String(p.paid_on).slice(0, 10), p.receipt_no, p.customer_name, p.invoice_number, p.mode, p.reference, p.amount])]);
  else csvDownload(`bahadur-expenses-${today()}.csv`, [['Date', 'Category', 'Vendor', 'Description', 'Booking', 'Paid by', 'Amount'], ...expenses.map((x) => [String(x.spent_on).slice(0, 10), x.category, x.vendor, x.description, x.booking_ref, x.mode, x.amount])]);
};
load().catch((e) => toast(e.message, 'bad'));
