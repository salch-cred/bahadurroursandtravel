import { boot, api, esc, money, $, niceDate, pill, statusOf, toast, confirmBox, dialog, debounce, csvDownload, today, waNumber } from './admin-ui.js';

let rows = [];

await boot({
  page: 'customers', title: 'Customers', subtitle: 'Your customer book with billing history',
  actions: '<button class="btn" id="export"><i class="hgi-stroke hgi-download-04"></i>Export CSV</button><button class="btn primary" id="add"><i class="hgi-stroke hgi-add-01"></i>Add customer</button>',
});

$('main.ad-main').innerHTML = `
  <div class="grid g-4" id="stats"></div>
  <section class="card mt">
    <div class="card-head"><h3>All customers</h3><span class="sp"></span><label class="search"><i class="hgi-stroke hgi-search-01"></i><input id="q" placeholder="Name, phone, email, city" aria-label="Search"></label></div>
    <div class="table-wrap"><table class="t"><thead><tr><th>Customer</th><th>City</th><th class="num">Bookings</th><th class="num">Invoices</th><th class="num">Billed</th><th class="num">Balance</th><th></th></tr></thead><tbody id="rows"></tbody></table></div>
  </section>`;

const balance = (c) => Math.max(0, Number(c.billed || 0) - Number(c.paid || 0));

function render() {
  const billed = rows.reduce((s, c) => s + Number(c.billed || 0), 0);
  const open = rows.reduce((s, c) => s + balance(c), 0);
  $('#stats').innerHTML = `
    <div class="stat hero"><small>Customers</small><strong>${rows.length}</strong><span>In your book</span></div>
    <div class="stat"><small>Lifetime billed</small><strong>${money(billed, 0)}</strong><span>All customers</span></div>
    <div class="stat warn"><small>To collect</small><strong>${money(open, 0)}</strong><span>${rows.filter((c) => balance(c) > 0).length} customers</span></div>
    <div class="stat good"><small>Repeat customers</small><strong>${rows.filter((c) => Number(c.invoice_count) > 1).length}</strong><span>More than one invoice</span></div>`;
  $('#rows').innerHTML = rows.length ? rows.map((c) => `<tr>
    <td><a href="#" data-open="${c.id}"><strong>${esc(c.name)}</strong></a><small>${esc(c.phone)}${c.email ? ' · ' + esc(c.email) : ''}</small></td>
    <td>${esc(c.city || '—')}</td><td class="num">${c.booking_count}</td><td class="num">${c.invoice_count}</td>
    <td class="num">${money(c.billed, 0)}</td><td class="num" style="${balance(c) ? 'color:var(--red);font-weight:600' : ''}">${money(balance(c), 0)}</td>
    <td><div class="actions">
      <a class="btn sm icon" title="WhatsApp" target="_blank" rel="noopener" href="https://wa.me/${waNumber(c.phone)}"><i class="hgi-stroke hgi-whatsapp"></i></a>
      <button class="btn sm icon" data-edit="${c.id}" title="Edit"><i class="hgi-stroke hgi-edit-02"></i></button>
      <button class="btn sm icon danger" data-del="${c.id}" title="Delete"><i class="hgi-stroke hgi-delete-02"></i></button>
    </div></td></tr>`).join('') : '<tr><td colspan="7"><div class="empty"><i class="hgi-stroke hgi-user-multiple-02"></i>Customers appear here when you save an invoice, or add them yourself.</div></td></tr>';
}

async function load() {
  rows = (await api(`admin?type=customers&limit=500&q=${encodeURIComponent($('#q').value.trim())}`)).customers;
  render();
}

function editDialog(c) {
  const x = c || {};
  const dlg = dialog({
    title: c ? 'Edit customer' : 'Add customer',
    body: `<form id="cf" class="form-grid">
      <label class="field"><span>Full name</span><input name="name" required value="${esc(x.name ?? '')}"></label>
      <label class="field"><span>Phone</span><input name="phone" required value="${esc(x.phone ?? '')}"></label>
      <label class="field"><span>Email</span><input name="email" type="email" value="${esc(x.email ?? '')}"></label>
      <label class="field"><span>City</span><input name="city" value="${esc(x.city ?? '')}"></label>
      <label class="field full"><span>Address</span><textarea name="address" rows="2">${esc(x.address ?? '')}</textarea></label>
      <label class="field"><span>Language</span><input name="preferred_language" value="${esc(x.preferred_language ?? 'English')}"></label>
      <label class="field"><span>Tags (comma separated)</span><input name="tags" value="${esc((x.tags || []).join(', '))}"></label>
      <label class="field full"><span>Notes</span><textarea name="note" rows="2">${esc(x.note ?? '')}</textarea></label></form>`,
    footer: '<button class="btn" data-c>Cancel</button><button class="btn primary" data-ok>Save customer</button>',
  });
  $('[data-c]', dlg.el).onclick = dlg.close;
  $('[data-ok]', dlg.el).onclick = async () => {
    const f = $('#cf', dlg.el);
    if (!f.reportValidity()) return;
    const body = Object.fromEntries(new FormData(f));
    body.tags = body.tags.split(',').map((t) => t.trim()).filter(Boolean);
    try {
      await api(c ? `admin?type=customers&id=${c.id}` : 'admin?type=customers', { method: c ? 'PUT' : 'POST', body });
      dlg.close(); toast('Customer saved', 'good'); await load();
    } catch (e) { toast(e.message, 'bad'); }
  };
}

async function statement(id) {
  const { customer: c, invoices, bookings } = await api(`admin?type=customers&id=${id}`);
  const billed = invoices.filter((i) => i.doc_type !== 'quotation' && i.status !== 'Cancelled');
  const total = billed.reduce((s, i) => s + Number(i.total), 0), paid = billed.reduce((s, i) => s + Number(i.paid_amount || 0), 0);
  dialog({
    title: c.name, wide: true,
    body: `<p style="margin:0 0 12px;color:var(--muted)">${esc([c.phone, c.email, c.city].filter(Boolean).join(' · '))}</p>
      <div class="grid g-3"><div class="stat"><small>Billed</small><strong>${money(total, 0)}</strong></div><div class="stat good"><small>Paid</small><strong>${money(paid, 0)}</strong></div><div class="stat warn"><small>Balance</small><strong>${money(Math.max(0, total - paid), 0)}</strong></div></div>
      <h4 style="margin:16px 0 6px">Invoices</h4><div class="table-wrap"><table class="t"><thead><tr><th>Number</th><th>Date</th><th>Status</th><th class="num">Total</th></tr></thead><tbody>${invoices.map((i) => `<tr><td><a href="billing.html?id=${i.id}" style="color:var(--sky-700)">${esc(i.invoice_number)}</a></td><td>${niceDate(i.invoice_date)}</td><td>${pill(statusOf(i))}</td><td class="num">${money(i.total)}</td></tr>`).join('') || '<tr><td colspan="4" class="empty">No invoices.</td></tr>'}</tbody></table></div>
      <h4 style="margin:16px 0 6px">Bookings</h4><div class="table-wrap"><table class="t"><thead><tr><th>Reference</th><th>Journey</th><th>Status</th></tr></thead><tbody>${bookings.map((b) => `<tr><td>${esc(b.booking_ref)}</td><td>${esc(b.trip)}</td><td>${pill(b.status)}</td></tr>`).join('') || '<tr><td colspan="3" class="empty">No bookings.</td></tr>'}</tbody></table></div>`,
  });
}

$('#add').onclick = () => editDialog();
$('main.ad-main').addEventListener('click', async (e) => {
  const t = e.target.closest('[data-open],[data-edit],[data-del]');
  if (!t) return;
  e.preventDefault();
  try {
    if (t.dataset.open) await statement(t.dataset.open);
    if (t.dataset.edit) editDialog(rows.find((c) => c.id === t.dataset.edit));
    if (t.dataset.del) {
      if (!(await confirmBox('Delete this customer?', 'Their invoices and bookings stay in your records.', 'Delete', true))) return;
      await api(`admin?type=customers&id=${t.dataset.del}`, { method: 'DELETE' });
      toast('Deleted'); await load();
    }
  } catch (err) { toast(err.message, 'bad'); }
});
$('#q').addEventListener('input', debounce(() => load().catch((e) => toast(e.message, 'bad')), 250));
$('#export').onclick = () => csvDownload(`bahadur-customers-${today()}.csv`, [['Name', 'Phone', 'Email', 'City', 'Bookings', 'Invoices', 'Billed', 'Paid', 'Balance'], ...rows.map((c) => [c.name, c.phone, c.email, c.city, c.booking_count, c.invoice_count, c.billed, c.paid, balance(c)])]);
load().catch((e) => toast(e.message, 'bad'));
